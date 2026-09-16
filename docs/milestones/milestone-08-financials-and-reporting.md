# Milestone 08: Financials, dashboard and reporting

## 1. Milestone Title

Expenses, financial reconciliation, management reports and shared dashboard totals.

## 2. Goal

Every displayed amount is traceable to persisted events and uses the same date, currency, cost and refund rules across Dashboard, Orders, Inventory and exports.

## 3. Current State

Dashboard reads `lda` and computes sample aggregates; expenses list uses `src/data/expenses.ts` and create only navigates. `calcProfitLoss.ts` rounds money to integers and fabricates purchases as COGS + 109; `aggregateSales.ts` hardcodes category proportions. Do not reuse those formulas. The removed Data Center and incorrect route detail contain report-card visual patterns, not real reports. `expenses` lacks payee and settlement information. Sales snapshots and cash/visit events are provided by M05-M07.

## 4. Scope

Expense CRUD/corrections, payment/settlement evidence, commissions, cash reconciliation, P&L, cash movement, sales/inventory/route/driver/mileage reports, dashboard KPIs/charts, activity and consistent CSV/print. Reports are nested under Dashboard, not a replacement top-level Data Center tab.

## 5. Out of Scope

No statutory accounting compliance claim, general ledger, automatic bank feed, tax filing, FX conversion, Excel writer, custom report builder, AI analytics or external accounting connection. Accounting-grade wording is not justified by these management reports.

## 6. User Workflows

1. Expenses -> create category/date/amount/payee/machine or location -> save -> reload/edit/void with history.
2. Record purchase payment, commission payout or card settlement with actual date/evidence; receiving stock and completing trips alone do not create payment evidence.
3. Dashboard -> choose operator-local date range/currency/filter -> all relevant charts and totals change together.
4. Dashboard Reports -> choose report -> apply filters -> drill into contributing rows -> export matching CSV or print.
5. Compare expected machine cash against collection/float/refunds and bank deposit; record discrepancy resolution without creating extra sales.

## 7. Frontend Requirements

Convert `/dashboard`, `/expenses`, `/expenses/create`; add `/expenses/[id]` and `/dashboard/reports/[report]`. Report shortcuts are in Dashboard sub-navigation. Machine/location revenue panels call the same read services. Account shell adds no Data Center navigation.

Dashboard: revenue/net income, active machines, trips, pending restocks; revenue/profit trend; category sales, top products/locations/machines, low inventory, reorder and audit activity. Remove static fallback KPIs. Until reconciled data exists show zero/unknown with completeness context.

Reports cover sales by product/location/machine/type/day; P&L; cash movement; expense/payee; commission; inventory/reorder; machine performance; route efficiency; mileage and driver activity. Shared viewer has date shortcuts/custom range, allowed dimensional filters, table/charts, print and actual CSV download. Inventory balances are labeled as-of-now or use ledger as-of calculation, never silently obey an unrelated sales-date range.

Expense form validates category/date/nonnegative money/payee and same-location machine assignment. Clone opens an unsaved form; void preserves history. Technicians cannot see profit/cost exports. M01 states and mobile layout apply. Display calculation definitions and missing-source warnings next to affected numbers.

## 8. Backend Requirements

`src/server/reporting/` owns named aggregate/read functions; `src/server/expenses/` writes expenses; `src/server/finance/` records settlements/accruals/reconciliation. Server Actions use role checks and transactions. Proposed `/api/reports/[report]/export` resolves tenant, capability, filters and plan before executing the same query as the viewer.

Rules:
- Gross sales = completed paid sale gross amounts; refunds are deducted once from immutable refund events, using refund effective date. Tax exclusion uses sale/refund snapshots. Net revenue = gross sales - refunds - net sales tax.
- COGS = carrying-value outflows linked to sold units; reverse only for an actual returned good per policy, not every monetary refund. Gross profit = net revenue - COGS.
- Net income = gross profit - operating expenses - commission accruals. A refund linked to an order is not also an operating expense. Stock purchases are inventory acquisition, not immediate COGS expense. Under M05's initial cost policy, shipping is a separately linked operating expense at receipt and purchase tax is kept separately as recoverable tax or nonrecoverable expense according to an explicit operator setting; it is never silently put into COGS. The same source charge cannot also be entered as an unrelated expense.
- Commission terms are effective-dated M02 terms, calculate percent on net pre-tax sales, flat monthly once per location/month (no per-machine multiplication; no partial-month proration initially; use the terms effective on the month's first day, or installation day for a new site, and record that selection), per-transaction on successful paid events net of full refunds. Accrual unique key prevents duplicate generation. Paying an accrued commission settles liability, not a second P&L expense.
- Cash reports use actual settlement/payment events: sales recognition, machine collection and bank deposit are different stages. Internal transfers are not income twice. Missing card settlement data must be labeled unsettled/unknown; never substitute sales for bank receipts or COGS for supplier payments.
- One currency per aggregate group; mixed-currency operators show separate totals, not a converted grand total. No FX rates are invented. Period filters use operator timezone and half-open UTC bounds, including DST and refund dates.

Compute money in SQL decimals; return strings or explicit money DTOs, never integer-rounded finance. Prevent join fan-out by aggregating fact tables before combining them. Trend comparisons use equal periods with no divide-by-zero percentage when prior period is zero. Mileage uses recorded actual distance/unit, with explicit conversion and configurable reimbursement rate snapshot; no fictitious optimized distance.

## 9. Data Model

Extend expenses with payee, currency, version, void reason/time, created-by, source refund/payment link and settlement status. `financial_events`: tenant, kind, amount/currency, occurred/paid date, source entity/unique operation key, external reference, from/to custody account and reversal link. This is a management cash-event ledger, not a full accounting general ledger.

`commission_accruals` and payouts link location, period/term snapshot, base, amount/currency and financial event. `cash_reconciliations` connect expected sales/float, collections/deposits and explained discrepancies. Extend M06 trip mileage with actual start/end readings or recorded distance, unit, rate snapshot and driver/vehicle. Reuse inventory/order snapshots; do not duplicate their quantities in report tables.

## 10. Business Rules

Report filters, downloads and drilldowns must match. Historical snapshots survive archive/relocation. Unknown legacy cost excludes a false precise profit claim and is visible as incomplete; do not recost history from today's price. Expenses cannot duplicate purchase principal/refunds/commission accruals under different labels. Reconciliation adjustments require reason/actor and remain separate from revenue. CSV uses the shared serializer from M04 (extend it, do not fork it) with proper quoting/newlines, safe filenames, UTF-8 and formula-injection protection on untrusted text cells.

## 11. Dependencies

M01-M07. M02 terms, M03 carrying values, M05 receipt totals, M06 visits/collections and M07 sales/refunds provide facts. M09 account settings supplies additional presentation preferences; defaults from M01 already work. M10 gates premium viewers/exports using the same services.

## 12. Acceptance Criteria

- Known fixture: gross paid sales 120, refunds 12, net tax 18 -> net revenue 90; COGS 40, expenses 10, commission accrual 9 -> net income 31. No refund counted twice.
- A purchase receipt of 50 with payment next month affects stock today and cash next month; neither date creates 50 of COGS by itself.
- Collection 100 followed by bank deposit 100 does not create 200 of income or cash inflow.
- Dashboard, reports and CSV match under the same date/currency/filter; historical price/location changes do not rewrite totals.
- Mixed currencies remain separate; unknown historical costs and unposted ingestion are shown as incomplete.
- All named reports render from real records; unauthorized exports and foreign IDs are refused.

## 13. Edge Cases

Zero prior-period revenue, no sales, negative net profit, partial/full refund in later month, midnight/DST boundaries, shipping/tax rounding, invalid filter, huge exports, comma/newline/formula product name, backdated expense, monthly commission term change, unpaid invoice and partial bank settlement.

## 14. Testing Requirements

Unit-test money/date/rate/CSV functions. Database-test hand-calculated P&L and cash fixtures, no join multiplication, accrual idempotency, refund classification and cross-tenant filters. Browser-test expense -> report -> drilldown -> download, consistent date changes and 390px tables. Independently reconcile totals to raw facts in isolated test DB, not merely to another call of the same function.

## 15. Implementation Notes

Original requirement §4.11's example double-counts refund-related effects; use the explicit rules here. Report dates and definitions are management policy, not legal/accounting advice. Data Center is removed as a module; retained report needs are implemented under Dashboard. Do not bring back excluded AI/promotion reports as plan-locked cards.
