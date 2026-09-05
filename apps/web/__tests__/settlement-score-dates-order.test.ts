import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uniqueScoreboardDates } from "@/lib/data-sources/settlement-score-dates";

/**
 * A backlog wider than the date cap must not lose its tail. The runner keeps the
 * newest days (health-band oxygen); the stale-backfill lane exists to drain the
 * oldest picks and must keep the oldest days, or those picks report NO_FINAL on
 * every cycle without their board ever being requested.
 */
const NOW = new Date("2026-09-05T16:00:00.000Z");
// 25 distinct UTC days ending yesterday, one kickoff per day at 18:00Z.
const kickoffs = Array.from({ length: 25 }, (_, i) => new Date(Date.UTC(2026, 8, 4 - i, 18, 0, 0)));

describe("uniqueScoreboardDates order", () => {
  it("keeps the newest days by default", () => {
    const { espnKeys } = uniqueScoreboardDates(kickoffs, { maxDays: 21, now: NOW });
    expect(espnKeys).toHaveLength(21);
    expect(espnKeys[0]).toBe("20260904");
    expect(espnKeys).not.toContain("20260811");
  });

  it("keeps the oldest days when asked, so the backfill tail is reachable", () => {
    const { espnKeys, isoKeys } = uniqueScoreboardDates(kickoffs, { maxDays: 21, now: NOW, order: "oldest" });
    expect(espnKeys).toHaveLength(21);
    expect(espnKeys[0]).toBe("20260811");
    expect(espnKeys).toContain("20260811");
    expect(espnKeys).not.toContain("20260904");
    expect(isoKeys[0]).toBe("2026-08-11");
  });

  it("is a no-op below the cap", () => {
    const few = kickoffs.slice(0, 3);
    const newest = uniqueScoreboardDates(few, { maxDays: 21, now: NOW }).espnKeys;
    const oldest = uniqueScoreboardDates(few, { maxDays: 21, now: NOW, order: "oldest" }).espnKeys;
    expect([...newest].sort()).toEqual([...oldest].sort());
  });
});

describe("settle-backfill asks for the oldest days", () => {
  it("passes order: 'oldest' to uniqueScoreboardDates", () => {
    const src = readFileSync(resolve(__dirname, "..", "lib/data-sources/settle-backfill.ts"), "utf8");
    expect(src).toMatch(/uniqueScoreboardDates\([\s\S]*?order:\s*"oldest"/);
  });
});
