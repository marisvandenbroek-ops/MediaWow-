-- =====================================================================
--  UPDATE 28: instellingen afschermen, ingeklokt-overzicht voor shiftleaders
-- =====================================================================
-- 1. Medewerkers lezen de instellingen alleen via staff_settings(): zonder wifi-adressen, doelen en loonpercentages
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated
  using (public.is_planner());

create or replace function public.staff_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.my_employee_id() is null then null else
    to_jsonb(s) - 'wifi_ips' - 'goal_labor_pct' - 'goal_productivity' - 'goal_cost_hour'
               - 'pct_avond' - 'pct_nacht' - 'pct_zondag' - 'pct_feestdag' - 'pct_vakantiegeld' - 'pct_werkgever'
               - 'staffing' - 'guest_ratios' - 'mail_on_publish'
    || jsonb_build_object('has_wifi', coalesce(array_length(s.wifi_ips, 1), 0) > 0) end
  from public.settings s where s.id = 1
$$;
revoke execute on function public.staff_settings() from public, anon;
grant execute on function public.staff_settings() to authenticated;

-- 2. Shiftleaders zien wie er vandaag is ingeklokt (alleen voornaam en tijden, geen locatie of uren)
create or replace function public.clocked_today() returns table (employee_id uuid, clock_in timestamptz, clock_out timestamptz, on_break boolean)
language sql stable security definer set search_path = public as $$
  select t.employee_id, t.clock_in, t.clock_out, t.break_started_at is not null
    from public.time_entries t
   where public.is_planner()
     and (t.clock_out is null or t.clock_in > now() - interval '18 hours')
     and t.clock_in > now() - interval '20 hours'
   order by t.clock_in
$$;
revoke execute on function public.clocked_today() from public, anon;
grant execute on function public.clocked_today() to authenticated;

-- 3. Lijsten voor de afwas (alleen toevoegen als ze er nog niet zijn)
insert into public.checklists (name, department, moment, kind, sort, items)
select v.name, 'Afwas', v.mom, 'check', v.sort, v.items::jsonb
  from (values
    ('Opening afwas', 'opening', 55, '[{"id":"i1","label":"Vaatwasser aangezet en laten opwarmen vóór de eerste lading"},{"id":"i2","label":"Temperatuur op het display gecontroleerd (wassen ± 60 °C, naspoelen ± 82 °C)"},{"id":"i3","label":"Zeep en naglansmiddel voldoende"},{"id":"i4","label":"Rekken, korven en schone doeken klaar"},{"id":"i5","label":"Spoelbak en voorspoeldouche schoon"},{"id":"i6","label":"Afvalbakken leeg met nieuwe zak"},{"id":"i7","label":"Handenwasplaats: zeep, papier"}]'),
    ('Sluiting afwas', 'sluiting', 56, '[{"id":"i1","label":"Alle vaat schoon en op de vaste plek"},{"id":"i2","label":"Vaatwasser leeg, filters en zeven schoon, deur open"},{"id":"i3","label":"Machine van buiten afgenomen"},{"id":"i4","label":"Spoelbakken en werkbank schoon en gedesinfecteerd"},{"id":"i5","label":"Afval, glas en karton weg, bakken schoon"},{"id":"i6","label":"Vloer geveegd en gedweild, putjes leeg"},{"id":"i7","label":"Vuile doeken en schorten in de was"}]')
  ) as v(name, mom, sort, items)
 where not exists (select 1 from public.checklists c where c.name = v.name);
