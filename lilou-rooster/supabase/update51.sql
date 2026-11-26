-- Update 51: verlof voor een deel van de dag (bijv. een uurtje vrij voor de tandarts)
alter table public.requests add column if not exists from_time time;
alter table public.requests add column if not exists to_time time;
alter table public.requests drop constraint if exists requests_part_day;
alter table public.requests add constraint requests_part_day check (
  (from_time is null and to_time is null)
  or (from_time is not null and to_time is not null and from_time <> to_time and start_date = end_date and type <> 'ziek')
);

-- melding en labels met de tijden erbij
create or replace function public.req_label(r public.requests) returns text
language sql stable set search_path = public as $$
  select (case r.type when 'vakantie' then 'Vakantie' when 'vrij' then 'Vrije dag' when 'onbeschikbaar' then 'Niet beschikbaar' else 'Ziekmelding' end)
      || ' ' || to_char(r.start_date, 'DD-MM') || case when r.end_date <> r.start_date then ' t/m ' || to_char(r.end_date, 'DD-MM') else '' end
      || case when r.from_time is not null then ' ' || to_char(r.from_time, 'HH24:MI') || '–' || to_char(r.to_time, 'HH24:MI') else '' end
$$;

-- raakt verlof (eventueel een deel van de dag) deze dienst? zonder tijden: altijd
create or replace function public.leave_hits(f time, t time, st time, et time) returns boolean
language sql immutable set search_path = public as $$
  select f is null or t is null or st is null or et is null or (
    (extract(epoch from f) / 60) < (extract(epoch from et) / 60 + case when et <= st then 1440 else 0 end)
    and (extract(epoch from st) / 60) < (extract(epoch from t) / 60 + case when t <= f then 1440 else 0 end))
$$;

-- herinneringen: verlof voor een deel van de dag telt alleen als het de dienst raakt
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
                                and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and y.date between r.start_date and r.end_date
                                and public.leave_hits(r.from_time, r.to_time, y.start_time, y.end_time)) loop
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

create or replace function public.late_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare x record; n int := 0; lead_ids uuid[];
begin
  for x in select y.*, public.shift_start_ts(y) st from public.shifts y
            where y.published and y.employee_id is not null and y.date between public.today_nl() - 1 and public.today_nl()
              and public.shift_start_ts(y) between now() - interval '60 minutes' and now() - interval '10 minutes'
              and not exists (select 1 from public.requests r where r.employee_id = y.employee_id and r.status <> 'rejected'
                                and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and y.date between r.start_date and r.end_date
                                and public.leave_hits(r.from_time, r.to_time, y.start_time, y.end_time))
              and not exists (select 1 from public.time_entries t where t.employee_id = y.employee_id
                                and t.clock_in between public.shift_start_ts(y) - interval '3 hours' and now()
                                and (t.clock_out is null or t.clock_out > public.shift_start_ts(y))) loop
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

create or replace function public.lists_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare d date := public.business_day(); ds text := d::text; first_start timestamptz; last_end timestamptz;
        ld record; m text; t_at timestamptz; msg text; n int := 0;
begin
  select min(public.shift_start_ts(s)), max(public.shift_end_ts(s)) into first_start, last_end
    from public.shifts s where s.published and s.employee_id is not null and s.date = d;
  if first_start is null then return 0; end if;
  for ld in
    select e.id, min(public.shift_start_ts(s)) st, max(public.shift_end_ts(s)) en
      from public.employees e join public.shifts s on s.employee_id = e.id
     where s.published and s.date = d and e.active and e.role in ('manager', 'planner')
       and not exists (select 1 from public.requests r where r.employee_id = e.id and r.status <> 'rejected'
                        and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and d between r.start_date and r.end_date
                        and public.leave_hits(r.from_time, r.to_time, s.start_time, s.end_time))
     group by e.id
  loop
    foreach m in array array['opening', 'sluiting'] loop
      t_at := case m when 'opening' then greatest(first_start + interval '60 minutes', ld.st + interval '15 minutes')
                     else least(last_end, ld.en) - interval '30 minutes' end;
      continue when now() < t_at or now() > t_at + interval '3 hours' or now() > ld.en + interval '30 minutes';
      select string_agg(x.name || ' (' || x.done || ' van ' || x.total || ')', ', ' order by x.sort, x.name) into msg
        from (
          select c.name, c.sort, its.total,
                 (select count(*) from public.checklist_ticks t
                   where t.checklist_id = c.id and t.period = ds and t.removed_at is null and t.item_id = any(its.ids)) done
            from public.checklists c
            cross join lateral (
              select count(*) total, coalesce(array_agg(it->>'id'), '{}') ids
                from jsonb_array_elements(c.items) it
               where coalesce(it->>'from', '') <= ds and (coalesce(it->>'removed', '') = '' or it->>'removed' > ds)) its
           where c.active
             and (case m when 'opening' then c.moment = 'opening' else c.moment in ('dag', 'sluiting') end)
             and (c.department = '' or exists (select 1 from public.shifts s where s.published and s.date = d
                                                and s.employee_id is not null and s.position = c.department))
        ) x
       where x.total > 0 and x.done < x.total;
      continue when msg is null;
      insert into public.reminder_log (kind, ref) values ('lijsten', md5(ds || m || ld.id::text)::uuid) on conflict do nothing;
      if found then
        perform public.notify(ld.id, case m when 'opening' then 'Openingslijsten nog niet af' else 'Sluitingslijsten nog niet af' end,
                              'Nog open: ' || msg || '.', 'lijsten');
        n := n + 1;
      end if;
    end loop;
  end loop;
  return n;
end $$;

-- (Lunchkaart: door de directie zelf geüpload in de app, niet via de database)
