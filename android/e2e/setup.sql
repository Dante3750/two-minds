-- the login role PostgREST uses, switching to anon / authenticated per request (as on Supabase)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login password 'authpass' noinherit; end if;
end $$;
grant anon, authenticated to authenticator;
