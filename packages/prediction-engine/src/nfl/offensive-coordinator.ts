export type Formation = "shotgun" | "under-center" | "pistol" | "no-huddle";
export type PlayType = "run" | "pass" | "play-action" | "screen" | "RPO";

export interface DefensiveLook {
  readonly personnelGrouping: string;
  readonly coverage: "man" | "zone" | "cover-0" | "cover-1" | "cover-2" | "cover-3" | "cover-4" | "cover-6" | "unknown";
  readonly blitzRate: number;
  readonly boxCountVsRun: number;
  readonly baseEpaPerPlay: number;
}

export interface PlayCandidate {
  readonly formation: Formation;
  readonly playType: PlayType;
  readonly historicalEpaPerPlay: number;
  readonly sampleSize: number;
  readonly exploits: readonly string[];
}

export interface OffensiveRecommendation {
  readonly formation: Formation;
  readonly playType: PlayType;
  readonly expectedEPA: number;
  readonly exploits: readonly string[];
}

export interface OffensiveRecommendationInput {
  readonly down: number;
  readonly distance: number;
  readonly fieldPosition: number;
  readonly defensiveLook: DefensiveLook | null;
  readonly candidates: readonly PlayCandidate[];
}

function boundedRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Recommend up to three transparent, sample-qualified plays; empty data fails closed. */
export function recommendOffense(input: OffensiveRecommendationInput): readonly OffensiveRecommendation[] | null {
  if (input.defensiveLook === null || !Number.isFinite(input.down) || !Number.isFinite(input.distance) || !Number.isFinite(input.fieldPosition)) return null;
  if (!boundedRate(input.defensiveLook.blitzRate) || input.candidates.length === 0) return null;
  const usable = input.candidates.filter((candidate) => candidate.sampleSize >= 20 && Number.isFinite(candidate.historicalEpaPerPlay));
  if (usable.length === 0) return null;
  return usable
    .map((candidate) => {
      const blitzBonus = input.defensiveLook!.blitzRate >= 0.35 && (candidate.playType === "screen" || candidate.playType === "RPO" || candidate.playType === "play-action") ? 0.08 : 0;
      const boxBonus = input.defensiveLook!.boxCountVsRun <= 6 && candidate.playType === "run" ? 0.06 : 0;
      return { formation: candidate.formation, playType: candidate.playType, expectedEPA: candidate.historicalEpaPerPlay + blitzBonus + boxBonus, exploits: candidate.exploits };
    })
    .sort((a, b) => b.expectedEPA - a.expectedEPA || a.playType.localeCompare(b.playType))
    .slice(0, 3);
}
