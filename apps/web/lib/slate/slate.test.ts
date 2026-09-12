import { describe, expect, it } from "vitest";
import { buildSlate, groupGame } from "@/lib/slate/slate";
import type { BoardStateRow } from "@/lib/board/state";

const row = (over: Partial<BoardStateRow> & { id: string }): BoardStateRow => ({
  gameId: "g1",
  matchup: "KC vs BUF",
  sport: "NFL",
  market: "MONEYLINE",
  status: "PUBLISHED_TODAY",
  edgeIndex: null,
  confidence: null,
  rankingP: null,
  rankingSource: null,
  gateReason: null,
  updatedAt: "2026-09-12T12:00:00.000Z",
  ...over,
});

describe("slate grouping", () => {
  it("groups one game's readings across lanes and markets", () => {
    const rows = [
      row({ id: "r1", market: "MONEYLINE", edgeIndex: 12 }),
      row({ id: "r2", market: "SPREAD", edgeIndex: 20 }),
      row({ id: "r3", market: "TOTAL", status: "GATED_TODAY", gateReason: "thin sample", edgeIndex: null }),
    ];
    const game = groupGame("g1", rows)!;
    expect(game.matchup).toBe("KC vs BUF");
    expect(game.markets).toEqual(["MONEYLINE", "SPREAD", "TOTAL"]);
    expect(game.readings).toHaveLength(3);
    expect(game.bestEdge).toBe(20);
    expect(game.clearedCount).toBe(2);
    expect(game.heldCount).toBe(1);
    expect(game.scoringCount).toBe(0);
  });

  it("returns null for a game with no rows", () => {
    expect(groupGame("gx", [row({ id: "r1" })])).toBeNull();
  });

  it("bestEdge ignores null and nonfinite edges", () => {
    const game = groupGame("g1", [
      row({ id: "r1", edgeIndex: null }),
      row({ id: "r2", edgeIndex: NaN }),
      row({ id: "r3", edgeIndex: -5 }),
    ])!;
    expect(game.bestEdge).toBe(-5);
  });

  it("bestEdge is null when nothing scored", () => {
    const game = groupGame("g1", [row({ id: "r1" })])!;
    expect(game.bestEdge).toBeNull();
  });

  it("buildSlate splits leagues and sorts games by edge", () => {
    const rows = [
      row({ id: "r1", gameId: "g1", sport: "NFL", edgeIndex: 5 }),
      row({ id: "r2", gameId: "g2", sport: "NFL", edgeIndex: 30 }),
      row({ id: "r3", gameId: "g3", sport: "MLB", matchup: "NYY vs BOS", edgeIndex: null }),
    ];
    const slate = buildSlate(rows);
    expect(slate).toHaveLength(2);
    const nfl = slate.find((l) => l.sport === "NFL")!;
    expect(nfl.games.map((g) => g.gameId)).toEqual(["g2", "g1"]);
    expect(nfl.readingCount).toBe(2);
    const mlb = slate.find((l) => l.sport === "MLB")!;
    expect(mlb.games).toHaveLength(1);
    expect(mlb.heldCount).toBe(0);
  });

  it("empty rows build an empty slate (route owns zero-states)", () => {
    expect(buildSlate([])).toEqual([]);
  });
});
