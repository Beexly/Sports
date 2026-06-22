/**
 * CLV Coverage — the integrity backbone of the closing-line-value north-star.
 *
 * Beat-close rate is only honest if it is computed over (nearly) ALL settled
 * picks. If a pick settles WITHOUT ever being graded against a closing line —
 * because no odds snapshot existed at or before kickoff — then the published
 * beat-close rate is silently computed over a biased subsample. That is
 * survivorship: the engine looks sharper than it is because the ungradeable
 * picks quietly drop out.
 *
 * This module measures the share of settled, played, canonical picks that
 * actually received a CLV record at close. It is the receipt behind the claim
 * "every pick gets a CLV record at close": a single coverage number, a health
 * band, and remediation — so a coverage hole is VISIBLE instead of hidden.
 *
 * It is deliberately separate from public-clv-policy.ts: that module decides
 * whether the beat-close RATE may be published; this one decides whether the
 * rate can be TRUSTED in the first place. Coverage gates credibility upstream of
 * the public gate.
 *
 * Pure evaluator + a thin DB loader (mirrors public-clv-policy.ts). No fabricated
 * numbers — coverage is counted from persisted picks, never invented.
 */

export type ClvCoverageHealth = "NO_DATA" | "HEALTHY" | "DEGRADED" | "CRITICAL";

export interface ClvCoverageInput {
  /** Canonical, played (WIN/LOSS/PUSH) picks — games that actually reached a close. */
  readonly settledEligible: number;
  /** Of those, how many carry a graded CLV record (clvVerdict set). */
  readonly graded: number;
  /** Coverage at or above this percent is HEALTHY. Default 95. */
  readonly healthyThresholdPct?: number;
  /** Coverage at/above this (but below healthy) is DEGRADED; below it is CRITICAL. Default 80. */
  readonly degradedThresholdPct?: number;
}

export interface ClvCoverage {
  readonly settledEligible: number;
  readonly graded: number;
  readonly uncovered: number;
  /** graded / settledEligible as a percent (one decimal). Null when no eligible picks. */
  readonly coverageRatePct: number | null;
  readonly health: ClvCoverageHealth;
  /** True only when coverage is exactly 100% over a non-empty sample. */
  readonly invariantHolds: boolean;
  readonly operatorMessage: string;
  readonly remediation: readonly string[];
}

const HEALTHY_DEFAULT = 95;
const DEGRADED_DEFAULT = 80;

/**
 * Evaluate CLV coverage from two counts: how many played canonical picks have
 * settled, and how many of those were graded against a closing line. Pure.
 *
 * `graded` is clamped to `[0, settledEligible]` defensively — in the DB it is a
 * strict subset of the eligible set, but we never want a count glitch to invent
 * coverage above 100% or a negative uncovered count.
 */
export function evaluateClvCoverage(input: ClvCoverageInput): ClvCoverage {
  const healthyAt = clampPct(input.healthyThresholdPct, HEALTHY_DEFAULT);
  const degradedAt = clampPct(input.degradedThresholdPct, DEGRADED_DEFAULT);

  const settledEligible = Math.max(0, Math.floor(input.settledEligible));
  const graded = Math.min(settledEligible, Math.max(0, Math.floor(input.graded)));
  const uncovered = settledEligible - graded;

  if (settledEligible === 0) {
    return {
      settledEligible: 0,
      graded: 0,
      uncovered: 0,
      coverageRatePct: null,
      health: "NO_DATA",
      invariantHolds: false,
      operatorMessage:
        "No settled, played, canonical picks yet — CLV coverage is not measurable until picks settle against real games.",
      remediation: [],
    };
  }

  const coverageRatePct = Math.round((graded / settledEligible) * 1000) / 10;
  const invariantHolds = uncovered === 0;

  let health: ClvCoverageHealth;
  if (coverageRatePct >= healthyAt) health = "HEALTHY";
  else if (coverageRatePct >= degradedAt) health = "DEGRADED";
  else health = "CRITICAL";

  const operatorMessage = invariantHolds
    ? `CLV invariant holds: all ${settledEligible} settled picks were graded against the close (100%).`
    : `CLV coverage ${coverageRatePct}% — ${uncovered} of ${settledEligible} settled picks have NO closing-line grade. ` +
      `The beat-close rate is being computed over a partial sample until this reaches 100%.`;

  const remediation = invariantHolds
    ? []
    : [
        "Each uncovered pick settled without a closing-line snapshot at/before kickoff. " +
          "Audit those picks for clvCapturedAt IS NULL.",
        "Ensure an odds snapshot is fetched at or just before every game's commence time " +
          "so deriveClosingSnapshotFromOdds() always has a row to grade against.",
        "Increase odds-refresh frequency near kickoff on game day, or add a pre-kickoff " +
          "closing-line capture pass, before treating beat-close rate as the north-star.",
      ];

  return {
    settledEligible,
    graded,
    uncovered,
    coverageRatePct,
    health,
    invariantHolds,
    operatorMessage,
    remediation,
  };
}

function clampPct(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

// ───────────────────────── DB loader ─────────────────────────

export interface ClvCoverageClient {
  pick: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface LoadClvCoverageInput {
  readonly healthyThresholdPct?: number;
  readonly degradedThresholdPct?: number;
}

/**
 * Load CLV coverage from the live pick table. Eligible = canonical (non-bootstrap,
 * published), non-seed picks whose game actually played (result WIN/LOSS/PUSH).
 * VOID is excluded — a cancelled game never had a close to beat, so it can't be a
 * coverage hole. Graded = eligible AND clvVerdict is set.
 */
export async function loadClvCoverage(
  db: ClvCoverageClient,
  input: LoadClvCoverageInput = {}
): Promise<ClvCoverage> {
  const eligibleWhere = {
    isBootstrap: false,
    isPublished: true,
    NOT: { modelVersion: { contains: "seed" } },
    result: { in: ["WIN", "LOSS", "PUSH"] },
  } as const;

  const [settledEligible, graded] = await Promise.all([
    db.pick.count({ where: { ...eligibleWhere } }),
    db.pick.count({ where: { ...eligibleWhere, clvVerdict: { not: null } } }),
  ]);

  return evaluateClvCoverage({
    settledEligible,
    graded,
    ...(input.healthyThresholdPct !== undefined
      ? { healthyThresholdPct: input.healthyThresholdPct }
      : {}),
    ...(input.degradedThresholdPct !== undefined
      ? { degradedThresholdPct: input.degradedThresholdPct }
      : {}),
  });
}
