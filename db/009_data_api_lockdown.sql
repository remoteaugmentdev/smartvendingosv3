-- Data API lockdown. On Supabase, the auto-provisioned anon/authenticated roles get
-- default privileges on every new public table, and PostgREST (the Data API) uses
-- those roles directly, so a table safe from a scoped app query can still be
-- world-readable over the API. This app always connects as the table owner
-- (postgres, rolbypassrls = true), so enabling RLS here does not affect it; it
-- exists purely to block the Data API. No auth.uid() policies are added because
-- this app authenticates with custom signed JWT sessions (src/utils/session.ts),
-- not Supabase auth sessions, so auth.uid() is never populated for it.
-- No-op on a plain PostgreSQL install (no anon/authenticated roles).

DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN

    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;

    IF to_regclass('public.profiles') IS NOT NULL THEN
      DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
      DROP POLICY IF EXISTS profiles_master_select ON public.profiles;
    END IF;
  END IF;
END $$;
