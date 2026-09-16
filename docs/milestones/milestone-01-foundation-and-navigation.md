# Milestone 01: Foundation and navigation

## 1. Milestone Title

Portable identity, operator permissions, shared interaction patterns and scope cleanup.

## 2. Goal

A real operator administrator can sign in, provision a colleague, and reach a consistently protected app. Prospects retain a read-only sample experience. The five excluded modules are removed safely. This is a specification only; all implementation described below is future work.

## 3. Current State

Reviewed at commit `20d5bf1cd6655c176f844cdb4fdca84e63970ab0` on 2026-09-16. See [README](README.md) for the review boundary and shared contracts.

- Reuse `src/utils/db.ts` (`pg.Pool`), `src/utils/session.ts` (signed `svos_session`), `src/proxy.ts`, `src/server/operator.ts`, and the existing layout, UI tokens, charts and translations.
- `session.ts` already throws when `SESSION_SECRET` is absent. The previous milestone's hardcoded-fallback claim is stale. Preserve and test the existing guard.
- Login, `/api/auth/me`, password setup, profile actions and internal admin utilities query `auth.users`; `public.profiles` is created by `setup-db.mjs`, outside numbered migrations. Lead sessions use lead IDs, not user IDs.
- `requireOperator()` resolves active membership from the signed user ID, but has no capability map or plan, selects an arbitrary first membership and falls back to the demo tenant even for a suspended member. Master without membership can write the demo tenant. These behaviors require explicit handling.
- `Sidebar.tsx` has ONE `NAV_ITEMS` constant used by TWO renderings, not two separate configuration lists. `companyLink.ts` uses route names to distinguish company links from app routes.
- `db/001_core.sql` through `007_seed_demo.sql` define domain tables and sample seed; their live application status is not verified here. Migration runner forces TLS and includes the sample seed in normal migration ordering.
- `src/app/api/setup-password/route.ts` accepts email and password without a one-use setup token; no `/setup-password` page exists. Profile change does not verify the current password. Do not copy those authorization patterns.

## 4. Scope

- Own identity tables, safe migration from existing auth/profile data, login/logout/profile flows and invitation acceptance.
- Operator bootstrap and minimal Admin-only member creation/activation so M06 has real drivers before M09's richer team UI.
- Current-session validation, capability enforcement, audited transactions, safe errors and tenant-safe query conventions.
- Shared forms, dialogs, feedback, pagination and link-building utilities, introduced only where needed.
- Remove excluded routes and stale links/copy; preserve reusable operational components.

## 5. Out of Scope

Domain CRUD belongs to M02 onward. Full team configuration is M09; plan limits M10; deployment packaging M11. No SSO, MFA, automatic email delivery or wholesale design rewrite. Do not drop growth tables or historical data.

## 6. User Workflows

1. Bootstrap an operator and Admin through a controlled server command; sign in and reach the dashboard shell.
2. Admin opens minimal Team provisioning, creates a member and obtains a one-use invitation link; recipient sets a password and activates membership. M09 expands the same flow.
3. User changes password with current-password verification; previous sessions are invalidated.
4. Prospect submits the existing lead form and views the demo operator read-only; a cosmetic company slug never selects customer data.
5. An old excluded route produces a not-found response, while `/products` redirects to the Inventory product view.

## 7. Frontend Requirements

- Preserve `/login`, `/admin/login`, `/profile`, marketing/demo entry and the layout. Add `/setup-password` for token acceptance; never expose activation by email alone.
- `/api/auth/me` supplies validated identity, separate platform role and operator role, operator ID, plan and read-only state; client permission hints derive from this response.
- Retained navigation: Dashboard, Machines, Locations, Inventory, Routes, Trips, Purchases, Orders, Expenses, Alerts, Team, Users, Configuration, Profile. Settings remains reachable from Profile/account controls. Reports will be nested under Dashboard in M08.
- Remove `/map`, `/data-center`, `/insights` including children and `/promotions`; remove standalone Products navigation. Move reusable product form code into Inventory before retiring its old page.
- Keep removed names RESERVED in `companyLink.ts` so `/map` cannot become a public company page. Separate reserved names from routable app names; reject removed slugs in lead creation too. Handle prefixed variants consistently.
- Inspect Sidebar, Topbar, LayoutShell, tour steps, marketing/pricing, both locale files, dashboard shortcuts and machine detail links. Remove unsupported claims as well as links. Keep `RouteMap` while routes/trips still import it; remove FleetMap only after its final consumer disappears.
- Reuse Table, Button, Card, Badge, EmptyState, Skeleton. Shared modal/drawer must trap focus, support Escape, restore focus and label controls. Require confirmation for archive/cancel, disable pending submissions and preserve values after errors.
- Lists use URL search/filter/sort/page state with 25 default and 100 maximum rows; allowlisted sorts, filtered-empty versus first-use-empty states, loading skeletons, retryable errors and keyboard operation. At 390px use scrollable tables and full-width forms. Use existing design tokens and translation conventions.
- Unconverted operational pages must remain explicitly sample-only/read-only or unavailable for real operators. Do not mix static sample totals into live screens while milestones roll out.

## 8. Backend Requirements

- Continue one Next.js app, raw `pg`, Server Components for reads and sibling Server Actions for form writes. Use route handlers for auth, sync and exports. Query modules accept `operatorId`; actions resolve it server-side, never from submitted hidden fields.
- Introduce validated `requireCapability(capability)` and `requirePlatformAdmin()` helpers. Check account status, expiry, session version and active membership on every protected read/write, not only `/api/auth/me`.
- Distinguish signed principal kinds (`user`, `prospect`). A valid prospect resolves only the read-only demo. A suspended/deleted real user is refused, not silently downgraded to a prospect. Master access is rechecked against current platform role; tenant writes require an explicit authorized operator context.
- For multiple memberships, require a validated active-operator selection or present a selection screen. Never choose arbitrary `LIMIT 1` membership. M09 adds convenient switching using the same contract.
- Add `withTransaction` using one checked-out PoolClient. Audit and mutations share it. Safe result contract: success payload or field errors plus a public error code (`VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`). Raw SQL errors stay server-side.
- Authentication migration preserves user IDs, hashes, profile role, label and expiry, plus lead identity. Preflight duplicate emails and orphan memberships; stop with a remediation report rather than merge identities. Preserve seeded non-login members as inactive placeholders, never give invented accounts usable default passwords.
- Add pgcrypto bootstrap where required; preserve existing applied migrations. Migrate `profiles` dependencies and admin/lead readers, not just the six auth references named in the old plan. Own creation of leads/profiles or replace all their consumers. Remove legacy Supabase shims only after all imports are gone.
- Invitation tokens are random, hashed at rest, expire after 48 hours and are consumed atomically. No password setup without token or authenticated password-change flow. Rate-limit login/setup/lead endpoints; return generic account-existence responses.
- Existing public tables on a Supabase deployment must not become accessible through the Data API merely because application SQL is scoped: revoke browser-role grants to server-only tables, enable RLS on exposed tables and verify actual grants/policies. Do not use a generic `auth.uid()` policy for custom JWT sessions. Server queries remain tenant-scoped.

## 9. Data Model

- `public.users`: preserve identity UUID; normalized unique email, password hash, name, status, platform role, expiry/label where applicable, session version, timestamps. Global identity; no operator ownership column.
- Extend `operator_members.profile_id` with a validated FK to users; retain role vocabulary Admin/Manager/Dispatcher/Technician/Viewer and membership status. No separate employee table for the same person.
- `invitation_tokens`: user/member references, token hash, expiry, consumed/revoked times and inviter. Tenant-owned invitations carry `operator_id`.
- `audit_log`: operator ID nullable ONLY for platform/identity events, actor ID nullable for system/prospect activity, principal kind, entity type/ID, action, redacted change payload and timestamp. No passwords, tokens or credentials.
- Operator provisioning establishes currency, timezone and an Admin. Account creation/member setup and audit are transactional.

## 10. Business Rules

Use the role matrix in README. Role and plan are distinct checks; read-only always wins over write capabilities. Technician permissions are assignment-scoped and never permit price/capacity/catalog edits. Unknown roles fail closed. Disable/suspend must affect the next server request. Global platform admin pages and tenant Users pages are distinct security boundaries. No new development against sample arrays for customer operations.

## 11. Dependencies

None. Requires an isolated test PostgreSQL instance for later implementation. M01 provides user provisioning, transaction/audit helpers, capability contracts and server/UI validation patterns to every later milestone. M11 packages the bootstrap established here.

## 12. Acceptance Criteria

- Existing valid users can sign in after migration with the same password and retain expiry/role behavior; fresh PostgreSQL works without an `auth` schema.
- An Admin provisions a real Technician before any route/trip implementation; invitations expire and cannot be consumed twice.
- Missing/forged/expired sessions, suspended memberships, cross-tenant IDs and direct unauthorized action calls are refused.
- A lead named after a real operator still sees only demo data; master sessions do not silently grant demo write access.
- Both navigation renderings agree. Old excluded paths and prefixed paths cannot render as company demos; Products leads to Inventory.
- No operational page claims persistence while its actions only mutate local state. New dialogs work with keyboard and at 390px.
- Password change invalidates previous sessions; audit rollback and secret redaction are verified.

## 13. Edge Cases

Legacy duplicate emails; profile rows missing identities; unconfirmed accounts; existing master users without memberships; orphan seed members; slug collisions; simultaneous invitation acceptance; last Admin loss; ambiguous membership; JWT issued before suspension; absent pgcrypto; TLS-required hosted DB versus local non-TLS DB. Migration must stop safely on unresolved identity collisions.

## 14. Testing Requirements

Use disposable databases, never a production DB merely with an intended rollback. Test both empty-install and populated-upgrade paths. Unit-test role policy and slug classification; API-test auth/setup/rate limits; integration-test invitation races, foreign tenant IDs, session revocation and audit rollback. Browser-check both navigation layouts and a full Admin/prospect login flow. Existing build/lint failures must be measured, not assumed from the old document; no dependencies are installed in this documentation task.

## 15. Implementation Notes

Read repository AGENTS.md and installed Next.js docs before future code edits. The previous foundation doc's claims about absent secret guards, two nav constants, a working setup page and immutable correct tenant resolution are superseded. Allocate new migration filenames from actual history at implementation time; do not reserve `010b` after deployments have advanced. No migrations or application files change in this documentation task.
