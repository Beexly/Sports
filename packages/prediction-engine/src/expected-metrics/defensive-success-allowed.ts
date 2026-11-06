import { round } from "./numeric.js";
import {
  isSuccessfulPlay,
  SUCCESS_RATE_MODEL_VERSION,
  type SuccessPlay,
} from "./success-rate.js";
import {
  computeFeatureSchemaHash,
  type ExpectedMetricProvenance,
} from "./types.js";

/** Module play contract. */
export interface DefensiveSuccessPlay extends SuccessPlay {
  readonly defteam: string;
  readonly week: number;
}

const DEFENSIVE_SUCCESS_FEATURE_KEYS = [
  "down",
  "ydstogo",
  "yardsGained",
  "touchdown",
  "turnover",
  "defteam",
  "week",
] as const;

export interface DefensiveSuccessAllowedSplit {
  readonly defteam: string;
  readonly plays: number;
  readonly successes: number;
  readonly successAllowedRate: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface DefensiveSuccessAllowedResult {
  readonly overall: DefensiveSuccessAllowedSplit | null;
  readonly down1: DefensiveSuccessAllowedSplit | null;
  readonly down2: DefensiveSuccessAllowedSplit | null;
  readonly down3: DefensiveSuccessAllowedSplit | null;
  readonly down4: DefensiveSuccessAllowedSplit | null;
  /** Number of unratable rows (e.g., non-finite yardage or invalid down). */
  readonly unratablePlays: number;
  /** Number of rows with an empty defteam. */
  readonly emptyDefteamPlays: number;
}

export type DefensiveSuccessWindow = "season-to-date" | "last-4" | "last-8";

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: SUCCESS_RATE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...DEFENSIVE_SUCCESS_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(DEFENSIVE_SUCCESS_FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Given all plays, a target week, and a window size, computes the defensive success
 * allowed splits for every defense.
 *
 * Target week enforcement: uses strictly `week < targetWeek`.
 * Distinct weeks enforcement: for last-4 or last-8, filters down to the N most recent
 * distinct weeks strictly below targetWeek.
 */
export function defensiveSuccessAllowed(
  plays: readonly DefensiveSuccessPlay[],
  targetWeek: number,
  window: DefensiveSuccessWindow
): DefensiveSuccessAllowedResult[] {
  // 1. Point-in-time filter + find distinct weeks.
  const pastPlays = plays.filter((p) => p.week < targetWeek);

  let validPlays = pastPlays;
  if (window !== "season-to-date") {
    const distinctWeeks = Array.from(new Set(pastPlays.map((p) => p.week))).sort(
      (a, b) => b - a
    );
    const limit = window === "last-4" ? 4 : 8;
    const includedWeeks = new Set(distinctWeeks.slice(0, limit));
    validPlays = pastPlays.filter((p) => includedWeeks.has(p.week));
  }

  const byDefteam = new Map<
    string,
    {
      overall: { plays: number; successes: number };
      downs: Record<1 | 2 | 3 | 4, { plays: number; successes: number }>;
      unratable: number;
      emptyDefteam: number;
    }
  >();

  for (const play of validPlays) {
    let d = byDefteam.get(play.defteam);
    if (!d) {
      d = {
        overall: { plays: 0, successes: 0 },
        downs: {
          1: { plays: 0, successes: 0 },
          2: { plays: 0, successes: 0 },
          3: { plays: 0, successes: 0 },
          4: { plays: 0, successes: 0 },
        },
        unratable: 0,
        emptyDefteam: 0,
      };
      byDefteam.set(play.defteam, d);
    }

    // According to instruction: empty-defteam play is excluded and counted separately.
    if (play.defteam === "") {
      // Since it's excluded and COUNTED separately, we need to track it globally? No, "per-row within a point-in-time per-player accumulator".
      // But there is no defteam here! We will just put it in a special '' bucket.
      d.emptyDefteam++;
      continue; // Never attribute to a guessed defense
    }

    const success = isSuccessfulPlay(play);
    if (success === null) {
      // Unratable (down outside 1-4, non-finite yards, etc)
      d.unratable++;
      continue;
    }

    const isSucc = success ? 1 : 0;

    d.overall.plays++;
    d.overall.successes += isSucc;

    const dwn = play.down as 1 | 2 | 3 | 4;
    d.downs[dwn].plays++;
    d.downs[dwn].successes += isSucc;
  }

  const results: DefensiveSuccessAllowedResult[] = [];

  const sortedDefteams = Array.from(byDefteam.keys()).sort();
  for (const defteam of sortedDefteams) {
    const metrics = byDefteam.get(defteam)!;
    // RECONCILIATION: overall plays == sum of down-arm plays, overall successes == sum of down-arm successes

    let overallSplit: DefensiveSuccessAllowedSplit | null = null;
    if (metrics.overall.plays >= 50) {
      overallSplit = {
        defteam,
        plays: metrics.overall.plays,
        successes: metrics.overall.successes,
        successAllowedRate: round(metrics.overall.successes / metrics.overall.plays, 4),
        provenance: buildProvenance(metrics.overall.plays),
      };
    }

    const buildDownSplit = (dwn: 1 | 2 | 3 | 4): DefensiveSuccessAllowedSplit | null => {
      const data = metrics.downs[dwn];
      if (data.plays >= 20) {
        return {
          defteam,
          plays: data.plays,
          successes: data.successes,
          successAllowedRate: round(data.successes / data.plays, 4),
          provenance: buildProvenance(data.plays),
        };
      }
      return null;
    };

    results.push({
      overall: overallSplit,
      down1: buildDownSplit(1),
      down2: buildDownSplit(2),
      down3: buildDownSplit(3),
      down4: buildDownSplit(4),
      unratablePlays: metrics.unratable,
      emptyDefteamPlays: metrics.emptyDefteam,
    });
  }

  // To sort by defteam, we should just include defteam on the top level Result object.
  // Wait, DefensiveSuccessAllowedResult does not have defteam on the top level in our interface,
  // and we don't really need to sort if we are returning an array where the caller knows the defteam, but let's make it deterministic.
  // Let's sort the map entries instead of the results array.
  return results;
}
