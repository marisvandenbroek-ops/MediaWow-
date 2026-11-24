-- Update 51: verlof voor een deel van de dag (bijv. een uurtje vrij voor de tandarts)
alter table public.requests add column if not exists from_time time;
alter table public.requests add column if not exists to_time time;
alter table public.requests drop constraint if exists requests_part_day;
alter table public.requests add constraint requests_part_day check (
  (from_time is null and to_time is null)
  or (from_time is not null and to_time is not null and from_time <> to_time and start_date = end_date and type <> 'ziek')
);

-- melding en labels met de tijden erbij
create or replace function public.req_label(r public.requests) returns text
language sql stable set search_path = public as $$
  select (case r.type when 'vakantie' then 'Vakantie' when 'vrij' then 'Vrije dag' when 'onbeschikbaar' then 'Niet beschikbaar' else 'Ziekmelding' end)
      || ' ' || to_char(r.start_date, 'DD-MM') || case when r.end_date <> r.start_date then ' t/m ' || to_char(r.end_date, 'DD-MM') else '' end
      || case when r.from_time is not null then ' ' || to_char(r.from_time, 'HH24:MI') || '–' || to_char(r.to_time, 'HH24:MI') else '' end
$$;
