-- Update 45: iedereen die werkt kan een dagrapport schrijven (één per persoon per dag).
-- Directie en shiftleaders lezen alle rapporten; een medewerker ziet alleen zijn eigen rapport. Veilig om vaker uit te voeren.
delete from public.day_reports where employee_id is null;
alter table public.day_reports alter column employee_id set not null;
alter table public.day_reports drop constraint if exists day_reports_employee_id_fkey;
alter table public.day_reports add constraint day_reports_employee_id_fkey foreign key (employee_id) references public.employees(id) on delete cascade;
alter table public.day_reports drop constraint if exists day_reports_pkey;
alter table public.day_reports add constraint day_reports_pkey primary key (date, employee_id);

drop policy if exists dayrep_select on public.day_reports;
create policy dayrep_select on public.day_reports for select to authenticated
  using (public.is_planner() or employee_id = public.my_employee_id());

create or replace function public.save_day_report(p_date date, p_busy text, p_notes text, p_sold_out text, p_team text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); isnew boolean;
begin
  if me is null or not exists (select 1 from public.employees where id = me and active) then raise exception 'Geen actieve medewerker.'; end if;
  if not public.is_manager() and (p_date < public.business_day() - 1 or p_date > public.business_day()) then
    raise exception 'Een dagrapport kun je alleen voor vandaag of gisteren invullen.';
  end if;
  isnew := not exists (select 1 from public.day_reports where date = p_date and employee_id = me);
  insert into public.day_reports (date, busy, notes, sold_out, team, employee_id)
  values (p_date, nullif(p_busy, ''), nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_sold_out, '')), ''), nullif(btrim(coalesce(p_team, '')), ''), me)
  on conflict (date, employee_id) do update set busy = excluded.busy, notes = excluded.notes, sold_out = excluded.sold_out, team = excluded.team, updated_at = now();
  if isnew then
    perform public.notify_managers('Dagrapport ' || to_char(p_date, 'DD-MM'), 'Van ' || public.first_name(me) || coalesce(': ' || left(nullif(btrim(coalesce(p_notes, '')), ''), 120), '.'), 'overzicht:rapport:' || p_date::text, me);
  end if;
end $$;
revoke execute on function public.save_day_report(date, text, text, text, text) from public, anon;
grant execute on function public.save_day_report(date, text, text, text, text) to authenticated;
