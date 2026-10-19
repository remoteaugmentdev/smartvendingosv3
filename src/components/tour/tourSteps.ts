// ─────────────────────────────────────────────────────────────────────────────
// Journey Mode - tour step config
//
// This is the ONLY file you edit to change the walkthrough. The narration card
// (TourOverlay.tsx) reads this list and never needs to change when the flow does.
//
// Each step:
//   route  - the page the tour navigates to for this step
//   title  - short heading shown in the card
//   body   - detailed, benefit-led explanation of what the page/section does
//   target - (optional) CSS selector for the element to gently ring. Append
//            " @N" to pick the Nth match, e.g. "main table @3". If omitted, the
//            first real content block on the page is ringed.
//   click  - (optional) CSS selector (same " @N" syntax) of an element to click
//            when the step opens - used to reveal in-page views like the machine
//            tabs before ringing their content.
//
// The tour is a light, non-blocking narration: it navigates to each page, leaves
// the real page fully visible and usable, rings the relevant content, and
// explains the benefit in a corner card.
//
// NOTE: /routes/[id], /locations/[id] and /trips/[id] are deliberately omitted -
// they currently render the wrong screen (see DEMO_SCRIPT.md). Add them here once
// those pages are fixed.
// ─────────────────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string
  route: string
  title: string
  body: string
  target?: string
  click?: string
}

const MACHINE_TABS = 'main .flex-wrap.gap-1 button'
const MACHINE_TAB_CONTENT = 'main .flex-wrap.gap-1 + *'

export const TOUR_STEPS: TourStep[] = [
  // ── Dashboard, section by section ──────────────────────────────────────────
  {
    id: 'dashboard-kpis',
    route: '/dashboard',
    target: 'main .grid-cols-2',
    title: 'Dashboard: your business in one glance',
    body: 'The moment you sign in, the numbers that matter are already here. Month-to-date gross revenue and net income, how many machines are online right now, restocks pending, trips run, and low-stock alerts. No reports to build, no spreadsheets to reconcile. You know exactly where the operation stands in three seconds, and every card is a shortcut into the detail behind it.',
  },
  {
    id: 'dashboard-financials',
    route: '/dashboard',
    target: 'main .recharts-surface',
    title: 'See profit, not just sales',
    body: 'A full profit-and-loss breakdown sits next to your weekly revenue trend and a revenue-mix donut. You can see gross versus net, where margin is leaking to COGS, commission and refunds, and whether the week is trending up. It is the kind of finance visibility most operators only get from an accountant weeks later.',
  },
  {
    id: 'dashboard-orders',
    route: '/dashboard',
    target: 'main table @1',
    title: 'Every sale, as it happens',
    body: 'A live feed of the latest transactions across the whole fleet, showing product, machine, status, refunds and amount. If a machine starts failing payments or refunding, you spot it here in real time instead of discovering it on next month’s statement.',
  },
  {
    id: 'dashboard-top-products',
    route: '/dashboard',
    target: 'main table @2',
    title: 'Know your winners',
    body: 'Your best-selling products ranked by revenue or by units, with one toggle. This is what tells you which lines to keep stocked everywhere, which to drop, and where to negotiate better supplier pricing because the volume is there.',
  },
  {
    id: 'dashboard-top-machines',
    route: '/dashboard',
    target: 'main table @3',
    title: 'Spot your best and worst sites',
    body: 'The same ranking for machines, with today’s revenue and status side by side. Your strongest earners and your dead weight stand out instantly, so you know where to add capacity and which locations are not paying their rent.',
  },
  {
    id: 'dashboard-devices',
    route: '/dashboard',
    target: 'main table @4',
    title: 'The whole fleet, searchable',
    body: 'Every machine in one filterable table, with status, last ping, today’s revenue and product expiry, plus one-click CSV export for your accountant or investor deck. Everything you would normally chase across multiple systems, in a single exportable view.',
  },

  // ── Fleet & machines ───────────────────────────────────────────────────────
  {
    id: 'machines',
    route: '/machines',
    title: 'Manage the entire fleet',
    body: 'Every machine as a clean, searchable list. Filter by route, find one by name, ID or location, check income today, and flip a machine online or offline in a tap. This is fleet control that scales from eight machines to eight hundred without changing how you work.',
  },
  {
    id: 'machine-detail',
    route: '/machines/CD001',
    target: 'main .grid-cols-2',
    click: `${MACHINE_TABS} @1`,
    title: 'Drill into a single machine',
    body: 'Open any machine and you get its whole story. These quick stats (today’s revenue, fill level, slot count, open alerts, last ping) sit above six tabs covering everything about this one cabinet. Let’s walk through them.',
  },
  {
    id: 'machine-planogram',
    route: '/machines/CD001',
    target: MACHINE_TAB_CONTENT,
    click: `${MACHINE_TABS} @2`,
    title: 'Planogram: the cabinet, digitally',
    body: 'The visual planogram lays out every slot exactly as it sits in the machine, with current stock, price, product and fill bar, and low or empty slots flagged in colour. Your driver knows precisely what to load before they leave the depot, so no trip is wasted and no slot sits empty earning nothing.',
  },
  {
    id: 'machine-orders',
    route: '/machines/CD001',
    target: MACHINE_TAB_CONTENT,
    click: `${MACHINE_TABS} @3`,
    title: 'Orders: every transaction, per machine',
    body: 'A complete transaction history for this machine, with date, product, slot, payment method, amount and status. When a customer disputes a charge or a slot looks like it is under-selling, the evidence is right here, down to the individual vend.',
  },
  {
    id: 'machine-maintenance',
    route: '/machines/CD001',
    target: MACHINE_TAB_CONTENT,
    click: `${MACHINE_TABS} @4`,
    title: 'Maintenance: service on the record',
    body: 'Full service history plus open issues like motor jams or screen faults, each with a status. Nothing gets forgotten between visits, warranty conversations are backed by records, and recurring faults on a machine become obvious before they cost you a location.',
  },
  {
    id: 'machine-energy',
    route: '/machines/CD001',
    target: MACHINE_TAB_CONTENT,
    click: `${MACHINE_TABS} @5`,
    title: 'Energy: run leaner',
    body: 'Power consumption trends alongside lighting schedules, screen brightness and cooling targets. Vending machines run around the clock, so trimming energy on the ones that do not need full cooling overnight goes straight to your bottom line, and to your sustainability reporting.',
  },
  {
    id: 'machine-settings',
    route: '/machines/CD001',
    target: MACHINE_TAB_CONTENT,
    click: `${MACHINE_TABS} @6`,
    title: 'Settings: tune each machine',
    body: 'Per-machine controls for name, low-stock threshold, currency and tax rate, plus a safe decommission path. Every machine can behave exactly as its location demands without touching the rest of the fleet.',
  },

  // ── Routes, trips & locations ──────────────────────────────────────────────
  {
    id: 'routes',
    route: '/routes',
    title: 'Routes: plan the shortest run',
    body: 'Group machines into technician routes, set who runs each one, and optimize in a single click to cut drive time and mileage. Fuel and labour are the biggest controllable costs in vending, so shaving miles off every route compounds into real savings across the year.',
  },
  {
    id: 'trips',
    route: '/trips',
    title: 'Trips: accountability on every run',
    body: 'A record of every restock run: which machines were serviced, what was refilled and how much cash was collected. Cash handling is where money quietly goes missing in this business, so logging it slot by slot per trip closes that gap and rolls straight into your financials.',
  },
  {
    id: 'trips-create',
    route: '/trips/create',
    title: 'Build a trip visually',
    body: 'Plan a new run right on the map. Add machine stops, sequence them, and the route is laid out for the shortest drive. Dispatching a trip takes seconds instead of a phone call and a paper list, and the driver leaves with a clear plan.',
  },
  {
    id: 'locations',
    route: '/locations',
    title: 'Locations: know every site’s worth',
    body: 'Every site you operate in, the machines placed there, and the commission terms that apply. When it is time to renew a contract or walk away, you can see exactly what each location earns you versus what it costs, so you stop subsidising dead sites out of your winners.',
  },

  // ── Catalog & stock ────────────────────────────────────────────────────────
  {
    id: 'inventory',
    route: '/inventory',
    title: 'Inventory: see shortages before they cost you',
    body: 'Live stock levels across every machine in one place, with per-machine drill-down and refill actions. Spotting what is running low before a slot empties is the single biggest lever on vending revenue, because a full slot sells and an empty one earns nothing.',
  },
  {
    id: 'inventory-shortage',
    route: '/inventory/shortage',
    title: 'Shortage report: your restock shopping list',
    body: 'A focused, consolidated list of exactly what is short and where, ready to feed straight into the next trip. Instead of walking each machine to find out what it needs, your team leaves the depot already knowing. That means fewer trips, fuller machines and less fuel.',
  },

  // ── Buying & money ─────────────────────────────────────────────────────────
  {
    id: 'purchases',
    route: '/purchases',
    title: 'Purchasing: control what you spend',
    body: 'Raise and track purchase orders to suppliers with committed spend visible at a glance. Buying is your second-biggest cost after labour, so tracking every PO in one place stops duplicate orders, catches price creep, and gives you the volume history to negotiate.',
  },
  {
    id: 'purchases-create',
    route: '/purchases/create',
    title: 'Raise a purchase order',
    body: 'Create a PO in a couple of clicks. Pick the supplier, add products and quantities, and it is logged against your spend and ready to reconcile against what actually arrives. No more lost order emails or mystery invoices.',
  },
  {
    id: 'orders',
    route: '/orders',
    title: 'Orders: the full transaction ledger',
    body: 'Every transaction across every machine, completed, refunded or failed, in one searchable history. This is your source of truth for reconciliation, dispute resolution and spotting payment-hardware problems the moment failure rates climb.',
  },
  {
    id: 'expenses',
    route: '/expenses',
    title: 'Expenses: the real cost of the operation',
    body: 'Log operating costs against machines and routes so your net income reflects reality, not just gross sales. Fuel, commissions, repairs and restock labour all land where they belong, so profitability is measured per machine and per route, not guessed at.',
  },
  {
    id: 'expenses-create',
    route: '/expenses/create',
    title: 'Log an expense in seconds',
    body: 'Record a new cost, with category, amount and what it is tied to, and it flows straight into your P&L. Because it is captured the moment it happens, month-end is not a scramble to remember where the money went.',
  },
  // ── Growth & operations ────────────────────────────────────────────────────
  {
    id: 'alerts',
    route: '/alerts',
    title: 'Alerts: one place for what needs you',
    body: 'A central feed of everything demanding attention, from offline machines to low stock to anomalies, so nothing slips through the cracks. Your team works from a single prioritised list instead of scattered notifications, and downtime gets shorter.',
  },

  // ── People & settings ──────────────────────────────────────────────────────
  {
    id: 'team',
    route: '/team',
    title: 'Team & roles: safe delegation',
    body: 'Invite your team and assign roles so each person sees and controls exactly what their job requires. Drivers, managers and finance each get the right access, so you can hand off day-to-day operations without handing over the keys to everything.',
  },
  {
    id: 'users',
    route: '/users',
    title: 'User management: accounts & access',
    body: 'Manage user accounts, their roles, and which machines each person is assigned to. As the operation grows, access stays tidy and auditable, so you always know who can touch what.',
  },
  {
    id: 'settings',
    route: '/settings',
    title: 'Settings: your workspace',
    body: 'Account and subscription settings for the workspace, so billing and plan details live in one predictable place.',
  },
  {
    id: 'configuration',
    route: '/configuration',
    title: 'Configuration: built for any hardware',
    body: 'Catalog metadata, suppliers, fleet settings and integrations, tuned to whatever hardware you run. This is what makes the platform hardware-agnostic: bring any machine brand, and the system adapts to it rather than the other way around.',
  },
  {
    id: 'profile',
    route: '/profile',
    title: 'Your profile',
    body: 'Your personal details and preferences, including where you change your password. It is your own corner of the platform.',
  },

  // ── Wrap up ────────────────────────────────────────────────────────────────
  {
    id: 'nav-rail',
    route: '/dashboard',
    target: 'aside nav',
    title: 'That’s the whole platform',
    body: 'Everything you just saw lives in this sidebar, so you can jump anywhere in a click. From fleet control to per-machine P&L, it is one connected system that replaces the spreadsheets, phone calls and guesswork most vending operations still run on. Welcome aboard!',
  },
]
