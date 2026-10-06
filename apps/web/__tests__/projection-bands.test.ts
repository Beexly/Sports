/**
 * The two labeled intervals. Every band carries its coverage, and a quarterback
 * never claims a per-player band.
 *
 * THE POINT OF THIS FILE. A coverage label is a claim about how often a
 * realized season total lands inside a band. The claims are measured, not
 * assumed (see `fantasy-variance.ts` and the research doc), and these tests
 * exist so the two ways a label can become a lie are caught:
 *
 *   1. The z drifts from the coverage — the label survives, the math changes.
 *   2. A suppressed position silently acquires a per-player band.
 *
 * Both are silent failures otherwise: the numbers still render, they are just
 * no longer what the words beside them say.
 */

import { describe, expect, it } from "vitest";

import {
  bandFor,
  BAND_SUPPRESSED_POSITIONS,
  buildVarianceProjections,
  DEFAULT_BAND_COVERAGE,
  POSITIONAL_BASELINE_LABEL,
  PROJECTION_BANDS,
  POSITIONAL_CV_SNAPSHOT,
  projectionInterval,
  RECENCY_HALF_LIFE_WEEKS,
  type ModelPosition,
  type PlayerWeek,
  type ProjectionRow,
} from "@sports/prediction-engine";

const POSITIONS: readonly ModelPosition[] = ["QB", "RB", "WR", "TE"];

/** A synthetic player with a stable per-game rate and a controlled spread. */
function playerWeeks(
  playerId: string,
  position: ModelPosition,
  weeks: number,
  meanPpr: number,
  spread: number,
  startAbsWeek = 0,
): PlayerWeek[] {
  return Array.from({ length: weeks }, (_, i) => ({
    playerId,
    position,
    absWeek: startAbsWeek + i,
    // Deterministic oscillation, not Math.random(): the CV is an input here,
    // so it has to be reproducible or the assertions below are untestable.
    ppr: meanPpr + (i % 2 === 0 ? spread / 2 : -spread / 2),
  }));
}

const MEANS: Record<string, number> = { QB: 20, RB: 15, WR: 13, TE: 8 };
// No positional CV table here on purpose: these tests must exercise the CV the
// model DERIVES from each player's own weeks, not a hand-fed prior. A fixture
// that supplies its own CV would let a broken CV implementation pass.

function buildPool(): ProjectionRow[] {
  const weeks: PlayerWeek[] = [];
  for (const pos of POSITIONS) {
    weeks.push(...playerWeeks(`p-${pos}`, pos, 16, MEANS[pos]!, 8));
  }
  return buildVarianceProjections({
    weeks,
    positionalMeanPpr: MEANS,
    positionalCv: { ...POSITIONAL_CV_SNAPSHOT },
    remainingGames: { "p-QB": 14, "p-RB": 14, "p-WR": 14, "p-TE": 14 },
  });
}

describe("the two shipped intervals", () => {
  it("ships exactly two, ascending in coverage", () => {
    expect(PROJECTION_BANDS).toHaveLength(2);
    const covs = PROJECTION_BANDS.map((b) => b.coverage);
    expect(covs).toEqual([0.68, 0.9]);
    // Ascending z too — a wider band must not be a narrower one.
    expect(PROJECTION_BANDS[1]!.z).toBeGreaterThan(PROJECTION_BANDS[0]!.z);
  });

  it("resolves a shipped coverage and REFUSES an unshipped one", () => {
    expect(bandFor(0.68).coverage).toBe(0.68);
    expect(bandFor(0.9).coverage).toBe(0.9);
    // A coverage we never measured must fail loudly rather than silently
    // resolving to a neighbouring band and wearing its label.
    expect(() => bandFor(0.95)).toThrow(/unknown band coverage/);
    expect(() => bandFor(0.8)).toThrow(/unknown band coverage/);
  });

  it("the default is the tighter interval, not an average of the two", () => {
    expect(DEFAULT_BAND_COVERAGE).toBe(0.68);
    expect(bandFor(DEFAULT_BAND_COVERAGE).z).toBe(PROJECTION_BANDS[0]!.z);
  });
});

describe("per-player sanity bounds", () => {
  const rows = buildPool();

  it("produces a row per position with a positive, finite projection", () => {
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(Number.isFinite(r.proj)).toBe(true);
      expect(r.proj).toBeGreaterThan(0);
      expect(Number.isFinite(r.cvPlayer)).toBe(true);
      expect(r.cvPlayer).toBeGreaterThan(0);
    }
  });

  it("carries BOTH intervals, each with its own coverage", () => {
    for (const r of rows) {
      expect(r.intervals).toHaveLength(2);
      expect(r.intervals.map((i) => i.coverage)).toEqual([0.68, 0.9]);
    }
  });

  it("orders floor <= proj <= ceiling at BOTH coverages", () => {
    for (const r of rows) {
      for (const band of r.intervals) {
        expect(band.floor).toBeLessThanOrEqual(r.proj + 1e-9);
        expect(band.ceiling).toBeGreaterThanOrEqual(r.proj - 1e-9);
        expect(band.floor).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(band.ceiling)).toBe(true);
      }
    }
  });

  it("the 90% band strictly contains the 68% band", () => {
    // A coverage increase that does not widen the band is a z that drifted
    // out of order, which would make the wider label a lie in the other
    // direction: claiming more coverage while shipping the same numbers.
    for (const r of rows) {
      const tight = r.intervals[0]!;
      const wide = r.intervals[1]!;
      expect(wide.floor).toBeLessThanOrEqual(tight.floor + 1e-9);
      expect(wide.ceiling).toBeGreaterThanOrEqual(tight.ceiling - 1e-9);
      // Width is measured against the row's proj; the interval itself is
      // proj-free so it cannot disagree about the center it was built on.
      expect(wide.ceiling - r.proj).toBeGreaterThan(tight.ceiling - r.proj);
    }
  });

  it("the flattened floor/ceiling IS the default interval, not a third value", () => {
    // If these ever diverge, something is computing a band by a different path
    // than the one a surface would pick — the classic drift bug.
    for (const r of rows) {
      expect(r.floor).toBeCloseTo(r.intervals[0]!.floor, 9);
      expect(r.ceiling).toBeCloseTo(r.intervals[0]!.ceiling, 9);
    }
  });

  it("is symmetric about proj, scaled by the named z and the shrunk CV", () => {
    for (const r of rows) {
      for (const band of r.intervals) {
        expect(r.proj - band.floor).toBeCloseTo(band.z * r.cvPlayer * r.proj, 6);
        expect(band.ceiling - r.proj).toBeCloseTo(band.z * r.cvPlayer * r.proj, 6);
      }
    }
  });

  it("a band is never so wide that the floor goes negative", () => {
    // A floor below zero is not a pessimistic floor, it is a wrong one.
    const wild = buildVarianceProjections({
      weeks: playerWeeks("boom", "WR", 16, 4, 30),
      positionalMeanPpr: MEANS,
      positionalCv: { ...POSITIONAL_CV_SNAPSHOT },
      remainingGames: { boom: 14 },
    });
    for (const r of wild) {
      for (const band of r.intervals) {
        expect(band.floor).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("QB never claims a per-player band", () => {
  const rows = buildPool();

  it("suppresses exactly QB and leaves RB/WR/TE per-player", () => {
    expect([...BAND_SUPPRESSED_POSITIONS]).toEqual(["QB"]);
    for (const r of rows) {
      const expected = r.position === "QB" ? "positional-baseline" : "per-player";
      for (const band of r.intervals) {
        expect(band.kind).toBe(expected);
      }
    }
  });

  it("a QB interval always carries the baseline label string", () => {
    for (const r of rows.filter((x) => x.position === "QB")) {
      for (const band of r.intervals) {
        expect(band.kind).toBe("positional-baseline");
        expect(band.label).toBe(POSITIONAL_BASELINE_LABEL);
        expect(band.label).toMatch(/per-player band not supported/);
      }
    }
  });

  it("a per-player interval carries NO baseline label", () => {
    // Carrying both is its own kind of lie: it hedges between "this is yours"
    // and "this is an average", and a reader cannot act on either.
    for (const r of rows.filter((x) => x.position !== "QB")) {
      for (const band of r.intervals) {
        expect(band.kind).toBe("per-player");
        expect(band.label).toBeUndefined();
      }
    }
  });

  it("every interval is labelled one way or the other — never neither", () => {
    // The invariant the whole suppression rule rests on.
    for (const r of rows) {
      for (const band of r.intervals) {
        if (band.kind === "positional-baseline") {
          expect(typeof band.label).toBe("string");
          expect((band.label as string).length).toBeGreaterThan(0);
        } else {
          expect(band.label).toBeUndefined();
        }
      }
    }
  });

  it("suppression changes the LABEL, never the arithmetic", () => {
    // A suppressed QB still gets a real interval from his real CV. What is
    // withheld is the claim that it is his own. If suppression silently
    // widened or narrowed the numbers, the label would be the only honest part.
    const qb = rows.find((r) => r.position === "QB");
    expect(qb).toBeDefined();
    const band = projectionInterval(qb!, 0.68);
    const manualFloor = Math.max(0, qb!.proj * (1 - band.z * qb!.cvPlayer));
    expect(band.floor).toBeCloseTo(manualFloor, 9);
  });
});

describe("the interval is built from the model, not from a surface's convenience", () => {
  it("rejects an unshipped coverage instead of rounding to a neighbour", () => {
    const r = buildPool()[0]!;
    expect(() => projectionInterval(r, 0.25)).toThrow(/unknown band coverage/);
    // 0.68 must not be reachable by an approximation like 0.679.
    expect(() => projectionInterval(r, 0.679)).toThrow(/unknown band coverage/);
  });

  it("is pure: the same row yields the same interval every call", () => {
    const r = buildPool()[0]!;
    const a = projectionInterval(r, 0.9);
    const b = projectionInterval(r, 0.9);
    expect(a).toEqual(b);
  });

  it("the half-life stays at the settled value of 6 weeks", () => {
    // Re-litigated and settled; a change here is a silent model change.
    expect(RECENCY_HALF_LIFE_WEEKS).toBe(6);
  });
});
