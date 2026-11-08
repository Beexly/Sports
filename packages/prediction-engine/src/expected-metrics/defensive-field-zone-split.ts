import { round } from "./numeric.js";
import { isSuccessfulPlay } from "./success-rate.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** Module play contract. */
export interface DefensiveFieldZonePlay {
  readonly playId: string;
  readonly defteam: string;
  readonly week: number;
  readonly yardline_100: number;
  readonly down: number;
  readonly ydstogo: number;
  readonly yardsGained: number;
  readonly touchdown: 0 | 1;
  readonly turnover: 0 | 1;
  /** Our EPA for the play, attached via attachOwnEpa; null means unratable. */
  readonly epa: number | null;
}

export type DefensiveFieldZoneWindow = "season-to-date" | "last-4" | "last-8";

export interface FieldZoneStats {
  readonly plays: number;
  readonly epaPlays: number;
  readonly meanEpaAllowed: number;
  readonly successPlays: number;
  readonly successesAllowed: number;
  readonly successRateAllowed: number;
}

export interface RedZoneExtras {
  readonly redZoneTdRateAllowed: number;
}

export interface DefensiveFieldZoneSplitAllowedResult {
  readonly defteam: string;
  readonly redZone: FieldZoneStats & RedZoneExtras;
  readonly openField: FieldZoneStats;
  readonly epaSplit: number;
  readonly successSplit: number;
  readonly provenance: ExpectedMetricProvenance;
}

const DEFENSIVE_FIELD_ZONE_FEATURE_KEYS = [
  "defteam",
  "week",
  "yardline_100",
  "down",
  "ydstogo",
  "yardsGained",
  "touchdown",
  "turnover",
  "epa",
] as const;

export const DEFENSIVE_FIELD_ZONE_MODEL_VERSION = "gse-defensive-field-zone-split-v1";

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: DEFENSIVE_FIELD_ZONE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...DEFENSIVE_FIELD_ZONE_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(DEFENSIVE_FIELD_ZONE_FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Defensive field-zone split — red-zone vs open-field efficiency allowed (SHADOW)
 *
 * Computes defensive performance partitioned by field position:
 *   - RED ZONE: yardline_100 <= 20
 *   - OPEN FIELD: yardline_100 > 20
 *
 * Non-finite yardline_100 rows are excluded from both and counted in diagnostics.
 * Success is judged by `isSuccessfulPlay` exactly. Turnover -> forced failure,
 * TD -> forced success. The down-yardage rule handles the rest.
 * Null own-EPA plays are excluded from EPA means but counted in success/plays.
 */
export function defensiveFieldZoneSplitAllowed(
  plays: readonly DefensiveFieldZonePlay[],
  targetWeek: number,
  window: DefensiveFieldZoneWindow
): {
  results: DefensiveFieldZoneSplitAllowedResult[];
  diagnostics: {
    unratableYardline: number;
    belowFloorDefteams: number;
    nullEpaExclusions: number;
    unratableSuccessExclusions: number;
  };
  leagueMeans: {
    redZone: FieldZoneStats;
    openField: FieldZoneStats;
  };
} {
  const pastPlays = plays.filter((p) => p.week < targetWeek);

  let validPlays = pastPlays;
  if (window !== "season-to-date") {
    const distinctWeeks = Array.from(new Set(pastPlays.map((p) => p.week))).sort((a, b) => b - a);
    const limit = window === "last-4" ? 4 : 8;
    const includedWeeks = new Set(distinctWeeks.slice(0, limit));
    validPlays = pastPlays.filter((p) => includedWeeks.has(p.week));
  }

  let unratableYardline = 0;
  let belowFloorDefteams = 0;
  let nullEpaExclusions = 0;
  let unratableSuccessExclusions = 0;

  const byDefteam = new Map<
    string,
    {
      rzPlays: number;
      rzEpaPlays: number;
      rzEpaSum: number;
      rzSuccessPlays: number;
      rzSuccesses: number;
      rzTdAllowed: number;

      ofPlays: number;
      ofEpaPlays: number;
      ofEpaSum: number;
      ofSuccessPlays: number;
      ofSuccesses: number;
    }
  >();

  for (const play of validPlays) {
    if (!Number.isFinite(play.yardline_100)) {
      unratableYardline++;
      continue;
    }

    let d = byDefteam.get(play.defteam);
    if (!d) {
      d = {
        rzPlays: 0, rzEpaPlays: 0, rzEpaSum: 0, rzSuccessPlays: 0, rzSuccesses: 0, rzTdAllowed: 0,
        ofPlays: 0, ofEpaPlays: 0, ofEpaSum: 0, ofSuccessPlays: 0, ofSuccesses: 0,
      };
      byDefteam.set(play.defteam, d);
    }

    const isRz = play.yardline_100 <= 20;

    // Evaluate success
    const successResult = isSuccessfulPlay({
      playId: play.playId,
      teamId: "pos", // Dummy for success eval
      playerId: "player", // Dummy for success eval
      down: play.down,
      ydstogo: play.ydstogo,
      yardsGained: play.yardsGained,
      touchdown: play.touchdown,
      turnover: play.turnover,
    });

    if (successResult === null) {
      unratableSuccessExclusions++;
    }

    if (play.epa === null) {
      nullEpaExclusions++;
    }

    if (isRz) {
      d.rzPlays++;
      if (play.touchdown === 1 && play.turnover === 0) d.rzTdAllowed++;
      if (play.epa !== null) {
        d.rzEpaPlays++;
        d.rzEpaSum += play.epa;
      }
      if (successResult !== null) {
        d.rzSuccessPlays++;
        if (successResult) d.rzSuccesses++;
      }
    } else {
      d.ofPlays++;
      if (play.epa !== null) {
        d.ofEpaPlays++;
        d.ofEpaSum += play.epa;
      }
      if (successResult !== null) {
        d.ofSuccessPlays++;
        if (successResult) d.ofSuccesses++;
      }
    }
  }

  const results: DefensiveFieldZoneSplitAllowedResult[] = [];

  // Aggregate for league means over floor-qualifying defenses
  let lgRzPlays = 0;
  let lgRzEpaPlays = 0;
  let lgRzEpaSum = 0;
  let lgRzSuccessPlays = 0;
  let lgRzSuccesses = 0;

  let lgOfPlays = 0;
  let lgOfEpaPlays = 0;
  let lgOfEpaSum = 0;
  let lgOfSuccessPlays = 0;
  let lgOfSuccesses = 0;

  const sortedDefteams = Array.from(byDefteam.keys()).sort();
  for (const defteam of sortedDefteams) {
    const d = byDefteam.get(defteam)!;

    // Floors: red-zone plays >= 30, open-field plays >= 100, and red-zone epaPlays >= 30.
    if (d.rzPlays < 30 || d.ofPlays < 100 || d.rzEpaPlays < 30) {
      belowFloorDefteams++;
      continue;
    }

    const rzEpaAllowed = d.rzEpaSum / d.rzEpaPlays;
    const ofEpaAllowed = d.ofEpaSum / d.ofEpaPlays;

    // Handle potential division by zero if all plays were unratable for success
    const rzSuccessRateAllowed = d.rzSuccessPlays > 0 ? d.rzSuccesses / d.rzSuccessPlays : 0;
    const ofSuccessRateAllowed = d.ofSuccessPlays > 0 ? d.ofSuccesses / d.ofSuccessPlays : 0;
    const rzTdRateAllowed = d.rzTdAllowed / d.rzPlays;

    lgRzPlays += d.rzPlays;
    lgRzEpaPlays += d.rzEpaPlays;
    lgRzEpaSum += d.rzEpaSum;
    lgRzSuccessPlays += d.rzSuccessPlays;
    lgRzSuccesses += d.rzSuccesses;

    lgOfPlays += d.ofPlays;
    lgOfEpaPlays += d.ofEpaPlays;
    lgOfEpaSum += d.ofEpaSum;
    lgOfSuccessPlays += d.ofSuccessPlays;
    lgOfSuccesses += d.ofSuccesses;

    const sampleSize = d.rzPlays + d.ofPlays; // total scrimmage plays faced in the window by this defteam

    results.push({
      defteam,
      redZone: {
        plays: d.rzPlays,
        epaPlays: d.rzEpaPlays,
        meanEpaAllowed: round(rzEpaAllowed, 4),
        successPlays: d.rzSuccessPlays,
        successesAllowed: d.rzSuccesses,
        successRateAllowed: round(rzSuccessRateAllowed, 4),
        redZoneTdRateAllowed: round(rzTdRateAllowed, 4),
      },
      openField: {
        plays: d.ofPlays,
        epaPlays: d.ofEpaPlays,
        meanEpaAllowed: round(ofEpaAllowed, 4),
        successPlays: d.ofSuccessPlays,
        successesAllowed: d.ofSuccesses,
        successRateAllowed: round(ofSuccessRateAllowed, 4),
      },
      epaSplit: round(rzEpaAllowed - ofEpaAllowed, 4),
      successSplit: round(rzSuccessRateAllowed - ofSuccessRateAllowed, 4),
      provenance: buildProvenance(sampleSize),
    });
  }

  return {
    results,
    diagnostics: {
      unratableYardline,
      belowFloorDefteams,
      nullEpaExclusions,
      unratableSuccessExclusions,
    },
    leagueMeans: {
      redZone: {
        plays: lgRzPlays,
        epaPlays: lgRzEpaPlays,
        meanEpaAllowed: lgRzEpaPlays > 0 ? round(lgRzEpaSum / lgRzEpaPlays, 4) : 0,
        successPlays: lgRzSuccessPlays,
        successesAllowed: lgRzSuccesses,
        successRateAllowed: lgRzSuccessPlays > 0 ? round(lgRzSuccesses / lgRzSuccessPlays, 4) : 0,
      },
      openField: {
        plays: lgOfPlays,
        epaPlays: lgOfEpaPlays,
        meanEpaAllowed: lgOfEpaPlays > 0 ? round(lgOfEpaSum / lgOfEpaPlays, 4) : 0,
        successPlays: lgOfSuccessPlays,
        successesAllowed: lgOfSuccesses,
        successRateAllowed: lgOfSuccessPlays > 0 ? round(lgOfSuccesses / lgOfSuccessPlays, 4) : 0,
      },
    },
  };
}
