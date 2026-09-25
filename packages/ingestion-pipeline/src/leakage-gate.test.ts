import { describe, expect, it } from "vitest";
import {
  assertLeakageGate,
  fixtureFromGameRows,
  runLeakageGate,
} from "./leakage-gate.js";

const cleanFixture = fixtureFromGameRows([
  {
    gameId: "g1",
    season: 2025,
    week: 5,
    team: "KC",
    opponent: "BUF",
    isHome: true,
    ratingBefore: 1520,
    ratingAfter: 1550,
    snapSharePriorWeeks: 0.82,
    snapShareCurrentWeek: 0.85,
    marketSpread: -3,
    predictedMargin: 4,
    label: 1,
  },
]);

const contaminatedFixture = fixtureFromGameRows([
  {
    gameId: "g1",
    season: 2025,
    week: 5,
    team: "KC",
    opponent: "BUF",
    isHome: true,
    // contaminated: ratingBefore overwritten with future ratingAfter
    ratingBefore: 1550,
    ratingAfter: 1550,
    snapSharePriorWeeks: 0.82,
    snapShareCurrentWeek: 0.85,
    marketSpread: -3,
    predictedMargin: 4,
    label: 1,
  },
]);

const cleanBuilder = (games: readonly { ratingBefore: number; snapSharePriorWeeks: number | null }[]) => ({
  rating: games.map((g) => g.ratingBefore),
  snapShare: games.map((g) => g.snapSharePriorWeeks ?? 0),
});

describe("leakage-gate", () => {
  it("passes when clean fixture == contaminated fixture", () => {
    const r = runLeakageGate({
      featureBuilder: cleanBuilder as never,
      cleanFixture: cleanFixture as never,
      contaminatedFixture: cleanFixture as never,
      signFixture: cleanFixture as never,
    });
    expect(r.ok).toBe(true);
    expect(r.suite.allClean).toBe(true);
    expect(r.suite.probes).toHaveLength(3);
  });

  it("fail-closes when contaminated fixture changes ratingBefore", () => {
    const r = runLeakageGate({
      featureBuilder: cleanBuilder as never,
      cleanFixture: cleanFixture as never,
      contaminatedFixture: contaminatedFixture as never,
      signFixture: cleanFixture as never,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("LEAKAGE DETECTED");
      expect(r.failures.length).toBeGreaterThan(0);
    }
  });

  it("assertLeakageGate throws on leak and passes when clean", () => {
    expect(() =>
      assertLeakageGate({
        featureBuilder: cleanBuilder as never,
        cleanFixture: cleanFixture as never,
        contaminatedFixture: cleanFixture as never,
        signFixture: cleanFixture as never,
      }),
    ).not.toThrow();

    expect(() =>
      assertLeakageGate({
        featureBuilder: cleanBuilder as never,
        cleanFixture: cleanFixture as never,
        contaminatedFixture: contaminatedFixture as never,
        signFixture: cleanFixture as never,
      }),
    ).toThrow(/LEAKAGE DETECTED/);
  });

  it("fixtureFromGameRows never invents future data", () => {
    const f = fixtureFromGameRows([
      {
        gameId: "g1",
        season: 2026,
        week: 1,
        team: "A",
        opponent: "B",
        isHome: false,
        ratingBefore: null,
        ratingAfter: null,
        snapSharePriorWeeks: null,
        snapShareCurrentWeek: null,
        marketSpread: 3,
        predictedMargin: -1,
        label: 0,
      },
    ]);
    expect(f[0]!.ratingBefore).toBe(1500);
    expect(f[0]!.snapSharePriorWeeks).toBeNull();
  });
});
