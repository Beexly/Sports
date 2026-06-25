/**
 * FANTASY DISCOVERY LAYER — Waiver Leverage Engine (Invention F7).
 *
 * Recommends a waiver disposition and a FAAB band from role value, scarcity, roster need, playoff
 * utility, acquisition probability, and the costs (FAAB, the drop, uncertainty). It answers the
 * real question — "what is this add WORTH to THIS roster, net of what it costs?" — not "is he good?"
 * Pure + deterministic. Emits a recommendation only; it never submits a claim.
 */

export interface WaiverInputs {
  readonly futureRoleValue: number;       // 0..1
  readonly scarcity: number;              // 0..1 (replacement-level thinness)
  readonly rosterNeed: number;            // 0..1
  readonly playoffUtility: number;        // 0..1
  readonly acquisitionProbability: number;// 0..1
  readonly faabCost: number;              // 0..1 (proposed bid as fraction of budget)
  readonly dropCost: number;              // 0..1 (value of the player you'd drop)
  readonly uncertaintyPenalty: number;    // 0..1
}

export type WaiverAction =
  | "AGGRESSIVE_FAAB" | "DISCIPLINED_FAAB" | "CLAIM_ONLY_IF_FREE" | "WATCHLIST" | "PASS";

export interface WaiverRecommendation {
  readonly leverage: number;
  readonly gross: number;
  /** Recommended FAAB bid band as a fraction of budget (0..1); [0,0] for non-FAAB actions. */
  readonly faabBand: readonly [number, number];
  readonly action: WaiverAction;
  readonly note: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Recommend a waiver disposition and FAAB band. */
export function recommendWaiver(i: WaiverInputs): WaiverRecommendation {
  const gross = i.futureRoleValue * (0.4 + 0.6 * i.scarcity) * (0.5 + 0.5 * i.rosterNeed) * (0.6 + 0.4 * i.playoffUtility) * i.acquisitionProbability;
  const leverage = gross - 0.5 * i.faabCost - 0.5 * i.dropCost - 0.3 * i.uncertaintyPenalty;

  const mid = clamp01(gross * 0.45);
  const spread = 0.06 + 0.1 * i.uncertaintyPenalty;
  const faabBand: [number, number] = [Number(clamp01(mid - spread).toFixed(3)), Number(clamp01(mid + spread).toFixed(3))];

  let action: WaiverAction;
  if (i.rosterNeed < 0.3 && i.futureRoleValue >= 0.35) action = "WATCHLIST"; // good role, no need → track, don't spend
  else if (leverage <= 0) action = "PASS";
  else if (gross >= 0.42 && i.uncertaintyPenalty < 0.4) action = "AGGRESSIVE_FAAB";
  else if (gross >= 0.2) action = "DISCIPLINED_FAAB";
  else action = "CLAIM_ONLY_IF_FREE";

  const band = action === "AGGRESSIVE_FAAB" || action === "DISCIPLINED_FAAB" ? faabBand : ([0, 0] as [number, number]);
  return {
    leverage: Number(leverage.toFixed(4)),
    gross: Number(gross.toFixed(4)),
    faabBand: band,
    action,
    note: action === "PASS"
      ? "Net-negative leverage after FAAB/drop/uncertainty — pass."
      : action === "WATCHLIST"
        ? "Good role but no roster need — watchlist, don't spend."
        : action === "CLAIM_ONLY_IF_FREE"
          ? "Marginal value — claim only at minimum bid."
          : `${action.replace("_", " ")}: bid ${(band[0] * 100).toFixed(0)}–${(band[1] * 100).toFixed(0)}% FAAB.`,
  };
}
