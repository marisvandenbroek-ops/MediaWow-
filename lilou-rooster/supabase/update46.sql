-- Update 46: beschikbaarheid met eigen tijden (bijv. "beschikbaar van 18:00 tot 23:00")
alter table public.availability add column if not exists from_time time;
alter table public.availability add column if not exists to_time time;
alter table public.availability drop constraint if exists availability_kind_check;
alter table public.availability add constraint availability_kind_check
  check (kind in ('hele_dag', 'ochtend', 'middag', 'avond', 'tijden', 'niet'));
alter table public.availability drop constraint if exists availability_times_check;
alter table public.availability add constraint availability_times_check
  check (kind <> 'tijden' or (from_time is not null and to_time is not null and from_time <> to_time));
