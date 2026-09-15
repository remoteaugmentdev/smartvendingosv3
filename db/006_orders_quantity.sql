-- Units sold per order. Reporting needs it (units sold, stockout forecast, slot
-- decrement on sync) and it cannot be derived from amount, since price varies by slot.
-- Separate file because 002_sales.sql is already applied and recorded in schema_migrations.
-- Idempotent: safe to re-run.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity int NOT NULL DEFAULT 1;

-- ponytail: no cogs/tax columns on orders. COGS joins products.cost_price and tax
-- uses machines.tax_rate, both current values rather than the value at sale time.
-- Add per-order snapshots here if historical price or rate changes start skewing P&L.
