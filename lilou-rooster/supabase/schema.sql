-- =====================================================================
--  Rooster-app — database schema voor Supabase
--  Plak dit volledig in Supabase → SQL Editor → New query → Run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tabellen ----------
create table if not exists public.employees (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete set null,
  name           text not null,
  email          text not null unique,
  phone          text,
  position       text,
  role           text not null default 'staff' check (role in ('staff', 'manager')),
  contract_hours numeric(5,2),
  color          text default '#9a5b3f',
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  break_minutes int  not null default 0 check (break_minutes >= 0),
  position      text,
  note          text,
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists shifts_date_idx on public.shifts (date);
create index if not exists shifts_emp_idx  on public.shifts (employee_id, date);

create table if not exists public.requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  type          text not null check (type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek')),
  start_date    date not null,
  end_date      date not null,
  note          text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  manager_note  text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists requests_emp_idx on public.requests (employee_id);

-- ---------- Hulpfuncties ----------
create or replace function public.my_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees where user_id = auth.uid() and active
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees where user_id = auth.uid() and role = 'manager' and active)
$$;

-- Koppel een account aan de medewerker met hetzelfde e-mailadres,
-- pas zodra dat e-mailadres bevestigd is (voorkomt misbruik van andermans adres)
create or replace function public.link_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    update public.employees set user_id = new.id
     where lower(email) = lower(new.email) and user_id is null;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_new_user();

-- En andersom: medewerker toegevoegd nadat het account al bestond
create or replace function public.link_employee()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := lower(trim(new.email));
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.user_id := null;
  end if;
  if new.user_id is null then
    select u.id into new.user_id from auth.users u
     where lower(u.email) = new.email and u.email_confirmed_at is not null;
  end if;
  return new;
end $$;

drop trigger if exists employees_link on public.employees;
create trigger employees_link
  before insert or update of email on public.employees
  for each row execute function public.link_employee();

-- ---------- Beveiliging (Row Level Security) ----------
alter table public.employees enable row level security;
alter table public.shifts    enable row level security;
alter table public.requests  enable row level security;

-- Medewerkers: iedereen van het team ziet het team; alleen leidinggevenden wijzigen
drop policy if exists emp_select on public.employees;
create policy emp_select on public.employees for select to authenticated
  using (public.my_employee_id() is not null or public.is_manager());
drop policy if exists emp_write on public.employees;
create policy emp_write on public.employees for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Diensten: team ziet alleen gepubliceerde diensten; leidinggevenden zien en beheren alles
drop policy if exists shift_select on public.shifts;
create policy shift_select on public.shifts for select to authenticated
  using (public.is_manager() or (published and public.my_employee_id() is not null));
drop policy if exists shift_write on public.shifts;
create policy shift_write on public.shifts for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Aanvragen: medewerker ziet en maakt eigen aanvragen; leidinggevende beoordeelt
drop policy if exists req_select on public.requests;
create policy req_select on public.requests for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
drop policy if exists req_insert on public.requests;
create policy req_insert on public.requests for insert to authenticated
  with check (employee_id = public.my_employee_id() and status = 'pending' and manager_note is null);
drop policy if exists req_update on public.requests;
create policy req_update on public.requests for update to authenticated
  using (public.is_manager()) with check (public.is_manager());
drop policy if exists req_delete on public.requests;
create policy req_delete on public.requests for delete to authenticated
  using (public.is_manager() or (employee_id = public.my_employee_id() and status = 'pending'));

-- =====================================================================
--  KLOKKEN met locatiecontrole
-- =====================================================================
create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  lat            double precision,
  lng            double precision,
  radius_m       int not null default 150 check (radius_m between 25 and 2000),
  allow_override boolean not null default true,
  updated_at     timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id) on delete cascade,
  clock_in         timestamptz not null,
  clock_out        timestamptz,
  break_minutes    int not null default 0 check (break_minutes >= 0),
  break_started_at timestamptz,
  in_lat double precision,  in_lng double precision,  in_accuracy double precision,  in_distance_m int,
  out_lat double precision, out_lng double precision, out_accuracy double precision, out_distance_m int,
  flags            text[] not null default '{}',
  reason           text,
  status           text not null default 'open' check (status in ('open', 'pending', 'approved', 'rejected')),
  manager_note     text,
  edited           boolean not null default false,
  created_at       timestamptz not null default now(),
  check (clock_out is null or clock_out > clock_in)
);
create index if not exists time_entries_in_idx on public.time_entries (clock_in);
create unique index if not exists time_entries_one_open on public.time_entries (employee_id) where clock_out is null;

alter table public.settings     enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated
  using (public.my_employee_id() is not null or public.is_manager());
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Medewerkers zien alleen hun eigen registraties en schrijven NIET rechtstreeks:
-- klokken gaat uitsluitend via de functie clock() hieronder (servertijd + afstandscontrole).
drop policy if exists te_select on public.time_entries;
create policy te_select on public.time_entries for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
drop policy if exists te_write on public.time_entries;
create policy te_write on public.time_entries for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create or replace function public.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public.clock(p_action text, p_lat double precision, p_lng double precision,
                                        p_accuracy double precision, p_reason text default null)
returns public.time_entries
language plpgsql security definer set search_path = public as $$
declare
  me   uuid := public.my_employee_id();
  st   public.settings;
  d    double precision;
  flag text;
  r    text := nullif(trim(coalesce(p_reason, '')), '');
  e    public.time_entries;
  brk  int;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into st from public.settings where id = 1;
  if p_action in ('in', 'uit') then
    if st.lat is null then raise exception 'De werklocatie is nog niet ingesteld.'; end if;
    if p_lat is null or p_lng is null then
      flag := 'geen_locatie';
    else
      d := public.distance_m(st.lat, st.lng, p_lat, p_lng);
      if d - least(coalesce(p_accuracy, 0), 100) > st.radius_m then flag := 'buiten_locatie'; end if;
    end if;
    if flag is not null and (not st.allow_override or r is null) then
      raise exception using errcode = 'LC001', message =
        case when flag = 'geen_locatie' then 'Locatie onbekend. Zet locatievoorzieningen aan om te klokken.'
             else format('Je bent %s meter van de werklocatie. Klokken kan alleen op locatie.', round(d)) end;
    end if;
  end if;

  select * into e from public.time_entries where employee_id = me and clock_out is null for update;

  if p_action = 'in' then
    if found then raise exception 'Je bent al ingeklokt.'; end if;
    insert into public.time_entries (employee_id, clock_in, in_lat, in_lng, in_accuracy, in_distance_m, flags, reason)
    values (me, now(), p_lat, p_lng, p_accuracy, round(d),
            case when flag is null then '{}'::text[] else array['in_' || flag] end, r)
    returning * into e;
  elsif p_action in ('pauze_start', 'pauze_eind', 'uit') then
    if not found then raise exception 'Je bent niet ingeklokt.'; end if;
    brk := case when e.break_started_at is null then 0 else round(extract(epoch from now() - e.break_started_at) / 60) end;
    if p_action = 'pauze_start' then
      if e.break_started_at is not null then raise exception 'Pauze loopt al.'; end if;
      update public.time_entries set break_started_at = now() where id = e.id returning * into e;
    elsif p_action = 'pauze_eind' then
      if e.break_started_at is null then raise exception 'Er loopt geen pauze.'; end if;
      update public.time_entries set break_minutes = break_minutes + brk, break_started_at = null where id = e.id returning * into e;
    else
      update public.time_entries set
        break_minutes = break_minutes + brk, break_started_at = null, clock_out = now(),
        out_lat = p_lat, out_lng = p_lng, out_accuracy = p_accuracy, out_distance_m = round(d),
        flags = flags || case when flag is null then '{}'::text[] else array['uit_' || flag] end,
        reason = case when r is null then reason else concat_ws(' / ', reason, r) end,
        status = 'pending'
      where id = e.id returning * into e;
    end if;
  else
    raise exception 'Onbekende actie: %', p_action;
  end if;
  return e;
end $$;

revoke all on function public.clock(text, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.clock(text, double precision, double precision, double precision, text) to authenticated;

-- =====================================================================
--  EERSTE LEIDINGGEVENDE — pas naam en e-mail aan en voer daarna uit:
-- =====================================================================
-- insert into public.employees (name, email, role, position)
-- values ('Voornaam Achternaam', 'jij@lilou.nl', 'manager', 'Shiftleader');
