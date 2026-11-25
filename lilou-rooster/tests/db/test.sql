-- Databasetests voor de rooster-app. Draai met: tests/db/run.sh
-- Elke controle stopt het script met een duidelijke melding als hij faalt.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
set client_min_messages = warning;

-- ---------- hulpmiddelen ----------
create or replace function t_ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'MISLUKT: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
create or replace function t_fails(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'ok  % (%)', msg, sqlerrm; return; end;
  raise exception 'MISLUKT (had moeten falen): %', msg;
end $$;
create or replace function t_count(q text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || q || ') t' into n; return n; end $$;
create or replace function as_user(n int, ip text default '84.12.34.56') returns void language sql as $$
  select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-00000000000' || n, false),
         set_config('request.headers', json_build_object('x-forwarded-for', ip || ', 10.0.0.1')::text, false)
$$;
grant execute on function t_ok(boolean, text), t_fails(text, text), t_count(text), as_user(int, text) to authenticated;
set client_min_messages = notice;

-- ---------- testdata ----------
insert into employees (id, name, email, role, contract_hours) values
  ('a0000000-0000-0000-0000-000000000001', 'Mark Minkman', 'mark@x.nl', 'manager', 38),
  ('a0000000-0000-0000-0000-000000000002', 'Sanne Bakker', 'sanne@x.nl', 'staff', 24),
  ('a0000000-0000-0000-0000-000000000003', 'Daan Jansen', 'daan@x.nl', 'staff', 20),
  ('a0000000-0000-0000-0000-000000000004', 'Eva Smit', 'eva@x.nl', 'staff', 12);
insert into auth.users (id, email, email_confirmed_at) values
  ('10000000-0000-0000-0000-000000000001', 'mark@x.nl', now()),
  ('10000000-0000-0000-0000-000000000002', 'SANNE@x.nl', null),
  ('10000000-0000-0000-0000-000000000003', 'daan@x.nl', now()),
  ('10000000-0000-0000-0000-000000000004', 'eva@x.nl', now());

\echo '== Accounts koppelen'
select t_ok((select user_id is null from employees where name = 'Sanne Bakker'), 'onbevestigd e-mailadres wordt niet gekoppeld');
update auth.users set email_confirmed_at = now() where email = 'SANNE@x.nl';
select t_ok((select user_id is not null from employees where name = 'Sanne Bakker'), 'na bevestiging gekoppeld (hoofdletterongevoelig)');

insert into shifts (id, employee_id, date, start_time, end_time) values
  ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', today_nl() + 2, '17:00', '23:00'),
  ('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', today_nl() + 3, '12:00', '18:00'),
  ('50000000-0000-0000-0000-000000000003', null, today_nl() + 4, '17:00', '23:00');

\echo '== Rechten medewerker'
set role authenticated; select as_user(2);
select t_ok(t_count('select * from shifts') = 0, 'medewerker ziet geen conceptdiensten');
select t_fails($q$insert into shifts (employee_id, date, start_time, end_time) values ('a0000000-0000-0000-0000-000000000002', today_nl(), '08:00', '09:00')$q$, 'medewerker kan geen dienst maken');
update employees set role = 'manager' where email = 'sanne@x.nl';
select t_ok((select role from employees where email = 'sanne@x.nl') = 'staff', 'medewerker kan zichzelf geen directie maken');
select t_fails($q$select publish_week(today_nl(), today_nl() + 6)$q$, 'medewerker kan niet publiceren');
select t_fails($q$select * from app_secrets$q$, 'medewerker kan interne sleutels niet lezen');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date) values ('a0000000-0000-0000-0000-000000000001', 'vrij', today_nl(), today_nl())$q$, 'geen aanvraag namens een ander');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, status) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl(), today_nl(), 'approved')$q$, 'aanvraag niet zelf goedkeuren');
insert into requests (employee_id, type, start_date, end_date) values ('a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() + 20, today_nl() + 24);
select t_fails($q$insert into notifications (employee_id, title) values ('a0000000-0000-0000-0000-000000000003', 'spam')$q$, 'geen nep-meldingen');
select t_fails($q$select notify('a0000000-0000-0000-0000-000000000003', 'spam', null, null)$q$, 'notify() niet aanroepbaar');
select t_ok(t_count('select * from audit_log') = 0, 'logboek leeg voor medewerker (RLS)');
select t_fails($q$insert into employee_private (employee_id, hourly_wage) values ('a0000000-0000-0000-0000-000000000002', 99)$q$, 'medewerker kan eigen loon niet zetten');
reset role;

\echo '== Toegang per tabel'
set role authenticated; select as_user(2);
select t_fails($q$truncate shifts$q$, 'medewerker kan geen tabel leegmaken');
select t_fails($q$select * from reminder_log$q$, 'interne tabel niet leesbaar');
reset role; set role anon;
select t_fails($q$select * from employees$q$, 'niet ingelogd: geen toegang tot medewerkers');
select t_fails($q$select * from shifts$q$, 'niet ingelogd: geen toegang tot diensten');
reset role;
set role authenticated; select as_user(1);
select t_fails($q$truncate time_entries$q$, 'ook directie kan geen tabel leegmaken (gebruik verwijderen per regel)');
reset role;

\echo '== Publiceren en meldingen'
set role authenticated; select as_user(1);
select t_ok(publish_week(today_nl(), today_nl() + 6) = 3, 'directie publiceert 3 diensten');
reset role;
select t_ok(t_count($q$select * from notifications where title like 'Je rooster voor week % staat klaar'$q$) = 2, 'melding nieuw rooster voor 2 medewerkers');
select t_ok(t_count($q$select * from notifications where title like 'Open dienst%'$q$) = 4, 'open dienst gemeld aan heel team');
select t_ok(t_count($q$select * from notifications where title = 'Nieuwe aanvraag'$q$) = 1, 'directie krijgt melding van verlofaanvraag');

\echo '== Open diensten'
set role authenticated; select as_user(4); select open_apply('50000000-0000-0000-0000-000000000003');
select as_user(3); select open_apply('50000000-0000-0000-0000-000000000003');
select t_ok(t_count('select * from shift_applications') = 1, 'medewerker ziet alleen eigen aanmelding');
select t_fails($q$select open_assign('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003')$q$, 'medewerker kan niet toewijzen');
select as_user(1); select open_assign('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004');
select t_fails($q$select open_assign('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003')$q$, 'niet dubbel toewijzen');
reset role;
select t_ok((select employee_id from shifts where id = '50000000-0000-0000-0000-000000000003') = 'a0000000-0000-0000-0000-000000000004', 'open dienst is van Eva');

\echo '== Ruilen'
set role authenticated; select as_user(3);
select swap_offer('50000000-0000-0000-0000-000000000001', null, null, 'Verjaardag');
select t_fails($q$select swap_offer('50000000-0000-0000-0000-000000000001', null, null, null)$q$, 'geen tweede verzoek voor dezelfde dienst');
select t_fails($q$select swap_offer('50000000-0000-0000-0000-000000000002', null, null, null)$q$, 'geen dienst van een ander aanbieden');
select as_user(2); select swap_respond((select id from swaps limit 1), true);
reset role;
select t_ok((select employee_id from shifts where id = '50000000-0000-0000-0000-000000000001') = 'a0000000-0000-0000-0000-000000000003', 'rooster pas na goedkeuring gewijzigd');
set role authenticated; select as_user(3);
select t_fails($q$select swap_decide((select id from swaps limit 1), true)$q$, 'medewerker kan ruil niet goedkeuren');
select as_user(1); select swap_decide((select id from swaps limit 1), true, null);
reset role;
select t_ok((select employee_id from shifts where id = '50000000-0000-0000-0000-000000000001') = 'a0000000-0000-0000-0000-000000000002', 'na goedkeuring van Sanne');
set role authenticated; select as_user(2);
select swap_offer('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '');
select as_user(4); select swap_respond((select id from swaps where status = 'open'), true);
select as_user(1); select swap_decide((select id from swaps where status = 'accepted'), true, null);
reset role;
select t_ok((select employee_id from shifts where id = '50000000-0000-0000-0000-000000000002') = 'a0000000-0000-0000-0000-000000000004'
        and (select employee_id from shifts where id = '50000000-0000-0000-0000-000000000003') = 'a0000000-0000-0000-0000-000000000002', 'echte ruil wisselt beide diensten');

\echo '== Klokken'
set role authenticated; select as_user(2);
select t_fails($q$select clock('in', null, null, null)$q$, 'klokken zonder ingestelde locatie faalt');
reset role; update settings set lat = 52.3702, lng = 4.8952, radius_m = 150, allow_override = true; set role authenticated;
select t_fails($q$select clock('in', 52.39, 4.89, 10)$q$, '2 km weg zonder reden faalt');
select t_ok((select in_distance_m < 50 from clock('in', 52.3703, 4.8953, 15)), 'op locatie inklokken');
select t_fails($q$select clock('in', 52.3703, 4.8953, 15)$q$, 'niet dubbel inklokken');
update time_entries set clock_in = now() - interval '10 hours';
select t_ok((select clock_in > now() - interval '1 minute' from time_entries), 'medewerker kan eigen tijden niet wijzigen');
select t_fails($q$insert into time_entries (employee_id, clock_in) values ('a0000000-0000-0000-0000-000000000002', now())$q$, 'geen rechtstreekse registratie');
select t_ok((select 'uit_buiten_locatie' = any(flags) and overtime_status = 'requested' from clock('uit', 52.39, 4.89, 10, 'Groothandel', 'Laatste tafel')), 'uitklokken buiten locatie met reden + overuren-aanvraag');
update time_entries set overtime_status = 'approved';
select t_ok((select overtime_status = 'requested' from time_entries limit 1), 'medewerker kan eigen overuren niet goedkeuren');
reset role;

\echo '== Wifi'
set role authenticated; select as_user(2);
select t_fails($q$select register_wifi()$q$, 'medewerker kan wifi niet registreren');
select as_user(1); select register_wifi();
select as_user(2, '84.12.34.56');
select t_ok((select in_method = 'wifi' from clock('in', null, null, null)), 'op de wifi inklokken zonder gps');
select as_user(2, '31.20.99.1');
select t_fails($q$select clock('uit', null, null, null)$q$, 'thuis zonder gps faalt');
select as_user(2, '84.12.34.56'); select clock('uit', null, null, null);
reset role;

\echo '== Logboek'
set role authenticated; select as_user(1);
update time_entries set break_minutes = 45, manager_note = 'gecorrigeerd' where overtime_reason is not null;
select t_ok(t_count($q$select * from audit_log where tbl = 'time_entries' and actor = 'a0000000-0000-0000-0000-000000000001' and new ? 'break_minutes'$q$) = 1, 'aanpassing directie vastgelegd met naam');
select t_ok(t_count($q$select * from audit_log where tbl = 'time_entries' and action = 'insert'$q$) = 0, 'eigen klokacties niet in logboek');
insert into employee_private (employee_id, hourly_wage) values ('a0000000-0000-0000-0000-000000000002', 14.50);
update employee_private set hourly_wage = 15.00 where employee_id = 'a0000000-0000-0000-0000-000000000002';
select t_ok(t_count($q$select * from audit_log where tbl = 'employee_private' and action = 'update' and (old->>'hourly_wage')::numeric = 14.50$q$) = 1, 'loonwijziging vastgelegd');
select as_user(2);
select t_ok((select hourly_wage from employee_private) = 15.00, 'medewerker ziet eigen loon');
select as_user(3);
select t_ok(t_count('select * from employee_private') = 0, 'medewerker ziet loon van ander niet');
select t_ok(t_count('select * from employees') = 1, 'medewerker ziet van de medewerkerstabel alleen zichzelf');
select t_ok(t_count('select * from team()') > 1, 'medewerker ziet collega''s via team() (alleen naam, functie, kleur)');
select t_ok(t_count('select * from time_entries where employee_id <> my_employee_id()') = 0, 'medewerker ziet geen kloktijden van collega''s');
select t_ok(t_count('select * from requests where employee_id <> my_employee_id()') = 0, 'medewerker ziet geen verlof van collega''s');
reset role;

\echo '== Automatische taken'
-- Dienst die 2 uur geleden eindigde, medewerker nog ingeklokt
insert into shifts (id, employee_id, date, start_time, end_time, published)
select '50000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', (now() at time zone 'Europe/Amsterdam')::date,
       ((now() - interval '5 hours') at time zone 'Europe/Amsterdam')::time, ((now() - interval '2 hours') at time zone 'Europe/Amsterdam')::time, true
 where ((now() - interval '5 hours') at time zone 'Europe/Amsterdam')::date = (now() at time zone 'Europe/Amsterdam')::date;
insert into time_entries (employee_id, clock_in) select 'a0000000-0000-0000-0000-000000000003', now() - interval '5 hours'
 where exists (select 1 from shifts where id = '50000000-0000-0000-0000-000000000009');
-- Dienst die over een uur begint
insert into shifts (id, employee_id, date, start_time, end_time, published)
select '50000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', ((now() + interval '1 hour') at time zone 'Europe/Amsterdam')::date,
       ((now() + interval '1 hour') at time zone 'Europe/Amsterdam')::time, ((now() + interval '4 hours') at time zone 'Europe/Amsterdam')::time, true;
-- Oude registratie met locatie
insert into time_entries (employee_id, clock_in, clock_out, in_lat, in_lng, in_distance_m, status)
values ('a0000000-0000-0000-0000-000000000004', now() - interval '100 days', now() - interval '100 days' + interval '4 hours', 52.37, 4.89, 12, 'approved');
set role authenticated; select as_user(2); select run_jobs(); select run_jobs(); reset role;
select t_ok(not exists (select 1 from shifts where id = '50000000-0000-0000-0000-000000000009')
         or (select 'auto_uit' = any(flags) and clock_out is not null from time_entries where employee_id = 'a0000000-0000-0000-0000-000000000003' order by clock_in desc limit 1),
         'vergeten uit te klokken: automatisch uitgeklokt op geplande eindtijd');
select t_ok(t_count($q$select * from notifications where title like 'Je dienst begint om%'$q$) = 1, 'herinnering dienst begint (één keer, ook bij 2x draaien)');
select t_ok((select in_lat is null and in_distance_m = 12 from time_entries where clock_in < now() - interval '90 days'), 'locatie na 90 dagen gewist, afstand bewaard');
select t_ok(today_nl() = (now() at time zone 'Europe/Amsterdam')::date, 'today_nl() is Nederlandse datum');

select t_ok(has_table_privilege('service_role', 'public.employees', 'select') and has_table_privilege('service_role', 'public.employees', 'update'),
            'server-functies (service_role) mogen medewerkers lezen en bijwerken (nodig voor uitnodigen)');
\echo '== Shiftleader (planner)'
update employees set role = 'planner' where id = 'a0000000-0000-0000-0000-000000000004';
insert into employee_private (employee_id, hourly_wage) values ('a0000000-0000-0000-0000-000000000003', 13.00) on conflict (employee_id) do update set hourly_wage = 13.00;
set role authenticated; select as_user(4);
select t_ok(is_planner() and not is_manager(), 'shiftleader mag plannen, is geen directie');
insert into shifts (id, employee_id, date, start_time, end_time) values ('50000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000002', today_nl() + 20, '12:00', '18:00');
select t_ok(t_count($q$select * from shifts where id = '50000000-0000-0000-0000-0000000000a1' and not published$q$) = 1, 'shiftleader maakt een conceptdienst en ziet die');
select publish_week(today_nl() + 20, today_nl() + 20);
select t_ok(t_count($q$select * from shifts where id = '50000000-0000-0000-0000-0000000000a1' and published$q$) = 1, 'shiftleader kan publiceren');
select t_ok(t_count('select * from employee_private where employee_id <> my_employee_id()') = 0, 'shiftleader ziet geen lonen van anderen');
select t_ok(t_count('select * from employees') = 1, 'shiftleader ziet geen persoonsgegevens van collega''s');
update settings set pct_avond = 99 where id = 1;   -- mag niets doen (beveiligingsregel)
select t_ok((select pct_avond from settings) is distinct from 99, 'shiftleader kan instellingen niet wijzigen');
insert into day_info (date, guests) values (today_nl() + 20, 80);
select t_ok(t_count('select * from day_info') = 1, 'shiftleader kan verwachte gasten invullen');
select as_user(2);
select t_ok(t_count('select * from day_info') = 0, 'medewerker ziet geen gastenaantallen');
reset role;
select t_fails($q$update employees set contract_type = 'freelance' where id = 'a0000000-0000-0000-0000-000000000002'$q$, 'onbekend contracttype geweigerd');
update employees set contract_type = 'minmax', contract_min_hours = 12, contract_end = today_nl() + 90 where id = 'a0000000-0000-0000-0000-000000000002';
select t_ok((select contract_type = 'minmax' from employees where id = 'a0000000-0000-0000-0000-000000000002'), 'contracttype min-max opgeslagen');

\echo '== Opruimen bij wijzigingen'
insert into shifts (id, employee_id, date, start_time, end_time, published) values
  ('50000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-000000000003', today_nl() + 30, '12:00', '18:00', true),
  ('50000000-0000-0000-0000-0000000000b2', null, today_nl() + 31, '12:00', '18:00', true);
insert into swaps (id, shift_id, from_employee, status) values ('70000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-000000000003', 'open');
update shifts set employee_id = null where id = '50000000-0000-0000-0000-0000000000b1';
select t_ok((select status from swaps where id = '70000000-0000-0000-0000-0000000000b1') = 'cancelled', 'ruilverzoek vervalt als de dienst open wordt gemaakt');
select t_ok(t_count($q$select * from notifications where title = 'Open dienst beschikbaar'$q$) > 0, 'team krijgt melding van nieuwe open dienst');
insert into shift_applications (shift_id, employee_id) values ('50000000-0000-0000-0000-0000000000b2', 'a0000000-0000-0000-0000-000000000003');
update employees set active = false where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select status from shift_applications where shift_id = '50000000-0000-0000-0000-0000000000b2' and employee_id = 'a0000000-0000-0000-0000-000000000003') = 'rejected', 'uit dienst: aanmelding open dienst vervalt');
set role authenticated; select as_user(1);
select t_fails($q$select open_assign('50000000-0000-0000-0000-0000000000b2', 'a0000000-0000-0000-0000-000000000003')$q$, 'open dienst kan niet naar iemand die uit dienst is');
reset role;
insert into time_entries (employee_id, clock_in, clock_out, status) values ('a0000000-0000-0000-0000-000000000003', now() - interval '2 days', now() - interval '2 days' + interval '3 hours', 'approved');
select t_fails($q$delete from employees where id = 'a0000000-0000-0000-0000-000000000003'$q$, 'medewerker met kloktijden kan niet verwijderd worden');
update employees set active = true where id = 'a0000000-0000-0000-0000-000000000003';
insert into requests (id, employee_id, type, start_date, end_date, status) values ('60000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 40, today_nl() + 40, 'approved');
update requests set status = 'pending' where id = '60000000-0000-0000-0000-0000000000b1';
select t_ok(t_count($q$select * from notifications where title = 'Aanvraag weer in behandeling'$q$) = 1, 'melding als verlof weer in behandeling gaat');
set role authenticated; select as_user(4);
select t_ok((select contract_type from team() where id = 'a0000000-0000-0000-0000-000000000002') is not null, 'shiftleader ziet contracttype (voor waarschuwingen)');
select as_user(2);
select t_ok((select contract_type from team() where id = 'a0000000-0000-0000-0000-000000000003') is null, 'medewerker ziet geen contract van collega''s');
reset role;

\echo '== Omzet'
set role authenticated; select as_user(1);
insert into revenue (date, forecast) values (today_nl(), 2500);
select t_ok(t_count('select * from revenue') = 1, 'directie kan omzet invullen');
select as_user(4);
select t_ok(t_count('select * from revenue') = 0, 'shiftleader ziet geen omzet');
select as_user(2);
select t_ok(t_count('select * from revenue') = 0, 'medewerker ziet geen omzet');
select t_fails($q$insert into revenue (date, forecast) values (today_nl() + 1, 100)$q$, 'medewerker kan geen omzet invullen');
reset role;

\echo '== Agendalink'
set role authenticated; select as_user(2);
select t_ok((select calendar_token is not null from employees where id = my_employee_id()), 'medewerker heeft een eigen agendalink');
create temporary table _tok as select calendar_token from employees where id = 'a0000000-0000-0000-0000-000000000002';
select reset_calendar_token();
select t_ok((select e.calendar_token <> t.calendar_token from employees e, _tok t where e.id = 'a0000000-0000-0000-0000-000000000002'), 'nieuwe agendalink maakt de oude ongeldig');
select t_ok(t_count($q$select calendar_token from employees where id <> my_employee_id()$q$) = 0, 'medewerker ziet geen agendalinks van anderen');
reset role;

\echo '== Afscherming functies'
select t_ok(not has_function_privilege('anon', 'public.is_manager()', 'execute'), 'anoniem kan is_manager niet aanroepen');
select t_ok(not has_function_privilege('authenticated', 'public.first_name(uuid)', 'execute'), 'interne hulpfunctie first_name niet via internet aan te roepen');
select t_ok(not has_function_privilege('authenticated', 'public.trg_shift_notify()', 'execute'), 'triggerfunctie niet via internet aan te roepen');
select t_ok(has_function_privilege('authenticated', 'public.is_planner()', 'execute'), 'ingelogde gebruiker kan is_planner gebruiken (beveiligingsregels)');
select t_ok((select proconfig::text like '%search_path%' from pg_proc where proname = 'shift_label'), 'shift_label heeft een vast zoekpad');

\echo '== Prikbord'
set role authenticated; select as_user(1);
insert into announcements (id, title, body, created_by) values ('80000000-0000-0000-0000-000000000001', 'Nieuwe menukaart', 'Vanaf vrijdag het najaarsmenu', 'a0000000-0000-0000-0000-000000000001');
reset role;
select t_ok(t_count($q$select * from notifications where title = '📣 Nieuwe menukaart'$q$) >= 2, 'team krijgt melding van nieuwe mededeling');
set role authenticated; select as_user(2);
select t_ok(t_count('select * from announcements') = 1, 'medewerker ziet de mededeling');
select t_fails($q$insert into announcements (title) values ('nep')$q$, 'medewerker kan geen mededeling plaatsen');
insert into announcement_reads (announcement_id, employee_id) values ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
select t_fails($q$insert into announcement_reads (announcement_id, employee_id) values ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003')$q$, 'medewerker kan niet namens een ander "gelezen" zetten');
select t_fails($q$insert into storage.objects (bucket_id, name) values ('mededelingen', 'nep.pdf')$q$, 'medewerker kan geen bijlage uploaden');
select as_user(1);
select t_ok(t_count('select * from announcement_reads') = 1, 'directie ziet wie het gelezen heeft');
select renotify_announcement('80000000-0000-0000-0000-000000000001');
select t_ok(t_count('select * from announcement_reads') = 0, 'opnieuw melden: iedereen leest hem opnieuw');
select as_user(2);
select t_fails($q$select renotify_announcement('80000000-0000-0000-0000-000000000001')$q$, 'medewerker kan niet opnieuw melden');
select as_user(1);
insert into storage.objects (bucket_id, name) values ('mededelingen', 'menu.pdf');
select t_ok(t_count($q$select * from storage.objects where bucket_id = 'mededelingen'$q$) = 1, 'directie kan een bijlage uploaden');
reset role;

\echo '== Veel diensten tegelijk (shifts_bulk)'
reset role;
delete from notifications;
insert into shifts (id, employee_id, date, start_time, end_time, published)
  select ('51000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'a0000000-0000-0000-0000-000000000004', today_nl() + g, '12:00', '18:00', true
    from generate_series(1, 40) g;
set role authenticated; select as_user(2);
select t_fails($q$select shifts_bulk(array['51000000-0000-0000-0000-000000000001']::uuid[], 'delete')$q$, 'medewerker kan niet in bulk verwijderen');
select as_user(1);
select t_ok(shifts_bulk((select array_agg(id) from shifts where id::text like '51000000%' and date <= today_nl() + 20), 'open') = 20, '20 diensten open gezet');
reset role;
select t_ok(t_count($q$select * from shifts where id::text like '51000000%' and employee_id is null$q$) = 20, 'diensten zijn echt open');
select t_ok(t_count($q$select * from notifications where employee_id = 'a0000000-0000-0000-0000-000000000004'$q$) = 1, 'medewerker krijgt één melding, niet twintig');
select t_ok(t_count($q$select * from notifications where title like 'Open dienst%' and employee_id = 'a0000000-0000-0000-0000-000000000002'$q$) = 1, 'collega krijgt één melding over de open diensten');
delete from notifications;
set role authenticated; select as_user(1);
select t_ok(shifts_bulk((select array_agg(id) from shifts where id::text like '51000000%' and employee_id is not null), 'delete') = 20, '20 diensten in één keer verwijderd');
select t_fails($q$select shifts_bulk(array[]::uuid[], 'iets')$q$, 'onbekende actie wordt geweigerd');
reset role;
select t_ok(t_count($q$select * from notifications$q$) = 1, 'bij verwijderen: één melding in totaal');
select t_ok((select title from notifications limit 1) = '20 diensten vervallen', 'melding noemt het aantal');

\echo '== Ziekmelding en open diensten van iemand die uit dienst is'
reset role; delete from notifications;
set role authenticated; select as_user(2);
insert into requests (employee_id, type, start_date, end_date) values ('a0000000-0000-0000-0000-000000000002', 'ziek', today_nl(), today_nl());
reset role;
select t_ok(t_count($q$select * from notifications where title = '🤒 Ziekmelding' and employee_id = 'a0000000-0000-0000-0000-000000000001'$q$) = 1, 'directie krijgt een duidelijke ziekmelding');
delete from notifications;
insert into shifts (id, employee_id, date, start_time, end_time, published) values
  ('52000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', today_nl() + 5, '12:00', '18:00', true),
  ('52000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', today_nl() + 6, '12:00', '18:00', true);
update employees set active = false where id = 'a0000000-0000-0000-0000-000000000004';
delete from notifications;
set role authenticated; select as_user(1);
select shifts_bulk(array['52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000002']::uuid[], 'open');
reset role;
select t_ok(t_count($q$select * from notifications where title = 'Open diensten beschikbaar' and employee_id = 'a0000000-0000-0000-0000-000000000002'$q$) = 1, 'collega hoort van open diensten, ook als de medewerker uit dienst is');
update employees set active = true where id = 'a0000000-0000-0000-0000-000000000004';

\echo '== Weer beter melden'
reset role; delete from notifications;
insert into requests (id, employee_id, type, start_date, end_date) values ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'ziek', today_nl() - 1, today_nl() + 5);
set role authenticated; select as_user(2);
select t_fails($q$select sick_recover('60000000-0000-0000-0000-000000000001')$q$, 'je kunt niet namens een ander beter melden');
select as_user(3);
select sick_recover('60000000-0000-0000-0000-000000000001');
reset role;
select t_ok((select end_date from requests where id = '60000000-0000-0000-0000-000000000001') = today_nl(), 'ziekmelding stopt vandaag');
select t_ok(t_count($q$select * from notifications where title = '💪 Weer beter'$q$) >= 1, 'directie hoort dat iemand weer beter is');

\echo '== Lijsten: afvinken met naam en tijd'
reset role; delete from notifications;
select t_ok(t_count('select * from checklists') >= 8, 'startlijsten aangemaakt');
set role authenticated; select as_user(2);
insert into checklist_ticks (checklist_id, period, item_id, employee_id, at)
  select id, today_nl()::text, 'i1', 'a0000000-0000-0000-0000-000000000003', now() - interval '3 days' from checklists where name = 'Opening bediening';
reset role;
select t_ok((select employee_id from checklist_ticks where item_id = 'i1' limit 1) = 'a0000000-0000-0000-0000-000000000002', 'vinkje staat altijd op naam van wie het zet');
select t_ok((select at > now() - interval '1 minute' from checklist_ticks where item_id = 'i1' limit 1), 'tijdstip zet de server (niet achteraf invullen)');
set role authenticated; select as_user(3);
select t_ok(t_count('select * from checklist_ticks') = 1, 'collega ziet wat er al is afgevinkt');
select t_fails($q$select untick((select id from checklist_ticks limit 1))$q$, 'collega kan andermans vinkje niet weghalen');
select t_fails($q$delete from checklist_ticks$q$, 'vinkjes kun je niet echt verwijderen');
reset role;
select t_ok((select period from checklist_ticks where item_id = 'i1' limit 1) = business_day()::text, 'periode bepaalt de server (niet terugdateren)');
set role authenticated; select as_user(2);
select untick((select id from checklist_ticks where item_id = 'i1' limit 1));
insert into checklist_ticks (checklist_id, period, item_id, employee_id) select id, '2020-01-01', 'i1', 'a0000000-0000-0000-0000-000000000002' from checklists where name = 'Opening bediening';
reset role;
select t_ok(t_count('select * from checklist_ticks where removed_at is not null and removed_by is not null') = 1, 'ongedaan maken laat een spoor achter');
select t_ok(t_count('select * from checklist_ticks where removed_at is null') = 1, 'na ongedaan maken opnieuw afvinken kan');
set role authenticated; select as_user(2);
update checklists set name = 'x';
reset role;
select t_ok(t_count($q$select * from checklists where name = 'x'$q$) = 0, 'medewerker kan lijsten niet aanpassen');
set role authenticated; select as_user(2);
select t_fails($q$insert into checklist_ticks (checklist_id, period, item_id, employee_id) select id, today_nl()::text, 'i1', 'a0000000-0000-0000-0000-000000000002' from checklists where name = 'Temperaturen opening'$q$, 'temperatuur is verplicht');
insert into checklist_ticks (checklist_id, period, item_id, employee_id, value)
  select id, today_nl()::text, 'i1', 'a0000000-0000-0000-0000-000000000002', 9.5 from checklists where name = 'Temperaturen opening';
select t_fails($q$select untick((select id from checklist_ticks where value = 9.5))$q$, 'afwijkende meting kan de medewerker niet zelf weghalen');
reset role;
select t_ok((select flagged from checklist_ticks where value = 9.5), 'te warme koeling wordt gemarkeerd');
select t_ok(t_count($q$select * from notifications where title like '%Temperatuur te hoog%' and employee_id = 'a0000000-0000-0000-0000-000000000001'$q$) = 1, 'directie krijgt melding bij te hoge temperatuur');

\echo '== Registraties en meldingen'
delete from notifications;
set role authenticated; select as_user(2);
insert into log_entries (kind, employee_id, data) values ('melding', 'a0000000-0000-0000-0000-000000000002', '{"soort":"gebrek","tekst":"Vaatwasser lekt"}');
insert into log_entries (kind, employee_id, data) values ('kern', 'a0000000-0000-0000-0000-000000000002', '{"product":"Kip","temp":"68"}');
select as_user(3);
select t_ok(t_count('select * from log_entries') = 0, 'medewerker ziet geen registraties van een ander');
update log_entries set resolved_at = now();
reset role;
select t_ok(t_count('select * from log_entries where resolved_at is not null') = 0, 'medewerker kan niets afhandelen');
select t_ok(t_count($q$select * from notifications where title like '%Gebrek gemeld%' and employee_id = 'a0000000-0000-0000-0000-000000000001'$q$) = 1, 'directie krijgt melding van een gebrek');
select t_ok((select flagged from log_entries where kind = 'kern'), 'te lage kerntemperatuur wordt gemarkeerd');
set role authenticated; select as_user(1);
update log_entries set resolved_at = now(), resolution = 'Monteur gebeld', data = '{}' where kind = 'melding';
reset role;
select t_ok((select resolved_by = 'a0000000-0000-0000-0000-000000000001' and data->>'tekst' = 'Vaatwasser lekt' from log_entries where kind = 'melding'), 'afgehandeld met naam; de melding zelf blijft ongewijzigd');

\echo '== Afspraken gelezen en akkoord'
delete from notifications;
set role authenticated; select as_user(2);
select ack_rules(); select ack_rules();
select t_fails($q$insert into rules_acks (employee_id, version) values ('a0000000-0000-0000-0000-000000000003', 1)$q$, 'niet tekenen namens een ander');
select as_user(3);
select t_ok(t_count('select * from rules_acks') = 0, 'medewerker ziet niet wie er getekend heeft');
update settings set rules_version = 5;
select as_user(1);
select t_ok(t_count('select * from rules_acks where version = 1') = 1, 'directie ziet wie getekend heeft (één keer per versie)');
update settings set rules_version = rules_version + 1;
reset role;
select t_ok((select rules_version from settings) = 2, 'alleen de directie verhoogt de versie');
select t_ok(t_count($q$select * from notifications where title like '%Afspraken bijgewerkt%'$q$) > 0
  and t_count($q$select * from notifications n join employees e on e.id = n.employee_id where n.title like '%Afspraken bijgewerkt%' and e.role = 'manager'$q$) = 0, 'team krijgt melding bij nieuwe afspraken, directie niet');
set role authenticated; select as_user(2); select ack_rules(); reset role;
select t_ok(t_count('select * from rules_acks where version = 2') = 1, 'na wijziging opnieuw tekenen voor de nieuwe versie');

\echo '== Controleronde: klokken, verlofuren, afspraken'
-- Avonddienst zonder planning na een middagdienst: niet direct automatisch uitklokken
insert into shifts (id, employee_id, date, start_time, end_time, published)
select '50000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000004', (now() at time zone 'Europe/Amsterdam')::date,
       ((now() - interval '10 hours') at time zone 'Europe/Amsterdam')::time, ((now() - interval '7 hours') at time zone 'Europe/Amsterdam')::time, true
 where ((now() - interval '10 hours') at time zone 'Europe/Amsterdam')::date = (now() at time zone 'Europe/Amsterdam')::date;
delete from time_entries where employee_id = 'a0000000-0000-0000-0000-000000000004' and clock_out is null;
insert into time_entries (id, employee_id, clock_in) values ('70000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000004', now() - interval '1 hour');
set role authenticated; select as_user(2); select run_jobs(); reset role;
select t_ok((select clock_out is null from time_entries where id = '70000000-0000-0000-0000-000000000031'), 'inklokken na een eerdere dienst wordt niet aan die dienst gekoppeld en niet automatisch uitgeklokt');
delete from time_entries where id = '70000000-0000-0000-0000-000000000031';
delete from shifts where id = '50000000-0000-0000-0000-000000000031';
set role authenticated; select as_user(2);
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, status, leave_hours) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 30, today_nl() + 30, 'pending', -40)$q$, 'medewerker kan zelf geen verlofuren meesturen');
select t_fails('select bump_rules()', 'medewerker kan afspraken niet opnieuw laten tekenen');
select as_user(1);
select bump_rules();
select t_ok((select rules_version from settings) = 3, 'directie verhoogt de versie via de server');
select t_fails('update settings set rules_version = 1', 'versie van de afspraken kan niet omlaag');
reset role;

\echo '== Update 28: instellingen afgeschermd, ingeklokt-overzicht'
update settings set wifi_ips = '{1.2.3.4}', goal_labor_pct = 30 where id = 1;
set role authenticated; select as_user(2);
select t_ok(t_count('select * from settings') = 0, 'medewerker leest de instellingentabel niet rechtstreeks');
select t_ok(staff_settings() ? 'special_days' and not (staff_settings() ? 'wifi_ips') and not (staff_settings() ? 'goal_labor_pct') and not (staff_settings() ? 'pct_werkgever'), 'medewerker krijgt alleen de nodige instellingen');
select t_ok(t_count('select * from clocked_today()') = 0, 'medewerker ziet niet wie er ingeklokt is');
reset role;
insert into time_entries (employee_id, clock_in) values ('a0000000-0000-0000-0000-000000000003', now() - interval '30 minutes');
update employees set role = 'planner' where id = 'a0000000-0000-0000-0000-000000000004';
set role authenticated; select as_user(4);
select t_ok(t_count('select * from clocked_today()') >= 1, 'shiftleader ziet wie er vandaag is ingeklokt');
select t_ok(t_count('select * from settings') = 1, 'shiftleader leest de instellingen voor de planning');
reset role;

\echo '== Update 30: ziek tot beter gemeld'
set role authenticated; select as_user(3);
insert into requests (employee_id, type, start_date, end_date, status, open_end) values ('a0000000-0000-0000-0000-000000000003', 'ziek', today_nl() - 2, today_nl() - 2, 'pending', true);
select run_jobs();
reset role;
select t_ok((select end_date = today_nl() from requests where employee_id = 'a0000000-0000-0000-0000-000000000003' and type = 'ziek' and open_end), 'open ziekmelding loopt elke dag door tot vandaag');
set role authenticated; select as_user(3);
select sick_recover((select id from requests where employee_id = 'a0000000-0000-0000-0000-000000000003' and type = 'ziek' and open_end));
reset role;
select t_ok((select not open_end and end_date = today_nl() from requests where employee_id = 'a0000000-0000-0000-0000-000000000003' and type = 'ziek' and start_date = today_nl() - 2), 'weer beter: open einde stopt vandaag');

\echo '== Update 31: gerechten op de kaart aanpassen'
set role authenticated; select as_user(3);
update menu_cards set items = '[{"name":"x"}]'::jsonb;
reset role;
select t_ok((select count(*) = 0 from menu_cards where items is not null), 'medewerker kan de gerechten niet aanpassen');
set role authenticated; select as_user(1);
update menu_cards set items = '[{"group":"","section":"Hoofd","name":"Testgerecht","tag":"","lines":[],"price":"€ 28","allergens":""}]'::jsonb where title = 'Menukaart';
reset role;
select t_ok((select items->0->>'name' = 'Testgerecht' from menu_cards where title = 'Menukaart'), 'directie past de gerechten aan');
select t_fails($$update menu_cards set items = '{"a":1}'::jsonb$$, 'gerechtenlijst moet een lijst zijn');

\echo '== Update 32: herinnering lijsten voor de shiftleader'
update shifts set date = business_day() + 7 where date = business_day();   -- alleen de dienst hieronder telt vandaag
insert into shifts (employee_id, date, start_time, end_time, position, published)
values ('a0000000-0000-0000-0000-000000000004', business_day(),
        ((now() at time zone 'Europe/Amsterdam') - interval '2 hours')::time,
        ((now() at time zone 'Europe/Amsterdam') + interval '20 minutes')::time, 'Bediening', true);
select lists_reminders();
select t_ok((select count(*) = 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000004' and title = 'Sluitingslijsten nog niet af' and body like 'Nog open: %Sluiting bediening%'), 'shiftleader krijgt herinnering: sluitingslijst niet af');
select t_ok((select count(*) = 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000004' and title = 'Openingslijsten nog niet af'), 'shiftleader krijgt herinnering: openingslijst niet af');
select t_ok((select count(*) = 0 from notifications where title like '%lijsten nog niet af' and body like '%Sluiting keuken%'), 'geen herinnering voor afdelingen die vandaag niet werken');
select lists_reminders(); select run_jobs();
select t_ok((select count(*) = 2 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000004' and title like '%lijsten nog niet af'), 'herinnering maar één keer per dag');
select t_ok((select count(*) = 0 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000003' and title like '%lijsten nog niet af'), 'medewerker zonder leidinggevende rol krijgt geen herinnering');
set role authenticated; select as_user(3);
select t_fails('select lists_reminders()', 'medewerker kan de herinnering niet zelf starten');
reset role;

\echo '== Update 39: profiel, noodcontact, telefoonlijst'
set role authenticated; select as_user(3);
select t_fails($$select save_my_profile('abc', '2000-01-01', '[]', 'M', false)$$, 'ongeldig telefoonnummer geweigerd');
select t_fails($$select save_my_profile('0612345678', '2020-01-01', '[]', 'M', false)$$, 'te jonge geboortedatum geweigerd');
select t_fails($$select save_my_profile('0612345678', '2000-01-01', '[{"name":"Ma","phone":"x"}]', 'M', false)$$, 'noodcontact zonder geldig nummer geweigerd');
select save_my_profile('06 1234 5678', '2000-05-01', '[{"name":"Anna","relation":"moeder","phone":"0611111111"}]', 'M', true);
select t_ok((my_profile()->>'shirt_size') = 'M' and (my_profile()->'emergency'->0->>'name') = 'Anna' and (my_profile()->>'done_at') is not null, 'eigen profiel opgeslagen en terug te lezen');
select t_ok(t_count('select * from emergency_contacts()') = 0, 'medewerker ziet geen noodcontacten');
select t_ok(t_count('select * from team_phones()') >= 1, 'collega ziet gedeeld nummer');
select t_ok(t_count('select * from employee_profile') = 1, 'medewerker ziet alleen het eigen profiel');
update employee_profile set shirt_size = 'XL';   -- RLS: wijzigt niets
reset role;
select t_ok((select shirt_size from employee_profile where employee_id = 'a0000000-0000-0000-0000-000000000003') = 'M', 'maat ongewijzigd na directe poging');
set role authenticated; select as_user(4);
select t_ok(t_count('select * from emergency_contacts()') >= 1, 'shiftleader ziet noodcontacten');
reset role;
update employees set active = false where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select emergency = '[]'::jsonb and not share_phone from employee_profile where employee_id = 'a0000000-0000-0000-0000-000000000003'), 'uit dienst: noodcontact en delen vervallen');
update employees set active = true where id = 'a0000000-0000-0000-0000-000000000003';

\echo '== Update 41: rechten per functie'
-- medewerker 3 (staff) heeft functie; geef die functie planrechten
update employees set position = 'Bar', plan_mode = 'functie' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'staff', 'zonder functierecht: medewerker');
update settings set position_rights = '{"Bar": {"plan": true, "lists": ["Keuken"]}}' where id = 1;
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'planner', 'functie met planrecht maakt shiftleader');
set role authenticated; select as_user(3);
select t_ok(public.is_planner(), 'is_planner werkt via de functie');
select t_ok((staff_settings()->'position_rights'->'Bar'->>'plan') = 'true', 'medewerker leest de rechten van functies');
update employees set plan_mode = 'nee', extra_lists = '{Keuken}' where id = public.my_employee_id();   -- RLS: wijzigt niets
reset role;
select t_ok((select plan_mode = 'functie' and extra_lists = '{}' from employees where id = 'a0000000-0000-0000-0000-000000000003'), 'medewerker past eigen rechten niet aan');
update employees set plan_mode = 'nee' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'staff', 'uitzondering nee wint van de functie');
update employees set plan_mode = 'functie', position = 'Bediening' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'staff', 'andere functie zonder planrecht: medewerker');
update employees set role = 'planner' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role = 'planner' and plan_mode = 'ja' from employees where id = 'a0000000-0000-0000-0000-000000000003'), 'oude app: rol planner wordt uitzondering ja');
update employees set plan_mode = 'functie' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000001') = 'manager', 'directie blijft directie');
update settings set position_rights = '{}' where id = 1;

\echo '== Update 42: toegang per functie (directie), altijd een directielid'
update settings set position_rights = '{"Manager": {"level": "directie"}, "Shiftleader": {"level": "shiftleader"}}' where id = 1;
update employees set position = 'Manager', plan_mode = 'functie' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'manager', 'functie Manager geeft directierechten');
update employees set position = 'Shiftleader' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'planner', 'functie Shiftleader geeft shiftleader-rechten');
update employees set position = 'Bediening' where id = 'a0000000-0000-0000-0000-000000000003';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'staff', 'andere functie: medewerker');
select t_ok((select plan_mode from employees where id = 'a0000000-0000-0000-0000-000000000001') = 'directie', 'bestaande directie blijft directie (uitzondering)');
-- laatste directielid kan niet worden weggehaald
update employees set plan_mode = 'nee' where role = 'manager' and id <> 'a0000000-0000-0000-0000-000000000001';
select t_fails($$update employees set plan_mode = 'nee' where id = 'a0000000-0000-0000-0000-000000000001'$$, 'laatste directielid blijft directie');
update settings set position_rights = '{}' where id = 1;

\echo '== Controle: functie terug van directie, laatste directielid uit dienst'
update employees set position = 'Manager', plan_mode = 'functie' where id = 'a0000000-0000-0000-0000-000000000003';
update settings set position_rights = '{"Manager": {"level": "directie"}}' where id = 1;
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'manager', 'Manager is directie');
update settings set position_rights = '{"Manager": {"level": "medewerker"}}' where id = 1;
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000003') = 'staff', 'functie terug naar medewerker haalt directierechten weg');
select t_fails($$update employees set active = false where id = 'a0000000-0000-0000-0000-000000000001'$$, 'laatste directielid niet uit dienst');
select t_fails($$delete from employees where id = 'a0000000-0000-0000-0000-000000000001'$$, 'laatste directielid niet verwijderen');
update settings set position_rights = '{}' where id = 1;
update employees set position = 'Bediening' where id = 'a0000000-0000-0000-0000-000000000003';

\echo '== Update 43: weer beter op de dag zelf'
set role authenticated; select as_user(3);
insert into requests (employee_id, type, start_date, end_date, status, open_end) values ('a0000000-0000-0000-0000-000000000003', 'ziek', today_nl(), today_nl(), 'pending', false);
select sick_recover((select id from requests where employee_id = 'a0000000-0000-0000-0000-000000000003' and type = 'ziek' and start_date = today_nl() and not open_end order by created_at desc limit 1));
reset role;
select t_ok((select recovered_at is not null and end_date = today_nl() from requests where employee_id = 'a0000000-0000-0000-0000-000000000003' and type = 'ziek' and start_date = today_nl() order by created_at desc limit 1), 'weer beter op de dag zelf: tijdstip bewaard');

\echo '== Update 44: diplomas, dagrapport, niet ingeklokt'
reset role;
update employees set plan_mode = 'ja', position = null where id = 'a0000000-0000-0000-0000-000000000004';
update employees set plan_mode = 'nee', position = null where id = 'a0000000-0000-0000-0000-000000000002';
select t_ok((select role from employees where id = 'a0000000-0000-0000-0000-000000000004') = 'planner', 'testopzet: Eva is shiftleader');
-- diploma's
set role authenticated; select as_user(1);
insert into employee_certs (employee_id, kind, expires) values ('a0000000-0000-0000-0000-000000000002', 'svh', today_nl() + 30), ('a0000000-0000-0000-0000-000000000003', 'bhv', today_nl() + 400);
select as_user(2);
select t_ok(t_count('select * from employee_certs') = 1, 'medewerker ziet alleen zijn eigen diploma');
select t_fails($$insert into employee_certs (employee_id, kind, expires) values ('a0000000-0000-0000-0000-000000000002', 'bhv', today_nl() + 999)$$, 'medewerker kan zelf geen diploma toevoegen (fout)');
reset role;
select t_ok((select count(*) from employee_certs where employee_id = 'a0000000-0000-0000-0000-000000000002') = 1, 'medewerker kan zelf geen diploma toevoegen');
set role authenticated; select as_user(4);
select t_ok(t_count('select * from employee_certs') = 2, 'shiftleader ziet alle diploma''s voor de planning');
reset role;
select cert_reminders();
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000002' and title like '%verloopt binnenkort'), 'medewerker krijgt melding: diploma verloopt binnenkort');
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000001' and title like 'Diploma verloopt%'), 'directie krijgt melding over het diploma');
select t_ok(cert_reminders() = 0, 'diplomamelding niet dubbel');
select t_ok(not exists (select 1 from notifications where body like '%Daan Jansen is geldig%'), 'geen melding voor diploma dat nog lang geldig is');
-- dagrapport
set role authenticated; select as_user(4);
select save_day_report(business_day(), 'druk', 'Goede avond, terras vol.', 'Tarte tatin', 'Sanne top');
select t_ok(t_count('select * from day_reports') = 1, 'shiftleader kan een dagrapport maken en lezen');
select t_fails($$select save_day_report(business_day() - 5, 'rustig', 'x', null, null)$$, 'shiftleader kan geen oud dagrapport aanpassen');
select as_user(2);
select save_day_report(business_day(), 'rustig', 'Mijn kant van de avond', null, null);
select t_ok(t_count('select * from day_reports') = 1, 'medewerker maakt een eigen dagrapport en ziet alleen dat');
select t_fails($$select save_day_report(business_day() - 5, 'rustig', 'x', null, null)$$, 'medewerker kan geen oud dagrapport maken');
reset role;
select t_ok((select count(*) from notifications where employee_id = 'a0000000-0000-0000-0000-000000000001' and title like 'Dagrapport%') = 2, 'directie krijgt een melding per dagrapport');
set role authenticated; select as_user(4);
select save_day_report(business_day(), 'heel druk', 'Aangepast', null, null);
reset role;
select t_ok((select count(*) from notifications where employee_id = 'a0000000-0000-0000-0000-000000000001' and title like 'Dagrapport%') = 2 and (select notes from day_reports where date = business_day() and employee_id = 'a0000000-0000-0000-0000-000000000004') = 'Aangepast', 'aanpassen geeft geen tweede melding');
set role authenticated; select as_user(4);
select t_ok(t_count('select * from day_reports') = 2, 'shiftleader leest alle dagrapporten');
reset role;
-- niet ingeklokt
delete from time_entries where employee_id = 'a0000000-0000-0000-0000-000000000002';
delete from requests where employee_id = 'a0000000-0000-0000-0000-000000000002';
insert into shifts (id, employee_id, date, start_time, end_time, published) values
  ('50000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000002',
   ((now() - interval '20 minutes') at time zone 'Europe/Amsterdam')::date, (((now() - interval '20 minutes') at time zone 'Europe/Amsterdam')::time(0)), (((now() + interval '3 hours') at time zone 'Europe/Amsterdam')::time(0)), true);
select late_reminders();
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000002' and title = 'Je bent nog niet ingeklokt'), 'medewerker krijgt melding: nog niet ingeklokt');
select t_ok(exists (select 1 from notifications where title = 'Sanne is nog niet ingeklokt'), 'leiding krijgt melding: Sanne is nog niet ingeklokt');
select t_ok(late_reminders() = 0, 'niet-ingeklokt-melding niet dubbel');
select t_ok(not has_function_privilege('authenticated', 'public.late_reminders()', 'execute') and not has_function_privilege('authenticated', 'public.cert_reminders()', 'execute'), 'herinneringen alleen via run_jobs');
-- verlengd diploma: geen melding voor het oude
insert into employee_certs (id, employee_id, kind, expires) values
  ('c4400000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'svh', today_nl() - 1),
  ('c4400000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'svh', today_nl() + 1800);
select cert_reminders();
select t_ok(not exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000003' and title like 'Sociale Hygiëne%verlopen'), 'geen melding voor een diploma dat al verlengd is');
-- gesplitste dienst: eerder uitgeklokt telt niet als aanwezig
delete from notifications where title like '%niet ingeklokt%';
insert into time_entries (employee_id, clock_in, clock_out) values ('a0000000-0000-0000-0000-000000000004', now() - interval '3 hours', now() - interval '90 minutes');
insert into shifts (id, employee_id, date, start_time, end_time, published) values
  ('50000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000004',
   ((now() - interval '20 minutes') at time zone 'Europe/Amsterdam')::date, (((now() - interval '20 minutes') at time zone 'Europe/Amsterdam')::time(0)), (((now() + interval '3 hours') at time zone 'Europe/Amsterdam')::time(0)), true);
select late_reminders();
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000004' and title = 'Je bent nog niet ingeklokt'), 'gesplitste dienst: melding ook als je eerder die dag al werkte');
-- dagrapport: schrijver blijft staan, link naar de juiste dag
select t_ok((select view from notifications where title like 'Dagrapport%' limit 1) = 'overzicht:rapport:' || business_day()::text, 'melding verwijst naar het rapport van die dag');
set role authenticated; select as_user(1);
select save_day_report(business_day(), 'rustig', 'Door directie aangepast', null, null);
reset role;
select t_ok((select count(*) from day_reports where date = business_day()) = 3 and (select notes from day_reports where date = business_day() and employee_id = 'a0000000-0000-0000-0000-000000000004') = 'Aangepast', 'ieder een eigen rapport: niemand overschrijft een ander');
select t_ok(run_jobs() >= 0, 'run_jobs draait met de nieuwe stappen');

\echo '== Update 46: beschikbaarheid met eigen tijden'
insert into availability (employee_id, date, kind, from_time, to_time) values ('a0000000-0000-0000-0000-000000000004', today_nl() + 30, 'tijden', '18:00', '23:30');
select t_ok((select to_time from availability where employee_id = 'a0000000-0000-0000-0000-000000000004' and date = today_nl() + 30) = '23:30', 'beschikbaar op eigen tijden wordt bewaard');
do $$ begin
  insert into availability (employee_id, date, kind) values ('a0000000-0000-0000-0000-000000000004', today_nl() + 31, 'tijden');
  raise exception 'FOUT: tijden zonder begin- en eindtijd werd geaccepteerd';
exception when check_violation then null; end $$;
select t_ok(true, 'tijden zonder begin- en eindtijd wordt geweigerd');

\echo '== Update 47: allergenen op de menukaart'
insert into menu_cards (id, title, file_path) values ('d4700000-0000-0000-0000-000000000001', 'Testkaart', 'static:kaarten/x.pdf');
set role authenticated; select as_user(1);
select set_menu_allergens('d4700000-0000-0000-0000-000000000001', '01 Steak Tartare', array['ei','gluten','onzin'], true);
reset role;
select t_ok((select allergens->'01 steak tartare'->'codes' from menu_cards where id = 'd4700000-0000-0000-0000-000000000001') = '["ei", "gluten"]'::jsonb
  and (select (allergens->'01 steak tartare'->>'ok')::boolean from menu_cards where id = 'd4700000-0000-0000-0000-000000000001'), 'directie legt allergenen vast; onbekende codes vallen weg');

\echo '== Update 48: shiftleader maakt en wijzigt lijsten'
update employees set role = 'planner' where id = 'a0000000-0000-0000-0000-000000000004';
set role authenticated; select as_user(4);
insert into checklists (id, name, department, moment) values ('c4800000-0000-0000-0000-000000000001', 'Sluiting bar (test)', 'Bar', 'sluiting');
update checklists set name = 'Sluiting bar' where id = 'c4800000-0000-0000-0000-000000000001';
reset role;
select t_ok((select name from checklists where id = 'c4800000-0000-0000-0000-000000000001') = 'Sluiting bar', 'shiftleader maakt en wijzigt een lijst');
set role authenticated; select as_user(3);
select t_fails($q$insert into checklists (name) values ('mag niet')$q$, 'medewerker kan geen lijst maken');
reset role;

\echo '== Update 49: shiftleader keurt ruilen goed'
-- Sanne (2) biedt een dienst aan, Eva (4) is shiftleader, Daan (3) neemt over
update employees set role = 'planner', active = true where id = 'a0000000-0000-0000-0000-000000000004';
insert into shifts (id, employee_id, date, start_time, end_time, published) values
  ('50000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000002', today_nl() + 40, '11:00', '20:00', true);
insert into swaps (id, shift_id, from_employee, taken_by, status) values
  ('54900000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'accepted');
set role authenticated; select as_user(3);
select t_fails($q$select swap_decide('54900000-0000-0000-0000-000000000001', true)$q$, 'medewerker kan geen ruil goedkeuren');
select as_user(4);
select t_ok(t_count($q$select * from swaps where id = '54900000-0000-0000-0000-000000000001'$q$) = 1, 'shiftleader ziet het ruilverzoek');
select swap_decide('54900000-0000-0000-0000-000000000001', true);
reset role;
select t_ok((select employee_id from shifts where id = '50000000-0000-0000-0000-000000000049') = 'a0000000-0000-0000-0000-000000000003', 'shiftleader keurt goed: dienst staat bij de collega');
select t_ok(not has_function_privilege('authenticated', 'public.notify_planners(text, text, text, uuid[])', 'execute'), 'notify_planners niet direct aan te roepen');

\echo '== Update 50: verlof intrekken'
insert into requests (id, employee_id, type, start_date, end_date, status, leave_hours) values
  ('55000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() + 30, today_nl() + 34, 'approved', 20),
  ('55000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() + 60, today_nl() + 61, 'approved', 8);
set role authenticated; select as_user(3);
select t_fails($q$select request_cancel_ask('55000000-0000-0000-0000-000000000001')$q$, 'collega kan andermans verlof niet laten intrekken');
select t_fails($q$select request_withdraw('55000000-0000-0000-0000-000000000001')$q$, 'medewerker kan geen verlof intrekken');
select as_user(2);
select request_cancel_ask('55000000-0000-0000-0000-000000000001');
select t_fails($q$select request_cancel_ask('55000000-0000-0000-0000-000000000001')$q$, 'twee keer vragen kan niet');
reset role;
select t_ok((select cancel_asked_at is not null from requests where id = '55000000-0000-0000-0000-000000000001'), 'verzoek tot intrekken vastgelegd');
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000001' and title = 'Verlof intrekken?'), 'directie krijgt melding');
set role authenticated; select as_user(1);
select request_withdraw('55000000-0000-0000-0000-000000000001');
select request_withdraw('55000000-0000-0000-0000-000000000002', true);
reset role;
select t_ok(not exists (select 1 from requests where id = '55000000-0000-0000-0000-000000000001'), 'directie trekt verlof in: aanvraag weg, uren terug');
select t_ok(exists (select 1 from requests where id = '55000000-0000-0000-0000-000000000002' and status = 'approved'), 'laten staan houdt het verlof');
select t_ok(exists (select 1 from notifications where employee_id = 'a0000000-0000-0000-0000-000000000002' and title = 'Verlof ingetrokken'), 'medewerker krijgt melding bij intrekken');
-- lopend verlof: alleen het deel vanaf vandaag vervalt; voorbij verlof kan niet
insert into requests (id, employee_id, type, start_date, end_date, status, leave_hours) values
  ('55000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() - 5, today_nl() + 4, 'approved', 40),
  ('55000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() - 40, today_nl() - 35, 'approved', 24);
set role authenticated; select as_user(1);
select request_withdraw('55000000-0000-0000-0000-000000000003');
select t_fails($q$select request_withdraw('55000000-0000-0000-0000-000000000004')$q$, 'voorbij verlof kan niet worden ingetrokken');
reset role;
select t_ok((select end_date = today_nl() - 1 and leave_hours = 20 from requests where id = '55000000-0000-0000-0000-000000000003'), 'lopend verlof: opgenomen dagen blijven staan, uren naar rato');
-- statuswijziging wist een oud intrekverzoek; medewerker kan geen intrekverzoek of uren meesturen
update requests set cancel_asked_at = now() where id = '55000000-0000-0000-0000-000000000002';
update requests set status = 'pending' where id = '55000000-0000-0000-0000-000000000002';
select t_ok((select cancel_asked_at is null from requests where id = '55000000-0000-0000-0000-000000000002'), 'terugzetten wist het intrekverzoek');
set role authenticated; select as_user(2);
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, cancel_asked_at) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 9, today_nl() + 9, now())$q$, 'nieuwe aanvraag met intrekverzoek geweigerd');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, leave_hours) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 9, today_nl() + 9, 1)$q$, 'nieuwe aanvraag met verlofuren geweigerd');
reset role;

\echo '== Update 51: verlof voor een deel van de dag'
set role authenticated; select as_user(2);
insert into requests (id, employee_id, type, start_date, end_date, from_time, to_time) values
  ('55100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 12, today_nl() + 12, '14:00', '16:00');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, from_time, to_time) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 12, today_nl() + 13, '14:00', '16:00')$q$, 'deel van de dag alleen bij één dag');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, from_time) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl() + 14, today_nl() + 14, '14:00')$q$, 'alleen begintijd kan niet');
reset role;
select t_ok((select req_label(r) like '%14:00–16:00' from requests r where id = '55100000-0000-0000-0000-000000000001'), 'label met tijden');
select t_ok(leave_hits('14:00','16:00','11:00','17:00') and not leave_hits('09:00','10:00','17:00','23:00') and leave_hits(null,null,'17:00','23:00')
  and leave_hits('23:30','00:30','17:00','01:00') and not leave_hits('01:00','02:00','17:00','23:00'), 'deel van de dag raakt alleen overlappende diensten');
select t_ok((select count(*) from menu_cards where title = 'Lunch') = 1, 'lunchkaart toegevoegd');

\echo ''
\echo 'ALLE DATABASETESTS GESLAAGD'
