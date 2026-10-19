-- Portable identity: public.users takes over from Supabase auth.users/public.profiles.
-- Idempotent: safe to re-run. Fresh PostgreSQL (no auth schema) and a populated
-- Supabase-like database both converge on the same public.users/leads shape.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email <> ''),
  password_hash    text,
  first_name       text,
  last_name        text,
  status           text NOT NULL CHECK (status IN ('invited','active','suspended')),
  platform_role    text CHECK (platform_role IN ('master','demo')),
  label            text,
  expires_at       timestamptz,
  session_version  int NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.users.password_hash IS 'null means this account cannot sign in yet (invited or placeholder)';
COMMENT ON COLUMN public.users.platform_role IS 'null means an ordinary user with no platform-wide role';

CREATE TABLE IF NOT EXISTS public.invitation_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  operator_id  uuid REFERENCES public.operators(id) ON DELETE CASCADE,
  member_id    uuid REFERENCES public.operator_members(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  revoked_at   timestamptz,
  invited_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.invitation_tokens.token_hash IS 'sha256 hex of the raw token; the raw token itself is never stored';

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operator_id    uuid REFERENCES public.operators(id) ON DELETE CASCADE,
  actor_id       uuid,
  principal_kind text NOT NULL CHECK (principal_kind IN ('user','prospect','system')),
  entity_type    text NOT NULL,
  entity_id      text,
  action         text NOT NULL,
  changes        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.audit_log.operator_id IS 'null only for platform/identity events that are not scoped to a tenant';
COMMENT ON COLUMN public.audit_log.actor_id IS 'intentionally no FK: audit history must survive user removal';
COMMENT ON COLUMN public.audit_log.changes IS 'redacted by the application before insert, never raw secrets';
CREATE INDEX IF NOT EXISTS idx_audit_log_operator_created ON public.audit_log (operator_id, created_at DESC);

-- leads: take over creation from src/utils/leadsSchema.ts (mirrored exactly, including
-- its two-step shape) so a fresh DB and the existing production table converge.
-- leadsSchema.ts itself is removed in a later slice.
CREATE TABLE IF NOT EXISTS public.leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text,
  email            text,
  company          text NOT NULL,
  fleet_size       text,
  pain_point       text,
  current_solution text,
  slug             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN fleet_size DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN pain_point DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN current_solution DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_message text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_slug_key ON public.leads (slug);

-- Identity copy from auth.users/public.profiles, only when auth.users exists. Uses
-- EXECUTE throughout so a fresh PostgreSQL without an auth schema still parses and
-- runs this file (a plain reference to auth.users would fail to plan even inside an
-- untaken IF branch once other statements in the same DO block touch it).
DO $$
DECLARE
  bad_ids text;
  dup_ids text;
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $q$
    SELECT string_agg(id::text, ', ')
    FROM auth.users
    WHERE email IS NULL OR btrim(email) = ''
  $q$ INTO bad_ids;

  IF bad_ids IS NOT NULL THEN
    RAISE EXCEPTION 'identity migration aborted: auth.users has null/empty email for id(s): %. Fix these rows before re-running.', bad_ids;
  END IF;

  EXECUTE $q$
    SELECT string_agg(ids, '; ')
    FROM (
      SELECT string_agg(id::text, ', ') AS ids
      FROM auth.users
      GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    ) dupes
  $q$ INTO dup_ids;

  IF dup_ids IS NOT NULL THEN
    RAISE EXCEPTION 'identity migration aborted: auth.users has duplicate normalized emails, id group(s): %. Resolve duplicates before re-running.', dup_ids;
  END IF;
END $$;

-- ponytail: created_at is sourced from auth.users (the canonical account-creation
-- instant); updated_at aggregates the latest known update across both source rows.
-- Reversible assumption, not specified further by the source systems.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO public.users (
        id, email, password_hash, first_name, last_name, status, platform_role, label, expires_at, created_at, updated_at
      )
      SELECT
        u.id,
        lower(btrim(u.email)),
        NULLIF(u.encrypted_password, ''),
        p.first_name,
        p.last_name,
        CASE WHEN u.email_confirmed_at IS NULL THEN 'invited' ELSE 'active' END,
        CASE
          WHEN p.id IS NULL THEN 'demo'
          WHEN p.role = 'master' THEN 'master'
          WHEN p.role = 'demo' THEN 'demo'
          ELSE NULL
        END,
        p.label,
        p.expires_at,
        u.created_at,
        GREATEST(
          COALESCE(u.updated_at, u.created_at),
          COALESCE(p.updated_at, u.created_at)
        )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      ON CONFLICT (id) DO NOTHING
    $q$;
  ELSE
    EXECUTE $q$
      INSERT INTO public.users (
        id, email, password_hash, status, platform_role, created_at, updated_at
      )
      SELECT
        u.id,
        lower(btrim(u.email)),
        NULLIF(u.encrypted_password, ''),
        CASE WHEN u.email_confirmed_at IS NULL THEN 'invited' ELSE 'active' END,
        'demo',
        u.created_at,
        COALESCE(u.updated_at, u.created_at)
      FROM auth.users u
      ON CONFLICT (id) DO NOTHING
    $q$;
  END IF;
END $$;

-- Placeholder users for every operator_members.profile_id with no users row (runs
-- unconditionally, including on a fresh install with no auth.users at all, since
-- 007_seed_demo.sql seeds operator_members regardless). Never given a usable password.
-- Recovers the seed email from 007_seed_demo.sql's md5('demo-team-member:' || email)
-- derivation where possible; falls back to a placeholder address for orphan members.
INSERT INTO public.users (id, email, password_hash, status, platform_role, created_at, updated_at)
SELECT
  missing.profile_id,
  COALESCE(seed.email, missing.profile_id::text || '@placeholder.invalid'),
  NULL,
  'invited',
  NULL,
  now(),
  now()
FROM (
  SELECT DISTINCT om.profile_id
  FROM public.operator_members om
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = om.profile_id)
) missing
LEFT JOIN (VALUES
  ('alex.johnson@peakvending.example'),
  ('john.martinez@peakvending.example'),
  ('maria.chen@peakvending.example'),
  ('bob.williams@peakvending.example'),
  ('sarah.davis@peakvending.example'),
  ('mike.brown@peakvending.example')
) AS seed(email) ON md5('demo-team-member:' || seed.email)::uuid = missing.profile_id
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operator_members_profile_id_fkey') THEN
    ALTER TABLE public.operator_members
      ADD CONSTRAINT operator_members_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Close the Data API exposure window immediately: password hashes must never be
-- readable through anon/authenticated even for the moment between 008 and 009.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.users, public.invitation_tokens, public.audit_log FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.users, public.invitation_tokens, public.audit_log FROM authenticated;
  END IF;
END $$;
