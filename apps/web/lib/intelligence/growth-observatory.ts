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
    megaSweepBooksIngested: number;
    megaSweepReposAndUrlsWired: number;
    morningSweepCsvsAndKernels: number;
    pineconeHybridVectors: number;
    xaiOmniscienceWavesExecuted: number;
    coupled5ApiScientificNodes: number;
    reverseInterleaved8StepCascadeNodes: number;
    posthogDataWarehouseTablesSynced: number;
    downloadsFlagshipPacksWired: number;
    sovereignOpenAiEyiKernelsWired: number;
    registeredAgentSkillsWired: number;
    agyCliPluginsRegistered: number;
    openaiMathManuscriptsWired: number;
    openaiMathResultFamiliesWired: number;
    openaiMathLeanFilesCataloged: number;
    openaiEcosystemReposWired: number;
    copilotKitEcosystemReposWired: number;
    julesConnectedSourcesCount: number;
    julesTotalSessionsAudited: number;
    julesCompletedPatchOutputsHarvested: number;
    freeTechnicalTextbooksIndexed: number;
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
  arxivPapers: 1300,
  openalexWorks: 821,
  kaggleAssets: 174,
  hfDatasetsAndEquations: 176,
  docxOmmlEquations: 277,
  tsEquationModules: 1758,
  megaSweepBooksIngested: 210,
  megaSweepReposAndUrlsWired: 372,
  morningSweepCsvsAndKernels: 40,
  pineconeHybridVectors: 742,
  xaiOmniscienceWavesExecuted: 71,
  coupled5ApiScientificNodes: 204,
  reverseInterleaved8StepCascadeNodes: 8,
  posthogDataWarehouseTablesSynced: 5,
  downloadsFlagshipPacksWired: 17,
  sovereignOpenAiEyiKernelsWired: 9,
  registeredAgentSkillsWired: 143,
  agyCliPluginsRegistered: 7,
  openaiMathManuscriptsWired: 721,
  openaiMathResultFamiliesWired: 373,
  openaiMathLeanFilesCataloged: 53554,
  openaiEcosystemReposWired: 10,
  copilotKitEcosystemReposWired: 5,
  julesConnectedSourcesCount: 28,
  julesTotalSessionsAudited: 167,
  julesCompletedPatchOutputsHarvested: 75,
  freeTechnicalTextbooksIndexed: 1116,
  totalCanonicalNodes: 5620,
} as const;

export const CANONICAL_ROUTER_FUNNEL_DEFAULTS = {
  stageA: 5620,
  stageB: 2000,
  stageC: 250,
  stageD: 25,
} as const;

export const CANONICAL_AUTOPSY_DEFAULTS = {
  gamesGraded: 121,
  ourDefectCount: 9,
  sharedBlindCount: 14,
  weSawCount: 98,
  brierTrajectory: [
    { week: "W1", brier: 0.228, clvMean: 0.012 },
    { week: "W2", brier: 0.215, clvMean: 0.018 },
    { week: "W3", brier: 0.201, clvMean: 0.024 },
    { week: "W4", brier: 0.194, clvMean: 0.029 },
    { week: "W5", brier: 0.188, clvMean: 0.035 },
    { week: "W6", brier: 0.181, clvMean: 0.038 },
    { week: "W7", brier: 0.176, clvMean: 0.042 },
    { week: "W8", brier: 0.171, clvMean: 0.045 },
    { week: "W9_TNF", brier: 0.168, clvMean: 0.048 },
  ],
} as const;

export const CANONICAL_PIPELINE_DEFAULTS = {
  lastCadenceWindow: "Friday 13:30 CT (210-Book, 372-Repo & 30-CSV Mega-Sweep Full Wiring)",
  nextTMinus48hSimWindow: "Sunday 08:00 CT (Week 9 Main Slate Final Injury & Weather Freeze)",
  activePackagesPublished: 22,
  activeAgentsOnline: 26,
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
