/**
 * Opponent-adjusted EPA/play — "our DVOA", computed transparently from open data.
 *
 * The flagship Tier-1 derived metric of the Data Dominance pillar: it engineers a
 * proprietary, opponent-adjusted efficiency rating from nflverse play-by-play (which
 * is free + CC-BY-cleared), so we publish a transparent equivalent of the proprietary
 * efficiency ratings competitors paywall — without their feed.
 *
 * Model: each play's EPA is approximated as `leagueMean + offense[posteam] +
 * defense[defteam]`, solved by iterative coordinate descent (Gauss-Seidel / SRS-style),
 * re-centring offense and defense to zero mean each pass for identifiability.
 *
 * Pure + deterministic + carries the "stat commandment" provenance envelope
 * (source · definition · weakness · timestamp). Intended for offline/precompute (the
 * worker), not the hot request path — pbp is large.
 */

export interface Play {
  readonly offense: string; // posteam
  readonly defense: string; // defteam
  readonly epa: number;
}

export interface TeamEpaRating {
  readonly team: string;
  /** EPA/play above league average, adjusted for the defenses faced (higher = better offense). */
  readonly offAdj: number;
  /** EPA/play allowed above league average, adjusted for the offenses faced (lower = better defense). */
  readonly defAdj: number;
  readonly offPlays: number;
  readonly defPlays: number;
}

export interface StatProvenance {
  readonly source: string;
  readonly definition: string;
  readonly weakness: string;
  readonly computedAt: string;
}

export interface OpponentAdjustedEpaResult {
  readonly ratings: readonly TeamEpaRating[];
  readonly leagueMeanEpa: number;
  readonly iterations: number;
  readonly sampleSize: number;
  readonly provenance: StatProvenance;
}

function provenance(computedAt: string): StatProvenance {
  return {
    source: "nflverse play-by-play (CC-BY-4.0)",
    definition:
      "Opponent-adjusted EPA/play: solves epa ≈ leagueMean + offense[posteam] + defense[defteam] by " +
      "iterative coordinate descent (SRS-style), re-centred each pass. offAdj is EPA/play above league " +
      "average adjusted for the defenses faced; defAdj is EPA/play allowed above average adjusted for the " +
      "offenses faced (lower = a better defense).",
    weakness:
      "Additive (no interaction terms), unweighted by play leverage/garbage-time, and assumes a " +
      "balanced-enough schedule to be identifiable — early-season samples are noisy. A derived signal, " +
      "not a play-level projection.",
    computedAt,
  };
}

function centerToZeroMean(m: Map<string, number>, teams: readonly string[]): void {
  if (teams.length === 0) return;
  const mean = teams.reduce((s, t) => s + (m.get(t) ?? 0), 0) / teams.length;
  for (const t of teams) m.set(t, (m.get(t) ?? 0) - mean);
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export function opponentAdjustedEpa(
  plays: readonly Play[],
  { iterations = 25, now = new Date() }: { iterations?: number; now?: Date } = {},
): OpponentAdjustedEpaResult {
  const teams = [...new Set(plays.flatMap((p) => [p.offense, p.defense]))].sort();
  const leagueMean = plays.length ? plays.reduce((s, p) => s + p.epa, 0) / plays.length : 0;

  const off = new Map<string, number>(teams.map((t) => [t, 0]));
  const def = new Map<string, number>(teams.map((t) => [t, 0]));

  // Pre-group once (avoid O(plays) scans inside the iteration loop).
  const byOffense = new Map<string, Play[]>(teams.map((t) => [t, []]));
  const byDefense = new Map<string, Play[]>(teams.map((t) => [t, []]));
  for (const p of plays) {
    byOffense.get(p.offense)?.push(p);
    byDefense.get(p.defense)?.push(p);
  }

  for (let i = 0; i < iterations; i++) {
    for (const t of teams) {
      const ps = byOffense.get(t) ?? [];
      if (ps.length === 0) continue;
      off.set(t, ps.reduce((s, p) => s + (p.epa - leagueMean - (def.get(p.defense) ?? 0)), 0) / ps.length);
    }
    centerToZeroMean(off, teams);
    for (const t of teams) {
      const ps = byDefense.get(t) ?? [];
      if (ps.length === 0) continue;
      def.set(t, ps.reduce((s, p) => s + (p.epa - leagueMean - (off.get(p.offense) ?? 0)), 0) / ps.length);
    }
    centerToZeroMean(def, teams);
  }

  const ratings = teams
    .map((t) => ({
      team: t,
      offAdj: round4(off.get(t) ?? 0),
      defAdj: round4(def.get(t) ?? 0),
      offPlays: (byOffense.get(t) ?? []).length,
      defPlays: (byDefense.get(t) ?? []).length,
    }))
    .sort((a, b) => b.offAdj - a.offAdj);

  return {
    ratings,
    leagueMeanEpa: round4(leagueMean),
    iterations,
    sampleSize: plays.length,
    provenance: provenance(now.toISOString()),
  };
}
