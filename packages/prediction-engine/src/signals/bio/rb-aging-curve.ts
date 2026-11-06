/**
 * rb-aging-curve.ts — RB per-position cohort aging curves.
 *
 * Source: @DynatyzeFF, 2026-10-07 ~10:51 PM CDT.
 * "Age atlas": RB · ALL ERAS 1999-2026 · PPR value, min 4 seasons; lead backs lose ~38%
 * of peak PPR value from age 28 to 30; peak ~23; cohort of 84 lead backs / 679 seasons.
 *
 * SHADOW ONLY: diagnostic/observability. Do NOT wire into any live model path, gate, or product surface.
 *
 * Note: Does not duplicate packages/prediction-engine/src/2608-06635v2-modelling-athletic-ageing-relative-to.ts.
 * This is a cohort table based on nflverse data, not a STAR age curve.
 */

export interface RBSeason {
  readonly playerId: string;
  readonly season: number;
  readonly ageAtSeasonStart: number;
  readonly fpts: number;
}

export interface AgeCurveRow {
  readonly age: number;
  readonly multiplier: number;
  readonly n: number;
  readonly shrunkMean: number;
}

export interface CohortCurve {
  readonly table: AgeCurveRow[];
  readonly peakAge: number;
  readonly cohortSize: number;
  readonly seasonCount: number;
}

export interface PlayerOverlayRow {
  readonly season: number;
  readonly age: number;
  readonly fpts: number;
  readonly playerMultiplier: number;
  readonly cohortMultiplier: number;
}

export interface BuildCohortOptions {
  readonly asOfSeason?: number;
  readonly shrinkagePseudoCount?: number;
}

/**
 * Builds the RB cohort age-decay multiplier table.
 * Cohort definition: players with >= 2 top-36 RB FPTS seasons in their career.
 */
export function buildCohortCurve(seasons: readonly RBSeason[], opts: BuildCohortOptions = {}): CohortCurve {
  const maxSeason = opts.asOfSeason ?? Infinity;
  const pitSeasons = seasons.filter(s => s.season <= maxSeason);

  // Group by season to find top-36 RBs
  const seasonsMap = new Map<number, RBSeason[]>();
  for (const s of pitSeasons) {
    if (!seasonsMap.has(s.season)) {
      seasonsMap.set(s.season, []);
    }
    seasonsMap.get(s.season)!.push(s);
  }

  const top36SeasonsByPlayer = new Map<string, number>();
  for (const [, sList] of seasonsMap.entries()) {
    // Sort descending by FPTS
    sList.sort((a, b) => b.fpts - a.fpts);
    const top36 = sList.slice(0, 36);
    for (const s of top36) {
      top36SeasonsByPlayer.set(s.playerId, (top36SeasonsByPlayer.get(s.playerId) ?? 0) + 1);
    }
  }

  // Build cohort
  const cohortIds = new Set<string>();
  for (const [playerId, count] of top36SeasonsByPlayer.entries()) {
    if (count >= 2) {
      cohortIds.add(playerId);
    }
  }

  const cohortSeasons = pitSeasons.filter(s => cohortIds.has(s.playerId));

  // Calculate stats per age
  const ageMap = new Map<number, { sum: number; count: number }>();
  let globalSum = 0;
  let globalCount = 0;

  for (const s of cohortSeasons) {
    const age = Math.floor(s.ageAtSeasonStart);
    if (!ageMap.has(age)) {
      ageMap.set(age, { sum: 0, count: 0 });
    }
    const bucket = ageMap.get(age)!;
    bucket.sum += s.fpts;
    bucket.count += 1;
    globalSum += s.fpts;
    globalCount += 1;
  }

  const globalMean = globalCount > 0 ? globalSum / globalCount : 0;
  // Use a pseudo-count of 5 if not provided.
  const pseudoCount = opts.shrinkagePseudoCount ?? 5;

  const table: AgeCurveRow[] = [];
  let maxShrunkMean = -Infinity;
  let peakAge = -1;

  for (const [age, bucket] of ageMap.entries()) {
    const shrunkMean = (bucket.sum + pseudoCount * globalMean) / (bucket.count + pseudoCount);

    table.push({
      age,
      n: bucket.count,
      shrunkMean,
      multiplier: 0 // Will be normalized next
    });

    if (shrunkMean > maxShrunkMean) {
      maxShrunkMean = shrunkMean;
      peakAge = age;
    }
  }

  if (peakAge === -1) {
    return {
      table: [],
      peakAge: 0,
      cohortSize: 0,
      seasonCount: 0
    };
  }

  // Normalize by peak
  const normalizedTable = table.map(row => ({
    ...row,
    multiplier: maxShrunkMean > 0 ? row.shrunkMean / maxShrunkMean : 0
  }));

  normalizedTable.sort((a, b) => a.age - b.age);

  return {
    table: normalizedTable,
    peakAge,
    cohortSize: cohortIds.size,
    seasonCount: cohortSeasons.length
  };
}

/**
 * Overlays a specific player's trajectory alongside the cohort curve.
 * Normalizes the player's FPTS by their own peak to compare decay shapes.
 */
export function playerPathOverlay(playerSeasons: readonly RBSeason[], curve: CohortCurve): PlayerOverlayRow[] {
  const sorted = [...playerSeasons].sort((a, b) => a.season - b.season);

  if (sorted.length === 0 || curve.table.length === 0) {
    return [];
  }

  let playerPeak = -Infinity;
  for (const s of sorted) {
    if (s.fpts > playerPeak) {
      playerPeak = s.fpts;
    }
  }

  const tableMap = new Map<number, number>();
  for (const row of curve.table) {
    tableMap.set(row.age, row.multiplier);
  }

  return sorted.map(s => {
    const age = Math.floor(s.ageAtSeasonStart);
    return {
      season: s.season,
      age: s.ageAtSeasonStart, // preserving exact age for output
      fpts: s.fpts,
      playerMultiplier: playerPeak > 0 ? s.fpts / playerPeak : 0,
      cohortMultiplier: tableMap.get(age) ?? 0
    };
  });
}
