# SmartVendingOS: System Overview and Build Plan

**Purpose:** Define what we are building and in what order, so development is systematic and nothing is built twice or wrong.
**Status:** Interface complete on sample data. Database schema live. Backend in build.
**Audience:** Project management review and approval.

---

## 1. What the system is

SmartVendingOS is a vending machine management platform sold as software to vending operators.

A vending operator is a company that owns vending machines placed inside other people's buildings: offices, hospitals, factories, transit hubs, gyms. They earn the spread between what a snack costs them and what it sells for, minus the cost of driving a van to every machine.

Their problem is that they are blind:

- They do not know a machine is empty until a customer complains or a driver arrives to find it empty.
- They do not know a machine is offline until the revenue stops.
- They plan restock routes from memory, so drivers visit full machines and skip empty ones.
- Their accounting lives in spreadsheets, so they do not know which machine or which location is actually profitable.

SmartVendingOS gives them one system that answers: what did I sell, what is about to run out, what is broken, where should the van go tomorrow, and am I making money.

### Who buys it

| Customer type | Description |
|---|---|
| Vending operators | Own and service machines on behalf of location clients. The primary market. |
| Self operators | Businesses with machines at their own sites, managed in house. |

### The competitive position

The benchmark is VendSoft, a US vending management product. We match its feature set and go past it in four areas: route and trip execution on mobile, accounting grade financial reporting, demand forecasting and anomaly detection, and customer facing loyalty and promotions.

### Product commitments

- **Hardware agnostic.** Works with any machine reporting telemetry. Manual entry for machines that do not report.
- **Global first.** USD default, multi currency supported, no single country's tax rules baked in.
- **Two surfaces.** Desktop web app for the office, mobile companion for the driver.
- **SaaS tiers.** Free, Starter, Pro, Enterprise.

---

## 2. Where we are today

The product looks finished and is not. That gap is the entire subject of this document.

**What is real.** The full user interface. Around 40 screens, 32 shared components, a design system, charts, a live fleet map, working authentication with real password hashing, a marketing site, a pricing page, a lead capture funnel that writes to a real database, and an internal admin panel.

**What is not real.** The data inside those screens. Every operational number on every screen is read from static TypeScript files checked into the repository. Exactly one in-app screen writes to the database: the profile password change. Every other save button updates local state and shows a success message that means nothing. Reload the page and the change is gone.

**Nayax does not exist in the codebase.** It appears as four strings in dropdown menus. There is no integration, no API client, no protocol code.

This is not a criticism of the work so far. It was built as a sales demo and it does that job. This document turns it into a product.

Section 12 breaks this down piece by piece: what is already built and working, what exists as an interface and needs its backend, what was built wrong, and what does not exist yet.

---

## 3. How the system runs

One application. One database per deployment. No separate API server, no microservices, no message queue.

```
   Browser
      |
      | HTTPS
      v
 +---------------------------------------------+
 |  Next.js application  (single Node process)  |
 |                                              |
 |   Marketing pages       public               |
 |   Authenticated app     session required     |
 |     - Server Components   render + query     |
 |     - Server Actions      handle writes      |
 |   API routes            login, leads, sync   |
 +---------------------------------------------+
      |                            ^
      | SQL                        | writes
      v                            |
 +------------------+     +------------------+
 |   PostgreSQL     |<----|  Nayax sync job  |
 |   35 tables      |     |  (scheduled)     |
 +------------------+     +------------------+
                                   ^
                                   | HTTPS
                          +------------------+
                          |  Nayax Lynx API  |
                          +------------------+
```

**The key structural decision: the frontend and the backend are the same application.** A page showing the machine list runs on the server, queries Postgres in the same process, and sends finished HTML to the browser. There is no REST API in the middle, no JSON fetching, no loading spinner, no duplicated types between client and server.

This is not a shortcut. It is the current standard for this framework and it removes an entire layer we would otherwise have to build, secure, version and debug.

---

## 4. Frontend

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Maps | Leaflet with OpenStreetMap (no API key, no per view billing) |
| Icons | Lucide |
| Dates | date-fns |

All of it is already installed and in use. The backend programme adds no new frontend dependency.

### What exists

**Public site.** Landing page, pricing page, login, signup, and per company demo links that let a sales prospect open a personalized instance from an email.

**Operator app, 16 screens.** Executive dashboard, live fleet map, machine list, machine detail with planogram editor, locations, inventory, routes, trips, purchases, expenses, reports hub, AI insights, promotions and loyalty, team management, configuration, account settings.

**Admin panel.** Lead list, user management, demo link generator. Internal only.

**Field technician mobile app.** Seven screens, specified in the requirements document, not built. See non goals.

### How each screen changes

The visual design does not change. What changes is where the data comes from.

Today a screen is one browser side file that imports a static array and filters it in the browser. After conversion it becomes two files:

- A **server file** that runs on the server, checks who is logged in, and runs the SQL.
- A **client file** that receives results as props and keeps the interactive parts: dropdowns, modals, tab switching.

Filters that need the database, such as date ranges, move into the URL. That has a side benefit worth naming: a filtered view becomes a link a user can bookmark or send to a colleague.

Every button that currently does nothing gets wired to a real save, or is removed if the requirements do not call for it.

### Flow: page load

1. Browser requests `/dashboard`.
2. Proxy layer checks the session cookie. No session means redirect to login.
3. The server page resolves which operator this user belongs to.
4. It calls query modules, which run parameterized SQL against Postgres.
5. It renders finished HTML and sends it.
6. The browser hydrates only the interactive parts.

No API call happens anywhere in that sequence. This is the default path for every screen in the product.

### Flow: saving a change

1. User edits a planogram slot price and submits.
2. A Server Action receives it. This is a function that only ever runs on the server.
3. It resolves the operator and checks write permission. A demo account is refused here and told why.
4. It runs a parameterized UPDATE scoped to that operator.
5. It marks the affected pages stale, and the UI shows the new value.

Every save button in the product follows this one shape. There are no exceptions and no second pattern.

---

## 5. Backend

Four layers, each deliberately thin.

### Layer 1: Database schema

Plain numbered SQL files in `db/`, applied by our own migration script. Once a file has been applied it is never edited. Corrections ship as a new numbered file.

This means any database, anywhere, at any version, is brought up to date by running one script, and the full sequence is auditable in version control.

**No ORM.** Queries are written as SQL. This is deliberate: the reporting half of this product is aggregate queries over sales, purchases and expenses, which is exactly the work ORMs do worst.

### Layer 2: Query modules

`src/server/<domain>/` holds plain async functions, one per question the product asks: revenue for a date range, machines with fill percentage, slots below reorder point. Every one takes the operator id as its first argument.

**Nothing else in the application writes SQL.** That rule is what makes tenancy enforceable at a single point.

### Layer 3: Integration

`src/server/nayax/` holds everything the system knows about Nayax. Covered in section 7.

### Layer 4: Pages and actions

Server Components call query modules. Server Actions handle writes. Both patterns are already proven in the codebase by the profile password change, which is the template every new write copies.

### Flow: authentication

1. Credentials posted to the login endpoint.
2. Password verified against a bcrypt hash stored in Postgres, using the database's own cryptography extension. The plain password is never stored or logged.
3. On success the server signs a session token and sets it as an httpOnly cookie, valid seven days. The browser cannot read it from JavaScript.
4. Every later request is checked by the proxy layer. App routes require a session. Admin routes additionally require the master role.

This flow is built and working today.

---

## 6. The database

35 tables across five migration files, all applied and verified against a live Postgres instance.

| File | Domain | Tables |
|---|---|---|
| `001_core.sql` | Organizations, people, locations, products | 10 |
| `002_sales.sql` | Orders, alerts, service issues | 3 |
| `003_operations.sql` | Routes, trips, cash, vehicles, warehouses, purchases, expenses | 12 |
| `004_growth.sql` | Campaigns, loyalty program, rewards, members, redemptions | 6 |
| `005_integrations.sql` | Telemetry providers, sync state, problem catalog, custom fields | 4 |

### Flow: keeping one customer's data separate

Every table carries an `operator_id`. That column is what separates one customer's data from another's.

1. A request arrives with a signed session cookie.
2. One function reads the signed user id and looks up which operator that user is a member of.
3. It returns the operator id plus whether this user may write.
4. Every query module is handed that operator id and scopes its SQL to it.

There is no path to data that bypasses step 2. That is why it is one function rather than a `WHERE` clause repeated across hundreds of queries.

### A security correction made during this work

The original design resolved the operator from a value in the session cookie called the slug.

Reading the existing code showed that the slug is chosen by the prospect themselves, generated from the company name they type into the lead capture form. Anyone who typed a real customer's company name would have been handed that customer's data.

The design now resolves the operator from the signed user id through a membership table. The slug remains cosmetic. **This was caught before any customer data existed.** It is recorded here because it is exactly the class of mistake systematic development is meant to catch, and it was caught by reading code rather than by trusting a plan.

---

## 7. Nayax integration

Nayax is a payments and telemetry company. Their hardware sits inside a vending machine, takes card and contactless payments, and reports back. Integrating with them is what turns this from a data entry product into a monitoring product.

We pull three things:

| Data | What it drives |
|---|---|
| Machine status and last contact time | Online, offline and warning states on the dashboard and fleet map |
| Card and cash transactions | Every revenue number, every sales report, every P&L line |
| Slot level inventory from DEX readings | Fill percentage, low stock alerts, stockout forecasting |

### How it is built

Everything the codebase knows about Nayax stops at one folder. The rest of the application speaks our own normalized types and has never heard of Nayax.

Two implementations sit behind one interface:

- **Fixture provider.** Replays the sample dataset with realistic timing. Deterministic. Requires no credentials.
- **Lynx provider.** The real HTTP client against Nayax's API.

The application picks between them by checking whether a Nayax API key is present in the environment. **No key means fixture. Key means live.** Moving a customer from demo to production is setting an environment variable, not a code change, a branch, or a different build.

### Why it is built this way

We do not have Nayax credentials yet. If we waited for them, the entire backend would be blocked behind a commercial conversation we do not control.

Building the interface first means every screen, every report and every alert can be completed and tested now. The day credentials arrive, the change is one environment variable plus correcting the endpoint paths in a single file. Nothing else in the codebase knows a Nayax URL.

### Flow: a sync run

1. A scheduler, or the "Sync now" button, calls the sync endpoint with a bearer secret. Without that secret the request is rejected.
2. The provider is selected: fixture or live, based on the environment.
3. Machines are loaded from our database, keyed by their Nayax device id.
4. Machine status and last contact time are updated.
5. Transactions since the last cursor are inserted as orders, **ignoring any transaction we have already recorded.**
6. Slot inventory is overwritten from DEX readings where the machine reports them, and decremented per transaction where it does not.
7. Alerts are raised for machines offline past their threshold and slots below reorder point.
8. The sync cursor and any error are written, so the next run resumes from the right place and the Configuration screen can show when it last succeeded.

### Why revenue cannot be double counted

Step 5 is the one that matters. Every Nayax transaction carries an identifier. We store it alongside the order and mark it unique per customer. If the sync runs twice, or crashes halfway and retries, the second insert of the same transaction is silently ignored.

This is the one failure that would corrupt a customer's books while looking completely normal on screen. It ships with an automated test that runs the sync twice and asserts the order count is unchanged.

### Webhooks are deliberately deferred

Nayax can push events to us rather than us polling. That requires a contract and a signing secret we do not have, and it delivers the same data. We poll on a schedule now and add push when Nayax supplies the specification.

---

## 8. Manual inventory

Not every machine reports what is inside it. Older machines have no telemetry board, some customers refuse to pay for one, and a warehouse shelf never reports itself at all. Manual stock entry is also the headline feature of the Free tier, so it is not an edge case: it is the entry point to the product.

### Where inventory actually lives

Two numbers, and only two:

- **Inside a machine.** The quantity on each planogram slot.
- **In the warehouse.** The quantity of each product on hand.

### The design problem worth naming

Five separate things want to change those two numbers:

1. Nayax reports slot inventory from a DEX reading.
2. A sale happens, so the slot goes down by one.
3. A driver restocks a machine during a trip.
4. A purchase arrives and goes into the warehouse.
5. **A person types a number in, which is the new one.**

Five pieces of code writing the same number is exactly how inventory silently goes wrong, and inventory going wrong is worse than inventory being absent, because the operator trusts it and drives to the wrong machine.

### The answer: one movement ledger

Every change to stock, from any of those five sources, writes a row to one movement table: what moved, how many, from where to where, why, and who did it. The quantity column is the running balance, and it is updated by the one function that writes the ledger. **Nothing else in the codebase is allowed to write a quantity.**

This costs one new table and one function. In exchange:

- Every source of change is auditable. "This slot says 4, why?" has an answer.
- Manual entry is not a special case. It is one more movement reason alongside sale, restock, delivery and DEX correction.
- Shrinkage becomes visible instead of silently absorbed.

### What the user does

Four actions, all the same underlying write:

| Action | Where |
|---|---|
| Receive stock into the warehouse | Inventory screen, or automatically when a purchase is marked received |
| Restock a machine slot | Machine detail planogram, and on a trip stop |
| Adjust after a physical count | Machine detail and inventory screen |
| Transfer warehouse stock to a machine | Inventory screen |

### Where it reflects

This is the part the cofounder asked about, and it needs no extra work per screen. Every screen already reads the same quantity column, so a manual entry updates all of these the moment it is saved:

Machine detail fill percentage and slot list, machine list fill column, dashboard low stock count, inventory screen, shortage screen, fleet map low stock state, low stock alerts, restock recommendations, days until stockout forecasting, warehouse stock levels, and inventory valuation in the financial reports.

That is the return on having one write path. The alternative, updating each screen's own copy of the number, is how this goes wrong.

### Flow: a manual stock entry

1. User opens a slot on the machine detail screen and enters a new count, or adds quantity.
2. A Server Action resolves the operator and checks write permission. A demo or Viewer account is refused here.
3. It validates: quantity cannot go negative, and cannot exceed slot capacity.
4. It writes one movement row and updates the running balance, in one transaction so they can never disagree.
5. Any low stock alert that no longer applies is cleared, and the affected pages are marked stale.
6. The user sees the new number, and so does every screen in the list above.

### When Nayax and the human disagree

Once a machine has telemetry, DEX readings and manual counts will eventually differ. **The DEX reading wins**, because it is the machine reporting itself, and the difference is written to the ledger as a correction rather than quietly overwritten. Shrinkage, miscounts and jammed motors show up as a visible correction history instead of disappearing.

---

## 9. Commercial model: subscriptions and feature locking

The product is sold as a monthly subscription. That has direct consequences for what the software must do, so it belongs in the architecture rather than only on the pricing page.

### The tiers

| Tier | Price | Machines | Users |
|---|---|---|---|
| Free | $0 forever | Up to 3 | 1 |
| Starter | $29/month, $23 annual | Up to 20 | 3 |
| Pro | $79/month, $63 annual | Up to 100 | 10 |
| Enterprise | Custom | Unlimited | Unlimited |

### What each tier unlocks

| Capability | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Dashboard, machines, products, manual inventory | Yes | Yes | Yes | Yes |
| Basic sales reports | Yes | Yes | Yes | Yes |
| Routes and trips, locations, planogram | No | Yes | Yes | Yes |
| Purchases, expenses, CSV export | No | Yes | Yes | Yes |
| Forecasting, anomaly detection, recommendations | No | No | Yes | Yes |
| Promotions and loyalty | No | No | Yes | Yes |
| Full P&L, cash flow, mileage, multi currency | No | No | Yes | Yes |
| Warehouse management | No | No | Yes | Yes |
| White label, SSO, custom integrations, write API | No | No | No | Yes |

### Locking, and how it is enforced

Three kinds of lock, and they are not the same thing:

1. **Page locks.** A Starter customer opening the forecasting screen sees an upgrade page, not a broken screen and not a crash. The lock is checked on the server before the page queries anything, so the data never leaves the database.
2. **Limit locks.** Adding a 21st machine on Starter is refused at the point of saving, with a message naming the limit and the tier that raises it. Counting happens against the database, not against what the browser thinks.
3. **Navigation.** Locked items stay visible in the sidebar with a small tier badge rather than disappearing. A feature the customer cannot see is a feature they will never pay to unlock.

**Enforcement lives at the same chokepoint as tenancy.** The one function that already resolves which operator a request belongs to also returns their plan. Every page and every write asks that one function. There is no second place to get it wrong, and no client side check that a determined user can skip.

The plan itself is a column on the operator record, which already exists in the schema.

### Billing: the open decision

Enforcing a plan and collecting money for it are separate problems. Enforcement is in scope and cheap. Collection is a choice:

- **Option A, manual invoicing.** An administrator sets the customer's plan from the admin panel. Invoices are sent outside the system. Costs almost nothing to build, because the plan field and the admin panel already exist.
- **Option B, a payment processor.** Cards on file, automatic monthly charges, self serve upgrades, dunning when a card fails, proration when a plan changes mid month. This is a real integration, not a small one.

**Recommendation: option A first.** At early customer counts the processor integration costs more than it saves, and every hour spent on dunning logic is an hour not spent on the product the customer is actually paying for. Move to option B when self serve signup volume makes manual billing the bottleneck. The switch does not disturb enforcement, because enforcement only reads the plan field and does not care who set it.

Dedicated per customer deployments, described in the next section, are priced as Enterprise. They are per customer infrastructure, so they cannot sit on a shared tier price.

---

## 10. Deployment model

**Pending confirmation.** This section reflects the requirement that each organization can be deployed anywhere with its own database.

### One codebase, two deployment shapes

| Shape | Serves | Database |
|---|---|---|
| Shared instance | Public demos, trials, smaller customers | One database, many operators separated by `operator_id` |
| Dedicated instance | Larger customers, or anyone requiring data isolation | Their own database, one operator inside it |

Identical code. Identical schema. The only difference is which database the application is pointed at. **A dedicated deployment is a shared deployment with one row in the operators table.**

Keeping `operator_id` in the schema even for single customer deployments costs nothing and means we never have to choose. Removing it would permanently close the door on the shared instance, which we still need for the sales funnel.

### What "deploy anywhere" requires

1. **No hosting lock in.** The application must run against any standard Postgres, not only a hosted one. Configuration entirely through environment variables.
2. **A bootstrap command.** An empty database plus one command produces a working system with schema and a first administrator. No manual SQL, no vendor dashboard.
3. **A shippable unit.** A container image and a compose file, so deployment is one command rather than a runbook.

### Flow: standing up a new organization

1. Provision an empty Postgres database.
2. Set environment variables: database connection, session secret, and Nayax credentials if the customer has them.
3. Run the migration command. All numbered SQL files apply in order and record themselves.
4. Run the bootstrap command. It creates the operator record and the first administrator account.
5. Start the container.
6. The administrator logs in and adds machines, locations and team members.

### Flow: shipping a schema change to running deployments

1. A new numbered SQL file is added. Applied files are never edited.
2. The migration command runs against each deployment's database.
3. The runner skips files already recorded and applies only what is new.
4. Each database records what it has applied, so drift is detectable.

With per customer databases this stops being a detail and becomes the main operational risk: N databases means N chances to drift. The append only rule and the tracking table are what keep it manageable.

### Current portability status

The data layer is already portable, and that was designed in rather than lucky. No ORM, no vendor specific database features, no vendor client library in the data path. The connection string is the only thing that changes.

**One genuine blocker exists.** Six files read and write user credentials from a schema the hosting provider creates rather than one we own. On a plain Postgres those queries fail because the tables do not exist.

The fix is to own our own users table. The password hashing itself is standard Postgres and moves unchanged. **This is a table migration, not an authentication rewrite**, and it is far cheaper now than after another twelve screens are built on top of it.

---

## 11. Security

| Item | Status |
|---|---|
| Passwords hashed with bcrypt in the database, never stored or logged in plain text | Working |
| Session tokens signed, httpOnly cookies, seven day expiry | Working |
| All app routes behind an authentication gate, admin routes behind a role check | Working |
| Every query scoped to one operator at a single enforced point | In build |
| SQL injection prevented by parameterized queries throughout | In build |
| Demo and trial accounts read only, cannot mutate data | In build |
| Nayax sync endpoint requires a bearer secret | In build |

### Boundaries

Every point where data crosses out of the application, and what protects it:

| Boundary | Protection |
|---|---|
| Browser to application | Session cookie, signed, httpOnly, checked on every request |
| Application to Postgres | Parameterized queries only, connection string from environment |
| Application to Nayax | API key from environment, never in source |
| Scheduler to sync endpoint | Bearer secret, rejected without it |
| Lead capture form (public) | Input validated against fixed allowed values, lands on the read only demo operator |
| CSV export | Operator scoped at the query, same as any other read |

### Two items needing action outside engineering

1. **A database password was committed to version control** in two setup scripts. Removing the line does not retract it, because git keeps history. **The password must be rotated.** This is an account owner action, not a code change.
2. **One utility builds SQL by string interpolation of table and column names.** Acceptable today because no customer data sits behind it. Not acceptable once it does. Scheduled for deletion before customer data lands.

---

## 12. What is built, what changes, what is new

Every screen and every piece of backend in the repository today, and what happens to it. Counted from the codebase, not estimated: 41 page files, 7 API routes, 2 server action files.

### Already built and genuinely working

These need no work. They already read and write the database.

| Piece | What it does |
|---|---|
| Login, logout, session | Real password verification, signed cookie, seven day expiry |
| Auth gate | Every app route requires a session, admin routes require the master role |
| Profile password change | The only in-app screen that currently writes to Postgres |
| Lead capture funnel | Public form, writes a real lead row, mints a session |
| Admin panel: leads, users, demo link | Internal tools, backed by real queries |
| Landing, pricing, signup, per company demo links | Marketing surface |
| Database schema | 35 tables, applied and verified live |
| Migration runner | Applies numbered SQL, tracks what has been applied |

### Built as interface, needs its backend connected

The screen exists and looks right. The numbers in it come from a static file, and its buttons do not save. Each one becomes a server file plus a client file, with real queries behind it. **The visual design does not change.**

| Screen | What it needs |
|---|---|
| Dashboard | All KPIs and charts move into SQL. Today they are computed at file import time |
| Fleet map | Machine positions and status from the database |
| Machines list | Real list, real fill percentages, working filters |
| Machine detail | Real planogram, and the densest write surface in the product |
| Locations | Real list, real commission terms |
| Inventory | Real stock levels, and the new manual entry actions |
| Inventory shortage | Real below reorder point query |
| Orders | Real sales, from the seed now and from Nayax later |
| Alerts | Real alert rows instead of fixtures |
| Products | Real catalog with working create and edit |
| Routes | Real routes and stops |
| Trips, trip create | Real trips, stops and slot entries |
| Purchases, purchase create | Real purchase orders and line items |
| Expenses, expense create | Real expense records |
| Data centre (reports) | Every report computed in SQL |
| Insights, forecast, anomalies, recommendations | Real trailing average and variance queries |
| Promotions | Real campaigns and targets |
| Team | Real members, real roles, working invites |
| Configuration | Real telemetry provider rows and real last sync time |
| Settings | Real operator record |
| Users | Real user list |

### Built wrong, needs replacing rather than converting

Four defects already in the repository. Worth naming so nobody assumes they are done.

| File | Problem |
|---|---|
| Location detail page | Is a byte identical copy of the inventory page. The real screen was never written |
| Trip detail page | Is a copy of the trip create page |
| Route detail page | Is actually the reports screen |
| Machines list, route filter | Its route names do not match any record, so the filter can never match anything |

### Does not exist yet, needs building from nothing

| Piece | Notes |
|---|---|
| The entire server query layer | No query modules exist today. This is the bulk of the work |
| The Nayax integration | Only the normalized types exist so far. Fixture provider, live client, sync job and its test are all new |
| Manual inventory: the movement ledger | New table, one write function, and the entry modal reused across three screens |
| Warehouse screens | Warehouse tables exist in the schema. No screen reads them |
| Plan locking and upgrade screens | New. Page locks, limit checks, tier badges, and the upgrade screen a locked page shows instead of data |
| CSV export | New endpoint and one shared serializer |
| Tenancy resolution | New. The single function every request routes through |
| Deployment packaging | New. Container image, compose file, bootstrap command |
| Mobile technician app | Seven screens, specified, not started. Out of scope here |

### Must change before customer data lands

| Item | Why |
|---|---|
| Move user credentials to our own table | Six files currently read a schema the hosting provider creates. They fail on any other Postgres, which blocks the deployment model in section 10 |
| Delete the string interpolating SQL utility | It builds queries by pasting table and column names into a string |
| Rotate the committed database password | It is in version control history and cannot be un-published by deleting the line |
| Update the stale comment in the auth gate | It states that no data is scoped by company, which stops being true in phase 1 |

### Gets deleted

The sample data layer (seven files), nine dashboard components nothing imports, an unused filtering hook, three unused utility files, the hosting provider client shim, and an unused context that is mounted but has no consumers. All of it goes in phase 10, once nothing imports it.

---

## 13. Build phases

Each phase leaves the application working and demonstrable. Nothing is left half converted between phases.

| # | Phase | Delivers | Size |
|---|---|---|---|
| 0 | Schema foundation | 35 tables live, migration runner, demo dataset seeded | Mostly done |
| 1 | Identity and tenancy | Own users table, operator resolution, read only demo accounts | M |
| 2 | Core screens on real data | Dashboard, fleet map, machines, machine detail, locations, inventory, orders | L |
| 3 | Nayax integration | Provider interface, fixture, live client, sync job, idempotency test | M |
| 4 | Write operations and manual inventory | Movement ledger, manual stock entry, restock, transfer and count adjustment, planogram editing, machine, product and location management, team invites | L |
| 5 | Field operations | Routes, trips, purchases, expenses, warehouses | L |
| 6 | Reporting and intelligence | P&L, cash flow, commission, sales analysis, forecasting, anomaly detection, CSV export | L |
| 7 | Growth and configuration | Promotions, loyalty, configuration, account settings | M |
| 8 | Subscription plans and feature locking | Plan stored and read at the chokepoint, page locks, limit locks, upgrade screens, tier badges in navigation, admin plan management | M |
| 9 | Deployment packaging | Container image, compose file, bootstrap command, deployment guide | M |
| 10 | Cleanup and hardening | Delete the sample data layer and dead code, close remaining security items | S |

**Phase 2 is the one that visibly changes the product.** After it, the dashboard shows real numbers.

**Phase 3 is the one that delivers the actual pitch.** Machines report themselves without anyone typing anything.

**Phase 4 is what a Free tier customer actually uses.** Manual inventory is the entry point to the product, and it is what makes the system useful to an operator whose machines have no telemetry at all.

**Phase 8 is what makes it sellable.** Until plans are enforced, every customer has every feature regardless of what they pay.

Phase 8 sits after the features exist rather than before, because locking a feature that is not built yet locks nothing. It is deliberately before phase 9, so a dedicated deployment ships with enforcement already in it.

Sizes are relative, not dates. Dates come after phase 1, when there is measured velocity to base them on rather than a guess.

### Verification per phase

Every phase carries a specific check that is run and reported, never assumed.

| Phase | The check |
|---|---|
| 0 | Migration runs clean on a fresh database; re-running changes nothing |
| 1 | Log in as a demo account, confirm it resolves to the demo operator and is refused a write |
| 2 | Dashboard totals equal the seeded database totals; no screen still imports the sample data files |
| 3 | Trigger a sync: order count rises, a machine flips offline, slot inventory moves. Run it twice: the second run changes nothing |
| 4 | Add stock to a slot by hand, reload, and confirm the same new number appears on machine detail, the machine list fill column, the inventory screen, the dashboard low stock count and the fleet map. Confirm the movement row exists. Repeat as a demo user and get refused |
| 5 | Create a trip, it appears in the list, its stops persist across reload |
| 6 | Reported net income matches a hand written SQL query over the same date range |
| 7 | Create a campaign, reload, it persists and appears in summary counts |
| 8 | Set an operator to Starter: forecasting shows the upgrade screen instead of data, adding a 21st machine is refused with the limit named, and the locked items still appear in the sidebar with a tier badge |
| 9 | Empty database to working login using only the documented commands |
| 10 | Full build passes and no reference to the sample data layer remains |

---

## 14. Explicit non goals

Named so nobody expects them and nobody builds them by accident.

- **The mobile technician app.** Seven screens, specified in the requirements document, not present in the codebase. A separate build, scoped separately.
- **Nayax webhooks.** Polling covers the same data. Added when Nayax supplies the push specification.
- **Issuing refunds or taking payments through Nayax.** We read from Nayax. We do not write to it.
- **Automatic card billing.** Plan enforcement and feature locking ARE in scope, in phase 8. Taking card payments is not: no payment processor, no self serve upgrade checkout, no dunning, no proration. An administrator sets the plan and invoices are sent outside the system. See section 9.
- **Route optimization as a real algorithm.** The button keeps its current behavior. Real optimization is a routing engine and belongs in its own phase.
- **A machine learning forecasting model.** Forecasting is a trailing average and says so in the code. It answers "this slot runs out in about two days" correctly, which is what the user needs.
- **Excel export.** CSV opens in Excel. A real spreadsheet writer is a dependency for no visible gain.
- **File uploads.** Receipt photos, machine photos and avatars are deferred because they need object storage, which is a hosting decision rather than a code one.

---

## 15. Decisions needed

These block or reshape work and are not engineering's to make alone.

1. **Does the shared multi organization instance still exist**, alongside dedicated per customer deployments? Assumption: yes, it runs the public demo and trial funnel. If every customer without exception gets their own deployment, the lead capture funnel needs rethinking before phase 1.

2. **Who operates a dedicated deployment?** Us, on managed infrastructure per customer, or the customer on their own servers? Self hosting by non engineers requires an installer and an upgrade path, which is materially larger than phase 9 as scoped.

3. **Is the operational cost of per customer databases accepted?** Migrations, upgrades and backups all become per customer. Cross customer reporting becomes impossible. It is the right call for enterprise sales and it is not free.

4. **Confirm the authentication table move happens in phase 1**, before screens are built on top of it.

5. **Rotate the exposed database password.** Account owner action.

6. **When do Nayax credentials arrive?** Nothing is blocked on them. Phase 3 ships against fixtures until they exist, and the endpoint paths cannot be verified until then.

7. **Billing: manual invoicing or a payment processor?** Recommendation is manual invoicing first, with an administrator setting the plan. See section 9. Choosing a processor instead adds a phase and a dependency, and needs deciding before phase 8 rather than during it.

8. **Confirm the feature lock map in section 9.** Which capability belongs to which tier is a pricing decision, not an engineering one. The map there follows the requirements document. If it is wrong, it is cheapest to correct now, while nothing enforces it yet.

9. **Does the DEX reading override a manual count, or the other way round?** Recommendation in section 8 is that the machine wins and the difference is recorded as a visible correction. The opposite choice hides shrinkage, so this is worth an explicit yes.

---

## 16. Summary

The interface is built. The database schema is built and live. What remains is connecting them, and pulling real machine data in from Nayax.

The architecture is deliberately small: one application, one database, no separate API tier, no ORM, no new dependencies. Every simplification taken is recorded in the code alongside the condition that would justify revisiting it.

The work is sequenced so the product is demonstrable at the end of every phase, and so the two phases that change what a customer actually sees, real data on the dashboard and machines reporting themselves, come early rather than last.
