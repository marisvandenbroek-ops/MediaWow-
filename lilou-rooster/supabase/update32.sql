-- Update 32: herinnering aan de shiftleader als lijsten bij opening of sluiting nog niet af zijn.
-- Veilig om vaker uit te voeren.
-- Herinnering voor de shiftleader: lijsten nog niet af bij opening (1 uur na de eerste dienst)
-- en bij sluiting (half uur voor het einde van de laatste dienst, of van de eigen dienst als die eerder stopt)
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
                        and r.type in ('vakantie', 'vrij', 'onbeschikbaar', 'ziek') and d between r.start_date and r.end_date)
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
revoke execute on function public.lists_reminders() from public, anon, authenticated;

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
