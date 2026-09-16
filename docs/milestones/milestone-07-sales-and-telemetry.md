# Milestone 07: Sales, telemetry and service alerts

## 1. Milestone Title

Unified sales ingestion, Nayax adapter, inventory reconciliation and service issues.

## 2. Goal

Verified sales and machine observations flow into the same operational records as manual service, with replay safety, accurate history and traceable exceptions.

## 3. Current State

`src/server/nayax/types.ts` defines normalized interfaces only, no live client, fixture adapter, sync service or scheduled endpoint. Orders and Alerts use `lda` fixtures and local status overrides; refund buttons do not call a payment provider. `orders` has amount/status/quantity and unique `(operator_id,external_id)`, but no provider namespace, cost/tax/currency/location snapshots. Alert/service-issue/provider/sync tables exist. M06 supplies manual service-sale events and their stock-operation references.

## 4. Scope

Manual and telemetry sales normalization, order history/filter/export contract, replay-safe sync, truthful connectivity, DEX inventory reconciliation, operational alerts and issue lifecycle, minimal Common Problems and provider configuration. Fixtures prove the entire pipeline without pretending a live connection exists.

## 5. Out of Scope

No AI Insights, forecast or promotion alerts. No charging/refunding through Nayax, webhooks without specification, remote hardware settings, energy controls or additional live provider integrations. Production Nayax acceptance requires credentials and verified provider documentation; fixture acceptance is a separate gate.

## 6. User Workflows

1. Admin configures a provider and maps device IDs to existing machines/selection codes; connection screen displays fixture/live mode and last successful sync.
2. Sync fetches observations/transactions -> validates mappings -> stages/reconciles -> posts unique sales and updates real machine stock/status.
3. Orders -> filter -> view raw-source reference and snapshots; record an externally completed refund with evidence if authorized, never claim payment was issued.
4. Unknown selection, stale DEX or insufficient stock -> exception queue -> authorized review -> reconcile -> mark resolved with history.
5. Alert -> acknowledge -> inspect machine -> log/assign/resolve issue; maintenance tab and trip issue panel read the same record.

## 7. Frontend Requirements

Convert `/orders`, `/alerts`, machine Orders/Maintenance tabs, and `/configuration?section=telemetry|common-problems`. Orders display date, machine/location, product/selection, quantity, amount, tax, currency, method, status and source. Filters/date/pagination persist in URL. Refund control becomes read-only external status or explicit Record External Refund, not Issue Refund.

Provider settings never return stored secrets. Show configured credential reference/masked indicator, actual mode, last success/error and retry controls. Alert list uses open/acknowledged/resolved states consistently, with type/priority/machine filters. Rule settings and in-app notification preferences persist; email/SMS remain unavailable until separately integrated. Remove anomaly/promotion notification types.

Technicians can update assigned service issues; monetary views follow README roles. Standard M01 error/loading/empty/pending states apply. Data without a reliable source displays unknown, not an invented online/healthy state.

## 8. Backend Requirements

Implement fixture and live adapters behind existing `NayaxProvider`; evolve interfaces for pagination/cursors, provider namespace, currency, observation IDs and refund events. Do not guess live endpoint paths/fields: record verified contract and sample payload tests when credentials/docs are provided. Provider secrets are server environment references, not client config JSON.

A protected proposed `/api/sync/nayax` POST runs per configured operator/provider using a scheduler secret and explicit server-side mapping. Acquire a per-provider lock; fetch outside long DB transactions; stage events, process bounded batches with retries/backoff, advance cursor only after durable successful ingestion or durable exception staging. Overlap windows plus stable event IDs prevent missed equal-timestamp records. Track errors without logging credentials.

Event identity = `(operator,provider,external_id,event_kind/version)`. Order identity separately represents the original sale. In one transaction insert/dedupe source event, resolve historical slot-product mapping, snapshot price/cost/tax/currency/location, post M03 movement if not already posted by M06, update order/refund and audit. A retry after commit returns the existing result. Manual `service_sales` are idempotently consumed and link their existing stock operation.

Completed sale decrements stock once; failed payment does not. A refund changes money only unless a separately confirmed physical return generates a stock operation. Amount is gross paid, quantity is independent of amount; never infer units from today's price. No historical report joins current catalog cost as if it were the sale cost.

DEX is an absolute observation, not another sale. Stage observation timestamp and stable identity. Reconcile against a baseline plus movements after the reading, not a blind SET. If event ordering/completeness or manual-count precedence cannot be established, send to review without overwriting. For a trusted complete reading, correction delta is observed count minus reconstructed count at that time; append a reconciliation movement and replay subsequent known movements transactionally. Late sales covered by an accepted baseline must not be subtracted twice. Retain coverage/watermark rules and test both arrival orders. Default ambiguous manual-vs-DEX precedence is human review, not silent machine-wins.

If a real sale exceeds recorded stock, retain it in staging as an unresolved financial event; do not discard it or clamp a partial stock decrement silently. Reports expose pending/unreconciled totals until authorized adjustment and posting. Alerts dedupe one active condition per machine/slot/type; resolution occurs on a later observed recovery or explicit justified action. Manual machines do not become offline merely because they never pinged.

## 9. Data Model

Extend orders with provider identity, source kind/reference, currency, gross/tax/net, unit-price and COGS snapshots, location/route/product snapshots, movement reference and ingestion state. Preserve existing IDs and add scoped uniqueness; do not overwrite old snapshots during catalog changes. Legacy costs/locations with unknown history are marked estimated/unknown.

Add `ingestion_events`/exception staging with source key, sanitized payload, event time, status, reason and retry metadata; `inventory_observations` with slot, read time, baseline/watermark and decision. Extend sync state with provider cursor, last attempt/success, mode and durable run status. Add immutable refund events with original-order link and unique source key.

Extend alerts with slot/condition key, occurrence/severity and acknowledgement actor/time; add rule/preference records. Extend service issues with common-problem/member/slot/trip-stop links, priority, status and resolution history. Same-tenant FKs apply to all.

## 10. Business Rules

No provider can select operator by a client-supplied slug. Currency mismatch is quarantined unless explicitly supported by M08 grouping. Manual and telemetry sales cannot cover the same sale interval without reconciliation. Unknown product/device/selection is visible, never dropped. Connectivity, low stock and service status are separate facts. Retired machines may receive late historical events; those events use old assignment snapshots. Unresolved ingestion is a visible completeness limitation.

## 11. Dependencies

M01 through M06. M08 reads immutable sale/refund/COGS and reconciliation facts. M09 reuses provider/common-problem forms. Live credentials are an external gate, not a reason to block fixture and manual processing.

## 12. Acceptance Criteria

- Sync a fixture batch twice: second run changes neither orders, cash values nor stock. Partial batch failure/retry produces the same final result.
- M06 manual sale becomes one order with its existing movement; slot quantity does not drop again.
- Test sale then DEX and DEX then late sale for the same coverage: identical final quantity, no double depletion.
- Failed sale and monetary-only refund do not increase/decrease stock; refund never issues payment.
- Unknown selection/currency and insufficient stock appear as actionable exceptions and visible report incompleteness.
- Price/cost/location edits after a sale do not alter its historical revenue/COGS/location.
- Fixture mode is clearly labeled. Live gate passes only with verified request/response and real authorized connection evidence.

## 13. Edge Cases

Same external ID across providers, full/partial refund, repeated refund webhook-like payload, clock skew, missing pagination, rate limit/timeout, provider outage, meter rollback, DEX predating a manual count, reassigned slot, amount with no quantity, timestamp ties, scheduler overlap and secrets rotated during sync.

## 14. Testing Requirements

Unit-test normalization, state transitions and coverage math. Integration-test repeated and reordered events, failure between order/movement/cursor writes, provider namespace collisions, manual/telemetry overlap, stock exceptions and tenant isolation. Browser-test order/alert/issue workflow and provider error states. Live provider tests are opt-in with safe credentials and read-only external requests; record separately from fixtures.

## 15. Implementation Notes

Normalized types are a useful starting contract, not proof of Nayax API compatibility. The old overview's machine-wins DEX recommendation is replaced by timestamp-aware reconciliation plus manual review for ambiguity. Operational alerts remain in scope although AI Insights and Promotion Alert are excluded.
