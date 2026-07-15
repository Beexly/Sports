/** Verifies deterministic public performance summaries over canonical settled picks. */
import { describe, expect, it } from "vitest";
import { summarizePerformancePicks, type SettledPerformancePick } from "./live-summaries";

function pick(
  id: string,
  result: SettledPerformancePick["result"],
  settledAt: string | null,
  sport = "NFL"
): SettledPerformancePick {
  return {
    id,
    result,
    pickType: "SPREAD",
    tier: "FREE",
    modelVersion: "v5.1.0",
    settledAt: settledAt ? new Date(settledAt) : null,
    game: { sport: { name: sport } },
  };
}

describe("summarizePerformancePicks", () => {
  it("derives all-time and monthly summaries from the same settled rows", () => {
    const summaries = summarizePerformancePicks([
      pick("a", "WIN", "2026-06-01T04:00:00.000Z"),
      pick("b", "LOSS", "2026-06-02T04:00:00.000Z"),
      pick("c", "PUSH", "2026-07-01T04:00:00.000Z"),
    ]);

    expect(summaries.find((row) => row.period === "all-time")).toMatchObject({
      totalPicks: 3,
      wins: 1,
      losses: 1,
      pushes: 1,
      winRate: 50,
    });
    expect(summaries.filter((row) => row.period !== "all-time").map((row) => row.period)).toEqual([
      "2026-07",
      "2026-06",
    ]);
  });

  it("keeps picks without a settlement timestamp out of dated periods", () => {
    const summaries = summarizePerformancePicks([pick("legacy", "WIN", null)]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.period).toBe("all-time");
    expect(summaries[0]?.computedAt.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });
});
