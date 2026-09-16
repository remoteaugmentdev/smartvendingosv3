# Milestone 05: Purchases and suppliers

## 1. Milestone Title

Supplier management, purchase recording, receiving and cost history.

## 2. Goal

A purchase can be drafted and received exactly once into warehouse stock, with auditable cost and corrections that do not damage later inventory or reports.

## 3. Current State

`src/app/purchases/page.tsx` displays local sample records. `purchases/create/page.tsx` calculates local lines from hardcoded product/supplier options; Save & Receive navigates without writing. Existing `suppliers`, `purchases` and `purchase_items` in `db/001_core.sql` and `003_operations.sql` can be extended. Header tax/shipping/notes, receipt state history, case snapshots and correction links are missing. Reuse the form/table layout and M03 stock writer.

## 4. Scope

Supplier CRUD/archive, purchase list/detail/create/edit, units/cases, tax/shipping, draft/receive/cancel states, stock receipt, duplicate warnings, variety packs for purchasing, reorder prefill and purchase correction history. Supplier and pack setup is usable here; M09 Configuration reuses it.

## 5. Out of Scope

No payment to suppliers or supplier email sending, external accounting, receipt attachments or customer promotional bundles. Partial receiving and accounts payable are deferred; use separate purchase records per received shipment. Purchase financial settlement recording belongs to M08.

## 6. User Workflows

1. Reorder selected products -> Create Purchase -> supplier, date, destination warehouse -> edit proposed quantities/costs -> save pending.
2. Add Supplier inline if absent; return to the same unsaved purchase.
3. Enter cases or units; preview normalized units/cost/subtotal/tax/shipping -> Save & Receive -> stock/value and last cost update once.
4. Pending purchase -> edit/cancel; received purchase -> inspect receipt and choose correction workflow, never overwrite posted quantities.
5. Add purchasing variety pack -> preview component quantities and cost allocation -> save expanded line snapshots.

## 7. Frontend Requirements

Routes `/purchases`, `/purchases/create`, proposed `/purchases/[id]` and sibling actions. Header shows date, invoice, supplier, destination, notes and status. Lines show product, case-size snapshot, cases, loose units, total units, case cost/unit cost and total. Choose one cost-entry mode at a time; explain conversions rather than accepting conflicting values.

List filter supplier/status/date/warehouse, search invoice, sort/paginate. Detail shows immutable receipt, linked movement and correction chain. Duplicate supplier/invoice/warehouse warning must require an explicit override reason, not quietly create a second receipt. Old source-opening warning from M03 is visible on relevant products.

M01 states/validation apply; Admin/Manager create/receive, Admin authorizes reversals, Technician and Viewer cannot purchase. On mobile, lines become stacked editable rows with a persistent total. Export reuses the shared CSV serializer introduced in M04; do not add a second one.

## 8. Backend Requirements

`src/server/purchases/` exposes list/detail, save pending, receive, cancel pending and reverse receipt; `src/server/suppliers/` owns supplier/pack reference data. Receive locks header plus affected stock rows, verifies pending status and current versions, records M03 receipt movements and audit, sets received metadata and commits atomically.

Normalize quantity = cases × units_per_case + loose units. Unit cost = case cost / units_per_case in case mode. Subtotal = sum(normalized quantity × unit cost). Header total = subtotal + purchase tax + shipping. Carry tax/shipping as separate financial amounts, excluded from stock value in this initial policy. Preserve decimal unit cost precision; round line/currency totals consistently. Receiving does not itself imply invoice payment.

Received records are immutable. A full reversal is allowed only if remaining warehouse stock and value can support the original quantity/value reversal without breaking reservations or later valuation. Otherwise refuse and require an explicit quantity/value correction document with a reason and current carrying value; past sales retain their original COGS. Corrections are new linked operations. Pure cost adjustments require an explicit value-only ledger operation; never change quantity as a workaround.

## 9. Data Model

Extend `purchases`: purchase code, tax, shipping, notes, received time/by, version, reversed/correction references. Preserve pending/received/cancelled status; add `reversed` with a new constraint if full reversal is implemented. Extend items: case-size/case-count snapshots, product code/name snapshot, line total, precision unit cost. Supplier becomes required for new purchases; archive with history retained.

Add `variety_pack_items` referencing an existing `products.is_variety_pack` parent and component products, with positive integer counts and explicit component cost allocations. A pack has no independent physical balance when expanded; reject nested/cyclic packs. Existing growth tables are not used. Pack updates never change posted purchase lines.

## 10. Business Rules

Pending does not increase physical stock. Received increments stock once. Cancel pending releases expected inbound only. Reversals never delete receipt history. Product/warehouse/supplier must be active and same tenant at posting. Duplicate product lines are normalized or rejected consistently. No negative quantities/costs; zero-cost goods are valid. Invoice is optional, but source references and override reasons improve duplicate detection. Source-operation idempotency cannot detect independently entered duplicate real-world shipments without those checks.

## 11. Dependencies

M01 and M03; sequence follows M04. M06 consumes the received stock. M08 adds cash-payment tracking and reporting. M09 embeds Supplier/Variety Pack controls from this milestone.

## 12. Acceptance Criteria

- Purchase saved pending persists and changes no stock. Receiving twice yields one receipt operation.
- Two cases of 12 at 6.00/case produce 24 units at 0.50; with tax 1.00 and shipping 2.00 header total is 15.00, stock value 12.00.
- Header/lines/stock all roll back if any line is invalid or another tenant's product is submitted.
- Case-size changes on the product do not alter old purchases. A pack expands once and component costs sum to the pack purchase cost.
- Reversal is safe, linked and explicit; it refuses a case where subsequent consumption prevents reversal.
- Reorder prefill removes selected quantities from pending-inbound demand without claiming they are already received.

## 13. Edge Cases

Fractional case cost, zero-cost stock, case size missing/zero, same invoice with legitimate split shipments, empty lines, archived supplier, two concurrent receives, partially consumed original receipt, expense posted for the same invoice, late cost correction. Warn about duplicate financial recording in M08.

## 14. Testing Requirements

Unit-test conversions and rounding; database-test receive races/idempotency, pack expansion totals, reversal restrictions and foreign IDs; workflow-test draft -> reload -> receive -> warehouse history -> correction. M08 validates separate receipt versus payment dates. Tests run against isolated DB fixtures with known costs.

## 15. Implementation Notes

[VendSoft purchase guide](https://help.vendsoft.com/en/articles/6941368-record-purchases) informs supplier/date/item entry and case conversion. Differences: explicit pending/received state and immutable corrections; tax/shipping excluded from inventory carrying value by stated initial policy. Variety pack cost is explicitly assigned across components, defaulting to even per-unit allocation with a rounding residual on the final component. Never infer vendor transaction semantics from its UI documentation.
