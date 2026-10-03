/**
 * Log-only research features from the intelligence cockpit.
 *
 * QB consensus, rushing efficiency, and edge-signals already consume NGS and
 * fuse tracking vs production. None of that touches rankingP. This bag is
 * the cheap wire: attach the numbers to the same player the HB module is
 * scoring, as LOG FEATURES. priced:false until a hold-out graduates them.
 *
 * Fail-closed on non-finite. Pure, no I/O. Not a second model.
 */

export const RESEARCH_LOG_METHOD_TAG = "player_research_log_v1" as const;

export type ResearchFeatureInput = {
  readonly playerId: string;
  readonly edgeGap?: number;
  readonly underlyingZ?: number;
  readonly productionZ?: number;
  readonly avgSeparation?: number;
  readonly cpoe?: number;
  readonly ryoe?: number;
  readonly qbConsensusDiv?: number;
};

export type ResearchLog = {
  readonly ok: true;
  readonly methodTag: typeof RESEARCH_LOG_METHOD_TAG;
  readonly playerId: string;
  readonly features: {
    readonly edgeGap: number | null;
    readonly underlyingZ: number | null;
    readonly productionZ: number | null;
    readonly avgSeparation: number | null;
    readonly cpoe: number | null;
    readonly ryoe: number | null;
    readonly qbConsensusDiv: number | null;
  };
  readonly priced: false;
};

export type ResearchDenied = {
  readonly ok: false;
  readonly methodTag: typeof RESEARCH_LOG_METHOD_TAG;
  readonly priced: false;
  readonly refuse: "bad_id";
};

function opt(n: number | undefined): number | null {
  return n !== undefined && Number.isFinite(n) ? n : null;
}

export function playerResearchLog(input: ResearchFeatureInput): ResearchLog | ResearchDenied {
  const tag = RESEARCH_LOG_METHOD_TAG;
  if (typeof input.playerId !== "string" || input.playerId.trim() === "") {
    return { ok: false, methodTag: tag, priced: false, refuse: "bad_id" };
  }
  return {
    ok: true,
    methodTag: tag,
    playerId: input.playerId,
    features: {
      edgeGap: opt(input.edgeGap),
      underlyingZ: opt(input.underlyingZ),
      productionZ: opt(input.productionZ),
      avgSeparation: opt(input.avgSeparation),
      cpoe: opt(input.cpoe),
      ryoe: opt(input.ryoe),
      qbConsensusDiv: opt(input.qbConsensusDiv),
    },
    priced: false,
  };
}
