/**
 * Per-pick Closing-Line Value.
 *
 * The missing bridge between the pure `clv.ts` primitives and a real Pick
 * record: it resolves the bettor's side from the SAME selection convention
 * `settlement.ts` uses (so CLV and settlement can never disagree about which
 * side a pick was), then dispatches to the right `clv.ts` primitive.
 *
 * Pure — no DB, no side effects, fully unit-testable. Persisting CLV per pick
 * (capturing the closing line at lock + a schema field) is a separate,
 * deliberate step; this is the engine primitive that step will call.
 *
 * Line conventions match `settlement.ts` / `clv.ts`:
 *   SPREAD `line` is from the HOME team's perspective.
 *   TOTAL  `line` is the combined points total.
 *   MONEYLINE — pass the bettor's locked American price as `pickLine` and the
 *               closing American price as `closeLine`.
 */

import type { PickType } from "@sports/types";
import {
  computeSpreadClv,
  computeTotalClv,
  computeMoneylineClv,
  type ClvVerdict,
} from "./clv.js";

export interface PickClvResult {
  /** POINTS for spread/total CLV; PROBABILITY for moneyline (implied-prob) CLV. */
  readonly metric: "POINTS" | "PROBABILITY";
  /** Positive = beat the close. Points for spread/total, probability for ML. */
  readonly value: number;
  readonly verdict: ClvVerdict;
}

/**
 * Compute a single pick's CLV against its closing line.
 *
 * @param pickType   SPREAD | MONEYLINE | TOTAL
 * @param selection  the pick selection string (contains `homeTeam` for a home
 *                   pick; starts with "OVER"/"UNDER" for totals) — the same
 *                   source of truth `settlement.ts` reads.
 * @param pickLine   line locked at pick time (points for spread/total; American
 *                   price for moneyline).
 * @param closeLine  the closing line (points for spread/total; American price
 *                   for moneyline).
 * @param homeTeam   home team name, used to resolve HOME vs AWAY for spreads.
 * @returns the CLV result, or `null` for an unsupported pick type.
 */
export function computePickClv(
  pickType: PickType,
  selection: string,
  pickLine: number,
  closeLine: number,
  homeTeam: string,
): PickClvResult | null {
  if (pickType === "SPREAD") {
    const side = selection.includes(homeTeam) ? "HOME" : "AWAY";
    const r = computeSpreadClv(pickLine, closeLine, side);
    return { metric: "POINTS", value: r.clvPoints, verdict: r.verdict };
  }
  if (pickType === "TOTAL") {
    const side = selection.startsWith("OVER") ? "OVER" : "UNDER";
    const r = computeTotalClv(pickLine, closeLine, side);
    return { metric: "POINTS", value: r.clvPoints, verdict: r.verdict };
  }
  if (pickType === "MONEYLINE") {
    const r = computeMoneylineClv(pickLine, closeLine);
    return { metric: "PROBABILITY", value: r.clvProbability, verdict: r.verdict };
  }
  return null;
}
