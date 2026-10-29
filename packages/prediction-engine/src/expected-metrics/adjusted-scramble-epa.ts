/**
 * Adjusted Scramble EPA (scrambles + sacks)
 *
 * Scramble EPA re-based to include sacks. Raw scramble EPA flatters QBs by counting
 * only the plays where escaping worked; charging the sacks against the same escape
 * tendency is the honest price of a QB's scrambling style.
 *
 * NOTE: Holding-erased scrambles are EXCLUDED from this build. Identifying a
 * holding-erased scramble in pbp is not reliable, as pbp carries no verified
 * penalty-type identification for this rule.
 */

import { ExpectedMetricProvenance } from "./types.js";

/** One play for the adjusted scramble EPA calculation. */
export interface AdjustedScramblePlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly passerPlayerId: string;
  readonly rusherPlayerId: string;
  readonly qbScramble: 1 | 0;
  readonly sack: 1 | 0;
  /** Our EPA for the play, attached via attachOwnEpa; null means unratable */
  readonly epa: number | null;
}

export const ADJUSTED_SCRAMBLE_EPA_MODEL_VERSION = "1.0.0";
export const ADJUSTED_SCRAMBLE_EPA_MIN_OPPORTUNITIES = 20;

export const ADJUSTED_SCRAMBLE_EPA_PROVENANCE: ExpectedMetricProvenance = {
  modelVersion: ADJUSTED_SCRAMBLE_EPA_MODEL_VERSION,
  method: "deterministic-rule",
  featureKeys: ["qbScramble", "sack"],
  featureSchemaHash: "00000000", // Will be properly computed if needed, or static if deterministic
  sampleSize: 0,
};

export interface QbAdjustedScrambleEpa {
  readonly passerPlayerId: string;
  readonly scrambles: number;
  readonly sacks: number;
  readonly opportunities: number;
  readonly scrambleEpaMean: number | null;
  readonly sackEpaMean: number | null;
  readonly adjustedScrambleEpa: number | null;
}

export interface AdjustedScrambleEpaResult {
  readonly qbs: readonly QbAdjustedScrambleEpa[];
  readonly diagnostics: {
    readonly qbsBelowFloor: number;
    readonly unratableOpportunitiesExcluded: number;
  };
}

/**
 * Computes the adjusted scramble EPA for each QB in the given plays, up to
 * (but strictly before) the targetWeek.
 */
export function computeAdjustedScrambleEpa(
  plays: readonly AdjustedScramblePlay[],
  targetWeek: number,
  distinctWeeksLimit?: number
): AdjustedScrambleEpaResult {
  // 1. Filter by point-in-time discipline (week < targetWeek)
  const pastPlays = plays.filter((p) => p.week < targetWeek);

  // 2. Identify distinct weeks present below targetWeek
  const distinctWeeks = Array.from(new Set(pastPlays.map((p) => p.week))).sort((a, b) => a - b);

  // 3. Apply window if specified
  let includedWeeks = distinctWeeks;
  if (distinctWeeksLimit !== undefined && distinctWeeks.length > distinctWeeksLimit) {
    includedWeeks = distinctWeeks.slice(-distinctWeeksLimit);
  }
  const includedWeeksSet = new Set(includedWeeks);

  const windowPlays = pastPlays.filter((p) => includedWeeksSet.has(p.week));

  // 4. Group by QB (passerPlayerId)
  const byQb = new Map<string, AdjustedScramblePlay[]>();
  for (const play of windowPlays) {
    // Only pass plays are provided to this module per the grain definition.
    // The passer is credited.
    const qb = play.passerPlayerId;
    let arr = byQb.get(qb);
    if (!arr) {
      arr = [];
      byQb.set(qb, arr);
    }
    arr.push(play);
  }

  const qbs: QbAdjustedScrambleEpa[] = [];
  let qbsBelowFloor = 0;
  let unratableOpportunitiesExcluded = 0;

  for (const [qb, qbPlays] of byQb.entries()) {
    let scrambles = 0;
    let sacks = 0;
    let scrambleEpaSum = 0;
    let scrambleEpaCount = 0;
    let sackEpaSum = 0;
    let sackEpaCount = 0;
    let opportunities = 0;

    for (const play of qbPlays) {
      // Opportunity rule: sack dominates.
      const isSack = play.sack === 1;
      const isScramble = play.qbScramble === 1 && !isSack;

      if (!isSack && !isScramble) {
        continue; // Not an opportunity
      }

      opportunities++;

      if (isSack) {
        sacks++;
        if (play.epa !== null) {
          sackEpaSum += play.epa;
          sackEpaCount++;
        } else {
          unratableOpportunitiesExcluded++;
        }
      } else if (isScramble) {
        scrambles++;
        if (play.epa !== null) {
          scrambleEpaSum += play.epa;
          scrambleEpaCount++;
        } else {
          unratableOpportunitiesExcluded++;
        }
      }
    }

    if (opportunities < ADJUSTED_SCRAMBLE_EPA_MIN_OPPORTUNITIES) {
      if (opportunities > 0) {
        qbsBelowFloor++;
      }
      continue;
    }

    const totalEpaSum = scrambleEpaSum + sackEpaSum;
    const totalEpaCount = scrambleEpaCount + sackEpaCount;

    qbs.push({
      passerPlayerId: qb,
      scrambles,
      sacks,
      opportunities,
      scrambleEpaMean: scrambleEpaCount > 0 ? scrambleEpaSum / scrambleEpaCount : null,
      sackEpaMean: sackEpaCount > 0 ? sackEpaSum / sackEpaCount : null,
      adjustedScrambleEpa: totalEpaCount > 0 ? totalEpaSum / totalEpaCount : null,
    });
  }

  // Sort deterministically by passer ID
  qbs.sort((a, b) => a.passerPlayerId.localeCompare(b.passerPlayerId));

  return {
    qbs,
    diagnostics: {
      qbsBelowFloor,
      unratableOpportunitiesExcluded,
    },
  };
}
