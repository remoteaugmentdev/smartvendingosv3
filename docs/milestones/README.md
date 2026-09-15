# SmartVendingOS development milestones

This folder is the implementation plan for SmartVendingOS, broken into ten
milestones. Each milestone is a complete functional unit: the frontend, the
backend, the database work and the tests for one area of the product all live in
the same document. There are no separate "frontend" and "backend" milestones.

Each milestone document is written to be handed to a development agent as its
only brief. It states what already exists, what to build, what not to build,
and how to prove it works.

---

## 1. Milestone list and order

The order is driven by data dependency, not by importance. A milestone may only
depend on milestones with a lower number.

| # | File | Functional area |
|---|---|---|
| 01 | [milestone-01-foundation-and-navigation.md](milestone-01-foundation-and-navigation.md) | Tenancy, identity, roles, portable auth, shared UI kit, navigation and route cleanup, audit trail |
| 02 | [milestone-02-locations.md](milestone-02-locations.md) | Locations: create, view, edit, deactivate, contacts, service pattern, commission and tax config |
| 03 | [milestone-03-inventory-and-products.md](milestone-03-inventory-and-products.md) | Product catalogue inside Inventory, warehouse stock, the inventory movement ledger, adjustments, reorder list |
| 04 | [milestone-04-machines-and-planogram.md](milestone-04-machines-and-planogram.md) | Machines, machine configuration, slots and planogram, product assignment, capacity, vend price, machine stock |
| 05 | [milestone-05-purchases-and-suppliers.md](milestone-05-purchases-and-suppliers.md) | Suppliers, purchase recording, case and unit costing, receiving into warehouse stock, purchase history |
| 06 | [milestone-06-routes-and-trips.md](milestone-06-routes-and-trips.md) | Routes and stops, trip planning, service visits, restocking, trip results, cash collection, trip completion |
| 07 | [milestone-07-sales-and-telemetry.md](milestone-07-sales-and-telemetry.md) | Order ingestion, Nayax sync, machine status, DEX inventory reads, alerts, service issues |
| 08 | [milestone-08-financials-and-reporting.md](milestone-08-financials-and-reporting.md) | Expenses, commissions, cash reconciliation, profit and loss, sales reporting, dashboard, CSV export |
| 09 | [milestone-09-team-roles-and-configuration.md](milestone-09-team-roles-and-configuration.md) | Team and user management, role assignment, configuration screens, vehicles, warehouses, product types, tags, custom fields |
| 10 | [milestone-10-subscriptions-and-feature-locking.md](milestone-10-subscriptions-and-feature-locking.md) | Subscription plans, page locks, limit locks, navigation badges, pricing page, operator admin panel |

### Dependency graph

```
01 Foundation
 |
 +--> 02 Locations
 |      |
 +--> 03 Inventory and products
 |      |         |
 |      |         +--> 05 Purchases  (purchases increase warehouse stock)
 |      |
 |      v
 +--> 04 Machines and planogram   (needs 02 for location, 03 for products)
        |
        +--> 06 Routes and trips  (needs 02, 03, 04: a trip services machines
        |                          at locations and moves warehouse stock)
        |
        +--> 07 Sales and telemetry (needs 04 for slots and selection codes,
        |                            03 for the movement ledger)
        |
        v
       08 Financials and reporting (needs 05, 06, 07 for cost, cash and revenue)
        |
       09 Team, roles and configuration (configures entities from 02 to 08)
        |
       10 Subscriptions and feature locking (gates everything above)
```

Milestones 02 and 03 can be built in parallel once 01 is done. Everything else
is sequential.

---

## 2. How the domain fits together

This is the model every milestone document must respect. If a document
contradicts this section, this section wins.

```
Location  1 ----- n  Machine
                       |
                       | planogram
                       v
                   Slot (selection code, capacity, vend price)
                       |
                       | holds
                       v
                   Product  <----- catalogue lives in Inventory
                       ^
                       | same product
                       v
                  Warehouse stock
                    ^        |
    increases       |        |  decreases
                    |        v
                Purchase   Trip restock ---> increases slot quantity
                                                   |
                                                   | sale decreases
                                                   v
                                                 Order
```

In words:

- A **Location** is a physical site. It contains zero or more **Machines**.
- A **Machine** belongs to at most one Location and holds a **planogram**: an
  ordered set of **Slots**. Each slot maps to one **Product**, and carries a
  capacity, a current quantity and a vend price.
- A **Product** is a catalogue entry. It is created and managed inside
  **Inventory**. It is not a top level module.
- **Warehouse stock** is the quantity of a product held in a warehouse, separate
  from the quantity sitting inside machines.
- A **Purchase** brings units in from a supplier and increases warehouse stock.
- A **Trip** services one or more machines. Restocking during a trip moves units
  out of warehouse stock and into slot quantity. It does not create units.
- An **Order** is a sale at a slot. It decreases that slot's quantity.

Two quantity pools exist and only two: warehouse stock and slot quantity. Every
change to either pool goes through the inventory movement ledger defined in
milestone 03. No milestone may write a quantity column directly.

---

## 3. Modules removed from scope

The following are deliberately out of the product. No milestone builds them, and
milestone 01 removes what exists.

| Module | Existing route | Existing nav key | Disposition |
|---|---|---|---|
| Live Map | `src/app/map/page.tsx` | `nav.map` | Removed. Location address data is still stored, but no map module is built. |
| Products as a top level tab | `src/app/products/page.tsx` | `nav.products` | Tab removed. Product creation and management move into Inventory in milestone 03. Product management is NOT removed from the system. |
| Data Center | `src/app/data-center/page.tsx` | `nav.dataCenter` | Removed. Reporting that users still need is rebuilt in milestone 08. |
| AI Insights | `src/app/insights/` and its three child routes | `nav.insights` | Removed entirely, including forecast, anomalies and recommendations. |
| Promotion Alert | `src/app/promotions/page.tsx` | `nav.promotions` | Removed. The `campaigns`, `campaign_targets` and `loyalty_*` tables from `db/004_growth.sql` become unused; milestone 01 specifies how they are handled. |

Milestone 01 is responsible for making every removal safe: routes, navigation
state, locale keys, icon imports, dashboard links, permission maps and any
cross references elsewhere in the app.

---

## 4. Navigation after cleanup

Fourteen items remain, in this order:

```
Dashboard
Machines
Locations
Inventory        <- product management lives here
Routes
Trips
Purchases
Orders
Expenses
Alerts
Team
Users
Configuration
Profile
```

---

## 5. VendSoft as a reference, and where we differ

VendSoft is used as a **functional and workflow reference only**. We do not copy
its UI, its wording, its database structure or its implementation. For each
referenced area we understood the operation, identified the business rules, then
adapted the workflow to this product's architecture and design system.

Every intentional difference is recorded in the relevant milestone under
"Differences from the VendSoft reference". The differences decided up front:

| Area | VendSoft behaviour | Our behaviour | Reason |
|---|---|---|---|
| Product initial stock | A product can be given an opening quantity at creation, and the help text warns users not to also record a purchase for the same stock or the quantity doubles | Opening stock is a first class ledger movement of type `opening_balance`, recorded once per product, and the UI blocks a second opening balance | A warning in a help article is not a control. The ledger makes double counting structurally impossible |
| Quantity changes | Several screens write stock directly | All quantity changes are ledger movements, written by one function inside one transaction | Single writer, auditable, reversible |
| Product deletion | Blocked when installed in a machine, otherwise deleted while history remains | Products are archived, never deleted, and archiving is blocked while any slot references them | "Delete" that keeps history is really archive. We name it accurately |
| Machine deletion | Called Delete, behaves as a hide with sales history retained | Called Retire, with an explicit retired status | Same reason |
| Service pattern | Daily and weekly only; monthly must be faked | Daily, weekly, biweekly, monthly and custom | The existing `locations.service_pattern` check constraint already supports these |
| Address entry | New locations pre-fill city, state, zip and country from the last created location silently | Pre-fill is offered behind an explicit "same as last location" action | Silent pre-fill produces wrong addresses when an operator expands to a new area |
| Tax rates | Every configured tax type must be filled, with 0 entered explicitly for the ones that do not apply | Blank means not applicable | Removes a per record chore with no information gain |
| Variety pack cost | Pack cost split evenly across every item in the pack | Split by each item's share of the pack's list value, with even split available as an option | Even split misstates margin when a pack mixes cheap and expensive items |
| Trip lifecycle | Not documented: no stated rules for editing, deleting or locking a trip | Explicit states: created, posted, completed, cancelled, with defined transitions and a lock point | An undefined lifecycle is where inventory corruption happens |
| Excel export | Export Excel | Export CSV | A spreadsheet writer is a dependency for no user visible gain |
| Codes | Product, machine and location codes auto number when left blank, with no stated scope | Codes auto number per operator, and the scope is stated in each milestone | Multi tenant system, the scope cannot be left ambiguous |

---

## 6. Conventions every milestone must follow

These come from the existing codebase. A milestone document that proposes
something different is wrong unless it says why.

**Architecture.** One Next.js 16 App Router application, one PostgreSQL database
per deployment. There is no separate API server and no REST layer between the
pages and the database. Server Components query Postgres in process. Writes are
Server Actions in a sibling `actions.ts`. Route handlers under `src/app/api/`
exist only for things that are not a page interaction: authentication, the leads
funnel, scheduled sync, and file export.

**Backend layers.**

```
db/NNN_*.sql              schema, append only, applied by scripts/db-migrate.mjs
src/server/<domain>/      query modules, operatorId is always the first argument
src/server/nayax/         the telemetry provider interface and its drivers
src/app/**/page.tsx       async Server Components that call src/server/*
src/app/**/actions.ts     'use server' writes
```

**Migrations are append only.** Once a file is recorded in `schema_migrations`
it is immutable. Corrections ship as a new numbered file. Files `001` through
`007` are already applied to a live database. New work starts at `008`.

**Tenancy.** Every table carries `operator_id`. There is no Postgres row level
security, because the app connects through a single pooled role with no
`auth.uid()`. Scoping is enforced in the query layer at one chokepoint,
`requireOperator()` in `src/server/operator.ts`. Every query module takes
`operatorId` as its first argument and never reaches for the session itself.

**Roles.** The `operator_members.role` check constraint defines the vocabulary:
`Admin`, `Manager`, `Dispatcher`, `Technician`, `Viewer`. A separate `master`
role exists in the session payload for the operator admin panel and is not an
operator role.

**Money and quantities.** Money is `numeric(12,2)`. Quantities are integers in
single units, never cases. Cases are a data entry convenience that is converted
to units before anything is stored.

**No new dependencies.** Raw `pg`, no ORM. Reuse what is installed before
reaching for anything new.

**Writing style for these documents.** No em dashes. Field names in backticks.
Every acceptance criterion testable by a person with the app open.

---

## 7. Document template

Every milestone file has these fifteen sections, in this order, with these exact
headings:

1. Milestone Title
2. Goal
3. Current State
4. Scope
5. Out of Scope
6. User Workflows
7. Frontend Requirements
8. Backend Requirements
9. Data Model
10. Business Rules
11. Dependencies
12. Acceptance Criteria
13. Edge Cases
14. Testing Requirements
15. Implementation Notes

Where a milestone adapts a VendSoft workflow it also carries a
"Differences from the VendSoft reference" subsection inside section 15.

---

## 8. Status

These documents are specifications. No implementation has started against them.
`docs/SYSTEM_OVERVIEW.md` remains the higher level description of the system for
non implementers, and predates the scope reduction in section 3 above. Where the
two disagree, the milestones are current.
