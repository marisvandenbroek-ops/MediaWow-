-- Update 50: goedgekeurd verlof intrekken
-- Medewerker vraagt erom (de directie krijgt een melding); de directie trekt het in of laat het staan.

alter table public.requests add column if not exists cancel_asked_at timestamptz;

create or replace function public.req_label(r public.requests) returns text
language sql stable set search_path = public as $$
  select (case r.type when 'vakantie' then 'vakantie' when 'vrij' then 'vrije dag' when 'onbeschikbaar' then 'niet beschikbaar' else 'ziekmelding' end)
      || ' ' || to_char(r.start_date, 'DD-MM') || case when r.end_date <> r.start_date then ' t/m ' || to_char(r.end_date, 'DD-MM') else '' end
$$;

-- medewerker: vraag om goedgekeurd verlof in te trekken
create or replace function public.request_cancel_ask(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_employee_id(); r public.requests;
begin
  if me is null then raise exception 'Je account is niet gekoppeld aan een medewerker.'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.employee_id <> me then raise exception 'Deze aanvraag is niet van jou.'; end if;
  if r.status <> 'approved' or r.type = 'ziek' then raise exception 'Alleen goedgekeurd verlof kun je laten intrekken.'; end if;
  if r.end_date < (now() at time zone 'Europe/Amsterdam')::date then raise exception 'Dit verlof is al voorbij.'; end if;
  if r.cancel_asked_at is not null then raise exception 'Je hebt dit al gevraagd. De directie beslist.'; end if;
  update public.requests set cancel_asked_at = now() where id = p_id;
  perform public.notify_managers('Verlof intrekken?', public.first_name(me) || ' wil ' || public.req_label(r) || ' intrekken', 'aanvragen:verlof');
end $$;

-- directie: verlof intrekken (verwijderen, uren komen terug) of laten staan
create or replace function public.request_withdraw(p_id uuid, p_keep boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan verlof intrekken.'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found then raise exception 'Deze aanvraag bestaat niet meer.'; end if;
  if r.status <> 'approved' or r.type = 'ziek' then raise exception 'Alleen goedgekeurd verlof kan worden ingetrokken.'; end if;
  if p_keep then
    update public.requests set cancel_asked_at = null where id = p_id;
    perform public.notify(r.employee_id, 'Verlof blijft staan', initcap(public.req_label(r)) || ' blijft staan. Vraag de directie als je wilt overleggen.', 'aanvragen');
  else
    delete from public.requests where id = p_id;
    perform public.notify(r.employee_id, 'Verlof ingetrokken', initcap(public.req_label(r)) || ' is ingetrokken. De uren staan weer op je saldo.', 'aanvragen');
  end if;
end $$;

revoke execute on function public.request_cancel_ask(uuid) from public, anon;
revoke execute on function public.request_withdraw(uuid, boolean) from public, anon;
grant execute on function public.request_cancel_ask(uuid), public.request_withdraw(uuid, boolean) to authenticated;
