/**
 * Toxic differential (explosive plays of 21+ yards minus turnovers, per offensive play)
 *
 * SHADOW metric module for computing explosive-play margin over turnovers.
 * - Explosive play (GSE's pinned v1 definition — the source chart did not print its threshold): a population play with yards_gained >= 21.
 * - Turnover: a population play with interception == 1 OR fumble_lost == 1.
 * - Population exclusions: qb_kneel == 1, qb_spike == 1, non-finite yards_gained.
 * - No EPA: This module emits NO EPA field and never touches the referee ep/epa columns.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play for toxic differential calculation. */
export interface ToxicPlay {
  /** game_id-play_id */
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly playType: string;
  readonly yardsGained: number;
  readonly interception: 0 | 1;
  readonly fumbleLost: 0 | 1;
  readonly qbKneel: 0 | 1;
  readonly qbSpike: 0 | 1;
}

export const TOXIC_DIFFERENTIAL_MODEL_VERSION = "gse-toxic-v1";
const TOXIC_FEATURE_KEYS = ["yardsGained", "interception", "fumbleLost", "qbKneel", "qbSpike"] as const;

export interface ToxicDifferentialOutput {
  readonly teamId: string;
  readonly window: "season-to-date" | "last-4" | "last-8";
  readonly offensivePlays: number;
  readonly distinctGames: number;
  readonly explosiveCount: number;
  readonly turnoverCount: number;
  readonly toxicDifferential: number;
  readonly toxicRate: number;
  readonly toxicPerGame: number;
  readonly explosiveRate: number;
  readonly turnoverRate: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface ToxicDifferentialResult {
  readonly teams: readonly ToxicDifferentialOutput[];
  readonly diagnostics: {
    readonly excludedPlays: number;
    readonly belowFloorTeams: number;
  };
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: TOXIC_DIFFERENTIAL_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...TOXIC_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(TOXIC_FEATURE_KEYS),
    sampleSize,
  };
}

export function computeToxicDifferential(
  plays: readonly ToxicPlay[],
  targetWeek: number,
): ToxicDifferentialResult {
  let excludedPlays = 0;

  // Group plays by team, applying point-in-time and population exclusions
  const playsByTeam = new Map<string, ToxicPlay[]>();

  for (const play of plays) {
    if (play.week >= targetWeek) continue; // strict point-in-time discipline

    if (play.qbKneel === 1 || play.qbSpike === 1 || !Number.isFinite(play.yardsGained)) {
      excludedPlays++;
      continue;
    }

    const teamPlays = playsByTeam.get(play.posteam) ?? [];
    teamPlays.push(play);
    playsByTeam.set(play.posteam, teamPlays);
  }

  const teams: ToxicDifferentialOutput[] = [];
  let belowFloorTeams = 0;

  for (const [teamId, teamPlays] of playsByTeam) {
    // Determine distinct games and sort them
    const gamesSet = new Set<string>();
    for (const p of teamPlays) {
      gamesSet.add(`${p.week.toString().padStart(2, '0')}-${p.gameId}`);
    }
    const distinctGamesSorted = Array.from(gamesSet).sort();

    const computeWindow = (
      windowName: "season-to-date" | "last-4" | "last-8",
      numGames: number | null
    ) => {
      let includedGames: Set<string>;
      if (numGames === null) {
         includedGames = new Set(distinctGamesSorted.map(g => g.substring(3)));
      } else {
         const lastNGames = distinctGamesSorted.slice(-numGames);
         includedGames = new Set(lastNGames.map(g => g.substring(3)));
      }

      const windowPlays = teamPlays.filter(p => includedGames.has(p.gameId));
      const distinctGameCount = includedGames.size;
      const offensivePlays = windowPlays.length;

      if (offensivePlays < 100 || distinctGameCount < 3) {
        // Teams below floor are excluded completely from this window
        belowFloorTeams++;
        return;
      }

      let explosiveCount = 0;
      let turnoverCount = 0;

      for (const p of windowPlays) {
        if (p.yardsGained >= 21) explosiveCount++;
        // turnover: interception == 1 OR fumble_lost == 1. A play with both is 1 turnover.
        if (p.interception === 1 || p.fumbleLost === 1) turnoverCount++;
      }

      const toxicDifferential = explosiveCount - turnoverCount;
      const toxicRate = round(toxicDifferential / offensivePlays, 4);
      const toxicPerGame = round(toxicDifferential / distinctGameCount, 4);
      const explosiveRate = round(explosiveCount / offensivePlays, 4);
      const turnoverRate = round(turnoverCount / offensivePlays, 4);

      teams.push({
        teamId,
        window: windowName,
        offensivePlays,
        distinctGames: distinctGameCount,
        explosiveCount,
        turnoverCount,
        toxicDifferential,
        toxicRate,
        toxicPerGame,
        explosiveRate,
        turnoverRate,
        provenance: buildProvenance(offensivePlays),
      });
    };

    computeWindow("season-to-date", null);
    computeWindow("last-4", 4);
    computeWindow("last-8", 8);
  }

  return { teams, diagnostics: { excludedPlays, belowFloorTeams } };
}
