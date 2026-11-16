-- =====================================================================
--  UPDATE 30: ziek tot je beter bent (zonder vaste einddatum), ingeklokt-overzicht alleen vandaag
-- =====================================================================
alter table public.requests add column if not exists open_end boolean not null default false;

create or replace function public.sick_recover(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); r public.requests;
begin
  select * into r from public.requests where id = p_id and employee_id = me and type = 'ziek';
  if not found then raise exception 'Ziekmelding niet gevonden.'; end if;
  update public.requests set end_date = greatest(r.start_date, public.today_nl()), open_end = false
   where id = p_id and (r.open_end or r.end_date > public.today_nl());
  insert into public.notifications (employee_id, title, body, view)
  select id, '💪 Weer beter', public.first_name(me) || ' is weer beter en kan weer werken.', case when role = 'manager' then 'aanvragen:verlof' else 'planning' end
    from public.employees where role in ('manager', 'planner') and active and id <> me;
end $$;
revoke execute on function public.sick_recover(uuid) from public, anon;
grant execute on function public.sick_recover(uuid) to authenticated;

create or replace function public.clocked_today() returns table (employee_id uuid, clock_in timestamptz, clock_out timestamptz, on_break boolean)
language sql stable security definer set search_path = public as $$
  select t.employee_id, t.clock_in, t.clock_out, t.break_started_at is not null
    from public.time_entries t
   where public.is_planner()
     and (t.clock_out is null or (t.clock_in at time zone 'Europe/Amsterdam')::date = public.today_nl())
     and t.clock_in > now() - interval '20 hours'
   order by t.clock_in
$$;
revoke execute on function public.clocked_today() from public, anon;
grant execute on function public.clocked_today() to authenticated;

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
