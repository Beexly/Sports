import { describe, expect, it, vi } from "vitest";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";

describe("fetchEspnOddsForSport", () => {
  it("maps scoreboard + core odds into OddsApiEvent (h2h required)", async () => {
    const testDate = new Date();
    testDate.setUTCHours(testDate.getUTCHours() + 2);
    const dateStr = testDate.toISOString();

    const scoreboard = {
      events: [
        {
          id: "401",
          date: dateStr,
          competitions: [
            {
              date: dateStr,
              status: { type: { state: "pre", completed: false } },
              competitors: [
                {
                  homeAway: "home",
                  team: { displayName: "Washington Nationals" },
                },
                {
                  homeAway: "away",
                  team: { displayName: "Cincinnati Reds" },
                },
              ],
            },
          ],
        },
      ],
    };
    const coreOdds = {
      items: [
        {
          provider: { id: "100", name: "DraftKings" },
          overUnder: 9.5,
          overOdds: -110,
          underOdds: -110,
          awayTeamOdds: {
            moneyLine: 102,
            current: {
              pointSpread: { alternateDisplayValue: "-1.5" },
              spread: { american: "+148" },
              moneyLine: { american: "+102" },
            },
          },
          homeTeamOdds: {
            moneyLine: -110,
            current: {
              pointSpread: { alternateDisplayValue: "+1.5" },
              spread: { american: "-180" },
              moneyLine: { american: "-110" },
            },
          },
        },
      ],
    };

    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("scoreboard")) {
        return {
          ok: true,
          json: async () => scoreboard,
        } as Response;
      }
      if (u.includes("/odds")) {
        return {
          ok: true,
          json: async () => coreOdds,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });
    expect(res.provider).toBe("espn_public");
    expect(res.events.length).toBe(1);
    const ev = res.events[0]!;
    expect(ev.home_team).toBe("Washington Nationals");
    expect(ev.away_team).toBe("Cincinnati Reds");
    expect(ev.bookmakers[0]!.key).toBe("espn_public");
    const keys = ev.bookmakers[0]!.markets.map((m) => m.key);
    expect(keys).toContain("h2h");
    expect(keys).toContain("spreads");
    expect(keys).toContain("totals");
    const h2h = ev.bookmakers[0]!.markets.find((m) => m.key === "h2h")!;
    expect(h2h.outcomes).toHaveLength(2);
  });

  it("soft-fails empty for unmapped sport (never invents)", async () => {
    const res = await fetchEspnOddsForSport("unknown_sport_xyz");
    expect(res.events).toEqual([]);
    expect(res.error).toMatch(/no sport map/i);
  });

  it("soft-fails when scoreboard HTTP fails", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }) as Response);
    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.events).toEqual([]);
    expect(res.error).toMatch(/HTTP 503/);
  });
});
