import { describe, expect, it } from "vitest";
import {
  planAutonomyCycle,
  autonomyActionsAsJarvisNext,
  type AutonomyObservation,
} from "@/lib/autonomy/operating-kernel";
import {
  settlementsToLearningSamples,
  summarizeLearningBatch,
  sourceTrustDirective,
} from "@/lib/autonomy/settlement-learning";

function baseObs(over: Partial<AutonomyObservation> = {}): AutonomyObservation {
  return {
    observedAt: "2026-08-06T02:00:00.000Z",
    deploymentSha: "addbec0",
    databaseOk: true,
    ingestionOk: true,
    ingestionAgeMinutes: 30,
    settlementBand: "HEALTHY",
    settlementOverdue: 0,
    settlementCommenced: 40,
    topRcaCause: null,
    rcaHeadline: null,
    stpAutoEligible: 0,
    stpExceptions: 0,
    burnDraining: true,
    liveBoardEnabled: false,
    publicPicksEnabled: false,
    performanceStatsEnabled: false,
    publishLedgerEnabled: false,
    draftOnly: true,
    boardSuppressed: true,
    openPicks: 0,
    canonicalSettled: 12,
    minSettledForLearning: 100,
    ...over,
  };
}

describe("autonomy operating kernel", () => {
  it("P0 plan when settlement critically behind", () => {
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 17,
        settlementCommenced: 50,
        topRcaCause: "OVERDUE_NO_SCORE",
        rcaHeadline: "17 overdue — top OVERDUE_NO_SCORE",
        burnDraining: false,
      }),
    );
    expect(plan.severity).toBe("P0");
    expect(plan.autonomousQueue.some((a) => a.kind === "RUN_FREE_SETTLE")).toBe(true);
    expect(plan.autonomousQueue.some((a) => a.kind === "ATTACK_RCA_WAVE_A")).toBe(true);
    expect(plan.introspection.refuseDefaultHeld).toBe(true);
    expect(plan.revenueReadiness.trackRecordReady).toBe(false);
    expect(plan.revenueReadiness.blockers.length).toBeGreaterThan(0);
  });

  it("never marks revenue ready with open public gates + empty sample", () => {
    const plan = planAutonomyCycle(
      baseObs({
        liveBoardEnabled: true,
        publicPicksEnabled: true,
        settlementBand: "CRITICAL",
        settlementOverdue: 9,
        boardSuppressed: true,
        canonicalSettled: 0,
      }),
    );
    expect(plan.ownerQueue.some((a) => a.kind === "HOLD_PUBLIC_GATES")).toBe(true);
    expect(plan.introspection.contradictions.length).toBeGreaterThan(0);
    expect(plan.introspection.honestyScore).toBeLessThan(80);
  });

  it("healthy refuse-default system still accumulates sample", () => {
    const plan = planAutonomyCycle(baseObs());
    expect(plan.severity === "P1" || plan.severity === "P2" || plan.severity === "OK").toBe(true);
    expect(plan.actions.some((a) => a.kind === "ACCUMULATE_SETTLED_SAMPLE")).toBe(true);
    expect(plan.introspection.refuseDefaultHeld).toBe(true);
    const jarvis = autonomyActionsAsJarvisNext(plan, 3);
    expect(jarvis.length).toBeGreaterThan(0);
    expect(jarvis[0]).toMatch(/^\[/);
  });

  it("path misconfig is owner P0", () => {
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 6,
        topRcaCause: "PATH_MISCONFIG",
      }),
    );
    const fix = plan.ownerQueue.find((a) => a.kind === "FIX_PATH_MISCONFIG");
    expect(fix).toBeDefined();
    expect(fix!.requiresOwner).toBe(true);
  });

  // I2 freshness self-heal: age > 90m queues durable free-spine SUCCESS stamp (I3/I8).
  it("stale free-spine ingestion queues autonomous RUN_FREE_SPINE_HEALTH (I2/I8)", () => {
    const plan = planAutonomyCycle(
      baseObs({
        ingestionOk: true,
        ingestionAgeMinutes: 140,
        settlementBand: "HEALTHY",
        settlementOverdue: 0,
      }),
    );
    expect(plan.severity === "P1" || plan.severity === "P0").toBe(true);
    const spine = plan.autonomousQueue.find((a) => a.kind === "RUN_FREE_SPINE_HEALTH");
    expect(spine).toBeDefined();
    expect(spine!.autonomousSafe).toBe(true);
    expect(spine!.requiresOwner).toBe(false);
    expect(spine!.target).toBe("/api/cron/free-spine-health");
  });

  // LAWS: never suggest flipping public gates from the autonomous queue.
  it("closed public gates stay HOLD only — no autonomous gate flip (LAWS)", () => {
    const plan = planAutonomyCycle(baseObs({ liveBoardEnabled: false, publicPicksEnabled: false }));
    expect(plan.introspection.refuseDefaultHeld).toBe(true);
    expect(
      plan.autonomousQueue.every(
        (a) =>
          a.kind !== "HOLD_PUBLIC_GATES" ||
          a.detail.includes("closed") ||
          a.severity === "OK",
      ),
    ).toBe(true);
    expect(plan.actions.some((a) => a.kind === "HOLD_PUBLIC_GATES" && a.requiresOwner)).toBe(
      false,
    );
  });
});

describe("settlement learning loop", () => {
  it("excludes push/void/disputed/seed from calibration eligibility", () => {
    const samples = settlementsToLearningSamples([
      {
        pickId: "1",
        sportKey: "nfl",
        pickType: "SPREAD",
        modelVersion: "v5.1.0",
        result: "WIN",
        confirmation: "CONFIRMED",
        modelEdge: 0.04,
        clv: 0.01,
        settledAtIso: "2026-08-01T00:00:00.000Z",
      },
      {
        pickId: "2",
        sportKey: "nba",
        pickType: "SPREAD",
        modelVersion: "v5.1.0",
        result: "LOSS",
        confirmation: "SINGLE_SOURCE",
        modelEdge: 0.02,
        clv: -0.01,
        settledAtIso: "2026-08-01T00:00:00.000Z",
      },
      {
        pickId: "3",
        sportKey: "nba",
        pickType: "TOTAL",
        modelVersion: "v5.1.0",
        result: "PUSH",
        confirmation: "CONFIRMED",
        modelEdge: 0.01,
        clv: 0,
        settledAtIso: "2026-08-01T00:00:00.000Z",
      },
      {
        pickId: "4",
        sportKey: "nba",
        pickType: "ML",
        modelVersion: "seed-demo",
        result: "WIN",
        confirmation: "CONFIRMED",
        modelEdge: 0.1,
        clv: 0.05,
        settledAtIso: "2026-08-01T00:00:00.000Z",
      },
      {
        pickId: "5",
        sportKey: "mlb",
        pickType: "SPREAD",
        modelVersion: "v5.1.0",
        result: "WIN",
        confirmation: "DISPUTED",
        modelEdge: 0.03,
        clv: 0.02,
        settledAtIso: "2026-08-01T00:00:00.000Z",
      },
    ]);
    const report = summarizeLearningBatch(samples);
    expect(report.nEligible).toBe(2);
    expect(report.winRateEligible).toBe(0.5);
    expect(report.directives.some((d) => d.includes("sample_floor"))).toBe(true);
  });

  it("flags high single-source share", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      pickId: String(i),
      sportKey: "nfl",
      pickType: "SPREAD",
      modelVersion: "v5.1.0",
      result: "WIN" as const,
      confirmation: (i < 6 ? "SINGLE_SOURCE" : "CONFIRMED") as "SINGLE_SOURCE" | "CONFIRMED",
      modelEdge: 0.02,
      clv: 0.01,
      settledAtIso: "2026-08-01T00:00:00.000Z",
    }));
    const d = sourceTrustDirective(rows);
    expect(d.singleSourceShare).toBe(0.6);
    expect(d.directive).toMatch(/high_single_source/);
  });
});
