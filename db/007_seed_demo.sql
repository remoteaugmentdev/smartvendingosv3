-- Seeds one demo tenant (operator slug 'demo') with locations, machines,
-- products, planogram slots, routes, team memberships, and ~90 days of orders.
-- Idempotent: safe to re-run, no duplicate rows, no errors on rerun.
--
-- No hardcoded uuids. Every FK is resolved by a subselect on a natural key
-- (operator slug, machine_code, product upc, location/route name, etc).
--
-- Tables without a real unique index (locations, routes, products) use
-- INSERT ... WHERE NOT EXISTS instead of ON CONFLICT. Tables with a real
-- unique index use ON CONFLICT ... DO NOTHING.
--
-- ponytail: not seeding alerts, service_issues, campaigns, loyalty, trips,
-- purchases, expenses, vehicles, warehouse_stock. Out of scope for this task;
-- add a slice here if a screen needs them.

-- ==========================================================================
-- 1. Operator
-- ==========================================================================

INSERT INTO public.operators (slug, name, plan, currency, timezone)
VALUES ('demo', 'Peak Vending Solutions', 'pro', 'USD', 'America/Chicago')
ON CONFLICT (slug) DO NOTHING;

-- ==========================================================================
-- 2. Product types + products
-- ==========================================================================

INSERT INTO public.product_types (operator_id, name)
SELECT (SELECT id FROM public.operators WHERE slug = 'demo'), v.name
FROM (VALUES ('Beverage'), ('Snack')) AS v(name)
ON CONFLICT (operator_id, name) DO NOTHING;

INSERT INTO public.products (operator_id, product_type_id, name, upc, price, cost_price, reorder_point, active)
SELECT
  (SELECT id FROM public.operators WHERE slug = 'demo'),
  (SELECT id FROM public.product_types WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND name = v.type_name),
  v.name, v.upc, v.price, v.cost_price, v.reorder_point, true
FROM (VALUES
  ('Coca-Cola 12 oz can',        'Beverage', '049000028904', 1.25, 0.42, 50),
  ('Mountain Dew 12 oz can',     'Beverage', '012000001529', 1.25, 0.42, 40),
  ('Pepsi 12 oz can',            'Beverage', '012000800834', 1.25, 0.42, 40),
  ('3 Musketeers Candy Bar',     'Snack',    '040000004356', 1.50, 0.52, 30),
  ('Doritos Nacho Cheese',       'Snack',    '028400090360', 1.75, 0.65, 100),
  ('Fritos Corn Chips',          'Snack',    '028400090391', 1.75, 0.60, 100),
  ('Wrigley''s Doublemint Gum',  'Snack',    '022000010292', 0.75, 0.22, 20),
  ('Snickers Bar',               'Snack',    '040000001041', 1.50, 0.55, 30),
  ('Tropicana OJ 11.5 oz',       'Beverage', '048500208434', 2.25, 0.98, 20),
  ('Red Bull 8.4 oz',            'Beverage', '611269993056', 3.50, 1.62, 15),
  ('Nature Valley Granola Bar',  'Snack',    '016000275287', 1.75, 0.72, 25),
  ('Lay''s Classic Chips',       'Snack',    '028400315586', 1.75, 0.62, 80)
) AS v(name, type_name, upc, price, cost_price, reorder_point)
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND p.upc = v.upc
);

-- ==========================================================================
-- 3. Locations (5)
-- ==========================================================================

INSERT INTO public.locations (operator_id, name, address_line1, city, state, zip, country, commission_type, commission_value, status)
SELECT (SELECT id FROM public.operators WHERE slug = 'demo'), v.name, v.address_line1, v.city, v.state, v.zip, 'USA', v.commission_type, v.commission_value, 'active'
FROM (VALUES
  ('Crystal Clean',     '1234 W. Lindsey Street', 'Norman',  'OK', '73069', 'percent',      8.00),
  ('Insurance Agency',  '503 Eastern Parkway',    'Tulsa',   'OK', '73084', 'flat_monthly', 50.00),
  ('Omega Retreat',     '905 S Highway 152',      'Mustang', 'OK', '73064', 'percent',      10.00),
  ('Wells Fargo Bank',  '127 Elm Drive',          'Edmond',  'OK', '73084', 'none',         NULL),
  ('Crystal Clean II',  '89 Industrial Ave',      'Moore',   'OK', '73160', 'percent',      5.00)
) AS v(name, address_line1, city, state, zip, commission_type, commission_value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations l
  WHERE l.operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND l.name = v.name
);

-- ==========================================================================
-- 4. Machines (26 total: Crystal Clean 4, Insurance Agency 2, Omega Retreat 5,
--    Wells Fargo Bank 8, Crystal Clean II 7). Named codes per requirements
--    doc (CD001-003, WF001-003, IA001, OR001); rest generated on the same
--    per-location code convention. telemetry_device_id is always 'NYX-' ||
--    machine_code (Nayax sync keys on this).
-- ==========================================================================

INSERT INTO public.machines (
  operator_id, location_id, name, machine_code, machine_type, status,
  cabinet_count, total_slots, telemetry_enabled, telemetry_provider, telemetry_device_id, last_ping_at
)
SELECT
  (SELECT id FROM public.operators WHERE slug = 'demo'),
  (SELECT id FROM public.locations WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND name = v.location_name),
  v.name, v.machine_code, v.machine_type, v.status,
  1, 10, true, 'Nayax', 'NYX-' || v.machine_code,
  CASE v.status
    WHEN 'online'  THEN now() - ((v.rn % 20) || ' minutes')::interval
    WHEN 'warning' THEN now() - (((v.rn % 6) + 2) || ' hours')::interval
    ELSE                now() - (((v.rn % 3) + 1) || ' days')::interval
  END
FROM (
  SELECT *, row_number() OVER () AS rn FROM (VALUES
    ('Crystal Clean',    'CD001',   'Cold drink multiplace',        'beverage',      'online'),
    ('Crystal Clean',    'CD002',   'Cold drink employee',          'beverage',      'online'),
    ('Crystal Clean',    'CD003',   'Cold drink multiplex',         'combo',         'offline'),
    ('Crystal Clean',    'CD004',   'Crystal Clean Snack',          'snack',         'online'),
    ('Insurance Agency', 'IA001',   'Insurance Agency',             'combo',         'online'),
    ('Insurance Agency', 'IA002',   'Insurance Agency Beverage',    'beverage',      'warning'),
    ('Omega Retreat',    'OR001',   'Omega Retreat Main',           'snack',         'online'),
    ('Omega Retreat',    'OR002',   'Omega Retreat Drink',          'beverage',      'online'),
    ('Omega Retreat',    'OR003',   'Omega Retreat Combo',          'combo',         'online'),
    ('Omega Retreat',    'OR004',   'Omega Retreat Snack B',        'snack',         'offline'),
    ('Omega Retreat',    'OR005',   'Omega Retreat Micro Market',   'micro_market',  'online'),
    ('Wells Fargo Bank', 'WF001',   'Wells Fargo Snack',            'snack',         'online'),
    ('Wells Fargo Bank', 'WF002',   'Wells Fargo Drink',            'beverage',      'online'),
    ('Wells Fargo Bank', 'WF003',   'Wells Fargo Combo',            'combo',         'online'),
    ('Wells Fargo Bank', 'WF004',   'Wells Fargo Snack B',          'snack',         'online'),
    ('Wells Fargo Bank', 'WF005',   'Wells Fargo Drink B',          'beverage',      'warning'),
    ('Wells Fargo Bank', 'WF006',   'Wells Fargo Refrigerated',     'refrigerated',  'online'),
    ('Wells Fargo Bank', 'WF007',   'Wells Fargo Micro Market',     'micro_market',  'online'),
    ('Wells Fargo Bank', 'WF008',   'Wells Fargo Combo B',          'combo',         'offline'),
    ('Crystal Clean II', 'CC2001',  'Crystal Clean II Snack',       'snack',         'online'),
    ('Crystal Clean II', 'CC2002',  'Crystal Clean II Drink',       'beverage',      'online'),
    ('Crystal Clean II', 'CC2003',  'Crystal Clean II Combo',       'combo',         'online'),
    ('Crystal Clean II', 'CC2004',  'Crystal Clean II Snack B',     'snack',         'online'),
    ('Crystal Clean II', 'CC2005',  'Crystal Clean II Drink B',     'beverage',      'offline'),
    ('Crystal Clean II', 'CC2006',  'Crystal Clean II Refrigerated','refrigerated',  'warning'),
    ('Crystal Clean II', 'CC2007',  'Crystal Clean II Micro Market','micro_market',  'online')
  ) AS t(location_name, machine_code, name, machine_type, status)
) AS v
ON CONFLICT (operator_id, machine_code) DO NOTHING;

-- ==========================================================================
-- 5. Routes (3) + assignment + route_stops
--    Route A - North: John, weekly, 8 machines
--    Route B - South: Maria, biweekly, 9 machines
--    Route C - Central: Bob, weekly, 9 machines
-- ==========================================================================

INSERT INTO public.routes (operator_id, name, technician, frequency, drive_time_minutes, status)
SELECT (SELECT id FROM public.operators WHERE slug = 'demo'), v.name, v.technician, v.frequency, v.drive_time_minutes, 'active'
FROM (VALUES
  ('Route A - North',   'John',  'weekly',   135),
  ('Route B - South',   'Maria', 'biweekly', 225),
  ('Route C - Central', 'Bob',   'weekly',   110)
) AS v(name, technician, frequency, drive_time_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.routes r
  WHERE r.operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND r.name = v.name
);

UPDATE public.machines m
SET route_id = (SELECT id FROM public.routes WHERE operator_id = m.operator_id AND name = v.route_name)
FROM (VALUES
  ('CD001', 'Route A - North'), ('CD002', 'Route A - North'), ('CD003', 'Route A - North'), ('CD004', 'Route A - North'),
  ('IA001', 'Route A - North'), ('IA002', 'Route A - North'), ('OR001', 'Route A - North'), ('OR002', 'Route A - North'),
  ('OR003', 'Route B - South'), ('OR004', 'Route B - South'), ('OR005', 'Route B - South'),
  ('WF001', 'Route B - South'), ('WF002', 'Route B - South'), ('WF003', 'Route B - South'),
  ('WF004', 'Route B - South'), ('WF005', 'Route B - South'), ('WF006', 'Route B - South'),
  ('WF007', 'Route C - Central'), ('WF008', 'Route C - Central'),
  ('CC2001', 'Route C - Central'), ('CC2002', 'Route C - Central'), ('CC2003', 'Route C - Central'),
  ('CC2004', 'Route C - Central'), ('CC2005', 'Route C - Central'), ('CC2006', 'Route C - Central'), ('CC2007', 'Route C - Central')
) AS v(machine_code, route_name)
WHERE m.machine_code = v.machine_code
  AND m.operator_id = (SELECT id FROM public.operators WHERE slug = 'demo');

INSERT INTO public.route_stops (operator_id, route_id, machine_id, stop_order)
SELECT m.operator_id, m.route_id, m.id, row_number() OVER (PARTITION BY m.route_id ORDER BY m.machine_code)
FROM public.machines m
WHERE m.operator_id = (SELECT id FROM public.operators WHERE slug = 'demo') AND m.route_id IS NOT NULL
ON CONFLICT (route_id, machine_id) DO NOTHING;

-- ==========================================================================
-- 6. Planogram slots: 10 per machine (A1-A5, B1-B5), product cycled from the
--    12-product catalog. Slot-level reorder_point is 25% of capacity (a
--    per-slot restock threshold, independent of the product's warehouse-level
--    reorder_point which can exceed a single slot's capacity).
--    Roughly 1 in 6 slots seeded below reorder point for low-stock alerts.
-- ==========================================================================

WITH demo_op AS (
  SELECT id FROM public.operators WHERE slug = 'demo'
),
product_list AS (
  SELECT id, price, cost_price, row_number() OVER (ORDER BY name) AS rn
  FROM public.products WHERE operator_id = (SELECT id FROM demo_op)
),
machine_list AS (
  SELECT id, machine_code, row_number() OVER (ORDER BY machine_code) AS mrn
  FROM public.machines WHERE operator_id = (SELECT id FROM demo_op)
),
slot_seed AS (
  SELECT m.id AS machine_id, m.mrn, s.n AS slot_n
  FROM machine_list m CROSS JOIN generate_series(1, 10) AS s(n)
)
INSERT INTO public.planogram_slots (
  operator_id, machine_id, product_id, cabinet, floor_number, slot_code, selection_code,
  capacity, quantity, price, cost_price, reorder_point, enabled
)
SELECT
  (SELECT id FROM demo_op),
  ss.machine_id,
  pl.id,
  'CabinetA',
  1,
  chr(65 + ((ss.slot_n - 1) / 5)) || (((ss.slot_n - 1) % 5) + 1)::text,
  'SEL' || lpad(ss.slot_n::text, 2, '0'),
  40,
  CASE WHEN (ss.mrn + ss.slot_n) % 6 = 0 THEN (ss.mrn + ss.slot_n) % 8 ELSE 15 + ((ss.mrn * 7 + ss.slot_n * 3) % 26) END,
  pl.price,
  pl.cost_price,
  10,
  true
FROM slot_seed ss
JOIN product_list pl ON pl.rn = ((ss.mrn - 1) * 10 + ss.slot_n - 1) % 12 + 1
ON CONFLICT (machine_id, slot_code) DO NOTHING;

-- ==========================================================================
-- 7. Team members (6). operator_members has no name/email columns (profile_id
--    is a plain uuid, not FK'd to public.profiles/auth.users per the ponytail
--    note in 001_core.sql), so display names live outside this seed's reach.
--    profile_id here is a deterministic placeholder derived from a stable
--    email key, not a real auth user.
-- ==========================================================================

INSERT INTO public.operator_members (operator_id, profile_id, role, status)
SELECT (SELECT id FROM public.operators WHERE slug = 'demo'), md5('demo-team-member:' || v.email)::uuid, v.role, 'active'
FROM (VALUES
  ('alex.johnson@peakvending.example', 'Admin'),
  ('john.martinez@peakvending.example', 'Technician'),
  ('maria.chen@peakvending.example',   'Technician'),
  ('bob.williams@peakvending.example', 'Dispatcher'),
  ('sarah.davis@peakvending.example',  'Manager'),
  ('mike.brown@peakvending.example',   'Viewer')
) AS v(email, role)
ON CONFLICT (operator_id, profile_id) DO NOTHING;

-- ==========================================================================
-- 8. Orders: ~90 days of history across all machines. external_id is always
--    'SEED-' prefixed so it can never collide with 'NYX-' ids the Nayax sync
--    layer inserts later. Small refunded fraction (~4%), payment mix skewed
--    to card, deterministic (no random()) so reruns compute the same rows
--    and ON CONFLICT DO NOTHING keeps them stable.
-- ==========================================================================

WITH demo_op AS (
  SELECT id FROM public.operators WHERE slug = 'demo'
),
machine_list AS (
  SELECT id, machine_code, row_number() OVER (ORDER BY machine_code) AS mrn
  FROM public.machines WHERE operator_id = (SELECT id FROM demo_op)
),
slot_list AS (
  SELECT
    ps.id AS slot_id, ps.machine_id, ps.product_id, ps.price, ps.slot_code,
    row_number() OVER (PARTITION BY ps.machine_id ORDER BY ps.slot_code) AS srn,
    count(*) OVER (PARTITION BY ps.machine_id) AS slot_count
  FROM public.planogram_slots ps
  WHERE ps.operator_id = (SELECT id FROM demo_op)
),
order_seed AS (
  SELECT m.id AS machine_id, m.machine_code, m.mrn, d.day_offset, o.order_n
  FROM machine_list m
  CROSS JOIN generate_series(0, 89) AS d(day_offset)
  CROSS JOIN generate_series(1, 3) AS o(order_n)
  WHERE ((m.mrn * 31 + d.day_offset * 7 + o.order_n) % 5) < 3
),
order_full AS (
  SELECT
    os.*, sl.slot_id, sl.product_id, sl.price, sl.slot_code,
    row_number() OVER (ORDER BY os.machine_code, os.day_offset, os.order_n) AS global_rn
  FROM order_seed os
  JOIN slot_list sl ON sl.machine_id = os.machine_id
    AND sl.srn = ((os.day_offset * 3 + os.order_n) % sl.slot_count) + 1
)
INSERT INTO public.orders (
  operator_id, machine_id, planogram_slot_id, product_id, slot_code,
  amount, payment_method, status, refund_amount, external_id, quantity, ordered_at
)
SELECT
  (SELECT id FROM demo_op),
  of.machine_id, of.slot_id, of.product_id, of.slot_code,
  of.price * (CASE WHEN of.global_rn % 11 = 0 THEN 2 ELSE 1 END),
  CASE
    WHEN of.global_rn % 20 IN (0, 1, 2) THEN 'nfc'
    WHEN of.global_rn % 20 IN (3, 4) THEN 'qr'
    WHEN of.global_rn % 20 IN (5, 6, 7, 8) THEN 'cash'
    ELSE 'card'
  END,
  CASE WHEN of.global_rn % 25 = 0 THEN 'refunded' ELSE 'completed' END,
  CASE WHEN of.global_rn % 25 = 0 THEN of.price ELSE NULL END,
  'SEED-' || of.machine_code || '-' || of.day_offset || '-' || of.order_n,
  CASE WHEN of.global_rn % 11 = 0 THEN 2 ELSE 1 END,
  now() - (of.day_offset || ' days')::interval - (((of.order_n * 5 + of.mrn) % 14 + 8) || ' hours')::interval
FROM order_full of
ON CONFLICT (operator_id, external_id) DO NOTHING;
