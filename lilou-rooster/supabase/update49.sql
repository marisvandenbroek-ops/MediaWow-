-- Update 49: shiftleaders mogen ruilverzoeken zien en goedkeuren (verlof en kloktijden blijven bij de directie)

-- meldingen voor shiftleaders
create or replace function public.notify_planners(p_title text, p_body text, p_view text, p_except uuid[] default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (employee_id, title, body, view)
  select id, p_title, p_body, p_view from public.employees
   where role = 'planner' and active and not (id = any(coalesce(p_except, '{}')))
$$;
revoke execute on function public.notify_planners(text, text, text, uuid[]) from public, anon, authenticated;

-- shiftleaders zien alle ruilverzoeken
drop policy if exists swap_select on public.swaps;
create policy swap_select on public.swaps for select to authenticated
  using (public.is_planner() or from_employee = public.my_employee_id() or to_employee = public.my_employee_id()
         or taken_by = public.my_employee_id() or (to_employee is null and status = 'open' and public.my_employee_id() is not null));

-- collega neemt over: directie én shiftleaders krijgen het verzoek ter goedkeuring
create or replace function public.swap_respond(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); w public.swaps; s public.shifts; need boolean;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into w from public.swaps where id = p_id for update;
  if not found or w.status <> 'open' then raise exception 'Dit verzoek is niet meer open.'; end if;
  if w.from_employee = me or (w.to_employee is not null and w.to_employee <> me) then raise exception 'Dit verzoek is niet voor jou.'; end if;
  select * into s from public.shifts where id = w.shift_id;
  if not p_accept then
    if w.to_employee is null then return; end if;   -- aanbod aan iedereen: niets doen
    update public.swaps set status = 'rejected', decided_at = now() where id = p_id;
    perform public.notify(w.from_employee, 'Verzoek geweigerd', public.first_name(me) || ' kan ' || public.shift_label(s.date, s.start_time, s.end_time) || ' niet overnemen', 'diensten');
    return;
  end if;
  update public.swaps set status = 'accepted', taken_by = me where id = p_id;
  select swap_needs_approval into need from public.settings where id = 1;
  if coalesce(need, true) then
    perform public.notify(w.from_employee, 'Collega gevonden', public.first_name(me) || ' neemt ' || public.shift_label(s.date, s.start_time, s.end_time) || ' over. Wacht op goedkeuring van de leiding.', 'diensten');
    perform public.notify_managers('Ruil ter goedkeuring', public.first_name(w.from_employee) || ' → ' || public.first_name(me) || ': '
      || public.shift_label(s.date, s.start_time, s.end_time), 'aanvragen:ruilen');
    perform public.notify_planners('Ruil ter goedkeuring', public.first_name(w.from_employee) || ' → ' || public.first_name(me) || ': '
      || public.shift_label(s.date, s.start_time, s.end_time), 'diensten', array[me, w.from_employee]);
  else
    perform public.swap_execute(p_id);
    perform public.notify(w.from_employee, 'Ruil geregeld', public.first_name(me) || ' neemt ' || public.shift_label(s.date, s.start_time, s.end_time) || ' over.', 'mijn');
    perform public.notify_managers('Dienst geruild', public.first_name(w.from_employee) || ' → ' || public.first_name(me) || ': ' || public.shift_label(s.date, s.start_time, s.end_time), 'planning');
  end if;
end $$;

-- goedkeuren of afwijzen: directie of shiftleader (niet je eigen ruil)
create or replace function public.swap_decide(p_id uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare w public.swaps; s public.shifts; lbl text; me uuid := public.my_employee_id();
begin
  if not public.is_planner() then raise exception 'Alleen de directie of een shiftleader kan ruilen goedkeuren.'; end if;
  select * into w from public.swaps where id = p_id for update;
  if not found or w.status <> 'accepted' then raise exception 'Dit verzoek wacht niet op goedkeuring.'; end if;
  if not public.is_manager() and me in (w.from_employee, w.taken_by) then raise exception 'Je eigen ruil wordt door iemand anders goedgekeurd.'; end if;
  select * into s from public.shifts where id = w.shift_id;
  lbl := public.shift_label(s.date, s.start_time, s.end_time);
  if p_approve then
    perform public.swap_execute(p_id);
    update public.swaps set manager_note = nullif(trim(coalesce(p_note, '')), '') where id = p_id;
    perform public.notify(w.from_employee, 'Ruil goedgekeurd', lbl || ' is overgenomen door ' || public.first_name(w.taken_by), 'mijn');
    perform public.notify(w.taken_by, 'Ruil goedgekeurd', lbl || ' staat nu in jouw rooster', 'mijn');
  else
    update public.swaps set status = 'rejected', decided_at = now(), manager_note = nullif(trim(coalesce(p_note, '')), '') where id = p_id;
    perform public.notify(w.from_employee, 'Ruil afgewezen', lbl || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'diensten');
    perform public.notify(w.taken_by, 'Ruil afgewezen', lbl || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'diensten');
  end if;
end $$;
revoke execute on function public.swap_respond(uuid, boolean) from public, anon;
revoke execute on function public.swap_decide(uuid, boolean, text) from public, anon;
grant execute on function public.swap_respond(uuid, boolean), public.swap_decide(uuid, boolean, text) to authenticated;

-- veiligheid: vaste zoekpad voor hulpfunctie
alter function public.cert_label(text, text) set search_path = public;
