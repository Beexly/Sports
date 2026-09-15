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
import { partitionInPlay, inPlayExclusionNote } from "@/lib/calibration/in-play-exclusion";

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
  /** Graded rows dropped because they were minted at/after kickoff. Reported, never silent. */
  readonly inPlayExcluded?: number;
  /** The one sentence describing that exclusion with its denominator. */
  readonly inPlayNote?: string;
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
  /** Graded rows excluded as in-play. Always present so the number is never silent. */
  readonly inPlayExcluded: number;
  /** Operator-readable statement of that exclusion, with its denominator. */
  readonly inPlayNote: string;
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
    inPlayExcluded: input.inPlayExcluded ?? 0,
    inPlayNote:
      input.inPlayNote ??
      inPlayExclusionNote(input.inPlayExcluded ?? 0, input.gradedSampleSize + (input.inPlayExcluded ?? 0)),
    beatCloseRatePct: allowed ? beatCloseRatePct : null,
    beatCloseCiLowPct: allowed ? beatCloseCiLowPct : null,
    beatCloseCiHighPct: allowed ? beatCloseCiHighPct : null,
    clearsBreakEven: allowed ? clearsBreakEven : false,
    publicMessage,
    operatorMessage,
    minimumRequirements,
  };
}

export interface LoadableClvClient {
  pick: {
    /**
     * Typed to the EXACT call below rather than to Record<string, unknown>.
     *
     * A loose structural signature is not assignable from the real PrismaClient
     * (its findMany is generic and overloaded), and the looser version of this
     * interface failed to compile against it. A local interface written to fit
     * a call rather than the driver is also how the line-archive outage of
     * 2026-08-22 stayed invisible to tsc for three weeks -- the type endorsed
     * the mistake. Same literal shape as ConfidenceTailDb, which does compile.
     */
    findMany(args: {
      where: {
        isBootstrap: false;
        isPublished: true;
        // Reference the shared constant's own type so the filter cannot drift
        // from the rule it implements (the VOID exclusion, C-279).
        result: typeof CLV_SAMPLE_RESULT_FILTER;
        clvVerdict: { not: null };
      };
      select: {
        clvVerdict: true;
        generatedAt: true;
        game: { select: { commenceTime: true } };
      };
    }): Promise<
      Array<{
        clvVerdict: string | null;
        generatedAt?: Date | null;
        game?: { commenceTime?: Date | null } | null;
      }>
    >;
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
  //
  // An IN-PLAY pick is EXCLUDED for the same reason, one step harder. A pick
  // generated at or after kickoff was locked at a LIVE price, so there is no
  // close for it to have beaten — the comparison is a live price against a
  // pre-game close and can only read as a loss. Measured 2026-09-14: 158 graded
  // rows were minted after kickoff and 0 of the 119 moneylines among them beat
  // the close, which is arithmetic rather than a model outcome. C-298 applied
  // this rule to the eligibility sample, C-299 stopped the generator minting
  // new ones, C-302 applied it to the confidence readers — and CLV is the
  // surface it had not reached. Same module, same semantics, so the rule still
  // has exactly one definition.
  const canonical = {
    isBootstrap: false,
    isPublished: true,
    result: CLV_SAMPLE_RESULT_FILTER,
  } as const;

  // One read rather than four counts: "in-play" compares a pick column against
  // a GAME column, which a Prisma `where` cannot express, so the partition has
  // to happen in app code. The select stays narrow and the population is the
  // graded rows only (~1.5k today), so this is a cheap read, not a table scan.
  const rows = await db.pick.findMany({
    where: { ...canonical, clvVerdict: { not: null } },
    select: {
      clvVerdict: true,
      generatedAt: true,
      game: { select: { commenceTime: true } },
    },
  });

  const { scored, excludedInPlay } = partitionInPlay(rows, (r) => ({
    generatedAt: r.generatedAt ?? null,
    commenceTime: r.game?.commenceTime ?? null,
  }));

  const countOf = (verdict: string): number =>
    scored.reduce((n, r) => (r.clvVerdict === verdict ? n + 1 : n), 0);

  return evaluatePublicClvPolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minGradedForPublic: input.minGradedForPublic,
    gradedSampleSize: scored.length,
    beatCloseCount: countOf("BEAT_CLOSE"),
    lostToCloseCount: countOf("LOST_TO_CLOSE"),
    matchedCloseCount: countOf("MATCHED_CLOSE"),
    inPlayExcluded: excludedInPlay.length,
    inPlayNote: inPlayExclusionNote(excludedInPlay.length, rows.length),
  });
}
