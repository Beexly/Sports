import { describe, expect, it } from "vitest";
import { forecastSkillEProcess } from "../forecast-skill-eprocess.js";
import {
  ShadowCalibrationEProcess,
  scoreWouldHavePublishedShadowEProcess,
  type ShadowObservation,
} from "../shadow-calibration-eprocess.js";

const GROUPS = [
  { sport: "NFL", market: "SPREAD" },
  { sport: "MLB", market: "TOTAL" },
] as const;

function row(overrides: Partial<ShadowObservation> = {}): ShadowObservation {
  return {
    sequence: 1,
    eventId: "event-1",
    sport: "NFL",
    market: "SPREAD",
    modelProbability: 0.56,
    closeProbability: 0.5,
    outcome: 1,
    publicationState: "suppressed",
    ...overrides,
  };
}

function rows(count: number, overrides: Partial<ShadowObservation> = {}): ShadowObservation[] {
  return Array.from({ length: count }, (_, index) =>
    row({
      sequence: index + 1,
      eventId: `event-${index + 1}`,
      ...overrides,
    }),
  );
}

describe("ShadowCalibrationEProcess", () => {
  it("is disabled and returns no gate action for an empty fixed-group ledger", () => {
    const result = scoreWouldHavePublishedShadowEProcess([], { groups: GROUPS });
    expect(result).not.toBeNull();
    expect(result!.enabled).toBe(false);
    expect(result!.mode).toBe("shadow-only");
    expect(result!.gateAction).toBe("none");
    expect(result!.registeredGroupCount).toBe(2);
    expect(result!.n).toBe(0);
    expect(result!.shadowVerdict).toBe("no-observations");
    expect(result!.mixture.maxM).toBe(1);
  });

  it("reuses the existing forecast-dominance log factor", () => {
    const observation = row({ modelProbability: 0.73, closeProbability: 0.41, outcome: 0 });
    const shadow = scoreWouldHavePublishedShadowEProcess([observation], { groups: GROUPS })!;
    const direct = forecastSkillEProcess(
      [{ p: observation.modelProbability, m: observation.closeProbability, y: observation.outcome }],
      { minPicks: 1 },
    )!;
    expect(shadow.groups[0]!.logM).toBeCloseTo(direct.logM, 12);
    expect(shadow.groups[0]!.n).toBe(1);
  });

  it("scores suppressed would-have-published rows and excludes no-bet rows", () => {
    const observations = [
      ...rows(30, { publicationState: "suppressed" }),
      row({
        sequence: 31,
        eventId: "no-bet",
        modelProbability: 0,
        closeProbability: 0.5,
        outcome: 0,
        publicationState: "not-would-have-published",
      }),
    ];
    const result = scoreWouldHavePublishedShadowEProcess(observations, { groups: [GROUPS[0]] })!;
    expect(result.totalObservations).toBe(31);
    expect(result.wouldHavePublishedCount).toBe(30);
    expect(result.suppressedCount).toBe(30);
    expect(result.excludedCount).toBe(1);
    expect(result.n).toBe(30);
    expect(result.groups[0]!.n).toBe(30);
    expect(result.mixture.maxM).toBeGreaterThan(20);
  });

  it("uses M >= 20 for publishable shadow and M >= 100 for claim-eligible shadow", () => {
    const publishable = scoreWouldHavePublishedShadowEProcess(
      rows(30, { modelProbability: 0.56 }),
      { groups: [GROUPS[0]] },
    )!;
    expect(publishable.mixture.publishableShadow).toBe(true);
    expect(publishable.mixture.claimEligibleShadow).toBe(false);
    expect(publishable.shadowVerdict).toBe("publishable-shadow");
    expect(publishable.mixture.anytimeValidPValue).toBeLessThanOrEqual(0.05);

    const claimEligible = scoreWouldHavePublishedShadowEProcess(
      rows(30, { modelProbability: 0.595 }),
      { groups: [GROUPS[0]] },
    )!;
    expect(claimEligible.mixture.publishableShadow).toBe(true);
    expect(claimEligible.mixture.claimEligibleShadow).toBe(true);
    expect(claimEligible.shadowVerdict).toBe("claim-eligible-shadow");
    expect(claimEligible.mixture.anytimeValidPValue).toBeLessThanOrEqual(0.01);
  });

  it("uses a fixed equal-weight mixture across pre-registered sport-market groups", () => {
    const observations = [
      ...rows(15, { modelProbability: 0.56 }).map((observation, index) => ({
        ...observation,
        eventId: `nfl-${index + 1}`,
      })),
      ...rows(15, { sport: "MLB", market: "TOTAL", modelProbability: 0.5 }).map(
        (observation, index) => ({
          ...observation,
          eventId: `mlb-${index + 1}`,
        }),
      ),
    ].map((observation, index) => ({ ...observation, sequence: index + 1 }));
    const result = scoreWouldHavePublishedShadowEProcess(observations, { groups: GROUPS })!;
    const nfl = result.groups.find((group) => group.key.includes("NFL"))!;
    const mlb = result.groups.find((group) => group.key.includes("MLB"))!;
    expect(nfl.weight).toBe(0.5);
    expect(mlb.weight).toBe(0.5);
    expect(nfl.n).toBe(15);
    expect(mlb.n).toBe(15);
    expect(nfl.publishableShadow).toBe(false);
    expect(mlb.publishableShadow).toBe(false);
    expect(result.mixture.maxM).toBeCloseTo((nfl.maxM + mlb.maxM) / 2, 10);
    expect(result.shadowVerdict).toBe("collecting");
  });

  it("refuses unknown groups, duplicate event rows, and non-increasing settlement order", () => {
    const unknownGroup = [row({ sport: "NBA", market: "SPREAD" })];
    expect(scoreWouldHavePublishedShadowEProcess(unknownGroup, { groups: GROUPS })).toBeNull();

    const duplicate = [row({ sequence: 1 }), row({ sequence: 2 })];
    expect(scoreWouldHavePublishedShadowEProcess(duplicate, { groups: GROUPS })).toBeNull();

    const outOfOrder = [row({ sequence: 2, eventId: "a" }), row({ sequence: 1, eventId: "b" })];
    expect(scoreWouldHavePublishedShadowEProcess(outOfOrder, { groups: GROUPS })).toBeNull();
    expect(scoreWouldHavePublishedShadowEProcess([row()], { groups: [] })).toBeNull();
  });

  it("exposes the same shadow-only entry point through the class facade", () => {
    const result = ShadowCalibrationEProcess.evaluate(rows(30), { groups: GROUPS });
    expect(result!.enabled).toBe(ShadowCalibrationEProcess.ENABLED);
    expect(result!.gateAction).toBe("none");
    expect(result!.publishableThreshold).toBe(20);
    expect(result!.claimEligibleThreshold).toBe(100);
  });
});
