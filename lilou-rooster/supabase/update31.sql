-- Update 31: gerechten op de kaarten zelf aanpassen in de app (directie)
-- Veilig om vaker uit te voeren.
alter table public.menu_cards add column if not exists items jsonb;
alter table public.menu_cards drop constraint if exists menu_cards_items_check;
alter table public.menu_cards add constraint menu_cards_items_check
  check (items is null or (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 500 and pg_column_size(items) < 400000));
