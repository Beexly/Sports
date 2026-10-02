/**
 * The per-key scale + weight fit.
 *
 * Three properties are worth pinning, and they are the three that were broken
 * before this module existed:
 *
 *  1. A uniform weight over incomparable scales is the defect, and normalization
 *     is what removes it. Ten keys measured in different units (raw sd from
 *     0.093 to 9.63 on prod) must land on ONE comparable scale, so that a
 *     `target_share` reading and a `passing_epa` reading can be blended at all.
 *  2. The weight is fitted WITHIN player. A key whose raw correlation is
 *     dominated by player identity must NOT earn a weight from it — this is the
 *     exact failure measured on prod, where pgs.fantasy_ppr scores 0.373
 *     between players and 0.094 within one.
 *  3. No evidence means weight 0, never a plausible-looking constant. A key
 *     below the fixture floor, or one whose outcome does not join, is reported
 *     with a reason.
 */

import { describe, it, expect } from "vitest";
import {
  fitSignalScales,
  formatScaleReport,
  normalizeWithScale,
  MIN_SCALE_FIXTURES,
  type SignalOutcomeObservation,
} from "../signal-scale-fit.js";

const KEYS = ["k.narrow", "k.wide", "k.identity", "k.thin", "k.unjoinable"];

/** A raw reading drawn from a population with the given mean/sd. */
function readings(mean: number, sd: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Deterministic, spread across roughly +/- 2.5 sd with no RNG.
    const t = ((i * 37) % n) / n;
    out.push(mean + sd * (2 * (t - 0.5) * 2.5));
  }
  return out;
}

function obs(key: string, values: readonly number[]): { key: string; value: number }[] {
  return values.map((value) => ({ key, value }));
}

/** Outcome rows across `fixtures` independent games and `players` players. */
function outcomes(
  key: string,
  valueOf: (player: number, week: number) => number,
  outcomeOf: (player: number, week: number) => 0 | 1,
  players: number,
  fixtures: number,
): SignalOutcomeObservation[] {
  const out: SignalOutcomeObservation[] = [];
  for (let f = 0; f < fixtures; f++) {
    for (let p = 0; p < players; p++) {
      out.push({
        key,
        entityId: `p${p}`,
        fixtureKey: `f${f}`,
        value: valueOf(p, f),
        outcome: outcomeOf(p, f),
      });
    }
  }
  return out;
}

describe("fitSignalScales — the shared scale", () => {
  it("puts a narrow-scale and a wide-scale key on ONE comparable scale", () => {
    // Deliberately the prod shape: k.narrow has sd 0.1 and k.wide sd 10, so
    // before normalization a wide reading outvotes a narrow one 100:1.
    const narrow = readings(0.1, 0.1, 200);
    const wide = readings(5, 10, 200);
    const table = fitSignalScales({
      keys: KEYS,
      observations: [...obs("k.narrow", narrow), ...obs("k.wide", wide)],
    });

    const n = table.anchors["k.narrow"];
    const w = table.anchors["k.wide"];
    expect(n).toBeDefined();
    expect(w).toBeDefined();

    // Same standardized magnitude => the same normalized reading. This is the
    // property that makes a composite over the two keys mean anything.
    const nUp = normalizeWithScale(n!.anchor + n!.spread, table.scales.find((s) => s.key === "k.narrow")!);
    const wUp = normalizeWithScale(w!.anchor + w!.spread, table.scales.find((s) => s.key === "k.wide")!);
    expect(nUp).toBeCloseTo(0.5, 6);
    expect(wUp).toBeCloseTo(0.5, 6);
  });

  it("refuses an anchor for a key below the row floor rather than defaulting it", () => {
    const table = fitSignalScales({
      keys: ["k.thin"],
      observations: obs("k.thin", readings(1, 1, 5)),
      minRows: 30,
    });
    expect(table.anchors["k.thin"]).toBeUndefined();
    expect(table.scales[0]?.verdict).toBe("no-readings");
    // No scale => no normalized value. Returning null is what makes the writer
    // drop the row instead of writing a raw number into `value`.
    expect(normalizeWithScale(1, table.scales[0])).toBeNull();
  });

  it("normalizes the anchor to exactly 0 and clamps outside +/-1", () => {
    const scale = fitSignalScales({
      keys: ["k.narrow"],
      observations: obs("k.narrow", readings(2, 0.5, 200)),
    }).scales[0]!;
    expect(normalizeWithScale(scale.anchor, scale)).toBe(0);
    expect(normalizeWithScale(scale.anchor + 40 * scale.spread, scale)).toBe(1);
    expect(normalizeWithScale(scale.anchor - 40 * scale.spread, scale)).toBe(-1);
  });
});

describe("fitSignalScales — the weight is fitted WITHIN player", () => {
  it("gives near-zero weight to a pure IDENTITY signal and real weight to a predictive one", () => {
    // k.identity: each player has a fixed level, and outcome depends ONLY on
    // that level. Between players this looks perfectly predictive; within a
    // player it carries no information at all — which is the prod trap
    // (pgs.fantasy_ppr: between_r 0.373, within_r 0.094).
    //
    // k.predictive: outcome depends on the reading's deviation from that
    // player's own mean, so the within-player signal is real.
    const levels = 40;
    const fixtures = 200;

    const identityRows = outcomes(
      "k.identity",
      (p) => p / levels, // fixed per-player level, constant across weeks
      (p) => (p / levels > 0.5 ? 1 : 0),
      levels,
      fixtures,
    );
    const predictiveRows = outcomes(
      "k.predictive",
      (p, f) => p / levels + Math.sin(f) * 0.4, // varies within a player
      (p, f) => (Math.sin(f) > 0 ? 1 : 0),
      levels,
      fixtures,
    );

    const table = fitSignalScales({
      keys: ["k.identity", "k.predictive"],
      observations: [
        ...obs("k.identity", identityRows.map((r) => r.value)),
        ...obs("k.predictive", predictiveRows.map((r) => r.value)),
      ],
      outcomes: [...identityRows, ...predictiveRows],
    });

    const identity = table.scales.find((s) => s.key === "k.identity")!;
    const predictive = table.scales.find((s) => s.key === "k.predictive")!;

    // The identity key LOOKS strong between players...
    expect(Math.abs(identity.betweenCorrelation)).toBeGreaterThan(0.8);
    // ...and within a player it is exactly constant, so the residual carries no
    // information and the weight collapses to zero. This is the prod trap:
    // pgs.fantasy_ppr measured between_r 0.373 against within_r 0.094.
    expect(Math.abs(identity.withinCorrelation)).toBeLessThan(1e-9);
    expect(identity.weight).toBe(0);
    // The genuinely predictive key earns real weight.
    expect(predictive.weight).toBeGreaterThan(0.5);
    expect(predictive.withinCorrelation).toBeGreaterThan(0.5);
  });

  it("preserves the sign of an anti-predictive key instead of dropping it", () => {
    // Outcome is the OPPOSITE of the reading's within-player deviation.
    const rows = outcomes(
      "k.anti",
      (p, f) => p / 20 + Math.sin(f) * 0.5,
      (_p, f) => (Math.sin(f) < 0 ? 1 : 0),
      20,
      150,
    );
    const table = fitSignalScales({
      keys: ["k.anti"],
      observations: obs("k.anti", rows.map((r) => r.value)),
      outcomes: rows,
    });
    const anti = table.scales[0]!;
    expect(anti.withinCorrelation).toBeLessThan(0);
    expect(anti.weight).toBeLessThan(0);
    expect(anti.verdict).toBe("earned");
  });
});

describe("fitSignalScales — no evidence means weight 0", () => {
  it("refuses a key below the fixture floor however many ROWS it has", () => {
    // 2,000 rows but only 3 independent games. The rows inside one game are one
    // observation of evidence, not 700 — this is the fixture-not-row law.
    const rows = outcomes("k.thin", (p, f) => p + f, (p, f) => (p + f) % 2, 700, 3);
    expect(rows.length).toBe(2100);

    const table = fitSignalScales({
      keys: ["k.thin"],
      observations: obs("k.thin", rows.map((r) => r.value)),
      outcomes: rows,
    });
    const thin = table.scales[0]!;
    expect(thin.fixtures).toBe(3);
    expect(thin.weight).toBe(0);
    expect(thin.verdict).toBe("insufficient-fixtures");
    expect(thin.reason).toContain(String(MIN_SCALE_FIXTURES));
  });

  it("refuses a key whose outcome does not join, and says so", () => {
    const table = fitSignalScales({
      keys: ["k.unjoinable"],
      observations: obs("k.unjoinable", readings(1, 1, 500)),
      // No outcomes supplied at all — exactly the prod situation for the four
      // ngs.* keys, whose gsisId joins no playerId.
    });
    const key = table.scales[0]!;
    expect(key.n).toBe(500);
    expect(key.weight).toBe(0);
    expect(key.verdict).toBe("unjoinable-outcome");
    expect(key.reason).toContain("not a guess");
  });

  it("never emits a non-finite or negative-magnitude weight", () => {
    const rows = outcomes("k.a", (p, f) => p * 0.01 + f * 0.01, (p, f) => (p + f) % 2, 50, 120);
    const table = fitSignalScales({
      keys: ["k.a"],
      observations: obs("k.a", rows.map((r) => r.value)),
      outcomes: rows,
    });
    for (const s of table.scales) {
      expect(Number.isFinite(s.weight)).toBe(true);
      expect(Math.abs(s.weight)).toBeLessThanOrEqual(1);
    }
  });
});

describe("fitSignalScales — determinism and reporting", () => {
  const build = () =>
    fitSignalScales({
      keys: KEYS,
      observations: obs("k.narrow", readings(1, 1, 120)),
      outcomes: outcomes("k.narrow", (p, f) => p + f, (p, f) => (p + f) % 2, 30, 120),
    });

  it("produces byte-identical output for identical input", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  it("sorts by key so a refit is a reviewable diff", () => {
    const keys = build().scales.map((s) => s.key);
    expect(keys).toEqual([...keys].sort());
  });

  it("reports every key, with a reason for every zero", () => {
    const report = formatScaleReport(build());
    expect(report).toContain("k.narrow");
    for (const key of KEYS) expect(report).toContain(key);
  });

  it("ignores a non-finite reading instead of poisoning the census", () => {
    const table = fitSignalScales({
      keys: ["k.narrow"],
      observations: [
        ...obs("k.narrow", readings(1, 1, 120)),
        { key: "k.narrow", value: Number.NaN },
        { key: "k.narrow", value: Number.POSITIVE_INFINITY },
      ],
    });
    expect(Number.isFinite(table.scales[0]!.anchor)).toBe(true);
    expect(table.scales[0]!.n).toBe(120);
  });
});
