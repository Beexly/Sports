import { round } from "./numeric.js";
import { ExpectedMetricProvenance, computeFeatureSchemaHash } from "./types.js";

/**
 * A pass target play.
 * Definition pin: a row with play_type == "pass" and a non-empty receiver_player_id.
 */
export interface TargetPlay {
  readonly playId: string;
  readonly week: number;
  readonly receiverPlayerId: string;
  /** Attached post-fit via attachOwnEpa. null means unratable. */
  readonly epa: number | null;
}

export interface EpaPerTargetMetric {
  readonly playerId: string;
  readonly targets: number;
  readonly rawEpaPerTarget: number;
  readonly positionalMeanEpaPerTarget: number;
  readonly shrunkEpaPerTarget: number;
}

export interface EpaPerTargetOutput {
  readonly metrics: readonly EpaPerTargetMetric[];
  readonly diagnostics: {
    readonly excludedForFloor: number;
    readonly nullEpaTargetsExcludedFromMean: number;
    readonly unknownPositionTargetsExcluded: number;
  };
}

export const EPA_PER_TARGET_MODEL_VERSION = "1.0.0";
export const EPA_PER_TARGET_FEATURE_KEYS = [
  "target",
  "own_epa",
  "positional_shrinkage_t20"
] as const;

export const EPA_PER_TARGET_PROVENANCE: ExpectedMetricProvenance = {
  modelVersion: EPA_PER_TARGET_MODEL_VERSION,
  method: "deterministic-rule",
  featureKeys: EPA_PER_TARGET_FEATURE_KEYS,
  featureSchemaHash: computeFeatureSchemaHash(EPA_PER_TARGET_FEATURE_KEYS),
  sampleSize: 0, // Deterministic rule
};

export type TargetWindow = "season-to-date" | "last-4-weeks" | "last-8-weeks";

export function computeEpaPerTarget(
  targetPlays: readonly TargetPlay[],
  targetSeason: number,
  targetWeek: number,
  window: TargetWindow,
  positionLookup: ReadonlyMap<string, string>
): EpaPerTargetOutput {
  // Point-in-time discipline: only rows strictly prior to targetWeek
  const validPlays = targetPlays.filter((p) => p.week < targetWeek);

  // Filter based on window
  let windowPlays = validPlays;
  if (window === "last-4-weeks") {
    // Distinct weeks logic? Wait, point-in-time window logic means we look at the last N distinct weeks a player played in, or just calendar weeks?
    // "last-4 distinct weeks" in the instructions says "per player per window" and memory says "apply the window strictly to the individual player's own past games".
    // Actually, expected metric rolling windows usually apply filtering *per player*. Let's collect them per player first.
  }

  // To do it correctly per player:
  const playsByPlayer = new Map<string, TargetPlay[]>();
  for (const play of validPlays) {
    let plays = playsByPlayer.get(play.receiverPlayerId);
    if (!plays) {
      plays = [];
      playsByPlayer.set(play.receiverPlayerId, plays);
    }
    plays.push(play);
  }

  let excludedForFloor = 0;
  let nullEpaTargetsExcludedFromMean = 0;
  let unknownPositionTargetsExcluded = 0;

  // We need to calculate windowed metrics. Let's do it per player.
  const windowedPlaysByPlayer = new Map<string, TargetPlay[]>();
  for (const [playerId, plays] of playsByPlayer.entries()) {
    if (window === "season-to-date") {
      windowedPlaysByPlayer.set(playerId, plays);
    } else {
      // "last-4 distinct weeks"
      // Find the distinct weeks this player has played in
      const distinctWeeks = Array.from(new Set(plays.map(p => p.week))).sort((a, b) => a - b);
      const windowSize = window === "last-4-weeks" ? 4 : 8;
      const targetWeeks = new Set(distinctWeeks.slice(-windowSize));
      windowedPlaysByPlayer.set(playerId, plays.filter(p => targetWeeks.has(p.week)));
    }
  }

  // Now calculate player metrics and collect positional data
  const epaSumsByPos = new Map<string, number>();
  const epaCountsByPos = new Map<string, number>();

  const rawPlayerStats = new Map<string, {
    position: string,
    targets: number,
    validEpaTargets: number,
    totalEpa: number
  }>();

  for (const [playerId, plays] of windowedPlaysByPlayer.entries()) {
    const position = positionLookup.get(playerId);

    let totalEpa = 0;
    let validEpaTargets = 0;

    for (const p of plays) {
      if (p.epa === null) {
        nullEpaTargetsExcludedFromMean++;
      } else {
        totalEpa += p.epa;
        validEpaTargets++;
      }
    }

    const targets = plays.length;

    if (position === undefined) {
      unknownPositionTargetsExcluded += targets;
    } else {
      // Only floor-qualifying players contribute to the positional mean!
      // Definition pin: "the positional league mean EPA/target (across floor-qualifying players at the same position in the window)"
      if (targets >= 20) {
        epaSumsByPos.set(position, (epaSumsByPos.get(position) ?? 0) + totalEpa);
        epaCountsByPos.set(position, (epaCountsByPos.get(position) ?? 0) + validEpaTargets);
      }

      rawPlayerStats.set(playerId, {
        position,
        targets,
        validEpaTargets,
        totalEpa
      });
    }
  }

  const metrics: EpaPerTargetMetric[] = [];

  for (const [playerId, stats] of rawPlayerStats.entries()) {
    if (stats.targets < 20) {
      excludedForFloor++;
      continue;
    }

    const rawEpaPerTarget = stats.validEpaTargets > 0 ? stats.totalEpa / stats.validEpaTargets : 0;

    const posSum = epaSumsByPos.get(stats.position) ?? 0;
    const posCount = epaCountsByPos.get(stats.position) ?? 0;
    const positionalMeanEpaPerTarget = posCount > 0 ? posSum / posCount : 0;

    const t = stats.targets;
    const shrunkEpaPerTarget = positionalMeanEpaPerTarget + (t / (t + 20)) * (rawEpaPerTarget - positionalMeanEpaPerTarget);

    metrics.push({
      playerId,
      targets: t,
      rawEpaPerTarget: round(rawEpaPerTarget, 4),
      positionalMeanEpaPerTarget: round(positionalMeanEpaPerTarget, 4),
      shrunkEpaPerTarget: round(shrunkEpaPerTarget, 4),
    });
  }

  // Sort deterministically by playerId
  metrics.sort((a, b) => a.playerId.localeCompare(b.playerId));

  return {
    metrics,
    diagnostics: {
      excludedForFloor,
      nullEpaTargetsExcludedFromMean,
      unknownPositionTargetsExcluded
    }
  };
}
