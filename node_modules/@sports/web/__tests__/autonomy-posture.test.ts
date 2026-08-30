import { describe, expect, it } from "vitest";
import { loadAutonomyPosture } from "@/lib/ops/autonomy-posture";
import { AUTONOMY_SAFE_CRON_TARGETS } from "@/lib/autonomy/safe-cron-targets";
import { EXECUTABLE_CRON_TARGETS } from "@/lib/autonomy/execute-autonomy-cycle";

describe("loadAutonomyPosture", () => {
  it("defaults to dry-run when AUTONOMY_EXECUTE unset", () => {
    const p = loadAutonomyPosture({});
    expect(p.executeEnabled).toBe(false);
    expect(p.defaultDryRun).toBe(true);
    expect(p.operatorHint).toMatch(/dry-run/i);
    expect(p.safeCronTargets).toContain("/api/cron/free-spine-health");
    expect(p.safeCronTargets).toContain("/api/cron/settle-picks");
    expect(p.safeCronTargets).toContain("/api/cron/refresh-odds");
    expect(p.safeCronTargets).toContain("/api/cron/generate-drafts");
    expect(p.safeCronTargets).toContain("/api/cron/calibration-metrics");
  });

  it("enables execute only when AUTONOMY_EXECUTE=true", () => {
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "true" }).executeEnabled).toBe(true);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "TRUE" }).executeEnabled).toBe(true);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "1" }).executeEnabled).toBe(false);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "false" }).executeEnabled).toBe(false);
  });

  it("never claims owner-queue auto-run", () => {
    const p = loadAutonomyPosture({ AUTONOMY_EXECUTE: "true" });
    expect(p.operatorHint).toMatch(/Owner-queue/i);
    expect(p.operatorHint).not.toMatch(/LIVE_BOARD=true/);
  });

  it("posture SAFE list equals EXECUTABLE distinct paths (no drift)", () => {
    const execPaths = new Set(Object.values(EXECUTABLE_CRON_TARGETS));
    const safePaths = new Set(AUTONOMY_SAFE_CRON_TARGETS);
    expect(safePaths).toEqual(execPaths);
    expect(loadAutonomyPosture({}).safeCronTargets).toEqual([...AUTONOMY_SAFE_CRON_TARGETS]);
  });
});
