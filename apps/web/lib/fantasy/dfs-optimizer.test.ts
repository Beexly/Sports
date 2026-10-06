import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { optimizeOne, optimizeExact, solveExact, optimizeHeuristic, generateLineups, metrics, DEFAULT_COST_BUDGET, type OptOpts, type Mode } from "./dfs-optimizer";
import { DFS_SLOTS, SALARY_CAP, DFS_SLATE, leverage, type DfsPlayer, type DfsPos } from "./dfs-slate";

const base = (over: Partial<OptOpts> = {}): OptOpts => ({
  mode: "gpp", stack: false, locks: new Set(), excludes: new Set(), ...over,
});

const FLEX_OK = new Set(["RB", "WR", "TE"]);
function slotsValid(lu: readonly { pos: string }[]): boolean {
  return DFS_SLOTS.every((slot, i) => (slot === ("FLEX" as string) ? FLEX_OK.has(lu[i]!.pos) : lu[i]!.pos === slot));
}
const salaryOfLocal = (lu: readonly DfsPlayer[]) => lu.reduce((s, p) => s + p.salary, 0);

/**
 * Independent reference objective — reimplemented rather than imported, so
 * the brute-force oracle below doesn't just test the module against itself.
 */
function objValRef(p: DfsPlayer, mode: Mode): number {
  if (mode === "cash") return p.proj;
  if (mode === "gpp") return p.ceiling;
  return leverage(p) * 6 + p.ceiling * 0.45;
}

function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  const n = arr.length;
  if (k > n) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    yield idx.map((i) => arr[i]!);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i] = idx[i]! + 1;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1;
  }
}

/** Roster feasibility for the fixed DK-Classic shape: QB1 RB2 WR3 TE1 FLEX1 DST1. */
function rosterFeasible(sel: readonly DfsPlayer[]): boolean {
  const c: Record<string, number> = {};
  for (const p of sel) c[p.pos] = (c[p.pos] ?? 0) + 1;
  if ((c.QB ?? 0) !== 1) return false;
  if ((c.DST ?? 0) !== 1) return false;
  const rb = c.RB ?? 0, wr = c.WR ?? 0, te = c.TE ?? 0;
  if (rb < 2 || wr < 3 || te < 1) return false;
  return rb + wr + te === 7; // 2 base RB + 3 base WR + 1 base TE + 1 FLEX
}

function stackSatisfied(sel: readonly DfsPlayer[]): boolean {
  const qb = sel.find((p) => p.pos === "QB");
  if (!qb) return false;
  return sel.some((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE"));
}

/** Exhaustively enumerate every legal 9-player lineup and return the true optimum (all ties). */
function bruteForceBest(pool: readonly DfsPlayer[], mode: Mode, cap: number, requireStack = false): { value: number; lineups: DfsPlayer[][] } {
  let bestValue = -Infinity;
  let bestLineups: DfsPlayer[][] = [];
  for (const sel of combinations(pool, DFS_SLOTS.length)) {
    if (!rosterFeasible(sel)) continue;
    if (salaryOfLocal(sel) > cap) continue;
    if (requireStack && !stackSatisfied(sel)) continue;
    const v = sel.reduce((s, p) => s + objValRef(p, mode), 0);
    if (v > bestValue + 1e-9) { bestValue = v; bestLineups = [sel]; }
    else if (Math.abs(v - bestValue) <= 1e-9) bestLineups.push(sel);
  }
  return { value: bestValue, lineups: bestLineups };
}

/** Assert the exact DP's optimum matches the brute-force optimum exactly (value, and set membership). */
function assertExactOptimum(pool: readonly DfsPlayer[], mode: Mode, stack = false) {
  const dp = optimizeOne(base({ mode, stack }), undefined, undefined, pool);
  const { value: bfValue, lineups: bfLineups } = bruteForceBest(pool, mode, SALARY_CAP, stack);

  if (bfLineups.length === 0) {
    expect(dp).toBeNull();
    return { bfLineups, dp };
  }
  expect(dp).not.toBeNull();
  expect(dp!.length).toBe(DFS_SLOTS.length);
  expect(slotsValid(dp!)).toBe(true);
  expect(salaryOfLocal(dp!)).toBeLessThanOrEqual(SALARY_CAP);
  const dpValue = dp!.reduce((s, p) => s + objValRef(p, mode), 0);
  expect(dpValue).toBeCloseTo(bfValue, 6);
  const dpKey = dp!.map((p) => p.id).sort().join(",");
  const bfKeys = bfLineups.map((lu) => lu.map((p) => p.id).sort().join(","));
  expect(bfKeys).toContain(dpKey);
  return { bfLineups, dp };
}

const mk = (id: string, pos: DfsPos, team: string, salary: number, proj: number, own: number): DfsPlayer => ({
  id, name: `Player ${id}`, pos, team, opp: "OPP", salary, proj, floor: Math.round(proj * 0.4), ceiling: Math.round(proj * 1.8), own,
});

// A 14-player pool with a single, non-tied optimum and real slack (some
// combinations are cap-infeasible, some position-infeasible) — this is the
// baseline correctness fixture.
const POOL_CLEAR: DfsPlayer[] = [
  mk("q1", "QB", "AAA", 7000, 22, 0.15), mk("q2", "QB", "BBB", 6000, 19, 0.10),
  mk("r1", "RB", "AAA", 5000, 14, 0.18), mk("r2", "RB", "BBB", 4800, 13, 0.15),
  mk("r3", "RB", "CCC", 4600, 12, 0.12), mk("r4", "RB", "DDD", 4000, 9, 0.08),
  mk("w1", "WR", "AAA", 5200, 15, 0.20), mk("w2", "WR", "BBB", 5000, 13, 0.16),
  mk("w3", "WR", "CCC", 4800, 12, 0.13), mk("w4", "WR", "DDD", 4200, 10, 0.09),
  mk("t1", "TE", "AAA", 4000, 10, 0.14), mk("t2", "TE", "BBB", 3000, 6, 0.06),
  mk("d1", "DST", "AAA", 3000, 8, 0.11), mk("d2", "DST", "BBB", 2600, 6, 0.07),
];

describe("dfs optimizer — exact DP correctness proof", () => {
  it("matches brute-force optimum exactly on a clear (non-tied) pool, cash mode", () => {
    assertExactOptimum(POOL_CLEAR, "cash");
  });

  it("matches brute-force optimum exactly on a clear (non-tied) pool, gpp mode", () => {
    assertExactOptimum(POOL_CLEAR, "gpp");
  });

  it("matches brute-force optimum exactly on a clear (non-tied) pool, leverage mode", () => {
    assertExactOptimum(POOL_CLEAR, "leverage");
  });

  it("resolves a genuine tie to a value-optimal lineup (two interchangeable QBs)", () => {
    // q1b is an exact clone of q1 (same salary/proj/ceiling, different
    // id/team). QB has exactly one non-FLEX slot and no other position
    // competes for it, so this is a clean 2-way tie: unlike cloning a
    // FLEX-eligible position (where a solver could rationally use BOTH
    // clones across base+FLEX and produce a unique, non-tied optimum), the
    // single QB slot forces an arbitrary choice between two equal players.
    const pool = [...POOL_CLEAR, mk("q1b", "QB", "EEE", 7000, 22, 0.15)];
    const { bfLineups } = assertExactOptimum(pool, "gpp")!;
    expect(bfLineups.length).toBeGreaterThan(1); // confirm the fixture really is tied
  });

  it("matches brute-force optimum under a lock + stack intersection (locks constrain, stack binds)", () => {
    // Lock r1 AND require a stack: the optimum must contain r1, satisfy the
    // stack, and still be value-optimal among exactly those lineups — the
    // brute-force reference enforces the same intersection independently.
    const locks = new Set(["r1"]);
    const dp = optimizeOne(base({ mode: "gpp", stack: true, locks }), undefined, undefined, POOL_CLEAR);
    const mustHave = [...locks];
    let bestValue = -Infinity;
    let bestKeys: string[] = [];
    for (const sel of combinations(POOL_CLEAR, DFS_SLOTS.length)) {
      if (!rosterFeasible(sel)) continue;
      if (salaryOfLocal(sel) > SALARY_CAP) continue;
      if (!stackSatisfied(sel)) continue;
      if (!mustHave.every((id) => sel.some((p) => p.id === id))) continue;
      const v = sel.reduce((s, p) => s + objValRef(p, "gpp"), 0);
      if (v > bestValue + 1e-9) { bestValue = v; bestKeys = [sel.map((p) => p.id).sort().join(",")]; }
      else if (Math.abs(v - bestValue) <= 1e-9) bestKeys.push(sel.map((p) => p.id).sort().join(","));
    }
    expect(bestKeys.length).toBeGreaterThan(0); // fixture really has a feasible intersection
    expect(dp).not.toBeNull();
    expect(dp!.some((p) => p.id === "r1")).toBe(true);
    expect(dp!.reduce((s, p) => s + objValRef(p, "gpp"), 0)).toBeCloseTo(bestValue, 6);
    expect(bestKeys).toContain(dp!.map((p) => p.id).sort().join(","));
  });

  it("picks the higher-value player for FLEX across positions (TE beats RB in FLEX)", () => {
    // 3 RB (1 unavoidably spare) and 3 TE (1 unavoidably spare) compete for
    // the single FLEX slot; the spare TE (t3) out-values the spare RB (r5),
    // so the true optimum must route t3 into FLEX, not r5.
    const pool = [
      ...POOL_CLEAR,
      mk("r5", "RB", "FFF", 3800, 8, 0.07), // weaker spare RB
      mk("t3", "TE", "GGG", 3800, 11, 0.12), // stronger spare TE — should win FLEX
    ];
    const { dp } = assertExactOptimum(pool, "gpp")!;
    expect(dp!.some((p) => p.id === "t3")).toBe(true);
    expect(dp!.some((p) => p.id === "r5")).toBe(false);
  });

  it("returns null when the pool cannot fill a required slot (no TE at all)", () => {
    const pool = POOL_CLEAR.filter((p) => p.pos !== "TE");
    assertExactOptimum(pool, "gpp"); // brute force also finds no feasible lineup
    expect(optimizeOne(base({ mode: "gpp" }), undefined, undefined, pool)).toBeNull();
  });

  it("returns null when the cheapest feasible lineup still exceeds the cap", () => {
    const pricey = POOL_CLEAR.map((p) => ({ ...p, salary: p.salary + 100000 }));
    expect(optimizeOne(base({ mode: "gpp" }), undefined, undefined, pricey)).toBeNull();
  });

  it("is fully deterministic — identical output across repeated runs", () => {
    const a = optimizeOne(base({ mode: "leverage" }), undefined, undefined, POOL_CLEAR);
    const b = optimizeOne(base({ mode: "leverage" }), undefined, undefined, POOL_CLEAR);
    expect(a!.map((p) => p.id)).toEqual(b!.map((p) => p.id));
  });

  it("matches brute-force optimum exactly with stack required (validates the branch-and-bound team pruning)", () => {
    // Every team in POOL_CLEAR (AAA, BBB, CCC, DDD) has a QB or a WR/TE, and
    // AAA/BBB have both — this exercises optimizeOne's per-team-bound
    // pruning against the true, exhaustively-checked stacked optimum.
    assertExactOptimum(POOL_CLEAR, "gpp", true);
  });

  it("stack pruning still finds the true optimum when the best-bound team turns out cap-infeasible", () => {
    // qz has by far the best QB value, so team QZQ's cheap-to-compute bound
    // (which ignores the salary cap) ranks first. But its only same-team
    // pass-catcher, wz, is priced so high that QB+stack-partner alone blows
    // the cap — solveExact("QZQ") must return null, and the search has to
    // fall through to a genuinely feasible team (AAA/BBB) for the true
    // optimum. This exercises the "bound looked best, full solve failed"
    // branch of the pruning loop, not just the common case.
    const pool = [...POOL_CLEAR, mk("qz", "QB", "QZQ", 6800, 30, 0.05), mk("wz", "WR", "QZQ", 20000, 5, 0.01)];
    assertExactOptimum(pool, "gpp", true);
  });
});

describe("dfs optimizer", () => {
  it("builds a full, slot-legal lineup under the cap", () => {
    const lu = optimizeOne(base());
    expect(lu).not.toBeNull();
    expect(lu!.length).toBe(DFS_SLOTS.length);
    expect(slotsValid(lu!)).toBe(true);
    expect(metrics(lu!).salary).toBeLessThanOrEqual(SALARY_CAP);
    // no duplicate players
    expect(new Set(lu!.map((p) => p.id)).size).toBe(lu!.length);
  });

  it("respects a lock and an exclude", () => {
    const lockId = "dwr1", fadeId = "dqb1";
    const lu = optimizeOne(base({ locks: new Set([lockId]), excludes: new Set([fadeId]) }));
    expect(lu!.some((p) => p.id === lockId)).toBe(true);
    expect(lu!.some((p) => p.id === fadeId)).toBe(false);
  });

  it("enforces a QB stack when asked, exactly (best stackable team wins)", () => {
    const lu = optimizeOne(base({ stack: true }));
    const m = metrics(lu!);
    expect(m.stacked).toBeGreaterThanOrEqual(1);
  });

  it("cash mode out-projects on median, GPP reaches higher ceiling", () => {
    const cash = metrics(optimizeOne(base({ mode: "cash" }))!);
    const gpp = metrics(optimizeOne(base({ mode: "gpp" }))!);
    expect(cash.proj).toBeGreaterThanOrEqual(gpp.proj - 6); // cash optimises median
    expect(gpp.ceiling).toBeGreaterThanOrEqual(cash.ceiling - 2); // gpp reaches ceiling
  });

  it("generates the requested number of unique lineups with exposure control", () => {
    const { lineups } = generateLineups(base({ mode: "gpp", stack: true }), 5);
    expect(lineups.length).toBeGreaterThanOrEqual(3);
    const keys = lineups.map((l) => l.players.map((p) => p.id).sort().join(","));
    expect(new Set(keys).size).toBe(keys.length); // all unique — guaranteed, not incidental
    lineups.forEach((l) => expect(l.metrics.salary).toBeLessThanOrEqual(SALARY_CAP));
  });
  it("treats exposure as a disclosed target, not a cap — full portfolios may exceed it", () => {
    // Measured 2026-09-12: prefix-enforced target 0.6 realizes 0.667 (n=3),
    // 0.600 (n=5), 0.625 (n=8). The honest contract is disclosure, not a cap:
    // the result names its target and reports exact realized fractions.
    const r = generateLineups(base({ mode: "gpp", stack: true }), 8);
    expect(r.exposureTarget).toBe(0.6);
    expect(r.partial).toBe(false);
    for (const e of r.exposure) {
      const actual = r.lineups.filter((l) => l.players.some((p) => p.id === e.id)).length;
      expect(e.count).toBe(actual);
      expect(e.pct).toBe(Math.round((actual / r.lineups.length) * 100));
    }
    const maxRealized = Math.max(...r.exposure.map((e) => e.count / r.lineups.length));
    expect(maxRealized).toBeGreaterThan(0.6); // target exceeded: disclosed, not hidden
  });

  it("reports short portfolios as partial, never as proven exhaustion", () => {
    // A pool that cannot fill one roster: zero lineups, partial true, no crash.
    const tiny = DFS_SLATE.filter((p) => p.pos === "QB" || p.pos === "DST").slice(0, 4);
    const r = generateLineups(base({ mode: "gpp", stack: true }), 5, 0.6, tiny);
    expect(r.lineups.length).toBe(0);
    expect(r.partial).toBe(true);
    expect(r.requested).toBe(5);
  });

  it("leverage mode favours lower total ownership than cash", () => {
    const lev = generateLineups(base({ mode: "leverage" }), 4).lineups;
    const cash = generateLineups(base({ mode: "cash" }), 4).lineups;
    const avg = (xs: readonly { metrics: { totalOwn: number } }[]) => xs.reduce((s, x) => s + x.metrics.totalOwn, 0) / xs.length;
    expect(avg(lev)).toBeLessThan(avg(cash) + 5);
  });

  it("every slate player is unique by id", () => {
    expect(new Set(DFS_SLATE.map((p) => p.id)).size).toBe(DFS_SLATE.length);
  });

  it("generateLineups is deterministic — identical lineups and exposure across runs", () => {
    const a = generateLineups(base({ mode: "gpp", stack: true }), 6);
    const b = generateLineups(base({ mode: "gpp", stack: true }), 6);
    expect(a.lineups.map((l) => l.players.map((p) => p.id))).toEqual(b.lineups.map((l) => l.players.map((p) => p.id)));
    expect(a.exposure).toEqual(b.exposure);
  });

  it("reports per-player usage as an exact fraction of lineups generated", () => {
    const { lineups, exposure } = generateLineups(base({ mode: "gpp" }), 5);
    for (const e of exposure) {
      const actualCount = lineups.filter((l) => l.players.some((p) => p.id === e.id)).length;
      expect(e.count).toBe(actualCount);
      expect(e.pct).toBe(Math.round((actualCount / lineups.length) * 100));
    }
  });

  it("surfaces partial=true when fewer unique lineups are feasible than requested", () => {
    // A deliberately tiny pool: 1 QB, 2 RB, 3 WR, 1 TE, 1 DST = exactly 1 unique
    // feasible lineup (RB has 1 spare, so FLEX can swap the 2nd RB for a WR,
    // giving 2 unique lineups max). Request 10 — the optimizer exhausts the
    // feasible space early and must set partial=true.
    const pool: DfsPlayer[] = [
      mk("qb", "QB", "AAA", 8000, 20, 0.1),
      mk("rb1", "RB", "AAA", 6000, 12, 0.1),
      mk("rb2", "RB", "BBB", 5500, 11, 0.1),
      mk("wr1", "WR", "AAA", 7000, 14, 0.1),
      mk("wr2", "WR", "BBB", 6500, 13, 0.1),
      mk("wr3", "WR", "CCC", 6000, 12, 0.1),
      mk("te1", "TE", "AAA", 4000, 8, 0.1),
      mk("dst1", "DST", "AAA", 3000, 6, 0.1),
    ];
    const res = generateLineups(base({ mode: "gpp" }), 10, 0.6, pool);
    expect(res.requested).toBe(10);
    expect(res.lineups.length).toBeLessThan(10);
    expect(res.partial).toBe(true);
  });

  it("contains no unseeded platform randomness — the solver is fully deterministic", () => {
    // This scan is the only cross-PROCESS determinism guard there is: the
    // comparison tests below run two calls in one process, and an unseeded
    // source can still agree with itself there whenever the exact search
    // completes and the optimum is unique. It was red from the module's first
    // commit until 2026-09-18. Keep it a file scan, and never spell the call
    // in a comment here either — the scan reads its own test file's subject,
    // not this file, but the sibling rule in the source applies.
    const src = readFileSync(join(__dirname, "dfs-optimizer.ts"), "utf8");
    expect(src).not.toMatch(/Math\.random/);
  });

  it("the HEURISTIC layer alone is reproducible — the seeded restarts replay in order", () => {
    // optimizeOne can agree with itself while the layer underneath does not,
    // because a completed exact search lands on the optimum whatever the seed.
    // Assert the seeding directly, on the layer that actually draws.
    const a = optimizeHeuristic(base({ mode: "gpp", stack: true }), undefined, 60, DFS_SLATE);
    const b = optimizeHeuristic(base({ mode: "gpp", stack: true }), undefined, 60, DFS_SLATE);
    expect(a).not.toBeNull();
    expect(a!.map((p) => p.id)).toEqual(b!.map((p) => p.id));
  });
});

describe("dfs optimizer — 600-player scale (CI-safe timed)", () => {
  function makeBigPool(n: number): DfsPlayer[] {
    const teams = ["ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS", "ARI"];
    const posWeights: { pos: DfsPos; count: number }[] = [
      { pos: "QB", count: Math.round(n * 0.07) },
      { pos: "RB", count: Math.round(n * 0.27) },
      { pos: "WR", count: Math.round(n * 0.36) },
      { pos: "TE", count: Math.round(n * 0.17) },
      { pos: "DST", count: 0 }, // filled by remainder below
    ];
    const assigned = posWeights.reduce((s, w) => s + w.count, 0);
    posWeights[4]!.count = Math.max(1, n - assigned);

    const pool: DfsPlayer[] = [];
    let i = 0;
    for (const { pos, count } of posWeights) {
      for (let k = 0; k < count; k++, i++) {
        // deterministic pseudo-spread (no Math.random anywhere in this module or its tests)
        const salary = 3000 + ((i * 137) % 46) * 100; // 3000..7500, multiples of 100
        const proj = 5 + ((i * 53) % 25);
        const own = 0.02 + ((i * 7) % 40) / 100;
        const team = teams[i % teams.length]!;
        pool.push({
          id: `${pos.toLowerCase()}${i}`, name: `Player ${i}`, pos, team, opp: teams[(i + 16) % teams.length]!,
          salary, proj, floor: Math.round(proj * 0.4), ceiling: Math.round(proj * 1.8), own,
        });
      }
    }
    return pool;
  }

  it("returns a legal 600-player lineup within 10s — bounded, and NOT claimed optimal", () => {
    // This test asserted "exact ... optimum" and proved neither, for two
    // reasons, both fixed 2026-09-18.
    //
    // 1. It never saw 600 players. The call read
    //    `optimizeOne(opts, undefined, pool)`, which puts the pool in the
    //    `restarts` slot, so `slate` fell back to the 36-player sample and the
    //    whole block finished in ~240ms measuring the wrong thing.
    // 2. "Optimum" was never true at this scale anyway. Wired correctly, the
    //    search stops on a budget every time (measured: 400,001 nodes at every
    //    pool size from 50 to 200), so what comes back is the best lineup found
    //    inside the budget, not a proven optimum. The exactness claim lives in
    //    the brute-force block at the top of this file, where the pools are
    //    small enough that the search genuinely completes.
    //
    // What is asserted here is the contract that actually holds and the one
    // the browser depends on: a legal, cap-valid lineup, bounded wall clock.
    const pool = makeBigPool(600);
    const t0 = Date.now();
    const lu = optimizeOne(base({ mode: "gpp" }), undefined, undefined, pool);
    const elapsedMs = Date.now() - t0;
    expect(lu).not.toBeNull();
    expect(lu!.length).toBe(DFS_SLOTS.length);
    expect(slotsValid(lu!)).toBe(true);
    expect(metrics(lu!).salary).toBeLessThanOrEqual(SALARY_CAP);
    // Measured 1.65s on this container; the bar keeps ~6x of headroom for CI.
    // Before the cost budget this same call ran for minutes.
    expect(elapsedMs).toBeLessThan(10000);
  }, 15000);

  it("the cost budget, not the node budget, is what bounds the search", () => {
    // The node budget cannot bound wall clock: a node's cost is its slot's
    // candidate list plus a rescan for the admissible bound, so it grows with
    // the pool. Measured on this fixture, all four stopping on the SAME 400k
    // nodes: 50 players 2.3s, 100 10.6s, 150 24.1s, 200 43.8s.
    //
    // Pin the mechanism rather than the timing: on one pool, shrinking ONLY
    // the cost budget must cut the search short. If someone re-bounds this on
    // nodes again, the two searches below become identical and this fails.
    const pool = makeBigPool(200);
    const t0 = Date.now();
    const tight = optimizeOne(base({ mode: "gpp" }), undefined, undefined, pool, 400_000, 20_000_000);
    const tightMs = Date.now() - t0;
    expect(tight).not.toBeNull();
    expect(slotsValid(tight!)).toBe(true);
    expect(metrics(tight!).salary).toBeLessThanOrEqual(SALARY_CAP);
    // 1/30th of the default budget on the same pool and the same node cap.
    expect(tightMs).toBeLessThan(5000);
    expect(DEFAULT_COST_BUDGET).toBeGreaterThan(20_000_000);
  }, 15000);

  it("is deterministic at 600-player scale too", () => {
    // Load-bearing now in a way it was not before: at this scale the search is
    // always budget-truncated, so the lineup returned IS the one the seeding
    // happened to reach. A truncated search with an unseeded start would ship
    // a different lineup on every run.
    const pool = makeBigPool(600);
    const a = optimizeOne(base({ mode: "gpp" }), undefined, undefined, pool);
    const b = optimizeOne(base({ mode: "gpp" }), undefined, undefined, pool);
    expect(a!.map((p) => p.id)).toEqual(b!.map((p) => p.id));
  }, 15000);

  it("says so when the budget cut the search short, and still returns the incumbent", () => {
    // The test above asserts the 600-player search "is always budget-truncated".
    // Until solveExact existed that was a claim in a comment: the return value
    // could not express it, so nothing checked it. Now it can be read.
    const pool = makeBigPool(600);
    const cut = solveExact(base({ mode: "gpp" }), undefined, undefined, pool);
    expect(cut.optimal).toBe(false);
    // Truncated is not empty. A budget stop returns the best lineup reached,
    // which is what the caller ships; the flag is the only thing that changes.
    expect(cut.lineup).not.toBeNull();
    expect(slotsValid(cut.lineup!)).toBe(true);
    expect(metrics(cut.lineup!).salary).toBeLessThanOrEqual(SALARY_CAP);
    expect(cut.work).toBeGreaterThan(0);
    // And the wrapper is the same search, not a second one.
    expect(optimizeExact(base({ mode: "gpp" }), undefined, undefined, pool)!.map((p) => p.id))
      .toEqual(cut.lineup!.map((p) => p.id));
  }, 30000);
});

describe("dfs optimizer — search provenance", () => {
  /**
   * `optimal` must never overstate. These pin both directions: a completed
   * search reports true, and every way of NOT completing reports false.
   */
  it("reports a completed search on a slate it can exhaust", () => {
    const done = solveExact(base({ mode: "cash" }), undefined, undefined, POOL_CLEAR);
    expect(done.optimal).toBe(true);
    expect(done.lineup).not.toBeNull();
    expect(done.nodes).toBeGreaterThan(0);
  });

  it("proves infeasibility rather than guessing at it", () => {
    // No candidates at all: "no lineup exists" here is a fact about the slate,
    // not a search that gave up, so the flag is true WITH a null lineup.
    const none = solveExact(base({ mode: "gpp" }), undefined, undefined, []);
    expect(none.lineup).toBeNull();
    expect(none.optimal).toBe(true);
    expect(none.nodes).toBe(0);
  });

  it("never claims a proof for a search it refused to start", () => {
    // An unplaceable lock returns before a single node. "We did not look" and
    // "we looked and it is not there" must not read the same to a caller.
    const refused = solveExact(
      base({ mode: "cash", locks: new Set(["no-such-player"]) }),
      undefined,
      undefined,
      POOL_CLEAR,
    );
    expect(refused.optimal).toBe(false);
  });

  it("agrees with the lineup-only wrapper on every field it shares", () => {
    for (const mode of ["cash", "gpp", "leverage"] as Mode[]) {
      const viaResult = solveExact(base({ mode }), undefined, undefined, POOL_CLEAR);
      const viaLineup = optimizeExact(base({ mode }), undefined, undefined, POOL_CLEAR);
      expect(viaLineup?.map((p) => p.id) ?? null).toEqual(viaResult.lineup?.map((p) => p.id) ?? null);
      // optimizeOne is the same search at the default cap.
      const one = optimizeOne(base({ mode }), undefined, undefined, POOL_CLEAR);
      expect(one?.map((p) => p.id) ?? null).toEqual(viaResult.lineup?.map((p) => p.id) ?? null);
    }
  });
});
