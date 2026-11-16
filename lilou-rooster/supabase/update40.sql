-- Update 40: testmelding naar jezelf (controleren of pushmeldingen op dit toestel werken). Veilig om vaker uit te voeren.
create or replace function public.push_test() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id();
begin
  if me is null then raise exception 'Geen medewerker gekoppeld aan dit account'; end if;
  if exists (select 1 from public.notifications where employee_id = me and title = 'Testmelding' and created_at > now() - interval '30 seconds') then
    raise exception 'Even wachten: je hebt net al een testmelding gestuurd.';
  end if;
  perform public.notify(me, 'Testmelding', 'Zie je dit als melding op je telefoon? Dan werken de pushmeldingen op dit toestel.', '');
end $$;
revoke execute on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;
