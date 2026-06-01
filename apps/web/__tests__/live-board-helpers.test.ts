import { describe, it, expect } from "vitest";
import {
  rowIdSet,
  pickNewIds,
  formatAgo,
} from "@/lib/board/live-board-helpers";
import type { BoardStateData, BoardStateRow } from "@/lib/board/state";

function row(id: string, status: BoardStateRow["status"]): BoardStateRow {
  return {
    id,
    gameId: `game-${id}`,
    matchup: "Away @ Home",
    sport: "NFL",
    market: "SPREAD",
    status,
    edgeIndex: 71,
    confidence: null,
    gateReason: status === "GATED_TODAY" ? "Edge below threshold." : null,
    updatedAt: new Date().toISOString(),
  };
}

function board(
  scoring: string[],
  published: string[],
  gated: string[]
): BoardStateData {
  return {
    sportsWatched: 3,
    booksPolled: 12,
    openPicks: published.length,
    gatedToday: gated.length,
    lastRefresh: new Date().toISOString(),
    modelVersion: "v5.0.0",
    bootstrap: false,
    scoringNow: scoring.map((id) => row(id, "SCORING_NOW")),
    publishedToday: published.map((id) => row(id, "PUBLISHED_TODAY")),
    gatedTodayRows: gated.map((id) => row(id, "GATED_TODAY")),
  };
}

describe("rowIdSet", () => {
  it("collects every row id across all three lanes", () => {
    const ids = rowIdSet(board(["a", "b"], ["c"], ["d", "e"]));
    expect(ids).toEqual(new Set(["a", "b", "c", "d", "e"]));
  });

  it("is empty for an empty board", () => {
    expect(rowIdSet(board([], [], [])).size).toBe(0);
  });
});

describe("pickNewIds", () => {
  it("returns only ids that weren't already known, in any lane", () => {
    const prev = rowIdSet(board(["a"], ["c"], []));
    const next = board(["a", "x"], ["c"], ["y"]); // x and y are new
    expect(pickNewIds(prev, next).sort()).toEqual(["x", "y"]);
  });

  it("returns nothing when the board is unchanged", () => {
    const b = board(["a"], ["c"], ["d"]);
    expect(pickNewIds(rowIdSet(b), b)).toEqual([]);
  });

  it("treats a row that moved lanes but kept its id as not-new", () => {
    const prev = rowIdSet(board(["a"], [], []));
    const next = board([], ["a"], []); // same id, scoring -> published
    expect(pickNewIds(prev, next)).toEqual([]);
  });
});

describe("formatAgo", () => {
  it("says 'just now' under 3 seconds", () => {
    expect(formatAgo(0)).toBe("just now");
    expect(formatAgo(2)).toBe("just now");
  });

  it("reports seconds under a minute", () => {
    expect(formatAgo(12)).toBe("12s ago");
    expect(formatAgo(59)).toBe("59s ago");
  });

  it("rolls up to minutes at and beyond 60s", () => {
    expect(formatAgo(60)).toBe("1m ago");
    expect(formatAgo(135)).toBe("2m ago");
  });
});
