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
delete from checklist_ticks where item_id = 'i1';
reset role;
select t_ok(t_count('select * from checklist_ticks') = 1, 'collega kan andermans vinkje niet weghalen');
set role authenticated; select as_user(2);
update checklists set name = 'x';
reset role;
select t_ok(t_count($q$select * from checklists where name = 'x'$q$) = 0, 'medewerker kan lijsten niet aanpassen');
set role authenticated; select as_user(2);
select t_fails($q$insert into checklist_ticks (checklist_id, period, item_id, employee_id) select id, today_nl()::text, 'i1', 'a0000000-0000-0000-0000-000000000002' from checklists where name = 'Temperaturen opening'$q$, 'temperatuur is verplicht');
insert into checklist_ticks (checklist_id, period, item_id, employee_id, value)
  select id, today_nl()::text, 'i1', 'a0000000-0000-0000-0000-000000000002', 9.5 from checklists where name = 'Temperaturen opening';
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

\echo ''
\echo 'ALLE DATABASETESTS GESLAAGD'
