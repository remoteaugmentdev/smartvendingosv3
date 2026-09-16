# Milestone 03: Inventory and products

## 1. Milestone Title

Product catalog within Inventory, warehouses, stock movement ledger and reorder workflow.

## 2. Goal

Maintain one product catalog and auditable physical stock balances, with a single transactional stock writer reused by purchases, machines, trips and sales.

## 3. Current State

`src/app/inventory/page.tsx` is a fixture-backed machine-shortage screen; `inventory/shortage/page.tsx` provides reusable shortage sheets. `src/app/products/page.tsx` has product/category form UI but Save only gives feedback. Existing tables: `products`, `product_types`, `tags`, `product_tags`, `warehouses`, `warehouse_stock`, `planogram_slots`. Product `upc` mixes barcode/code; no movement ledger, reservations, valuation history or persisted stock actions exist.

## 4. Scope

Inventory Products/Reorder/Warehouses/Machine Stock views; product CRUD/archive, category/tag creation, warehouse CRUD including van warehouses, opening stock, receipts without invoices, transfers, adjustments/counts, valuation, reorder suggestions and movement history. Product/category forms reuse existing styles under Inventory. Minimal reference-data UI is completed here and reused by Configuration in M09.

## 5. Out of Scope

No top-level Products page, master product catalog service, machine lifecycle, receipt through purchase documents (M05), trip allocation (M06) or telemetry ingestion (M07). No third stock pool for vans: a van is a warehouse. Variety pack composition is M05. Full lot/expiry accounting is deferred; slot expiry is supported in M04.

## 6. User Workflows

1. Inventory -> Products -> Add -> identify product/type/barcode/case size -> choose no opening stock OR a specific warehouse opening balance -> save.
2. Product -> Edit metadata; quantity changes use Adjust Stock with reason and preview, never the metadata form.
3. Warehouses -> select site/product -> count/receipt/damage/transfer -> review changes -> confirm -> refreshed balances and movement history.
4. Reorder -> select shortages -> M05 Create Purchase prefill; before M05 export a proposed list without recording a purchase.
5. Archive product -> resolve slot/stock/reservation dependencies -> retain sales and purchasing history.

## 7. Frontend Requirements

Canonical `/inventory?tab=products|reorder|warehouses|machines`; `/inventory/shortage` remains machine shortage, distinct from warehouse reorder. Product detail/history can use `/inventory/products/[id]`. All former `/products` links target Inventory.

Products show SKU, name, type/tags, barcode, default price, last/average cost, warehouse units, machine units, reorder/target and status. Forms include description, units per case, min/max, optional image URL; no fake upload. Warehouses show physical, allocated and available separately. Search/filter/status/sort/pagination and M01 states apply.

Adjustment drawer distinguishes delta receipt/damage from absolute physical count; it shows old/new quantities, reason, warehouse, cost and operation summary. Disable repeat clicks but rely on server idempotency too. Cost data is hidden from Technicians; Admin/Manager manage stock, while assigned field restocks use M06. Archived products are selectable only in historical filters. Show conflicts without discarding entered counts.

## 8. Backend Requirements

`src/server/inventory/` owns read summaries and `recordMovement(client, ctx, input)`; all future stock writers call it within the caller's transaction. Inputs include stable operation key, product, source/destination typed references, units or absolute count plus expected version, reason, event/recorded times, actor/source and value. Enforce same-tenant IDs and product identity for every endpoint.

Lock affected balances in stable ID order, validate quantities/capacity/reservations, insert immutable movement lines, update quantity/value projections and audit on the same PoolClient. Unique `(operator_id, operation_key)` stores payload hash/result: same key+same payload returns original result; different payload is conflict. Transaction failure leaves neither movement nor balance change.

Two physical balance types: warehouse/product and machine/slot. Reservations are a claim on warehouse stock, not physical stock. Stock conservation: transfers sum to zero units/value across both endpoints. Opening, supplier receipt, physical loss, sale and reconciliation explain net changes. Existing balances are imported as one migration opening per balance, without adding the quantity a second time. The ledger also supports authorized value-only corrections with zero quantity and an explicit source/reason; they cannot change previously issued COGS. Reject any correction that would make carrying value negative, and require zero value for an empty balance.

Use weighted average per balance: receipt new value = old value + receipt quantity × receipt unit cost; average = value/quantity for positive balances. Transfers carry source average, not today's product default. Outflows remove carrying value; when emptied value is exactly zero. Use SQL decimal precision for valuation and round currency totals at presentation/posting boundaries. M07 snapshots actual issued COGS. Catalog cost is a default, never a retroactive rewrite.

## 9. Data Model

- Extend `products`: separate unique tenant `product_code`; keep `upc` as barcode; last cost, archive/version; preserve active, type/tags, case size, reorder/target, min/max and price fields.
- Extend `warehouse_stock`: version and carrying value; unique existing warehouse/product key. Slot carrying value/version is introduced here so M04/M07 share it.
- Extend warehouses with type (`fixed`/`van`), active, contact/storage notes; prohibit deletion with balances.
- Add `inventory_operations` (operation key, hash, type, source entity, reversal reference, actor, times) and `inventory_movements` (operation, product, endpoint, signed quantity/value, before/after, reason). Tenant-scoped FKs and indexes by product/endpoint/time.
- M06 owns `stock_reservations`; the writer contract reserves an availability hook now. Do not create trip UI here.

## 10. Business Rules

- All physical quantities are nonnegative integer single units. `units_per_case` is a positive integer if supplied; metadata edits never rescale existing stock.
- Opening stock is allowed once per product/warehouse balance, only before transactional activity. An opening key prevents duplicate submission, but cannot detect the same real shipment entered later as a new purchase: require explicit source attestation and show potential duplicates. Do not claim this is structurally impossible.
- Warehouse reorder uses available warehouse stock, not units already in machines: `available = physical - active reservations`; below threshold when available < reorder point. Suggested order = max(0, target - available - pending inbound), target defaults to reorder point. Aggregate only selected active supply warehouses; show which ones.
- Machine restock demand is separate: max(0, capacity - quantity) per enabled assigned slot. Shortage does not itself authorize movement.
- Archive blocks nonzero stock, slot assignments and reservations; maintain historical references and unique codes.
- Count below reservations requires explicit reservation replanning/cancellation, never silent negative availability. Backdated counts record observation time but do not silently rewrite later history; ambiguous chronology is a conflict.

## 11. Dependencies

M01. Uses existing machine/slot schema for balance compatibility without requiring M04 UI. M04 owns slot setup, M05 receipts, M06 reservations/transfers, M07 sales and DEX reconciliation, M08 valuation reporting. These depend on this writer contract.

## 12. Acceptance Criteria

- Product created from Inventory persists with metadata and exactly one optional opening operation.
- Example: open 10 units at 1.00; receive 10 at 2.00 -> 20 units, value 30.00, average 1.50. Transfer 4 -> source 16/value 24.00; destination 4/value 6.00; total unchanged.
- Repeating an operation changes nothing; simultaneous attempts to consume the same last units cannot both succeed.
- Metadata changes do not alter stock/value; stock history explains each balance.
- Reorder and machine shortage use distinct formulas and link to the correct future workflow.
- Archive retains history and refuses unresolved stock/slot dependencies; cross-tenant operations fail.

## 13. Edge Cases

Zero-cost goods, barcode leading zeros, duplicate barcode with distinct SKU, decimal quantities, missing source cost, new warehouse balance, same source/destination, multi-slot transfers, damaged reserved stock, stale count, unknown legacy value. Unknown historical cost is flagged rather than invented.

## 14. Testing Requirements

Unit-test quantities, reorder and valuation formulas. Integration-test double submit, two concurrent outflows, multi-line rollback, migration opening without quantity inflation, tenant boundaries and archive restrictions. Browser-test product -> warehouse opening -> count -> transfer -> refresh -> history. M05/06/07 must test their operations through this writer, not mock away stock effects.

## 15. Implementation Notes

[VendSoft inventory guide](https://help.vendsoft.com/en/articles/6933480-add-and-manage-products-in-inventory) informs SKU/category/case setup, opening stock and warehouse reorder. Differences: ledger-backed balance changes, explicit warehouse-scoped opening, archive terminology and reserved/inbound-aware reorder. Remove sample imports only after all consumers are converted or explicitly isolated as demo fixtures.
