import { describe, expect, it, vi } from "vitest";
import {
  planAutonomyCycle,
  type AutonomyObservation,
} from "@/lib/autonomy/operating-kernel";
import {
  executeAutonomyCycle,
  executableTargetFor,
  selectExecutableActions,
  EXECUTABLE_CRON_TARGETS,
} from "@/lib/autonomy/execute-autonomy-cycle";

function baseObs(over: Partial<AutonomyObservation> = {}): AutonomyObservation {
  return {
    observedAt: "2026-08-06T02:00:00.000Z",
    deploymentSha: "testsha",
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

describe("autonomy executor mapping", () => {
  it("maps free-spine and settle kinds to cron paths", () => {
    const plan = planAutonomyCycle(
      baseObs({
        ingestionOk: false,
        ingestionAgeMinutes: 200,
        settlementBand: "CRITICAL",
        settlementOverdue: 12,
      }),
    );
    const spine = plan.autonomousQueue.find((a) => a.kind === "RUN_FREE_SPINE_HEALTH");
    const settle = plan.autonomousQueue.find((a) => a.kind === "RUN_FREE_SETTLE");
    expect(spine && executableTargetFor(spine)).toBe(
      EXECUTABLE_CRON_TARGETS.RUN_FREE_SPINE_HEALTH,
    );
    expect(settle && executableTargetFor(settle)).toBe(
      EXECUTABLE_CRON_TARGETS.RUN_FREE_SETTLE,
    );
  });

  it("never maps owner FIX_PATH_MISCONFIG to a cron", () => {
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 6,
        topRcaCause: "PATH_MISCONFIG",
      }),
    );
    const fix = plan.ownerQueue.find((a) => a.kind === "FIX_PATH_MISCONFIG");
    expect(fix).toBeDefined();
    expect(executableTargetFor(fix!)).toBeNull();
  });

  it("dedupes settle path when Wave A and RUN_FREE_SETTLE both present", () => {
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 17,
        topRcaCause: "OVERDUE_NO_SCORE",
      }),
    );
    const selected = selectExecutableActions(plan, 3);
    const paths = selected.map((a) => executableTargetFor(a));
    const settleCount = paths.filter(
      (p) => p === EXECUTABLE_CRON_TARGETS.RUN_FREE_SETTLE,
    ).length;
    expect(settleCount).toBe(1);
  });
});

describe("executeAutonomyCycle", () => {
  it("dryRun does not call fetch", async () => {
    const fetchImpl = vi.fn();
    const plan = planAutonomyCycle(
      baseObs({
        ingestionAgeMinutes: 200,
        ingestionOk: false,
        settlementBand: "CRITICAL",
        settlementOverdue: 9,
      }),
    );
    const result = await executeAutonomyCycle({
      plan,
      baseUrl: "https://www.galaxysportsedge.com",
      cronSecret: "test-secret",
      dryRun: true,
      fetchImpl,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.executedCount).toBe(0);
    expect(result.acts.some((a) => a.status === "skipped_dry_run")).toBe(true);
  });

  it("executes free-spine when ingestion stale and execute enabled", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      expect(String(input)).toContain("/api/cron/free-spine-health");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const plan = planAutonomyCycle(
      baseObs({
        ingestionAgeMinutes: 200,
        ingestionOk: false,
        settlementBand: "HEALTHY",
        settlementOverdue: 0,
      }),
    );
    const result = await executeAutonomyCycle({
      plan,
      baseUrl: "https://www.galaxysportsedge.com",
      cronSecret: "test-secret",
      dryRun: false,
      maxActions: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.executedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.acts.some((a) => a.status === "executed" && a.httpStatus === 200)).toBe(
      true,
    );
  });

  it("records failed when cron returns 401", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 10,
      }),
    );
    const result = await executeAutonomyCycle({
      plan,
      baseUrl: "https://www.galaxysportsedge.com",
      cronSecret: "bad",
      dryRun: false,
      maxActions: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.failedCount).toBeGreaterThanOrEqual(1);
    expect(result.acts.some((a) => a.status === "failed" && a.httpStatus === 401)).toBe(
      true,
    );
  });

  it("skips owner actions even if mistakenly passed in autonomous queue", async () => {
    const plan = planAutonomyCycle(
      baseObs({
        settlementBand: "CRITICAL",
        settlementOverdue: 6,
        topRcaCause: "PATH_MISCONFIG",
      }),
    );
    const result = await executeAutonomyCycle({
      plan,
      baseUrl: "https://www.galaxysportsedge.com",
      cronSecret: "x",
      dryRun: true,
    });
    expect(result.acts.some((a) => a.kind === "FIX_PATH_MISCONFIG")).toBe(true);
    expect(
      result.acts
        .filter((a) => a.kind === "FIX_PATH_MISCONFIG")
        .every((a) => a.status === "skipped_owner"),
    ).toBe(true);
  });
});
