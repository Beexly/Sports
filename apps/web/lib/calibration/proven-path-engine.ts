/**
 * PROVEN path engine — raise Murphy resolution without lowering floors.
 *
 * Law: maps (Platt/Temp/Isotonic) fix REL, not RES. This module:
 *  1) Ranks sport|market groups; builds pause list (Res≈0)
 *  2) Sweeps selective thresholds; picks max Res with n ≥ minN
 *  3) Compares ranking scores (confidence vs independent trueProb vs blend)
 *  4) Emits durable plan for ops truth + runtime pause/filter
 *
 * RANKING PROBABILITY LAW (hard — 2026-08-09 polarity fix + quality pass):
 *   ranking p for Brier / RES / separation / selective MUST be a win probability:
 *     - confidence/100
 *     - independent trueProb (raw model P)
 *     - blend of those two
 *     - market de-vig fair (baseline only)
 *   NEVER use edge, rawEdge, shrunkEdge, or edgeScore as p.
 *   bestScore = argmax RES among scores with:
 *     separation > 0, n ≥ 50, and coverage ≥ 40% of *eligible* n (non-conf kinds).
 *     Eligible n for independent/blend = MONEYLINE|SPREAD rows only (TOTAL has no
 *     honest team-win trueProb under current backfill law — do not dilute coverage).
 *   If none qualify → confidence; pathViable stays honest.
 *
 * Does NOT set publishedEffective, AUTO_PUBLISH, or lower floors.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";
import {
  selectivePublishSweep,
  filterSelective,
  type SelectiveRow,
  type SelectiveMetrics,
} from "@/lib/calibration/selective-publish";
import { buildHoldoutRankingReport } from "@/lib/calibration/holdout-ranking-report";

/** Score kinds that are valid win probabilities (never edge-as-p). */
export type RankingScoreKind =
  | "confidence"
  | "independent_trueProb"
  | "blend_indep_conf"
  | "marketFairProb";

export type ProvenPathPickRow = {
  readonly pConfidence: number; // confidence/100 — win probability
  /**
   * @deprecated Diagnostic only — signed edge or edgeScore/100.
   * NEVER used as ranking probability p (category error: edge ≠ P(side)).
   * Kept optional for ops diagnostics; bake-off ignores it.
   */
  readonly pEdge?: number | null;
  /** Independent trueProb only (0–1). Never confidence-echo rankingP. */
  readonly pIndependent: number | null;
  /** Optional market de-vig fair for side (0–1) — baseline only, not edge. */
  readonly marketP?: number | null;
  readonly y: 0 | 1;
  readonly groupKey: string;
};

export type ScoreBakeoffRow = {
  readonly score: RankingScoreKind;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyResolution: number;
  readonly murphyReliability: number;
  /** mean p|win − mean p|loss — must be > 0 for bestScore eligibility */
  readonly separation: number;
  /** n_kind / n_confidence — thin independent tails cannot win bestScore */
  readonly coverage: number;
};

export type ProvenPathPlan = {
  readonly generatedAt: string;
  /** Winning score metrics (not pre-filter confidence — see scoreBakeoff). */
  readonly baseline: ScoreBakeoffRow;
  readonly scoreBakeoff: readonly ScoreBakeoffRow[];
  readonly bestScore: RankingScoreKind;
  readonly selectiveRecommended: SelectiveMetrics | null;
  readonly selectiveGainRes: number | null;
  readonly pauseGroups: readonly string[];
  readonly keepGroups: readonly string[];
  readonly defaultDelta: number;
  readonly pathSteps: readonly string[];
  readonly honesty: string;
  readonly floorsUnchanged: true;
  /** Explicit: edge-as-p banned; only separation>0 scores can win bestScore. */
  readonly rankingPolarityLaw: "positive_separation_required";
};

function scoreMetrics(
  score: RankingScoreKind,
  samples: readonly CalibrationSample[],
  confN: number,
): ScoreBakeoffRow {
  if (samples.length === 0) {
    return {
      score,
      n: 0,
      brier: NaN,
      ece: NaN,
      murphyResolution: NaN,
      murphyReliability: NaN,
      separation: NaN,
      coverage: 0,
    };
  }
  const d = brierDecomposition(samples);
  const wins = samples.filter((s) => s.y === 1);
  const losses = samples.filter((s) => s.y === 0);
  const meanPWin =
    wins.length === 0 ? NaN : wins.reduce((a, s) => a + s.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((a, s) => a + s.p, 0) / losses.length;
  return {
    score,
    n: samples.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyResolution: d.resolution,
    murphyReliability: d.reliability,
    separation: meanPWin - meanPLoss,
    coverage: confN > 0 ? samples.length / confN : 0,
  };
}

/** Map a row to a win probability for a ranking score kind. Never uses edge. */
export function scoreProbability(
  r: ProvenPathPickRow,
  kind: RankingScoreKind,
): number | null {
  if (kind === "confidence") {
    return Number.isFinite(r.pConfidence) ? r.pConfidence : null;
  }
  if (kind === "independent_trueProb") {
    if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) return null;
    return r.pIndependent;
  }
  if (kind === "blend_indep_conf") {
    if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) return null;
    return 0.5 * r.pConfidence + 0.5 * r.pIndependent;
  }
  if (kind === "marketFairProb") {
    if (r.marketP == null || !Number.isFinite(r.marketP)) return null;
    return r.marketP;
  }
  return null;
}

function toSamples(
  rows: readonly ProvenPathPickRow[],
  kind: RankingScoreKind,
): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  for (const r of rows) {
    const raw = scoreProbability(r, kind);
    if (raw == null || !Number.isFinite(raw)) continue;
    const p = Math.min(1 - 1e-6, Math.max(1e-6, raw));
    out.push({ p, y: r.y });
  }
  return out;
}

function toSelectiveRows(
  rows: readonly ProvenPathPickRow[],
  kind: RankingScoreKind,
): SelectiveRow[] {
  const out: SelectiveRow[] = [];
  for (const r of rows) {
    const raw = scoreProbability(r, kind);
    if (raw == null || !Number.isFinite(raw)) continue;
    out.push({
      p: Math.min(1 - 1e-6, Math.max(1e-6, raw)),
      y: r.y,
      groupKey: r.groupKey,
      marketP: r.marketP ?? null,
    });
  }
  return out;
}

/**
 * Build the full PROVEN path plan from settled rows.
 * minN: minimum after selective for recommendation (default 100 = learning floor).
 */
export function buildProvenPathPlan(
  rows: readonly ProvenPathPickRow[],
  options?: { readonly minN?: number; readonly defaultDelta?: number },
): ProvenPathPlan {
  const minN = options?.minN ?? 100;
  const defaultDelta = options?.defaultDelta ?? 0.1;
  const generatedAt = new Date().toISOString();

  // Probability-only kinds. edgeScore / blend_conf_edge intentionally absent.
  const kinds: RankingScoreKind[] = [
    "confidence",
    "independent_trueProb",
    "blend_indep_conf",
    "marketFairProb",
  ];
  const confSamples = toSamples(rows, "confidence");
  const confN = confSamples.length;
  // Independent trueProb is defined for ML/SPREAD team-win only (not TOTAL).
  // Coverage denominator must match that universe or independent never reaches 40%
  // while TOTAL rows pad confidence n.
  const indepEligibleN = Math.max(
    1,
    rows.filter((r) => {
      const market = (r.groupKey.split("|")[1] ?? "").toUpperCase();
      return market === "MONEYLINE" || market === "SPREAD" || market === "H2H" || market === "ML";
    }).length,
  );
  const scoreBakeoff = kinds.map((k) => {
    const denom =
      k === "independent_trueProb" || k === "blend_indep_conf" || k === "marketFairProb"
        ? indepEligibleN
        : confN;
    return scoreMetrics(k, toSamples(rows, k), denom);
  });

  // bestScore: max RES among separation > 0, n ≥ 50, coverage ≥ 40% (non-conf).
  const confRow =
    scoreBakeoff.find((r) => r.score === "confidence") ?? scoreBakeoff[0]!;
  let bestScore: RankingScoreKind = "confidence";
  let best = confRow;
  const minCoverage = 0.4;
  for (const row of scoreBakeoff) {
    if (!Number.isFinite(row.murphyResolution) || row.n < 50) continue;
    // Polarity gate: anti-ranking scores cannot win.
    if (!(row.separation > 0)) continue;
    // Coverage gate: thin SPEAK tails cannot overfit bestScore.
    if (row.score !== "confidence" && row.coverage < minCoverage) continue;
    if (
      !(best.separation > 0) ||
      row.murphyResolution > best.murphyResolution + 1e-9 ||
      (Math.abs(row.murphyResolution - best.murphyResolution) < 1e-9 &&
        row.separation > best.separation)
    ) {
      best = row;
      bestScore = row.score;
    }
  }
  // If best is still confidence but confidence itself has sep ≤ 0, keep it
  // (honest fallback) — never promote inverted independent scores.
  if (!(best.separation > 0) && bestScore !== "confidence") {
    bestScore = "confidence";
    best = confRow;
  }

  const selectiveRows = toSelectiveRows(rows, bestScore);
  const holdout = buildHoldoutRankingReport(selectiveRows, { minGroupN: 20 });
  const groupResMap: Record<string, number> = {};
  for (const g of holdout.groups) groupResMap[g.groupKey] = g.murphyResolution;

  const sweep = selectivePublishSweep(selectiveRows, {
    deltas: [0, 0.08, 0.1, 0.12, 0.15, 0.18],
    edges: [null, 0.03, 0.05],
    minGroupResList: [null, 0.005, 0.01],
    groupResMap,
    minN,
  });

  const pauseGroups = holdout.pauseCandidates;
  const keepGroups = holdout.groups
    .filter((g) => !pauseGroups.includes(g.groupKey))
    .map((g) => g.groupKey);

  const selectiveGainRes =
    sweep.recommended && Number.isFinite(sweep.baseline.murphyResolution)
      ? sweep.recommended.murphyResolution - sweep.baseline.murphyResolution
      : null;

  const polarityNote =
    best.separation > 0
      ? `bestScore=${bestScore} with positive separation ${best.separation.toFixed(4)} (coverage ${(best.coverage * 100).toFixed(0)}%)`
      : "no score kind has separation>0 with adequate coverage — ranking signal near noise; use confidence fallback";

  return {
    generatedAt,
    baseline: best,
    scoreBakeoff,
    bestScore,
    selectiveRecommended: sweep.recommended,
    selectiveGainRes,
    pauseGroups,
    keepGroups,
    defaultDelta:
      sweep.recommended?.delta != null && Number.isFinite(sweep.recommended.delta)
        ? sweep.recommended.delta
        : defaultDelta,
    pathSteps: [
      `1. Use ranking score = ${bestScore} (${polarityNote}) — never edge-as-p`,
      "2. Pause sport|market groups with Res≈0 (pauseGroups)",
      "3. Selective publish |p−0.5|≥δ (and market edge filter when marketP exists)",
      "4. Re-run calibration-metrics on published canonical WIN/LOSS only",
      "5. When Brier≤0.22, ECE≤0.05, Murphy R≤0.05, Res meaningful, n≥100 → streak GREEN×K",
      "6. Only then CALIBRATION_AUTO_PUBLISH (still never lower floors)",
      "7. Maps (Platt/Temp/Isotonic) only after RES moves — apply still OFF until holdout floors",
    ],
    honesty:
      "Edge/edgeScore is NOT a win probability (rawEdge = trueProb − marketFair). " +
      "Bake-off only uses confidence, independent trueProb, blend_indep_conf, marketFairProb. " +
      "bestScore requires separation > 0 and coverage ≥ 40% of eligible n (ML/SPREAD for independent). " +
      "pIndependent load must be raw trueProb only — never confidence-echo rankingP. " +
      "If selectiveGainRes≈0 and independents still weak, need sport models / features — not maps. " +
      "Maps will not unlock PROVEN.",
    floorsUnchanged: true,
    rankingPolarityLaw: "positive_separation_required",
  };
}

/** Runtime pause set for public filter (from plan or empty). */
export function shouldPublishGroup(
  groupKey: string,
  pauseGroups: readonly string[],
): boolean {
  return !pauseGroups.includes(groupKey);
}

/** Apply plan thresholds to a row (for public filter). */
export function passesProvenPathFilter(
  row: SelectiveRow,
  plan: Pick<ProvenPathPlan, "defaultDelta" | "pauseGroups" | "selectiveRecommended">,
): boolean {
  if (plan.pauseGroups.includes(row.groupKey)) return false;
  const delta = plan.selectiveRecommended?.delta ?? plan.defaultDelta;
  const edge = plan.selectiveRecommended?.edge ?? null;
  const minGroupRes = plan.selectiveRecommended?.minGroupRes ?? null;
  return filterSelective([row], {
    delta,
    edge,
    minGroupRes,
    groupResMap: undefined,
  }).length === 1;
}
