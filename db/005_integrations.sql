-- Telemetry integrations, Nayax sync bookkeeping, common problems, custom fields.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.telemetry_providers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL, -- "Nayax", "Cantaloupe", "Micron API", etc
  provider_type text, -- ponytail: free text, no enum, new providers shouldn't need a migration
  config       jsonb NOT NULL DEFAULT '{}'::jsonb, -- API keys / endpoints, kept out of column sprawl
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_providers_operator ON public.telemetry_providers(operator_id);

-- One row per operator+machine being synced from a telemetry provider (typically Nayax).
-- last_external_cursor / last_synced_at let the sync job resume idempotently instead of
-- re-pulling the full history, and the unique index prevents duplicate sync rows per machine.
CREATE TABLE IF NOT EXISTS public.nayax_sync_state (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id           uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  telemetry_provider_id uuid REFERENCES public.telemetry_providers(id) ON DELETE CASCADE,
  machine_id            uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  last_external_cursor  text,
  last_synced_at        timestamptz,
  last_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nayax_sync_state_operator ON public.nayax_sync_state(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS nayax_sync_state_machine_key ON public.nayax_sync_state(machine_id);

CREATE TABLE IF NOT EXISTS public.common_problems (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_common_problems_operator ON public.common_problems(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS common_problems_operator_name_key ON public.common_problems(operator_id, name);

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  entity_type   text NOT NULL CHECK (entity_type IN ('machine','location','product','order')),
  field_name    text NOT NULL,
  field_type    text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','number','boolean','date','select')),
  options       text[], -- for field_type = 'select'
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_fields_operator ON public.custom_fields(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS custom_fields_operator_entity_name_key ON public.custom_fields(operator_id, entity_type, field_name);
