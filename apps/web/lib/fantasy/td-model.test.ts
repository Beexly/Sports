import { describe, expect, it } from "vitest";
import {
  TD_LOGISTIC,
  TD_WEIGHTS,
  americanToDecimal,
  americanToProb,
  calibrate,
  fairProb,
  gradeTdScorers,
  illustrativeTdInputs,
  percentiles,
  rankByEdge,
  type TdInputs,
} from "@/lib/fantasy/td-model";
import { PLAYERS } from "@/lib/fantasy/players";

const full = (over: Partial<TdInputs> = {}): TdInputs => ({
  playerId: "p1",
  name: "Test Back",
  pos: "RB",
  team: "KC",
  seasonTdRate: 0.5,
  redZoneShare: 0.5,
  goalLineShare: 0.5,
  teamTotal: 28,
  ...over,
});

describe("td-model — formula provenance", () => {
  it("publishes the TD-Board weights and they sum to 1", () => {
    expect(TD_WEIGHTS.seasonHit).toBe(0.4);
    expect(TD_WEIGHTS.redZone).toBe(0.2);
    expect(TD_WEIGHTS.goalLine).toBe(0.2);
    expect(TD_WEIGHTS.teamTotal).toBe(0.2);
    const sum = Object.values(TD_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("applies the published weights to the composite", () => {
    // All four components present on equal footing → score is the weighted mean.
    const slate = [
      full({ playerId: "a", seasonTdRate: 0.5, redZoneShare: 1, goalLineShare: 1, teamTotal: 35 }),
      full({ playerId: "b", seasonTdRate: 0, redZoneShare: 0, goalLineShare: 0, teamTotal: 21 }),
    ];
    const [a] = gradeTdScorers(slate);
    expect(a?.score).toBeCloseTo(1, 6);
    expect(a?.missing).toEqual([]);
    expect(a?.partial).toBe(false);
  });
});

describe("td-model — honesty rules", () => {
  it("reports a missing component and renormalizes instead of backfilling", () => {
    const [g] = gradeTdScorers([
      full({ teamTotal: undefined, seasonTdRate: 0.5, redZoneShare: 1, goalLineShare: 1 }),
    ]);
    expect(g?.missing).toEqual(["teamTotal"]);
    expect(g?.partial).toBe(true);
    // Present weights were .4+.2+.2 = .8 → renormalized to sum to 1.
    const applied = (g?.components ?? []).reduce((s, c) => s + c.appliedWeight, 0);
    expect(applied).toBeCloseTo(1, 10);
    expect(g?.score).toBeCloseTo(1, 6); // all present components maxed
    expect(g?.note).toContain("not backfilled");
  });

  it("emits edge: null when no market price is supplied", () => {
    const [g] = gradeTdScorers([full()]);
    expect(g?.marketProb).toBeNull();
    expect(g?.edge).toBeNull();
  });

  it("never states a 0% or 100% probability", () => {
    const grades = gradeTdScorers([
      full({ playerId: "a", seasonTdRate: 9, redZoneShare: 9, goalLineShare: 9, teamTotal: 99 }),
      full({ playerId: "b", seasonTdRate: -5, redZoneShare: -5, goalLineShare: -5, teamTotal: -99 }),
    ]);
    for (const g of grades) {
      expect(g.prob).toBeGreaterThan(0);
      expect(g.prob).toBeLessThan(1);
    }
  });

  it("carries every component with its weight so the score is recomputable", () => {
    const [g] = gradeTdScorers([full()]);
    const recomputed = (g?.components ?? []).reduce(
      (s, c) => s + c.normalized * c.appliedWeight,
      0,
    );
    expect(recomputed).toBeCloseTo(g?.score ?? 0, 10);
    expect(g?.note).toContain(`×${TD_LOGISTIC.slope}`);
  });

  it("clamps out-of-range shares rather than trusting them", () => {
    const [g] = gradeTdScorers([full({ redZoneShare: 50 })]);
    const rz = g?.components.find((c) => c.key === "redZone");
    expect(rz?.normalized).toBe(1);
  });
});

describe("td-model — market math", () => {
  it("converts american odds to implied probability", () => {
    expect(americanToProb(100)).toBeCloseTo(0.5, 10);
    expect(americanToProb(-200)).toBeCloseTo(2 / 3, 10);
    expect(americanToProb(250)).toBeCloseTo(100 / 350, 10);
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 10);
    expect(americanToDecimal(250)).toBeCloseTo(3.5, 10);
  });

  it("throws on zero or non-finite odds instead of guessing", () => {
    expect(() => americanToProb(0)).toThrow();
    expect(() => americanToProb(Number.NaN)).toThrow();
  });

  it("strips vig only when a counter price is supplied", () => {
    const single = fairProb(120);
    expect(single.deVigged).toBe(false);
    expect(single.prob).toBeCloseTo(americanToProb(120), 10);

    const pair = fairProb(-110, -110);
    expect(pair.deVigged).toBe(true);
    expect(pair.prob).toBeCloseTo(0.5, 10);
  });

  it("computes edge as prob − vig-stripped market prob", () => {
    const [g] = gradeTdScorers([
      full({ seasonTdRate: 0.5, redZoneShare: 1, goalLineShare: 1, teamTotal: 35, priceAmerican: -110, counterPriceAmerican: -110 }),
    ]);
    expect(g?.marketProb).toBeCloseTo(0.5, 10);
    expect(g?.edge).toBeCloseTo((g?.prob ?? 0) - 0.5, 10);
  });
});

describe("td-model — ranking", () => {
  it("sorts priced rows by edge desc and keeps unpriced rows last", () => {
    const grades = gradeTdScorers([
      full({ playerId: "unpriced" }),
      full({ playerId: "low", priceAmerican: 500, counterPriceAmerican: -700 }),
      full({ playerId: "high", priceAmerican: 150, counterPriceAmerican: -180 }),
    ]);
    const ranked = rankByEdge(grades);
    expect(ranked[ranked.length - 1]?.playerId).toBe("unpriced");
    const priced = ranked.filter((g) => g.edge !== null);
    expect(priced.length).toBe(2);
    expect(priced[0]!.edge!).toBeGreaterThanOrEqual(priced[1]!.edge!);
  });
});

describe("td-model — calibration and proxies", () => {
  it("logistic is monotonic and centered at 0.5", () => {
    expect(calibrate(0.5)).toBeCloseTo(0.5, 10);
    expect(calibrate(0.9)).toBeGreaterThan(calibrate(0.6));
    expect(calibrate(0.1)).toBeLessThan(calibrate(0.4));
  });

  it("percentiles rank min at 0 and max at 1 with ties sharing a rank", () => {
    expect(percentiles([10, 20, 30])).toEqual([0, 0.5, 1]);
    expect(percentiles([5, 5, 9])[0]).toBe(percentiles([5, 5, 9])[1]);
    expect(percentiles([])).toEqual([]);
    expect(percentiles([7])).toEqual([0.5]);
  });

  it("derives proxy inputs from the illustrative pool with no market or team total", () => {
    const rows = illustrativeTdInputs();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBe(PLAYERS.filter((p) => p.injury !== "out").length);
    for (const r of rows) {
      expect(r.teamTotal).toBeUndefined();
      expect(r.priceAmerican).toBeUndefined();
      expect(r.seasonTdRate).toBeGreaterThanOrEqual(0);
      expect(r.seasonTdRate).toBeLessThanOrEqual(0.5);
    }
    // Injured-out players are excluded from the board.
    const out = PLAYERS.filter((p) => p.injury === "out").map((p) => p.id);
    for (const id of out) expect(rows.find((r) => r.playerId === id)).toBeUndefined();
  });

  it("grades the illustrative pool without inventing an edge", () => {
    const grades = rankByEdge(gradeTdScorers(illustrativeTdInputs()));
    expect(grades.length).toBeGreaterThan(0);
    expect(grades.every((g) => g.edge === null)).toBe(true);
    expect(grades.every((g) => g.partial)).toBe(true); // teamTotal always absent
    for (const g of grades) {
      expect(Number.isFinite(g.prob)).toBe(true);
      expect(g.prob).toBeGreaterThan(0);
      expect(g.prob).toBeLessThan(1);
    }
  });
});