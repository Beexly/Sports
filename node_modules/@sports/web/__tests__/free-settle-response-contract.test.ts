/**
 * Tripwire (Claude Code image task C): free settle response must expose
 * clvRepair + snapshotRepair fields for operator observability.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("free settle response contract", () => {
  it("runner return type and body include clvRepair and snapshotRepair", () => {
    const runner = readFileSync(
      resolve(__dirname, "../lib/data-sources/free-settlement-runner.ts"),
      "utf8",
    );
    expect(runner).toMatch(/clvRepair:/);
    expect(runner).toMatch(/snapshotRepair:/);
    expect(runner).toMatch(/drainPendingClvGrades/);
    expect(runner).toMatch(/drainPendingSnapshotOutcomes/);
    expect(runner).toMatch(/drainPendingTeamGameLogs/);
    expect(runner).toMatch(/teamGameLogRepair/);
    expect(runner).toMatch(/recordFreePathSnapshot/);
    // Both work kinds enqueued on free settle write
    expect(runner).toMatch(/kind: "CLV_GRADE"/);
    expect(runner).toMatch(/kind: "SNAPSHOT_OUTCOME"/);
  });

  it("cron settle-picks free path returns free object (nested repair fields)", () => {
    const route = readFileSync(
      resolve(__dirname, "../app/api/cron/settle-picks/route.ts"),
      "utf8",
    );
    expect(route).toMatch(/runFreePathSettlement/);
    expect(route).toMatch(/free,/);
    // Top-level promotion for ops dashboards (added alongside nested free.*)
    expect(route).toMatch(/clvRepair:\s*free\.clvRepair/);
    expect(route).toMatch(/snapshotRepair:\s*free\.snapshotRepair/);
    expect(route).toMatch(/teamGameLogRepair:\s*free\.teamGameLogRepair/);
    expect(route).toMatch(/get\("path"\) === "free"/);
    expect(route).toMatch(/forceFree \|\| !hasOddsApiKey\(apiKey\)/);
  });

  it("autonomy canonicalSettled is wired from the cumulative loader, not this cycle's learning batch (PL3)", () => {
    const runner = readFileSync(
      resolve(__dirname, "../lib/data-sources/free-settlement-runner.ts"),
      "utf8",
    );
    // The bug: wiring THIS CYCLE's freshly-graded batch count into a slot
    // every other planAutonomyCycle caller treats as the running cumulative
    // total against the ≥100 PROVEN floor.
    expect(runner).not.toMatch(/canonicalSettled:\s*learning\?\.nEligible/);
    // The fix: the cumulative loader is called before planAutonomyCycle is
    // constructed, and its count feeds the canonicalSettled slot.
    expect(runner).toMatch(/loadPublicPerformancePolicy\(/);
    expect(runner).toMatch(/canonicalSettled\s*=\s*policy\.canonicalSettledCount/);
    expect(runner).toMatch(/canonicalSettled,\s*\n\s*minSettledForLearning: 100,/);
  });
});
