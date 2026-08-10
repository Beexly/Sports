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
 * Polarity law (v5.2.1+ hard):
 *   Score kinds are win probabilities only:
 *     confidence | independent_trueProb | blend_indep_conf | marketFairProb
 *   NEVER edge / rawEdge / shrunkEdge / edgeScore as p.
 *   pIndependent load must be raw trueProb (via proven-path-rows) — never conf-echo rankingP.
 *
 * Laws (non-negotiable):
 *   - Floors unchanged. Maps stay apply OFF while live RES < 0.02.
 *   - No public copy, no AUTO_PUBLISH flip, no gate changes.
 *   - Independent modelProb / rankingP is the primary lever; maps never invent RES.
 *   - Conformal coverage is diagnostic only — never eligibility.
 *   - independentCoverage residual uses ML/SPREAD eligible denom (TOTAL excluded).
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

/** Win-probability score kinds only — never edge-as-p. */
export type RankingScoreKind =
  | "confidence"
  | "independent_trueProb"
  | "blend_indep_conf"
  | "marketFairProb";

export type RankingPowerRow = {
  readonly pConfidence: number;
  /** @deprecated Never used as ranking p. Kept optional for diagnostics only. */
  readonly pEdge?: number | null;
  /** Raw independent trueProb only (0–1). Never confidence-echo rankingP. */
  readonly pIndependent: number | null;
  readonly y: 0 | 1;
  readonly groupKey: string;
  readonly marketP?: number | null;
};

export type ResidualAttribution = {
  /**
   * Fraction of ML/SPREAD-eligible sample with independent rankingP.
   * TOTAL excluded from denom (no honest team-win trueProb under backfill law).
   */
  readonly independentCoverage: number;
  /** Full-row coverage (legacy diagnostic; may look thinner than ML/SPREAD). */
  readonly independentCoverageVsAll: number;
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
  /** Best score kind by joint RES + Spearman rankingSignal + polarity gate. */
  readonly bestScore: RankingScoreKind;
  readonly scoreBakeoff: readonly {
    readonly kind: RankingScoreKind;
    readonly n: number;
    readonly res: number;
    readonly rho: number;
    readonly separation: number;
    readonly rankingSignal: boolean;
    /** n_kind / n_confidence — thin independent tails cannot win bestScore */
    readonly coverage: number;
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
    /** How far projected Brier sits above the 0.22 floor (0 if at/under). */
    readonly brierGapToFloor: number;
    readonly wouldPassBrierFloor: boolean;
  };
  readonly residual: ResidualAttribution;
  readonly pathViable: boolean;
  readonly mapsApplyGateOpen: boolean;
  readonly operatorHint: string;
  readonly honesty: string;
  readonly rankingPolarityLaw: "positive_separation_required";
};

const RES_FLOOR_FOR_MAPS = 0.02;
const MIN_N_FILTERED = 60;
/** Independent/blend kinds need ≥40% of ML/SPREAD eligible n to win bestScore. */
const MIN_COVERAGE = 0.4;
const BRIER_FLOOR = 0.22;

function isIndepEligibleMarket(groupKey: string): boolean {
  const market = (groupKey.split("|")[1] ?? "").toUpperCase();
  return (
    market === "MONEYLINE" ||
    market === "SPREAD" ||
    market === "H2H" ||
    market === "ML"
  );
}

function scoreOf(r: RankingPowerRow, kind: RankingScoreKind): number | null {
  if (kind === "confidence") return r.pConfidence;
  if (kind === "independent_trueProb") {
    return r.pIndependent != null && Number.isFinite(r.pIndependent)
      ? r.pIndependent
      : null;
  }
  if (kind === "blend_indep_conf") {
    if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) return null;
    return 0.5 * r.pConfidence + 0.5 * r.pIndependent;
  }
  if (kind === "marketFairProb") {
    return r.marketP != null && Number.isFinite(r.marketP) ? r.marketP : null;
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
    "independent_trueProb",
    "blend_indep_conf",
    "marketFairProb",
  ];

  type BakeoffRow = RankingPowerControl["scoreBakeoff"][number];
  const scoreBakeoffMutable: BakeoffRow[] = [];
  let confN = 0;
  // TOTAL has no honest team-win trueProb — do not dilute independent coverage.
  const indepEligibleN = Math.max(
    1,
    rows.filter((r) => isIndepEligibleMarket(r.groupKey)).length,
  );

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
    if (kind === "confidence") confN = samples.length;
    const m = packMetrics(samples);
    const sp = computeSpearmanSeparation(points, {
      minN: 30,
      minRho: 0.04,
      minSeparation: 0.02,
    });
    const denom =
      kind === "independent_trueProb" ||
      kind === "blend_indep_conf" ||
      kind === "marketFairProb"
        ? indepEligibleN
        : confN > 0
          ? confN
          : 1;
    const coverage = m.n / denom;
    scoreBakeoffMutable.push({
      kind,
      n: m.n,
      res: m.res,
      rho: sp.rho,
      separation: sp.separation,
      rankingSignal: sp.rankingSignal,
      coverage,
    });
  }
  const scoreBakeoff = scoreBakeoffMutable;

  // Polarity gate: separation > 0, n ≥ 50, coverage ≥ 40% for non-conf kinds.
  let bestScore: RankingScoreKind = "confidence";
  let best = scoreBakeoff.find((s) => s.kind === "confidence") ?? scoreBakeoff[0]!;
  for (const row of scoreBakeoff) {
    if (row.n < 50 || !Number.isFinite(row.res)) continue;
    if (!(row.separation > 0)) continue;
    if (row.kind !== "confidence" && row.coverage < MIN_COVERAGE) continue;
    const betterSignal =
      row.rankingSignal && !best.rankingSignal
        ? true
        : row.rankingSignal === best.rankingSignal &&
          (row.res > best.res + 1e-9 ||
            (Math.abs(row.res - best.res) < 1e-9 &&
              Math.abs(row.rho) > Math.abs(best.rho)));
    if (
      betterSignal ||
      (!best.rankingSignal &&
        row.separation > 0 &&
        row.res > best.res + 1e-9)
    ) {
      best = row;
      bestScore = row.kind;
    }
  }
  // If confidence itself has non-positive separation, still keep it as default
  // but pathViable stays honest (won't open via rankingSignal alone).

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
  const pauseGroups = [...significance.pauseCandidates].sort();
  const keepGroups = significance.groups
    .filter((g) => !pauseGroups.includes(g.groupKey))
    .map((g) => g.groupKey)
    .sort();

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
  const deltas = [0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25];
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
    // Prefer higher RES; at RES ties prefer lower Brier; require min n.
    if (m.n < MIN_N_FILTERED || !Number.isFinite(m.res)) continue;
    const resGain = m.res > bestProj.res + 1e-9;
    const resTieBetterBrier =
      Math.abs(m.res - bestProj.res) < 1e-9 &&
      Number.isFinite(m.brier) &&
      Number.isFinite(bestProj.brier) &&
      m.brier < bestProj.brier - 1e-9;
    // Prefer clearing RES floor 0.02 when possible without collapsing n
    const clearsResFloor =
      m.res >= RES_FLOOR_FOR_MAPS && bestProj.res < RES_FLOOR_FOR_MAPS;
    if (clearsResFloor || resGain || resTieBetterBrier) {
      bestProj = m;
      recommendedDelta = d;
    }
  }

  const brierGapToFloor = Number.isFinite(bestProj.brier)
    ? Math.max(0, bestProj.brier - BRIER_FLOOR)
    : NaN;
  const projected = {
    n: bestProj.n,
    res: bestProj.res,
    brier: bestProj.brier,
    ece: bestProj.ece,
    separation: bestProj.separation,
    deltaRes: bestProj.res - live.res,
    brierGapToFloor,
    wouldPassBrierFloor:
      Number.isFinite(bestProj.brier) && bestProj.brier <= BRIER_FLOOR && bestProj.n >= 100,
  };

  const withIndep = rows.filter(
    (r) => r.pIndependent != null && Number.isFinite(r.pIndependent),
  );
  const withIndepEligible = withIndep.filter((r) =>
    isIndepEligibleMarket(r.groupKey),
  );
  // Residual coverage matches bake-off: ML/SPREAD eligible denom.
  const independentCoverage =
    indepEligibleN > 0 ? withIndepEligible.length / indepEligibleN : 0;
  const independentCoverageVsAll =
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
    residualHint = `Independent rankingP present on only ${(independentCoverage * 100).toFixed(0)}% of ML/SPREAD-eligible sample. Ship priced modelProb / trueProb into factorBreakdown before more maps.`;
  } else if (pauseGroups.length > 0 && resAfterPauseOnly - live.res > 0.003) {
    primaryBottleneck = "dead_groups";
    residualHint = `${pauseGroups.length} sport|market groups are significance-dead (${pauseGroups.slice(0, 6).join(", ")}${pauseGroups.length > 6 ? "…" : ""}). Pause them (RANKING_PAUSE_APPLY still default OFF); RES rises on the remaining keep set.`;
  } else if (projected.deltaRes > 0.004) {
    primaryBottleneck = "selective_needed";
    residualHint = `δ=${recommendedDelta} selective filter lifts RES by ${projected.deltaRes.toFixed(4)}. Selective runtime already default ON.`;
  } else {
    primaryBottleneck = "ranking_dead";
    residualHint =
      "Even best score + pause + selective barely moves RES. Need sport-specific features or model retrain — maps cannot invent ranking power.";
  }

  const residual: ResidualAttribution = {
    independentCoverage,
    independentCoverageVsAll,
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
    best.rankingSignal &&
    best.separation > 0;

  const brierNote = Number.isFinite(projected.brier)
    ? projected.wouldPassBrierFloor
      ? `Projected Brier ${projected.brier.toFixed(4)} ≤ ${BRIER_FLOOR} on filtered sample (advisory — live eligibility still full published set).`
      : `Projected Brier ${projected.brier.toFixed(4)} still ${brierGapToFloor.toFixed(4)} above floor ${BRIER_FLOOR} — RES gap remains the blocker.`
    : "Projected Brier n/a.";

  const operatorHint = pathViable
    ? `Path viable under ${bestScore} + pause(${pauseGroups.length}) + δ=${recommendedDelta}. Projected RES ${projected.res.toFixed(4)} (Δ+${projected.deltaRes.toFixed(4)}). ${brierNote} Maps still gated until live RES ≥ ${RES_FLOOR_FOR_MAPS}.`
    : `Ranking power still weak (live RES ${Number.isFinite(liveRes) ? liveRes.toFixed(4) : "n/a"}). Primary bottleneck: ${primaryBottleneck}. ${residualHint} ${brierNote}`;

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
      "RPCP never lowers floors, never sets AUTO_PUBLISH, never applies maps while RES < 0.02. Never treats edge as p. Conformal coverage ≠ eligibility. PROVEN requires live eligibility GREEN on the published sample after ranking improves. independentCoverage = priced / ML∪SPREAD eligible.",
    rankingPolarityLaw: "positive_separation_required",
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
  readonly projectedBrier: number | null;
  readonly brierGapToFloor: number | null;
  readonly wouldPassBrierFloor: boolean | null;
  readonly deltaRes: number | null;
  readonly pauseGroupCount: number | null;
  /** Advisory pause keys (RANKING_PAUSE_APPLY still default OFF). */
  readonly pauseGroups: readonly string[] | null;
  readonly keepGroupCount: number | null;
  readonly recommendedDelta: number | null;
  readonly independentCoverage: number | null;
  readonly independentCoverageVsAll: number | null;
  readonly primaryBottleneck: string | null;
  readonly mapsApplyGateOpen: boolean | null;
  readonly residualOperatorHint: string | null;
  readonly operatorHint: string;
  readonly rankingPolarityLaw: "positive_separation_required";
} {
  if (!control) {
    return {
      present: false,
      bestScore: null,
      rankingSignal: null,
      pathViable: null,
      liveRes: null,
      projectedRes: null,
      projectedBrier: null,
      brierGapToFloor: null,
      wouldPassBrierFloor: null,
      deltaRes: null,
      pauseGroupCount: null,
      pauseGroups: null,
      keepGroupCount: null,
      recommendedDelta: null,
      independentCoverage: null,
      independentCoverageVsAll: null,
      primaryBottleneck: null,
      mapsApplyGateOpen: null,
      residualOperatorHint: null,
      operatorHint:
        "Ranking Power Control Plane not seeded (sample < threshold or stub).",
      rankingPolarityLaw: "positive_separation_required",
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
    projectedBrier: Number.isFinite(control.projected.brier)
      ? control.projected.brier
      : null,
    brierGapToFloor: Number.isFinite(control.projected.brierGapToFloor)
      ? control.projected.brierGapToFloor
      : null,
    wouldPassBrierFloor: control.projected.wouldPassBrierFloor,
    deltaRes: control.projected.deltaRes,
    pauseGroupCount: control.pauseGroups.length,
    pauseGroups: control.pauseGroups,
    keepGroupCount: control.keepGroups.length,
    recommendedDelta: control.recommendedDelta,
    independentCoverage: control.residual.independentCoverage,
    independentCoverageVsAll: control.residual.independentCoverageVsAll,
    primaryBottleneck: control.residual.primaryBottleneck,
    mapsApplyGateOpen: control.mapsApplyGateOpen,
    residualOperatorHint: control.residual.operatorHint,
    operatorHint: control.operatorHint,
    rankingPolarityLaw: "positive_separation_required",
  };
}
