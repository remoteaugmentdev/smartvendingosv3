# Milestone 06: Routes and trips

## 1. Milestone Title

Route planning, trip stock allocation, service execution and reconciliation.

## 2. Goal

An operator plans and assigns a trip, loads a van, services machines, records cash/meters and closes the trip with no unaccounted stock or duplicate financial events.

## 3. Current State

Routes list edits `ldaRoutes` locally. `routes/[id]/page.tsx` incorrectly contains report cards. Trip create and detail are identical forms, and Save only navigates. Reuse route stop UI and `src/components/map/RouteMap.tsx` where useful; it is not the excluded Live Map. Existing tables: routes/stops, trips/stops/slot entries, cash collections, vehicles and warehouses. Driver fields are free text; trips lack service date/code, reservations, waste/correction fields and full result semantics.

## 4. Scope

Routes CRUD/ordered stops, location/machine selection, real member assignment, vehicles, trip schedule/lifecycle, notes, deduplication, stock reservations, van loading/returns, service results and meters, wastage, cash collection, pick/service sheets, duplicate/requeue and completion. Responsive browser execution covers field work; no separate `/mobile` application here.

## 5. Out of Scope

No Live Map/GPS tracking, automated route optimization, external directions engine, offline sync or native/PWA app. Embedded route map is optional and must have an accessible stop-list alternative. Service issues are M07; sales ingestion M07; bank reconciliation and mileage reporting M08. No fake Optimize success button.

## 6. User Workflows

1. Routes -> create/name/driver/frequency -> add machines or locations -> order stops -> save -> Create Trip snapshots route.
2. Trip create -> date/driver/vehicle -> add locations, machines or route -> deduplicate machine IDs -> set notes and planned fills -> save Created.
3. Check availability -> reserve stock -> load selected quantities from supply warehouse into van warehouse -> Post/Start.
4. For each stop: verify assigned machine -> record physical count/waste/refill and meter/cash information -> preview -> commit stop once.
5. Skip a stop with reason or finish remaining stops -> return unused stock or explicitly retain it in the van -> close reservations -> Complete.
6. Duplicate trip creates a new Created draft with schedule/stops only, no collections, stock moves, results or timestamps.

## 7. Frontend Requirements

Use `/routes`, `/routes/[id]`, `/trips`, `/trips/create`, `/trips/[id]`; replace incorrect detail pages. Stops grouped by location with contacts/address/hours, editable ordering and per-machine instructions. Route-derived membership is shown but posted trip snapshots remain stable when a route changes.

Trip results distinguish: system starting count, observed pre-service count, confirmed sold units (manual machines only), wastage, units added, final count, cash removed, coins added to float, cash paid refunds, reported card totals and optional meter readings. Do not label all these values Current Count. Show inconsistencies before posting, including expected versus actual counts.

List supports date/driver/status/route/location filters and server pagination. Forms preserve drafts on errors. Per-stop and trip-level confirmations name stock/cash consequences. Pick list aggregates actual planned units by product; service sheet includes slots and contact notes. Print uses browser print, CSV M08. Technician sees only assigned trips/machines and permitted cost-free fields; Dispatcher manages schedules but cannot grant themselves stock-adjustment authority. M01 loading/empty/error states and 390px usability apply.

## 8. Backend Requirements

`src/server/routes/` owns routes/stops; `src/server/trips/` owns lifecycle/results; shared `src/server/vehicles/` provides minimal create/edit/assign needed now. All actions resolve permission plus assignment, then transact.

States: Created permits edit/reserve/cancel; Posted permits results/skip/returns, not wholesale stop replacement; Completed is read-only; Cancelled is read-only. Cancelling a posted trip requires resolution of loaded stock/reservations and explicit acknowledgement of already committed stops. Cancellation does not erase visits or collections. Completed corrections are separate authorized operations, not reopening and reposting the trip.

Reservation amounts are positive and must not exceed available supply stock. Loading transfers supply -> van through M03; the allocation changes source from supply to van in the same transaction, so available stock remains protected for that trip. Restock transfers van -> slot and consumes matching allocation; do not also subtract supply stock. Direct warehouse -> slot service is an explicit alternative with exactly one source. Returns transfer van -> supply and release allocation. Trip completion allows retained van stock only with an acknowledged balance and no dangling trip reservation.

Lock stop + slot + balances on service commit; check expected slot version and operation key. Count difference is classified into confirmed sale, wastage or unexplained adjustment. Pre-refill count = baseline - confirmed sold - waste + unexplained delta; final = observed pre-refill + added. M03 records each effect once. Store raw observations, resulting operations and financial amounts atomically with completed stop. If telemetry changed the slot after form load, require refresh/reconciliation rather than overwriting.

Manual confirmed sales produce `service_sales` source events (defined below) for M07 ingestion. M06 already posts their stock outflow; M07 creates orders referencing the existing movement, never a second decrement. Cash collection is a custody transfer, not sales. Reported card/meter totals are evidence for comparison, never another sale when telemetry orders cover that period.

## 9. Data Model

Extend routes/trips with driver member FK and name snapshot; keep legacy technician text during backfill. Routes have description/schedule. Trip adds unique tenant trip code, service date, source/van warehouse, driver, vehicle, currency, version, planned/actual distance and distance unit.

`machines.route_id` is the current primary route projection; `route_stops` is canonical membership with one active primary route per machine in this initial design. Changes update both atomically. Trips snapshot stops independently.

Extend trip stops with unique `(trip_id,machine_id)`, location/address snapshot, notes, version, skip/completion reason. Extend slot entries with product/price/cost snapshot, observed count, waste, confirmed sold, added/final, meter samples/reset reason and linked operation IDs.

Add `stock_reservations`: tenant, trip, product, source warehouse, quantity, consumed/released state, operation reference. Extend vehicles with make/model/year/member assignment; van warehouse remains an ordinary warehouse.

Add `service_sales`: tenant, stop/slot/product, coverage interval, units, price/tax/cost snapshots, confirmed status, stock operation ID, ingestion state. M07 owns conversion to order records. Extend cash collections with idempotency/source key, currency, member and separate float/refund/card-report evidence. Monetary evidence is not an automatic revenue entry.

## 10. Business Rules

Machine appears once per trip even if selected through multiple locations/routes. Planning requires active installed machines and valid same-tenant drivers. Trip snapshots survive route edits. Capacity/stock validations run at posting time. Overlapping manual sales coverage is blocked; telemetry-covered periods cannot be confirmed as manual sales without a reviewed reconciliation. Meter decreases require an explicit reset baseline/reason. No negative inventory, unclassified shrinkage masquerading as sale, or duplicated collections. Completion requires every stop complete/skipped and stock accounted for.

## 11. Dependencies

M01 provisioned members, M02 sites/schedule, M03 stock writer/warehouses, M04 machines/slots, M05 replenishment. M07 consumes service-sales events and supplies service issues; M08 consumes cash/mileage/visit snapshots. M09 reuses member/vehicle controls, never introduces a late prerequisite.

## 12. Acceptance Criteria

- Add a location and the same machine separately -> one stop. Saved trips reload correct driver/date/order.
- Reserve 10 from warehouse 30 -> physical 30, allocated 10, available 20. Load 10 -> supply 20, van 10. Restock 6 -> van 4, slot +6. Return 4 -> supply 24, van 0; total units remain 30 plus preexisting machine stock.
- Double stop submission produces one set of movements and one collection. Requeue contains no posted results.
- Technician cannot access another driver's trip or edit price. Concurrent stock changes create a conflict.
- Manual confirmed sales retain a stock-operation link for M07; cash/meter reporting does not independently increase revenue.
- Cancel/complete leaves no active reservation and preserves committed history; last-visit/next-due updates agree with M02.

## 13. Edge Cases

Absent driver, vehicle in maintenance, warehouse shortage, skipped stop, machine relocated after schedule, offline manual count, meter reset/rollover, loss in van, changed slot product, concurrent restock/sale, mid-trip cancellation, DST scheduling, duplicate submit after timeout. Require a reason for every correction and an explicit replan when assignment changed.

## 14. Testing Requirements

Unit-test lifecycle, scheduling and pick aggregation. Integration-test reservation races, stock conservation, atomic stop/cash writes, cancellation and duplicate recovery. Browser-test route -> trip -> reserve/load -> service/skip -> return -> complete -> duplicate at desktop and 390px. Cross-module tests assert location last-visit, slot quantities and warehouse availability agree.

## 15. Implementation Notes

[VendSoft trip guide](https://help.vendsoft.com/en/articles/6940971-create-a-trip) informs driver/date setup and selecting locations, routes or machines. Differences: explicit stock allocation/return and correction lifecycle; map optional, no dedicated Live Map; manual route ordering; responsive existing routes rather than a separate mobile app. Stock formulas and lifecycle are our design, not claims about VendSoft internals.
