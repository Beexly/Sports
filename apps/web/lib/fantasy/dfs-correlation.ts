/**
 * Correlation-aware Monte-Carlo scoring for GPP lineup selection.
 *
 * The core of LineStar's patented optimizer maximises a POINT-SUM
 * (Σ projected-value s.t. salary cap, US10,478,721 cl.1). Point-sum treats
 * players as independent — it ignores covariance, the outcome distribution, and
 * field ownership. Tournaments are won by realised CEILING under CORRELATION.
 *
 * v2 uses a POSITION-AWARE factor model, not a single blanket loading:
 *   • QB ↔ same-team WR/TE — strong positive (they score together).
 *   • QB ↔ same-team RB     — weak positive (RB leans on game script, not the QB).
 *   • both offenses, one game — positive via a shared game (shootout / bring-back).
 *   • offense ↔ opposing DST — negative (a DST booms when it stops that offense).
 * Each player's marginal outcome is drawn from its floor/ceiling band; the
 * loadings shape the JOINT distribution. It then scores lineups by top-quintile
 * ceiling EV, adjusted for ownership leverage and duplication risk.
 *
 * Seeded (deterministic) and pure. Illustrative slate.
 */

import type { DfsPlayer, DfsPos } from "./dfs-slate";
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
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

// ── position-aware factor loadings ────────────────────────────────────────────
// Offense: points = proj + sd·( TEAM_LOAD[pos]·teamZ + GAME_LOAD[pos]·gameZ + idio·ε ).
// DST is modelled against the OPPOSING offense (negative team + negative game).
// Loadings are kept so team²+game² ≤ 1 → `sd` stays the marginal std-dev.
const TEAM_LOAD: Record<DfsPos, number> = { QB: 0.55, WR: 0.5, TE: 0.42, RB: 0.28, DST: 0 };
const GAME_LOAD: Record<DfsPos, number> = { QB: 0.35, WR: 0.35, TE: 0.3, RB: 0.18, DST: 0 };
const DST_OPP_LOAD = 0.45; // DST vs opposing team offense (applied negative)
const DST_GAME_LOAD = 0.3; // DST vs game total (applied negative)

const idioLoad = (pos: DfsPos): number => {
  if (pos === "DST") return Math.sqrt(Math.max(0, 1 - DST_OPP_LOAD ** 2 - DST_GAME_LOAD ** 2));
  return Math.sqrt(Math.max(0, 1 - TEAM_LOAD[pos] ** 2 - GAME_LOAD[pos] ** 2));
};

/** Marginal std-dev from the floor/ceiling band (≈5th/95th pct → 3.29σ wide). */
export function playerSd(p: DfsPlayer): number {
  return Math.max((p.ceiling - p.floor) / 3.29, 1);
}

const gameKey = (p: DfsPlayer): string => [p.team, p.opp].sort().join("@");

export type SimStats = {
  readonly mean: number;
  readonly p50: number;
  readonly p90: number; // correlated ceiling realisation
  readonly ceilEV: number; // expected score in the top quintile of outcomes
  readonly stdev: number;
  readonly dupRisk: number; // 0..1 chalk/duplication proxy (higher = more duplicated)
  readonly score: number; // tournament score used for ranking
};

export type SimOpts = {
  readonly sims?: number;
  readonly seed?: number;
  readonly ownWeight?: number; // penalty on total ownership (chalk)
  readonly dupWeight?: number; // penalty on duplication risk
};

/** Chalk/duplication proxy: the more high-owned players, the more likely the
 *  field fields your exact lineup. Geometric mean of ownership, normalised. */
export function duplicationRisk(lu: Lineup): number {
  if (!lu.length) return 0;
  const logs = lu.reduce((s, p) => s + Math.log(Math.min(Math.max(p.own, 0.005), 0.6)), 0);
  const geo = Math.exp(logs / lu.length); // geometric-mean ownership
  // map geo-mean ownership (~0.02..0.25 realistic) to 0..1
  return Math.min(1, Math.max(0, (geo - 0.02) / 0.23));
}

export function simulateLineups(lineups: readonly Lineup[], opts: SimOpts = {}): SimStats[] {
  const sims = opts.sims ?? 2000;
  const seed = opts.seed ?? 42;
  const ownWeight = opts.ownWeight ?? 0.1;
  const dupWeight = opts.dupWeight ?? 6;
  const rng = mulberry32(seed);

  const teams = new Set<string>();
  const games = new Set<string>();
  for (const lu of lineups) for (const p of lu) { teams.add(p.team); games.add(gameKey(p)); }

  const totals: number[][] = lineups.map(() => new Array<number>(sims));

  for (let s = 0; s < sims; s++) {
    const teamZ = new Map<string, number>();
    const gameZ = new Map<string, number>();
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
          const oppZ = teamZ.get(p.opp) ?? 0;
          pts = p.proj + sd * (-DST_OPP_LOAD * oppZ - DST_GAME_LOAD * gz + idioLoad("DST") * eps);
        } else {
          const tz = teamZ.get(p.team)!;
          pts = p.proj + sd * (TEAM_LOAD[p.pos] * tz + GAME_LOAD[p.pos] * gz + idioLoad(p.pos) * eps);
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
    const cut = Math.floor(0.8 * arr.length);
    const tail = arr.slice(cut);
    const ceilEV = tail.reduce((x, y) => x + y, 0) / tail.length;
    const totalOwn = lu.reduce((s2, p) => s2 + p.own * 100, 0);
    const dupRisk = duplicationRisk(lu);
    const score = ceilEV - ownWeight * totalOwn - dupWeight * dupRisk;
    return {
      mean: round1(mean),
      p50: round1(q(0.5)),
      p90: round1(q(0.9)),
      ceilEV: round1(ceilEV),
      stdev: round1(Math.sqrt(variance)),
      dupRisk: round2(dupRisk),
      score: round1(score),
    };
  });
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

export type ScoredLineup = { readonly players: Lineup; readonly sim: SimStats };

export function rankByTournamentScore(candidates: readonly Lineup[], opts: SimOpts = {}): ScoredLineup[] {
  if (!candidates.length) return [];
  const stats = simulateLineups(candidates, opts);
  return candidates
    .map((players, i) => ({ players, sim: stats[i]! }))
    .sort((a, b) => b.sim.score - a.sim.score);
}
