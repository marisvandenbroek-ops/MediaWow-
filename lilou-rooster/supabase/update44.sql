-- Update 44: diploma's met verloopdatum, dagrapport van de shiftleader, melding bij niet ingeklokt. Veilig om vaker uit te voeren.

-- ---------- Diploma's (SVH Sociale Hygiëne, BHV, HACCP, EHBO) ----------
create table if not exists public.employee_certs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind        text not null check (kind in ('svh', 'bhv', 'haccp', 'ehbo', 'anders')),
  label       text check (label is null or length(label) <= 80),
  expires     date,
  created_at  timestamptz not null default now()
);
create index if not exists employee_certs_emp_idx on public.employee_certs (employee_id);
alter table public.employee_certs enable row level security;
-- Lezen: de medewerker zelf en de leiding (shiftleaders zien wie SVH/BHV heeft voor de planning)
drop policy if exists certs_select on public.employee_certs;
create policy certs_select on public.employee_certs for select to authenticated
  using (public.is_planner() or employee_id = public.my_employee_id());
-- Schrijven: alleen de directie
drop policy if exists certs_write on public.employee_certs;
create policy certs_write on public.employee_certs for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
revoke all on public.employee_certs from public, anon;
grant select, insert, update, delete on public.employee_certs to authenticated;

create or replace function public.cert_label(k text, l text) returns text language sql immutable as $$
  select coalesce(nullif(l, ''), case k when 'svh' then 'Sociale Hygiëne (SVH)' when 'bhv' then 'BHV' when 'haccp' then 'HACCP'
                                         when 'ehbo' then 'EHBO' else 'Diploma' end)
$$;

-- Herinnering 60 dagen (en nog eens rond 30 dagen) voor het verlopen, en op de dag zelf
create or replace function public.cert_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare c record; n int := 0; d date := public.today_nl();
begin
  for c in select x.*, e.name from public.employee_certs x join public.employees e on e.id = x.employee_id
            where e.active and x.expires is not null and x.expires between d - 7 and d + 60 loop
    insert into public.reminder_log (kind, ref) values (case when c.expires < d then 'diploma0' else 'diploma60' end, c.id) on conflict do nothing;
    if found then
      perform public.notify(c.employee_id, public.cert_label(c.kind, c.label) || case when c.expires < d then ' is verlopen' else ' verloopt binnenkort' end,
        'Geldig tot ' || to_char(c.expires, 'DD-MM-YYYY') || '. Regel op tijd een herhaling en geef het nieuwe diploma door aan de directie.', 'mijn');
      perform public.notify_managers('Diploma ' || case when c.expires < d then 'verlopen' else 'verloopt' end || ': ' || public.first_name(c.employee_id),
        public.cert_label(c.kind, c.label) || ' van ' || c.name || ' is geldig tot ' || to_char(c.expires, 'DD-MM-YYYY') || '.', 'team', c.employee_id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.cert_reminders() from public, anon, authenticated;

-- ---------- Niet ingeklokt, 10 minuten na het begin van de dienst ----------
create or replace function public.late_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare x record; n int := 0; lead_ids uuid[];
begin
  for x in select y.*, public.shift_start_ts(y) st from public.shifts y
            where y.published and y.employee_id is not null and y.date between public.today_nl() - 1 and public.today_nl()
              and public.shift_start_ts(y) between now() - interval '60 minutes' and now() - interval '10 minutes'
              and not exists (select 1 from public.requests r where r.employee_id = y.employee_id and r.status <> 'rejected'
                                and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and y.date between r.start_date and r.end_date)
              and not exists (select 1 from public.time_entries t where t.employee_id = y.employee_id
                                and t.clock_in between public.shift_start_ts(y) - interval '3 hours' and now()) loop
    insert into public.reminder_log (kind, ref) values ('telaat', x.id) on conflict do nothing;
    continue when not found;
    -- de leiding die nu werkt; is er niemand, dan de directie
    select array_agg(distinct e.id) into lead_ids from public.employees e join public.shifts s on s.employee_id = e.id
     where e.active and e.role in ('manager', 'planner') and e.id <> x.employee_id and s.published
       and s.date between public.today_nl() - 1 and public.today_nl()
       and now() between public.shift_start_ts(s) - interval '30 minutes' and public.shift_end_ts(s);
    if lead_ids is null then
      select array_agg(id) into lead_ids from public.employees where role = 'manager' and active and id <> x.employee_id;
    end if;
    insert into public.notifications (employee_id, title, body, view)
    select l, public.first_name(x.employee_id) || ' is nog niet ingeklokt',
           'Dienst begon om ' || to_char(x.start_time, 'HH24:MI') || coalesce(' · ' || x.position, '') || '. Even bellen?', 'planning'
      from unnest(coalesce(lead_ids, '{}')) l;
    perform public.notify(x.employee_id, 'Je bent nog niet ingeklokt', 'Je dienst begon om ' || to_char(x.start_time, 'HH24:MI') || '. Vergeet niet in te klokken.', 'mijn');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.late_reminders() from public, anon, authenticated;

-- ---------- Dagrapport van de shiftleader ----------
create table if not exists public.day_reports (
  date        date primary key,
  busy        text check (busy is null or busy in ('rustig', 'normaal', 'druk', 'heel druk')),
  notes       text check (notes is null or length(notes) <= 4000),
  sold_out    text check (sold_out is null or length(sold_out) <= 1000),
  team        text check (team is null or length(team) <= 2000),
  employee_id uuid references public.employees(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.day_reports enable row level security;
drop policy if exists dayrep_select on public.day_reports;
create policy dayrep_select on public.day_reports for select to authenticated using (public.is_planner());
revoke insert, update, delete on public.day_reports from authenticated, anon;
grant select on public.day_reports to authenticated;

create or replace function public.save_day_report(p_date date, p_busy text, p_notes text, p_sold_out text, p_team text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); isnew boolean;
begin
  if not public.is_planner() then raise exception 'Alleen de leiding kan een dagrapport maken.'; end if;
  if not public.is_manager() and (p_date < public.business_day() - 1 or p_date > public.business_day()) then
    raise exception 'Een dagrapport kun je alleen voor vandaag of gisteren invullen.';
  end if;
  isnew := not exists (select 1 from public.day_reports where date = p_date);
  insert into public.day_reports (date, busy, notes, sold_out, team, employee_id)
  values (p_date, nullif(p_busy, ''), nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_sold_out, '')), ''), nullif(btrim(coalesce(p_team, '')), ''), me)
  on conflict (date) do update set busy = excluded.busy, notes = excluded.notes, sold_out = excluded.sold_out, team = excluded.team,
                                   employee_id = excluded.employee_id, updated_at = now();
  if isnew then
    perform public.notify_managers('Dagrapport ' || to_char(p_date, 'DD-MM'), 'Van ' || public.first_name(me) || coalesce(': ' || left(nullif(btrim(coalesce(p_notes, '')), ''), 120), '.'), 'overzicht:rapport', me);
  end if;
end $$;
revoke execute on function public.save_day_report(date, text, text, text, text) from public, anon;
grant execute on function public.save_day_report(date, text, text, text, text) to authenticated;

-- run_jobs: nu ook 'niet ingeklokt' en diploma's
create or replace function public.run_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare e public.time_entries; x public.shifts; pe timestamptz; n int := 0; hhmm text;
begin
  if not pg_try_advisory_xact_lock(4711) then return 0; end if;   -- draait al (cron of een ander toestel)

  -- 1. Vergeten uit te klokken: herinnering na 15 min, automatisch uitklokken op de geplande eindtijd na 60 min
  for e in select * from public.time_entries where clock_out is null loop
    begin
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
          where id = e.id and clock_out is null;
          if found then
            perform public.notify(e.employee_id, 'Automatisch uitgeklokt',
              'Je was vergeten uit te klokken en bent uitgeklokt op ' || hhmm || ' (einde dienst). Langer gewerkt? Laat het de directie weten.', 'mijn');
            n := n + 1;
          end if;
        elsif now() > pe + interval '15 minutes' then
          insert into public.reminder_log (kind, ref) values ('uitklokken', e.id) on conflict do nothing;
          if found then perform public.notify(e.employee_id, 'Vergeet niet uit te klokken', 'Je dienst eindigde om ' || hhmm || '.', 'mijn'); end if;
        end if;
      elsif now() > e.clock_in + interval '16 hours' then
        update public.time_entries set clock_out = clock_in + interval '8 hours', break_started_at = null,
               flags = flags || array['auto_uit'], status = 'pending' where id = e.id and clock_out is null;
        if found then
          perform public.notify(e.employee_id, 'Automatisch uitgeklokt', 'Je stond langer dan 16 uur ingeklokt zonder geplande dienst. De directie controleert je uren.', 'mijn');
          perform public.notify_managers('Registratie controleren', public.first_name(e.employee_id) || ' stond langer dan 16 uur ingeklokt zonder dienst.', 'klokken');
          n := n + 1;
        end if;
      end if;
    exception when others then
      raise warning 'run_jobs uitklokken %: %', e.id, sqlerrm;
    end;
  end loop;

  -- 2. Herinnering: dienst begint over ongeveer een uur (niet bij verlof of ziek)
  for x in select y.* from public.shifts y
            where y.published and y.employee_id is not null and y.date between public.today_nl() - 1 and public.today_nl() + 1
              and public.shift_start_ts(y) between now() + interval '45 minutes' and now() + interval '75 minutes'
              and not exists (select 1 from public.requests r where r.employee_id = y.employee_id and r.status <> 'rejected'
                                and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and y.date between r.start_date and r.end_date) loop
    begin
      insert into public.reminder_log (kind, ref) values ('dienst', x.id) on conflict do nothing;
      if found then
        perform public.notify(x.employee_id, 'Je dienst begint om ' || to_char(x.start_time, 'HH24:MI'),
          public.shift_label(x.date, x.start_time, x.end_time) || coalesce(' · ' || x.position, ''), 'mijn');
      end if;
    exception when others then
      raise warning 'run_jobs herinnering %: %', x.id, sqlerrm;
    end;
  end loop;

  -- Ziek zonder einddatum: loopt elke dag door tot 'Ik ben weer beter'
  begin
    update public.requests set end_date = public.today_nl()
     where type = 'ziek' and open_end and status <> 'rejected' and end_date < public.today_nl();
  exception when others then
    raise warning 'run_jobs ziek: %', sqlerrm;
  end;

  -- Lijsten nog niet af: herinnering aan de shiftleader van dienst
  begin
    perform public.lists_reminders();
  exception when others then
    raise warning 'run_jobs lijsten: %', sqlerrm;
  end;

  -- Niet ingeklokt 10 minuten na het begin van de dienst
  begin
    perform public.late_reminders();
  exception when others then
    raise warning 'run_jobs te laat: %', sqlerrm;
  end;

  -- Diploma's die bijna verlopen
  begin
    perform public.cert_reminders();
  exception when others then
    raise warning 'run_jobs diploma: %', sqlerrm;
  end;

  -- 3. Privacy: exacte locaties na 90 dagen wissen (afstand en wifi/gps blijven), oude meldingen opruimen
  begin
    update public.time_entries set in_lat = null, in_lng = null, in_accuracy = null, out_lat = null, out_lng = null, out_accuracy = null
     where clock_in < now() - interval '90 days' and (in_lat is not null or out_lat is not null);
    delete from public.notifications where created_at < now() - interval '180 days';
    delete from public.reminder_log where at < now() - interval '30 days';
    -- Lijsten en registraties: 2 jaar bewaren (HACCP), meldingen (incidenten) 5 jaar; zie privacyverklaring
    if to_regclass('public.checklist_ticks') is not null then
      delete from public.checklist_ticks where at < now() - interval '2 years';
      delete from public.log_entries where kind <> 'melding' and at < now() - interval '2 years';
      delete from public.log_entries where kind = 'melding' and at < now() - interval '5 years';
    end if;
    if to_regclass('public.day_reports') is not null then
      delete from public.day_reports where date < public.today_nl() - interval '2 years';
    end if;
  exception when others then
    raise warning 'run_jobs opruimen: %', sqlerrm;
  end;
  return n;
end $$;
revoke execute on function public.run_jobs() from public, anon;
grant execute on function public.run_jobs() to authenticated;
