/**
 * Public ROI Policy — the units/ROI counterpart to the Wilson-gated CLV policy.
 *
 * Win rate is a proportion (Wilson). ROI in UNITS is a mean of skewed continuous
 * per-bet returns — a few big prices skew it — so the honest band comes from the
 * deterministic BCa bootstrap (bcaMeanCi), and the interval reproduces from the
 * sealed ledger by anyone (the RNG is seeded). Same discipline as everywhere
 * else: gate-until-defensible, canonical only, and we only CLAIM profit when the
 * 95% LOWER bound clears break-even (0 units) — the point estimate alone
 * overclaims exactly the way a tout would.
 */

import { bcaMeanCi, americanToDecimalOdds } from "@sports/prediction-engine";

export type PickResultLike = "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";

/**
 * Realized units for one settled pick at a 1-unit flat stake, using the actual
 * American entry price. WIN pays the decimal profit; LOSS loses the stake;
 * PUSH/VOID/PENDING are 0 (no action). No entry price -> null (excluded).
 */
export function unitsForPick(result: PickResultLike, americanEntryOdds: number | null | undefined): number | null {
  if (result === "PUSH" || result === "VOID" || result === "PENDING") return 0;
  if (americanEntryOdds == null || !Number.isFinite(americanEntryOdds) || americanEntryOdds === 0) return null;
  if (result === "WIN") return americanToDecimalOdds(americanEntryOdds) - 1;
  return -1; // LOSS
}

export type PublicRoiBlocker = "GATE_OFF_PERFORMANCE_STATS" | "INSUFFICIENT_GRADED_SAMPLE";

export interface PublicRoiPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
  /** Per-settled-pick unit returns (canonical, published, priced). */
  readonly returns: readonly number[];
}

export interface PublicRoiPolicy {
  readonly canExposeRoi: boolean;
  readonly blockers: readonly PublicRoiBlocker[];
  readonly primaryReason: PublicRoiBlocker | null;
  readonly gradedSampleSize: number;
  /** Mean units per bet (2 decimals). Null when gated. */
  readonly roiPerBet: number | null;
  /** 95% BCa lower/upper bound on units per bet (2 decimals). Null when gated. */
  readonly roiCiLow: number | null;
  readonly roiCiHigh: number | null;
  /** True only when the 95% BCa lower bound clears 0 units — an honest profit claim. */
  readonly clearsProfit: boolean;
  readonly publicMessage: string;
  readonly operatorMessage: string;
  readonly minimumRequirements: readonly string[];
}

const MIN_GRADED_DEFAULT = 25;

export function evaluatePublicRoiPolicy(input: PublicRoiPolicyInput): PublicRoiPolicy {
  const minGraded = Math.max(1, input.minGradedForPublic > 0 ? input.minGradedForPublic : MIN_GRADED_DEFAULT);
  const n = input.returns.length;

  const blockers: PublicRoiBlocker[] = [];
  if (!input.canExposePerformanceStats) blockers.push("GATE_OFF_PERFORMANCE_STATS");
  if (n < minGraded) blockers.push("INSUFFICIENT_GRADED_SAMPLE");
  const allowed = blockers.length === 0;
  const primary = blockers[0] ?? null;

  const ci = n >= 2 ? bcaMeanCi(input.returns) : null;
  const roiPerBet = ci ? round2(ci.point) : null;
  const roiCiLow = ci ? round2(ci.low) : null;
  const roiCiHigh = ci ? round2(ci.high) : null;
  const clearsProfit = ci ? ci.low > 0 : false;

  const minimumRequirements: string[] = [];
  if (blockers.includes("GATE_OFF_PERFORMANCE_STATS")) {
    minimumRequirements.push("Open the performance gate (PERFORMANCE_STATS_ENABLED=true) after canonical history accumulates.");
  }
  if (blockers.includes("INSUFFICIENT_GRADED_SAMPLE")) {
    minimumRequirements.push(`Settle at least ${minGraded} priced canonical picks (currently ${n}).`);
  }

  let publicMessage: string;
  let operatorMessage: string;
  if (allowed) {
    publicMessage =
      `${signed(roiPerBet)} units per bet over ${n} settled picks ` +
      `(95% CI ${signed(roiCiLow)} to ${signed(roiCiHigh)} units). ` +
      (clearsProfit
        ? "The lower bound clears break-even. "
        : "That range still includes break-even, so we don't yet claim a settled profit. ") +
      "Past results are a record, not a promise of future returns.";
    operatorMessage =
      `ROI publishable. n=${n} roi=${signed(roiPerBet)}u ` +
      `CI=[${signed(roiCiLow)},${signed(roiCiHigh)}]u clearsProfit=${clearsProfit}; min=${minGraded}.`;
  } else {
    publicMessage =
      "The units/ROI record is still accruing. It opens once enough priced picks have settled. " +
      "No profit number is shown before it can be honestly backed.";
    operatorMessage =
      primary === "GATE_OFF_PERFORMANCE_STATS"
        ? `ROI gated: performance gate OFF. n=${n} min=${minGraded}.`
        : `ROI gated: sample too small. ${n} of ${minGraded} settled priced picks.`;
  }

  return {
    canExposeRoi: allowed,
    blockers,
    primaryReason: primary,
    gradedSampleSize: n,
    roiPerBet: allowed ? roiPerBet : null,
    roiCiLow: allowed ? roiCiLow : null,
    roiCiHigh: allowed ? roiCiHigh : null,
    clearsProfit: allowed ? clearsProfit : false,
    publicMessage,
    operatorMessage,
    minimumRequirements,
  };
}

// ── Data loader ──────────────────────────────────────────────────────────────

export interface LoadableRoiClient {
  pick: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    }) => Promise<Array<{ result: string; proofReceipt: { entryOdds: number } | null }>>;
  };
}

export interface LoadRoiPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
}

/**
 * Load the ROI policy from settled, canonical, published picks joined to their
 * proof-receipt entry price (the honest, sealed source of the price we actually
 * entered at). Picks with no receipt price are excluded, never guessed.
 */
export async function loadPublicRoiPolicy(
  db: LoadableRoiClient,
  input: LoadRoiPolicyInput,
): Promise<PublicRoiPolicy> {
  const rows = await db.pick.findMany({
    where: {
      isBootstrap: false,
      isPublished: true,
      result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
    },
    select: { result: true, proofReceipt: { select: { entryOdds: true } } },
  });

  const returns: number[] = [];
  for (const r of rows) {
    const u = unitsForPick(r.result as PickResultLike, r.proofReceipt?.entryOdds ?? null);
    if (u !== null) returns.push(u);
  }

  return evaluatePublicRoiPolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minGradedForPublic: input.minGradedForPublic,
    returns,
  });
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function signed(x: number | null): string {
  if (x == null) return "n/a";
  return x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2);
}
