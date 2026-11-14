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

-- "Vandaag" in Nederland (de database draait in UTC)
create or replace function public.today_nl() returns date
language sql stable as $$ select (now() at time zone 'Europe/Amsterdam')::date $$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees where user_id = auth.uid() and role = 'manager' and active)
$$;

-- Mag plannen: directie of shiftleader (rol 'planner'). Een shiftleader ziet geen lonen of personeelsgegevens.
alter table public.employees drop constraint if exists employees_role_check;
alter table public.employees add constraint employees_role_check check (role in ('staff', 'planner', 'manager'));
create or replace function public.is_planner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees where user_id = auth.uid() and role in ('manager', 'planner') and active)
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
  using (public.is_manager() or user_id = auth.uid());   -- medewerker: alleen de eigen gegevens

drop policy if exists emp_write on public.employees;
create policy emp_write on public.employees for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Diensten: team ziet alleen gepubliceerde diensten; leidinggevenden zien en beheren alles
drop policy if exists shift_select on public.shifts;
create policy shift_select on public.shifts for select to authenticated
  using (public.is_planner() or (published and public.my_employee_id() is not null));
drop policy if exists shift_write on public.shifts;
create policy shift_write on public.shifts for all to authenticated
  using (public.is_planner()) with check (public.is_planner());

-- Aanvragen: medewerker ziet en maakt eigen aanvragen; leidinggevende beoordeelt
drop policy if exists req_select on public.requests;
create policy req_select on public.requests for select to authenticated
  using (public.is_planner() or employee_id = public.my_employee_id());
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

-- Wifi van de zaak: klokken zonder gps als het verzoek van het internetadres van de zaak komt
alter table public.settings add column if not exists wifi_ips text[] not null default '{}';
alter table public.time_entries add column if not exists in_method text;
alter table public.time_entries add column if not exists out_method text;
-- "Planning is leidend": overuren na het einde van de dienst tellen alleen mee na goedkeuring
alter table public.settings add column if not exists plan_leading boolean not null default true;
alter table public.settings add column if not exists plan_margin_min int not null default 5;
alter table public.time_entries add column if not exists overtime_status text check (overtime_status in ('requested', 'approved', 'rejected'));
alter table public.time_entries add column if not exists overtime_reason text;

create or replace function public.request_ip() returns text
language plpgsql stable as $$
declare h json; ip text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then return null; end;
  if h is null then return null; end if;
  ip := coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1));
  return nullif(trim(ip), '');
end $$;

create or replace function public.register_wifi() returns text
language plpgsql security definer set search_path = public as $$
declare ip text := public.request_ip();
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan het netwerk instellen.'; end if;
  if ip is null then raise exception 'Kon het internetadres niet bepalen.'; end if;
  update public.settings set wifi_ips = array(select distinct unnest(wifi_ips || ip)), updated_at = now() where id = 1;
  return ip;
end $$;
revoke execute on function public.register_wifi() from public, anon;
grant execute on function public.register_wifi() to authenticated;

drop function if exists public.clock(text, double precision, double precision, double precision, text);
create or replace function public.clock(p_action text, p_lat double precision, p_lng double precision,
                                        p_accuracy double precision, p_reason text default null, p_overtime text default null)
returns public.time_entries
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := public.my_employee_id();
  st     public.settings;
  d      double precision;
  flag   text;
  method text;
  r      text := nullif(trim(coalesce(p_reason, '')), '');
  e      public.time_entries;
  brk    int;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  perform set_config('rooster.via_clock', '1', true);
  select * into st from public.settings where id = 1;
  if p_action in ('in', 'uit') then
    if coalesce(public.request_ip() = any(st.wifi_ips), false) then
      method := 'wifi';
    else
      if st.lat is null and cardinality(st.wifi_ips) = 0 then raise exception 'De werklocatie is nog niet ingesteld.'; end if;
      if p_lat is null or p_lng is null or st.lat is null then
        flag := 'geen_locatie';
      else
        d := public.distance_m(st.lat, st.lng, p_lat, p_lng);
        if d - least(coalesce(p_accuracy, 0), 100) > st.radius_m then flag := 'buiten_locatie'; else method := 'gps'; end if;
      end if;
      if flag is not null and (not st.allow_override or r is null) then
        raise exception using errcode = 'LC001', message =
          case when flag = 'geen_locatie' and cardinality(st.wifi_ips) > 0
                 then 'Je zit niet op de wifi van de zaak en je locatie is onbekend. Verbind met de wifi of zet locatievoorzieningen aan.'
               when flag = 'geen_locatie' then 'Locatie onbekend. Zet locatievoorzieningen aan om te klokken.'
               else format('Je bent %s meter van de werklocatie. Klokken kan alleen op locatie.', round(d)) end;
      end if;
    end if;
  end if;

  select * into e from public.time_entries where employee_id = me and clock_out is null for update;

  if p_action = 'in' then
    if found then raise exception 'Je bent al ingeklokt.'; end if;
    insert into public.time_entries (employee_id, clock_in, in_lat, in_lng, in_accuracy, in_distance_m, in_method, flags, reason)
    values (me, now(), p_lat, p_lng, p_accuracy, round(d), method,
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
        out_lat = p_lat, out_lng = p_lng, out_accuracy = p_accuracy, out_distance_m = round(d), out_method = method,
        flags = flags || case when flag is null then '{}'::text[] else array['uit_' || flag] end,
        reason = case when r is null then reason else concat_ws(' / ', reason, r) end,
        overtime_status = case when nullif(trim(coalesce(p_overtime, '')), '') is null then null else 'requested' end,
        overtime_reason = nullif(trim(coalesce(p_overtime, '')), ''),
        status = 'pending'
      where id = e.id returning * into e;
    end if;
  else
    raise exception 'Onbekende actie: %', p_action;
  end if;
  return e;
end $$;

revoke all on function public.clock(text, double precision, double precision, double precision, text, text) from public, anon;
grant execute on function public.clock(text, double precision, double precision, double precision, text, text) to authenticated;

-- =====================================================================
--  OPEN DIENSTEN, RUILEN, BESCHIKBAARHEID en MELDINGEN
-- =====================================================================
alter table public.shifts alter column employee_id drop not null;   -- leeg = open dienst
alter table public.settings add column if not exists swap_needs_approval boolean not null default true;

create table if not exists public.shift_applications (
  id          uuid primary key default gen_random_uuid(),
  shift_id    uuid not null references public.shifts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at  timestamptz not null default now(),
  unique (shift_id, employee_id)
);

create table if not exists public.swaps (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid not null references public.shifts(id) on delete cascade,
  from_employee uuid not null references public.employees(id) on delete cascade,
  to_employee   uuid references public.employees(id) on delete cascade,   -- leeg = aan iedereen aangeboden
  swap_shift_id uuid references public.shifts(id) on delete cascade,      -- ingevuld = ruilen tegen deze dienst
  taken_by      uuid references public.employees(id) on delete cascade,
  note          text,
  manager_note  text,
  status        text not null default 'open' check (status in ('open', 'accepted', 'approved', 'rejected', 'cancelled')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index if not exists swaps_shift_idx on public.swaps (shift_id);

create table if not exists public.availability (
  employee_id uuid not null references public.employees(id) on delete cascade,
  date        date not null,
  kind        text not null check (kind in ('hele_dag', 'ochtend', 'middag', 'avond', 'niet')),
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (employee_id, date)
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title       text not null,
  body        text,
  view        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_emp_idx on public.notifications (employee_id, created_at desc);

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.shift_applications enable row level security;
alter table public.swaps              enable row level security;
alter table public.availability       enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;

-- Aanmeldingen en ruilen: lezen volgens wie het aangaat; schrijven door medewerkers alleen via de functies hieronder
drop policy if exists app_select on public.shift_applications;
create policy app_select on public.shift_applications for select to authenticated
  using (public.is_planner() or employee_id = public.my_employee_id());
drop policy if exists app_write on public.shift_applications;
create policy app_write on public.shift_applications for all to authenticated
  using (public.is_planner()) with check (public.is_planner());

drop policy if exists swap_select on public.swaps;
create policy swap_select on public.swaps for select to authenticated
  using (public.is_manager() or from_employee = public.my_employee_id() or to_employee = public.my_employee_id()
         or taken_by = public.my_employee_id() or (to_employee is null and status = 'open' and public.my_employee_id() is not null));
drop policy if exists swap_write on public.swaps;
create policy swap_write on public.swaps for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

drop policy if exists av_select on public.availability;
create policy av_select on public.availability for select to authenticated
  using (public.is_planner() or employee_id = public.my_employee_id());
drop policy if exists av_write on public.availability;
create policy av_write on public.availability for all to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id())
  with check (public.is_manager() or employee_id = public.my_employee_id());

drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (employee_id = public.my_employee_id());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (employee_id = public.my_employee_id()) with check (employee_id = public.my_employee_id());
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;     -- alleen 'gelezen' mag je zelf zetten

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (employee_id = public.my_employee_id()) with check (employee_id = public.my_employee_id());

-- ---------- Hulpfuncties voor meldingen ----------
create or replace function public.first_name(p_emp uuid) returns text
language sql stable security definer set search_path = public as $$
  select split_part(name, ' ', 1) from public.employees where id = p_emp
$$;

create or replace function public.shift_label(d date, a time, b time) returns text
language sql immutable as $$
  select (array['zo','ma','di','wo','do','vr','za'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' '
      || (array['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'])[extract(month from d)::int]
      || ' ' || to_char(a, 'HH24:MI') || '–' || to_char(b, 'HH24:MI')
$$;

create or replace function public.notify(p_emp uuid, p_title text, p_body text, p_view text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (employee_id, title, body, view)
  select p_emp, p_title, p_body, p_view where p_emp is not null
$$;

create or replace function public.notify_managers(p_title text, p_body text, p_view text, p_except uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (employee_id, title, body, view)
  select id, p_title, p_body, p_view from public.employees
   where role = 'manager' and active and id is distinct from p_except
$$;

create or replace function public.notify_team(p_title text, p_body text, p_view text, p_except uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (employee_id, title, body, view)
  select id, p_title, p_body, p_view from public.employees
   where active and id is distinct from p_except
$$;

revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_managers(text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.notify_team(text, text, text, uuid) from public, anon, authenticated;

-- ---------- Automatische meldingen ----------
create or replace function public.trg_shift_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('rooster.skip_notify', true), '') = '1' then return null; end if;
  if tg_op = 'DELETE' then
    if old.published and old.employee_id is not null and old.date >= public.today_nl() then
      perform public.notify(old.employee_id, 'Dienst vervallen', public.shift_label(old.date, old.start_time, old.end_time), 'mijn');
    end if;
    return old;
  end if;
  if old.published and new.published and new.date >= public.today_nl()
     and (old.date, old.start_time, old.end_time, old.employee_id) is distinct from (new.date, new.start_time, new.end_time, new.employee_id) then
    if new.employee_id is not null then
      perform public.notify(new.employee_id,
        case when old.employee_id is distinct from new.employee_id then 'Dienst toegevoegd' else 'Dienst gewijzigd' end,
        public.shift_label(new.date, new.start_time, new.end_time), 'mijn');
    end if;
    if old.employee_id is not null and old.employee_id is distinct from new.employee_id then
      perform public.notify(old.employee_id, 'Dienst vervallen', public.shift_label(old.date, old.start_time, old.end_time), 'mijn');
    end if;
    if old.employee_id is not null and new.employee_id is null then
      perform public.notify_team('Open dienst beschikbaar', public.shift_label(new.date, new.start_time, new.end_time) || '. Meld je aan!', 'diensten', old.employee_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists shifts_notify on public.shifts;
create trigger shifts_notify after update or delete on public.shifts
  for each row execute function public.trg_shift_notify();

create or replace function public.trg_shift_swaps() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or old.employee_id is distinct from new.employee_id then
    update public.swaps set status = 'cancelled', decided_at = now()
     where status in ('open', 'accepted') and (shift_id = old.id or swap_shift_id = old.id);
  end if;
  return null;
end $$;
drop trigger if exists shifts_swaps on public.shifts;
create trigger shifts_swaps after update of employee_id or delete on public.shifts
  for each row execute function public.trg_shift_swaps();

create or replace function public.trg_request_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare lbl text := case new.type when 'vakantie' then 'Vakantie' when 'vrij' then 'Vrije dag' when 'onbeschikbaar' then 'Niet beschikbaar' else 'Ziekmelding' end;
        per text := to_char(new.start_date, 'DD-MM') || case when new.end_date <> new.start_date then ' t/m ' || to_char(new.end_date, 'DD-MM') else '' end;
begin
  if tg_op = 'INSERT' then
    if new.type = 'ziek' then
      -- ziekmelding: directie én shiftleaders direct op de hoogte, met een duidelijke titel
      insert into public.notifications (employee_id, title, body, view)
      select id, '🤒 Ziekmelding', public.first_name(new.employee_id) || ' heeft zich ziek gemeld: ' || per,
             case when role = 'manager' then 'aanvragen:verlof' else 'planning' end
        from public.employees where role in ('manager', 'planner') and active and id <> new.employee_id;
    else
      perform public.notify_managers('Nieuwe aanvraag', public.first_name(new.employee_id) || ': ' || lbl || ' ' || per, 'aanvragen:verlof');
    end if;
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.notify(new.employee_id, 'Aanvraag ' || case when new.status = 'approved' then 'goedgekeurd' else 'afgewezen' end,
      lbl || ' ' || per || coalesce(' — ' || nullif(new.manager_note, ''), ''), 'aanvragen');
  elsif new.status is distinct from old.status and new.status = 'pending' then
    perform public.notify(new.employee_id, 'Aanvraag weer in behandeling', lbl || ' ' || per || ' wordt opnieuw beoordeeld.', 'aanvragen');
  end if;
  return new;
end $$;
drop trigger if exists requests_notify on public.requests;
create trigger requests_notify after insert or update on public.requests
  for each row execute function public.trg_request_notify();

-- ---------- Week publiceren (met één melding per medewerker) ----------
create or replace function public.publish_week(p_from date, p_to date) returns int
language plpgsql security definer set search_path = public as $$
declare ids uuid[]; r record; n_open int;
begin
  if not public.is_planner() then raise exception 'Alleen de directie of een shiftleader kan publiceren.'; end if;
  perform set_config('rooster.skip_notify', '1', true);
  with upd as (update public.shifts set published = true
                where date between p_from and p_to and not published returning id)
  select array_agg(id) into ids from upd;
  if ids is null then return 0; end if;
  for r in select employee_id, count(*) n from public.shifts where id = any(ids) and employee_id is not null group by employee_id loop
    perform public.notify(r.employee_id, 'Je rooster voor week ' || extract(week from p_from)::int || ' staat klaar',
      'Je hebt ' || r.n || ' nieuwe dienst' || case when r.n > 1 then 'en' else '' end || '. Tik om je rooster te bekijken.', 'mijn');
  end loop;
  select count(*) into n_open from public.shifts where id = any(ids) and employee_id is null;
  if n_open > 0 then
    perform public.notify_team('Open dienst' || case when n_open > 1 then 'en' else '' end || ' beschikbaar',
      n_open || ' open dienst' || case when n_open > 1 then 'en' else '' end || ' in week ' || extract(week from p_from)::int || '. Meld je aan!', 'diensten');
  end if;
  return array_length(ids, 1);
end $$;

-- ---------- Open diensten ----------
create or replace function public.open_apply(p_shift uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); s public.shifts;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into s from public.shifts where id = p_shift;
  if not found or s.employee_id is not null or not s.published or s.date < public.today_nl() then
    raise exception 'Deze dienst is niet (meer) open.';
  end if;
  insert into public.shift_applications (shift_id, employee_id) values (p_shift, me)
  on conflict (shift_id, employee_id) do update set status = 'pending', created_at = now();
  perform public.notify_managers('Aanmelding open dienst',
    public.first_name(me) || ' wil ' || public.shift_label(s.date, s.start_time, s.end_time) || ' werken', 'aanvragen:open');
end $$;

create or replace function public.open_withdraw(p_shift uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.shift_applications where shift_id = p_shift and employee_id = public.my_employee_id() and status = 'pending'
$$;

create or replace function public.open_assign(p_shift uuid, p_emp uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.shifts; r record;
begin
  if not public.is_planner() then raise exception 'Alleen de directie of een shiftleader kan toewijzen.'; end if;
  if not exists (select 1 from public.employees where id = p_emp and active) then raise exception 'Deze medewerker is niet (meer) actief.'; end if;
  perform set_config('rooster.skip_notify', '1', true);
  update public.shifts set employee_id = p_emp where id = p_shift and employee_id is null returning * into s;
  if not found then raise exception 'Deze dienst is al toegewezen.'; end if;
  update public.shift_applications set status = case when employee_id = p_emp then 'accepted' else 'rejected' end where shift_id = p_shift;
  perform public.notify(p_emp, 'Open dienst is van jou', public.shift_label(s.date, s.start_time, s.end_time), 'mijn');
  for r in select employee_id from public.shift_applications where shift_id = p_shift and employee_id <> p_emp loop
    perform public.notify(r.employee_id, 'Open dienst vergeven', public.shift_label(s.date, s.start_time, s.end_time) || ' is aan een collega gegeven.', 'diensten');
  end loop;
end $$;

-- ---------- Veel diensten tegelijk verwijderen of open zetten (één samenvattende melding) ----------
create or replace function public.shifts_bulk(p_ids uuid[], p_action text) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int; n_open int := 0; v_except uuid;
begin
  if not public.is_planner() then raise exception 'Alleen de directie of een shiftleader kan diensten aanpassen.'; end if;
  if p_action not in ('delete', 'open') then raise exception 'Onbekende actie.'; end if;
  if p_ids is null or array_length(p_ids, 1) is null then return 0; end if;
  -- eerst de meldingen bepalen (één per actieve medewerker, alleen gepubliceerde komende diensten)
  for r in select s.employee_id, count(*) c, min(public.shift_label(s.date, s.start_time, s.end_time)) one
             from public.shifts s join public.employees e on e.id = s.employee_id and e.active
            where s.id = any(p_ids) and s.published and s.date >= public.today_nl() group by s.employee_id loop
    perform public.notify(r.employee_id, case when r.c = 1 then 'Dienst vervallen' else r.c || ' diensten vervallen' end,
      case when r.c = 1 then r.one else 'Er zijn ' || r.c || ' diensten van je uit het rooster gehaald. Tik om je rooster te bekijken.' end, 'mijn');
  end loop;
  -- open diensten tellen ook als de medewerker al uit dienst is (juist dan moeten collega's het weten)
  select count(*) into n_open from public.shifts where id = any(p_ids) and employee_id is not null and published and date >= public.today_nl();
  -- gaat het om één medewerker, dan krijgt die zelf geen 'open diensten'-melding over zijn eigen diensten
  select case when count(distinct employee_id) = 1 then (array_agg(employee_id))[1] end into v_except
    from public.shifts where id = any(p_ids) and employee_id is not null;
  perform set_config('rooster.skip_notify', '1', true);
  if p_action = 'delete' then
    delete from public.shifts where id = any(p_ids);
  else
    update public.shifts set employee_id = null where id = any(p_ids) and employee_id is not null;
  end if;
  get diagnostics n = row_count;
  if p_action = 'open' and n_open > 0 then
    perform public.notify_team('Open dienst' || case when n_open > 1 then 'en' else '' end || ' beschikbaar',
      n_open || ' open dienst' || case when n_open > 1 then 'en' else '' end || ' in het rooster. Meld je aan!', 'diensten', v_except);
  end if;
  return n;
end $$;

-- ---------- Ruilen en overdragen ----------
create or replace function public.swap_execute(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare w public.swaps;
begin
  select * into w from public.swaps where id = p_id;
  if not exists (select 1 from public.employees where id = w.taken_by and active) then raise exception 'De collega is niet meer actief; de ruil kan niet doorgaan.'; end if;
  perform set_config('rooster.skip_notify', '1', true);
  update public.shifts set employee_id = w.taken_by where id = w.shift_id and employee_id = w.from_employee;
  if not found then raise exception 'De dienst is intussen gewijzigd; de ruil kan niet doorgaan.'; end if;
  if w.swap_shift_id is not null then
    update public.shifts set employee_id = w.from_employee where id = w.swap_shift_id and employee_id = w.taken_by;
    if not found then raise exception 'De dienst van de collega is intussen gewijzigd; de ruil kan niet doorgaan.'; end if;
  end if;
  update public.swaps set status = 'approved', decided_at = now() where id = p_id;
  -- andere openstaande verzoeken voor dezelfde diensten vervallen
  update public.swaps set status = 'cancelled' where id <> p_id and status in ('open', 'accepted')
     and (shift_id in (w.shift_id, w.swap_shift_id) or swap_shift_id in (w.shift_id, w.swap_shift_id));
end $$;
revoke execute on function public.swap_execute(uuid) from public, anon, authenticated;

create or replace function public.swap_offer(p_shift uuid, p_to uuid, p_swap_shift uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); s public.shifts; s2 public.shifts; new_id uuid; lbl text;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into s from public.shifts where id = p_shift;
  if not found or s.employee_id is distinct from me or not s.published or s.date < public.today_nl() then
    raise exception 'Je kunt alleen je eigen, komende diensten aanbieden.';
  end if;
  if p_to = me then raise exception 'Kies een collega.'; end if;
  if p_to is not null and not exists (select 1 from public.employees where id = p_to and active) then raise exception 'Onbekende collega.'; end if;
  if p_swap_shift is not null then
    select * into s2 from public.shifts where id = p_swap_shift;
    if p_to is null or not found or s2.employee_id is distinct from p_to or not s2.published or s2.date < public.today_nl() then
      raise exception 'Je kunt alleen ruilen tegen een komende dienst van de gekozen collega.';
    end if;
  end if;
  if exists (select 1 from public.swaps where shift_id = p_shift and status in ('open', 'accepted')) then
    raise exception 'Voor deze dienst loopt al een verzoek.';
  end if;
  insert into public.swaps (shift_id, from_employee, to_employee, swap_shift_id, note)
  values (p_shift, me, p_to, p_swap_shift, nullif(trim(coalesce(p_note, '')), '')) returning id into new_id;
  lbl := public.shift_label(s.date, s.start_time, s.end_time);
  if p_to is null then
    perform public.notify_team('Dienst aangeboden', public.first_name(me) || ' biedt ' || lbl || ' aan. Wil jij hem overnemen?', 'diensten', me);
  elsif p_swap_shift is not null then
    perform public.notify(p_to, 'Ruilverzoek', public.first_name(me) || ' wil ' || lbl || ' ruilen tegen jouw '
      || public.shift_label(s2.date, s2.start_time, s2.end_time), 'diensten');
  else
    perform public.notify(p_to, 'Dienst aangeboden', public.first_name(me) || ' vraagt of jij ' || lbl || ' wilt overnemen', 'diensten');
  end if;
  return new_id;
end $$;

create or replace function public.swap_respond(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); w public.swaps; s public.shifts; need boolean;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into w from public.swaps where id = p_id for update;
  if not found or w.status <> 'open' then raise exception 'Dit verzoek is niet meer open.'; end if;
  if w.from_employee = me or (w.to_employee is not null and w.to_employee <> me) then raise exception 'Dit verzoek is niet voor jou.'; end if;
  select * into s from public.shifts where id = w.shift_id;
  if not p_accept then
    if w.to_employee is null then return; end if;   -- aanbod aan iedereen: niets doen
    update public.swaps set status = 'rejected', decided_at = now() where id = p_id;
    perform public.notify(w.from_employee, 'Verzoek geweigerd', public.first_name(me) || ' kan ' || public.shift_label(s.date, s.start_time, s.end_time) || ' niet overnemen', 'diensten');
    return;
  end if;
  update public.swaps set status = 'accepted', taken_by = me where id = p_id;
  select swap_needs_approval into need from public.settings where id = 1;
  if coalesce(need, true) then
    perform public.notify(w.from_employee, 'Collega gevonden', public.first_name(me) || ' neemt ' || public.shift_label(s.date, s.start_time, s.end_time) || ' over. Wacht op goedkeuring directie.', 'diensten');
    perform public.notify_managers('Ruil ter goedkeuring', public.first_name(w.from_employee) || ' → ' || public.first_name(me) || ': '
      || public.shift_label(s.date, s.start_time, s.end_time), 'aanvragen:ruilen');
  else
    perform public.swap_execute(p_id);
    perform public.notify(w.from_employee, 'Ruil geregeld', public.first_name(me) || ' neemt ' || public.shift_label(s.date, s.start_time, s.end_time) || ' over.', 'mijn');
    perform public.notify_managers('Dienst geruild', public.first_name(w.from_employee) || ' → ' || public.first_name(me) || ': ' || public.shift_label(s.date, s.start_time, s.end_time), 'planning');
  end if;
end $$;

create or replace function public.swap_decide(p_id uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare w public.swaps; s public.shifts; lbl text;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan ruilen goedkeuren.'; end if;
  select * into w from public.swaps where id = p_id for update;
  if not found or w.status <> 'accepted' then raise exception 'Dit verzoek wacht niet op goedkeuring.'; end if;
  select * into s from public.shifts where id = w.shift_id;
  lbl := public.shift_label(s.date, s.start_time, s.end_time);
  if p_approve then
    perform public.swap_execute(p_id);
    update public.swaps set manager_note = nullif(trim(coalesce(p_note, '')), '') where id = p_id;
    perform public.notify(w.from_employee, 'Ruil goedgekeurd', lbl || ' is overgenomen door ' || public.first_name(w.taken_by), 'mijn');
    perform public.notify(w.taken_by, 'Ruil goedgekeurd', lbl || ' staat nu in jouw rooster', 'mijn');
  else
    update public.swaps set status = 'rejected', decided_at = now(), manager_note = nullif(trim(coalesce(p_note, '')), '') where id = p_id;
    perform public.notify(w.from_employee, 'Ruil afgewezen', lbl || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'diensten');
    perform public.notify(w.taken_by, 'Ruil afgewezen', lbl || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'diensten');
  end if;
end $$;

create or replace function public.swap_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); w public.swaps;
begin
  select * into w from public.swaps where id = p_id for update;
  if not found or w.from_employee is distinct from me or w.status not in ('open', 'accepted') then
    raise exception 'Dit verzoek kun je niet (meer) intrekken.';
  end if;
  update public.swaps set status = 'cancelled' where id = p_id;
  perform public.notify(coalesce(w.taken_by, w.to_employee), 'Verzoek ingetrokken', public.first_name(me) || ' heeft het verzoek ingetrokken.', 'diensten');
end $$;

revoke execute on function public.publish_week(date, date) from public, anon;
revoke execute on function public.open_apply(uuid) from public, anon;
revoke execute on function public.open_withdraw(uuid) from public, anon;
revoke execute on function public.open_assign(uuid, uuid) from public, anon;
revoke execute on function public.swap_offer(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.swap_respond(uuid, boolean) from public, anon;
revoke execute on function public.swap_decide(uuid, boolean, text) from public, anon;
revoke execute on function public.swap_cancel(uuid) from public, anon;
grant execute on function public.publish_week(date, date), public.open_apply(uuid), public.open_withdraw(uuid),
  public.open_assign(uuid, uuid), public.swap_offer(uuid, uuid, uuid, text), public.swap_respond(uuid, boolean),
  public.swap_decide(uuid, boolean, text), public.swap_cancel(uuid) to authenticated;
revoke execute on function public.shifts_bulk(uuid[], text) from public, anon;
grant execute on function public.shifts_bulk(uuid[], text) to authenticated;

-- =====================================================================
--  LOONGEGEVENS, VERLOFSALDO, LOGBOEK en AUTOMATISCHE TAKEN
-- =====================================================================
-- Vertrouwelijke gegevens per medewerker: alleen directie (en de medewerker zelf) kan ze zien
create table if not exists public.employee_private (
  employee_id      uuid primary key references public.employees(id) on delete cascade,
  hourly_wage      numeric(8, 2),
  birth_date       date,
  leave_hours_year numeric(6, 2),               -- leeg = 4 × contracturen per week (wettelijk minimum)
  leave_opening    numeric(6, 2) not null default 0,   -- saldo aan het begin van leave_year
  leave_year       int not null default extract(year from now())::int,
  updated_at       timestamptz not null default now()
);
alter table public.employee_private enable row level security;
drop policy if exists priv_select on public.employee_private;
create policy priv_select on public.employee_private for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
drop policy if exists priv_write on public.employee_private;
create policy priv_write on public.employee_private for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

alter table public.requests add column if not exists leave_hours numeric(6, 2);   -- verlofuren, ingevuld bij goedkeuren

alter table public.settings add column if not exists pct_avond        numeric(5, 2) not null default 0;
alter table public.settings add column if not exists pct_nacht        numeric(5, 2) not null default 0;
alter table public.settings add column if not exists pct_zondag       numeric(5, 2) not null default 0;
alter table public.settings add column if not exists pct_feestdag     numeric(5, 2) not null default 0;
alter table public.settings add column if not exists pct_vakantiegeld numeric(5, 2) not null default 8;
alter table public.settings add column if not exists pct_werkgever    numeric(5, 2) not null default 25;
-- Instellingen die de directie zelf aanpast (pagina Instellingen); leeg = standaard uit config.js
alter table public.settings add column if not exists positions       text[];
alter table public.settings add column if not exists shift_templates jsonb;
alter table public.settings add column if not exists toeslag_windows jsonb;
alter table public.settings add column if not exists mail_on_publish boolean not null default true;
alter table public.settings add column if not exists staffing        jsonb;   -- vaste bezetting: {"0": {"Bediening": 2}} (0 = maandag)
alter table public.settings add column if not exists guest_ratios    jsonb;   -- {"Bediening": 20} = 1 medewerker per 20 gasten
alter table public.settings add column if not exists special_days    jsonb;   -- [{"date": "2026-12-24", "label": "Kerstavond", "kind": "gesloten" | "feestdag"}]

-- Uit dienst: openstaande aanmeldingen en ruilverzoeken vervallen
create or replace function public.trg_employee_inactive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.active and not new.active then
    update public.shift_applications set status = 'rejected' where employee_id = new.id and status = 'pending';
    update public.swaps set status = 'cancelled', decided_at = now()
     where status in ('open', 'accepted') and (from_employee = new.id or to_employee = new.id or taken_by = new.id);
  end if;
  return null;
end $$;
drop trigger if exists employees_inactive on public.employees;
create trigger employees_inactive after update of active on public.employees
  for each row execute function public.trg_employee_inactive();

-- Kloktijden zijn loonadministratie: een medewerker met kloktijden kan niet verwijderd worden (zet op inactief)
alter table public.time_entries drop constraint if exists time_entries_employee_id_fkey;
alter table public.time_entries add constraint time_entries_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;

-- Contracttypes
alter table public.employees add column if not exists contract_type text not null default 'vast';
alter table public.employees drop constraint if exists employees_contract_type_check;
alter table public.employees add constraint employees_contract_type_check check (contract_type in ('vast', 'minmax', 'nuluren', 'oproep', 'stage'));
alter table public.employees add column if not exists contract_min_hours numeric(5, 2);
alter table public.employees add column if not exists contract_end date;

-- Collega's zien alleen naam, functie en kleur; een shiftleader ziet ook het contract (voor waarschuwingen)
drop function if exists public.team();
create function public.team()
returns table (id uuid, name text, "position" text, role text, color text, active boolean,
               contract_type text, contract_hours numeric, contract_min_hours numeric, contract_end date)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.position, e.role, e.color, e.active,
         case when public.is_planner() then e.contract_type end,
         case when public.is_planner() then e.contract_hours end,
         case when public.is_planner() then e.contract_min_hours end,
         case when public.is_planner() then e.contract_end end
    from public.employees e
   where public.my_employee_id() is not null or public.is_manager()
   order by e.name
$$;
revoke execute on function public.team() from public, anon;
grant execute on function public.team() to authenticated;

-- Agenda-abonnement: elke medewerker een eigen geheime link (alleen zelf en directie zien hem)
alter table public.employees add column if not exists calendar_token uuid not null default gen_random_uuid();
create unique index if not exists employees_calendar_token_idx on public.employees (calendar_token);
create or replace function public.reset_calendar_token() returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid := gen_random_uuid();
begin
  update public.employees set calendar_token = t where id = public.my_employee_id();
  if not found then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  return t;
end $$;
revoke execute on function public.reset_calendar_token() from public, anon;
grant execute on function public.reset_calendar_token() to authenticated;

-- Omzet per dag (verwacht en werkelijk) en doelen voor de personeelskosten. Alleen de directie.
create table if not exists public.revenue (
  date       date primary key,
  forecast   numeric(10, 2) check (forecast >= 0),
  actual     numeric(10, 2) check (actual >= 0),
  updated_at timestamptz not null default now()
);
alter table public.revenue enable row level security;
drop policy if exists revenue_mgr on public.revenue;
create policy revenue_mgr on public.revenue for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
alter table public.settings add column if not exists goal_labor_pct    numeric(5, 2);   -- personeelskosten als % van de omzet
alter table public.settings add column if not exists goal_productivity numeric(8, 2);   -- omzet per gewerkt uur
alter table public.settings add column if not exists goal_cost_hour    numeric(6, 2);   -- gemiddelde personeelskosten per uur

-- Verwachte gasten per dag (optioneel, voor de bezettingsberekening). Alleen directie en shiftleaders.
create table if not exists public.day_info (
  date       date primary key,
  guests     int check (guests >= 0),
  note       text,
  updated_at timestamptz not null default now()
);
alter table public.day_info enable row level security;
drop policy if exists day_info_all on public.day_info;
create policy day_info_all on public.day_info for all to authenticated
  using (public.is_planner()) with check (public.is_planner());

-- ---------- Logboek van wijzigingen ----------
create table if not exists public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      uuid references public.employees(id) on delete set null,
  actor_name text,
  tbl        text not null,
  row_id     uuid,
  action     text not null,
  old        jsonb,
  new        jsonb
);
create index if not exists audit_row_idx on public.audit_log (tbl, row_id, at desc);
alter table public.audit_log enable row level security;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (public.is_manager());
revoke insert, update, delete on public.audit_log from authenticated, anon;

create or replace function public.trg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); o jsonb; n jsonb; rid uuid;
begin
  if coalesce(current_setting('rooster.via_clock', true), '') = '1' then return null; end if;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  rid := coalesce((n->>'id')::uuid, (o->>'id')::uuid, (n->>'employee_id')::uuid, (o->>'employee_id')::uuid);
  -- Diensten: alleen wijzigingen aan gepubliceerde diensten vastleggen
  if tg_table_name = 'shifts' and (tg_op = 'INSERT' or coalesce((o->>'published')::boolean, false) = false) then return null; end if;
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k.key, o->k.key), '{}'), coalesce(jsonb_object_agg(k.key, n->k.key), '{}')
      into o, n from jsonb_object_keys(n) as k(key) where o->k.key is distinct from n->k.key and k.key not in ('updated_at');
    if o = '{}'::jsonb then return null; end if;
  end if;
  insert into public.audit_log (actor, actor_name, tbl, row_id, action, old, new)
  values (me, (select name from public.employees where id = me), tg_table_name, rid, lower(tg_op), o, n);
  return null;
end $$;

drop trigger if exists audit_time_entries on public.time_entries;
create trigger audit_time_entries after insert or update or delete on public.time_entries for each row execute function public.trg_audit();
drop trigger if exists audit_employees on public.employees;
create trigger audit_employees after insert or update or delete on public.employees for each row execute function public.trg_audit();
drop trigger if exists audit_requests on public.requests;
create trigger audit_requests after update or delete on public.requests for each row execute function public.trg_audit();
drop trigger if exists audit_shifts on public.shifts;
create trigger audit_shifts after update or delete on public.shifts for each row execute function public.trg_audit();
drop trigger if exists audit_private on public.employee_private;
create trigger audit_private after insert or update or delete on public.employee_private for each row execute function public.trg_audit();

-- ---------- Automatische taken ----------
create table if not exists public.reminder_log (
  kind text not null,
  ref  uuid not null,
  at   timestamptz not null default now(),
  primary key (kind, ref)
);
alter table public.reminder_log enable row level security;   -- geen policies: alleen via run_jobs()

create or replace function public.shift_start_ts(x public.shifts) returns timestamptz
language sql stable as $$ select (x.date + x.start_time) at time zone 'Europe/Amsterdam' $$;
create or replace function public.shift_end_ts(x public.shifts) returns timestamptz
language sql stable as $$
  select ((x.date + x.end_time) + case when x.end_time <= x.start_time then interval '1 day' else interval '0' end) at time zone 'Europe/Amsterdam'
$$;
create or replace function public.entry_shift(e public.time_entries) returns public.shifts
language sql stable security definer set search_path = public as $$
  select x.* from public.shifts x
   where x.employee_id = e.employee_id and x.published
     and x.date = (e.clock_in at time zone 'Europe/Amsterdam')::date
   order by abs(extract(epoch from (public.shift_start_ts(x) - e.clock_in))) limit 1
$$;

-- Wordt elke 15 minuten uitgevoerd (pg_cron) en daarnaast door de app zelf; doet niets dubbel.
create or replace function public.run_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare e public.time_entries; x public.shifts; pe timestamptz; n int := 0; hhmm text;
begin
  -- 1. Vergeten uit te klokken: herinnering na 15 min, automatisch uitklokken op de geplande eindtijd na 60 min
  for e in select * from public.time_entries where clock_out is null loop
    x := public.entry_shift(e);
    if x.id is not null then
      pe := public.shift_end_ts(x);
      hhmm := to_char(pe at time zone 'Europe/Amsterdam', 'HH24:MI');
      if now() > pe + interval '60 minutes' then
        update public.time_entries set
          clock_out = greatest(pe, clock_in + interval '1 minute'),
          break_minutes = break_minutes + case when break_started_at is null then 0
                            else greatest(0, round(extract(epoch from (greatest(pe, break_started_at) - break_started_at)) / 60))::int end,
          break_started_at = null, flags = flags || array['auto_uit'], status = 'pending'
        where id = e.id;
        perform public.notify(e.employee_id, 'Automatisch uitgeklokt',
          'Je was vergeten uit te klokken en bent uitgeklokt op ' || hhmm || ' (einde dienst). Langer gewerkt? Laat het de directie weten.', 'mijn');
        n := n + 1;
      elsif now() > pe + interval '15 minutes' then
        insert into public.reminder_log (kind, ref) values ('uitklokken', e.id) on conflict do nothing;
        if found then perform public.notify(e.employee_id, 'Vergeet niet uit te klokken', 'Je dienst eindigde om ' || hhmm || '.', 'mijn'); end if;
      end if;
    elsif now() > e.clock_in + interval '16 hours' then
      update public.time_entries set clock_out = clock_in + interval '8 hours', break_started_at = null,
             flags = flags || array['auto_uit'], status = 'pending' where id = e.id;
      perform public.notify(e.employee_id, 'Automatisch uitgeklokt', 'Je stond langer dan 16 uur ingeklokt zonder geplande dienst. De directie controleert je uren.', 'mijn');
      perform public.notify_managers('Registratie controleren', public.first_name(e.employee_id) || ' stond langer dan 16 uur ingeklokt zonder dienst.', 'klokken');
      n := n + 1;
    end if;
  end loop;

  -- 2. Herinnering: dienst begint over ongeveer een uur
  for x in select y.* from public.shifts y
            where y.published and y.employee_id is not null and y.date between public.today_nl() - 1 and public.today_nl() + 1
              and public.shift_start_ts(y) between now() + interval '45 minutes' and now() + interval '75 minutes' loop
    insert into public.reminder_log (kind, ref) values ('dienst', x.id) on conflict do nothing;
    if found then
      perform public.notify(x.employee_id, 'Je dienst begint om ' || to_char(x.start_time, 'HH24:MI'),
        public.shift_label(x.date, x.start_time, x.end_time) || coalesce(' · ' || x.position, ''), 'mijn');
    end if;
  end loop;

  -- 3. Privacy: exacte locaties na 90 dagen wissen (afstand en wifi/gps blijven), oude meldingen opruimen
  update public.time_entries set in_lat = null, in_lng = null, in_accuracy = null, out_lat = null, out_lng = null, out_accuracy = null
   where clock_in < now() - interval '90 days' and (in_lat is not null or out_lat is not null);
  delete from public.notifications where created_at < now() - interval '180 days';
  delete from public.reminder_log where at < now() - interval '30 days';
  return n;
end $$;
revoke execute on function public.run_jobs() from public, anon;
grant execute on function public.run_jobs() to authenticated;

-- Elke 15 minuten automatisch (Supabase: Database → Extensions → pg_cron aanzetten)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rooster-jobs';
  perform cron.schedule('rooster-jobs', '*/15 * * * *', 'select public.run_jobs()');
exception when others then
  raise notice 'pg_cron niet beschikbaar (%). Zet pg_cron aan en voer dit blok opnieuw uit; de app voert de taken ook zelf uit.', sqlerrm;
end $$;

-- Wanneer een medewerker voor het laatst per e-mail is uitgenodigd (gezet door de Edge Function invite-employee)
alter table public.employees add column if not exists invited_at timestamptz;

-- Interne sleutels (zoals de sleutels voor pushmeldingen). Alleen de server-functies kunnen erbij.
create table if not exists public.app_secrets (key text primary key, value text not null, created_at timestamptz not null default now());
alter table public.app_secrets enable row level security;

-- =====================================================================
--  PRIKBORD: mededelingen van de directie (nieuwe menukaart, huisregels e.d.)
-- =====================================================================
create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (length(title) between 1 and 120),
  body            text,
  pinned          boolean not null default false,
  attachment_path text,             -- bestand in opslag-map 'mededelingen'
  attachment_name text,
  attachment_type text,
  created_by      uuid references public.employees(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, employee_id)
);
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements for select to authenticated
  using (public.my_employee_id() is not null or public.is_manager());
drop policy if exists ann_write on public.announcements;
create policy ann_write on public.announcements for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
drop policy if exists annr_select on public.announcement_reads;
create policy annr_select on public.announcement_reads for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
drop policy if exists annr_insert on public.announcement_reads;
create policy annr_insert on public.announcement_reads for insert to authenticated
  with check (employee_id = public.my_employee_id());

-- Nieuwe mededeling: iedereen krijgt een melding (en pushmelding)
create or replace function public.trg_announcement_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_team('📣 ' || new.title, coalesce(left(new.body, 140), 'Nieuwe mededeling op het prikbord'), 'mededelingen', new.created_by);
  return null;
end $$;
drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.trg_announcement_notify();

-- Bijgewerkte mededeling opnieuw melden: iedereen moet hem opnieuw lezen
create or replace function public.renotify_announcement(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.announcements;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan dit.'; end if;
  select * into a from public.announcements where id = p_id;
  if not found then raise exception 'Mededeling niet gevonden.'; end if;
  delete from public.announcement_reads where announcement_id = p_id;
  perform public.notify_team('📣 ' || a.title, coalesce(left(a.body, 140), 'Bijgewerkte mededeling op het prikbord'), 'mededelingen', public.my_employee_id());
end $$;
revoke execute on function public.renotify_announcement(uuid) from public, anon;
grant execute on function public.renotify_announcement(uuid) to authenticated;

-- Bijlagen (foto of pdf, bv. de menukaart) in een besloten opslag-map; alleen ingelogd team kan ze openen
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('mededelingen', 'mededelingen', false) on conflict (id) do nothing;
    execute 'drop policy if exists mededelingen_lezen on storage.objects';
    execute $p$create policy mededelingen_lezen on storage.objects for select to authenticated
      using (bucket_id = 'mededelingen' and (public.my_employee_id() is not null or public.is_manager()))$p$;
    execute 'drop policy if exists mededelingen_plaatsen on storage.objects';
    execute $p$create policy mededelingen_plaatsen on storage.objects for insert to authenticated
      with check (bucket_id = 'mededelingen' and public.is_manager())$p$;
    execute 'drop policy if exists mededelingen_verwijderen on storage.objects';
    execute $p$create policy mededelingen_verwijderen on storage.objects for delete to authenticated
      using (bucket_id = 'mededelingen' and public.is_manager())$p$;
  end if;
exception when others then
  raise notice 'Opslag voor bijlagen niet ingesteld (%). Mededelingen werken wel; alleen bijlagen niet.', sqlerrm;
end $$;

-- =====================================================================
--  TOEGANG PER TABEL
--  Werkt ook als "Automatically expose new tables" in Supabase UIT staat.
--  Welke rijen iemand ziet of wijzigt, bepalen daarna de beveiligingsregels (RLS) hierboven.
-- =====================================================================
revoke all on all tables in schema public from anon;                       -- niet ingelogd: nergens bij
revoke truncate, references, trigger on all tables in schema public from authenticated;   -- tabel leegmaken omzeilt RLS
grant select, insert, update, delete on
  public.employees, public.shifts, public.requests, public.settings, public.time_entries,
  public.shift_applications, public.swaps, public.availability, public.push_subscriptions,
  public.employee_private, public.day_info, public.revenue, public.announcements
  to authenticated;
grant select, insert on public.announcement_reads to authenticated;
grant select on public.notifications, public.audit_log to authenticated;
revoke insert, update, delete on public.notifications, public.audit_log from authenticated;
grant update (read_at) on public.notifications to authenticated;          -- alleen 'gelezen' zelf zetten
revoke all on public.reminder_log from authenticated;
revoke all on public.app_secrets from authenticated;                        -- sleutels: alleen server                      -- alleen voor interne taken
grant usage, select on all sequences in schema public to authenticated;
-- Server-functies (Edge Functions zoals invite-employee) gebruiken de rol service_role; die komt nooit in de app
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- =====================================================================
--  EXTRA AFSCHERMING (uit de beveiligingscontrole van Supabase)
-- =====================================================================
do $$ declare f record; begin
  -- vaste zoekpad voor rekenfuncties
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('shift_label', 'request_ip', 'today_nl', 'distance_m', 'shift_start_ts', 'shift_end_ts')
  loop execute format('alter function %s set search_path = public', f.sig); end loop;
  -- interne hulpfuncties en triggers: niet aanroepbaar via internet (de database gebruikt ze zelf)
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('entry_shift', 'first_name', 'shift_label', 'link_employee', 'link_new_user', 'trg_audit',
              'trg_request_notify', 'trg_shift_notify', 'trg_shift_swaps', 'trg_employee_inactive', 'trg_announcement_notify', 'notify', 'notify_team', 'notify_managers',
              'shift_start_ts', 'shift_end_ts', 'distance_m', 'request_ip')
  loop execute format('revoke execute on function %s from public, anon, authenticated', f.sig); end loop;
  -- hulpfuncties voor de beveiligingsregels: alleen voor ingelogde gebruikers
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('is_manager', 'is_planner', 'my_employee_id', 'today_nl')
  loop execute format('revoke execute on function %s from public, anon', f.sig); execute format('grant execute on function %s to authenticated', f.sig); end loop;
end $$;
-- app_secrets en reminder_log hebben bewust geen regels: alleen de server mag erbij.

-- =====================================================================
--  EERSTE LEIDINGGEVENDE — pas naam en e-mail aan en voer daarna uit:
-- =====================================================================
-- insert into public.employees (name, email, role, position)
-- values ('Voornaam Achternaam', 'jij@lilou.nl', 'manager', 'Shiftleader');
