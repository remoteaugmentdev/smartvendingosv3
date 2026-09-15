-- Fleet operations: routes, trips, vehicles, warehouses, purchasing, expenses.
-- Idempotent: safe to re-run.
-- Note: vehicles and warehouses are created before the tables that reference them,
-- even though the task's table list names routes first.

CREATE TABLE IF NOT EXISTS public.vehicles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  plate_number text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_operator ON public.vehicles(operator_id);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name         text NOT NULL,
  address      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_operator ON public.warehouses(operator_id);

CREATE TABLE IF NOT EXISTS public.routes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name          text NOT NULL,
  technician    text, -- ponytail: free text driver/technician name, no FK to operator_members
  color         text, -- hex color for route map display
  frequency     text CHECK (frequency IN ('daily','weekly','biweekly','monthly','custom')),
  drive_time_minutes int,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routes_operator ON public.routes(operator_id);

-- idempotently add the machines.route_id FK now that routes exists (defined as plain uuid in 001_core.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'machines_route_id_fkey'
  ) THEN
    ALTER TABLE public.machines
      ADD CONSTRAINT machines_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.route_stops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  route_id     uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  machine_id   uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  stop_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_route_stops_operator ON public.route_stops(operator_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);
CREATE UNIQUE INDEX IF NOT EXISTS route_stops_route_machine_key ON public.route_stops(route_id, machine_id);

CREATE TABLE IF NOT EXISTS public.trips (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  route_id      uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  vehicle_id    uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  technician    text,
  status        text NOT NULL DEFAULT 'created' CHECK (status IN ('created','posted','completed','cancelled')),
  started_at    timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trips_operator ON public.trips(operator_id);
CREATE INDEX IF NOT EXISTS idx_trips_route ON public.trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

CREATE TABLE IF NOT EXISTS public.trip_stops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  machine_id   uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  stop_order   int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
  arrived_at   timestamptz,
  departed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_stops_operator ON public.trip_stops(operator_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip ON public.trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_machine ON public.trip_stops(machine_id);

CREATE TABLE IF NOT EXISTS public.trip_slot_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id       uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  trip_stop_id      uuid NOT NULL REFERENCES public.trip_stops(id) ON DELETE CASCADE,
  planogram_slot_id uuid REFERENCES public.planogram_slots(id) ON DELETE SET NULL,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  qty_before        int,
  qty_added         int,
  qty_after         int,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_slot_entries_operator ON public.trip_slot_entries(operator_id);
CREATE INDEX IF NOT EXISTS idx_trip_slot_entries_trip_stop ON public.trip_slot_entries(trip_stop_id);

CREATE TABLE IF NOT EXISTS public.cash_collections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id   uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  trip_stop_id uuid REFERENCES public.trip_stops(id) ON DELETE SET NULL,
  type         text NOT NULL DEFAULT 'collection' CHECK (type IN ('collection','deposit','adjustment')),
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  technician   text,
  notes        text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_collections_operator ON public.cash_collections(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_collections_machine ON public.cash_collections(machine_id);

CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_operator ON public.warehouse_stock(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_warehouse_product_key ON public.warehouse_stock(warehouse_id, product_id);

CREATE TABLE IF NOT EXISTS public.purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  supplier_id     uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id    uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  invoice_number  text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','cancelled')),
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_operator ON public.purchases(operator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  purchase_id   uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity      int NOT NULL DEFAULT 0,
  unit_cost     numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_operator ON public.purchase_items(operator_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id   uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  location_id  uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category     text NOT NULL CHECK (category IN ('fuel','repairs','refunds','supplies','insurance','rent','other')),
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  description  text,
  incurred_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_operator ON public.expenses(operator_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
