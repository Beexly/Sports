/**
 * Ranking Power Control Plane (RPCP) — GSE website-optimized SoT for RES lift.
 *
 * Innovation beyond holdout-significance / Spearman / Platt explore:
 *   - Fuses significance + rank correlation + Murphy RES into one control artifact
 *     that the ops surface and proven-path both consume.
 *   - Residual attribution: quantifies how much of the RES gap is caused by
 *     (1) dead groups, (2) confidence ≈ market echo, (3) missing independent rankingP.
 *   - pathViable is evidence-backed (Spearman rankingSignal ∧ significance ∧ projected ΔRES).
 *   - Every field carries an operatorHint so the founder surface is self-explaining.
 *
 * Laws (non-negotiable):
 *   - Floors unchanged. Maps stay apply OFF while live RES < 0.02.
 *   - No public copy, no AUTO_PUBLISH flip, no gate changes.
 *   - Independent modelProb / rankingP is the primary lever; maps never invent RES.
 */

import {
  computeHoldoutSignificance,
  type HoldoutRow,
  type HoldoutSignificanceArtifact,
} from "@/lib/calibration/holdout-significance";
import {
  computeSpearmanSeparation,
  type RankedPoint,
} from "@/lib/calibration/spearman-separation";
import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import {
  filterSelective,
  type SelectiveRow,
} from "@/lib/calibration/selective-publish";

export type RankingScoreKind =
  | "confidence"
  | "edgeScore"
  | "blend_conf_edge"
  | "independent_trueProb"
  | "blend_indep_conf";

export type RankingPowerRow = {
  readonly pConfidence: number;
  readonly pEdge: number | null;
  readonly pIndependent: number | null;
  readonly y: 0 | 1;
  readonly groupKey: string;
  readonly marketP?: number | null;
};

export type ResidualAttribution = {
  /** Fraction of sample missing independent rankingP. */
  readonly independentCoverage: number;
  /** RES if we could use independent where present, else confidence. */
  readonly resIfIndependentPreferred: number;
  /** RES after significance-gated pause only (no δ). */
  readonly resAfterPauseOnly: number;
  /** RES after pause + |p−0.5|≥δ. */
  readonly resAfterSelective: number;
  /** Primary bottleneck label for founder surface. */
  readonly primaryBottleneck:
    | "ranking_dead"
    | "missing_independent"
    | "dead_groups"
    | "selective_needed"
    | "path_viable";
  readonly operatorHint: string;
};

export type RankingPowerControl = {
  readonly generatedAt: string;
  readonly n: number;
  readonly liveRes: number;
  readonly liveBrier: number;
  readonly liveEce: number;
  readonly liveSeparation: number;
  /** Best score kind by joint RES + Spearman rankingSignal. */
  readonly bestScore: RankingScoreKind;
  readonly scoreBakeoff: readonly {
    readonly kind: RankingScoreKind;
    readonly n: number;
    readonly res: number;
    readonly rho: number;
    readonly separation: number;
    readonly rankingSignal: boolean;
  }[];
  readonly significance: HoldoutSignificanceArtifact;
  readonly pauseGroups: readonly string[];
  readonly keepGroups: readonly string[];
  readonly recommendedDelta: number;
  readonly projected: {
    readonly n: number;
    readonly res: number;
    readonly brier: number;
    readonly ece: number;
    readonly separation: number;
    readonly deltaRes: number;
  };
  readonly residual: ResidualAttribution;
  readonly pathViable: boolean;
  readonly mapsApplyGateOpen: boolean;
  readonly operatorHint: string;
  readonly honesty: string;
};

const RES_FLOOR_FOR_MAPS = 0.02;
const MIN_N_FILTERED = 80;

function scoreOf(r: RankingPowerRow, kind: RankingScoreKind): number | null {
  if (kind === "confidence") return r.pConfidence;
  if (kind === "edgeScore") {
    return r.pEdge != null && Number.isFinite(r.pEdge) ? r.pEdge : null;
  }
  if (kind === "blend_conf_edge") {
    if (r.pEdge == null || !Number.isFinite(r.pEdge)) return r.pConfidence;
    return 0.5 * r.pConfidence + 0.5 * r.pEdge;
  }
  if (kind === "independent_trueProb") {
    return r.pIndependent != null && Number.isFinite(r.pIndependent)
      ? r.pIndependent
      : null;
  }
  if (kind === "blend_indep_conf") {
    if (r.pIndependent == null || !Number.isFinite(r.pIndependent))
      return r.pConfidence;
    return 0.5 * r.pConfidence + 0.5 * r.pIndependent;
  }
  return r.pConfidence;
}

function packMetrics(samples: readonly CalibrationSample[]) {
  if (samples.length === 0) {
    return {
      n: 0,
      brier: NaN,
      ece: NaN,
      res: NaN,
      reliability: NaN,
      separation: NaN,
    };
  }
  const d = brierDecomposition(samples);
  const wins = samples.filter((s) => s.y === 1);
  const losses = samples.filter((s) => s.y === 0);
  const meanPWin =
    wins.length === 0
      ? NaN
      : wins.reduce((a, s) => a + s.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((a, s) => a + s.p, 0) / losses.length;
  return {
    n: samples.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    res: d.resolution,
    reliability: d.reliability,
    separation: meanPWin - meanPLoss,
  };
}

/**
 * Build the Ranking Power Control Plane from canonical settled rows.
 * This is the website-facing SoT for "what must change before PROVEN is honest".
 */
export function buildRankingPowerControl(
  rows: readonly RankingPowerRow[],
  options?: {
    readonly minGroupN?: number;
    readonly defaultDelta?: number;
    readonly liveResOverride?: number;
  },
): RankingPowerControl {
  const minGroupN = options?.minGroupN ?? 20;
  const defaultDelta = options?.defaultDelta ?? 0.1;
  const generatedAt = new Date().toISOString();

  const kinds: RankingScoreKind[] = [
    "confidence",
    "edgeScore",
    "blend_conf_edge",
    "independent_trueProb",
    "blend_indep_conf",
  ];

  const scoreBakeoff: RankingPowerControl["scoreBakeoff"] = [];

  for (const kind of kinds) {
    const samples: CalibrationSample[] = [];
    const points: RankedPoint[] = [];
    for (const r of rows) {
      const p = scoreOf(r, kind);
      if (p == null || !Number.isFinite(p)) continue;
      const clipped = Math.min(1 - 1e-6, Math.max(1e-6, p));
      samples.push({ p: clipped, y: r.y });
      points.push({ p: clipped, y: r.y });
    }
    const m = packMetrics(samples);
    const sp = computeSpearmanSeparation(points, {
      minN: 30,
      minRho: 0.04,
      minSeparation: 0.02,
    });
    scoreBakeoff.push({
      kind,
      n: m.n,
      res: m.res,
      rho: sp.rho,
      separation: sp.separation,
      rankingSignal: sp.rankingSignal,
    });
  }

  let bestScore: RankingScoreKind = "confidence";
  let best = scoreBakeoff[0]!;
  for (const row of scoreBakeoff) {
    if (row.n < 40 || !Number.isFinite(row.res)) continue;
    const betterSignal =
      row.rankingSignal && !best.rankingSignal
        ? true
        : row.rankingSignal === best.rankingSignal &&
          (row.res > best.res + 1e-9 ||
            (Math.abs(row.res - best.res) < 1e-9 &&
              Math.abs(row.rho) > Math.abs(best.rho)));
    if (betterSignal || (!best.rankingSignal && row.res > best.res + 1e-9)) {
      best = row;
      bestScore = row.kind;
    }
  }

  const holdoutRows: HoldoutRow[] = [];
  for (const r of rows) {
    const p = scoreOf(r, bestScore) ?? r.pConfidence;
    holdoutRows.push({
      groupKey: r.groupKey,
      p: Math.min(1 - 1e-6, Math.max(1e-6, p)),
      y: r.y,
    });
  }
  const significance = computeHoldoutSignificance(holdoutRows, {
    minGroupN,
    alpha: 0.05,
    minAbsSeparation: 0.02,
  });
  const pauseGroups = significance.pauseCandidates;
  const keepGroups = significance.groups
    .filter((g) => !pauseGroups.includes(g.groupKey))
    .map((g) => g.groupKey);

  const fullSamples: CalibrationSample[] = holdoutRows.map((r) => ({
    p: r.p,
    y: r.y,
  }));
  const live = packMetrics(fullSamples);
  const liveRes =
    options?.liveResOverride != null && Number.isFinite(options.liveResOverride)
      ? options.liveResOverride
      : live.res;

  const selectiveRows: SelectiveRow[] = holdoutRows.map((r) => ({
    p: r.p,
    y: r.y,
    groupKey: r.groupKey,
    marketP: null,
  }));
  const deltas = [0.08, 0.1, 0.12, 0.15];
  let recommendedDelta = defaultDelta;
  let bestProj = packMetrics(
    selectiveRows
      .filter((r) => !pauseGroups.includes(r.groupKey))
      .map((r) => ({ p: r.p, y: r.y })),
  );
  for (const d of deltas) {
    const filtered = filterSelective(selectiveRows, {
      delta: d,
      edge: null,
      minGroupRes: null,
    }).filter((r) => !pauseGroups.includes(r.groupKey));
    const m = packMetrics(filtered.map((r) => ({ p: r.p, y: r.y })));
    if (
      m.n >= MIN_N_FILTERED &&
      Number.isFinite(m.res) &&
      m.res > bestProj.res + 1e-9
    ) {
      bestProj = m;
      recommendedDelta = d;
    }
  }

  const projected = {
    n: bestProj.n,
    res: bestProj.res,
    brier: bestProj.brier,
    ece: bestProj.ece,
    separation: bestProj.separation,
    deltaRes: bestProj.res - live.res,
  };

  const withIndep = rows.filter(
    (r) => r.pIndependent != null && Number.isFinite(r.pIndependent),
  );
  const independentCoverage =
    rows.length === 0 ? 0 : withIndep.length / rows.length;

  const preferredSamples: CalibrationSample[] = [];
  for (const r of rows) {
    const p =
      r.pIndependent != null && Number.isFinite(r.pIndependent)
        ? r.pIndependent
        : r.pConfidence;
    preferredSamples.push({
      p: Math.min(1 - 1e-6, Math.max(1e-6, p)),
      y: r.y,
    });
  }
  const resIfIndependentPreferred = packMetrics(preferredSamples).res;

  const pauseOnlySamples = selectiveRows
    .filter((r) => !pauseGroups.includes(r.groupKey))
    .map((r) => ({ p: r.p, y: r.y }));
  const resAfterPauseOnly = packMetrics(pauseOnlySamples).res;

  let primaryBottleneck: ResidualAttribution["primaryBottleneck"] =
    "ranking_dead";
  let residualHint = "";
  if (projected.res >= 0.03 && projected.n >= MIN_N_FILTERED) {
    primaryBottleneck = "path_viable";
    residualHint =
      "Selective + pause lifts RES into useful range — keep ranking score, accumulate filtered GREEN streak.";
  } else if (independentCoverage < 0.35) {
    primaryBottleneck = "missing_independent";
    residualHint = `Independent rankingP present on only ${(independentCoverage * 100).toFixed(0)}% of sample. Ship priced modelProb / trueProb into factorBreakdown before more maps.`;
  } else if (pauseGroups.length > 0 && resAfterPauseOnly - live.res > 0.003) {
    primaryBottleneck = "dead_groups";
    residualHint = `${pauseGroups.length} sport|market groups are significance-dead. Pause them; RES rises on the remaining keep set.`;
  } else if (projected.deltaRes > 0.004) {
    primaryBottleneck = "selective_needed";
    residualHint = `δ=${recommendedDelta} selective filter lifts RES by ${projected.deltaRes.toFixed(4)}. Enable selective runtime after founder review.`;
  } else {
    primaryBottleneck = "ranking_dead";
    residualHint =
      "Even best score + pause + selective barely moves RES. Need sport-specific features or model retrain — maps cannot invent ranking power.";
  }

  const residual: ResidualAttribution = {
    independentCoverage,
    resIfIndependentPreferred,
    resAfterPauseOnly,
    resAfterSelective: projected.res,
    primaryBottleneck,
    operatorHint: residualHint,
  };

  const mapsApplyGateOpen = liveRes >= RES_FLOOR_FOR_MAPS;
  const pathViable =
    (projected.deltaRes > 0.005 || projected.res >= 0.025) &&
    projected.n >= MIN_N_FILTERED &&
    best.rankingSignal;

  const operatorHint = pathViable
    ? `Path viable under ${bestScore} + pause(${pauseGroups.length}) + δ=${recommendedDelta}. Projected RES ${projected.res.toFixed(4)} (Δ+${projected.deltaRes.toFixed(4)}). Maps still gated until live RES ≥ ${RES_FLOOR_FOR_MAPS}.`
    : `Ranking power still weak (live RES ${liveRes.toFixed(4)}). Primary bottleneck: ${primaryBottleneck}. ${residualHint}`;

  return {
    generatedAt,
    n: rows.length,
    liveRes,
    liveBrier: live.brier,
    liveEce: live.ece,
    liveSeparation: live.separation,
    bestScore,
    scoreBakeoff,
    significance,
    pauseGroups,
    keepGroups,
    recommendedDelta,
    projected,
    residual,
    pathViable,
    mapsApplyGateOpen,
    operatorHint,
    honesty:
      "RPCP never lowers floors, never sets AUTO_PUBLISH, never applies maps while RES < 0.02. PROVEN requires live eligibility GREEN on the published sample after ranking improves.",
  };
}

/** Lightweight posture for public-surface-truth (no heavy arrays). */
export function rankingPowerPosture(
  control: RankingPowerControl | null,
): {
  readonly present: boolean;
  readonly bestScore: string | null;
  readonly rankingSignal: boolean | null;
  readonly pathViable: boolean | null;
  readonly liveRes: number | null;
  readonly projectedRes: number | null;
  readonly deltaRes: number | null;
  readonly pauseGroupCount: number | null;
  readonly independentCoverage: number | null;
  readonly primaryBottleneck: string | null;
  readonly mapsApplyGateOpen: boolean | null;
  readonly operatorHint: string;
} {
  if (!control) {
    return {
      present: false,
      bestScore: null,
      rankingSignal: null,
      pathViable: null,
      liveRes: null,
      projectedRes: null,
      deltaRes: null,
      pauseGroupCount: null,
      independentCoverage: null,
      primaryBottleneck: null,
      mapsApplyGateOpen: null,
      operatorHint:
        "Ranking Power Control Plane not seeded (sample < threshold or stub).",
    };
  }
  const best = control.scoreBakeoff.find((s) => s.kind === control.bestScore);
  return {
    present: true,
    bestScore: control.bestScore,
    rankingSignal: best?.rankingSignal ?? null,
    pathViable: control.pathViable,
    liveRes: control.liveRes,
    projectedRes: control.projected.res,
    deltaRes: control.projected.deltaRes,
    pauseGroupCount: control.pauseGroups.length,
    independentCoverage: control.residual.independentCoverage,
    primaryBottleneck: control.residual.primaryBottleneck,
    mapsApplyGateOpen: control.mapsApplyGateOpen,
    operatorHint: control.operatorHint,
  };
}
