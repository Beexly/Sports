/**
 * DFS Optimizer engine — salary-cap lineup optimization, glass-box.
 *
 * Beats a black-box optimizer on three axes: (1) it optimises for the right
 * objective (cash=projection, GPP=ceiling, leverage=contrarian ceiling vs.
 * ownership), (2) it builds many UNIQUE lineups with real exposure control and
 * stacking, and (3) every lineup ships with the WHY — salary, stack, total
 * ownership, and a leverage score. Randomized multi-start + steepest-ascent
 * hill-climb; fast enough to run in the browser. Illustrative slate.
 */

import { DFS_SLOTS, SALARY_CAP, leverage, type DfsPlayer, type DfsPos } from "./dfs-slate";
import { activeDfsSlate } from "@/lib/integrations/dfs";

export type Mode = "cash" | "gpp" | "leverage";
export type OptOpts = {
  readonly mode: Mode;
  readonly stack: boolean;
  readonly locks: ReadonlySet<string>;
  readonly excludes: ReadonlySet<string>;
};

const FLEX_POS: DfsPos[] = ["RB", "WR", "TE"];
export const eligible = (p: DfsPlayer, slot: DfsPos | "FLEX"): boolean =>
  slot === "FLEX" ? FLEX_POS.includes(p.pos) : p.pos === slot;

/** The per-player objective value for a mode. Additive across a lineup — shared
 *  by the heuristic and the exact optimizer so they optimise the same target. */
export function objVal(p: DfsPlayer, mode: Mode): number {
  if (mode === "cash") return p.proj;
  if (mode === "gpp") return p.ceiling;
  return leverage(p) * 6 + p.ceiling * 0.45; // leverage: contrarian ceiling
}

export type Lineup = readonly DfsPlayer[];

export const salaryOf = (lu: Lineup) => lu.reduce((s, p) => s + p.salary, 0);
export const objOf = (lu: Lineup, mode: Mode) => lu.reduce((s, p) => s + objVal(p, mode), 0);

function qbStackCount(lu: Lineup): { team: string | null; stacked: number } {
  const qb = lu.find((p) => p.pos === "QB");
  if (!qb) return { team: null, stacked: 0 };
  const stacked = lu.filter((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
  return { team: qb.team, stacked };
}

function buildRandom(pool: readonly DfsPlayer[], opts: OptOpts, pen: (p: DfsPlayer) => number): DfsPlayer[] | null {
  const cand = pool.filter((p) => !opts.excludes.has(p.id));
  if (!cand.length) return null;
  const minSal = Math.min(...cand.map((p) => p.salary));
  const lineup: (DfsPlayer | null)[] = DFS_SLOTS.map(() => null);
  const used = new Set<string>();

  for (const id of opts.locks) {
    const pl = cand.find((p) => p.id === id);
    if (!pl || used.has(id)) continue;
    const slot = DFS_SLOTS.findIndex((s, i) => lineup[i] === null && eligible(pl, s));
    if (slot < 0) return null;
    lineup[slot] = pl; used.add(id);
  }

  for (let i = 0; i < DFS_SLOTS.length; i++) {
    if (lineup[i]) continue;
    const slot = DFS_SLOTS[i]!;
    const capUsed = lineup.reduce((s, p) => s + (p?.salary ?? 0), 0);
    const slotsAfter = lineup.filter((p, j) => j > i && p === null).length;
    const maxSpend = SALARY_CAP - capUsed - minSal * slotsAfter;
    const options = cand
      .filter((p) => !used.has(p.id) && eligible(p, slot) && p.salary <= maxSpend)
      .sort((a, b) => objVal(b, opts.mode) - pen(b) - (objVal(a, opts.mode) - pen(a)));
    if (!options.length) return null;
    const k = Math.min(5, options.length);
    const pick = options[Math.floor(Math.random() * k)]!;
    lineup[i] = pick; used.add(pick.id);
  }
  return lineup as DfsPlayer[];
}

function hillClimb(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] {
  const cand = pool.filter((p) => !opts.excludes.has(p.id));
  const cur = [...lu];
  let improving = true;
  let guard = 0;
  while (improving && guard++ < 40) {
    improving = false;
    let bestGain = 0;
    let bestSwap: { i: number; p: DfsPlayer } | null = null;
    for (let i = 0; i < DFS_SLOTS.length; i++) {
      if (opts.locks.has(cur[i]!.id)) continue;
      const slot = DFS_SLOTS[i]!;
      const inLineup = new Set(cur.map((p) => p.id));
      for (const c of cand) {
        if (inLineup.has(c.id) || !eligible(c, slot)) continue;
        const next = [...cur]; next[i] = c;
        if (salaryOf(next) > SALARY_CAP) continue;
        const gain = objOf(next, opts.mode) - objOf(cur, opts.mode);
        if (gain > bestGain) { bestGain = gain; bestSwap = { i, p: c }; }
      }
    }
    if (bestSwap) { cur[bestSwap.i] = bestSwap.p; improving = true; }
  }
  return cur;
}

/** Try to add a same-team WR/TE for the lineup's current QB. Returns null if impossible. */
function stackToQb(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] | null {
  const qb = lu.find((p) => p.pos === "QB");
  if (!qb) return null;
  const cand = pool
    .filter((p) => !opts.excludes.has(p.id) && p.team === qb.team && (p.pos === "WR" || p.pos === "TE"))
    .sort((a, b) => objVal(b, opts.mode) - objVal(a, opts.mode));
  if (!cand.length) return null;
  const inLineup = new Set(lu.map((p) => p.id));
  const swappable = lu
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (p.pos === "WR" || p.pos === "TE") && !opts.locks.has(p.id))
    .sort((a, b) => objVal(a.p, opts.mode) - objVal(b.p, opts.mode));
  for (const { i } of swappable) {
    for (const c of cand) {
      if (inLineup.has(c.id)) continue;
      const next = [...lu]; next[i] = c;
      if (salaryOf(next) <= SALARY_CAP && DFS_SLOTS.every((s, j) => eligible(next[j]!, s))) return next;
    }
  }
  return null;
}

function enforceStack(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] {
  if (qbStackCount(lu).stacked >= 1) return lu;

  // 1) try to stack a pass-catcher onto the current QB
  const stacked = stackToQb(lu, pool, opts);
  if (stacked) return stacked;

  // 2) fallback: the QB has no available pass-catcher. If the QB isn't locked,
  //    swap in the best stackable QB (one with same-team catchers) and stack that.
  const qbIdx = DFS_SLOTS.indexOf("QB");
  if (qbIdx < 0 || opts.locks.has(lu[qbIdx]!.id)) return lu;
  const inLineup = new Set(lu.map((p) => p.id));
  const altQbs = pool
    .filter((p) => p.pos === "QB" && !opts.excludes.has(p.id) && !inLineup.has(p.id))
    .filter((q) => pool.some((c) => c.team === q.team && (c.pos === "WR" || c.pos === "TE") && !opts.excludes.has(c.id)))
    .sort((a, b) => objVal(b, opts.mode) - objVal(a, opts.mode));
  for (const q of altQbs) {
    const swapped = [...lu]; swapped[qbIdx] = q;
    if (salaryOf(swapped) > SALARY_CAP) continue;
    const done = stackToQb(swapped, pool, opts);
    if (done) return done;
  }
  return lu;
}

export function optimizeOne(opts: OptOpts, pen: (p: DfsPlayer) => number = () => 0, restarts = 60, slate: readonly DfsPlayer[] = activeDfsSlate()): DfsPlayer[] | null {
  let best: DfsPlayer[] | null = null;
  let bestObj = -Infinity;
  for (let r = 0; r < restarts; r++) {
    let lu = buildRandom(slate, opts, pen);
    if (!lu) continue;
    lu = hillClimb(lu, slate, opts);
    if (opts.stack) lu = enforceStack(lu, slate, opts);
    if (salaryOf(lu) > SALARY_CAP) continue;
    const o = objOf(lu, opts.mode);
    if (o > bestObj) { bestObj = o; best = lu; }
  }
  return best;
}

export type LineupMetrics = {
  readonly salary: number;
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly totalOwn: number; // sum of ownership points
  readonly leverageScore: number; // avg leverage
  readonly stackTeam: string | null;
  readonly stacked: number;
};

export function metrics(lu: Lineup): LineupMetrics {
  const { team, stacked } = qbStackCount(lu);
  return {
    salary: salaryOf(lu),
    proj: Math.round(lu.reduce((s, p) => s + p.proj, 0) * 10) / 10,
    floor: Math.round(lu.reduce((s, p) => s + p.floor, 0)),
    ceiling: Math.round(lu.reduce((s, p) => s + p.ceiling, 0)),
    totalOwn: Math.round(lu.reduce((s, p) => s + p.own * 100, 0)),
    leverageScore: Math.round((lu.reduce((s, p) => s + leverage(p), 0) / lu.length) * 100) / 100,
    stackTeam: team,
    stacked,
  };
}

export type GenResult = {
  readonly lineups: ReadonlyArray<{ players: Lineup; metrics: LineupMetrics }>;
  readonly exposure: ReadonlyArray<{ id: string; name: string; pos: DfsPos; count: number; pct: number }>;
};

/** Generate N unique lineups with exposure control. */
export function generateLineups(opts: OptOpts, count: number, maxExposure = 0.6, slate: readonly DfsPlayer[] = activeDfsSlate()): GenResult {
  const usage = new Map<string, number>();
  const seen = new Set<string>();
  const lineups: { players: Lineup; metrics: LineupMetrics }[] = [];

  const key = (lu: Lineup) => lu.map((p) => p.id).sort().join(",");

  for (let n = 0; n < count; n++) {
    // hard exclude players at max exposure
    const overexposed = new Set<string>();
    for (const [id, c] of usage) if (c / count >= maxExposure) overexposed.add(id);
    const dynOpts: OptOpts = { ...opts, excludes: new Set([...opts.excludes, ...overexposed]) };
    const pen = (p: DfsPlayer) => ((usage.get(p.id) ?? 0) / Math.max(1, n)) * 9; // soft diversity penalty

    let lu: DfsPlayer[] | null = null;
    for (let tries = 0; tries < 6; tries++) {
      const c = optimizeOne(dynOpts, pen, 40, slate);
      if (c && !seen.has(key(c))) { lu = c; break; }
      if (c && tries === 5) lu = c; // accept dup as last resort
    }
    if (!lu) break;
    seen.add(key(lu));
    lineups.push({ players: lu, metrics: metrics(lu) });
    for (const p of lu) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
  }

  const byId = new Map(slate.map((p) => [p.id, p]));
  const exposure = [...usage.entries()]
    .map(([id, c]) => {
      const p = byId.get(id)!;
      return { id, name: p.name, pos: p.pos, count: c, pct: Math.round((c / Math.max(1, lineups.length)) * 100) };
    })
    .sort((a, b) => b.count - a.count);

  return { lineups, exposure };
}
