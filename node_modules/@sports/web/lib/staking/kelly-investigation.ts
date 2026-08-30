/**
 * Kelly criterion investigation — educational stake sizing.
 *
 * Integrity:
 * - Uses caller-supplied p only; does not claim calibrated/PROVEN edge
 * - Default fractional Kelly (≤0.25); full Kelly never as product default
 * - Refuses stake when no edge vs market price
 * - Optional gate: refuse public claim if eligibility RED / performance dark
 *
 * Math SoT remains apps/web/lib/tracker/staking.ts
 */

import { staking, type Staking } from "@/lib/tracker/staking";

export type KellyInvestigation = Staking & {
  readonly regime: "full" | "half" | "quarter" | "custom";
  readonly integrity: {
    readonly treatsPAsVerified: false;
    readonly publicClaimAllowed: boolean;
    readonly reason: string;
  };
  readonly drawdownNote: string;
};

export function investigateKelly(input: {
  readonly winProb: number;
  readonly americanOdds: number;
  readonly bankroll: number;
  readonly fraction?: number;
  readonly publicClaimAllowed?: boolean;
}): KellyInvestigation {
  const fraction = input.fraction ?? 0.25;
  const base = staking(
    input.winProb,
    input.americanOdds,
    input.bankroll,
    fraction,
  );
  const regime: KellyInvestigation["regime"] =
    fraction === 1
      ? "full"
      : fraction === 0.5
        ? "half"
        : fraction === 0.25
          ? "quarter"
          : "custom";

  const publicClaimAllowed = input.publicClaimAllowed === true;
  return {
    ...base,
    stakeFraction: base.hasEdge ? base.stakeFraction : 0,
    stakeAmount: base.hasEdge ? base.stakeAmount : 0,
    regime,
    integrity: {
      treatsPAsVerified: false,
      publicClaimAllowed,
      reason: publicClaimAllowed
        ? "Performance gates open — still not a guarantee; educational sizing only."
        : "Eligibility RED or unpublished — Kelly shown as education only; no public stake advice / ROI claim.",
    },
    drawdownNote:
      "Full Kelly has extreme variance. Quarter-Kelly is the product default. " +
      "A −50% drawdown needs +100% recovery — size for survival, not speed.",
  };
}

export function evenMoneyFullKelly(p: number): number {
  const x = Math.min(1, Math.max(0, p));
  return Math.max(0, 2 * x - 1);
}
