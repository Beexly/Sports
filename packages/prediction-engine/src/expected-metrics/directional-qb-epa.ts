import type { DirectionalAttemptPlay } from "./nflverse-pbp-mapper.js";

/** Minimum distinct weeks of data required for a QB to appear in a window. */
export const DEFAULT_MIN_PASSER_ATTEMPTS = 80; // season-to-date
export const DEFAULT_MIN_PASSER_ATTEMPTS_LAST_4 = 40; // last-4 window
export const MIN_BUCKET_ATTEMPTS = 10; // per-bucket requirement

export type DirectionalBucket = {
  readonly attempts: number;
  readonly ownEpaMean: number | null;
  readonly leagueMean: number | null;
  readonly diffVsLeague: number | null;
  readonly shrunkEpaPerAttempt: number | null;
};

export type DirectionalDiagnostics = {
  readonly excludedSpikes: number;
  readonly excludedNullEpa: number;
  readonly unchartedLocations: number;
  readonly excludedNonFiniteAirYards: number;
};

export type DirectionalMetricsOutput = {
  readonly playerId: string;
  readonly targetSeason: number;
  readonly targetWeek: number;
  readonly window: "season-to-date" | "last-4" | "last-8";

  readonly overallAttempts: number;

  // Buckets
  readonly bucketLeftShort: DirectionalBucket;
  readonly bucketLeftDeep: DirectionalBucket;
  readonly bucketMiddleShort: DirectionalBucket;
  readonly bucketMiddleDeep: DirectionalBucket;
  readonly bucketRightShort: DirectionalBucket;
  readonly bucketRightDeep: DirectionalBucket;

  // Depth-bands
  readonly depthBehind: DirectionalBucket;
  readonly depth0to9: DirectionalBucket;
  readonly depth10to19: DirectionalBucket;
  readonly depth20Plus: DirectionalBucket;

  // Composite tilt
  readonly compositeMiddleEpaPerAttempt: number | null;
  readonly compositeOutsideEpaPerAttempt: number | null;
  readonly tiltMiddleVsOutside: number | null;

  readonly diagnostics: DirectionalDiagnostics;
};


type PlayAccumulator = {
  overallAttempts: number;
  excludedSpikes: number;
  excludedNullEpa: number;
  unchartedLocations: number;
  excludedNonFiniteAirYards: number;

  plays: DirectionalAttemptPlay[];
};

function initAccumulator(): PlayAccumulator {
  return {
    overallAttempts: 0,
    excludedSpikes: 0,
    excludedNullEpa: 0,
    unchartedLocations: 0,
    excludedNonFiniteAirYards: 0,
    plays: [],
  };
}

export function computeDirectionalQbEpa(
  plays: readonly DirectionalAttemptPlay[],
  targetSeason: number,
  targetWeek: number,
  windowWeeks: number | "season-to-date",
): readonly DirectionalMetricsOutput[] {
  // 1. Point-in-time filter and per-QB accumulation
  const qbData = new Map<string, PlayAccumulator>();

  // Determine window constraints
  const distinctWeeks = new Set<number>();
  for (const play of plays) {
    if (play.week < targetWeek) {
      distinctWeeks.add(play.week);
    }
  }

  const sortedWeeks = Array.from(distinctWeeks).sort((a, b) => b - a);
  let minWeek = 0;
  if (typeof windowWeeks === "number") {
    minWeek = sortedWeeks[windowWeeks - 1] ?? 0;
  }

  for (const play of plays) {
    // Enforce point-in-time
    if (play.week >= targetWeek) continue;
    // Enforce window
    if (typeof windowWeeks === "number" && play.week < minWeek) continue;

    const playerId = play.passerPlayerId;
    let acc = qbData.get(playerId);
    if (!acc) {
      acc = initAccumulator();
      qbData.set(playerId, acc);
    }

    if (play.qbSpike === 1) {
      acc.excludedSpikes++;
      continue;
    }

    acc.overallAttempts++;

    if (play.epa === null) {
      acc.excludedNullEpa++;
      continue;
    }

    const hasValidLocation = (play.passLocation === "left" || play.passLocation === "middle" || play.passLocation === "right") &&
                             (play.passLength === "short" || play.passLength === "deep");
    if (!hasValidLocation) {
      acc.unchartedLocations++;
    }

    if (!Number.isFinite(play.airYards)) {
      acc.excludedNonFiniteAirYards++;
    }

    acc.plays.push(play);
  }


  // 2. Filter QBs that meet window floors and calculate raw bucket means
  const floorRequirement = windowWeeks === 4 ? DEFAULT_MIN_PASSER_ATTEMPTS_LAST_4 : DEFAULT_MIN_PASSER_ATTEMPTS;

  // Track global pool of plays for league means for QBs meeting floor
  type BucketTotals = { epaSum: number; count: number };
  const leagueTotals = new Map<string, BucketTotals>();

  const addLeagueTot = (key: string, epa: number) => {
    let bt = leagueTotals.get(key);
    if (!bt) { bt = { epaSum: 0, count: 0 }; leagueTotals.set(key, bt); }
    bt.epaSum += epa;
    bt.count++;
  };

  const getBucketKey = (play: DirectionalAttemptPlay): string | null => {
    if ((play.passLocation === "left" || play.passLocation === "middle" || play.passLocation === "right") &&
        (play.passLength === "short" || play.passLength === "deep")) {
      return `${play.passLocation}-${play.passLength}`;
    }
    return null;
  };

  const getDepthKey = (play: DirectionalAttemptPlay): string | null => {
    if (!Number.isFinite(play.airYards)) return null;
    if (play.airYards < 0) return "behind";
    if (play.airYards <= 9) return "0to9";
    if (play.airYards <= 19) return "10to19";
    return "20plus";
  };

  const eligibleQbs = new Map<string, PlayAccumulator>();

  for (const [playerId, acc] of qbData.entries()) {
    if (acc.overallAttempts < floorRequirement) continue;
    eligibleQbs.set(playerId, acc);

    // Add to league pools
    for (const play of acc.plays) {
      if (play.epa === null) continue; // Already excluded from acc.plays actually, but just to be safe

      const bk = getBucketKey(play);
      if (bk) {
        addLeagueTot(bk, play.epa);

        // Composite outside / middle
        if (play.passLocation === "left" || play.passLocation === "right") {
           addLeagueTot("composite-outside", play.epa);
        } else if (play.passLocation === "middle") {
           addLeagueTot("composite-middle", play.epa);
        }
      }

      const dk = getDepthKey(play);
      if (dk) addLeagueTot(`depth-${dk}`, play.epa);
    }
  }

  // Calculate league means
  const leagueMeans = new Map<string, number>();
  for (const [key, bt] of leagueTotals.entries()) {
    if (bt.count > 0) {
      leagueMeans.set(key, bt.epaSum / bt.count);
    }
  }

  const results: DirectionalMetricsOutput[] = [];

  const buildBucket = (qbEpaSum: number, qbCount: number, leagueKey: string): DirectionalBucket => {
    if (qbCount < MIN_BUCKET_ATTEMPTS) {
      return {
        attempts: qbCount,
        ownEpaMean: null,
        leagueMean: null,
        diffVsLeague: null,
        shrunkEpaPerAttempt: null,
      };
    }

    const ownEpaMean = qbEpaSum / qbCount;
    const leagueMean = leagueMeans.get(leagueKey) ?? 0;
    const diffVsLeague = ownEpaMean - leagueMean;
    const shrunkEpaPerAttempt = leagueMean + (qbCount / (qbCount + 20)) * diffVsLeague;

    return {
      attempts: qbCount,
      ownEpaMean,
      leagueMean,
      diffVsLeague,
      shrunkEpaPerAttempt,
    };
  };

  for (const [playerId, acc] of eligibleQbs.entries()) {
    const qbBucketSums = new Map<string, { epaSum: number; count: number }>();

    const addQbTot = (key: string, epa: number) => {
      let bt = qbBucketSums.get(key);
      if (!bt) { bt = { epaSum: 0, count: 0 }; qbBucketSums.set(key, bt); }
      bt.epaSum += epa;
      bt.count++;
    };

    for (const play of acc.plays) {
      const bk = getBucketKey(play);
      if (bk) {
        addQbTot(bk, play.epa!);
        if (play.passLocation === "left" || play.passLocation === "right") {
           addQbTot("composite-outside", play.epa!);
        } else if (play.passLocation === "middle") {
           addQbTot("composite-middle", play.epa!);
        }
      }
      const dk = getDepthKey(play);
      if (dk) addQbTot(`depth-${dk}`, play.epa!);
    }

    const getQbBt = (key: string) => qbBucketSums.get(key) ?? { epaSum: 0, count: 0 };

    const bucketLeftShort = buildBucket(getQbBt("left-short").epaSum, getQbBt("left-short").count, "left-short");
    const bucketLeftDeep = buildBucket(getQbBt("left-deep").epaSum, getQbBt("left-deep").count, "left-deep");
    const bucketMiddleShort = buildBucket(getQbBt("middle-short").epaSum, getQbBt("middle-short").count, "middle-short");
    const bucketMiddleDeep = buildBucket(getQbBt("middle-deep").epaSum, getQbBt("middle-deep").count, "middle-deep");
    const bucketRightShort = buildBucket(getQbBt("right-short").epaSum, getQbBt("right-short").count, "right-short");
    const bucketRightDeep = buildBucket(getQbBt("right-deep").epaSum, getQbBt("right-deep").count, "right-deep");

    const depthBehind = buildBucket(getQbBt("depth-behind").epaSum, getQbBt("depth-behind").count, "depth-behind");
    const depth0to9 = buildBucket(getQbBt("depth-0to9").epaSum, getQbBt("depth-0to9").count, "depth-0to9");
    const depth10to19 = buildBucket(getQbBt("depth-10to19").epaSum, getQbBt("depth-10to19").count, "depth-10to19");
    const depth20Plus = buildBucket(getQbBt("depth-20plus").epaSum, getQbBt("depth-20plus").count, "depth-20plus");

    const compositeOutside = buildBucket(getQbBt("composite-outside").epaSum, getQbBt("composite-outside").count, "composite-outside");
    const compositeMiddle = buildBucket(getQbBt("composite-middle").epaSum, getQbBt("composite-middle").count, "composite-middle");

    let tiltMiddleVsOutside: number | null = null;
    if (compositeMiddle.shrunkEpaPerAttempt !== null && compositeOutside.shrunkEpaPerAttempt !== null) {
      tiltMiddleVsOutside = compositeMiddle.shrunkEpaPerAttempt - compositeOutside.shrunkEpaPerAttempt;
    }

    results.push({
      playerId,
      targetSeason,
      targetWeek,
      window: typeof windowWeeks === "number" ? (windowWeeks === 4 ? "last-4" : "last-8") : "season-to-date",
      overallAttempts: acc.overallAttempts,
      bucketLeftShort,
      bucketLeftDeep,
      bucketMiddleShort,
      bucketMiddleDeep,
      bucketRightShort,
      bucketRightDeep,
      depthBehind,
      depth0to9,
      depth10to19,
      depth20Plus,
      compositeMiddleEpaPerAttempt: compositeMiddle.shrunkEpaPerAttempt,
      compositeOutsideEpaPerAttempt: compositeOutside.shrunkEpaPerAttempt,
      tiltMiddleVsOutside,
      diagnostics: {
        excludedSpikes: acc.excludedSpikes,
        excludedNullEpa: acc.excludedNullEpa,
        unchartedLocations: acc.unchartedLocations,
        excludedNonFiniteAirYards: acc.excludedNonFiniteAirYards,
      },
    });
  }

  return results;

}
