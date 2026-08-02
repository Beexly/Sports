import { describe, expect, it } from "vitest";
import {
  aggregateSettlementRca,
  classifySettlementRootCause,
  buildCausePareto,
} from "@/lib/settlement/root-cause-analysis";
import {
  computeBurnRate,
  decideStpAction,
  planClearanceWaves,
  stpLoadPriority,
  DEFAULT_STP_POLICY,
} from "@/lib/settlement/stp-clearance";

describe("settlement root-cause analysis", () => {
  it("classifies overdue with no final as OVERDUE_NO_SCORE (wave A)", () => {
    const f = classifySettlementRootCause({
      pickId: "p1",
      sportKey: "americanfootball_nfl",
      ageHours: 12,
      graceHours: 6,
      outcomeStatus: "PENDING",
      pendingReason: "NO_FINAL",
    });
    expect(f.code).toBe("OVERDUE_NO_SCORE");
    expect(f.overdue).toBe(true);
    expect(f.clearanceWave).toBe("A");
    expect(f.category).toBe("DATA_SOURCE");
    expect(f.fiveWhys.length).toBe(5);
    expect(f.remediation.length).toBeGreaterThan(0);
  });

  it("classifies DISPUTED as wave C exception", () => {
    const f = classifySettlementRootCause({
      pickId: "p2",
      sportKey: "basketball_nba",
      ageHours: 20,
      graceHours: 6,
      outcomeStatus: "HELD",
      holdReason: "DISPUTED",
    });
    expect(f.code).toBe("DISPUTED_SCORES");
    expect(f.clearanceWave).toBe("C");
  });

  it("classifies orient fail as MATCHING wave B", () => {
    const f = classifySettlementRootCause({
      pickId: "p3",
      sportKey: "americanfootball_ncaaf",
      ageHours: 30,
      graceHours: 6,
      outcomeStatus: "PENDING",
      pendingReason: "ORIENT_FAIL",
    });
    expect(f.code).toBe("TEAM_ORIENT_FAIL");
    expect(f.category).toBe("MATCHING");
    expect(f.clearanceWave).toBe("B");
  });

  it("does not mark within-grace as overdue", () => {
    const f = classifySettlementRootCause({
      pickId: "p4",
      sportKey: "baseball_mlb",
      ageHours: 2,
      graceHours: 6,
      outcomeStatus: "PENDING",
      pendingReason: "NO_FINAL",
    });
    expect(f.code).toBe("WITHIN_GRACE");
    expect(f.overdue).toBe(false);
    expect(f.clearanceWave).toBe("D");
  });

  it("flags path misconfig when odds key blocks free STP", () => {
    const f = classifySettlementRootCause({
      pickId: "p5",
      sportKey: "icehockey_nhl",
      ageHours: 48,
      graceHours: 6,
      outcomeStatus: "PENDING",
      pendingReason: "NO_FINAL",
      oddsKeyPresentButFreeExpected: true,
    });
    expect(f.code).toBe("PATH_MISCONFIG");
    expect(f.category).toBe("PATH_CONFIG");
  });

  it("builds Pareto with cumulative share and ranks top cause", () => {
    const findings = [
      ...Array.from({ length: 8 }, (_, i) =>
        classifySettlementRootCause({
          pickId: `a${i}`,
          sportKey: "nfl",
          ageHours: 24,
          graceHours: 6,
          outcomeStatus: "PENDING",
          pendingReason: "NO_FINAL",
        }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        classifySettlementRootCause({
          pickId: `d${i}`,
          sportKey: "nba",
          ageHours: 24,
          graceHours: 6,
          outcomeStatus: "HELD",
          holdReason: "DISPUTED",
        }),
      ),
    ];
    const pareto = buildCausePareto(findings);
    expect(pareto[0]!.code).toBe("OVERDUE_NO_SCORE");
    expect(pareto[0]!.count).toBe(8);
    expect(pareto[0]!.cumulativeShare).toBeGreaterThan(0.7);
    const report = aggregateSettlementRca(findings);
    expect(report.topCause).toBe("OVERDUE_NO_SCORE");
    expect(report.overdue).toBe(10);
    expect(report.operatorHeadline).toMatch(/top cause OVERDUE_NO_SCORE/);
    expect(report.byWave.A).toBe(8);
    expect(report.byWave.C).toBe(2);
  });
});

describe("straight-through processing automation", () => {
  it("routes disputed to EXCEPTION_QUEUE", () => {
    const f = classifySettlementRootCause({
      pickId: "x",
      sportKey: "nba",
      ageHours: 10,
      graceHours: 6,
      outcomeStatus: "HELD",
      holdReason: "DISPUTED",
    });
    const d = decideStpAction(f);
    expect(d.action).toBe("EXCEPTION_QUEUE");
    expect(d.requiresHuman).toBe(true);
  });

  it("routes overdue no-score to REPROCESS (wave A STP)", () => {
    const f = classifySettlementRootCause({
      pickId: "y",
      sportKey: "nfl",
      ageHours: 18,
      graceHours: 6,
      outcomeStatus: "PENDING",
      pendingReason: "NO_FINAL",
    });
    const d = decideStpAction(f);
    expect(d.action).toBe("REPROCESS");
    expect(d.requiresHuman).toBe(false);
    expect(d.priority).toBeGreaterThan(60);
  });

  it("marks settled-this-cycle as AUTO_SETTLE / AUDIT", () => {
    const f = classifySettlementRootCause({
      pickId: "z",
      sportKey: "nfl",
      ageHours: 10,
      graceHours: 6,
      outcomeStatus: "SETTLED",
      confirmation: "SINGLE_SOURCE",
    });
    const d = decideStpAction(f, {
      settledThisCycle: true,
      confirmation: "SINGLE_SOURCE",
      policy: DEFAULT_STP_POLICY,
    });
    expect(d.action).toBe("AUTO_SETTLE_AUDIT");
  });

  it("plans waves with overdue REPROCESS ahead of WAIT", () => {
    const findings = [
      classifySettlementRootCause({
        pickId: "wait",
        sportKey: "mlb",
        ageHours: 1,
        graceHours: 6,
        outcomeStatus: "PENDING",
        pendingReason: "NO_FINAL",
      }),
      classifySettlementRootCause({
        pickId: "repro",
        sportKey: "mlb",
        ageHours: 40,
        graceHours: 6,
        outcomeStatus: "PENDING",
        pendingReason: "NO_FINAL",
      }),
      classifySettlementRootCause({
        pickId: "disp",
        sportKey: "mlb",
        ageHours: 40,
        graceHours: 6,
        outcomeStatus: "HELD",
        holdReason: "DISPUTED",
      }),
    ];
    const plan = planClearanceWaves(findings);
    expect(plan.ordered[0]!.pickId).toBe("repro");
    expect(plan.exceptionCount).toBe(1);
    expect(plan.waitCount).toBe(1);
    expect(plan.autoEligible).toBeGreaterThanOrEqual(1);
  });

  it("burn rate drains only when cleared exceeds inflow", () => {
    const draining = computeBurnRate({ cleared: 10, newOverdueInflow: 3, reopened: 0 });
    expect(draining.draining).toBe(true);
    expect(draining.netBurn).toBe(7);
    const stuck = computeBurnRate({ cleared: 2, newOverdueInflow: 5, reopened: 1 });
    expect(stuck.draining).toBe(false);
    expect(stuck.operatorMessage).toMatch(/not draining/i);
  });

  it("STP load priority ranks overdue above in-grace and future", () => {
    const overdue = stpLoadPriority(12, 6);
    const grace = stpLoadPriority(2, 6);
    const future = stpLoadPriority(-5, 6);
    expect(overdue).toBeGreaterThan(grace);
    expect(grace).toBeGreaterThan(future);
  });
});
