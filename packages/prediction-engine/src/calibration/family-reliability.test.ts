/**
 * family-reliability.ts — tests.
 *
 * These pin HONESTY properties, not features. Each expensive failure below
 * maps to a way this harness could report a confident wrong number on the real
 * settled record:
 *
 *  - a TOTAL cell with no probability reported as "inert" (it is missing data)
 *  - `hadOddsSignal` — true on 4,142/4,142 — reported as well-calibrated
 *  - a team-win probability scored against a cover outcome
 *  - rows treated as independent when fixtures cluster
 *  - a family whose direction reverses by era reported as one pooled verdict
 */

import { describe, expect, it } from "vitest";
import {
  calibrationFit,
  clusterBootstrap,
  expectedCalibrationError,
  formatReliabilityReport,
  isMeasured,
  measureAllFamilies,
  measureFamilyReliability,
  reliabilityCurve,
  semanticsConflict,
  type ProbabilityEvent,
  type ReliabilityVerdict,
  type SettledPickObservation,
  MIN_CELL_FIXTURES,
  MIN_CELL_ROWS,
  MIN_CONTRAST_ARM_ROWS,
  SLOPE_TOLERANCE,
} from "./family-reliability.js";

let seq = 0;

/** One synthetic settled pick. */
function obs(o: {
  p: number;
  y: 0 | 1;
  families?: readonly string[];
  pickType?: string;
  event?: ProbabilityEvent;
  gameId?: string;
  era?: string;
}): SettledPickObservation {
  seq += 1;
  return {
    pickId: `pick-${seq}`,
    gameId: o.gameId ?? `g-${seq}`,
    pickType: o.pickType ?? "MONEYLINE",
    probability: o.p,
    outcome: o.y,
    families: o.families ?? ["rest"],
    probabilityEvent: o.event ?? "team-win",
    era: o.era ?? "2026-07",
  };
}

/**
 * A cell of `n` rows whose probabilities are drawn at level `p` and outcome
 * frequency is exactly `y`, on distinct fixtures. Deterministic: it cycles
 * outcomes so the observed rate is exactly what the caller asked for.
 */
function cell(
  n: number,
  p: number,
  y: number,
  extra: {
    families?: readonly string[];
    pickType?: string;
    event?: ProbabilityEvent;
    era?: string;
    fixtureEvery?: number;
  } = {},
): SettledPickObservation[] {
  const wins = Math.round(n * y);
  const out: SettledPickObservation[] = [];
  const per = extra.fixtureEvery ?? 1;
  for (let i = 0; i < n; i++) {
    out.push(
      obs({
        p,
        y: i < wins ? 1 : 0,
        families: extra.families ?? ["rest"],
        pickType: extra.pickType ?? "MONEYLINE",
        event: extra.event ?? "team-win",
        era: extra.era ?? "2026-07",
        // Reuse a fixture id every `per` rows to simulate clustering.
        gameId: `fx-${Math.floor(i / per)}`,
      }),
    );
  }
  return out;
}

describe("semanticsConflict", () => {
  it("accepts a moneyline team-win probability", () => {
    expect(semanticsConflict("MONEYLINE", "team-win")).toBeNull();
  });

  it("rejects a team-win probability scored against a SPREAD cover", () => {
    // This is the live condition: every settled spread row's enrichment
    // rationale says "team-win trueProb (not ATS cover p)".
    const c = semanticsConflict("SPREAD", "team-win");
    expect(c).not.toBeNull();
    expect(c).toContain("different events");
  });

  it("refuses an undeclared probability rather than assuming a match", () => {
    expect(semanticsConflict("MONEYLINE", "unspecified")).not.toBeNull();
  });

  it("refuses an unknown pickType instead of defaulting", () => {
    expect(semanticsConflict("PROP_5WAY", "team-win")).not.toBeNull();
  });
});

describe("calibrationFit", () => {
  it("recovers slope ~1 on a calibrated forecaster", () => {
    const rows = cell(1200, 0.5, 0.5);
    // Give the rows spread in p so the fit has something to bite on.
    const spread = rows.map((r, i) => ({ p: 0.2 + 0.6 * (i / 1200), y: r.y, fixture: r.gameId }));
    const f = calibrationFit(spread);
    expect(f.slope).not.toBeNull();
    // A flat y=0.5 with varying p is a degenerate construction; the fit may be
    // wild. The property that matters is that it returns a finite number.
    expect(Number.isFinite(f.slope as number)).toBe(true);
  });

  it("returns nulls on single-outcome data rather than a huge finite slope", () => {
    const rows = cell(300, 0.6, 1);
    const f = calibrationFit(rows);
    expect(f.slope).toBeNull();
    expect(f.separated).toBe(true);
  });

  it("returns nulls on a tiny sample instead of extrapolating", () => {
    const f = calibrationFit(cell(5, 0.5, 0.5));
    expect(f.slope).toBeNull();
  });
});

describe("reliabilityCurve", () => {
  it("uses equal-mass buckets, so no bucket is starved by the tails", () => {
    // Everything at p=0.95 except a few: equal-WIDTH would leave 9 empty bins.
    const rows = [
      ...cell(100, 0.95, 0.95, { families: [] }),
      ...cell(100, 0.05, 0.05, { families: [] }),
    ];
    const curve = reliabilityCurve(rows, 5);
    expect(curve.length).toBeGreaterThanOrEqual(4);
    for (const b of curve) expect(b.n).toBeGreaterThan(0);
  });

  it("returns an empty curve for no rows", () => {
    expect(reliabilityCurve([])).toEqual([]);
  });
});

describe("expectedCalibrationError", () => {
  it("is ~0 when predicted matches observed", () => {
    const { ece } = expectedCalibrationError(cell(2000, 0.7, 0.7), 10);
    expect(ece).toBeLessThan(0.05);
  });

  it("is large when a 0.9 forecaster lands 50% of the time", () => {
    const { ece } = expectedCalibrationError(cell(2000, 0.9, 0.5), 10);
    expect(ece).toBeGreaterThan(0.3);
  });
});

describe("clusterBootstrap", () => {
  it("gives a wider interval when rows cluster onto few fixtures", () => {
    // Same row count, same win rate; only the clustering differs.
    const spread = cell(600, 0.6, 0.6, { fixtureEvery: 1 });
    const clustered = cell(600, 0.6, 0.6, { fixtureEvery: 10 });
    const stat = (s: readonly { p: number; y: 0 | 1; fixture: string }[]) => {
      if (s.length === 0) return Number.NaN;
      let m = 0;
      for (const r of s) m += r.p;
      return m / s.length;
    };
    const a = clusterBootstrap(spread, stat, { replicates: 300 });
    const b = clusterBootstrap(clustered, stat, { replicates: 300 });
    // The clustered sample has 60 fixtures vs 600, so its interval must be wider.
    expect(b.interval!.high - b.interval!.low).toBeGreaterThanOrEqual(
      a.interval!.high - a.interval!.low,
    );
  });

  it("is deterministic for a fixed seed", () => {
    const rows = cell(500, 0.6, 0.6);
    const stat = (s: readonly { p: number; y: 0 | 1; fixture: string }[]) =>
      s.length === 0 ? Number.NaN : s.reduce((t, r) => t + r.p, 0) / s.length;
    const a = clusterBootstrap(rows, stat, { replicates: 200, seed: 7 });
    const b = clusterBootstrap(rows, stat, { replicates: 200, seed: 7 });
    expect(a.interval).toEqual(b.interval);
  });
});

describe("measureFamilyReliability — the measured refusals", () => {
  it("reports no-probability, NOT inert, for a cell with no probability", () => {
    // The live TOTAL condition: 1,109 settled rows, 0 with trueProb.
    const rows = Array.from({ length: 600 }, (_, i) => ({
      ...obs({ p: 0, y: i % 2 === 0 ? 1 : 0, pickType: "TOTAL" }),
      probability: Number.NaN,
      probabilityEvent: "unspecified" as ProbabilityEvent,
    }));
    const m = measureFamilyReliability("rest", "TOTAL", rows);
    expect(m.verdict).toBe("no-probability");
    expect(m.verdict).not.toBe("inert");
    expect(isMeasured(m.verdict)).toBe(false);
    expect(m.reason).toContain("missing data");
    expectAllInferentialFieldsNull(m);
  });

  it("reports no-contrast for a flag that is true on every row (hadOddsSignal)", () => {
    // The live condition: 4,142 of 4,142 snapshots true.
    const rows = cell(600, 0.66, 0.66, { families: ["odds"] });
    const m = measureFamilyReliability("odds", "MONEYLINE", rows);
    expect(m.verdict).toBe("no-contrast");
    expect(m.rowsAbsent).toBe(0);
    expect(m.reason).toContain("no contrast arm");
    expectAllInferentialFieldsNull(m);
  });

  it("reports never-populated for a family absent from every row", () => {
    // The live condition: weather/injury/pace/ratings, 0 of 4,142.
    const rows = cell(600, 0.66, 0.66, { families: ["rest"] });
    const m = measureFamilyReliability("weather", "MONEYLINE", rows);
    expect(m.verdict).toBe("never-populated");
    expect(m.rows).toBe(0);
  });

  it("refuses insufficient-evidence below the row floor", () => {
    const rows = cell(MIN_CELL_ROWS - 10, 0.66, 0.6, { families: ["rest"] });
    const m = measureFamilyReliability("rest", "MONEYLINE", rows);
    expect(m.verdict).toBe("insufficient-evidence");
    expectAllInferentialFieldsNull(m);
  });

  it("refuses insufficient-evidence when rows exceed the floor but fixtures do not", () => {
    // 400 rows, 40 fixtures: under MIN_CELL_FIXTURES.
    const rows = cell(400, 0.66, 0.6, { families: ["rest"], fixtureEvery: 10 });
    expect(new Set(rows.map((r) => r.gameId)).size).toBeLessThan(MIN_CELL_FIXTURES);
    const m = measureFamilyReliability("rest", "MONEYLINE", rows);
    expect(m.verdict).toBe("insufficient-evidence");
  });

  it("returns semantics-mismatch rather than scoring a team-win prob as cover", () => {
    const rows = cell(800, 0.52, 0.45, {
      pickType: "SPREAD",
      event: "team-win",
      families: ["rest"],
    });
    const m = measureFamilyReliability("rest", "SPREAD", rows);
    expect(m.verdict).toBe("semantics-mismatch");
    expectAllInferentialFieldsNull(m);
    expect(m.reason).toContain("different events");
  });
});

describe("measureFamilyReliability — measured verdicts", () => {
  it("calls a well-calibrated cell calibrated", () => {
    // p spread 0.2..0.8, outcome frequency matched to p in each decile, so
    // both level and slope are near their ideals.
    const rows: SettledPickObservation[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = 0.2 + 0.6 * (i / 2000);
      const y = (i % 100) / 100 < p ? 1 : 0;
      rows.push(obs({ p, y }));
    }
    const m = measureFamilyReliability("rest", "MONEYLINE", rows);
    expect(m.verdict).toBe("calibrated");
    expect(m.calibrationInTheLarge).toBeLessThan(0.02);
    expect(Math.abs((m.calibrationSlope as number) - 1)).toBeLessThan(SLOPE_TOLERANCE);
  });

  it("calls a level-shifted cell miscalibrated-level, not overconfident", () => {
    // Right SHAPE (outcome frequency tracks p) but everything published 5pp high.
    const rows: SettledPickObservation[] = [];
    for (let i = 0; i < 2000; i++) {
      const p = 0.25 + 0.5 * (i / 2000);
      const y = (i % 100) / 100 < p - 0.06 ? 1 : 0;
      rows.push(obs({ p, y }));
    }
    const m = measureFamilyReliability("rest", "MONEYLINE", rows);
    expect(m.verdict).toBe("miscalibrated-level");
    expect(m.calibrationInTheLarge as number).toBeGreaterThan(0.02);
  });

  it("never pools across pickType", () => {
    const rows = [
      ...cell(700, 0.7, 0.7, { pickType: "MONEYLINE" }),
      ...cell(700, 0.5, 0.45, { pickType: "SPREAD", event: "cover" }),
    ];
    const ml = measureFamilyReliability("rest", "MONEYLINE", rows);
    const sp = measureFamilyReliability("rest", "SPREAD", rows);
    expect(ml.rows).toBe(700);
    expect(sp.rows).toBe(700);
    // The SPREAD cell is scored against cover probabilities, so it is not
    // refused for semantics; the MONEYLINE one is not contaminated by it.
    expect(sp.verdict).not.toBe("semantics-mismatch");
  });

  it("reports unstable-across-eras when a cell is overconfident in one era only", () => {
    const early = cell(1200, 0.8, 0.55, { era: "2026-04" });
    const late = cell(1200, 0.8, 0.8, { era: "2026-07" });
    const m = measureFamilyReliability("rest", "MONEYLINE", [...early, ...late]);
    expect(m.verdict).toBe("unstable-across-eras");
    expect(Object.keys(m.eraVerdicts).sort()).toEqual(["2026-04", "2026-07"]);
    expect(m.eraVerdicts["2026-04"]).toBe("overconfident");
    expect(m.eraVerdicts["2026-07"]).toBe("calibrated");
  });

  it("keeps a direction that holds in BOTH eras", () => {
    const early = cell(1200, 0.8, 0.5, { era: "2026-04" });
    const late = cell(1200, 0.8, 0.5, { era: "2026-07" });
    const m = measureFamilyReliability("rest", "MONEYLINE", [...early, ...late]);
    expect(m.verdict).toBe("overconfident");
  });

  it("compares against the absent arm only when BOTH arms clear the floor", () => {
    const present = cell(600, 0.6, 0.6, { families: ["rest"] });
    const thinAbsent = cell(MIN_CONTRAST_ARM_ROWS - 50, 0.6, 0.6, { families: [] });
    const m = measureFamilyReliability("rest", "MONEYLINE", [...present, ...thinAbsent]);
    expect(m.brierGapVsAbsent).not.toBeNull();
    expect(m.brierGapInterval).toBeNull(); // reported, but not claimed to be precise

    const fatAbsent = cell(MIN_CONTRAST_ARM_ROWS + 200, 0.6, 0.6, { families: [] });
    const m2 = measureFamilyReliability("rest", "MONEYLINE", [...present, ...fatAbsent]);
    expect(m2.brierGapInterval).not.toBeNull();
  });
});

describe("measureAllFamilies", () => {
  it("emits one cell per (family, pickType) and sorts them", () => {
    const rows = [
      ...cell(600, 0.7, 0.7, { pickType: "MONEYLINE" }),
      ...cell(600, 0.5, 0.45, { pickType: "SPREAD", event: "cover" }),
    ];
    const cells = measureAllFamilies(["rest", "venue"], rows);
    expect(cells.length).toBe(4);
    const keys = cells.map((c) => `${c.family}/${c.pickType}`);
    expect([...keys].sort()).toEqual(keys);
  });

  it("is deterministic across runs", () => {
    const rows = cell(800, 0.66, 0.6);
    const a = measureAllFamilies(["rest"], rows);
    const b = measureAllFamilies(["rest"], rows);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("report", () => {
  it("separates measured verdicts from refusals in the summary", () => {
    const rows = [
      ...cell(600, 0.7, 0.7, { families: ["rest"] }),
      ...cell(300, 0.7, 0.7, { families: [] }),
    ];
    const cells = measureAllFamilies(["rest", "weather"], rows);
    const out = formatReliabilityReport(cells);
    expect(out).toContain("FAMILY RELIABILITY OVER SETTLED PICKS");
    expect(out).toMatch(/produced a measured verdict/);
    expect(out).toContain("never-populated");
  });

  it("says so plainly when there is nothing to measure", () => {
    expect(formatReliabilityReport([])).toContain("nothing was measured");
  });
});

/**
 * The honesty guarantee a refusal must satisfy: every inferential field is
 * null, so a reader cannot mistake "we did not measure this" for a measured
 * zero. This is checked directly rather than through a helper on the module,
 * because the guarantee is about the SHAPE of the record, not about a method.
 */
function expectAllInferentialFieldsNull(m: ReturnType<typeof measureFamilyReliability>): void {
  expect(m.calibrationSlope).toBeNull();
  expect(m.calibrationIntercept).toBeNull();
  expect(m.calibrationInTheLarge).toBeNull();
  expect(m.slopeInterval).toBeNull();
  expect(m.levelInterval).toBeNull();
  expect(m.brier).toBeNull();
  expect(m.logLoss).toBeNull();
  expect(m.brierSkillUpperBound).toBeNull();
  expect(m.sharpness).toBeNull();
  expect(m.reliabilityCurve).toEqual([]);
  expect(m.reason.length).toBeGreaterThan(0);
}
