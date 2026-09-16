# Milestone 11: Deployment, validation and handover

## 1. Milestone Title

Repeatable installation, safe upgrades, operational recovery and complete release verification.

## 2. Goal

A new or existing operator deployment can run the completed system using a documented, tested install/upgrade/backup process, and every retained workflow has evidence of end-to-end completion.

## 3. Current State

The repo has Next.js scripts, `scripts/db-migrate.mjs`, seven SQL files and several setup utilities. No Dockerfile/Compose or complete bootstrap/recovery package is present in the reviewed tree. `db-migrate` sorts SQL and includes demo seed; `db:seed` invokes migration filtering, so it does not reseed an already recorded file. `src/utils/db.ts` and runner force TLS with certificate verification disabled. These are portability/release gaps, not proof that a plain PostgreSQL deployment currently works. M01 creates identity/bootstrap foundations; later milestones remove operational fixture dependence incrementally.

## 4. Scope

Container/run configuration, fresh install and existing-database upgrade, explicit demo seeding, least-privilege runtime DB access, TLS configuration, migration coordination, health checks, scheduled sync operation, logs, backup/restore proof, final fixture/link cleanup and handover. No product feature is deferred into an undefined hardening phase.

## 5. Out of Scope

No public deployment without separate authorization, no production database mutation in this documentation task, no automatic credential rotation, no Kubernetes/HA/SLA guarantee, no destructive schema cleanup or separate mobile application. Live Nayax launch remains gated by M07 provider verification.

## 6. User Workflows

1. Operator deployment: configure environment -> migrate schema without sample customer data -> bootstrap Admin -> start app -> sign in -> create first location/product/machine.
2. Demo deployment: explicitly request sample seed -> verify it is isolated/read-only for prospects -> show honest demo labels.
3. Upgrade: backup -> preflight migration history -> apply additive changes under migration lock -> smoke test -> release application.
4. Incident: inspect redacted logs/health -> restore backup into isolated database -> verify data and resume replay-safe sync from durable cursor.

## 7. Frontend Requirements

Ensure first-use empty states link to working next actions, no sample records leak into a fresh customer operator, unavailable features are clearly absent/disabled and navigation/tours contain no removed links. Authentication errors, permission errors and recovery instructions are readable. Final full-flow checks at desktop and 390px. No deployment internals exposed in customer workflows beyond meaningful connection/sync health.

## 8. Backend Requirements

Package Node/Next.js and PostgreSQL using reproducible lockfile builds and documented environment variables. Configure TLS mode/CA explicitly; local non-TLS is opt-in for local isolated deployment, production TLS validates certificates. Separate migration/bootstrap credentials from runtime privileges; verify Data API/RLS restrictions if hosted on Supabase.

Migration runner obtains a deployment lock and records immutable filename/checksum history. Do not edit existing SQL; handle old histories with an explicit compatibility preflight. Separate fresh customer bootstrap from demo seed: skip the legacy sample-only seed during a customer install using a documented, tested runner policy, without falsely recording it as applied. Explicit demo mode may apply it. Re-running either mode must not duplicate members, openings or transactions.

Avoid blanket reseeding. M03 ledger initialization and M07 historical snapshots require measured pre/post balance/order totals and a reconciliation report. Migration failure rolls back the individual unit and stops later files. Upgrade rollback means restore/forward fix with a compatible app version, not fabricated automatic down-migrations.

Health: app readiness verifies required schema version and safe database connectivity; public health response contains no credentials or tenant data. Logs include operation/correlation IDs, durations and safe source status. Document scheduler cadence, secrets, retry handling and alerting for persistent sync failures. Backups require documented retention/RPO/RTO chosen for deployment and an actual restore rehearsal in isolation; do not claim a guaranteed SLA without evidence.

## 9. Data Model

No new product models. Extend migration bookkeeping only as needed for checksums/version validation. Operational metrics/logs remain outside business financial facts. Reuse audit, stock operations and sync state for recovery verification. Preserve all archived/excluded-module tables unless a separately authorized removal is approved.

## 10. Business Rules

Customer bootstrap never creates usable shared default passwords or silently loads sales demo data. Each operator data boundary remains enforced even in a single-operator deployment. Applied migrations are immutable and serialized. Removing fixtures requires a source import scan across all consumers, not only pages. A job retry after restoration must not replay already acknowledged source sales twice. Credentials previously recorded in source/history require owner verification of rotation; do not print them in handover documents.

## 11. Dependencies

M01-M10 with their acceptance evidence. External decisions before release: deployment owner, approved tier matrix, backup/recovery targets and live provider credentials/contract. These are assigned release gates, not undocumented TODOs. A fixture-only demo can ship with live integration explicitly unavailable.

## 12. Acceptance Criteria

- Empty isolated PostgreSQL -> migration/bootstrap -> Admin login -> first operational workflow succeeds with no `auth.users` dependency or sample customer records.
- Existing-data upgrade preserves identity, totals, references and history; running migrations again is a no-op.
- Backup restored into a separate database reproduces stock balances, order totals, roles and cursor state; replay remains idempotent.
- Full acceptance scenario in README passes, including role and tier boundaries.
- No customer operational source imports sample arrays or claims an unimplemented save/export/refund/optimization succeeded.
- Only necessary dead code is removed after import verification; excluded routes remain safely handled and Products stays under Inventory.
- Handover records actual build/lint/tests, known limitations, unverified live integration gates and deployment decisions. No claim of production readiness from a successful build alone.

## 13. Edge Cases

Partial migration, restored DB behind application version, scheduler concurrent with upgrade, fresh DB without auth schema/pgcrypto, local versus hosted TLS, orphan seed identities, missing secrets, large imports, cursor resume after provider retention window, unavailable backup credentials and archived historical records.

## 14. Testing Requirements

Run full fresh-install/upgrade/restore matrix on disposable databases. Verify test scripts cannot accidentally target production by requiring explicit test DB identification. Execute browser smoke and cross-module scenario, compare raw totals, test cross-tenant IDs and plan gates. Measure build/lint baseline and final state; document unresolved failures with owner rather than inventing prior known counts.

## 15. Implementation Notes

This milestone closes deployment work present in `docs/SYSTEM_OVERVIEW.md` but absent from the incomplete ten-file index. This task creates documentation only; later implementation creates deployment files and runbooks under this milestone. Do not run setup scripts that may mutate a live service merely to inspect the current code.
