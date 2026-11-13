-- Bootst de onderdelen van Supabase na die het schema nodig heeft (rollen en auth),
-- zodat schema.sql en de tests op een gewone PostgreSQL-database kunnen draaien.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant usage on schema public to authenticated, anon;
-- "Automatically expose new tables": met -v expose=1 krijgen nieuwe tabellen automatisch alle rechten
-- (zoals Supabase standaard doet); zonder die vlag niet. De tests draaien beide varianten.
\if :{?expose}
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
\endif
