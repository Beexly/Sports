import { describe, expect, it } from "vitest";
import {
  resolveRundownApiKey,
  rundownEventToOddsApiEvent,
  RUNDOWN_SPORT_IDS,
} from "../rundown-client.js";

describe("rundown-client", () => {
  it("maps NFL sport id", () => {
    expect(RUNDOWN_SPORT_IDS.americanfootball_nfl).toBe(2);
  });

  it("resolves key from env aliases", () => {
    expect(resolveRundownApiKey({ RUNDOWN_API_KEY: " a " })).toBe("a");
    expect(resolveRundownApiKey({ RUNDOWN_KEY: "b" })).toBe("b");
    expect(resolveRundownApiKey({ FREE_RUNDOWN_API_KEY: "c" })).toBe("c");
    expect(resolveRundownApiKey({})).toBe("");
  });

  it("maps moneyline lines to OddsApiEvent with team names", () => {
    const ev = rundownEventToOddsApiEvent(
      {
        event_id: "e1",
        teams: [
          { name: "Kansas City Chiefs", is_away: false },
          { name: "Buffalo Bills", is_away: true },
        ],
        event_date: "2026-09-10T00:00:00Z",
        lines: {
          "3": {
            moneyline: { moneyline_home: -120, moneyline_away: 100 },
          },
        },
      },
      "americanfootball_nfl",
    );
    expect(ev).not.toBeNull();
    expect(ev!.home_team).toBe("Kansas City Chiefs");
    expect(ev!.bookmakers[0]!.markets[0]!.outcomes[0]!.name).toBe("Kansas City Chiefs");
  });
});

describe("fetchRundownEventsForSport rate limit", () => {
  it("aborts remaining days on HTTP 429", async () => {
    const { fetchRundownEventsForSport } = await import("../rundown-client.js");
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response("rate", { status: 429 });
    };
    const out = await fetchRundownEventsForSport("americanfootball_nfl", "k", {
      daySpan: 5,
      date: "2026-08-10",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.events).toEqual([]);
    expect(calls).toBe(1);
    expect(out.error ?? "").toMatch(/429|rate_limited/);
  });
});
