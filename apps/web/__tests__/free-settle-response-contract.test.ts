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
  });
});
