-- Update 41: rechten per functie (plannen, lijsten van andere afdelingen) met uitzondering per persoon.
-- De rol (staff/planner) wordt automatisch afgeleid, zodat alle bestaande afscherming en meldingen gewoon blijven werken.
-- Veilig om vaker uit te voeren.
alter table public.employees add column if not exists plan_mode text not null default 'functie';
alter table public.employees drop constraint if exists employees_plan_mode_check;
alter table public.employees add constraint employees_plan_mode_check check (plan_mode in ('functie', 'ja', 'nee'));
alter table public.employees add column if not exists extra_lists text[] not null default '{}';
alter table public.settings add column if not exists position_rights jsonb not null default '{}'::jsonb;
alter table public.settings drop constraint if exists settings_position_rights_check;
alter table public.settings add constraint settings_position_rights_check
  check (jsonb_typeof(position_rights) = 'object' and pg_column_size(position_rights) < 20000);
-- wie nu shiftleader is, blijft dat (als uitzondering per persoon)
update public.employees set plan_mode = 'ja' where role = 'planner' and plan_mode = 'functie';

-- Rol afleiden: directie blijft directie; anders uitzondering per persoon, anders het recht van de functie
create or replace function public.trg_employee_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr jsonb;
begin
  if new.role = 'manager' then return new; end if;
  -- oudere app die de rol rechtstreeks op 'planner' zet: vertalen naar de uitzondering 'ja'
  if new.role = 'planner' and new.plan_mode = 'functie' and (tg_op = 'INSERT' or old.role is distinct from 'planner') then new.plan_mode := 'ja'; end if;
  select position_rights into pr from public.settings where id = 1;
  new.role := case
    when new.plan_mode = 'ja' then 'planner'
    when new.plan_mode = 'nee' then 'staff'
    when coalesce((coalesce(pr, '{}'::jsonb) -> coalesce(new.position, '') ->> 'plan')::boolean, false) then 'planner'
    else 'staff' end;
  return new;
end $$;
revoke execute on function public.trg_employee_role() from public, anon, authenticated;
drop trigger if exists employees_role on public.employees;
create trigger employees_role before insert or update of role, position, plan_mode on public.employees
  for each row execute function public.trg_employee_role();

-- Rechten van een functie gewijzigd: rollen van iedereen opnieuw afleiden
create or replace function public.trg_rights_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.position_rights is distinct from old.position_rights then
    update public.employees set plan_mode = plan_mode where role <> 'manager';
  end if;
  return null;
end $$;
revoke execute on function public.trg_rights_changed() from public, anon, authenticated;
drop trigger if exists settings_rights on public.settings;
create trigger settings_rights after update of position_rights on public.settings
  for each row execute function public.trg_rights_changed();
