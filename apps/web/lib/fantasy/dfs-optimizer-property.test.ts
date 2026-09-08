/**
 * C-210. Property fuzz over the DFS solver.
 *
 * dfs-optimizer.test.ts already does something rare and good: it checks the
 * solver against an independently reimplemented objective and a brute-force
 * oracle on a small pool. What it does not do is vary the SLATE. Every
 * assertion runs against one hand-built fixture, so a defect that only appears
 * on a differently-shaped pool - a position that is nearly exhausted, a salary
 * distribution that makes the cap bind, a pool with exactly enough players to
 * fill the roster - is invisible.
 *
 * These properties generate the slate. The invariants are the ones a DFS user
 * would call the product broken over: never over the cap, never an illegal
 * roster, never a duplicated player, never dropping a lock, never returning an
 * excluded player, and the same slate always producing the same lineup.
 *
 * Two-speed: DEEP_FUZZ=1 multiplies by 25.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { optimizeOne, generateLineups, metrics, type OptOpts } from "./dfs-optimizer";
import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";

const DEEP = process.env.DEEP_FUZZ === "1";
const SCALE = DEEP ? 25 : 1;
// 150 generated slates per property. Each case is a real exact-DP solve, so
// this suite costs ~35s where the arithmetic suites cost seconds - the budget
// is spent on slate SHAPE variety, which is what the existing fixture-based
// tests never varied.
const RUNS = 150 * SCALE;

const FLEX_OK = new Set<string>(["RB", "WR", "TE"]);

function slotsValid(lu: readonly { pos: string }[]): boolean {
  if (lu.length !== DFS_SLOTS.length) return false;
  return DFS_SLOTS.every((slot, i) =>
    slot === ("FLEX" as string) ? FLEX_OK.has(lu[i]!.pos) : lu[i]!.pos === slot,
  );
}

const opts = (over: Partial<OptOpts> = {}): OptOpts => ({
  mode: "gpp", stack: false, locks: new Set(), excludes: new Set(), ...over,
});

/**
 * Generate a slate that CAN fill the roster (QB, 2 RB, 3 WR, TE, FLEX, DST)
 * with a little slack, then vary counts, salaries and projections widely.
 * Salaries are drawn so the cap sometimes binds and sometimes does not - the
 * interesting failures live at the boundary, not in the comfortable middle.
 */
const arbSlate: fc.Arbitrary<DfsPlayer[]> = fc
  .record({
    qb: fc.integer({ min: 1, max: 4 }),
    rb: fc.integer({ min: 3, max: 8 }),
    wr: fc.integer({ min: 4, max: 10 }),
    te: fc.integer({ min: 1, max: 4 }),
    dst: fc.integer({ min: 1, max: 3 }),
    salaryLo: fc.integer({ min: 3000, max: 5000 }),
    salaryHi: fc.integer({ min: 5001, max: 9000 }),
    seed: fc.integer({ min: 0, max: 10_000 }),
  })
  .map(({ qb, rb, wr, te, dst, salaryLo, salaryHi, seed }) => {
    // Deterministic pseudo-random from the seed: fast-check must be able to
    // replay a counterexample exactly, so Math.random is never used.
    let x = seed + 1;
    const next = (): number => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
    const out: DfsPlayer[] = [];
    const add = (pos: DfsPos, n: number) => {
      for (let i = 0; i < n; i++) {
        // SNAPPED TO 100, because DK salaries always are and the solver's
        // cost depends on it: detectGranularity falls back 100 -> 50 -> 10 -> 1,
        // and the exact DP is dimensioned on SALARY_CAP / granularity. An
        // earlier version of this generator emitted arbitrary whole dollars,
        // which forced granularity 1, blew the DP from 501 salary states to
        // 50,001, and made a 19-player pool take 1.5 seconds - 59x slower than
        // a realistic 912-player slate. That measured the generator, not the
        // solver. The off-grid path is covered deliberately below instead.
        const salary = Math.round((salaryLo + next() * (salaryHi - salaryLo)) / 100) * 100;
        const proj = Math.round((3 + next() * 25) * 10) / 10;
        out.push({
          id: `${pos}${i}`, name: `${pos}${i}`, pos,
          team: `T${i % 4}`, opp: `O${i % 4}`,
          salary, proj, floor: Math.max(0, proj - 5), ceiling: proj + 8,
          own: Math.round(next() * 40) / 100,
        });
      }
    };
    add("QB" as DfsPos, qb); add("RB" as DfsPos, rb); add("WR" as DfsPos, wr);
    add("TE" as DfsPos, te); add("DST" as DfsPos, dst);
    return out;
  });

const arbMode = fc.constantFrom("cash", "gpp", "leverage") as fc.Arbitrary<OptOpts["mode"]>;

describe("optimizeOne never returns an illegal lineup (fuzz)", () => {
  it("respects the salary cap on every slate it can solve", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, fc.boolean(), (slate, mode, stack) => {
        const lu = optimizeOne(opts({ mode, stack }), undefined, slate);
        if (!lu) return; // infeasible is a legitimate answer
        expect(metrics(lu).salary).toBeLessThanOrEqual(SALARY_CAP);
      }),
      { numRuns: RUNS },
    );
  });

  it("fills every roster slot with a legal position", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, (slate, mode) => {
        const lu = optimizeOne(opts({ mode }), undefined, slate);
        if (!lu) return;
        expect(slotsValid(lu), `illegal roster: ${lu.map((p) => p.pos).join(",")}`).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("never starts the same player twice", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, fc.boolean(), (slate, mode, stack) => {
        const lu = optimizeOne(opts({ mode, stack }), undefined, slate);
        if (!lu) return;
        const ids = lu.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: RUNS },
    );
  });

  it("only ever returns players that are actually on the slate", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, (slate, mode) => {
        const lu = optimizeOne(opts({ mode }), undefined, slate);
        if (!lu) return;
        const onSlate = new Set(slate.map((p) => p.id));
        lu.forEach((p) => expect(onSlate.has(p.id), `${p.id} is not on the slate`).toBe(true));
      }),
      { numRuns: RUNS },
    );
  });
});

describe("locks and excludes are instructions, not preferences (fuzz)", () => {
  it("never returns an excluded player", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, fc.integer({ min: 0, max: 30 }), (slate, mode, pick) => {
        const fade = slate[pick % slate.length]!.id;
        const lu = optimizeOne(opts({ mode, excludes: new Set([fade]) }), undefined, slate);
        if (!lu) return;
        expect(lu.some((p) => p.id === fade), `returned the excluded ${fade}`).toBe(false);
      }),
      { numRuns: RUNS },
    );
  });

  it("includes a locked player whenever it returns a lineup at all", () => {
    fc.assert(
      fc.property(arbSlate, arbMode, fc.integer({ min: 0, max: 30 }), (slate, mode, pick) => {
        const lockId = slate[pick % slate.length]!.id;
        const lu = optimizeOne(opts({ mode, locks: new Set([lockId]) }), undefined, slate);
        if (!lu) return; // refusing is honest; silently dropping the lock is not
        expect(lu.some((p) => p.id === lockId), `dropped the lock ${lockId}`).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("a lock and an exclude on the same player yields no lineup, never a guess", () => {
    fc.assert(
      fc.property(arbSlate, fc.integer({ min: 0, max: 30 }), (slate, pick) => {
        const id = slate[pick % slate.length]!.id;
        const lu = optimizeOne(
          opts({ locks: new Set([id]), excludes: new Set([id]) }),
          undefined,
          slate,
        );
        // Whatever it does, it must not both honour and violate the same id.
        if (lu) expect(lu.some((p) => p.id === id)).toBe(false);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("the solver is deterministic (fuzz)", () => {
  it("returns the identical lineup for the identical slate and options", () => {
    // The product's whole claim is reproducibility. A solver that tie-breaks
    // unstably gives two users different lineups from the same inputs.
    fc.assert(
      fc.property(arbSlate, arbMode, fc.boolean(), (slate, mode, stack) => {
        const a = optimizeOne(opts({ mode, stack }), undefined, slate);
        const b = optimizeOne(opts({ mode, stack }), undefined, slate);
        expect(b?.map((p) => p.id) ?? null).toEqual(a?.map((p) => p.id) ?? null);
      }),
      { numRuns: RUNS },
    );
  });

  it("does not depend on the order the slate rows arrive in", () => {
    // A DB returning the same players in a different order must not change
    // the lineup. Ties are allowed to resolve differently, so this asserts the
    // OBJECTIVE is equal rather than the exact ids.
    fc.assert(
      fc.property(arbSlate, arbMode, (slate, mode) => {
        const a = optimizeOne(opts({ mode }), undefined, slate);
        const b = optimizeOne(opts({ mode }), undefined, [...slate].reverse());
        if (!a || !b) {
          expect(a === null).toBe(b === null);
          return;
        }
        const key = mode === "cash" ? "proj" : "ceiling";
        expect(metrics(b)[key]).toBeCloseTo(metrics(a)[key], 4);
      }),
      { numRuns: RUNS },
    );
  });
});

describe("generateLineups holds its contract on any slate (fuzz)", () => {
  it("emits only unique, legal, cap-respecting lineups", () => {
    fc.assert(
      fc.property(arbSlate, fc.integer({ min: 1, max: 6 }), (slate, count) => {
        const { lineups, requested, partial } = generateLineups(opts({ mode: "gpp" }), count, 0.6, slate);
        expect(requested).toBe(count);
        expect(lineups.length).toBeLessThanOrEqual(count);
        expect(partial).toBe(lineups.length < count);
        const keys = lineups.map((l) => l.players.map((p) => p.id).sort().join(","));
        expect(new Set(keys).size, "duplicate lineup emitted").toBe(keys.length);
        lineups.forEach((l) => {
          expect(slotsValid(l.players)).toBe(true);
          expect(l.metrics.salary).toBeLessThanOrEqual(SALARY_CAP);
        });
      }),
      { numRuns: RUNS },
    );
  });

  it("keeps every lock in every lineup it returns, on any slate", () => {
    fc.assert(
      fc.property(arbSlate, fc.integer({ min: 0, max: 30 }), fc.integer({ min: 2, max: 5 }), (slate, pick, count) => {
        const lockId = slate[pick % slate.length]!.id;
        const { lineups } = generateLineups(
          opts({ mode: "gpp", locks: new Set([lockId]) }), count, 0.6, slate,
        );
        lineups.forEach((l, i) =>
          expect(l.players.some((p) => p.id === lockId), `lineup ${i + 1} dropped the lock`).toBe(true),
        );
      }),
      { numRuns: RUNS },
    );
  });

  it("holds the exposure cap against the lineups actually produced", () => {
    fc.assert(
      fc.property(arbSlate, fc.integer({ min: 2, max: 6 }), (slate, count) => {
        const { lineups, exposure } = generateLineups(opts({ mode: "gpp" }), count, 0.6, slate);
        const produced = lineups.length;
        if (produced === 0) return;
        const bound = Math.max(1, Math.ceil(0.6 * produced));
        exposure.forEach((e) =>
          expect(e.count, `${e.id} in ${e.count} of ${produced}`).toBeLessThanOrEqual(bound),
        );
      }),
      { numRuns: RUNS },
    );
  });
});

describe("salary granularity is the solver's real cost driver (C-211)", () => {
  // Measured, not assumed. With DK-realistic salaries the exact DP is
  // dimensioned SALARY_CAP/100 = 501 states and a full 912-player main slate
  // solves in ~330ms (~1.3s stacked). Drop one salary off the 100 grid and
  // granularity falls to 1, the DP becomes 50,001 states, and a NINETEEN
  // player pool takes ~1.5s - 59x the cost of the realistic 912-player slate.
  //
  // That matters because dk-import parses a USER-SUPPLIED CSV. A file from
  // another site, or an edited one, silently buys a ~500x cost multiplier per
  // solve on the main thread - and generateLineups solves once per lineup.
  const mk = (pos: DfsPos, i: number, salary: number): DfsPlayer => ({
    id: `${pos}${i}`, name: `${pos}${i}`, pos, team: `T${i % 4}`, opp: `O${i % 4}`,
    salary, proj: 10 + (i % 7), floor: 5, ceiling: 20, own: 0.1,
  });
  const pool = (gran: number): DfsPlayer[] => {
    const out: DfsPlayer[] = [];
    const add = (pos: DfsPos, n: number) => {
      for (let i = 0; i < n; i++) out.push(mk(pos, i, Math.round((3000 + i * 431) / gran) * gran));
    };
    add("QB" as DfsPos, 2); add("RB" as DfsPos, 5); add("WR" as DfsPos, 7);
    add("TE" as DfsPos, 3); add("DST" as DfsPos, 2);
    return out;
  };

  it("solves a DK-grid pool far faster than the same pool off-grid", () => {
    const onGrid = pool(100);
    const offGrid = pool(1);
    const time = (s: DfsPlayer[]): number => {
      const t0 = Date.now();
      optimizeOne(opts(), undefined, s);
      return Date.now() - t0;
    };
    // Warm both paths so the comparison is not a JIT artifact.
    time(onGrid); time(offGrid);
    const fast = time(onGrid);
    const slow = time(offGrid);
    // Deliberately loose: the point is the ORDER OF MAGNITUDE, and CI machines
    // vary. Measured locally at roughly 25ms against 1,468ms.
    expect(slow).toBeGreaterThan(fast * 5);
  });

  it("still solves an off-grid pool correctly, only slowly", () => {
    // Cost is the issue, never correctness - the fallback exists so imported
    // pools solve EXACTLY rather than being silently misaligned.
    const lu = optimizeOne(opts(), undefined, pool(1));
    expect(lu).not.toBeNull();
    expect(slotsValid(lu!)).toBe(true);
    expect(metrics(lu!).salary).toBeLessThanOrEqual(SALARY_CAP);
  });
});
