# Milestone 09: Team, roles and configuration

## 1. Milestone Title

Unified member administration, shared configuration, custom metadata and account preferences.

## 2. Goal

Administrators manage people and settings through one consistent model, while every domain screen consumes the same configurations and authorization rules.

## 3. Current State

`src/app/team/page.tsx` uses a local six-member array. `src/app/users/page.tsx` has unrelated fixture roles/producer-specific fields and local CRUD. `configuration/page.tsx` hardcodes ten sections and inert buttons. `settings/page.tsx` displays sample company/subscription/notification data. Internal `/admin/(panel)/users` really manages demo accounts; it is not the tenant Team model. M01 provides real identity/member provisioning; M02-M08 provide domain reference data. Reuse their services/forms rather than recreating them here.

## 4. Scope

Complete Team list/invitations/role/status/assignments, Users view over the same memberships, operator switching, profile/company preferences, custom fields with actual value capture, configuration hub and CSV column maps/imports. Reuse earlier product types/tags, suppliers/packs, vehicles/warehouses, telemetry and common-problem implementations.

## 5. Out of Scope

No duplicate employee/producer model, region-specific SIRET requirement, arbitrary permission overrides, outbound invitation email provider, MFA/SSO, external integrations, image uploads or Excel imports. M10 owns subscription and plan controls. A separate mobile app remains deferred; Technician operations already work responsively via M06/M07.

## 6. User Workflows

1. Admin -> Team -> invite -> select role/routes -> copy one-use invitation link -> recipient activates using M01.
2. Admin -> member -> change role or suspend -> next server request reflects change; resolve future trip assignments before suspension.
3. User with several memberships selects operator -> server validates membership -> tenant-specific navigation/cache refreshes.
4. Configuration -> a domain section -> opens shared editor -> save -> corresponding Inventory/Machine/Trip form uses updated records.
5. Define custom field -> applicable form displays it -> validate/save -> detail/history/export includes it.
6. CSV column map -> preview and validate uploaded text -> inspect row errors/dry-run totals -> confirm atomic catalog import or separately confirmed opening-stock operations.

## 7. Frontend Requirements

`/team` is canonical member management; `/users` is a second view/redirect of the same records, not an independent user store. Distinguish platform master demo administration from tenant user administration in labels and route guards.

Team columns: name/email/operator role/status/assigned routes/last active. Search and status/role filters, sorting/pagination, pending invitation/revoke/copy-link controls. Admin-only changes, no self-promotion; changing own last-admin role is refused. No email-sent toast when only a link was generated.

`/configuration` sections reuse earlier forms: M03 product types/tags/warehouses, M05 suppliers/variety packs, M06 vehicles, M07 telemetry/common problems. Custom Fields and Column Maps become functional here. Config controls inherit domain permissions rather than granting a broad config.write bypass.

`/profile` and `/settings` share profile/password/company/security/preferences components. Company includes name/address/website/tax ID/default currency/timezone/miles-km. Notification settings link to M07 rules/preferences; only implemented in-app channels are selectable. Unsupported external integrations show unavailable without generated fake API keys.

M01 list/form states, field errors and keyboard/390px behavior apply. Role-specific views do not serialize sensitive data then hide it with CSS.

## 8. Backend Requirements

Use M01 identity/member services for invitation/status/role operations, including session invalidation and current membership checks. Role changes and assignment changes transact with audit; enforce at least one active Admin under concurrent requests. Operator switching validates requested membership and replaces only the active-operator context, never trusting the display slug.

Custom field validation is shared by machine/location/product/trip save services and CSV import. Adding required fields to populated entities requires a defaults/backfill plan or only applies to new records until an explicit migration. Archived definitions remain readable in history.

CSV imports use explicit allowlisted mappings, UTF-8, bounded size/rows, dry-run validation, same-tenant SKU match and deterministic import key. Catalog metadata import does not alter quantity. Opening quantities use M03 once-per-balance constraints and separate confirmation/source IDs. Do not auto-create purchases from an inventory file. Duplicate/conflicting rows are reviewed; repeat identical imports are no-ops. Import logs preserve result counts/errors without passwords/tokens.

Company currency changes after transactions cannot relabel history. New defaults apply to new records, while M08 groups existing snapshots by currency. Timezone changes affect display/filter boundaries with an explicit warning, not stored UTC event timestamps.

## 9. Data Model

Extend operators with company/preferences fields; users with profile/preference fields; keep roles in `operator_members`. Member route assignments use same-tenant links consumed by M06/M07.

Extend `custom_fields` to include `trip`, required flag, archived status and validation/options. Add `custom_field_values` with definition/entity/type and typed value, tenant ownership and unique entity/field. Because polymorphic entity references lack ordinary FKs, enforce entity existence/type/tenant in the shared write service and test deletion/archive behavior; do not allow arbitrary IDs.

Add `import_profiles` for named column maps and `import_runs` for content hash/key/status/errors/counts. Every imported mutation uses existing domain records, stock operations and audit; no duplicate catalog or balance table. Invitation table remains M01's.

## 10. Business Rules

One identity may have multiple operator memberships; each role applies only in that operator. Suspension does not delete history and cannot leave active trips without a reassignment decision. No member can modify platform roles through tenant actions. Reference-data archive does not corrupt existing products/purchases/trips. Custom field names/types are validated, rendered as text, never executable markup. Domain actions enforce the same rules whether called from Configuration or the original screen.

## 11. Dependencies

M01-M08. All minimum prerequisites for earlier work were owned by those milestones; M09 consolidates and extends them. M10 applies user-count and plan limits to these same actions. No earlier milestone needs to wait for M09 to create its reference records.

## 12. Acceptance Criteria

- Team and Users show the same people/roles and persist invitation/status changes after refresh.
- Technician cannot view another operator's or driver's resources; membership switch rejects unauthorized IDs and does not leak cached results.
- Last active Admin cannot be removed even by two concurrent requests. Suspended member's existing session is refused next request.
- Editing a warehouse/type/supplier in Configuration immediately updates its domain picker; no duplicate model exists.
- Custom field values are saved, typed, shown on detail and exported; required/default behavior is explicit for old records.
- CSV dry run changes nothing; confirmed repeated import does not duplicate products/opening stock; invalid or foreign-tenant references fail safely.

## 13. Edge Cases

Existing email belongs to another operator, invitation accepted after revocation, member owns future trips, no active Admin, role changed while form open, custom type changed after values exist, ambiguous numeric/date CSV cells, duplicate SKU rows, non-ASCII names, profile currency preference versus transaction currency.

## 14. Testing Requirements

Unit-test field/map parsing and permission policy. Integration-test last-admin race, membership switch/cache isolation, invitations, CSV replay and custom-value ownership. Browser-test invite/activate/suspend, domain configuration round-trip, custom field capture and CSV preview/commit with row errors. No test sends real invitation email.

## 15. Implementation Notes

This milestone expands the minimal Team flow introduced in M01. It deliberately avoids making vehicles/warehouses/suppliers late dependencies. Existing fixture Producer/Administrator labels are not valid tenant roles; migrate UI to README's five-role contract without guessing mappings for real records.
