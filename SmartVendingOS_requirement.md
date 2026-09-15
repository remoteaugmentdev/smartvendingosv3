# SmartVendingOS — VERSION 2: Full Platform SaaS Demo
## Functionality Specification Document
### Prepared by: Remote Augment (RA) for SmartVendingOS.com
### Document Version: 1.0 | Purpose: UI-Only Demo — AI Code Generation Reference

---

## 1. PROJECT CONTEXT & STRATEGIC GOALS

### 1.1 What We Are Building

SmartVendingOS is a **global, hardware-agnostic, SaaS vending management platform** built by Remote Augment (RA). It targets two customer profiles:

- **Vending Operators** — companies that own and service vending machines on behalf of location clients (offices, hospitals, factories, transit hubs).
- **Self-Operators** — businesses that own machines at their own locations and manage them in-house.

The benchmark product is **VendSoft** — a US-based vending management SaaS. SmartVendingOS V2 must match VendSoft's complete feature set and surpass it in four areas:

| Area | VendSoft Today | SmartVendingOS Advantage |
|---|---|---|
| Route & Trip Management | Good map-based trips, manual entry | Optimized routes, mobile-first trip execution, real-time sync |
| Financial Reporting | Basic P&L, expenses, cash flow | Full accounting-grade reports, multi-currency, export to accounting tools |
| Intelligence | None | AI demand forecasting, restock recommendations, anomaly detection |
| Customer Engagement | None | Loyalty program, promotions engine, QR-linked kiosk menus |
| Mobile Experience | Web only (not mobile-optimized) | Full mobile companion app for field technicians |
| Design Quality | Dated blue/gray UI | Modern, clean, brandable design system |

### 1.2 Design Principles

- **Global-first:** USD default, multi-currency support, no region-specific compliance baked in.
- **Hardware-agnostic:** Works with any vending machine that supports telemetry (Micron, Crane, Wittern, Jofemar, etc.). Manual entry fallback for dumb machines.
- **Two surfaces:** A desktop web app for operators/managers + a mobile-optimized companion app for field technicians.
- **SaaS model:** Free → Starter → Pro → Enterprise pricing tiers displayed on a public marketing/pricing page.
- **Demo mode:** All screens filled with realistic dummy data. Zero empty states during a demo walkthrough.

### 1.3 Tech Stack Recommendation

- **Framework:** React + React Router v6
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Maps:** Leaflet.js (OpenStreetMap, no API key needed for demo)
- **Icons:** Lucide React
- **All data:** Static JSON files — no backend required for demo
- **Mobile views:** Responsive breakpoints, same codebase

---

## 2. INFORMATION ARCHITECTURE

### 2.1 Public-Facing Pages (Marketing Site)

```
/                    → Landing / Hero page
/features            → Feature overview (sections per module)
/pricing             → Pricing tiers (Free / Starter / Pro / Enterprise)
/login               → Login form
/signup              → Sign-up form (links to Free tier)
```

### 2.2 App Pages (Authenticated)

```
/app/dashboard              → Executive Dashboard
/app/map                    → Live Fleet Map
/app/machines               → Machine List
/app/machines/:id           → Machine Detail + Planogram
/app/locations              → Location List
/app/locations/:id          → Location Detail + Map
/app/inventory              → Inventory Overview
/app/inventory/products     → Product Catalog
/app/inventory/reorder      → Products to Reorder
/app/inventory/warehouses   → Warehouse Stock
/app/routes                 → Route List
/app/routes/:id             → Route Detail
/app/trips                  → Trip List
/app/trips/create           → Create Trip (map-based)
/app/trips/:id              → Trip Detail / Results Entry
/app/purchases              → Purchase Orders
/app/purchases/create       → Create Purchase
/app/expenses               → Expense Log
/app/expenses/create        → Log Expense
/app/reports                → Reports Hub
/app/reports/sales          → Sales Report
/app/reports/pl             → Profit & Loss
/app/reports/cashflow       → Cash Flow
/app/reports/mileage        → Mileage Log
/app/insights               → AI Insights Hub
/app/insights/forecast      → Demand Forecast
/app/insights/anomalies     → Anomaly Detection
/app/promotions             → Promotions & Loyalty Hub
/app/promotions/campaigns   → Active Campaigns
/app/promotions/loyalty     → Loyalty Program
/app/team                   → Team Management
/app/configuration          → Configuration Hub
/app/settings               → Account & Subscription Settings
```

### 2.3 Mobile App Pages (Field Technician)

```
/mobile/                    → Today's Trip Overview
/mobile/trips/:id           → Active Trip Map + Stop List
/mobile/stops/:id           → Machine Stop Detail
/mobile/stops/:id/restock   → Restock Entry Form
/mobile/stops/:id/cash      → Cash Collection Form
/mobile/stops/:id/service   → Service / Issue Report
/mobile/machines            → All Machines (quick lookup)
/mobile/profile             → Technician Profile
```

### 2.4 Navigation Structure (Desktop Left Sidebar)

```
[SmartVendingOS Logo]
─────────────────
📊  Dashboard
🗺️  Live Map          ← NEW vs VendSoft
─────────────────
🏧  Machines
📍  Locations
📦  Inventory
─────────────────
🛣️  Routes
🚗  Trips
─────────────────
🛒  Purchases
💸  Expenses
📈  Reports
─────────────────
🤖  AI Insights      ← NEW vs VendSoft
🎁  Promotions       ← NEW vs VendSoft
─────────────────
👥  Team
⚙️  Configuration
─────────────────
[Account Avatar]
[Your Plan: Pro ✦]
[Settings]
```

---

## 3. MARKETING & PRICING PAGES

---

### PAGE 1: LANDING PAGE
**Route:** `/`

#### 3.1.1 Hero Section

- **Headline:** "The Smarter Way to Run Your Vending Business"
- **Sub-headline:** "Manage every machine, route, and dollar in one platform. Built for operators who are serious about growth."
- Two CTAs: **"Start Free"** (primary blue button) | **"Watch Demo"** (ghost button)
- Hero image: mock screenshot of the dashboard (use the app's dashboard screenshot rendered in a laptop frame)
- Top nav: Logo | Features | Pricing | Login | Start Free (CTA)

#### 3.1.2 Logos / Social Proof Bar

"Trusted by operators managing 500+ machines globally" — placeholder logo row (5–6 dummy company names styled as grayscale wordmarks).

#### 3.1.3 Feature Highlights (3 columns)

Each column: Icon + bold title + 2-line description.

- **Total Fleet Visibility** — "See every machine's inventory, revenue, and status on one live map."
- **Smart Route Optimization** — "Plan, assign, and execute restock trips with turn-by-turn guidance for your field team."
- **AI-Powered Forecasting** — "Know what will run out before it does. Get restock recommendations automatically."

#### 3.1.4 Product Screenshots Strip

Horizontal scrollable strip of 4 app screenshots with captions: Dashboard | Route Map | Trip Execution | AI Insights.

#### 3.1.5 Comparison Table

"How we compare" — side-by-side table:

| Feature | Micron | VendSoft | SmartVendingOS |
|---|---|---|---|
| Hardware-agnostic | ❌ | ✅ | ✅ |
| Mobile field app | ❌ | ❌ | ✅ |
| Route optimization | ❌ | Basic | Advanced + AI |
| AI demand forecast | ❌ | ❌ | ✅ |
| Loyalty & promotions | ❌ | ❌ | ✅ |
| Financial reports | ❌ | Basic | Full P&L + export |
| Multi-currency | ❌ | ❌ | ✅ |
| Pricing | Free (limited) | $99+/mo | From $0/mo |

#### 3.1.6 Pricing Preview + CTA

Show just the 3 plan names with "See all plans →" button linking to `/pricing`.

#### 3.1.7 Footer

Links: Features | Pricing | Blog | Docs | Contact | Privacy | Terms. Copyright "© 2026 SmartVendingOS by Remote Augment."

---

### PAGE 2: PRICING PAGE
**Route:** `/pricing`

#### 3.2.1 Toggle: Monthly / Annual (Annual = 20% off)

#### 3.2.2 Pricing Tiers (4 cards in a row)

---

**FREE**
- Price: $0/month forever
- Subtitle: "Perfect for getting started"
- Machine limit: Up to 3 machines
- Features included:
  - Basic dashboard
  - Inventory tracking (manual)
  - Product catalog (up to 50 products)
  - Basic sales reports
  - 1 user account
  - Email support
- CTA: "Get Started Free" (ghost button)
- Badge: none

---

**STARTER**
- Price: $29/month ($23/mo annual)
- Subtitle: "For small operators growing their fleet"
- Machine limit: Up to 20 machines
- Everything in Free, plus:
  - Route & trip management
  - Location management (unlimited)
  - Planogram per machine
  - Purchase order tracking
  - Expense logging
  - 3 user accounts (roles: Admin, Technician)
  - CSV/Excel export
  - Mobile companion app (view only)
  - Chat support
- CTA: "Start Starter Trial" (outlined blue)

---

**PRO** ← Most Popular (badge)
- Price: $79/month ($63/mo annual)
- Subtitle: "The complete platform for serious operators"
- Machine limit: Up to 100 machines
- Everything in Starter, plus:
  - AI demand forecasting
  - Restock recommendations
  - Anomaly detection & smart alerts
  - Promotions & discount campaigns
  - Customer loyalty program
  - Full P&L, cash flow, mileage reports
  - Multi-currency support
  - Warehouse inventory management
  - 10 user accounts (all roles)
  - Priority support + onboarding call
  - Mobile companion app (full — restock entry, cash collection, service reports)
  - API access (read)
- CTA: "Start Pro Trial" (solid blue, emphasized)
- Badge: "Most Popular" (top ribbon)

---

**ENTERPRISE**
- Price: Custom pricing
- Subtitle: "For large operations and resellers"
- Machine limit: Unlimited
- Everything in Pro, plus:
  - White-label branding (your logo, your domain)
  - Dedicated account manager
  - Custom integrations (ERP, accounting, payment APIs)
  - SLA guarantee (99.9% uptime)
  - SSO / SAML login
  - Advanced audit logs
  - Unlimited users
  - API access (read + write)
  - Custom report builder
- CTA: "Contact Sales" (dark button)

---

#### 3.2.3 Feature Comparison Accordion Table

Full feature-by-feature comparison table expandable per category: Core Features | Route & Trips | Inventory | Reporting | AI | Promotions | Team | Support | API.

#### 3.2.4 FAQ Section

5 questions: "Can I change plans anytime?", "What counts as a machine?", "Is there a free trial for paid plans?", "Do you support multiple currencies?", "What hardware does it work with?"

---

## 4. APP SCREENS — DESKTOP

---

### SCREEN 1: EXECUTIVE DASHBOARD
**Route:** `/app/dashboard`
**Who sees it:** Admin, Manager

This is the first screen after login and the primary "wow" screen of the demo. It must feel more powerful than VendSoft's dashboard.

#### 4.1.1 Top KPI Bar (5 cards)

| Card | Value | Sub-text | Trend |
|---|---|---|---|
| Total Revenue (MTD) | $18,430.00 | vs $15,210 last month | +21.2% ↑ green |
| Net Income (MTD) | $6,840.00 | Revenue − COGS − Expenses | +18.5% ↑ green |
| Active Machines | 24 / 26 | 2 offline | Online % shown |
| Total Trips (MTD) | 38 | 6 this week | Calendar icon |
| Pending Restocks | 7 machines | Below threshold | Alert amber |

Each card is clickable and navigates to its relevant section. Cards have a subtle hover state.

#### 4.1.2 Revenue & Profit Chart (full-width, top section)

Dual-axis line + bar chart. Bars = daily revenue. Line = daily net income. Toggle: 7 days / 30 days / 90 days / Custom range.

Date range picker on the right. Data source toggle: **All Machines** | **By Location** | **By Route**.

Shows clear peaks (weekdays higher than weekends). One dip day labeled "Machine #CD003 offline" in a tooltip annotation.

#### 4.1.3 Middle Row (3 columns)

**Left: Sales by Product Type (Donut Chart)**
- Snacks: 34% ($6,266)
- Beverages: 41% ($7,556)
- Fresh Food: 18% ($3,317)
- Other: 7% ($1,291)
Interactive legend. Hover shows amount + %.

**Center: Top 5 Products (Table)**
Columns: Rank | Product | Sales ($) | Units Sold
1. Coca-Cola 12 oz can — $892 — 446 units
2. Mountain Dew 12 oz — $810 — 405 units
3. 3 Musketeers Candy Bar — $540 — 360 units
4. Doritos Nacho Cheese — $486 — 270 units
5. Fritos Corn Chips — $418 — 278 units
"View Full Rankings →" link.

**Right: Top 5 Locations (Table)**
Columns: Rank | Location | Revenue | Machines
1. Wells Fargo Bank — $4,210 — 4 machines
2. Crystal Clean — $3,580 — 2 machines
3. Omega Retreat — $2,940 — 3 machines
4. Insurance Agency — $1,820 — 2 machines
5. Crystal Clean II — $1,620 — 1 machine
"View All Locations →" link.

#### 4.1.4 Bottom Row (2 columns)

**Left: Machines with Low Inventory (Table)**
Machine | Location | Shortage % | Action
CD003 — Crystal Clean — 18% shortage — "Schedule Restock" button
WF002 — Wells Fargo Bank — 12% shortage — "Schedule Restock" button
OA001 — Insurance Agency — 8% shortage — "Schedule Restock" button

**Right: Products to Reorder (Table)**
Product | In Warehouse | Reorder Point | Units Needed
Doritos Nacho Cheese — 63 — 100 — 37 units
Fritos Corn Chips — 57 — 100 — 43 units
Coca-Cola 12 oz can — 12 — 50 — 38 units
"+ Create Purchase Order" button in top right of panel.

#### 4.1.5 Right Sidebar Panel: Alerts & Activity Feed

A collapsible right-side panel (≈280px wide). Two tabs:

**Alerts Tab:**
- 🔴 CD003 offline — 4h 23m ago
- 🟡 WF-B02 slot 14 — Low stock (2 units) — 2h ago
- 🟡 3 products expiring in 3 days — 1h ago
- 🟢 Trip #1241158 completed — 45 min ago

**Activity Tab:**
- John updated inventory on CD003 — 2h ago
- Purchase #P-0042 received — 4h ago
- New machine installed at Omega Retreat — Yesterday

---

### SCREEN 2: LIVE FLEET MAP
**Route:** `/app/map`
**Who sees it:** Admin, Manager, Dispatcher

This screen is a **major differentiator** — VendSoft has no live map view at the top level.

#### 4.2.1 Layout

Full-screen map (Leaflet.js, OpenStreetMap tiles) with a collapsible left panel (320px).

#### 4.2.2 Map Markers

Each machine is a colored pin:
- 🟢 Green pin — Online, healthy inventory
- 🟡 Amber pin — Online, low inventory (below threshold)
- 🔴 Red pin — Offline
- 🔵 Blue pin — Technician currently on-site

Clicking a pin opens a **Machine Quick Info Popup:**
- Machine name + ID
- Location name
- Status badge
- Today's revenue: $124.50
- Inventory fill %: 78%
- Last service: 3 days ago
- "Open Machine Detail" button
- "Add to Trip" button

#### 4.2.3 Left Panel

**Filter controls:**
- Status filter: All / Online / Offline / Low Stock
- Location filter: All Locations dropdown
- Route filter: All Routes dropdown

**Machine list** (scrollable, synced with map — clicking a row pans/zooms to that pin):
Each row: Color dot + Machine name + Location + Status badge + Revenue today.

#### 4.2.4 Map Toolbar (top right of map)

- Zoom in/out
- "Fit all machines" button
- Layer toggle: Show/hide route paths
- Heatmap toggle: "Show revenue heatmap" (colors areas by revenue density)

---

### SCREEN 3: MACHINE LIST
**Route:** `/app/machines`
**Who sees it:** All roles

#### 4.3.1 Header Controls

- Title: "Machines" with count badge (26 total)
- "**+ Add Machine**" button (top right)
- Search bar: "Search by machine name, ID, location..."
- Filter dropdowns: Status (All/Online/Offline/Low Stock) | Location | Route | Machine Type
- View toggle: Table view | Card view

#### 4.3.2 Table View (default)

Columns: Checkbox | Machine Name | Machine ID | Location | Type | Status | Fill % | Revenue Today | Revenue MTD | Last Service | Actions

- Fill % shown as a small progress bar pill (green > 50%, amber 20–50%, red < 20%)
- Status: Online/Offline colored badge
- Actions: View | Edit | Schedule Trip

Show 26 rows with varied statuses. Export button at bottom (CSV/Excel).

Column visibility toggle (like VendSoft's "Visible Columns" button).

#### 4.3.3 Card View

Grid of machine cards. Each card:
- Machine photo placeholder (colored by brand category)
- Machine name + ID
- Location name
- Status badge
- Fill level bar
- Revenue today
- "Open" button

#### 4.3.4 Add/Edit Machine Form (side panel slides in)

Tabs: **General** | **Hardware** | **Location** | **Settings**

**General tab:**
- Machine Name (text)
- Machine ID / Serial Number (text)
- Machine Type dropdown (Snack, Beverage, Combo, Refrigerated, Micro-market)
- Brand/Model (text — hardware-agnostic, operator types their brand: "Micron VMGZ-WM22T2", "Crane 167", etc.)
- Year of manufacture
- Machine photo (upload placeholder)
- Notes

**Hardware tab:**
- Telemetry enabled toggle
- Telemetry provider (text field — agnostic: "Micron API", "Nayax", "CPI", etc.)
- Device ID for telemetry (text)
- Payment systems: toggles for Credit Card, NFC, QR Code, Cash
- Cabinet count (1 / 2 / 3)
- Total slot count (numeric)

**Location tab:**
- Assign to Location (searchable dropdown)
- Assign to Route (dropdown)
- Install date (date picker)
- Removal date (optional)

**Settings tab:**
- Low inventory alert threshold (% of capacity)
- Offline alert delay (5 min / 15 min / 30 min)
- Currency (dropdown — USD, EUR, GBP, AED, PKR, etc.)
- Tax rate (%)

---

### SCREEN 4: MACHINE DETAIL + PLANOGRAM
**Route:** `/app/machines/:id`
**Who sees it:** All roles

#### 4.4.1 Machine Header

Left: Machine photo | Machine name | Machine ID | Location link | Route badge | Status badge (Online/Offline) | Last ping: "2 min ago"

Right: Action buttons — **Edit Machine** | **Schedule Trip** | **View on Map** | **⋮ More** (Export Planogram, Copy Config, Decommission)

Below header: 5 quick-stat pills — Today's Revenue $124.50 | Fill Level 78% | Last Service 3 days ago | Total Products 42 | Open Alerts 2

#### 4.4.2 Tabs

**GENERAL** | **PLANOGRAM** | **ORDERS** | **MAINTENANCE** | **ENERGY** | **SETTINGS**

---

**GENERAL TAB:**
Two columns.

Left column:
- Machine details card (name, ID, type, brand/model, install date, serial #)
- Location card (location name, address, contact name, contact phone, working days/hours)
- Telemetry card (telemetry provider, connection status, last data sync timestamp)

Right column:
- Revenue this week: line chart (7 days)
- Top products sold (this machine): ranked list
- Recent alerts: last 5 alerts for this machine

---

**PLANOGRAM TAB (core machine management screen):**

This is SmartVendingOS's answer to both Micron's slot management AND VendSoft's planogram — and it must be better than both.

**Cabinet tabs:** Cabinet A | Cabinet B | Cabinet C
**Floor/Row tabs:** Floor 1 | Floor 2 | Floor 3

**Slot Grid (visual layout):**
Displayed as an actual visual grid matching the machine's physical layout. Each slot is a card showing:
- Slot number (e.g., A-01, A-02)
- Product thumbnail image
- Product name (truncated)
- Fill indicator bar (green/amber/red)
- Current qty / Max capacity (e.g., "8 / 10")
- Price ($1.50)
- Expiry date (if perishable) — amber if < 7 days, red if expired

Clicking any slot opens **Slot Detail Side Panel:**
- Slot number
- Product assigned (with "Change Product" button — opens product picker modal)
- Max capacity input
- Current inventory input (manual entry)
- Price (editable inline)
- Cost price (for P&L)
- Expiry date (date picker)
- Reorder point (trigger below this → flag for restock)
- Slot enabled/disabled toggle
- Motor status: Normal / Error (if telemetry available)
- Last restocked: date + technician name
- Sales history: units sold this week, this month

**Planogram toolbar (above grid):**
- "Batch Edit" button — select multiple slots, edit price/product/capacity at once
- "Fill All to Capacity" button — sets all inventory to max
- "Export Planogram" (Excel/CSV)
- "Copy from Machine" — applies another machine's planogram to this one
- Filter: Show All | Low Stock | Empty | Expired

**Summary bar (below grid):**
Total capacity: 240 | Current inventory: 187 | Fill %: 77.9% | Low stock slots: 4 | Empty slots: 1 | Expired: 0

---

**ORDERS TAB:**
Sales transaction list for this machine.
Columns: Date/Time | Product | Slot | Qty | Unit Price | Total | Payment Method | Status
Filters: Date range | Payment method | Status (Completed/Refunded/Failed)
Show 20 rows. Export button.

---

**MAINTENANCE TAB:**
Two sections:

Service History log:
- Date | Technician | Type (Restock / Repair / Cash Collection / Inspection) | Duration | Notes
- Show 10 records with "View Trip" links

Open Issues log:
- Issue | Reported | Status (Open/In Progress/Resolved) | Assigned To | "Resolve" button
- Show 2 open issues (Slot B-07 motor jam, screen brightness issue)

"+ Log Issue" button.

---

**ENERGY TAB:**
(Relevant for machines with energy monitoring capability)
- Power consumption chart: last 30 days daily kWh bar chart
- Current voltage/amperage (from telemetry)
- Screen & sound settings: brightness toggle + schedule, volume schedule
- Temperature settings: target temp (for refrigerated)
- Lighting schedule: on/off times
- Defogging schedule (for refrigerated)
- Alert thresholds: current overload, voltage high/low

---

**SETTINGS TAB:**
- Machine name (editable)
- Low stock threshold %
- Offline alert delay
- Currency
- Tax rate
- Shopping cart: enable/disable, max items
- Combine same-product slots toggle
- Parameter configuration (identical to Micron's Parameter Configuration)
- Danger zone: Decommission Machine (red button)

---

### SCREEN 5: LOCATIONS
**Route:** `/app/locations`

#### 4.5.1 Location List Page

Header: "Locations" + count (12) + "**+ Add Location**" button.
Search + filter (City / State / Type / Status).

Table columns: Location Name | Address | City | State | Machines (count) | Revenue MTD | Last Visit | Status | Actions.

Show 12 rows with varied cities/states.

#### 4.5.2 Location Detail Page
**Route:** `/app/locations/:id`

Tabs: **ADDRESS** | **CONFIG** | **MACHINES** | **MAP**

**ADDRESS Tab:**
- Location name
- Address Line 1, 2
- City, State/Province, ZIP, Country
- Contact Name, Contact Phone, Contact Email
- Working hours (schedule by day, like VendSoft)
- Working Days checkboxes (MON TUE WED THU FRI SAT SUN)
- Notes

**CONFIG Tab (copied from VendSoft, improved):**
- Commission section:
  - Commission Type dropdown: None / % of Sales / Flat Rate per Month / Per Transaction
  - Commission Value (number input)
- Tax Rates section:
  - Tax Type + Tax % → add multiple rows
- Service Pattern:
  - Dropdown: No Service Pattern / Weekly / Bi-weekly / Monthly / Custom
  - If Custom: set specific days/frequency

**MACHINES Tab:**
Table of all machines at this location. Columns: Machine ID | Name | Type | Installed On | Last Visit | Revenue MTD | Status. "+ Install Machine" button top right.

**MAP Tab:**
Embedded map centered on this location's coordinates. Shows pin at location address. All machines at this location shown as additional pins within the map. "Open in Full Map" link.

---

### SCREEN 6: INVENTORY
**Route:** `/app/inventory`

#### 4.6.1 Inventory Overview (Hub Page)

Three sub-nav tabs across the top: **Products** | **Reorder** | **Warehouses**

Top-level summary row:
- Total Products in Catalog: 48
- Total Units in Machines: 1,892
- Total Units in Warehouse: 624
- Products Below Reorder Point: 7 (amber)
- Out of Stock: 2 (red)

---

**PRODUCTS TAB:**

Full product catalog. Header: "Product Catalog" + "**+ Add Product**" button + search + filter (Type / Status / Tag).

Table columns: Checkbox | Product Image | Name | Code/UPC | Type | Tags | Price | Cost | In Machines (units) | In Warehouse | Reorder Point | Status | Actions.

"Visible Columns" toggle (like VendSoft).

**Add / Edit Product Form (full-page or large modal):**
- Product Name (text)
- Code / UPC / Barcode (text)
- Product Type (dropdown — links to configured types)
- Tags (multi-select — e.g., "Gluten-Free", "Vegan", "New")
- Unit Price ($)
- Cost Price ($)
- Units per Case (for purchasing)
- Reorder Point (alert when in-machine total falls below this)
- Order-Up-To Level (preferred max stock level to order up to)
- Min Quantity / Max Quantity
- Photo (upload placeholder)
- Description
- Active toggle
- Variety pack toggle (mark as bundle of other products)

---

**REORDER TAB:**

"Products to Reorder" — auto-generated list of products currently below their reorder point.

Table columns: Checkbox | Product | Type | In Machines | Reorder Point | In Warehouse | Units to Order | Supplier | Last Purchased | Action.

"Units to Order" is auto-calculated: Order-Up-To Level − (In Machines + In Warehouse).

Top right: "**+ Create Purchase Order**" button — pre-fills a PO from selected rows.

Export CSV/Excel.

---

**WAREHOUSES TAB:**

Warehouse stock management — how much stock is physically held in the operator's warehouse/van, before being loaded into machines.

Table columns: Product | In Warehouse | Allocated to Trips | Available | Units per Case | Storage Location | Last Updated.

"+ Adjust Stock" button — opens a stock adjustment modal (reason: received, used, damaged, correction).

---

### SCREEN 7: ROUTES
**Route:** `/app/routes`

#### 4.7.1 Route List

Header: "Routes" + count + "**+ Create Route**" button.

Table: Route Name | Machines Count | Assigned Driver | Frequency | Last Run | Next Scheduled | Est. Drive Time | Actions (View / Edit / Create Trip).

Show 5 routes with varied details.

#### 4.7.2 Route Detail
**Route:** `/app/routes/:id`

**Left panel (300px):**
- Route name (editable)
- Description
- Assigned driver (dropdown — team members)
- Service frequency (weekly / bi-weekly / monthly / custom)
- Estimated drive time: "1h 42min"
- Total distance: "38 miles"

**Machine stop list (ordered):**
Each stop row: drag handle (⠿) | stop number | machine name | location name | est. drive time from previous | "Remove" × button.

Action buttons below list: "**+ Add Machines**" | "**Optimize Route**" (re-orders stops for shortest total distance).

**Right side: Interactive Map**
Full-height map. Machine pins numbered (1, 2, 3...) matching the stop list. Route line drawn connecting them in order. When "Optimize Route" is clicked, the line redraws with an animation to the new optimal order.

Actions panel (top right of map): Edit | Save | **Create Trip from Route** | Print Directions | Export PDF.

---

### SCREEN 8: TRIPS
**Route:** `/app/trips`

#### 4.8.1 Trip List

Header: "Trips" + "**+ Create Trip**" button + "**Check Trip**" (verify pending trip results).

Filters: Date range | Driver | Status | Route | Location.

Table columns: Trip # | Date | Driver | Status | Cash Collected | Credit Card | Locations (count) | Machines (count) | Notes | Actions.

**Status values:**
- Created (gray)
- Posted / In Progress (blue)
- Completed (green)
- Cancelled (red)

Show 8 trips. Export CSV/Excel. Requeue button (duplicate a trip).

#### 4.8.2 Create Trip
**Route:** `/app/trips/create`

**Left panel (300px):**
- Date picker (required)
- Driver selector (dropdown — team members)
- Description / Notes (textarea)

Three action buttons below: "Add Locations" | "Add Machines" | "Add From Route"

Machine stop list (same drag-to-reorder as Route detail).

**Right side: Full-height Interactive Map**
- Machine pins appear as numbered stops when added.
- Unassigned machines shown as faded pins for easy addition.
- Right-side actions panel: **Save** | **Cancel** | **Add Locations** | **Add Machines** | **Add From Route** | **Optimize Trip** | **Print Pick List** | **Print Service Sheet** | **Duplicate Trip** | **Delete Trip**

#### 4.8.3 Trip Detail / Results Entry
**Route:** `/app/trips/:id`

This is where a manager or technician enters what actually happened on the trip. It's a two-panel layout.

**Top: Trip Header**
- Trip #1241155 — 2026-04-28 — Driver: John
- Status badge: Completed
- Actions: Edit | Duplicate | Print | Export

**Left panel: List of Machines**

Table columns: Machine | Type | Location | Cash Collected | Credit Card | Specified | Wrong Flag | Visit Time | Normally Late | Normally Early | Comments.

Total row at bottom: summed cash + credit card.

Each machine row is expandable → shows the slot-level product entry table:

**Slot Entry Table (expanded per machine):**
Columns: Column # | Product Name | Last Count | Current Count | Wastage | Slot # | Price | Cost | Last Fill | Max Capacity | Edit

Each product row is editable. "Current Count" field is pre-filled from telemetry or left blank for manual entry. Color highlight if current < reorder point.

**Right panel: DUES / Employee Lounge**
- Cash Collected: numeric field + Money Bag icon
- Comments textarea
- "Added Coins" / "Refunds" subtabs
- "+ Add" button for additional charges/credits

---

### SCREEN 9: PURCHASES
**Route:** `/app/purchases`

#### 4.9.1 Purchase List

Header: "Purchases" + "**+ Create Purchase**" button.

Table columns: Date | Invoice # | Supplier | # Products | # Units | Total Amount | Tax | Shipping Cost | Status (Received / Pending / Cancelled) | Notes | Actions.

Show 8 purchases with varied suppliers and statuses. Export CSV.

#### 4.9.2 Create / Edit Purchase Form

- Date (date picker)
- Invoice # (text)
- Supplier (searchable dropdown — from configured suppliers list)
- Shipping Cost ($)
- Notes

Product table:
Columns: Product (searchable dropdown) | Units per Case | # Cases | Total Units | Unit Cost | Total Cost | Remove

"+ Add Product" row button. Running total at bottom: Subtotal | Tax | Shipping | **Grand Total**.

"Save" | "Save & Receive" (marks as received, adds units to warehouse stock) | Cancel.

---

### SCREEN 10: EXPENSES
**Route:** `/app/expenses`

#### 4.10.1 Expense List

Header: "Expenses" + "**+ Create Expense**" button.

Filters: Date range | Category | Location | Machine.

Table columns: Date | Category | Amount | Payee | Location | Machine | Description | Actions.

Show 8 expenses: repairs, fuel, refunds, supplies, insurance. Export CSV. Total at bottom.

#### 4.10.2 Create / Edit Expense Form

- Category (dropdown: Fuel, Repairs & Maintenance, Refunds, Supplies, Insurance, Rent, Other)
- Date (date picker)
- Amount ($)
- Payee (text — who was paid)
- Description (textarea)
- Assign to Location (optional dropdown)
- Assign to Machine (optional dropdown)
- Receipt photo upload (placeholder UI only)
- Save | Cancel | Clone Expense | Delete Expense

---

### SCREEN 11: REPORTS HUB
**Route:** `/app/reports`

A hub page showing all available reports as cards, grouped by category.

#### 4.11.1 Report Categories & Cards

**SALES REPORTS:**
- Sales by Product — units sold, revenue by product, period comparison
- Sales by Location — revenue contribution by location
- Sales by Machine — per-machine performance
- Sales by Product Type — category breakdown (donut + table)
- Daily Sales (Telemetry) — day-by-day chart

**FINANCIAL REPORTS:**
- Profit & Loss — Revenue − COGS − Expenses = Net Income, with period comparison
- Cash Flow — cash in (sales) vs cash out (COGS + expenses), net cash
- Expenses Breakdown — by category + payee
- Commission Report — per-location commissions owed

**OPERATIONAL REPORTS:**
- Inventory Levels — current stock across all machines + warehouses
- Products to Reorder — same as inventory hub reorder tab, printable
- Machine Performance — revenue per machine, fill rate, visit frequency
- Route Efficiency — distance per trip, cost per stop

**DRIVER REPORTS:**
- Mileage Log — per driver, trip-by-trip mileage record (for tax/reimbursement)
- Driver Activity — trips completed, machines serviced, cash collected

Each card has: Icon | Title | Description | "Generate Report" button | "Last exported: [date]".

#### 4.11.2 Report Viewer (shared layout for all reports)

When generating any report, it opens in a full-page viewer:

- Report title + description
- Date range picker + Apply button
- Quick periods: Today / This Week / This Month / Last Month / This Quarter / Custom
- Filter dropdowns (varies by report: Machine / Location / Driver / Product Type)
- Export buttons: **Export Excel** | **Export CSV** | **Print**

**Profit & Loss Report (detailed layout):**

```
REVENUE
  Sales Revenue:          $18,430.00
  Refunds:               − $320.00
  Net Revenue:            $18,110.00

COST OF GOODS SOLD
  Product Cost:          − $8,240.00
  Gross Profit:           $9,870.00   (54.5% margin)

OPERATING EXPENSES
  Fuel:                  − $380.00
  Repairs & Maintenance: − $250.00
  Commissions Paid:      − $920.00
  Refunds Processed:     − $320.00
  Other:                 − $140.00
  Total Expenses:        − $2,010.00

NET INCOME:              $7,860.00   (43.4% margin)
```

Charts below: Monthly Net Income trend (bar chart, 12 months) + Expense breakdown donut.

**Cash Flow Report:**
Monthly bar chart: Cash In (blue) vs Cash Out (red). Net cash line overlay. Table below with monthly rows.

**Mileage Log (VendSoft has this, we improve it):**
Table: Date | Driver | Trip # | Starting Location | Ending Location | Miles/KM | Purpose | Reimbursement ($). Export to CSV for tax purposes. Total miles + total reimbursement at bottom.

---

### SCREEN 12: AI INSIGHTS HUB
**Route:** `/app/insights`
**Available on:** Pro + Enterprise plans

This screen has no equivalent in VendSoft or Micron. It is a major differentiator.

#### 4.12.1 Hub Overview

Banner at top: "AI Insights — Powered by your sales history and inventory data. Updated daily."

Three module cards linking to sub-screens:

**Demand Forecast** — "Know what will run out before it does. Predictions for next 7, 14, and 30 days."
**Restock Recommendations** — "Optimal quantities and timing for your next trips."
**Anomaly Detection** — "Unusual patterns flagged automatically — revenue drops, offline machines, slow sellers."

#### 4.12.2 Demand Forecast
**Route:** `/app/insights/forecast`

**Machine/Product filter** at top. Date range: 7 days / 14 days / 30 days.

**Forecast Table:**
Columns: Product | Machine | Current Stock | Predicted Daily Sales | Days Until Stockout | Confidence | Recommended Restock Date | Action.

Color coding:
- 🔴 "Stockout in < 3 days" — critical
- 🟡 "Stockout in 4–7 days" — warning
- 🟢 "Stockout in > 7 days" — healthy

Clicking a product row opens a **Forecast Detail Panel:**
- Historical sales chart (actual) overlaid with predicted line
- Seasonality notes (e.g., "Beverages sell 40% more on warm days")
- Confidence interval band on forecast line
- "Add to upcoming trip" button

#### 4.12.3 Restock Recommendations
**Route:** `/app/insights/recommendations`

For each upcoming trip, the system recommends exactly what to load and how many units.

Trip selector dropdown at top.

**Recommendation Table:**
Machine | Slot | Product | Current Qty | Recommended Qty to Load | Priority (High/Med/Low).

Summary at bottom: "Total units to load: 284 across 4 machines."

"**Generate Pick List**" button — exports a printable checklist for the technician to use when loading their van.

#### 4.12.4 Anomaly Detection
**Route:** `/app/insights/anomalies`

Active anomalies feed:

Each anomaly card:
- Type icon (Revenue Drop / Machine Offline / Slow Seller / Unusual Spike)
- Title: "CD003 — Revenue dropped 64% vs 7-day average"
- Detail: "Average daily revenue: $89. Yesterday: $32. Possible cause: machine offline 4 hours."
- Timeline: "Detected 6 hours ago"
- Actions: "Investigate" (links to machine detail) | "Dismiss"

Historical anomaly log (table): Date | Machine | Type | Description | Status (Active/Dismissed/Resolved).

---

### SCREEN 13: PROMOTIONS & LOYALTY HUB
**Route:** `/app/promotions`
**Available on:** Pro + Enterprise plans

This entire section has no equivalent in VendSoft or Micron.

#### 4.13.1 Hub Overview

Two sub-sections: **Campaigns** | **Loyalty Program**

Summary stats bar:
- Active Campaigns: 2
- Loyalty Members: 1,247
- Redemptions This Month: 89
- Revenue from Promoted Products: $2,340 (+18% vs last month)

---

**CAMPAIGNS TAB:**
**Route:** `/app/promotions/campaigns`

Header: "Campaigns" + "**+ Create Campaign**" button.

Campaign list (card layout):
Each card: Campaign name | Status badge (Active/Scheduled/Ended) | Machines: 5 | Products: 3 | Discount: 20% | Start – End dates | Redemptions: 47 | Revenue impact: +$340 | Edit / End / Duplicate buttons.

**Create / Edit Campaign Form:**
- Campaign Name
- Campaign Type dropdown:
  - **Percentage Discount** — e.g., 20% off selected products
  - **Fixed Price** — e.g., any item for $1.00
  - **Buy X Get Y** — buy 2 get 1 free
  - **Time-Based Flash Sale** — discount only during specific hours (e.g., 2pm–4pm daily)
  - **Bundle Deal** — e.g., snack + drink = $2.50
- Applies To:
  - All machines / Specific machines (multi-select) / Specific locations
- Products: multi-select from catalog
- Discount value / parameters
- Start date + End date + Time range (optional)
- Max redemptions per machine per day (optional cap)
- Campaign image (for kiosk screen display — upload placeholder)
- Active toggle
- Save | Cancel

---

**LOYALTY PROGRAM TAB:**
**Route:** `/app/promotions/loyalty`

**Program Overview:**
- Program name (editable): "SmartPoints"
- Status: Active (toggle to pause)
- Members: 1,247 enrolled
- Points currency: 1 point = $0.01 spend
- Points earned: 1 point per $1 spent (configurable)

**Rewards Table:**
Columns: Reward Name | Points Required | Value | Times Redeemed | Active Toggle | Edit.
Show 4 rewards: e.g., "Free Drink" (150 pts), "10% Off Next Purchase" (100 pts), "Free Snack" (120 pts), "Enter Prize Draw" (50 pts).

"+ Add Reward" button.

**Members Table:**
Columns: Member ID (anonymized) | Join Date | Lifetime Spend | Points Balance | Last Activity | Status.
Show 10 rows.

**How it works panel (explainer for the demo):**
"Customers scan a QR code at the machine after purchase → they earn points → they redeem at the kiosk on their next visit. No app download required — web-based loyalty."

---

### SCREEN 14: TEAM MANAGEMENT
**Route:** `/app/team`

#### 4.14.1 Team Members List

Header: "Team" + count + "**+ Invite Member**" button.

Table columns: Avatar | Name | Email | Role | Assigned Routes | Status | Last Active | Actions.

**Roles:**
- **Admin** — full access to everything
- **Manager** — full access except billing/subscription
- **Dispatcher** — can create and manage trips, routes; view-only for finances
- **Technician** — mobile app access only; can log restocks, cash collection, service reports
- **Viewer** — read-only access to dashboard and reports

Show 6 team members with varied roles and statuses.

#### 4.14.2 Invite Member Modal

- Email address (text)
- Role (dropdown)
- Assign to Routes (multi-select — optional, for technicians)
- Personal note (appears in the invitation email)
- Send Invite button

#### 4.14.3 Edit Member Panel (slides in)

- Name (editable)
- Role (dropdown — admin can change)
- Assigned Routes (multi-select)
- Status (Active / Suspended)
- Permissions override (Pro/Enterprise only): show a permissions matrix (rows = modules, columns = View/Create/Edit/Delete) with toggles — most are role-locked, some overridable.

---

### SCREEN 15: CONFIGURATION
**Route:** `/app/configuration`

Left sidebar sub-navigation within configuration:

**PRODUCT TYPES** | **TAG TYPES** | **SUPPLIERS** | **VARIETY PACKS** | **CUSTOM FIELDS** | **VEHICLES / TRUCKS** | **WAREHOUSES** | **COLUMN MAPS** | **TELEMETRY** | **COMMON PROBLEMS**

---

**PRODUCT TYPES:**
Table: Name | Products Count | Edit/Delete. "**+ Create Product Type**" button.
Show: Beverage, Snack, Food, Hot Drink, Ingredient, Health & Beauty.

---

**TAG TYPES:**
Table: Tag Name | Color swatch | Products Count | Edit. "**+ Create Tag**" button.
Show: New, Vegan, Gluten-Free, Best Seller, Clearance.

---

**SUPPLIERS:**
Table: Supplier Name | Contact | Phone | Email | Products Supplied | Last Order | Edit/Delete. "**+ Add Supplier**" button.
Show: Walmart Supercenter, Norman Sam's Club, McLane Foodservice.

---

**VARIETY PACKS:**
Table: Pack Name | Included Products | Total Pack Price | Edit. "**+ Create Variety Pack**" button.
Used for "buy X + Y together" combos.

---

**CUSTOM FIELDS:**
Table: Field Name | Applies To (Machine / Product / Location / Trip) | Type (text/number/date/boolean) | Required | Edit.
"**+ Add Custom Field**" button. Allows operators to add their own metadata fields.

---

**VEHICLES / TRUCKS:**
Table: Vehicle Name | License Plate | Manufacturer | Model | Year | Driver Assigned | Status | Edit.
"**+ Create Truck**" button.
Used for mileage tracking — each trip can be assigned a vehicle.

---

**WAREHOUSES:**
Table: Warehouse Name | Address | Contact | Products Stored | Total Units | Edit.
"**+ Add Warehouse**" button.
Show: Main Warehouse, Van Stock (Route A Driver).

---

**COLUMN MAPS:**
Advanced feature — maps column names in CSV/Excel imports to the system's field names.
Used when importing product catalogs or inventory data from other systems.

---

**TELEMETRY:**
Manage telemetry provider integrations.
Table: Provider Name | API Status | Connected Machines | Last Sync | Edit / Disconnect.
"**+ Connect Provider**" button.
Show: "Micron API" (Connected, 24 machines), "Nayax" (Not connected — example of hardware-agnostic design).

---

**COMMON PROBLEMS:**
Pre-defined issue types for the service report on mobile app.
Table: Problem Name | Category (Hardware/Software/Inventory) | Default Priority | Edit.
"**+ Add Problem**" button.
Show: Motor Jam, Screen Not Working, Card Reader Failure, Machine Offline, Door Won't Close, Low Temperature Alert.

---

### SCREEN 16: ACCOUNT SETTINGS
**Route:** `/app/settings`

Left sub-navigation: **Profile** | **Company** | **Subscription** | **Notifications** | **Integrations** | **Security**

---

**PROFILE:**
- Name, email, avatar upload, timezone, language (English default), currency display preference.

---

**COMPANY:**
- Company name, logo upload, address, website, tax ID (optional), default currency, default units (miles/km).

---

**SUBSCRIPTION:**
Current plan displayed prominently:
- Plan name: **Pro** ✦
- Billing: Monthly ($79/month, next billing: June 12, 2026)
- Machines used: 24 / 100
- Users: 6 / 10
- Progress bars for usage limits.

Upgrade/Downgrade buttons. "Manage Billing" link (simulated). Plan comparison table.

---

**NOTIFICATIONS:**
Toggle matrix:
| Event | Email | In-App | SMS (Pro+) |
|---|---|---|---|
| Machine goes offline | ✅ | ✅ | ✅ |
| Low stock alert | ✅ | ✅ | ❌ |
| Trip completed | ❌ | ✅ | ❌ |
| New anomaly detected | ✅ | ✅ | ❌ |
| Purchase received | ✅ | ✅ | ❌ |
| Weekly summary report | ✅ | ❌ | ❌ |

---

**INTEGRATIONS:**
Cards for available integrations (demo UI — no actual connections needed):
- QuickBooks (accounting) — "Connect" button
- Xero (accounting) — "Connect" button
- Nayax (payment/telemetry) — "Connect" button
- CPI (payment) — "Connect" button
- Slack (notifications) — "Connect" button
- Zapier — "Connect" button
- REST API — "View API Keys" button (shows a key with copy button)

---

**SECURITY:**
- Change password form
- Two-factor authentication toggle (2FA via email)
- Active sessions list: device, location, last active, "Revoke" button
- Activity log (last 20 login events)

---

## 5. MOBILE COMPANION APP

These screens are displayed at **390px wide** (phone-optimized) at route `/mobile/`. Field technicians access this on their phone browser or installed PWA.

The mobile app has its own distinct bottom tab navigation:
```
[Today] [Map] [Machines] [Reports] [Profile]
```

---

### MOBILE SCREEN 1: TODAY'S TRIP OVERVIEW
**Route:** `/mobile/`

**Header:** "Good morning, John 👋" | Date | Avatar

**Today's Trip Card (prominent):**
- Trip #1241158
- Assigned date: Today
- Status: In Progress
- Progress: 3 of 6 stops completed (progress bar)
- "**Continue Trip →**" button (large, blue)

**Quick Stats (2×2 grid):**
- Stops Today: 6
- Machines Serviced: 3
- Cash Collected: $342.00
- Products Restocked: 128 units

**Alerts for Today (collapsible card):**
- CD003: Slot B-07 motor jam reported — needs inspection
- WF002: Low stock on Coca-Cola (2 units) — priority restock

**Upcoming Trips (this week):**
List of 2–3 upcoming trips with date + machine count.

---

### MOBILE SCREEN 2: ACTIVE TRIP — STOP LIST + MAP
**Route:** `/mobile/trips/:id`

**Header:** Trip # + date | Driver name | Status badge.

**Tab bar:** LIST | MAP

**LIST TAB:**
Stop list (numbered, ordered):

Each stop row:
- Stop number circle (green if done, blue if current, gray if upcoming)
- Machine name
- Location name
- Address
- Status: Done ✅ / In Progress 🔵 / Upcoming ⏳
- Tapping navigates to stop detail.

"**Navigate to Next Stop**" sticky button at bottom → opens device maps app (Google Maps / Apple Maps) with address pre-filled.

**MAP TAB:**
Full-height map with numbered pins. Current stop highlighted with a pulsing ring. Completed stops shown in gray. Route line drawn in order. User's current GPS location shown (placeholder dot). "Navigate" button at bottom.

---

### MOBILE SCREEN 3: MACHINE STOP DETAIL
**Route:** `/mobile/stops/:id`

**Machine header:**
- Machine name + ID
- Location name + address
- Status: Online/Offline badge
- Last service: 14 days ago
- "**Directions**" button

**Action Buttons (large, full-width):**
1. 📦 **Restock Machine** → navigates to restock entry
2. 💵 **Collect Cash** → navigates to cash collection
3. 🔧 **Log Service Issue** → navigates to service report
4. ✅ **Mark Stop Complete** → marks this stop as done, returns to trip list

**Current Inventory Summary (collapsible):**
Compact slot list: slot number | product name | current qty / capacity. Low stock rows highlighted amber.

**Notes from previous visit:**
(Shows any comments left by the technician on the last trip)

---

### MOBILE SCREEN 4: RESTOCK ENTRY
**Route:** `/mobile/stops/:id/restock`

**Header:** "Restock — [Machine Name]"

For each product/slot, a scrollable form:

Each product row (card):
- Slot number badge
- Product thumbnail
- Product name
- Last count: 4
- "**Current Count**" numeric stepper (+ and − buttons, large touch targets, or keyboard input)
- Max capacity: 10
- "Filled to capacity" quick-fill toggle

Pre-fills from telemetry if available; otherwise blank for manual entry.

At bottom:
- **Notes** textarea (free text)
- **"Save Restock"** button (large, blue)
- Quick actions: "Fill All to Max" | "Use Recommended Quantities"

---

### MOBILE SCREEN 5: CASH COLLECTION
**Route:** `/mobile/stops/:id/cash`

**Header:** "Cash Collection — [Machine Name]"

- **Cash Amount** input ($): large numeric keypad
- **Credit Card Amount** input ($): (from terminal report if available, otherwise manual)
- **Coins Amount** input ($)
- **Notes** textarea
- Photo of cash (camera icon — placeholder tap action)
- **"Record Collection"** button

Running total: "Total Collected: $142.50"

---

### MOBILE SCREEN 6: SERVICE REPORT
**Route:** `/mobile/stops/:id/service`

**Header:** "Log Issue — [Machine Name]"

- **Problem Type** (dropdown from configured Common Problems: Motor Jam / Screen Issue / Card Reader / etc.)
- **Slot Affected** (optional — dropdown of slot numbers)
- **Priority** radio: Low / Medium / High / Critical
- **Description** (textarea)
- **Photo** (camera icon — placeholder)
- **Status** (for re-visits): Open / In Progress / Resolved
- **"Submit Report"** button

---

### MOBILE SCREEN 7: ALL MACHINES (Quick Lookup)
**Route:** `/mobile/machines`

Search bar at top. Compact machine list:
Each row: Machine name | Location | Status dot (green/red) | Fill bar | "Open" arrow.

Tapping opens a simplified machine detail: inventory summary + last visit + current alerts. A "Start Service" button leads to the stop detail flow.

---

## 6. DEMO DATA SPECIFICATION

All demo data must be cohesive — same company, same machines, same routes across all screens.

### 6.1 Company Profile (Demo Company)

- **Company Name:** Peak Vending Solutions
- **Plan:** Pro
- **Location:** Oklahoma City, OK, USA
- **Currency:** USD ($)
- **Fleet Size:** 26 machines across 5 locations

### 6.2 Machines (26 total — show 8 in detail)

| ID | Name | Location | Type | Status | Fill % | Revenue MTD |
|---|---|---|---|---|---|---|
| CD001 | Cold drink multiplace | Crystal Clean | Beverage | Online | 88% | $1,820 |
| CD002 | Cold drink employee | Crystal Clean | Beverage | Online | 72% | $1,240 |
| CD003 | Cold drink multiplex | Crystal Clean | Combo | Offline | 0% | $480 |
| WF001 | Wells Fargo Snack | Wells Fargo Bank | Snack | Online | 45% | $2,140 |
| WF002 | Wells Fargo Drink | Wells Fargo Bank | Beverage | Online | 31% | $1,920 |
| WF003 | Wells Fargo Combo | Wells Fargo Bank | Combo | Online | 67% | $1,680 |
| IA001 | Insurance Agency | Insurance Agency | Combo | Online | 82% | $980 |
| OR001 | Omega Retreat Main | Omega Retreat | Snack | Online | 55% | $1,540 |

### 6.3 Locations (5)

| Name | Address | City | Machines | Commission |
|---|---|---|---|---|
| Crystal Clean | 1234 W. Lindsey Street | Norman, OK 73069 | 4 | 8% of sales |
| Insurance Agency | 503 Eastern Parkway | Tulsa, OK 73084 | 2 | $50/month |
| Omega Retreat | 905 S Highway 152 | Mustang, OK 73064 | 5 | 10% of sales |
| Wells Fargo Bank | 127 Elm Drive | Edmond, OK 73084 | 8 | No commission |
| Crystal Clean II | 89 Industrial Ave | Moore, OK 73160 | 7 | 5% of sales |

### 6.4 Products (12 for demo)

| Name | Type | Price | Cost | UPC | Reorder Pt |
|---|---|---|---|---|---|
| Coca-Cola 12 oz can | Beverage | $1.25 | $0.42 | 049000028904 | 50 |
| Mountain Dew 12 oz can | Beverage | $1.25 | $0.42 | 012000001529 | 40 |
| Pepsi 12 oz can | Beverage | $1.25 | $0.42 | 012000800834 | 40 |
| 3 Musketeers Candy Bar | Snack | $1.50 | $0.52 | 040000004356 | 30 |
| Doritos Nacho Cheese | Snack | $1.75 | $0.65 | 028400090360 | 100 |
| Fritos Corn Chips | Snack | $1.75 | $0.60 | 028400090391 | 100 |
| Wrigley's Doublemint Gum | Snack | $0.75 | $0.22 | 022000010292 | 20 |
| Snickers Bar | Snack | $1.50 | $0.55 | 040000001041 | 30 |
| Tropicana OJ 11.5 oz | Beverage | $2.25 | $0.98 | 048500208434 | 20 |
| Red Bull 8.4 oz | Beverage | $3.50 | $1.62 | 611269993056 | 15 |
| Nature Valley Granola Bar | Snack | $1.75 | $0.72 | 016000275287 | 25 |
| Lay's Classic Chips | Snack | $1.75 | $0.62 | 028400315586 | 80 |

### 6.5 Routes (3)

| Name | Driver | Machines | Frequency | Est. Time |
|---|---|---|---|---|
| Route A — North | John | 8 | Weekly | 2h 15min |
| Route B — South | Maria | 9 | Bi-weekly | 3h 45min |
| Route C — Central | Bob | 9 | Weekly | 1h 50min |

### 6.6 Team Members (6)

| Name | Role | Status |
|---|---|---|
| Alex Johnson | Admin | Active |
| John Martinez | Technician (Route A) | Active |
| Maria Chen | Technician (Route B) | Active |
| Bob Williams | Dispatcher | Active |
| Sarah Davis | Manager | Active |
| Mike Brown | Viewer | Active |

---

## 7. SCREENS SUMMARY TABLE

| # | Screen | Route | Platform | Priority |
|---|---|---|---|---|
| — | Landing Page | / | Web | P0 |
| — | Pricing Page | /pricing | Web | P0 |
| — | Login Page | /login | Web | P0 |
| 1 | Executive Dashboard | /app/dashboard | Desktop | P0 |
| 2 | Live Fleet Map | /app/map | Desktop | P0 |
| 3 | Machine List | /app/machines | Desktop | P0 |
| 4 | Machine Detail + Planogram | /app/machines/:id | Desktop | P0 |
| 5 | Locations List + Detail | /app/locations | Desktop | P0 |
| 6 | Inventory Hub (Products/Reorder/Warehouse) | /app/inventory | Desktop | P0 |
| 7 | Routes List + Detail + Map | /app/routes | Desktop | P0 |
| 8 | Trips List + Create + Results Entry | /app/trips | Desktop | P0 |
| 9 | Purchases | /app/purchases | Desktop | P1 |
| 10 | Expenses | /app/expenses | Desktop | P1 |
| 11 | Reports Hub (P&L, Cash Flow, Sales, Mileage) | /app/reports | Desktop | P0 |
| 12 | AI Insights (Forecast, Recommendations, Anomalies) | /app/insights | Desktop | P0 |
| 13 | Promotions & Loyalty | /app/promotions | Desktop | P1 |
| 14 | Team Management | /app/team | Desktop | P1 |
| 15 | Configuration (all sub-sections) | /app/configuration | Desktop | P1 |
| 16 | Account Settings | /app/settings | Desktop | P2 |
| M1 | Today's Trip (mobile) | /mobile/ | Mobile | P0 |
| M2 | Active Trip Map + Stop List | /mobile/trips/:id | Mobile | P0 |
| M3 | Machine Stop Detail | /mobile/stops/:id | Mobile | P0 |
| M4 | Restock Entry | /mobile/stops/:id/restock | Mobile | P0 |
| M5 | Cash Collection | /mobile/stops/:id/cash | Mobile | P1 |
| M6 | Service Report | /mobile/stops/:id/service | Mobile | P1 |
| M7 | All Machines (mobile lookup) | /mobile/machines | Mobile | P2 |

---

## 8. KEY "WOW" MOMENTS FOR DEMO WALKTHROUGH

These are the specific interactive moments that must work in the demo to make the strongest impression:

1. **Dashboard date range toggle** — clicking "30 days" vs "7 days" updates all charts simultaneously with smooth transitions.
2. **Live Fleet Map** — All 26 machine pins visible. Clicking a red (offline) pin shows "CD003 — Offline 4h 23m — Last revenue: $32 yesterday." Clicking a low-stock amber pin shows "WF002 — 31% filled — Restock recommended."
3. **Route Optimizer** — In Route Detail, clicking "Optimize Route" redraws the map line with an animation, showing the total distance decrease from "52 miles → 38 miles, saving 27%."
4. **AI Forecast** — In Demand Forecast, filtering to "Coca-Cola at WF002" shows "Stockout predicted in 2 days" with a chart showing the declining inventory line meeting zero.
5. **Trip Results Entry** — Expanding a machine row in Trip Results shows the product-level table with "Current Count" fields that — when changed — auto-highlight the row if below reorder point.
6. **Planogram slot click** — Clicking an amber slot on the planogram opens the side panel with a price field that is immediately editable inline, with a "Save" confirmation toast.
7. **Mobile Trip** — On the mobile screen, tapping "Navigate to Next Stop" pops a mock toast: "Opening Google Maps to 1234 W. Lindsey Street..."
8. **Promotions campaign creation** — Selecting "Flash Sale" type reveals a time picker showing "Discount active: 2:00pm — 4:00pm daily" — demonstrates sophisticated promotion logic.
9. **P&L report** — Clicking "Export Excel" shows a brief progress bar then a download toast — reinforces that this is a production-ready platform.
10. **Subscription/Plan page** — The current plan card with the usage bars (24/100 machines, 6/10 users) should feel like a real SaaS product dashboard.

---

## 9. HOW VERSION 2 BEATS VENDSOFT (Demo Talking Points)

| VendSoft Limitation | SmartVendingOS Advantage | Where it Shows |
|---|---|---|
| No live fleet map overview | Live Fleet Map with colored pins, heatmap toggle | Screen 2 |
| Trip entry is a dense, confusing table | Clean mobile trip execution + separate cash collection screen | Mobile M2–M5 |
| No mobile companion app | Full mobile PWA with GPS navigation, restock entry, service reports | Mobile section |
| Dashboard is basic and dated | Modern executive dashboard with AI alert sidebar, 5 KPI cards, interactive charts | Screen 1 |
| No AI/predictive features | Demand forecast, restock recommendations, anomaly detection | Screen 12 |
| No promotions or loyalty | Campaigns engine + loyalty points program | Screen 13 |
| Route optimization is manual | One-click route optimizer with distance savings calculation | Screen 7 |
| No planogram visual (just a table) | Visual slot-grid planogram with fill indicators and inline editing | Screen 4 |
| Multi-currency not supported | Currency configurable per machine/company, global by design | Screen 3 |
| No telemetry provider management | Hardware-agnostic telemetry config for any provider | Screen 15 |
| Mileage log is standalone, basic | Mileage integrated into Reports Hub, linked to trips and vehicles | Screen 11 |
| No team roles beyond basic | 5 roles with fine-grained permission overrides | Screen 14 |

---

*Document prepared by Remote Augment (RA) — SmartVendingOS.com*
*For internal use and AI code generation reference only.*
*Version 1.0 — May 2026*
