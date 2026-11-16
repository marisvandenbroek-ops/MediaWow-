-- Update 42: toegang per functie als niveau (medewerker, shiftleader, directie), met uitzondering per persoon.
-- plan_mode per persoon: 'functie' (volgt de functie), 'nee' (medewerker), 'ja' (shiftleader), 'directie'.
-- Er blijft altijd minstens één actief directielid. Veilig om vaker uit te voeren.
alter table public.employees drop constraint if exists employees_plan_mode_check;
alter table public.employees add constraint employees_plan_mode_check check (plan_mode in ('functie', 'ja', 'nee', 'directie'));
-- wie nu directie is, blijft dat (als uitzondering per persoon)
update public.employees set plan_mode = 'directie' where role = 'manager' and plan_mode = 'functie';

create or replace function public.trg_employee_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr jsonb; r jsonb; lvl text;
begin
  -- oudere app of handmatige SQL die de rol rechtstreeks zet: vertalen naar een uitzondering
  if new.plan_mode = 'functie' and (tg_op = 'INSERT' or old.role is distinct from new.role) then
    if new.role = 'manager' then new.plan_mode := 'directie';
    elsif new.role = 'planner' then new.plan_mode := 'ja'; end if;
  end if;
  select position_rights into pr from public.settings where id = 1;
  r := coalesce(pr, '{}'::jsonb) -> coalesce(new.position, '');
  lvl := coalesce(r ->> 'level', case when coalesce((r ->> 'plan')::boolean, false) then 'shiftleader' end, 'medewerker');
  new.role := case new.plan_mode
    when 'directie' then 'manager'
    when 'ja' then 'planner'
    when 'nee' then 'staff'
    else case lvl when 'directie' then 'manager' when 'shiftleader' then 'planner' else 'staff' end end;
  if tg_op = 'UPDATE' and old.role = 'manager' and new.role <> 'manager' and old.active
     and not exists (select 1 from public.employees where role = 'manager' and active and id <> new.id) then
    raise exception 'Er moet altijd minstens één directielid overblijven.';
  end if;
  return new;
end $$;
revoke execute on function public.trg_employee_role() from public, anon, authenticated;
drop trigger if exists employees_role on public.employees;
create trigger employees_role before insert or update of role, position, plan_mode on public.employees
  for each row execute function public.trg_employee_role();
