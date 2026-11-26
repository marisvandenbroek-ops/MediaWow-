-- Update 52: eindcontrole privacy en beveiliging
-- 1. Logboek bewaart nooit kloklocaties; locatiewissen na 90 dagen komt niet in het logboek; logboek 7 jaar
create or replace function public.trg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); o jsonb; n jsonb; rid uuid;
        loc text[] := array['in_lat', 'in_lng', 'in_accuracy', 'out_lat', 'out_lng', 'out_accuracy'];
begin
  if coalesce(current_setting('rooster.via_clock', true), '') = '1' then return null; end if;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  if tg_table_name = 'time_entries' then o := o - loc; n := n - loc; end if;
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
-- eenmalig: bestaande locaties uit het logboek halen
update public.audit_log
   set old = case when old is null then null else old - array['in_lat', 'in_lng', 'in_accuracy', 'out_lat', 'out_lng', 'out_accuracy'] end,
       new = case when new is null then null else new - array['in_lat', 'in_lng', 'in_accuracy', 'out_lat', 'out_lng', 'out_accuracy'] end
 where tbl = 'time_entries' and (old ?| array['in_lat', 'out_lat'] or new ?| array['in_lat', 'out_lat']);

-- 2. Ziekmeldingen kan een medewerker niet zelf verwijderen (wel 'Ik ben weer beter')
drop policy if exists req_delete on public.requests;
create policy req_delete on public.requests for delete to authenticated
  using (public.is_manager() or (employee_id = public.my_employee_id() and status = 'pending' and type <> 'ziek'));

-- 3. Uit dienst: ook maat, diploma's en getekende afspraken wissen (zoals in de privacyverklaring)
create or replace function public.trg_profile_inactive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.active and not new.active then
    update public.employee_profile set emergency = '[]'::jsonb, share_phone = false, shirt_size = null, updated_at = now() where employee_id = new.id;
    delete from public.employee_certs where employee_id = new.id;
    delete from public.rules_acks where employee_id = new.id;
  end if;
  return null;
end $$;

-- 4. Shiftleaders zien van collega's alleen wie wanneer weg is (geen verlofuren of opmerkingen)
drop policy if exists req_select on public.requests;
create policy req_select on public.requests for select to authenticated
  using (public.is_manager() or employee_id = public.my_employee_id());
create or replace function public.team_leave() returns table (id uuid, employee_id uuid, type text, start_date date, end_date date,
  from_time time, to_time time, status text, open_end boolean, recovered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.employee_id, r.type, r.start_date, r.end_date, r.from_time, r.to_time, r.status, r.open_end, r.recovered_at
    from public.requests r
   where public.is_planner() and r.status <> 'rejected' and r.end_date >= public.today_nl() - 400
$$;
revoke execute on function public.team_leave() from public, anon;
grant execute on function public.team_leave() to authenticated;

-- 5. Herinneringen: alleen goedgekeurd verlof (of ziek) telt als vrij; een openstaande aanvraag niet
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
              and not exists (select 1 from public.requests r where r.employee_id = y.employee_id and (r.status = 'approved' or (r.type = 'ziek' and r.status <> 'rejected'))
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
    perform set_config('rooster.via_clock', '1', true);   -- locaties wissen zonder ze in het logboek te zetten
    update public.time_entries set in_lat = null, in_lng = null, in_accuracy = null, out_lat = null, out_lng = null, out_accuracy = null
     where clock_in < now() - interval '90 days' and (in_lat is not null or out_lat is not null);
    perform set_config('rooster.via_clock', '', true);
    delete from public.audit_log where at < now() - interval '7 years';
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
              and not exists (select 1 from public.requests r where r.employee_id = y.employee_id and (r.status = 'approved' or (r.type = 'ziek' and r.status <> 'rejected'))
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
       and not exists (select 1 from public.requests r where r.employee_id = e.id and (r.status = 'approved' or (r.type = 'ziek' and r.status <> 'rejected'))
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

-- 6. Rest van lopend verlof intrekken: de app rekent de uren die blijven staan uit de geplande diensten (p_hours)
drop function if exists public.request_withdraw(uuid, boolean);
create or replace function public.request_withdraw(p_id uuid, p_keep boolean default false, p_hours numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests; t date := (now() at time zone 'Europe/Amsterdam')::date; uren text;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan verlof intrekken.'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found then raise exception 'Deze aanvraag bestaat niet meer.'; end if;
  if r.status <> 'approved' or r.type = 'ziek' then raise exception 'Alleen goedgekeurd verlof kan worden ingetrokken.'; end if;
  if p_keep then
    update public.requests set cancel_asked_at = null where id = p_id;
    perform public.notify(r.employee_id, 'Verlof blijft staan', public.req_label(r) || ' blijft staan. Vraag de directie als je wilt overleggen.', 'aanvragen');
    return;
  end if;
  if r.end_date < t then raise exception 'Dit verlof is al voorbij en kan niet meer worden ingetrokken.'; end if;
  uren := case when r.type in ('vakantie', 'vrij') then ' De uren staan weer op je saldo.' else '' end;
  if r.start_date < t then
    update public.requests
       set end_date = t - 1, cancel_asked_at = null,
           leave_hours = case when leave_hours is null then null
                              when p_hours is not null then least(leave_hours, greatest(0, round(p_hours, 1)))
                              else round(leave_hours * (t - r.start_date)::numeric / (r.end_date - r.start_date + 1), 1) end
     where id = p_id;
    perform public.notify(r.employee_id, 'Verlof ingetrokken', public.req_label(r) || ': het deel vanaf vandaag is ingetrokken.' || uren, 'aanvragen');
  else
    delete from public.requests where id = p_id;
    perform public.notify(r.employee_id, 'Verlof ingetrokken', public.req_label(r) || ' is ingetrokken.' || uren, 'aanvragen');
  end if;
end $$;
revoke execute on function public.request_withdraw(uuid, boolean, numeric) from public, anon;
grant execute on function public.request_withdraw(uuid, boolean, numeric) to authenticated;

-- 7. Shiftleaders krijgen de Arbeidstijdenwet-waarschuwingen voor jongeren, zonder geboortedatum: alleen een leeftijdsklasse
create or replace function public.team_age_class() returns table (employee_id uuid, cls text)
language sql stable security definer set search_path = public as $$
  select p.employee_id, case when age(public.today_nl(), p.birth_date) < interval '16 years' then '<16' else '16-17' end
    from public.employee_private p
   where public.is_planner() and p.birth_date is not null and age(public.today_nl(), p.birth_date) < interval '18 years'
$$;
revoke execute on function public.team_age_class() from public, anon;
grant execute on function public.team_age_class() to authenticated;
