-- Update 47: allergenen per gerecht op de menukaarten, met controle door de directie
-- allergens = { "<gerecht>": { "codes": ["gluten","melk"], "ok": true|false, "by": "<naam>", "at": "<tijd>" } }
alter table public.menu_cards add column if not exists allergens jsonb not null default '{}'::jsonb;

create or replace function public.set_menu_allergens(p_card uuid, p_key text, p_codes text[], p_ok boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['gluten','schaaldieren','ei','vis','pinda','soja','melk','noten','selderij','mosterd','sesam','sulfiet','lupine','weekdieren'];
  codes text[];
  v jsonb;
  who text;
begin
  if not public.is_manager() then raise exception 'Alleen de directie kan allergenen vastleggen.'; end if;
  p_key := lower(trim(coalesce(p_key, '')));
  if p_key = '' or length(p_key) > 120 then raise exception 'Onbekend gerecht.'; end if;
  select array(select distinct c from unnest(coalesce(p_codes, '{}')) c where c = any(allowed) order by 1) into codes;
  select name into who from public.employees where id = public.my_employee_id();
  v := jsonb_build_object('codes', to_jsonb(codes), 'ok', coalesce(p_ok, false), 'by', coalesce(who, ''), 'at', now());
  update public.menu_cards set allergens = jsonb_set(coalesce(allergens, '{}'::jsonb), array[p_key], v, true) where id = p_card;
  if not found then raise exception 'Kaart niet gevonden.'; end if;
  return v;
end $$;
revoke execute on function public.set_menu_allergens(uuid, text, text[], boolean) from public, anon;
grant execute on function public.set_menu_allergens(uuid, text, text[], boolean) to authenticated;
