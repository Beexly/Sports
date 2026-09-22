/**
 * GSE Stat-Claim Harness v1: fixture schema + exact-match stat scorer (content-QC)
 *
 * Research port: arXiv:2402.10979
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Content-QC harness (not engine): 50 recent NFL games' nflverse play-by-play + official box scores (public, reproducible). Defines the fixture schema (pbp -> JSON stat fill: team points, passing/rushing yards, turnovers) and the exact-match accuracy scorer comparing pipeline output against official numbers.
 *
 * ACCEPTANCE GATE: ADOPT into the content pipeline only if condition (B) beats (A) by >=10pp of exact-match stat accuracy on the 50-game fixture AND the adversarial swap test shows no memorization.
 */

export interface StatFixture {
  gameId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  /** official box-score numbers (ground truth) */
  official: Record<string, number>;
}

export interface StatFill {
  gameId: string;
  /** pipeline-produced stats keyed identically to official */
  stats: Record<string, number>;
  condition: "A" | "B";
}

/** Exact-match accuracy over the fixture's stat keys. */
export function exactMatchAccuracy(fixture: StatFixture, fill: StatFill): number {
  const keys = Object.keys(fixture.official);
  if (keys.length === 0 || fill.gameId !== fixture.gameId) return 0;
  let hits = 0;
  for (const k of keys) if (fill.stats[k] === fixture.official[k]) hits++;
  return hits / keys.length;
}

/** Mean exact-match accuracy per condition across fixtures. */
export function harnessScore(
  fixtures: StatFixture[],
  fills: StatFill[],
): { A: number; B: number; deltaPp: number } {
  const byGame = new Map(fixtures.map((f) => [f.gameId, f]));
  const acc: Record<"A" | "B", number[]> = { A: [], B: [] };
  for (const fill of fills) {
    const fx = byGame.get(fill.gameId);
    if (fx) acc[fill.condition].push(exactMatchAccuracy(fx, fill));
  }
  const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  const A = avg(acc.A), B = avg(acc.B);
  return { A, B, deltaPp: (B - A) * 100 };
}

/** Gate: B beats A by >= 10 percentage points. */
export function statClaimGatePasses(deltaPp: number): boolean {
  return deltaPp >= 10;
}


/** Live-data gate: stays off until stat-claim harness validated on GSE fixtures. */
export const GSE_STAT_CLAIM_HARNESS_ENABLED = false;
