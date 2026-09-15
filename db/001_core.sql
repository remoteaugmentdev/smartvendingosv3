-- Core tenancy, catalog, and fleet tables.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.operators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  plan        text NOT NULL DEFAULT 'pro',
  currency    text NOT NULL DEFAULT 'USD',
  timezone    text NOT NULL DEFAULT 'America/Chicago',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- operator_members links a Supabase auth profile to an operator.
-- ponytail: profile_id is a plain uuid with no FK. public.profiles / auth.users
-- live outside this migration set (created by setup-db.mjs) and may not exist
-- yet when this file runs, so we do not couple to them here.
CREATE TABLE IF NOT EXISTS public.operator_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL,
  role         text NOT NULL CHECK (role IN ('Admin','Manager','Dispatcher','Technician','Viewer')),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operator_members_operator ON public.operator_members(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_members_profile ON public.operator_members(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS operator_members_operator_profile_key ON public.operator_members(operator_id, profile_id);

CREATE TABLE IF NOT EXISTS public.locations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id       uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name              text NOT NULL,
  address_line1     text,
  address_line2     text,
  city              text,
  state             text,
  zip               text,
  country           text,
  contact_name      text,
  contact_phone     text,
  contact_email     text,
  working_days      text[], -- ponytail: day codes e.g. {MON,TUE,WED}, no per-day hours table
  working_hours     text,   -- ponytail: free text like "8am - 6pm", upgrade to structured schedule if reporting needs it
  commission_type   text NOT NULL DEFAULT 'none' CHECK (commission_type IN ('none','percent','flat_monthly','per_transaction')),
  commission_value  numeric(12,2),
  -- ponytail: single tax rate, no location_tax_rates table for multiple stacked tax rows
  tax_rate          numeric(5,2),
  service_pattern   text NOT NULL DEFAULT 'none' CHECK (service_pattern IN ('none','weekly','biweekly','monthly','custom')),
  notes             text,
  status            text NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_operator ON public.locations(operator_id);

CREATE TABLE IF NOT EXISTS public.machines (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id                 uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  location_id                 uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  route_id                    uuid, -- FK to public.routes added in 003_operations.sql (routes table doesn't exist yet here)
  name                        text NOT NULL,
  machine_code                text NOT NULL, -- machine ID / serial number, e.g. "CD001"
  machine_type                text CHECK (machine_type IN ('snack','beverage','combo','refrigerated','micro_market')),
  brand_model                 text,
  year_of_manufacture         int,
  status                      text NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline','warning')),
  cabinet_count                int NOT NULL DEFAULT 1,
  total_slots                 int NOT NULL DEFAULT 0,
  payment_card                boolean NOT NULL DEFAULT true,
  payment_nfc                 boolean NOT NULL DEFAULT false,
  payment_qr                  boolean NOT NULL DEFAULT false,
  payment_cash                boolean NOT NULL DEFAULT false,
  low_inventory_threshold_pct numeric(5,2) NOT NULL DEFAULT 20,
  offline_alert_delay_minutes int NOT NULL DEFAULT 15,
  currency                    text NOT NULL DEFAULT 'USD',
  tax_rate                    numeric(5,2) NOT NULL DEFAULT 0,
  install_date                date,
  removal_date                date,
  notes                       text,
  telemetry_enabled           boolean NOT NULL DEFAULT false,
  telemetry_provider          text, -- free text: "Micron API", "Nayax", "CPI", hardware-agnostic
  telemetry_device_id         text,
  last_ping_at                timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_machines_operator ON public.machines(operator_id);
CREATE INDEX IF NOT EXISTS idx_machines_location ON public.machines(location_id);
CREATE UNIQUE INDEX IF NOT EXISTS machines_operator_code_key ON public.machines(operator_id, machine_code);
CREATE UNIQUE INDEX IF NOT EXISTS machines_operator_telemetry_device_key ON public.machines(operator_id, telemetry_device_id);

CREATE TABLE IF NOT EXISTS public.product_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_types_operator ON public.product_types(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_types_operator_name_key ON public.product_types(operator_id, name);

CREATE TABLE IF NOT EXISTS public.tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  color        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tags_operator ON public.tags(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS tags_operator_name_key ON public.tags(operator_id, name);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  contact_name text,
  phone        text,
  email        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_operator ON public.suppliers(operator_id);

CREATE TABLE IF NOT EXISTS public.products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id        uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  product_type_id    uuid REFERENCES public.product_types(id) ON DELETE SET NULL,
  name               text NOT NULL,
  upc                text, -- barcode / product code
  price              numeric(12,2) NOT NULL DEFAULT 0,
  cost_price         numeric(12,2) NOT NULL DEFAULT 0,
  units_per_case     int,
  reorder_point      int NOT NULL DEFAULT 0,
  order_up_to_level  int,
  min_quantity       int,
  max_quantity       int,
  description        text,
  photo_url          text,
  active             boolean NOT NULL DEFAULT true,
  is_variety_pack    boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_operator ON public.products(operator_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(product_type_id);

CREATE TABLE IF NOT EXISTS public.product_tags (
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id       uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_product_tags_operator ON public.product_tags(operator_id);

CREATE TABLE IF NOT EXISTS public.planogram_slots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id       uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id        uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  cabinet           text NOT NULL, -- "CabinetA", "CabinetB", ...
  floor_number      int NOT NULL DEFAULT 1,
  slot_code         text NOT NULL, -- visual slot label, e.g. "A-01"
  selection_code    text, -- MDB selection code Nayax reports
  capacity          int NOT NULL DEFAULT 0,
  quantity          int NOT NULL DEFAULT 0, -- current inventory
  price             numeric(12,2) NOT NULL DEFAULT 0,
  cost_price        numeric(12,2) NOT NULL DEFAULT 0,
  expiry_date       date,
  reorder_point     int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  motor_status      text NOT NULL DEFAULT 'normal' CHECK (motor_status IN ('normal','error')),
  last_restocked_at timestamptz,
  last_restocked_by text, -- ponytail: technician name as free text, no FK to operator_members
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planogram_slots_operator ON public.planogram_slots(operator_id);
CREATE INDEX IF NOT EXISTS idx_planogram_slots_machine ON public.planogram_slots(machine_id);
CREATE INDEX IF NOT EXISTS idx_planogram_slots_product ON public.planogram_slots(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS planogram_slots_machine_slot_code_key ON public.planogram_slots(machine_id, slot_code);
