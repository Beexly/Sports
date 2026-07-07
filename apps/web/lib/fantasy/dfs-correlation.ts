/**
 * Correlation-aware Monte-Carlo scoring for GPP lineup selection.
 *
 * The core of LineStar's patented optimizer maximises a POINT-SUM
 * (Σ projected-value s.t. salary cap, US10,478,721 cl.1). Point-sum treats
 * players as independent — it ignores covariance, the shape of the outcome
 * distribution, and field ownership. But tournaments are won by realised
 * CEILING under CORRELATION: a QB and his pass-catcher boom together; an
 * offense and the opposing DST move in opposite directions; both teams in a
 * shootout rise together.
 *
 * This models those dependencies with a compact factor model, simulates each
 * candidate lineup thousands of times, and ranks by a tournament-upside score
 * instead of a static sum. Two lineups with identical Σ-projection can have very
 * different tournament value — the stacked one has the fatter right tail. A
 * point-sum optimizer is blind to that; this is not.
 *
 * Seeded (deterministic) and pure. Illustrative slate.
 */

import type { DfsPlayer } from "./dfs-slate";
import type { Lineup } from "./dfs-optimizer";

// ── seeded RNG (mulberry32) + Box–Muller normal ───────────────────────────────
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalPair(rng: () => number): [number, number] {
  // Box–Muller; u1 kept away from 0 to avoid log(0).
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

// ── factor-model loadings ─────────────────────────────────────────────────────
// Offense player outcome = proj + sd·( A_TEAM·teamZ + A_GAME·gameZ + idio·ε ).
// A same-team QB/WR share teamZ and gameZ (positive corr); an offense and the
// opposing DST share teamZ with OPPOSITE sign (negative corr); both offenses in
// one game share gameZ (shootout/bring-back correlation). Loadings keep total
// variance at 1 so `sd` stays the marginal standard deviation.
const A_TEAM = 0.5;
const A_GAME = 0.35;
const IDIO = Math.sqrt(Math.max(0, 1 - A_TEAM * A_TEAM - A_GAME * A_GAME));
const A_TEAM_DST = 0.45;
const A_GAME_DST = 0.3;
const IDIO_DST = Math.sqrt(Math.max(0, 1 - A_TEAM_DST * A_TEAM_DST - A_GAME_DST * A_GAME_DST));

/** Marginal std-dev from the floor/ceiling band (≈5th/95th pct → 3.29σ wide). */
export function playerSd(p: DfsPlayer): number {
  return Math.max((p.ceiling - p.floor) / 3.29, 1);
}

/** An unordered game key so both teams in a matchup share one game latent. */
const gameKey = (p: DfsPlayer): string => [p.team, p.opp].sort().join("@");

export type SimStats = {
  readonly mean: number;
  readonly p50: number;
  readonly p90: number; // correlated ceiling realisation
  readonly ceilEV: number; // expected score in the top quintile of outcomes
  readonly stdev: number;
  readonly score: number; // tournament score used for ranking
};

export type SimOpts = {
  readonly sims?: number;
  readonly seed?: number;
  /** How hard to penalise chalk (sum of ownership) in the tournament score. */
  readonly ownWeight?: number;
};

/**
 * Simulate a set of lineups jointly under the factor model (so shared latents
 * couple players correctly WITHIN and ACROSS lineups) and return per-lineup
 * stats. The same team/game draws are reused across all lineups in a sim, which
 * is what makes cross-lineup comparison fair.
 */
export function simulateLineups(lineups: readonly Lineup[], opts: SimOpts = {}): SimStats[] {
  const sims = opts.sims ?? 2000;
  const seed = opts.seed ?? 42;
  const ownWeight = opts.ownWeight ?? 0.12;
  const rng = mulberry32(seed);

  // Union of teams / games across all lineups.
  const teams = new Set<string>();
  const games = new Set<string>();
  for (const lu of lineups) for (const p of lu) { teams.add(p.team); games.add(gameKey(p)); }

  const totals: number[][] = lineups.map(() => new Array<number>(sims));

  for (let s = 0; s < sims; s++) {
    // Draw shared latents for this sim.
    const teamZ = new Map<string, number>();
    const gameZ = new Map<string, number>();
    // pull normals two-at-a-time
    let spare: number | null = null;
    const nextZ = (): number => {
      if (spare !== null) { const v = spare; spare = null; return v; }
      const [a, b] = normalPair(rng);
      spare = b;
      return a;
    };
    for (const t of teams) teamZ.set(t, nextZ());
    for (const g of games) gameZ.set(g, nextZ());

    for (let li = 0; li < lineups.length; li++) {
      const lu = lineups[li]!;
      let total = 0;
      for (const p of lu) {
        const sd = playerSd(p);
        const gz = gameZ.get(gameKey(p))!;
        const eps = nextZ();
        let pts: number;
        if (p.pos === "DST") {
          // DST rises when its OPPONENT's offense falls, and in low-total games.
          const oppZ = teamZ.get(p.opp) ?? 0;
          pts = p.proj + sd * (-A_TEAM_DST * oppZ - A_GAME_DST * gz + IDIO_DST * eps);
        } else {
          const tz = teamZ.get(p.team)!;
          pts = p.proj + sd * (A_TEAM * tz + A_GAME * gz + IDIO * eps);
        }
        total += Math.max(0, pts);
      }
      totals[li]![s] = total;
    }
  }

  return lineups.map((lu, li) => {
    const arr = totals[li]!.slice().sort((a, b) => a - b);
    const mean = arr.reduce((x, y) => x + y, 0) / arr.length;
    const q = (f: number) => arr[Math.min(arr.length - 1, Math.floor(f * arr.length))]!;
    const variance = arr.reduce((x, y) => x + (y - mean) * (y - mean), 0) / arr.length;
    // Upper-tail expectation: the average of the top quintile of outcomes — the
    // number that actually correlates with cashing a top-heavy GPP.
    const cut = Math.floor(0.8 * arr.length);
    const tail = arr.slice(cut);
    const ceilEV = tail.reduce((x, y) => x + y, 0) / tail.length;
    const totalOwn = lu.reduce((s2, p) => s2 + p.own * 100, 0);
    const score = ceilEV - ownWeight * totalOwn;
    return {
      mean: round1(mean),
      p50: round1(q(0.5)),
      p90: round1(q(0.9)),
      ceilEV: round1(ceilEV),
      stdev: round1(Math.sqrt(variance)),
      score: round1(score),
    };
  });
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export type ScoredLineup = { readonly players: Lineup; readonly sim: SimStats };

/**
 * Rank candidate lineups by correlated tournament upside (highest `score`
 * first). This is the selection step a point-sum optimizer cannot do: it turns a
 * pool of cap-legal lineups into a ranked slate by SIMULATED ceiling under
 * correlation and ownership leverage — not by a static projection sum.
 */
export function rankByTournamentScore(candidates: readonly Lineup[], opts: SimOpts = {}): ScoredLineup[] {
  if (!candidates.length) return [];
  const stats = simulateLineups(candidates, opts);
  return candidates
    .map((players, i) => ({ players, sim: stats[i]! }))
    .sort((a, b) => b.sim.score - a.sim.score);
}
