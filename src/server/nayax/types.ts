/**
 * Normalized Nayax shapes.
 *
 * Everything this codebase knows about Nayax stops at this file. The sync layer
 * and every query module speak these types, never raw Nayax JSON, so swapping
 * the fixture provider for the real HTTP client is a one line change in
 * getNayaxProvider() and nothing downstream moves.
 */

/** Matches machines.status in db/001_core.sql. Do not widen without widening the CHECK. */
export type NayaxMachineStatus = 'online' | 'offline' | 'warning'

export interface NayaxMachine {
  /** Keys to machines.telemetry_device_id (unique per operator). */
  deviceId: string
  status: NayaxMachineStatus
  lastSeenAt: Date
  firmware?: string
}

export interface NayaxTransaction {
  /**
   * Keys to orders.external_id (unique per operator). Must be stable across
   * polls: this value alone is what stops a re-poll from double counting
   * revenue.
   */
  externalId: string
  deviceId: string
  occurredAt: Date
  /** MDB selection code, keys to planogram_slots.selection_code. Null when the machine does not report one. */
  selectionCode: string | null
  productName: string | null
  quantity: number
  /** Gross amount in the operator's currency. Currency itself lives on operators, not per order. */
  amount: number
  /** Matches the orders.payment_method CHECK in db/002_sales.sql. */
  paymentMethod: 'card' | 'cash' | 'nfc' | 'qr' | 'other'
  /** Matches the orders.status CHECK in db/002_sales.sql. */
  status: 'completed' | 'refunded' | 'failed'
}

export interface NayaxInventoryLine {
  deviceId: string
  selectionCode: string
  /** Units remaining, as reported by DEX. */
  quantity: number
  capacity: number | null
  readAt: Date
}

export interface NayaxProvider {
  /** 'fixture' or 'lynx'. Logged on startup and stored in nayax_sync_state. */
  readonly name: string
  listMachines(): Promise<NayaxMachine[]>
  /**
   * Transactions with occurredAt strictly after `since`. Callers pass the
   * cursor from nayax_sync_state, so overlap is safe: externalId dedupes.
   */
  listTransactions(since: Date): Promise<NayaxTransaction[]>
  /** Empty array is valid and expected: not every machine reports DEX. */
  listInventory(): Promise<NayaxInventoryLine[]>
}

// ponytail: no paging in the interface, one call returns the whole fleet. Fine at
// the 26 machine demo scale and at a few hundred. If listTransactions ever needs
// to walk pages, make it an AsyncIterable here and the sync loop follows.
