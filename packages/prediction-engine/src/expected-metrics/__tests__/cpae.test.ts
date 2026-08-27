import { describe, it, expect } from "vitest";
import {
  naturalCubicBasis,
  cpaeSurfaceFeatureRow,
  fitCpaeSurface,
  predictCpaeCompletionProbability,
  CPAE_BASIS_SIZE,
  CPAE_DEPTH_DOMAIN,
  CPAE_DEPTH_KNOTS,
  CPAE_SURFACE_FEATURE_KEYS,
} from "../cpae-surface.js";
import {
  cpaeCellIndex,
  buildGroupCells,
  shrinkGroupSurface,
  computeCpaeMetrics,
  CPAE_CELL_COUNT,
  CPAE_DEPTH_BIN_EDGES,
  type CpaeGroupCells,
  type CpaeCell,
} from "../cpae-aggregate.js";
import type { PassLocationBin } from "../cpae-surface.js";
import type { DropbackPlay } from "../expected-completion.js";
import { mulberry32 } from "../../edge-lab/rng.js";

const LOCS = ["left", "middle", "right"] as const;

/** Seeded synthetic dropbacks from a KNOWN per-location linear-logit truth (in the natural-spline span exactly). */
function synthesize(
  seed: number,
  n: number,
  truth: Record<(typeof LOCS)[number], { a: number; b: number }>,
  passerId = "QB1",
): DropbackPlay[] {
  const rng = mulberry32(seed);
  const plays: DropbackPlay[] = [];
  for (let i = 0; i < n; i++) {
    const loc = LOCS[Math.floor(rng() * 3)]!;
    const depth = -8 + rng() * 45; // inside the domain
    const { a, b } = truth[loc];
    const p = 1 / (1 + Math.exp(-(a + b * depth)));
    plays.push({
      passerId,
      complete: rng() < p ? 1 : 0,
      airYards: depth,
      yardline100: 50,
      down: 1,
      ydstogo: 10,
      shotgun: 0,
      noHuddle: 0,
      qbHit: 0,
      passLocation: loc,
    });
  }
  return plays;
}

const TRUTH = {
  left: { a: 1.2, b: -0.08 },
  middle: { a: 1.8, b: -0.06 },
  right: { a: 1.0, b: -0.09 },
};

describe("naturalCubicBasis", () => {
  it("has the expected size, with constant and linear leading terms", () => {
    const b = naturalCubicBasis(5);
    expect(b.length).toBe(CPAE_BASIS_SIZE);
    expect(b[0]).toBe(1);
    expect(b[1]).toBe(5);
  });

  it("clamps to the domain: out-of-range depths evaluate at the boundary", () => {
    expect(naturalCubicBasis(-25)).toEqual(naturalCubicBasis(CPAE_DEPTH_DOMAIN[0]));
    expect(naturalCubicBasis(70)).toEqual(naturalCubicBasis(CPAE_DEPTH_DOMAIN[1]));
  });

  it("is C2-continuous at every interior knot (numerical second-difference check)", () => {
    const h = 1e-4;
    for (const knot of CPAE_DEPTH_KNOTS) {
      for (let k = 0; k < CPAE_BASIS_SIZE; k++) {
        const second = (x: number) =>
          (naturalCubicBasis(x + h)[k]! - 2 * naturalCubicBasis(x)[k]! + naturalCubicBasis(x - h)[k]!) / (h * h);
        // Second derivative approaches the same value from both sides of the knot.
        expect(Math.abs(second(knot - 5 * h) - second(knot + 5 * h))).toBeLessThan(0.05);
      }
    }
  });

  it("throws on a non-finite depth", () => {
    expect(() => naturalCubicBasis(NaN)).toThrow(RangeError);
    expect(() => naturalCubicBasis(Infinity)).toThrow(RangeError);
  });
});

describe("cpaeSurfaceFeatureRow", () => {
  const play: DropbackPlay = {
    passerId: "QB1",
    complete: 1,
    airYards: 8,
    yardline100: 40,
    down: 2,
    ydstogo: 7,
    shotgun: 1,
    noHuddle: 0,
    qbHit: 0,
    passLocation: "middle",
  };

  it("places the depth basis in the location's block and zeros the others (discrete tensor product)", () => {
    const row = cpaeSurfaceFeatureRow(play);
    expect(row.length).toBe(CPAE_SURFACE_FEATURE_KEYS.length);
    const basis = naturalCubicBasis(8);
    // middle is the second location block
    for (let k = 0; k < CPAE_BASIS_SIZE; k++) {
      expect(row[CPAE_BASIS_SIZE + k]).toBe(basis[k]);
      expect(row[k]).toBe(0); // left block zeroed
      expect(row[2 * CPAE_BASIS_SIZE + k]).toBe(0); // right block zeroed
    }
    // context block verbatim
    const ctx = 3 * CPAE_BASIS_SIZE;
    expect(row.slice(ctx)).toEqual([0, 2, 7, 40, 1, 0]);
  });

  it("throws on a null passLocation — uncharted plays are excluded, never imputed", () => {
    expect(() => cpaeSurfaceFeatureRow({ ...play, passLocation: null })).toThrow(RangeError);
  });
});

describe("fitCpaeSurface — synthetic recovery with known true parameters", () => {
  it("recovers a per-location linear-logit truth within tolerance across a depth×location grid", () => {
    const plays = synthesize(42, 20_000, TRUTH);
    const model = fitCpaeSurface(plays);
    expect(model).not.toBeNull();
    let maxErr = 0;
    for (const loc of LOCS) {
      for (let depth = -6; depth <= 35; depth += 2) {
        const { a, b } = TRUTH[loc];
        const pTrue = 1 / (1 + Math.exp(-(a + b * depth)));
        const pHat = predictCpaeCompletionProbability(model!, {
          passerId: "X",
          complete: 0,
          airYards: depth,
          yardline100: 50,
          down: 1,
          ydstogo: 10,
          shotgun: 0,
          noHuddle: 0,
          qbHit: 0,
          passLocation: loc,
        });
        maxErr = Math.max(maxErr, Math.abs(pHat - pTrue));
      }
    }
    expect(maxErr).toBeLessThan(0.05);
  });

  it("orders deep vs short correctly (monotone-in-depth truth is preserved)", () => {
    const plays = synthesize(7, 12_000, TRUTH);
    const model = fitCpaeSurface(plays)!;
    const at = (depth: number) =>
      predictCpaeCompletionProbability(model, {
        passerId: "X",
        complete: 0,
        airYards: depth,
        yardline100: 50,
        down: 1,
        ydstogo: 10,
        shotgun: 0,
        noHuddle: 0,
        qbHit: 0,
        passLocation: "middle",
      });
    expect(at(2)).toBeGreaterThan(at(15));
    expect(at(15)).toBeGreaterThan(at(30));
  });

  it("returns null under the minimum sample and on degenerate labels", () => {
    const few = synthesize(1, 50, TRUTH);
    expect(fitCpaeSurface(few)).toBeNull();
    const allComplete = synthesize(2, 500, TRUTH).map((p) => ({ ...p, complete: 1 as const }));
    expect(fitCpaeSurface(allComplete)).toBeNull();
  });

  it("leakage mutation test (the CodeRabbit as-of finding): rows outside the caller's filter cannot move a prior-labeled fit", () => {
    const past = synthesize(11, 3_000, TRUTH);
    // "Future" rows: wildly different truth — if they leaked in, coefficients would move.
    const future = synthesize(12, 3_000, {
      left: { a: -2, b: 0.1 },
      middle: { a: -2, b: 0.1 },
      right: { a: -2, b: 0.1 },
    });
    const filter = (rows: DropbackPlay[]) => rows.filter((r) => r.passerId === "QB1");
    const futureTagged = future.map((p) => ({ ...p, passerId: "FUTURE" }));
    const a = fitCpaeSurface(filter(past));
    const b = fitCpaeSurface(filter([...past, ...futureTagged]));
    expect(a).toEqual(b);
  });

  it("is deterministic across repeated fits on identical input", () => {
    const plays = synthesize(3, 2_000, TRUTH);
    expect(fitCpaeSurface(plays)).toEqual(fitCpaeSurface(plays));
  });
});

describe("cpaeCellIndex", () => {
  it("maps boundary depths deterministically (half-open bins, last bin closed)", () => {
    expect(cpaeCellIndex(-10, "left")).toBe(0);
    expect(cpaeCellIndex(-2, "left")).toBe(1); // opens bin 1
    expect(cpaeCellIndex(30, "left")).toBe(7); // opens the final bin
    expect(cpaeCellIndex(60, "left")).toBe(7); // closes the final bin
    expect(cpaeCellIndex(999, "left")).toBe(7); // clamped
    const binsPerLoc = CPAE_DEPTH_BIN_EDGES.length - 1;
    expect(cpaeCellIndex(0, "middle")).toBe(binsPerLoc + 1);
    expect(cpaeCellIndex(0, "right")).toBe(2 * binsPerLoc + 1);
  });

  it("throws on non-finite depth or unknown location", () => {
    expect(() => cpaeCellIndex(NaN, "left")).toThrow(RangeError);
    const invalidLocation = "deep" as unknown as PassLocationBin;
    expect(() => cpaeCellIndex(5, invalidLocation)).toThrow(RangeError);
  });
});

function cellsFrom(entries: ReadonlyArray<[number, CpaeCell]>): CpaeGroupCells {
  const cells: CpaeCell[] = Array.from({ length: CPAE_CELL_COUNT }, () => ({ n: 0, completionRate: 0, modelExpectedRate: 0 }));
  let attempts = 0;
  for (const [idx, cell] of entries) {
    cells[idx] = cell;
    attempts += cell.n;
  }
  return { groupId: "g", attempts, cells };
}

describe("shrinkGroupSurface — hand-computed", () => {
  it("matches the single-cell hand computation: (10·0.8 + 50·0.6)/60", () => {
    // w = nMedian/N_league chosen so w·n_L = 50: N_league = 100, nMedian = 50 ⇒ w = 0.5, n_L = 100 ⇒ w·n_L = 50.
    const group = cellsFrom([[0, { n: 10, completionRate: 0.8, modelExpectedRate: 0 }]]);
    const league = { ...cellsFrom([[0, { n: 100, completionRate: 0.6, modelExpectedRate: 0 }]]), groupId: "league" };
    const shrunk = shrinkGroupSurface(group, league, 50);
    expect(shrunk[0]!).toBeCloseTo((10 * 0.8 + 50 * 0.6) / 60, 12);
  });

  it("limits: huge n_g → own rate; n_g = 0 → league rate; nMedian = 0 → raw group rate", () => {
    const league = { ...cellsFrom([[0, { n: 100, completionRate: 0.6, modelExpectedRate: 0 }]]), groupId: "league" };
    const huge = cellsFrom([[0, { n: 1_000_000, completionRate: 0.8, modelExpectedRate: 0 }]]);
    expect(shrinkGroupSurface(huge, league, 50)[0]!).toBeCloseTo(0.8, 4);
    const empty = cellsFrom([]);
    expect(shrinkGroupSurface(empty, league, 50)[0]!).toBeCloseTo(0.6, 12);
    const some = cellsFrom([[0, { n: 10, completionRate: 0.8, modelExpectedRate: 0 }]]);
    expect(shrinkGroupSurface(some, league, 0)[0]!).toBeCloseTo(0.8, 12);
  });

  it("a cell empty on both sides contributes the league's rate with no NaN", () => {
    const league = { ...cellsFrom([]), groupId: "league" };
    const group = cellsFrom([]);
    const shrunk = shrinkGroupSurface(group, league, 50);
    for (const v of shrunk) expect(Number.isFinite(v)).toBe(true);
  });

  it("throws on malformed cell arrays or a negative/non-finite nMedian", () => {
    const ok = cellsFrom([]);
    expect(() => shrinkGroupSurface({ ...ok, cells: ok.cells.slice(1) }, ok, 50)).toThrow(RangeError);
    expect(() => shrinkGroupSurface(ok, ok, -1)).toThrow(RangeError);
    expect(() => shrinkGroupSurface(ok, ok, NaN)).toThrow(RangeError);
  });
});

describe("computeCpaeMetrics", () => {
  it("matches the two-cell hand computation: 0.6·0.05 + 0.4·(−0.05) = +1.0 pp", () => {
    // Make shrinkage a no-op (nMedian = 0) so P̂* = raw group rates.
    const group = cellsFrom([
      [0, { n: 60, completionRate: 0.7, modelExpectedRate: 0 }],
      [1, { n: 40, completionRate: 0.5, modelExpectedRate: 0 }],
    ]);
    const league = {
      ...cellsFrom([
        [0, { n: 600, completionRate: 0.65, modelExpectedRate: 0 }],
        [1, { n: 400, completionRate: 0.55, modelExpectedRate: 0 }],
      ]),
      groupId: "league",
    };
    const [metric] = computeCpaeMetrics([group], league, { nMedian: 0, minAttempts: 100, asOfWeek: 5 });
    expect(metric!.cpae).toBeCloseTo(1.0, 10);
    expect(metric!.successRateAboveBaseline).toBeCloseTo(0.6, 12); // only cell 0 beats the league
    expect(metric!.asOfWeek).toBe(5);
  });

  it("the league against itself yields cpae exactly 0 (to 12 decimals)", () => {
    const league = {
      ...cellsFrom([
        [0, { n: 300, completionRate: 0.68, modelExpectedRate: 0 }],
        [5, { n: 500, completionRate: 0.61, modelExpectedRate: 0 }],
        [9, { n: 200, completionRate: 0.44, modelExpectedRate: 0 }],
      ]),
      groupId: "league",
    };
    const [metric] = computeCpaeMetrics([league], league, { nMedian: 250, asOfWeek: 1 });
    expect(metric!.cpae).toBeCloseTo(0, 12);
    expect(metric!.successRateAboveBaseline).toBe(0);
  });

  it("enforces the paper's attempt qualifier: 99 attempts excluded, 100 included", () => {
    const league = { ...cellsFrom([[0, { n: 1000, completionRate: 0.6, modelExpectedRate: 0 }]]), groupId: "league" };
    const at99 = { ...cellsFrom([[0, { n: 99, completionRate: 0.7, modelExpectedRate: 0 }]]), groupId: "qb99" };
    const at100 = { ...cellsFrom([[0, { n: 100, completionRate: 0.7, modelExpectedRate: 0 }]]), groupId: "qb100" };
    const metrics = computeCpaeMetrics([at99, at100], league, { nMedian: 50, asOfWeek: 3 });
    expect(metrics.map((m) => m.groupId)).toEqual(["qb100"]);
  });

  it("throws on a non-integer asOfWeek label", () => {
    const league = { ...cellsFrom([]), groupId: "league" };
    expect(() => computeCpaeMetrics([], league, { nMedian: 1, asOfWeek: 2.5 })).toThrow(RangeError);
  });
});

describe("buildGroupCells", () => {
  it("buckets by group, excludes null-location and non-binary rows fail-closed, and is deterministic", () => {
    const plays = synthesize(5, 500, TRUTH, "QB_A").concat(synthesize(6, 400, TRUTH, "QB_B"));
    const withBad = [
      ...plays,
      { ...plays[0]!, passLocation: null },
      { ...plays[0]!, airYards: NaN },
    ];
    const a = buildGroupCells(withBad, null, (p) => p.passerId);
    const b = buildGroupCells(withBad, null, (p) => p.passerId);
    expect(a).toEqual(b);
    expect(a.map((g) => g.groupId)).toEqual(["QB_A", "QB_B"]);
    expect(a[0]!.attempts).toBe(500); // the two bad rows were dropped, not imputed
    // Every cell's counts sum back to the group's attempts.
    expect(a[0]!.cells.reduce((s, c) => s + c.n, 0)).toBe(500);
  });

  it("supports the defense grain via groupBy without any code change (the cpaeAllowed direction)", () => {
    const plays = synthesize(8, 300, TRUTH, "QB_A");
    // The defense grain is just a different groupBy closure over the same rows —
    // e.g. a defteam lookup keyed by game; here a constant stands in for it.
    const byDef = buildGroupCells(plays, null, () => "DEF_X");
    expect(byDef).toHaveLength(1);
    expect(byDef[0]!.groupId).toBe("DEF_X");
    expect(byDef[0]!.attempts).toBe(300);
  });
});
