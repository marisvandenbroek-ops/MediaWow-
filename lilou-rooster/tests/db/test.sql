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
select t_fails($q$insert into requests (employee_id, type, start_date, end_date) values ('a0000000-0000-0000-0000-000000000001', 'vrij', today_nl(), today_nl())$q$, 'geen aanvraag namens een ander');
select t_fails($q$insert into requests (employee_id, type, start_date, end_date, status) values ('a0000000-0000-0000-0000-000000000002', 'vrij', today_nl(), today_nl(), 'approved')$q$, 'aanvraag niet zelf goedkeuren');
insert into requests (employee_id, type, start_date, end_date) values ('a0000000-0000-0000-0000-000000000002', 'vakantie', today_nl() + 20, today_nl() + 24);
select t_fails($q$insert into notifications (employee_id, title) values ('a0000000-0000-0000-0000-000000000003', 'spam')$q$, 'geen nep-meldingen');
select t_fails($q$select notify('a0000000-0000-0000-0000-000000000003', 'spam', null, null)$q$, 'notify() niet aanroepbaar');
select t_ok(t_count('select * from audit_log') = 0, 'logboek leeg voor medewerker (RLS)');
select t_fails($q$insert into employee_private (employee_id, hourly_wage) values ('a0000000-0000-0000-0000-000000000002', 99)$q$, 'medewerker kan eigen loon niet zetten');
reset role;

\echo '== Publiceren en meldingen'
set role authenticated; select as_user(1);
select t_ok(publish_week(today_nl(), today_nl() + 6) = 3, 'directie publiceert 3 diensten');
reset role;
select t_ok(t_count($q$select * from notifications where title = 'Nieuw rooster'$q$) = 2, 'melding nieuw rooster voor 2 medewerkers');
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

\echo ''
\echo 'ALLE DATABASETESTS GESLAAGD'
