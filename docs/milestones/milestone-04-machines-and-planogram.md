# Milestone 04: Machines and planogram

## 1. Milestone Title

Machine lifecycle, location assignment, slot configuration and operational stock.

## 2. Goal

Create a machine, assign it to a location, configure its real slots and load it from a warehouse with consistent inventory across all views.

## 3. Current State

`src/app/machines/page.tsx` reads `ldaMachines` and toggles status in local state. Detail reads `ldaMachines`, `ldaSlots`, `ldaOrders`, `ldaAlerts`; buttons for edit/save/decommission are inert and energy/service history is hardcoded. Reuse visual planogram and tabs, not fixture calculations. `machines` and `planogram_slots` already contain most configuration fields, but machine code is not separate from serial, lifecycle is conflated with online status, and meter flags/history are absent. Orders/alerts will be wired in M07.

## 4. Scope

Machine CRUD, draft/install/retire lifecycle, location assignment/history, cabinet/row/slot configuration, product assignment, capacity/prices, manual stock via M03, meter settings, operational history and truthful capability states. Table/card views, batch editing, copy configuration and CSV planogram export.

## 5. Out of Scope

No Live Map. No remote hardware commands, energy measurements or control without a verified provider capability. No coffee recipes/bulk fractional dispensing. Live telemetry, order ingest and issues belong to M07; route scheduling and visits M06; full reporting M08.

## 6. User Workflows

1. Machines -> Add -> basic identity/hardware -> save draft -> assign active location -> configure planogram -> activate.
2. Slot -> choose active Inventory product -> capacity/price/reorder/selection code -> save configuration without creating stock.
3. Restock -> select source warehouse -> enter added units or fill-to-capacity preview -> confirm M03 transfer -> refreshed machine and Inventory balances.
4. Relocate -> check planned visits -> confirm effective assignment -> preserve historical location references.
5. Retire -> settle stock and open visits -> confirm -> hidden from active fleet, history remains.

## 7. Frontend Requirements

Use `/machines`, `/machines/[id]` with general/planogram/orders/maintenance/settings/history. Energy tab is capability-gated and must show unavailable, never synthetic readings. Remove View on Map. Schedule Trip links activate in M06 with selected machine ID. Orders/maintenance use explicit not-yet-available states until M07.

Forms include generated-or-entered code, name/description, type, make/model, serial, year, payment flags, telemetry provider/device, cabinets, installation dates, low-stock threshold, offline delay, currency/tax, notes and meter tracking flags. Distinguish operational lifecycle from observed connectivity; no manual online toggle.

Slot grid supports cabinet/row filters, product picker, quantity/capacity, price, expiry, enabled state, selection code, reorder, last restock and history. Quantity is an explicit adjustment/restock dialog, not an ordinary metadata input. Batch/copy preview identifies all affected slots; unsaved changes are guarded. Hidden columns/card view persist as presentation preferences. Search by code/name/location, filter location/type/route/status and use M01 list states. Technicians see assigned operational stock but cannot edit planogram/prices/capacities. CSV planogram export ships here by introducing the shared CSV serializer (with formula-injection escaping) that M05 and M08 then reuse; M08 extends it, never forks a second one.

## 8. Backend Requirements

`src/server/machines/` reads/writes identity and assignments; `src/server/planogram/` manages slots. Server Actions delegate to these services with expected version, capability and tenant IDs. Every stock action calls M03's writer with source/destination and idempotency key.

Copy configuration copies layout/product/price/capacity, NEVER quantity, meter readings, external device IDs or sales. Target nonempty slots cannot change product or shrink below quantity. Batch validates all entries then commits once. Enforce same-tenant location/product and uniqueness of machine code, slot label and non-null selection code per machine.

Install/relocate uses a transaction that checks the location is active and reconciles route assignments/planned trip stops. Before M06, protect any existing nonterminal seeded stops. Historical records retain location snapshot/effective assignment rather than using today's `location_id` for previous sales.

Machine fill = sum quantities / sum capacities of enabled assigned slots, with 0/undefined safely shown when capacity is zero; display total physical stock separately if disabled slots retain stock. Low stock uses slot threshold first, machine threshold as fallback. History is read from audit/movements plus service events once available, not duplicated tables for each UI tab.

## 9. Data Model

Extend `machines`: serial number, lifecycle (`draft`,`active`,`retired`), meter tracking flags, last meter baseline/reset metadata, version and retirement time. Existing `status` remains observed connectivity. Add `machine_location_history` with tenant, machine/location IDs and effective times. Keep `location_id` as current assignment projection.

Extend slots with version/carrying value from M03, restocked member FK (retain old name as snapshot), optional archive timestamp. Keep existing slot cost as display fallback, never historical COGS. Add `planogram_assignment_history` with slot/selection/product and effective timestamps, retaining old mappings for late M07 events; ambiguous mappings go to review. Add DB nonnegative/capacity constraints and unique selection mapping. Meter samples are recorded per service in M06, not overwritten as historyless settings.

## 10. Business Rules

An active installed machine has exactly one active location; draft uninstalled machines may have none. Retired machines accept late historical telemetry but no new stock/configuration operations except approved corrections. Codes/device mapping remain reserved. Changing product requires zero quantity and no conflicting reservations/posted trip entries. Fill All is a stock transfer that can fail for shortage; it never sets quantity for free. Disabled slots remain included in total physical inventory, but are excluded from new planned fills. Currency defaults to operator currency; cross-currency aggregation waits for M08 and must never silently sum unlike currencies.

## 11. Dependencies

M01, M02, M03. M06 adds route selection and trip actions; M07 fills orders/issues/connectivity with real provider data; M08 fills financial charts from shared queries. No need to wait for full Configuration UI in M09 to configure a machine.

## 12. Acceptance Criteria

- Machine and two configured slots survive refresh; location Machines tab and fleet list agree.
- Load 6 units from a 20-unit warehouse -> 14 warehouse + 6 slot; aggregate units unchanged. Fill All with inadequate stock changes neither endpoint.
- Capacity below stock, duplicate selection and foreign product/location are rejected by direct action calls too.
- Copying a planogram to an empty target copies structure only. Batch failure leaves all target slots unchanged.
- Relocation preserves prior sales/location history; retirement blocks unsettled stock/visits and keeps historical detail accessible.
- No fabricated energy/status data or broken excluded-route links remain in this surface.

## 13. Edge Cases

Zero slots, multiple cabinets, unknown selection, duplicate serials from different vendors, stock in disabled slots, expired products, changing location mid-trip, stale batch edits, late transactions after product reassignment, machine type change with existing layout. Block destructive reassignment when dependent work cannot be reconciled.

## 14. Testing Requirements

Database/API tests for lifecycle and tenant constraints, copy/batch rollback, source stock race and location-history preservation. Browser-test create -> location -> configure -> load -> reload -> copy -> retire. Cross-view checks compare Inventory, fleet fill and location detail. Verify view-only and assignment-limited roles with direct action requests.

## 15. Implementation Notes

[VendSoft machine guide](https://help.vendsoft.com/en/articles/6939377-create-view-or-edit-a-machine) informs basic setup followed by planogram and meter options. Differences: separate lifecycle/connectivity, explicit source-stock transfers, copy-without-quantity and retire terminology. Keep existing type vocabulary; unsupported machine behaviors require a separately scoped extension.
