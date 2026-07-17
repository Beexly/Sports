import type { RealityReceipt } from "./types";

/**
 * Discriminated load result — kept separate from `load.ts` (which pulls in
 * `@sports/db`/`@sports/crypto`) so pure consumers (card.ts, tests) can
 * import just the type without dragging in DB/crypto dependencies.
 *
 * DB outage is a first-class outcome distinct from "no such game" or "game
 * exists but has no decision yet" — an outage must never be reported as
 * absence (same honesty invariant as every other proof route in this repo).
 */
export type RealityReceiptLoadFailureReason = "NOT_FOUND" | "NO_DECISION" | "UNAVAILABLE";

export type RealityReceiptLoad =
  | { readonly ok: true; readonly receipt: RealityReceipt }
  | { readonly ok: false; readonly reason: RealityReceiptLoadFailureReason };
