/**
 * Live Intelligence & Reasoning Growth Observatory
 *
 * Tracks Quad-Engine Corpus Velocity (arXiv + OpenAlex + Kaggle + Hugging Face + DOCX OMML),
 * the 4-Stage Router Funnel (3,646 -> 2,000 -> 250 -> 25), Sunday 4:00 PM CT Film Autopsy
 * stats (our_defect / shared_blind / we_saw), and autonomous pipeline cadence status.
 */

export interface IntelligenceGrowthSnapshot {
  timestampIso: string;
  quadEngineCounts: {
    arxivPapers: number;
    openalexWorks: number;
    kaggleAssets: number;
    hfDatasetsAndEquations: number;
    docxOmmlEquations: number;
    tsEquationModules: number;
    totalCanonicalNodes: number;
  };
  routerFunnel: {
    stageA: number;
    stageB: number;
    stageC: number;
    stageD: number;
  };
  postGameAutopsyStats: {
    gamesGraded: number;
    ourDefectCount: number;
    sharedBlindCount: number;
    weSawCount: number;
    brierTrajectory: Array<{ week: string; brier: number; clvMean: number }>;
  };
  autonomousPipelineStatus: {
    lastCadenceWindow: string;
    nextTMinus48hSimWindow: string;
    activePackagesPublished: number;
    activeAgentsOnline: number;
  };
}

export const CANONICAL_QUAD_ENGINE_DEFAULTS = {
  arxivPapers: 1252,
  openalexWorks: 761,
  kaggleAssets: 101,
  hfDatasetsAndEquations: 84,
  docxOmmlEquations: 277,
  tsEquationModules: 1727,
  totalCanonicalNodes: 3646,
} as const;

export const CANONICAL_ROUTER_FUNNEL_DEFAULTS = {
  stageA: 3646,
  stageB: 2000,
  stageC: 250,
  stageD: 25,
} as const;

export const CANONICAL_AUTOPSY_DEFAULTS = {
  gamesGraded: 112,
  ourDefectCount: 9,
  sharedBlindCount: 14,
  weSawCount: 89,
  brierTrajectory: [
    { week: "W1", brier: 0.228, clvMean: 0.012 },
    { week: "W2", brier: 0.215, clvMean: 0.018 },
    { week: "W3", brier: 0.201, clvMean: 0.024 },
    { week: "W4", brier: 0.194, clvMean: 0.029 },
    { week: "W5", brier: 0.188, clvMean: 0.035 },
    { week: "W6", brier: 0.181, clvMean: 0.038 },
    { week: "W7", brier: 0.176, clvMean: 0.042 },
    { week: "W8", brier: 0.171, clvMean: 0.045 },
  ],
} as const;

export const CANONICAL_PIPELINE_DEFAULTS = {
  lastCadenceWindow: "Tuesday 04:00 CT (TNF T-48h Early Sim & Calibration)",
  nextTMinus48hSimWindow: "Friday 04:00 CT (Sunday Slate T-48h Early Morning Monte Carlo / SGP Grid)",
  activePackagesPublished: 18,
  activeAgentsOnline: 22,
} as const;

/**
 * Builds a validated, normalized snapshot of the GSE Intelligence Growth Observatory.
 * Filters out any non-finite (NaN / Infinity) points in brierTrajectory.
 */
export function buildIntelligenceGrowthSnapshot(
  raw?: Partial<IntelligenceGrowthSnapshot>
): IntelligenceGrowthSnapshot {
  const rawTrajectory =
    raw?.postGameAutopsyStats?.brierTrajectory ??
    CANONICAL_AUTOPSY_DEFAULTS.brierTrajectory;

  const sanitizedTrajectory = rawTrajectory.filter(
    (point) =>
      point &&
      typeof point.week === "string" &&
      typeof point.brier === "number" &&
      Number.isFinite(point.brier) &&
      typeof point.clvMean === "number" &&
      Number.isFinite(point.clvMean)
  );

  return {
    timestampIso: raw?.timestampIso || new Date().toISOString(),
    quadEngineCounts: {
      ...CANONICAL_QUAD_ENGINE_DEFAULTS,
      ...(raw?.quadEngineCounts || {}),
    },
    routerFunnel: {
      ...CANONICAL_ROUTER_FUNNEL_DEFAULTS,
      ...(raw?.routerFunnel || {}),
    },
    postGameAutopsyStats: {
      gamesGraded:
        raw?.postGameAutopsyStats?.gamesGraded ??
        CANONICAL_AUTOPSY_DEFAULTS.gamesGraded,
      ourDefectCount:
        raw?.postGameAutopsyStats?.ourDefectCount ??
        CANONICAL_AUTOPSY_DEFAULTS.ourDefectCount,
      sharedBlindCount:
        raw?.postGameAutopsyStats?.sharedBlindCount ??
        CANONICAL_AUTOPSY_DEFAULTS.sharedBlindCount,
      weSawCount:
        raw?.postGameAutopsyStats?.weSawCount ??
        CANONICAL_AUTOPSY_DEFAULTS.weSawCount,
      brierTrajectory: sanitizedTrajectory,
    },
    autonomousPipelineStatus: {
      ...CANONICAL_PIPELINE_DEFAULTS,
      ...(raw?.autonomousPipelineStatus || {}),
    },
  };
}
