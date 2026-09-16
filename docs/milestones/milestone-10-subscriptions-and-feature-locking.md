# Milestone 10: Subscriptions and feature locking

## 1. Milestone Title

Plan entitlements, usage limits, upgrade requests and operator administration.

## 2. Goal

Plans govern actual capabilities on both server and UI without blocking essential prerequisite workflows or deleting existing customer data on downgrade.

## 3. Current State

`operators.plan` defaults to `pro`; M01 exposes it through operator context. Pricing and Settings have sample tiers/usage, but there is no entitlement enforcement, actual checkout or tenant plan administration. Internal master admin pages exist for leads/demo users and can host a distinct operator-management page. Old pricing promises excluded AI/promotions and unavailable integrations.

## 4. Scope

Canonical entitlement map, machine/product/member limits, page/action/export locks, accurate usage, operator plan changes by platform admin, explicit upgrade request and truthful pricing copy. Manual invoicing outside the application is the initial commercial assumption.

## 5. Out of Scope

No payment processor, automatic recurring billing, invoices, proration, dunning, SSO, public read/write API, excluded modules or guaranteed SLA. Prices/tier assignments below are proposed launch defaults derived from the original requirement, not confirmed commercial promises.

## 6. User Workflows

1. Admin opens Settings -> Subscription -> sees actual plan and counts -> requests upgrade/contact sales.
2. Platform admin reviews operator -> changes plan with reason -> audit records old/new plan -> next request enforces current plan.
3. User opens locked advanced report -> upgrade explanation replaces protected query output; sidebar/subnavigation indicates needed plan.
4. Create at limit -> server refuses without writing, preserving form values and explaining counted resources.
5. Downgrade above limit -> retain data/history/read access, allow reduction and existing-operation completion, deny new above-limit resources.

## 7. Frontend Requirements

Use `/settings?section=subscription`, existing `/pricing`, and proposed `/admin/operators`. Link Settings from Profile. Avoid adding back excluded top-level modules as locked upsell cards. Show real usage, no fake next billing date or checkout success.

Lock state explains the feature, required plan and working upgrade-request action. Role permission failure is different from plan lock and should not upsell a Technician into becoming an Admin. Forms preserve input on limit errors; refresh plan/usage after a successful admin change. Pricing monthly/annual displays come from one configuration, with clearly stated rounding if the marketing prices are rounded.

## 8. Backend Requirements

`src/server/entitlements/` owns feature/limit policy; compose `requireCapability` with `requireFeature` and transaction-safe `assertLimit`. Every corresponding Server Action, report export and API/sync path enforces the policy. Never trust a posted plan or client resource count.

Serialize count-then-create with an operator-row lock or equivalent. Count resources using the exact definitions below. Batch import/copy/restoration/reactivation/invitation acceptance must not bypass limits. A downgrading admin action checks current usage and stores over-limit state without deleting resources. Queued jobs recheck entitlement at execution time. Existing posted trips can settle stock/cash even after route creation is locked.

Upgrade request persists tenant/requester/current/requested plan/message/status, with no outbound message sent automatically. Platform admin reads and resolves requests. Manual plan updates do not imply an invoice was sent or payment received.

## 9. Data Model

Validate `operators.plan` in Free/Starter/Pro/Enterprise canonical lower-case values. Add `operator_plan_history` with old/new plan, effective time, actor/reason and optional request ID; `upgrade_requests` with tenant/status/timestamps. Feature map is code/config, not user-editable JSON from the browser.

Proposed initial entitlements:

| Capability | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Active plus draft machines | 3 | 20 | 100 | Unlimited |
| Active products | 50 | Unlimited | Unlimited | Unlimited |
| Active members plus outstanding invitations | 1 | 3 | 10 | Unlimited |
| Basic sites, manual slots/stock, one supply warehouse, orders/basic sales | Yes | Yes | Yes | Yes |
| Routes/trips, purchases, expenses, CSV, full planogram tools | No | Yes | Yes | Yes |
| Multiple warehouses, advanced finance/driver reports, Nayax sync | No | No | Yes | Yes |
| Basic security audit and historical access | Yes | Yes | Yes | Yes |

Basic sites/slots exist on Free because manual inventory cannot work without them; this resolves the original dependency trap where Locations/Planogram were Starter-only. Starter field trips may use one operational van warehouse in addition to the supply warehouse; multiple general warehouses are Pro. These are explicit proposed adaptations requiring commercial review before launch. All five roles remain the security vocabulary; plans cap members rather than silently remapping roles.

## 10. Business Rules

Retired machines/archived products do not count, but restoring them checks limits. Outstanding unexpired invitations reserve member slots; accepting consumes the reservation without double counting. Suspended users do not count but cannot authenticate or execute tasks. Essential read/audit/archive/stock-settlement paths remain accessible after downgrade; only new restricted operations are blocked. Cached plan context must not survive a plan change indefinitely. No upsell claim for features absent from this release.

## 11. Dependencies

M01-M09. Commercial review is a launch decision: implementation can proceed against the clearly marked proposal and must record approval or changed values before release. M11 verifies entitlements on both shared and dedicated deployments.

## 12. Acceptance Criteria

- Two concurrent creates at the final available machine/member slot cannot both pass.
- A Free operator can create basic site/slot/manual stock without a paid dependency; protected premium report queries and exports are refused server-side.
- Plan change takes effect on next request; changing a browser field cannot unlock a feature.
- Downgrade retains history and allows posted trip reconciliation, while denying new disallowed trips/imports.
- Pricing/Settings/admin map agree and contain no live AI/promotion/billing claims.
- Upgrade request persists and can be resolved by platform admin; ordinary operator Admin cannot set their own plan.

## 13. Edge Cases

Over-limit downgrade, expired invitation, concurrent restore and create, unknown legacy plan, batch import exceeds remaining capacity, sync queued before downgrade, archived resources, Enterprise unlimited display, manual billing reference missing, cached permission/plan context.

## 14. Testing Requirements

Unit-test complete entitlement matrix and usage definitions. Integration-test limit races and all creation paths including import/copy/invite/reactivate. Browser-test locked page, direct export rejection, plan change, downgrade and upgrade request. Compare pricing configuration to server policy in one consistency check.

## 15. Implementation Notes

Original requirement §3.2 and prior overview §9 supply the tier concept; excluded/unbuilt features are removed from the launch proposal. Do not convert stated prices or SLA placeholders into billing contracts. Record the commercial decision explicitly before M11 release.
