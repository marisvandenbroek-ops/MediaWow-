-- =====================================================================
--  CONTROLERONDE 15 NOVEMBER
-- =====================================================================
-- 1. Een klokregistratie hoort alleen bij een dienst als je tijdens (of vlak voor) die dienst inklokte.
--    Voorheen kon een avondregistratie aan de middagdienst van dezelfde dag worden gekoppeld
--    en dan direct automatisch worden uitgeklokt.
create or replace function public.entry_shift(e public.time_entries) returns public.shifts
language sql stable security definer set search_path = public as $$
  select x.* from public.shifts x
   where x.employee_id = e.employee_id and x.published
     and x.date between (e.clock_in at time zone 'Europe/Amsterdam')::date - 1 and (e.clock_in at time zone 'Europe/Amsterdam')::date
     and e.clock_in between public.shift_start_ts(x) - interval '3 hours' and public.shift_end_ts(x)
   order by abs(extract(epoch from (public.shift_start_ts(x) - e.clock_in))) limit 1
$$;
revoke execute on function public.entry_shift(public.time_entries) from public, anon, authenticated;

-- 2. Automatische taken: nooit twee keer tegelijk, en één fout stopt de rest niet meer
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
  exception when others then
    raise warning 'run_jobs opruimen: %', sqlerrm;
  end;
  return n;
end $$;
revoke execute on function public.run_jobs() from public, anon;
grant execute on function public.run_jobs() to authenticated;

-- 3. Medewerkers mogen bij een nieuwe aanvraag zelf geen verlofuren of beslissing meesturen
drop policy if exists req_insert on public.requests;
create policy req_insert on public.requests for insert to authenticated
  with check (employee_id = public.my_employee_id() and status = 'pending' and manager_note is null and leave_hours is null);

-- 4. Afspraken opnieuw laten tekenen: altijd +1 via de server, nooit terug naar een lagere versie
create or replace function public.bump_rules() returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan dit.'; end if;
  update public.settings set rules_version = rules_version + 1, updated_at = now() where id = 1 returning rules_version into v;
  return v;
end $$;
revoke execute on function public.bump_rules() from public, anon;
grant execute on function public.bump_rules() to authenticated;

create or replace function public.trg_rules_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rules_version < old.rules_version then raise exception 'De versie van de afspraken kan niet omlaag.'; end if;
  if new.rules_version > old.rules_version then
    insert into public.notifications (employee_id, title, body, view)
    select id, '📘 Afspraken bijgewerkt', 'Lees de nieuwe afspraken en tik op Gelezen en akkoord.', 'mijn'
      from public.employees where active and role <> 'manager';
  end if;
  return new;
end $$;
revoke execute on function public.trg_rules_notify() from public, anon, authenticated;

-- 5. Snellere zoekopdrachten die de app vaak doet
create index if not exists time_entries_emp_in_idx on public.time_entries (employee_id, clock_in);
create index if not exists time_entries_open_idx on public.time_entries (employee_id) where clock_out is null;
create index if not exists notifications_unread_idx on public.notifications (employee_id) where read_at is null;
create index if not exists swaps_from_idx on public.swaps (from_employee);
create index if not exists swaps_to_idx on public.swaps (to_employee);
create index if not exists shift_applications_emp_idx on public.shift_applications (employee_id);
create index if not exists availability_date_idx on public.availability (date);
create index if not exists requests_emp_idx on public.requests (employee_id, end_date);
create index if not exists log_entries_open_idx on public.log_entries (at) where flagged and resolved_at is null;

-- 6. Hulpfunctie van Supabase zelf niet via internet aanroepbaar
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
