# Milestone 02: Locations

## 1. Milestone Title

Location lifecycle, service schedule and commercial configuration.

## 2. Goal

Operators can create and manage physical sites, with reliable contacts, schedule and commercial terms that machines, trips and reports consume.

## 3. Current State

`src/app/locations/page.tsx` imports `src/data/locations.ts`; Add Location is inert. `src/app/locations/[id]/page.tsx` is a copy of Inventory and does not load the requested site. Reuse the list/table style, replace detail content. `public.locations` in `db/001_core.sql` already has address, contacts, working days/hours, commission, tax, service pattern and status. It lacks a location code and structured service recurrence; no location query/action module exists.

## 4. Scope

Create/view/edit/deactivate/reactivate locations; unique code; addresses and contacts; working hours/days; recurrence; notes; commercial terms; history and location-machine links. Minimal tax configuration is owned here, not delayed to M09.

## 5. Out of Scope

No Live Map or embedded map requirement. Machine creation/relocation is M04; trip scheduling M06; commission calculation/reporting M08. No geocoding dependency, automatic route optimization or accounting integration.

## 6. User Workflows

1. Locations -> Add -> code/name/address/contact -> validate -> save -> real detail page.
2. Edit working days and service recurrence -> preview next due date -> save -> history records the change.
3. View Machines tab -> inspect assigned machines; after M04 use Install/Assign to open that milestone's shared machine action.
4. Deactivate -> show blocking active machines/planned stops -> resolve dependencies or cancel -> retain historical records.

## 7. Frontend Requirements

- Use `/locations` and `/locations/[id]`; forms in a drawer or `/locations/create` if needed, with slug-aware links.
- Columns: code/name/address/city/status/machine count/last visit/next due; add revenue only when the shared M07/08 queries exist. Never retain fixture revenue as a fallback.
- Search code/name/address; filter city/status; sort name/next due; paginate per M01.
- Detail tabs: Address, Configuration, Machines, History. Show working hours in trip-readable form; optional structured per-day overrides supplement free text.
- Required name, generated-or-entered code, optional email validation, bounded rates, positive recurrence interval. Missing optional contacts/hours display as unspecified, not sample values.
- Read-only viewers cannot edit; assignment controls reuse M04 permissions. Include loading, empty, filtered-empty, error, conflict and archive confirmation states; keyboard and 390px checks.

## 8. Backend Requirements

`src/server/locations/` exposes `listLocations`, `getLocation`, `createLocation`, `updateLocation`, `setLocationStatus` and `getLocationHistory`. Server Actions delegate with operator context and expected version. Validate linked tax types in the same tenant. Use transaction plus audit for all writes.

Compute next due deterministically in operator timezone using anchor date, interval and allowed weekdays. Daily, weekly, biweekly, monthly and custom recurrence are supported; monthly dates clamp to month end. No-pattern yields null. Use schedule occurrence or last completed visit according to explicit `schedule_basis` (`fixed` default; `after_service` optional). M06 completion updates last-visit fact and recomputes via this service, not a second formula.

Location machine counts query `machines.location_id`; do not maintain an independent count field. Reads of history never join only today's assignment for past events.

## 9. Data Model

Extend `locations`: `location_code`, `version`, optional `location_type`, recurrence interval/unit/anchor/weekdays, schedule basis, effective commercial version and archive timestamps. Add unique `(operator_id, location_code)` and valid-status checks after backfill.

Retain current commission types `none`, `percent`, `flat_monthly`, `per_transaction`. Add effective-dated `location_terms` for changes used by M07/08. Percent applies to net pre-tax sales; monthly flat is per location, not per machine; per-transaction counts successful sales, net of full reversals. M08 owns accruals.

Use `tax_types` and `location_tax_rates` if stacked taxes are enabled; backfill existing `tax_rate` as one legacy component. Effective-dated terms contain the applicable components. Do not add together legacy aggregate and component rates. Machine explicit override is one alternative tax source, not an extra tax.

## 10. Business Rules

Codes remain reserved after deactivation; names need not be unique. Active installed machines require an active location (M04 permits uninstalled drafts without one). Deactivation must block if active machines or nonterminal trip stops reference the site. Historic addresses/terms remain in snapshots when edited. No cascade deletion of operational history. A location can have zero machines. Working hours are informational unless structured enough to validate; do not pretend free text enforces arrival windows.

## 11. Dependencies

M01. Downstream: M04 assigns machines; M06 consumes contacts/schedule and records visits; M08 uses effective terms. Until those are delivered, render honest empty data and disable unavailable deep links.

## 12. Acceptance Criteria

- Create, edit, reload and reopen the correct site; invalid fields are rejected both client and server side.
- Duplicate code is rejected within one operator and allowed in another.
- Two sites display distinct detail content; a foreign site ID returns not found.
- Daily/weekly/month-end recurrence produces predictable next due dates in the operator timezone.
- Deactivation explains blocking machines/stops and does not erase historical transactions.
- When M04 lands, assigning a machine immediately updates both site and machine detail; M06 completion updates last visit.

## 13. Edge Cases

Incomplete address, international postal codes, zero commission, duplicate contact names, archived tax type, 31st-of-month schedules, leap years/DST, two admins editing terms, a machine added during deactivation. Lock/version checks must close the last race.

## 14. Testing Requirements

Unit-test recurrence and term validation. Database-test code uniqueness, tenant-safe foreign keys, term effective dates and deactivate/assignment races. Browser-test list -> create -> edit -> reload -> history, invalid input and permissions. Cross-module acceptance is repeated in M04/M06/M08 with real dependent entities.

## 15. Implementation Notes

[VendSoft location guide](https://help.vendsoft.com/en/articles/6935118-create-a-location) informs site/contact/service setup. Intentional differences: no map; monthly recurrence is explicit; address copying is opt-in. Our four existing commission bases are retained; VendSoft's gross-profit and cash-collected variants are deferred, not silently mapped to percent sales. Do not infer vendor database internals from its help article.
