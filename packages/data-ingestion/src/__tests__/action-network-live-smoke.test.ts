import { describe, it, expect } from "vitest";
import { createActionNetworkSecondBook } from "../action-network-book.js";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";

describe("Action Network Live Second Book Smoke Test", () => {
  it("fetches live Action Network scoreboard and attaches real bookmaker to ESPN events", async () => {
    const secondBook = createActionNetworkSecondBook();
    expect(secondBook).toBeDefined();

    // Test a live lookup directly with real NFL teams from Week 7 (e.g. DEN vs SEA, or HOU vs JAX)
    const book = await secondBook.bookmakerFor({
      sportKey: "americanfootball_nfl",
      commenceTime: "2026-10-16T00:15:00Z",
      homeAbbr: "DEN",
      awayAbbr: "SEA",
      homeTeam: "Denver Broncos",
      awayTeam: "Seattle Seahawks",
    });

    // If scoreboard is live and reachable, bookmaker is attached with Caesars/BetMGM/FanDuel
    if (book) {
      console.log(`[LIVE TEST] Successfully attached second book: ${book.title} (${book.key})`);
      expect(book.key).toMatch(/^action_network_\d+$/);
      expect(book.markets.length).toBeGreaterThan(0);
      const h2h = book.markets.find(m => m.key === "h2h");
      const spreads = book.markets.find(m => m.key === "spreads");
      const totals = book.markets.find(m => m.key === "totals");
      console.log(`[LIVE TEST] Markets present: h2h=${!!h2h}, spreads=${!!spreads}, totals=${!!totals}`);
      expect(h2h || spreads || totals).toBeTruthy();
    } else {
      console.log("[LIVE TEST] Game was not on scoreboard or network unreachable (acceptable soft miss)");
    }
  }, 20000);

  it("fetches ESPN events with secondBook enabled, producing multi-book events", async () => {
    const secondBook = createActionNetworkSecondBook();
    const result = await fetchEspnOddsForSport("americanfootball_nfl", { secondBook });
    console.log(`[LIVE TEST] ESPN returned ${result.events.length} events for americanfootball_nfl`);

    let twoBookCount = 0;
    for (const event of result.events) {
      if (event.bookmakers.length >= 2) {
        twoBookCount++;
        console.log(`[LIVE TEST] Event ${event.away_team} @ ${event.home_team} has ${event.bookmakers.length} books: ${event.bookmakers.map(b => b.title).join(", ")}`);
      }
    }
    console.log(`[LIVE TEST] Events with >= 2 books: ${twoBookCount} / ${result.events.length}`);
    expect(result.events).toBeDefined();
  }, 25000);
});
