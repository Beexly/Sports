import { describe, it, expect } from "vitest";
import { buildMarketSurface, type Quote } from "../../market-physics/market-surface.js";
import { buildMarketTwin, twinId } from "../market-twin.js";

const T = "2024-09-08T16:00:00Z";
function surface() {
  const q: Quote[] = [
    { book: "pinnacle", market: "spread", outcome: "HOME", point: -3, price: -110, timestamp: T },
    { book: "pinnacle", market: "spread", outcome: "AWAY", point: 3, price: -110, timestamp: T },
    { book: "pinnacle", market: "total", outcome: "OVER", point: 45, price: -110, timestamp: T },
    { book: "pinnacle", market: "total", outcome: "UNDER", point: 45, price: -110, timestamp: T },
    { book: "pinnacle", market: "player_pass_yds", outcome: "OVER", player: "QB1", point: 270, price: -110, timestamp: T },
    { book: "pinnacle", market: "player_reception_yds", outcome: "OVER", player: "WR1", point: 80, price: -110, timestamp: T },
  ];
  return buildMarketSurface("KC@BUF", q);
}

describe("buildMarketTwin", () => {
  const twin = buildMarketTwin(surface(), {
    homeTeam: "BUF",
    awayTeam: "KC",
    playerTeam: { QB1: "KC", WR1: "KC" },
    qbReceivers: { "player_pass_yds:QB1": ["player_reception_yds:WR1"] },
    events: [{ id: "e1", type: "qb_status", timestamp: "2024-09-08T14:00:00Z", affectsPlayer: "QB1" }],
    laggedBooks: ["pinnacle"],
  });

  it("creates typed nodes for game, teams, books, markets, outcomes, players, events", () => {
    expect(twin.getNode(twinId.game("KC@BUF"))?.kind).toBe("game");
    expect(twin.getNode(twinId.team("BUF"))?.kind).toBe("team");
    expect(twin.getNode(twinId.book("pinnacle"))?.kind).toBe("book");
    expect(twin.getNode(twinId.market("player_pass_yds:QB1"))?.kind).toBe("market");
    expect(twin.getNode(twinId.player("QB1"))?.kind).toBe("player");
    expect(twin.getNode(twinId.event("e1"))?.kind).toBe("event");
    expect(twin.getNode(twinId.role("QB1"))?.kind).toBe("role_state");
  });

  it("wires structural relationship edges", () => {
    const kinds = new Set(twin.edges.map((e) => e.kind));
    expect(kinds.has("prop_of_player")).toBe(true);
    expect(kinds.has("player_of_team")).toBe(true);
    expect(kinds.has("market_implies_team_total")).toBe(true);
    expect(kinds.has("qb_relates_receiver")).toBe(true);
    expect(kinds.has("event_affects_role")).toBe(true);
    expect(kinds.has("market_moved_after_event")).toBe(true);
    expect(kinds.has("book_lagged_consensus")).toBe(true);
  });

  it("derives implied team totals onto the team edges", () => {
    const ttEdges = twin.neighbors(twinId.market("total"), "market_implies_team_total");
    const buf = ttEdges.find((e) => e.to === twinId.team("BUF"));
    expect(buf?.data?.["impliedTotal"]).toBe(24); // (45 - (-3))/2
  });

  it("neighbors() returns incident edges", () => {
    expect(twin.neighbors(twinId.player("QB1")).length).toBeGreaterThan(0);
  });
});
