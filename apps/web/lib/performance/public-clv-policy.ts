/**
 * Public CLV Policy
 *
 * Single source of truth for "can we publish a closing-line-value claim right
 * now?". CLV (did the price/line we locked beat where the market closed?) is the
 * sharp-credible leading indicator of edge — the one benchmark touts and AI
 * prediction sites never show. We only publish it under the same discipline as
 * the win-rate: gate-until-defensible, canonical-only, no fabricated numbers.
 *
 * The headline is the BEAT-CLOSE RATE (share of graded picks that beat the
 * close) — it is unit-free and comparable across pick kinds. We deliberately do
 * NOT surface an average CLV value, because spread/total points and moneyline
 * probability live in different units and averaging them would be meaningless.
 *
 * Rules:
 *   1. canExposePerformanceStats OFF → blocked, GATE_OFF_PERFORMANCE_STATS
 *   2. gradedSampleSize < min → blocked, INSUFFICIENT_GRADED_SAMPLE
 *   3. otherwise → allowed
 */

import { wilsonInterval, clearsThreshold } from "./wilson-interval";
import { CLV_SAMPLE_RESULT_FILTER } from "@/lib/clv/clv-sample-policy";

/** The market vig break-even line — beating the close below this isn't an edge. */
const VIG_BREAK_EVEN = 0.524;

export type PublicClvBlocker =
  | "GATE_OFF_PERFORMANCE_STATS"
  | "INSUFFICIENT_GRADED_SAMPLE";

export interface PublicClvPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
  /** Canonical (non-bootstrap, published) picks graded against a closing line. */
  readonly gradedSampleSize: number;
  readonly beatCloseCount: number;
  readonly lostToCloseCount: number;
  readonly matchedCloseCount: number;
}

export interface PublicClvPolicy {
  readonly canExposeClv: boolean;
  readonly blockers: readonly PublicClvBlocker[];
  readonly primaryReason: PublicClvBlocker | null;
  readonly gradedSampleSize: number;
  readonly beatCloseCount: number;
  readonly lostToCloseCount: number;
  readonly matchedCloseCount: number;
  /** Share (0–100, one decimal) of graded picks that beat the close. Null when gated. */
  readonly beatCloseRatePct: number | null;
  /** 95% Wilson lower/upper bound on the beat-close rate (0–100, one decimal). Null when gated. */
  readonly beatCloseCiLowPct: number | null;
  readonly beatCloseCiHighPct: number | null;
  /** True only when the 95% lower bound clears the 52.4% vig break-even — an honest edge claim. */
  readonly clearsBreakEven: boolean;
  readonly publicMessage: string;
  readonly operatorMessage: string;
  readonly minimumRequirements: readonly string[];
}

const MIN_GRADED_DEFAULT = 25;

export function evaluatePublicClvPolicy(
  input: PublicClvPolicyInput
): PublicClvPolicy {
  const minGraded = Math.max(
    1,
    input.minGradedForPublic > 0 ? input.minGradedForPublic : MIN_GRADED_DEFAULT
  );

  const blockers: PublicClvBlocker[] = [];
  if (!input.canExposePerformanceStats) {
    blockers.push("GATE_OFF_PERFORMANCE_STATS");
  }
  if (input.gradedSampleSize < minGraded) {
    blockers.push("INSUFFICIENT_GRADED_SAMPLE");
  }

  const allowed = blockers.length === 0;
  const primary = blockers[0] ?? null;

  // Beat-close rate over the full graded sample (matches summarizeClv: beat / n).
  const beatCloseRatePct =
    input.gradedSampleSize > 0
      ? Math.round((input.beatCloseCount / input.gradedSampleSize) * 1000) / 10
      : null;

  // Honest uncertainty: a 95% Wilson band on the rate. We only claim a real edge when
  // the LOWER bound clears the vig break-even — the point estimate alone overclaims.
  const ci = wilsonInterval(input.beatCloseCount, input.gradedSampleSize);
  const beatCloseCiLowPct = ci ? Math.round(ci.low * 1000) / 10 : null;
  const beatCloseCiHighPct = ci ? Math.round(ci.high * 1000) / 10 : null;
  const clearsBreakEven = ci ? clearsThreshold(ci, VIG_BREAK_EVEN) : false;

  const minimumRequirements: string[] = [];
  if (blockers.includes("GATE_OFF_PERFORMANCE_STATS")) {
    minimumRequirements.push(
      "Open the performance gate (PERFORMANCE_STATS_ENABLED=true) after canonical history accumulates."
    );
  }
  if (blockers.includes("INSUFFICIENT_GRADED_SAMPLE")) {
    minimumRequirements.push(
      `Grade at least ${minGraded} canonical picks against a closing line (currently ${input.gradedSampleSize}).`
    );
  }

  let publicMessage: string;
  let operatorMessage: string;

  if (allowed) {
    publicMessage =
      `Beat the close on ${beatCloseRatePct}% of ${input.gradedSampleSize} graded picks ` +
      `(95% CI ${beatCloseCiLowPct}-${beatCloseCiHighPct}%). ` +
      (clearsBreakEven
        ? `The lower bound clears the 52.4% break-even line. `
        : `That range still includes the 52.4% break-even line, so we don't yet claim a settled edge. `) +
      `Closing line value is a leading indicator, not a guarantee of future results.`;
    operatorMessage =
      `CLV publishable. graded=${input.gradedSampleSize} ` +
      `(beat ${input.beatCloseCount} / matched ${input.matchedCloseCount} / lost ${input.lostToCloseCount}); ` +
      `rate=${beatCloseRatePct}% CI=${beatCloseCiLowPct}-${beatCloseCiHighPct}% ` +
      `clearsBreakEven=${clearsBreakEven}; min=${minGraded}.`;
  } else {
    publicMessage =
      "Closing line value is still accruing. The CLV report opens once enough " +
      "picks have settled and been graded against the closing line. No number " +
      "is shown before it can be honestly backed.";
    operatorMessage =
      primary === "GATE_OFF_PERFORMANCE_STATS"
        ? `CLV gated: performance gate OFF. graded=${input.gradedSampleSize} min=${minGraded}.`
        : `CLV gated: graded sample too small. ${input.gradedSampleSize} of ${minGraded} graded picks.`;
  }

  return {
    canExposeClv: allowed,
    blockers,
    primaryReason: primary,
    gradedSampleSize: input.gradedSampleSize,
    beatCloseCount: input.beatCloseCount,
    lostToCloseCount: input.lostToCloseCount,
    matchedCloseCount: input.matchedCloseCount,
    beatCloseRatePct: allowed ? beatCloseRatePct : null,
    beatCloseCiLowPct: allowed ? beatCloseCiLowPct : null,
    beatCloseCiHighPct: allowed ? beatCloseCiHighPct : null,
    clearsBreakEven: allowed ? clearsBreakEven : false,
    publicMessage,
    operatorMessage,
    minimumRequirements,
  };
}

// ───────────────────────── CLV push doctrine (additive; no gate reads this) ─────────────────────────
//
// This repo's doctrine (AGENTS.md) is that a push is never averaged into a
// published rate. MATCHED_CLOSE is the CLV analogue of a push: it is neither
// a win nor a loss against the closing line. Whether beatCloseRatePct above
// (computed as beatCloseCount / gradedSampleSize) should exclude
// MATCHED_CLOSE the way a push is excluded from a win rate has never been
// decided anywhere in this codebase. Separately, the ESTABLISHED gate's
// 0.524 threshold is the break-even win rate at -110 odds, a DECIDED-only
// quantity, so a rate computed one way may be getting compared against a
// threshold defined the other way. Nobody has established which one the
// gate means.
//
// The type and function below do not decide that question and never will.
// They surface all three readings side by side, each with its own explicit
// denominator, so a reader sees the ambiguity instead of one silently-chosen
// number:
//
//   decidedClvBeatRate   = BEAT_CLOSE / (BEAT_CLOSE + LOST_TO_CLOSE)
//   allGradedClvBeatRate = BEAT_CLOSE / (BEAT_CLOSE + LOST_TO_CLOSE + MATCHED_CLOSE)
//   clvPushRate          = MATCHED_CLOSE / (BEAT_CLOSE + LOST_TO_CLOSE + MATCHED_CLOSE)
//
// allGradedClvBeatRate is the identical computation as beatCloseRatePct
// above, restated here under an explicit name next to the other two
// readings, so nobody mistakes it for the only possible denominator.
//
// Purely additive reporting. Nothing here reads or writes canExposeClv, any
// blocker, or any threshold: evaluatePublicClvPolicy above is untouched and
// never calls this.

// The three-reading helper lives in @sports/types (the boundary both the web
// package and the prediction engine already import), so every surface that
// reports a CLV beat rate shares ONE implementation and the readings cannot
// drift between surfaces. Re-exported here so existing importers of this
// module keep working unchanged.
export { computeClvPushDoctrineRates } from "@sports/types";
export type {
  ClvVerdictCounts,
  ClvPushDoctrineRates,
} from "@sports/types";

// (The local ClvPushDoctrineRates interface and computeClvPushDoctrineRates
// implementation that used to live here moved verbatim to @sports/types and
// are re-exported above.)

export interface LoadableClvClient {
  pick: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface LoadClvPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
}

export async function loadPublicClvPolicy(
  db: LoadableClvClient,
  input: LoadClvPolicyInput
): Promise<PublicClvPolicy> {
  // Canonical only: bootstrap-era picks never touch a public claim.
  //
  // A VOID pick is EXCLUDED. A withdrawal means we no longer stand behind the
  // recorded outcome, and CLV is a claim about a bet that stood — "we beat the
  // close" on a pick we withdrew is exactly the kind of unearned claim this
  // product's premise forbids. The row keeps its `clvVerdict` so the settlement
  // history stays intact; it is filtered HERE, at the read, rather than erased
  // (Devin Review, #733). Note this is a real interaction, not a hypothetical:
  // the line-integrity lane withdraws settled picks that already carry a
  // verdict from their original grading.
  const canonical = {
    isBootstrap: false,
    isPublished: true,
    result: CLV_SAMPLE_RESULT_FILTER,
  } as const;

  const [gradedSampleSize, beatCloseCount, lostToCloseCount, matchedCloseCount] =
    await Promise.all([
      db.pick.count({ where: { ...canonical, clvVerdict: { not: null } } }),
      db.pick.count({ where: { ...canonical, clvVerdict: "BEAT_CLOSE" } }),
      db.pick.count({ where: { ...canonical, clvVerdict: "LOST_TO_CLOSE" } }),
      db.pick.count({ where: { ...canonical, clvVerdict: "MATCHED_CLOSE" } }),
    ]);

  return evaluatePublicClvPolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minGradedForPublic: input.minGradedForPublic,
    gradedSampleSize,
    beatCloseCount,
    lostToCloseCount,
    matchedCloseCount,
  });
}
