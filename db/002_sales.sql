-- Sales, alerts, and service issue tables.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id    uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id     uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  planogram_slot_id uuid REFERENCES public.planogram_slots(id) ON DELETE SET NULL,
  product_id     uuid REFERENCES public.products(id) ON DELETE SET NULL,
  slot_code      text,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text CHECK (payment_method IN ('card','cash','nfc','qr','other')),
  status         text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded','failed')),
  refund_amount  numeric(12,2),
  external_id    text, -- Nayax/telemetry transaction id, for idempotent ingestion
  ordered_at     timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_operator ON public.orders(operator_id);
CREATE INDEX IF NOT EXISTS idx_orders_machine ON public.orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON public.orders(ordered_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_operator_external_id_key ON public.orders(operator_id, external_id);

CREATE TABLE IF NOT EXISTS public.alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id   uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  location_id  uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type IN ('offline','low_stock','motor_error','expiry','payment_error')),
  title        text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_alerts_operator ON public.alerts(operator_id);
CREATE INDEX IF NOT EXISTS idx_alerts_machine ON public.alerts(machine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

-- ponytail: problem_type is free text, not FK'd to common_problems (005_integrations.sql)
-- to avoid a forward cross-file dependency; upgrade to FK + backfill if lookup drift matters.
CREATE TABLE IF NOT EXISTS public.service_issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id    uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  problem_type  text,
  description   text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','cancelled')),
  reported_by   text,
  assigned_to   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_service_issues_operator ON public.service_issues(operator_id);
CREATE INDEX IF NOT EXISTS idx_service_issues_machine ON public.service_issues(machine_id);
CREATE INDEX IF NOT EXISTS idx_service_issues_status ON public.service_issues(status);
