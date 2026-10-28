import { describe, expect, it } from "vitest";

import {
  PP_ATTRIBUTION,
  PP_SHA256,
  PP_SOURCES,
  consensusFor,
  loadBigBoard,
  parseBigBoard,
} from "./playerprofiler-board.js";

describe("PlayerProfiler big_board parser", () => {
  it("parses the real capture and the first record carries a Final Index and the ten source ranks", async () => {
    const board = await loadBigBoard();
    expect(board.attribution).toBe(PP_ATTRIBUTION);
    expect(board.sha256).toBe(PP_SHA256);
    expect(board.entries.length).toBeGreaterThan(0);

    const first = board.entries[0];
    expect(first.player.length).toBeGreaterThan(0);
    expect(first.finalIndex).not.toBeNull();
    // the payload's own source list, all ten, present on the first record
    expect(board.sources).toHaveLength(10);
    for (const s of PP_SOURCES) expect(s in first.ranks).toBe(true);
  }, 30_000);

  it("treats Final Index as a rank index, not a probability", async () => {
    const board = await loadBigBoard();
    const first = board.entries[0];
    // the payload's top row carries index 1.0 — a rank, not a 0..1 probability
    expect(first.finalIndex).toBe(1);
  }, 30_000);

  it("skips a row with no player rather than emitting an empty one", () => {
    const board = parseBigBoard({ success: true, data: [{ Position: "QB" }, { Player: "X", "Final Index": "2.0" }] });
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0].player).toBe("X");
  });

  it("returns null from consensusFor when the board lacks the player", async () => {
    const board = await loadBigBoard();
    expect(consensusFor(board, "no-such-id")).toBeNull();
    expect(consensusFor(board, board.entries[0].playerId)).not.toBeNull();
  }, 30_000);
});
