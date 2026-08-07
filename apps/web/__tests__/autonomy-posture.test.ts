import { describe, expect, it } from "vitest";
import { loadAutonomyPosture } from "@/lib/ops/autonomy-posture";

describe("loadAutonomyPosture", () => {
  it("defaults to dry-run when AUTONOMY_EXECUTE unset", () => {
    const p = loadAutonomyPosture({});
    expect(p.executeEnabled).toBe(false);
    expect(p.defaultDryRun).toBe(true);
    expect(p.operatorHint).toMatch(/dry-run/i);
    expect(p.safeCronTargets).toContain("/api/cron/free-spine-health");
    expect(p.safeCronTargets).toContain("/api/cron/settle-picks");
  });

  it("enables execute only when AUTONOMY_EXECUTE=true", () => {
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "true" }).executeEnabled).toBe(true);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "TRUE" }).executeEnabled).toBe(true);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "1" }).executeEnabled).toBe(false);
    expect(loadAutonomyPosture({ AUTONOMY_EXECUTE: "false" }).executeEnabled).toBe(false);
  });

  it("never claims owner-queue auto-run", () => {
    const p = loadAutonomyPosture({ AUTONOMY_EXECUTE: "true" });
    expect(p.operatorHint).toMatch(/Owner-queue still never/i);
    expect(p.operatorHint).not.toMatch(/LIVE_BOARD=true/);
  });
});
