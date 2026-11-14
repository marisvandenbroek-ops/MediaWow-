-- =====================================================================
--  AFSPRAKEN: GELEZEN EN AKKOORD
--  Iedere medewerker tekent eenmalig per versie van de afspraken.
--  De directie verhoogt de versie bij een wijziging; dan moet iedereen opnieuw tekenen.
-- =====================================================================
alter table public.settings add column if not exists rules_version int not null default 1;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'settings_rules_version_chk') then
    alter table public.settings add constraint settings_rules_version_chk check (rules_version >= 1);
  end if;
end $$;

create table if not exists public.rules_acks (
  employee_id uuid not null references public.employees(id) on delete cascade,
  version     int  not null,
  at          timestamptz not null default now(),
  primary key (employee_id, version)
);
alter table public.rules_acks enable row level security;
drop policy if exists racks_select on public.rules_acks;
create policy racks_select on public.rules_acks for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
-- niemand schrijft rechtstreeks: tekenen gaat alleen via ack_rules() (eigen naam, huidige versie, servertijd)
revoke all on public.rules_acks from public, anon, authenticated;
grant select on public.rules_acks to authenticated;

create or replace function public.ack_rules() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); v int;
begin
  if me is null then raise exception 'Geen medewerker gevonden.'; end if;
  select rules_version into v from public.settings where id = 1;
  insert into public.rules_acks (employee_id, version) values (me, coalesce(v, 1)) on conflict do nothing;
end $$;
revoke execute on function public.ack_rules() from public, anon;
grant execute on function public.ack_rules() to authenticated;

-- nieuwe versie: iedereen behalve de directie krijgt een melding
create or replace function public.trg_rules_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rules_version > old.rules_version then
    insert into public.notifications (employee_id, title, body, view)
    select id, '📘 Afspraken bijgewerkt', 'Lees de nieuwe afspraken en tik op Gelezen en akkoord.', 'mijn'
      from public.employees where active and role <> 'manager';
  end if;
  return new;
end $$;
revoke execute on function public.trg_rules_notify() from public, anon, authenticated;
drop trigger if exists rules_notify on public.settings;
create trigger rules_notify after update of rules_version on public.settings
  for each row execute function public.trg_rules_notify();
