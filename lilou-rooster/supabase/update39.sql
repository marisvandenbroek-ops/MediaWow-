-- Update 39: "Maak je profiel af" — telefoon, geboortedatum, noodcontacten, kledingmaat, nummer delen.
-- Veilig om vaker uit te voeren.
--   Wie ziet wat:
--   - telefoon + geboortedatum: directie (zoals voorheen) en de medewerker zelf
--   - noodcontacten: directie en shiftleaders (functie emergency_contacts), en de medewerker zelf
--   - kledingmaat: directie en de medewerker zelf
--   - telefoonnummer voor collega's: alleen als de medewerker dat zelf aanzet (functie team_phones)
create table if not exists public.employee_profile (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  emergency   jsonb not null default '[]'::jsonb,
  shirt_size  text,
  share_phone boolean not null default false,
  done_at     timestamptz,
  updated_at  timestamptz not null default now()
);
alter table public.employee_profile drop constraint if exists employee_profile_emergency_check;
alter table public.employee_profile add constraint employee_profile_emergency_check
  check (jsonb_typeof(emergency) = 'array' and jsonb_array_length(emergency) <= 2 and pg_column_size(emergency) < 4000);
alter table public.employee_profile drop constraint if exists employee_profile_shirt_check;
alter table public.employee_profile add constraint employee_profile_shirt_check
  check (shirt_size is null or shirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'));
alter table public.employee_profile enable row level security;
drop policy if exists prof_select on public.employee_profile;
create policy prof_select on public.employee_profile for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
drop policy if exists prof_write on public.employee_profile;
create policy prof_write on public.employee_profile for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
revoke all on public.employee_profile from public, anon;
grant select, insert, update, delete on public.employee_profile to authenticated;

-- Eigen profiel lezen (ook telefoon en geboortedatum, die in andere tabellen staan)
create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'phone', e.phone,
    'birth_date', p.birth_date,
    'emergency', coalesce(f.emergency, '[]'::jsonb),
    'shirt_size', f.shirt_size,
    'share_phone', coalesce(f.share_phone, false),
    'done_at', f.done_at)
  from public.employees e
  left join public.employee_private p on p.employee_id = e.id
  left join public.employee_profile f on f.employee_id = e.id
  where e.id = public.my_employee_id()
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Eigen profiel opslaan (alleen voor jezelf; controleert de invoer)
create or replace function public.save_my_profile(p_phone text, p_birth date, p_emergency jsonb, p_shirt text, p_share boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); x jsonb; em jsonb := '[]'::jsonb;
begin
  if me is null then raise exception 'Geen medewerker gekoppeld aan dit account'; end if;
  p_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if p_phone is null or p_phone !~ '^[0-9 +()-]{6,20}$' then raise exception 'Vul een geldig telefoonnummer in.'; end if;
  if p_birth is null or p_birth < date '1930-01-01' or p_birth > (current_date - interval '13 years') then raise exception 'Vul een geldige geboortedatum in.'; end if;
  if p_shirt is not null and p_shirt not in ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL') then raise exception 'Kies een maat uit de lijst.'; end if;
  if p_emergency is not null and jsonb_typeof(p_emergency) = 'array' then
    for x in select * from jsonb_array_elements(p_emergency) loop
      continue when coalesce(btrim(x->>'name'), '') = '' and coalesce(btrim(x->>'phone'), '') = '';
      if coalesce(btrim(x->>'name'), '') = '' or coalesce(btrim(x->>'phone'), '') !~ '^[0-9 +()-]{6,20}$' then
        raise exception 'Vul bij een noodcontact een naam en een geldig telefoonnummer in.';
      end if;
      em := em || jsonb_build_array(jsonb_build_object('name', left(btrim(x->>'name'), 60), 'relation', left(btrim(coalesce(x->>'relation', '')), 30), 'phone', btrim(x->>'phone')));
    end loop;
  end if;
  if jsonb_array_length(em) > 2 then raise exception 'Maximaal twee noodcontacten.'; end if;
  update public.employees set phone = p_phone where id = me;
  insert into public.employee_private (employee_id, birth_date) values (me, p_birth)
    on conflict (employee_id) do update set birth_date = excluded.birth_date, updated_at = now();
  insert into public.employee_profile (employee_id, emergency, shirt_size, share_phone, done_at, updated_at)
    values (me, em, p_shirt, coalesce(p_share, false), now(), now())
    on conflict (employee_id) do update set emergency = excluded.emergency, shirt_size = excluded.shirt_size,
      share_phone = excluded.share_phone, done_at = coalesce(public.employee_profile.done_at, now()), updated_at = now();
end $$;
revoke execute on function public.save_my_profile(text, date, jsonb, text, boolean) from public, anon;
grant execute on function public.save_my_profile(text, date, jsonb, text, boolean) to authenticated;

-- Noodcontacten van actieve medewerkers: alleen directie en shiftleaders
create or replace function public.emergency_contacts()
returns table (employee_id uuid, name text, emergency jsonb)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, f.emergency
    from public.employees e join public.employee_profile f on f.employee_id = e.id
   where public.is_planner() and e.active and jsonb_array_length(f.emergency) > 0
   order by e.name
$$;
revoke execute on function public.emergency_contacts() from public, anon;
grant execute on function public.emergency_contacts() to authenticated;

-- Telefoonlijst: alleen collega's die zelf hebben gekozen hun nummer te delen
create or replace function public.team_phones()
returns table (employee_id uuid, name text, "position" text, phone text)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.position, e.phone
    from public.employees e join public.employee_profile f on f.employee_id = e.id
   where public.my_employee_id() is not null and e.active and f.share_phone and coalesce(e.phone, '') <> ''
   order by e.name
$$;
revoke execute on function public.team_phones() from public, anon;
grant execute on function public.team_phones() to authenticated;

-- Uit dienst: noodcontacten en het delen van het nummer vervallen meteen
create or replace function public.trg_profile_inactive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.active and not new.active then
    update public.employee_profile set emergency = '[]'::jsonb, share_phone = false, updated_at = now() where employee_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists employees_profile_inactive on public.employees;
create trigger employees_profile_inactive after update of active on public.employees
  for each row execute function public.trg_profile_inactive();
