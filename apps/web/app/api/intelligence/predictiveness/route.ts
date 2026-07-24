import { NextResponse } from "next/server";
import {
  loadPredictiveness,
  type PredictivenessProof,
  type PredictivenessSplit,
} from "@/lib/intelligence/predictiveness";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { MIN_HIT_RATE_SAMPLE } from "@/lib/intelligence/hit-rate-display";

export const dynamic = "force-dynamic";

/** A predictiveness split as served over the public JSON export: below
 * `MIN_HIT_RATE_SAMPLE` decided calls, the buy-low/sell-high hit rate is
 * redacted to `null` rather than the internal (always-computed) fraction. */
export type PublicPredictivenessSplit = Omit<PredictivenessSplit, "buyLowHitRate" | "sellHighHitRate"> & {
  readonly buyLowHitRate: number | null;
  readonly sellHighHitRate: number | null;
};

export type PublicPredictivenessProof = Omit<
  PredictivenessProof,
  "overall" | "byPosition" | "yearOverYear" | "yearOverYearByPosition" | "stacked" | "stackedByPosition"
> & {
  readonly overall: PublicPredictivenessSplit;
  readonly byPosition: readonly PublicPredictivenessSplit[];
  readonly yearOverYear: PublicPredictivenessSplit | null;
  readonly yearOverYearByPosition: readonly PublicPredictivenessSplit[];
  readonly stacked: PublicPredictivenessSplit | null;
  readonly stackedByPosition: readonly PublicPredictivenessSplit[];
};

/**
 * `summarize()` (in predictiveness.ts) always computes buyLowHitRate/
 * sellHighHitRate as soon as there is at least one buy-low/sell-high call —
 * predictiveness.test.ts's designed-data assertions depend on that raw value.
 * The render layer (components/intelligence/engine-view.tsx, via
 * `describeHitRate()`) withholds the percentage below MIN_HIT_RATE_SAMPLE
 * decided calls. This raw JSON export bypassed that floor entirely, and it's
 * one click away via the "JSON" button on /intelligence/engines — including
 * on "proof", the DEFAULT_ENGINE. Mirror the same floor here.
 */
export function redactThinHitRates(split: PredictivenessSplit): PublicPredictivenessSplit {
  return {
    ...split,
    buyLowHitRate: split.buyLowN >= MIN_HIT_RATE_SAMPLE ? split.buyLowHitRate : null,
    sellHighHitRate: split.sellHighN >= MIN_HIT_RATE_SAMPLE ? split.sellHighHitRate : null,
  };
}

export function redactUnpublishedPredictiveness(proof: PredictivenessProof): PublicPredictivenessProof {
  return {
    ...proof,
    overall: redactThinHitRates(proof.overall),
    byPosition: proof.byPosition.map(redactThinHitRates),
    yearOverYear: proof.yearOverYear ? redactThinHitRates(proof.yearOverYear) : null,
    yearOverYearByPosition: proof.yearOverYearByPosition.map(redactThinHitRates),
    stacked: proof.stacked ? redactThinHitRates(proof.stacked) : null,
    stackedByPosition: proof.stackedByPosition.map(redactThinHitRates),
  };
}

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/predictiveness");
  if (denied) return denied;
  const data = await loadPredictiveness();
  return NextResponse.json({ success: data.status !== "source-error", data: redactUnpublishedPredictiveness(data) });
}
