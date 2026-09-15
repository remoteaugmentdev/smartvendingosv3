# Milestone 01: Foundation, identity and navigation

**When this milestone is done the application has its own user table instead of a
Supabase managed one, every page resolves a real operator, a real person and a
real role out of PostgreSQL, the five removed modules are gone without leaving a
single broken link, an audit trail exists, and the shared UI primitives that
milestones 02 to 10 all depend on are built and documented.**

---

## 2. Goal

Today the application is a front end with a marketing backend attached. Sessions
are real, but the identity behind them lives in a Supabase created `auth.users`
table that does not travel to a self hosted PostgreSQL instance, and the operator
context is not yet consumed by any screen. Navigation carries five modules that
are no longer part of the product.

After this milestone:

- A person signs in against `public.users`, a table this project owns and that
  any PostgreSQL 14 or newer database can create from our own migration files.
- `requireOperator()` returns the operator id, the person's role, the operator's
  subscription plan and a read only flag, and is the single place tenancy is
  decided.
- Team screens can show a person's name and email because the membership record
  finally has an identity to join to.
- Every write in the system has a place to record who did it and what changed.
- The sidebar shows fourteen items, the five removed routes return 404 rather
  than rendering, and nothing anywhere in the app links to them.
- A developer building milestone 02 finds a modal, a confirm dialog, a toast, a
  paginated table, a search box, a filter bar, an error state and a form field
  already built, so they write a Location screen, not a component library.

One sentence a reviewer can use to decide this milestone is finished: **drop the
Supabase project, point `DATABASE_URL` at a bare PostgreSQL server, run
`npm run db:migrate && npm run db:seed`, sign in, and land on a dashboard with
fourteen navigation items and no console errors.**

---

## 3. Current State

### 3.1 What already exists and can be reused as is

| Thing | Path | Note |
|---|---|---|
| Connection pool | `src/utils/db.ts` | A single `pg.Pool`. `next.config.ts` already has `serverExternalPackages: ["pg"]`. Do not add an ORM. |
| Session signing | `src/utils/session.ts` | `jose` HS256, cookie `svos_session`, 7 day expiry, `signSession`, `verifySession`, `getSession()` for Server Components, `getSessionFromRequest()` for the proxy. |
| Auth gate | `src/proxy.ts` | Next 16 renames `middleware.ts` to `proxy.ts`. Holds the public path allow list, the master only `/admin` gate, and the slug rewrite. |
| Tenancy chokepoint | `src/server/operator.ts` | `requireOperator()` and `requireWriteOperator()` already resolve the operator from the signed `session.userId` through `operator_members`. The resolution logic is correct and must not be changed. |
| Operator tables | `db/001_core.sql` | `operators` (id, slug unique, name, plan default `'pro'`, currency, timezone) and `operator_members` (operator_id, profile_id, role check, status check, unique on operator_id plus profile_id). |
| Migration runner | `scripts/db-migrate.mjs` | Tracks applied files in `schema_migrations`, reads `process.env.DATABASE_URL`. `package.json` already exposes `db:migrate`, `db:seed` and `db:check`. |
| Server Action template | `src/app/profile/actions.ts` | The only existing in app write. Every new `actions.ts` mirrors its shape. |
| Design tokens | `src/app/globals.css` | CSS custom properties on `:root`: `--bg-page`, `--bg-card`, `--bg-sidebar`, `--bg-active`, `--accent-primary`, `--accent-success`, `--accent-danger`, `--accent-warning`, `--accent-orange`, `--text-primary`, `--text-muted`, `--border`, `--sidebar-active-border`, `--shadow-card`, `--shadow-hover`, `--sidebar-width`, `--sidebar-collapsed`, `--topbar-height`. Fonts are IBM Plex Sans and IBM Plex Mono, with `--font-mono` overridden in `@theme`. **Every new component uses these variables. No new colour literals.** |
| UI primitives | `src/components/ui/` | `Badge` (variants `success`, `warning`, `danger`, `info`, `default`), `Button`, `Card` plus `CardHeader` and `CardTitle`, `EmptyState` (title, description, icon), `Logo`, `Skeleton`, `StatCard`, `Table` plus `Thead`, `Tbody`, `Tr`, `Th`, `Td`. All small, all token driven, all reusable as they are. |
| Layout shell | `src/components/layout/` | `LayoutShell`, `MainContent`, `PageHeader` (title, description, children slot for actions), `Sidebar`, `Topbar`. |
| Copy source | `src/locales/en.ts` plus `src/hooks/useTranslation.ts` | Two objects, `pages` (route segment to page title) and `nav` (nav key to label). All user facing strings resolve through here. |
| Client auth context | `src/context/AuthContext.tsx` | Feeds `/api/auth/me` into the client tree, and the `Sidebar` reads `user?.slug` from it to prefix every link. |
| Chart wrappers | `src/components/charts/` | `AreaChartWrapper`, `BarChartWrapper`, `DonutChartWrapper`, `useChartReady`. Their prop contracts are stable. Later milestones shape query results to fit them rather than editing these files. |

### 3.2 What exists but must change

**`src/server/operator.ts`.** `OperatorContext` is
`{ operatorId, role, readOnly, session }`. It must become
`{ operatorId, role, plan, readOnly, session }`. The `operators.plan` column
already exists, so this is one extra column in the existing `SELECT` and one
extra field in the returned object. Milestone 10 depends on this and will not
change the signature again.

**`src/utils/session.ts`.** Line 16 falls back to a hardcoded secret when
`SESSION_SECRET` is absent. That silently produces forgeable sessions in any
environment where the variable is missing, which is exactly the self hosted
deployment this milestone is preparing for. Replace the fallback with a thrown
error at module load.

**`src/proxy.ts`.** Two changes. First, the comment inside the
`parseCompanyRoute` branch states "No data is scoped by slug: this app has no
per-tenant data, see AGENTS.md". That becomes false the moment any milestone
queries through `requireOperator()`, and a stale security comment is worse than
no comment. Rewrite it to state that the slug is cosmetic and that tenancy is
resolved from the signed `userId` in `src/server/operator.ts`. Second,
`parseCompanyRoute` must not rewrite `/{slug}/map`, `/{slug}/products`,
`/{slug}/data-center`, `/{slug}/insights` or `/{slug}/promotions` onto routes
that no longer exist.

**`src/components/layout/Sidebar.tsx`.** The `NAV_ITEMS` array holds nineteen
entries. Five are removed (`map`, `products`, `dataCenter`, `insights`,
`promotions`). **The component renders the list twice**: once through a
`navItems` const used by the mobile drawer, and once inline inside the desktop
`<aside>`. Both copies must be edited or the desktop and mobile navigations will
disagree. The `Map`, `Package`, `BarChart3`, `Sparkles` and `Gift` imports from
`lucide-react` become unused and must be removed or the build will warn.

**`src/locales/en.ts`.** Delete `nav.map`, `nav.products`, `nav.dataCenter`,
`nav.insights`, `nav.promotions`, and the matching `pages.map`,
`pages.products`, `pages['data-center']`, `pages.insights`,
`pages.promotions`. The `pages` object also carries a large "Machine sub-pages"
block (`shortage`, `capacity`, `product-price`, `machine-product`, `motor-test`,
`slot-switch`, `shelf-life`, `repair-slot`, `energy`, `change-route`,
`parameters`, `cash-summary`, `inventory-detail`, `operation-time`,
`cash-record`, `slot-operations`, `copy`) for routes that do not exist. Leave
those keys alone. Milestone 04 decides which of them become real machine detail
features.

**`operator_members`.** The table has `operator_id`, `profile_id`, `role`,
`status` and timestamps, and **no name and no email columns**. `profile_id` is a
plain `uuid` with no foreign key, because the identity it points at lives in
Supabase's `auth.users`. Once `public.users` exists, `profile_id` gains a real
foreign key and team screens can join for a name.

### 3.3 What is missing entirely

- **`public.users`.** The application owns no user table.
- **`audit_log`.** No table records who changed what.
- **A permission map.** Roles exist in a check constraint and nowhere else. No
  code anywhere asks whether a `Technician` may delete a location.
- **Nine UI primitives** that every later milestone needs: modal, drawer,
  confirm dialog, toast, pagination, search input, filter bar, error state and
  form field. Their absence is why later milestone documents can specify
  "open the edit drawer" without also specifying how to build a drawer.
- **A plan on the operator context.** `operators.plan` is stored and never read.

### 3.4 What must be removed

| Target | Path |
|---|---|
| Live Map route | `src/app/map/page.tsx` |
| Map components | `src/components/map/FleetMap.tsx`, `src/components/map/RouteMap.tsx` |
| Products route | `src/app/products/page.tsx` |
| Data Center route | `src/app/data-center/page.tsx` |
| AI Insights routes | `src/app/insights/page.tsx` and the `anomalies`, `forecast`, `recommendations` child routes |
| Promotions route | `src/app/promotions/page.tsx` |
| Nav entries | five objects in both copies of the list in `src/components/layout/Sidebar.tsx` |
| Locale keys | ten keys in `src/locales/en.ts` |
| Icon imports | `Map`, `Package`, `BarChart3`, `Sparkles`, `Gift` in `Sidebar.tsx` |

`src/components/map/types.ts` holds `MapMachine` and `MapStatus`. **Keep
`types.ts`**: milestone 04 reuses `MapStatus` as the derived machine health value
even though no map renders it. Delete only the two map components.

**Growth tables.** `db/004_growth.sql` created `campaigns`, `campaign_targets`,
`loyalty_program`, `loyalty_rewards`, `loyalty_members` and `loyalty_redemptions`
to back the Promotions tab. They are empty, unseeded, and after this milestone
unreferenced. **Decision: leave them in the database.** Migrations are append
only, an empty table costs nothing, and a `DROP TABLE` migration is a
destructive operation written to solve a tidiness problem. Add one line to
`docs/milestones/README.md` noting they are reserved and unused. If promotions
ever return, the schema is already there.

---

## 4. Scope

### Database

- `db/008_identity_and_audit.sql`, containing:
  - `public.users`
  - a foreign key from `operator_members.profile_id` to `public.users.id`
  - `public.audit_log`
  - a data migration copying existing `auth.users` rows into `public.users`,
    guarded so it is a no-op on a database where `auth.users` does not exist

### Backend

- `src/server/users/` query module: `findUserByEmail`, `findUserById`,
  `verifyPassword`, `setPassword`, `createUser`, `listOperatorMembers`.
- `src/server/audit.ts`: `recordAudit()`, called inside the caller's transaction.
- `src/server/permissions.ts`: the role to capability map and `can()`.
- `requireOperator()` extended with `plan`.
- Six files repointed from `auth.users` to `public.users`.
- `src/utils/session.ts` secret fallback removed.

### Frontend

- Navigation reduced to fourteen items in both copies of the list.
- Five routes and two map components deleted, ten locale keys deleted.
- `src/proxy.ts` comment corrected and removed routes excluded from the slug
  rewrite.
- Nine new primitives under `src/components/ui/`.
- A `<RoleGate>` client helper plus a `usePermission()` hook.

---

## 5. Out of Scope

| Not in this milestone | Where it belongs |
|---|---|
| Any domain screen rebuild (locations, inventory, machines, trips) | 02 to 07 |
| The inventory movement ledger and `recordMovement()` | 03 |
| Reading `plan` to lock a page or enforce a limit. This milestone only makes `plan` available | 10 |
| Team invite flow, role editing UI, the Users screen | 09 |
| Password reset by email, multi factor authentication, OAuth | not planned |
| Deleting `src/data/lda.ts` and the other fixture modules | the milestone that removes the last import of each |
| Dropping the growth tables | never, see 3.4 |
| Rewriting `src/utils/supabase/server.ts`, which interpolates table and column names into SQL | deleted in this milestone once its last caller is gone, see 15.4 |

---

## 6. User Workflows

**6.1 Sign in, unchanged behaviour on a new backend.**
Visit `/login` -> enter email and password -> `POST /api/auth/login` looks the
email up in `public.users` and compares with `crypt()` -> a `svos_session`
cookie is set -> redirected to `/{slug}/dashboard` -> the sidebar shows fourteen
items.

**6.2 First password setup.**
Open the setup link -> `/setup-password` -> enter and confirm a password ->
`POST /api/setup-password` writes `password_hash` on the `public.users` row ->
redirected to `/login`.

**6.3 Change password.**
`/profile` -> Change password -> enter current and new -> Save -> the Server
Action in `src/app/profile/actions.ts` verifies the current password against
`public.users` and writes the new hash -> a toast confirms -> an `audit_log` row
is written with action `user.password_changed` and no password value in either
the before or the after payload.

**6.4 A Viewer opens a write screen.**
Sign in as a member whose role is `Viewer` -> open any screen with a Create
button -> the button renders disabled with the tooltip "Your role cannot make
changes" -> if the action is called anyway, `requireWriteOperator()` throws and
an error toast appears. The UI hint and the server refusal are independent.

**6.5 Navigating to a removed module.**
Open `/{slug}/insights` in the address bar -> the route does not exist -> the
Next.js not found page renders -> the sidebar still shows and no navigation item
is highlighted.

**6.6 Deploying to a bare PostgreSQL server.**
Point `DATABASE_URL` at an empty database -> `npm run db:migrate` -> every table
including `public.users` is created -> `npm run db:seed` -> the demo operator,
its members and their credentials exist -> sign in works with no Supabase
project anywhere in the picture.

---

## 7. Frontend Requirements

### 7.1 Pages and routes

No new pages. Five route directories are deleted. `src/app/layout.tsx`,
`src/app/(app)` grouping and the existing shell are untouched.

### 7.2 Navigation

`NAV_ITEMS` becomes exactly fourteen entries in this order, with these icons
from `lucide-react`:

| Order | href | navKey | Icon |
|---|---|---|---|
| 1 | `/dashboard` | `dashboard` | `LayoutDashboard` |
| 2 | `/machines` | `machines` | `Bot` |
| 3 | `/locations` | `locations` | `Building2` |
| 4 | `/inventory` | `inventory` | `Archive` |
| 5 | `/routes` | `routes` | `MapPin` |
| 6 | `/trips` | `trips` | `Truck` |
| 7 | `/purchases` | `purchases` | `ShoppingBag` |
| 8 | `/orders` | `orders` | `ShoppingCart` |
| 9 | `/expenses` | `expenses` | `Receipt` |
| 10 | `/alerts` | `alerts` | `Bell` |
| 11 | `/team` | `team` | `UsersRound` |
| 12 | `/users` | `users` | `Users` |
| 13 | `/configuration` | `configuration` | `Settings2` |
| 14 | `/profile` | `profile` | `UserCircle` |

The `const prefix = user?.slug ? \`/${user.slug}\` : ''` behaviour is unchanged.
**Edit both renderings.**

### 7.3 New primitives

All nine live in `src/components/ui/`, are token driven, and follow the existing
files' shape: a named export, a typed props interface above it, `className` last
and merged.

**`Modal.tsx`.** Props `{ open, onClose, title, description?, size?: 'sm' | 'md' | 'lg', children, footer? }`.
Centred, backdrop click closes, `Escape` closes, focus moves to the first
focusable element on open and returns to the trigger on close, background scroll
locked while open, `role="dialog"` and `aria-modal="true"`. Used for short forms
and confirmations.

**`Drawer.tsx`.** Same props plus `side?: 'right' | 'bottom'`, default `right`.
Slides in from the right at `max-width: 560px` on screens 768px and wider, and
from the bottom at full width and `max-height: 90vh` below 768px. Used for long
forms such as creating a machine or editing a planogram slot.

**`ConfirmDialog.tsx`.** Wraps `Modal`. Props
`{ open, onCancel, onConfirm, title, body, confirmLabel, cancelLabel?, tone?: 'default' | 'danger', busy? }`.
The confirm button uses `--accent-danger` when `tone` is `danger`, shows a
spinner and is disabled while `busy`. `cancelLabel` defaults to "Cancel".
**Every destructive action in every later milestone routes through this
component**, so the copy conventions live here: the title is a question, the body
states the consequence in one sentence, the confirm label is the verb, never
"OK". Example: title "Archive this product?", body "It stays in past purchases
and sales reports, and it can no longer be added to a machine.", confirm label
"Archive product".

**`Toast.tsx` plus `ToastProvider`.** A provider mounted once in
`src/app/layout.tsx` and a `useToast()` hook returning
`{ success(message), error(message), info(message) }`. Bottom right on desktop,
bottom centre below 768px. Auto dismisses after 4 seconds, error toasts after 8,
a manual close button on every toast, a maximum of three stacked with the oldest
dropped. `aria-live="polite"`, or `assertive` for errors.

**`Pagination.tsx`.** Props `{ page, pageSize, total, onPageChange }`. Renders
"Showing 1 to 25 of 312", Previous and Next, and numbered pages with ellipsis
when there are more than seven. Disabled at the ends. Below 768px only Previous,
the current page and Next render.

**`SearchInput.tsx`.** Props `{ value, onChange, placeholder, debounceMs? }`,
default debounce 300ms. A magnifier icon on the left and a clear button on the
right once there is a value. `type="search"`.

**`FilterBar.tsx`.** A horizontal container holding a `SearchInput`, any number
of select filters, and an "Active filters" row of removable chips with a
"Clear all" action when at least two are set. Scrolls horizontally below 768px
rather than wrapping.

**`ErrorState.tsx`.** Mirrors `EmptyState`. Props
`{ title, description, onRetry? }`. Uses `--accent-danger` for the icon. Default
title "Something went wrong", default description "The data could not be loaded.
Try again, and if it keeps happening contact support." Renders a Retry button
when `onRetry` is given.

**`FormField.tsx`.** Props
`{ label, htmlFor, required?, hint?, error?, children }`. Renders the label, an
asterisk with `aria-hidden` plus an `aria-required` on the control when
`required`, the hint in `--text-muted`, and the error in `--accent-danger` with
`role="alert"`. An errored field gets a `--accent-danger` border. Hint and error
never render at the same time; error wins.

### 7.4 States, defined once for the whole application

Later milestones reference these by name rather than restating them.

- **Loading.** Server Components use a route level `loading.tsx` rendering the
  page shell plus `Skeleton` rows shaped like the real content. Client
  transitions inside a page disable the control and show an inline spinner. Never
  a full page spinner on a navigation.
- **Empty.** `EmptyState` with a title naming the thing, a one sentence
  description saying what to do next, and the primary create action as a child
  when the current role may create.
- **Filtered empty.** Distinct from empty: "No results match your filters" with
  a "Clear filters" action. Never show the create action here.
- **Error.** `ErrorState`, plus an error toast for a failed action rather than a
  whole page swap.
- **Row level busy.** The row dims to 60 percent opacity and its controls
  disable while a per row action runs.

### 7.5 Form validation, defined once

Client validation runs on blur and again on submit. Server validation is
authoritative and returns field keyed messages that the form maps back onto the
matching `FormField`. Standard messages, reused verbatim everywhere:

| Condition | Message |
|---|---|
| Required field empty | `This field is required.` |
| Number below minimum | `Enter a number of 0 or more.` |
| Quantity not an integer | `Enter a whole number.` |
| Price negative | `Enter an amount of 0 or more.` |
| Email malformed | `Enter a valid email address.` |
| Code already used | `That code is already in use.` |
| Text too long | `Keep this under {n} characters.` |
| Date in the future where not allowed | `This date cannot be in the future.` |

### 7.6 Role based UI behaviour

`src/components/auth/RoleGate.tsx`, a client component with props
`{ capability, children, fallback? }`. It reads the role from `AuthContext` and
renders `children` only when the role holds the capability, otherwise
`fallback`, which defaults to nothing. `usePermission(capability)` returns a
boolean for the cases where a control should render disabled rather than vanish.

**The rule for every later milestone: destructive and administrative controls are
hidden from roles that cannot use them. Ordinary create and edit controls render
disabled with a tooltip instead of vanishing, so a Viewer can see what the
product does.**

`RoleGate` is a convenience, never a control. Every action re-checks on the
server.

### 7.7 Responsive behaviour

Tailwind defaults, `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The sidebar
collapses to the drawer below `lg`. Tables scroll horizontally inside a wrapper
below `md` with the first column sticky. Drawers become bottom sheets below
`md`. Touch targets are at least 40px in the mobile drawer.

---

## 8. Backend Requirements

### 8.1 `src/server/users/index.ts`

```ts
export interface AppUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  status: 'active' | 'invited' | 'suspended'
  lastSignInAt: Date | null
  createdAt: Date
}

export async function findUserByEmail(email: string): Promise<AppUser | null>
export async function findUserById(id: string): Promise<AppUser | null>
export async function verifyPassword(email: string, password: string): Promise<AppUser | null>
export async function setPassword(userId: string, password: string): Promise<void>
export async function createUser(input: {
  email: string
  fullName?: string
  password?: string
  status?: AppUser['status']
}): Promise<AppUser>
export async function listOperatorMembers(operatorId: string): Promise<Array<{
  memberId: string
  userId: string
  email: string
  fullName: string | null
  role: string
  status: string
  lastSignInAt: Date | null
}>>
```

`verifyPassword` runs the comparison in SQL so the hash never leaves the
database:

```sql
SELECT id, email, full_name, status
  FROM public.users
 WHERE lower(email) = lower($1)
   AND password_hash IS NOT NULL
   AND password_hash = crypt($2, password_hash)
```

`setPassword` uses `crypt($1, gen_salt('bf', 10))`. Both are pgcrypto, which is
available on any PostgreSQL install through `CREATE EXTENSION`, so nothing here
is Supabase specific.

`findUserByEmail` is used for existence checks and must never be used for
authentication, because it does not check a password.

`listOperatorMembers` is the join that team screens in milestone 09 consume. It
is written here because this milestone creates the foreign key that makes it
possible.

### 8.2 `src/server/audit.ts`

```ts
export type AuditAction =
  | 'created' | 'updated' | 'archived' | 'restored' | 'deleted'
  | 'status_changed' | 'password_changed' | 'signed_in'

export async function recordAudit(
  client: PoolClient,
  input: {
    operatorId: string
    actorUserId: string | null
    entityType: string
    entityId: string | null
    action: AuditAction
    before?: unknown
    after?: unknown
    summary?: string
  },
): Promise<void>
```

It takes a `PoolClient`, not the pool, **so the audit row commits or rolls back
with the change it describes**. A caller that passes the pool by mistake gets an
audit row for a change that may have been rolled back, so the parameter type is
deliberately narrow.

`before` and `after` are stored as `jsonb`. The caller passes only the fields
that changed, not the whole row. Values that must never be written: any password
or hash, any API key, any session token. `recordAudit` strips keys matching
`/password|secret|token|hash|key/i` from both payloads before inserting, so a
careless caller cannot leak a credential into the audit table.

### 8.3 `src/server/permissions.ts`

```ts
export type Role = 'Admin' | 'Manager' | 'Dispatcher' | 'Technician' | 'Viewer'

export type Capability =
  | 'location.read'   | 'location.write'   | 'location.archive'
  | 'product.read'    | 'product.write'    | 'product.archive'
  | 'inventory.read'  | 'inventory.adjust'
  | 'machine.read'    | 'machine.write'    | 'machine.retire'
  | 'planogram.read'  | 'planogram.write'
  | 'purchase.read'   | 'purchase.write'   | 'purchase.delete'
  | 'route.read'      | 'route.write'
  | 'trip.read'       | 'trip.write'       | 'trip.complete'
  | 'order.read'
  | 'alert.read'      | 'alert.resolve'
  | 'expense.read'    | 'expense.write'
  | 'report.read'     | 'report.export'
  | 'team.read'       | 'team.write'
  | 'config.read'     | 'config.write'
  | 'billing.read'    | 'billing.write'

export function can(role: string, capability: Capability): boolean
export function capabilitiesFor(role: string): Capability[]
```

The matrix, which every later milestone's role section must match:

| Capability group | Admin | Manager | Dispatcher | Technician | Viewer |
|---|---|---|---|---|---|
| read anything | yes | yes | yes | yes | yes |
| `location.write` | yes | yes | no | no | no |
| `location.archive` | yes | no | no | no | no |
| `product.write` | yes | yes | no | no | no |
| `product.archive` | yes | no | no | no | no |
| `inventory.adjust` | yes | yes | no | yes | no |
| `machine.write` | yes | yes | no | no | no |
| `machine.retire` | yes | no | no | no | no |
| `planogram.write` | yes | yes | no | yes | no |
| `purchase.write` | yes | yes | no | no | no |
| `purchase.delete` | yes | no | no | no | no |
| `route.write` | yes | yes | yes | no | no |
| `trip.write` | yes | yes | yes | no | no |
| `trip.complete` | yes | yes | yes | yes | no |
| `alert.resolve` | yes | yes | yes | yes | no |
| `expense.write` | yes | yes | no | no | no |
| `report.export` | yes | yes | no | no | no |
| `team.write` | yes | no | no | no | no |
| `config.write` | yes | yes | no | no | no |
| `billing.write` | yes | no | no | no | no |

Reasoning for the shape: a `Technician` works in the field, so they can adjust
stock, touch a planogram and complete a trip, but cannot create a machine or
change a price. A `Dispatcher` plans work, so they own routes and trips and
nothing else. A `Manager` runs the operation but cannot remove records or manage
the team. A `Viewer` reads.

`can()` returns `false` for an unknown role rather than throwing, so a database
row with an unexpected value fails closed.

### 8.4 `requireOperator()` change

```ts
export interface OperatorContext {
  operatorId: string
  role: string
  plan: string
  readOnly: boolean
  session: SessionPayload
}
```

The existing query becomes:

```sql
SELECT m.operator_id, m.role, o.plan
  FROM public.operator_members m
  JOIN public.operators o ON o.id = m.operator_id
 WHERE m.profile_id = $1 AND m.status = 'active'
 LIMIT 1
```

The demo fallback path returns the demo operator's real `plan` value, read
alongside the cached id. **The resolution rule does not change: the operator is
resolved from the signed `session.userId`, never from `session.slug`.**
`session.slug` is derived from `slugify(company)` on unauthenticated prospect
input in `POST /api/leads`, so trusting it would let a prospect name themselves
after a real operator and read that operator's data. Leave the comment that says
so in place.

Add a helper beside it so actions do not each re-derive permission:

```ts
export async function requireCapability(capability: Capability): Promise<OperatorContext>
```

It calls `requireOperator()`, throws `Error('Not authorised')` when
`can(ctx.role, capability)` is false, and additionally throws when the context is
read only and the capability is not a `.read`.

### 8.5 The six files that move off `auth.users`

| File | Line | Current | Replacement |
|---|---|---|---|
| `src/app/api/auth/login/route.ts` | 16 | `FROM auth.users ... crypt($2, encrypted_password)` | `verifyPassword(email, password)` |
| `src/app/api/auth/me/route.ts` | 12 | `JOIN auth.users u ON u.id = p.id` | `findUserById(session.userId)` |
| `src/app/api/setup-password/route.ts` | 14, 27 | `SELECT`/`UPDATE auth.users ... crypt($1, gen_salt('bf'))` | `findUserById` then `setPassword` |
| `src/app/profile/actions.ts` | 15 | `UPDATE auth.users SET encrypted_password = crypt(...)` | `verifyPassword` then `setPassword`, plus `recordAudit` |
| `src/app/admin/(panel)/users/actions.ts` | 73 | `JOIN auth.users u ON u.id = p.id` | `listOperatorMembers` or `findUserById` |
| `src/utils/supabase/admin.ts` | 18, 23, 32, 58, 68 | `INSERT`/`DELETE auth.users`, `INSERT auth.identities` | `createUser` and a delete in `public.users`. The file is then deleted. |

This is a table migration, not an authentication rewrite. The hashing function,
the cookie, the token format and every route's external behaviour are unchanged.

### 8.6 Error handling

Actions throw `Error` with a message safe to show a user. The three standard
messages: `'Not authenticated'` when there is no session, `'Not authorised'`
when the role lacks the capability, `'This demo account is read only.'` when
`readOnly`. A page level `error.tsx` catches anything else and renders
`ErrorState`. Database errors are logged server side with the query name and
never surfaced verbatim to the browser.

---

## 9. Data Model

### 9.1 New table `public.users`

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  password_hash   text,
  full_name       text,
  phone           text,
  avatar_url      text,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','invited','suspended')),
  last_sign_in_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON public.users (lower(email));
```

`password_hash` is nullable so an invited person exists before they set one.
Uniqueness is on `lower(email)` because email is case insensitive in practice and
two rows differing only in case is a login ambiguity, not a feature. **There is
no `operator_id` on this table**: a person is global and their relationship to an
operator is `operator_members`. That is what allows one person to belong to two
operators later without duplicating their identity.

### 9.2 Extending `operator_members`

```sql
ALTER TABLE public.operator_members
  ADD CONSTRAINT operator_members_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.users (id) ON DELETE CASCADE;
```

Adding this constraint requires every existing `profile_id` to exist in
`public.users` first, which is what the data migration in 9.4 guarantees. The
column is not renamed: renaming it would touch `src/server/operator.ts`, the
admin panel and the seed for no behavioural gain.

### 9.3 New table `public.audit_log`

```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigserial PRIMARY KEY,
  operator_id   uuid NOT NULL REFERENCES public.operators (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  action        text NOT NULL,
  summary       text,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log (operator_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_operator_time_idx
  ON public.audit_log (operator_id, created_at DESC);
```

`bigserial` rather than `uuid` because this table only ever grows and is read in
time order. `actor_user_id` is `ON DELETE SET NULL` so removing a person does not
erase the history of what they did. `entity_type` is free text rather than an
enum so a later milestone adds an entity without a migration.

**One audit table, not a history table per entity.** A per entity table would be
nine more tables with nine more query modules for one read pattern.

### 9.4 Data migration inside `db/008`

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    INSERT INTO public.users (id, email, password_hash, created_at)
    SELECT u.id, u.email, u.encrypted_password, COALESCE(u.created_at, now())
      FROM auth.users u
     WHERE u.email IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
```

The guard is what makes the file runnable on a bare PostgreSQL database where no
`auth` schema exists. Copying the bcrypt hash across is safe and means nobody has
to reset a password: the hash format is the same because both sides use
pgcrypto's `crypt()`.

Orphan `profile_id` values, which exist because `db/007_seed_demo.sql` invents
stable ids with `md5('demo-team-member:' || email)::uuid` that have no
`auth.users` row, must also be filled before the foreign key is added:

```sql
INSERT INTO public.users (id, email, full_name, status)
SELECT m.profile_id,
       'member-' || left(m.profile_id::text, 8) || '@peakvending.example',
       NULL,
       'invited'
  FROM public.operator_members m
 WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = m.profile_id)
ON CONFLICT (id) DO NOTHING;
```

`db/007` is already applied and immutable, so the placeholder rows are created
here rather than by editing the seed. Milestone 09 replaces the placeholder
emails when it builds the team screen.

### 9.5 Files

| File | Contents |
|---|---|
| `db/008_identity_and_audit.sql` | everything in 9.1 to 9.4 |

The migration numbers are allocated across the whole plan so two milestones never
claim the same file name: 01 owns `008`, 02 owns `009`, 03 owns `010`, 04 owns
`011`, 05 owns `012`, 06 owns `013`, 07 owns `014`, 08 owns `015`, 09 owns `016`,
10 owns `017`. A milestone needing a second file appends a letter suffix such as
`010b`.

---

## 10. Business Rules

1. Email is unique case insensitively. `Bob@x.com` and `bob@x.com` are one
   account.
2. A user with `password_hash IS NULL` cannot sign in. The login route returns
   the same generic failure as a wrong password, so an attacker cannot use the
   response to discover which addresses are registered but unactivated.
3. A user with `status = 'suspended'` cannot sign in even with a correct
   password.
4. A user with no `active` row in `operator_members` and no `master` session role
   resolves to the demo operator in read only mode. This is the funnel path and
   must stay.
5. Tenancy is resolved from the signed `session.userId`. `session.slug` is
   cosmetic and is never used to select data.
6. Every write path calls `requireCapability()` before it queries. A capability
   check in the UI is a hint, never a control.
7. `readOnly` blocks every non read capability regardless of role.
8. `recordAudit` runs on the same `PoolClient` as the change it describes, inside
   the same transaction.
9. Audit payloads never contain a password, a hash, a token, a secret or an API
   key. `recordAudit` strips them defensively.
10. Deleting a user sets `audit_log.actor_user_id` to null and keeps the row.
11. Migrations are append only. `db/001` to `db/007` are applied to a live
    database and are immutable. Corrections ship as a new numbered file.
12. Every table carries `operator_id` except `public.users`, which is
    deliberately global, and `schema_migrations`.
13. `SESSION_SECRET` is required. The application refuses to start without it.
14. A removed route is removed everywhere: the page file, the nav entry in both
    renderings, the locale keys, the icon import and the proxy rewrite. A removal
    that leaves any one of those behind is incomplete.
15. The growth tables stay in the database, unused and unreferenced.

---

## 11. Dependencies

None on other milestones. This is the first.

External requirements:

| Requirement | Note |
|---|---|
| `DATABASE_URL` | Already used by `scripts/db-migrate.mjs` and `src/utils/db.ts`. |
| `SESSION_SECRET` | Becomes mandatory in this milestone. Add it to `.env.local.example`. |
| `pgcrypto` extension | Already required by `db/001`. Confirm the migration issues `CREATE EXTENSION IF NOT EXISTS pgcrypto`. |
| `pgcrypto` for `gen_random_uuid()` | PostgreSQL 13 and newer provide it natively. State PostgreSQL 14 as the minimum. |

Every milestone from 02 onward depends on this one for `requireCapability()`,
`recordAudit()`, the primitives and the state conventions.

---

## 12. Acceptance Criteria

**Identity and portability**

1. `npm run db:migrate` against an empty PostgreSQL database with no `auth`
   schema completes without error and creates `public.users` and
   `public.audit_log`.
2. `npm run db:migrate` against the existing Supabase database completes without
   error and copies every `auth.users` row into `public.users` with the same
   `id`, email and hash.
3. After the migration, every `operator_members.profile_id` has a matching
   `public.users.id`, verifiable with a `LEFT JOIN ... WHERE u.id IS NULL` that
   returns zero rows.
4. The foreign key `operator_members_profile_id_fkey` exists.
5. Signing in with a password that worked before the migration still works after
   it, with no password reset.
6. `grep -rn "auth\.users\|auth\.identities" src/` returns nothing.
7. `src/utils/supabase/admin.ts`, `client.ts` and `server.ts` no longer exist and
   nothing imports them.
8. Starting the app with `SESSION_SECRET` unset fails loudly with a clear message
   rather than starting with a default secret.
9. A user whose `status` is `suspended` is refused at login.
10. A user whose `password_hash` is null is refused at login with the same
    message as a wrong password.

**Operator context**

11. `requireOperator()` returns a `plan` string equal to the `operators.plan`
    value for the signed in member.
12. `requireCapability('team.write')` succeeds for an `Admin` and throws
    `'Not authorised'` for a `Manager`.
13. `requireCapability('location.read')` succeeds for a `Viewer`.
14. `requireCapability('location.write')` throws for a read only context even
    when the role is `Admin`.
15. `can('NotARole', 'location.read')` returns `false`.

**Audit**

16. Changing a password on `/profile` writes exactly one `audit_log` row with
    `entity_type = 'user'` and `action = 'password_changed'`.
17. That row's `before` and `after` contain no password, hash or token value.
18. An action that throws after calling `recordAudit` leaves no `audit_log` row,
    proving the audit write is inside the transaction.

**Navigation and removal**

19. The sidebar renders exactly fourteen items in the order in 7.2, on desktop
    and in the mobile drawer.
20. `src/app/map`, `src/app/products`, `src/app/data-center`, `src/app/insights`
    and `src/app/promotions` do not exist.
21. `src/components/map/FleetMap.tsx` and `RouteMap.tsx` do not exist, and
    `src/components/map/types.ts` does.
22. `grep -rn "'/map'\|'/products'\|'/data-center'\|'/insights'\|'/promotions'" src/`
    returns nothing.
23. `src/locales/en.ts` has no `nav.map`, `nav.products`, `nav.dataCenter`,
    `nav.insights` or `nav.promotions` key.
24. `npm run build` reports no unused import warning from `Sidebar.tsx`.
25. Visiting `/{slug}/insights` renders the not found page and does not throw.
26. No dashboard tile, alert row, empty state or settings screen links to a
    removed route.
27. `npm run build` and `npm run lint` introduce no new errors compared with the
    state before this milestone. The six pre-existing
    `react-hooks/set-state-in-effect` errors are out of scope.

**Primitives**

28. `Modal` closes on `Escape`, on backdrop click and on the close button,
    returns focus to the trigger, and locks background scroll while open.
29. `Drawer` renders from the right at 1280px wide and as a bottom sheet at
    375px wide.
30. `ConfirmDialog` disables its confirm button and shows a spinner while `busy`.
31. `useToast().success()` renders a toast that auto dismisses after 4 seconds; a
    fourth toast drops the oldest.
32. `Pagination` with `page: 1, pageSize: 25, total: 312` renders
    "Showing 1 to 25 of 312", disables Previous and enables Next.
33. `SearchInput` fires `onChange` once, not per keystroke, when typing five
    characters quickly.
34. `FormField` with an `error` renders it with `role="alert"` and suppresses the
    hint.
35. `ErrorState` with `onRetry` renders a Retry button and calls the handler.
36. `RoleGate` with `capability="team.write"` renders its children for an `Admin`
    and its fallback for a `Viewer`.

---

## 13. Edge Cases

1. **`auth.users` contains a row whose email is null.** The data migration
   filters it out, because `public.users.email` is `NOT NULL`.
2. **`auth.users` contains two rows differing only in email case.** The unique
   index on `lower(email)` rejects the second. The migration must surface which
   rows collided rather than failing with a bare constraint message. Run a
   detection query first and raise a notice naming the duplicates.
3. **An `operator_members` row points at a `profile_id` with no `auth.users`
   row.** Seeded demo members are exactly this. 9.4 creates placeholder rows.
4. **A person belongs to two operators.** `requireOperator()` uses `LIMIT 1` with
   no ordering, so the operator chosen is arbitrary. This is the existing
   behaviour and it stays for now. Add `ORDER BY m.created_at` so it is at least
   deterministic, and note in the source that an operator switcher is milestone
   09 work.
5. **A `master` session with no membership row.** Falls through to the demo
   operator with role `Admin` and `readOnly: false`. Preserve this exactly, the
   admin panel depends on it.
6. **Two browser tabs, one signs out.** The other keeps a stale `AuthContext`
   until its next server request, which redirects to `/`. Acceptable, no shared
   worker.
7. **A session signed with an old `SESSION_SECRET`.** `verifySession` returns
   null, the proxy redirects to `/`. No error page.
8. **A capability check for a role that was valid and later removed from the
   check constraint.** `can()` returns false, the person sees read only screens
   rather than an error.
9. **`recordAudit` receives a `before` payload of 2MB.** `jsonb` accepts it, but
   nothing needs it. Callers pass changed fields only. Add a `ponytail:` note
   that no size cap is enforced and that one belongs here if a caller ever passes
   a whole row.
10. **A removed route is still in a user's browser history or a bookmark.** They
    get the not found page. No redirect is added: a redirect implies the feature
    moved, and these features were removed.
11. **A removed route is referenced by `parseCompanyRoute`.** The rewrite would
    produce an internal path that does not exist. The function must return null
    for those segments so the request 404s at the router instead.
12. **Migration run twice.** `schema_migrations` prevents re-running `008`, and
    every statement in it is `IF NOT EXISTS` or `ON CONFLICT DO NOTHING` anyway.
13. **Adding the foreign key while a concurrent insert creates an orphan.** The
    migration runs in one transaction, so the constraint validation and the
    backfill cannot interleave.
14. **A toast fires from a Server Action that also redirects.** The redirect
    unmounts the provider before the toast renders. Pattern to follow: the action
    returns a result, the client shows the toast, then navigates.
15. **A modal opens inside a drawer.** Allowed, but the z-index scale must be
    defined once: drawer 40, modal 50, toast 60. Write the scale into
    `globals.css` as `--z-drawer`, `--z-modal`, `--z-toast`.

---

## 14. Testing Requirements

No test framework is installed and none is added. Tests are assert based `.mjs`
scripts run with `node`, matching the existing `check-supabase-db.mjs`
convention. Each connects with `DATABASE_URL`, does its work in a transaction and
rolls back so the live database is unchanged.

### 14.1 Database and migration

`scripts/test/identity-migration.test.mjs`

- `public.users` and `public.audit_log` exist with the expected columns.
- The unique index on `lower(email)` rejects a second insert differing only in
  case.
- `operator_members_profile_id_fkey` exists and rejects an insert with a
  `profile_id` that is not in `public.users`.
- No `operator_members` row has an orphan `profile_id`.
- Deleting a `public.users` row sets `audit_log.actor_user_id` to null on that
  person's rows and deletes none of them.

### 14.2 Authentication

`scripts/test/auth.test.mjs`

- `createUser` then `setPassword` then `verifyPassword` with the right password
  returns the user.
- `verifyPassword` with the wrong password returns null.
- `verifyPassword` for a user with a null `password_hash` returns null.
- `verifyPassword` for a suspended user returns null.
- Email comparison is case insensitive.
- A bcrypt hash written by the old `auth.users` path validates through
  `verifyPassword`, proving the copied hashes still work.

### 14.3 Permissions

`scripts/test/permissions.test.mjs`, pure functions, no database.

- Every one of the five roles resolves every capability in the matrix to the
  value in the table in 8.3. Assert the whole grid, not samples.
- `can()` on an unknown role is false for every capability.
- `capabilitiesFor('Viewer')` contains only capabilities ending in `.read`.

### 14.4 Audit

`scripts/test/audit.test.mjs`

- `recordAudit` inside a rolled back transaction leaves no row.
- A payload containing `password`, `passwordHash`, `apiKey` and `token` keys is
  stored with those keys absent.
- The entity index is used by a query filtered on operator, entity type and
  entity id, checked with `EXPLAIN`.

### 14.5 Navigation and removal

`scripts/test/navigation.test.mjs`, filesystem and source text assertions.

- The five route directories do not exist.
- `Sidebar.tsx` contains exactly fourteen `navKey:` occurrences per rendering,
  twenty eight in total, and contains none of the five removed keys.
- `en.ts` contains none of the five removed nav keys.
- No file under `src/` contains a string literal for a removed route.
- No file under `src/` imports `@/utils/supabase/`.

### 14.6 Manual workflow checks

Performed once by hand and recorded in the milestone's closing summary:

- Sign in, sign out, sign in again.
- Change a password, sign out, sign in with the new one.
- Sign in as a `Viewer` and confirm create buttons render disabled with a
  tooltip.
- Resize to 375px and confirm the mobile drawer shows the same fourteen items.
- Run the whole flow against a local PostgreSQL container with no Supabase
  project configured.

---

## 15. Implementation Notes

### 15.1 Build order

1. `db/008_identity_and_audit.sql`, run it, verify with 14.1. Nothing else can be
   verified until the table exists.
2. `src/server/users/`, `src/server/audit.ts`, `src/server/permissions.ts`.
3. Repoint the six `auth.users` files, one at a time, testing login after each.
4. Delete `src/utils/supabase/*` and the root script that imports `client.ts`.
5. Extend `requireOperator()` and add `requireCapability()`.
6. The nine primitives, with the z-index scale added to `globals.css` first.
7. Navigation and route removal last, so a broken build during removal does not
   block everything else.

Steps 1 to 5 and step 6 are independent and can run in parallel.

### 15.2 Gotchas

- **`middleware.ts` is `proxy.ts` in Next 16.** Read
  `node_modules/next/dist/docs/` before changing it. The exported function is
  named `proxy`, not `middleware`.
- **`Sidebar.tsx` renders the nav list twice.** Editing one copy produces a
  desktop and mobile navigation that disagree, and the disagreement is invisible
  until someone resizes the window. Consider collapsing the two renderings into
  one mapped list while you are in the file; it is a smaller file afterwards.
- **CRLF line endings.** Scripted edits with a `\n` pattern silently match
  nothing. Use `\r?\n` and always assert that a replacement happened.
- **`pg` returns `numeric` as a string.** Never do arithmetic on a `numeric`
  column in JavaScript without converting. Prefer doing the arithmetic in SQL.
- **`crypt()` comparison must stay in SQL.** Pulling the hash into Node to
  compare it there adds a bcrypt dependency and a timing surface for no gain.
- **Do not rename `operator_members.profile_id`.** The rename touches the admin
  panel, the seed and `operator.ts` and buys nothing.

### 15.3 Patterns to copy

- Server Action shape: `src/app/profile/actions.ts`.
- Query module shape: the existing files in `src/server/`, `operatorId` first,
  raw `pool.query`, a typed return.
- Component shape: `src/components/ui/Badge.tsx` for a tiny one,
  `src/components/ui/Table.tsx` for a multi export one.
- Migration shape: `db/003_operations.sql`, which shows the idempotent `DO $$`
  block used to add a constraint only when it is missing.

### 15.4 The Supabase client files

`src/utils/supabase/server.ts` builds SQL by interpolating table and column names
straight into the string: `SELECT ${columns} FROM public.${table} WHERE ${col} = $1`.
No per tenant data may go anywhere near it. Its only in app caller disappears
when `auth/me` moves to `findUserById`. `client.ts` is imported only by the root
script `backfill-lead-slugs.mjs`, which should be rewritten against `pg` or
deleted. All three files go in this milestone.

### 15.5 Known ceilings

- One operator per person, chosen with `LIMIT 1`. An operator switcher is
  milestone 09. Mark the query with a `ponytail:` comment.
- The audit log has no retention policy and no UI. Milestone 09 adds an entity
  history panel. A partition or a purge job is a later concern and is not needed
  below roughly ten million rows.
- Sessions cannot be revoked before their 7 day expiry, because the JWT is
  stateless. Add a `sessions` table only if forced sign out becomes a
  requirement.
- No rate limiting on login. Add it at the edge if the app is ever exposed
  without one.

### 15.6 Security fixes carried in this milestone

1. The hardcoded `SESSION_SECRET` fallback in `src/utils/session.ts:16` is
   removed.
2. `src/utils/supabase/server.ts`, with its interpolated identifiers, is deleted.
3. `.env.local.example` is corrected: it currently lists three Supabase keys the
   application does not use and omits `DATABASE_URL` and `SESSION_SECRET`, which
   it requires.
4. **Outside this milestone and outside the repository:** `setup-db.mjs:4` and
   `get-keys.mjs:4` committed a Supabase connection string including its
   password. Removing the line does not retract it from git history. **That
   password must be rotated by the account owner.** No code change substitutes
   for the rotation.

### 15.7 Differences from the VendSoft reference

This milestone has no direct VendSoft equivalent, since the referenced articles
describe features rather than foundations. Two decisions were still shaped by
reading them:

| Area | VendSoft | Ours | Reason |
|---|---|---|---|
| Record deletion | Several articles describe a Delete that hides the record and preserves history | We name it Archive or Retire and give the entity an explicit status | A Delete that keeps history is an archive. Naming it accurately stops a user from deleting to free a code and then wondering why the code is still taken |
| Change history | A per entity Product History screen | One `audit_log` table, with a per entity history panel reading from it | One writer, one read pattern, one index. Per entity history tables multiply with the entity count and share no code |
