import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { BACKFILL_WINDOW_HOURS, BACKFILL_CAP } from "@/lib/data-sources/settle-backfill";

/**
 * Settlement SLA tripwire: every published pick grades within the 6h grace of
 * its game ending. The three levers that make that true must not drift apart:
 *   1. the cron runs at least hourly (an hourly cadence + finals published by
 *      ESPN within minutes leaves ≥5h of slack inside the grace);
 *   2. the stale backfill sweeps everything past the same grace the health
 *      band uses (a 3-day window once left a 6h–3d blind spot);
 *   3. the backfill cap is large enough to drain a full weekend slate in one
 *      cycle (the old cap of 50 re-read the same oldest rows every hour).
 */
describe("settlement SLA contract", () => {
  const root = resolve(__dirname, "../../..");
  const cronFiles = ["vercel.json", "apps/web/vercel.json"] as const;

  it("settle-picks runs hourly in both cron manifests (identical copies)", () => {
    const entries = cronFiles.map((rel) => {
      const json = JSON.parse(readFileSync(resolve(root, rel), "utf8")) as {
        crons: Array<{ path: string; schedule: string }>;
      };
      const entry = json.crons.find((c) => c.path === "/api/cron/settle-picks");
      expect(entry, `${rel} must schedule /api/cron/settle-picks`).toBeDefined();
      return entry!;
    });
    for (const entry of entries) {
      // "<minute> * * * *" — a fixed minute, every hour.
      expect(entry.schedule).toMatch(/^\d{1,2} \* \* \* \*$/);
    }
    expect(entries[0]!.schedule).toBe(entries[1]!.schedule);
  });

  it("grace is 6h and the backfill window equals it", () => {
    expect(SETTLEMENT_DEFAULT_GRACE_HOURS).toBe(6);
    expect(BACKFILL_WINDOW_HOURS).toBe(SETTLEMENT_DEFAULT_GRACE_HOURS);
  });

  it("backfill cap covers a full weekend slate in one cycle", () => {
    // 7 sports × ~15 games × 3 markets ≈ 300 picks on the busiest Saturday;
    // the free pass grades most of them first, the backfill only sweeps what
    // is left. 200 per run, hourly, drains any realistic residue in one cycle.
    expect(BACKFILL_CAP).toBeGreaterThanOrEqual(200);
  });

  it("the route grades free-first and treats the paid pass as a supplement", () => {
    const route = readFileSync(
      resolve(__dirname, "../app/api/cron/settle-picks/route.ts"),
      "utf8",
    );
    const freeIdx = route.indexOf("await runFreePathSettlement(");
    const paidIdx = route.indexOf("await runPaidSupplement(");
    expect(freeIdx).toBeGreaterThan(-1);
    expect(paidIdx).toBeGreaterThan(freeIdx);
    expect(route).toMatch(/selectSettlementPlan\(apiKey, \{ forceFree \}\)/);
    expect(route).toMatch(/ok: freeOk/);
  });
});
