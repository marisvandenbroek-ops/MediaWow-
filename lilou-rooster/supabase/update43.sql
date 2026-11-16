-- Update 43: "Ik ben weer beter" op de dag van de ziekmelding zelf laat de melding meteen verdwijnen.
-- Het moment van beter melden wordt bewaard (recovered_at). Veilig om vaker uit te voeren.
alter table public.requests add column if not exists recovered_at timestamptz;

create or replace function public.sick_recover(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); r public.requests;
begin
  select * into r from public.requests where id = p_id and employee_id = me and type = 'ziek';
  if not found then raise exception 'Ziekmelding niet gevonden.'; end if;
  update public.requests set end_date = case when r.open_end or r.end_date > public.today_nl() then greatest(r.start_date, public.today_nl()) else end_date end,
         open_end = false, recovered_at = coalesce(recovered_at, now())
   where id = p_id;
  insert into public.notifications (employee_id, title, body, view)
  select id, '💪 Weer beter', public.first_name(me) || ' is weer beter en kan weer werken.', case when role = 'manager' then 'aanvragen:verlof' else 'planning' end
    from public.employees where role in ('manager', 'planner') and active and id <> me;
end $$;
revoke execute on function public.sick_recover(uuid) from public, anon;
grant execute on function public.sick_recover(uuid) to authenticated;
