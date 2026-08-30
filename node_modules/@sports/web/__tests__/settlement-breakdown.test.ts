import { describe, expect, it } from "vitest";
import { loadSettlementBreakdown } from "@/lib/performance/settlement-breakdown";

describe("loadSettlementBreakdown", () => {
  it("groups overdue by sport and emits operator next steps", async () => {
    const now = new Date("2026-08-06T12:00:00Z");
    const fake = {
      pick: {
        groupBy: async () => [],
        findMany: async () => [
          {
            id: "p1",
            game: {
              commenceTime: new Date("2026-08-01T00:00:00Z"),
              sport: { key: "americanfootball_nfl" },
            },
          },
          {
            id: "p2",
            game: {
              commenceTime: new Date("2026-08-01T00:00:00Z"),
              sport: { key: "americanfootball_nfl" },
            },
          },
          {
            id: "p3",
            game: {
              commenceTime: new Date("2026-08-01T00:00:00Z"),
              sport: { key: "basketball_nba" },
            },
          },
        ],
      },
    };
    const b = await loadSettlementBreakdown(fake, { now, graceHours: 6 });
    expect(b.overduePending).toBe(3);
    expect(b.overdueBySport[0]?.sportKey).toBe("americanfootball_nfl");
    expect(b.overdueBySport[0]?.overduePending).toBe(2);
    expect(b.operatorNext.length).toBeGreaterThan(0);
  });
});
