import { describe, expect, it } from "vitest";
import { classifyBoardState } from "@/lib/board/classify-board-state";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Board class honesty.
 *
 * REPOINTS (2026-11-04 board-cluster triage): the /board page was the
 * live board with a boardClass banner (board-class-banner testid,
 * boardClass.publicMessage, refusePublicFire). The owner then parked
 * /board behind an under-construction stub (this era's priority is
 * GALAXY PICKS (PAID) + DFS), so the page no longer renders live-board
 * state at all. The PROHIBITION carried over: a board-class banner
 * rendered on a page that has no live board would be dishonest - the
 * stub must therefore render NO board-class UI, and the classifier
 * itself (the logic that would drive such a banner) stays honest.
 */

describe("board class UI honesty", () => {
  it("parked /board page renders no board-class banner (no live board to classify)", () => {
    const src = readFileSync(
      join(process.cwd(), "app/board/page.tsx"),
      "utf8",
    );
    // The honesty surface of the stub is the under-construction notice.
    expect(src).toContain('data-testid="under-construction-notice"');
    // No live-board state may be rendered or gated on this page.
    expect(src).not.toContain('data-testid="board-class-banner"');
    expect(src).not.toContain("boardClass.publicMessage");
    expect(src).not.toContain("refusePublicFire");
    expect(src).not.toContain("loadBoardState");
    // The stub can never read as a live board: it names the construction
    // state and routes to the two live surfaces.
    expect(src).toMatch(/under construction/i);
    expect(src).toContain('href="/packages"');
    expect(src).toContain('href="/fantasy/dfs"');
  });

  it("badge surfaces boardClass state", () => {
    const src = readFileSync(
      join(process.cwd(), "components/board/board-health-badge.tsx"),
      "utf8",
    );
    expect(src).toContain("boardClass.state");
    // Was "public fire held". AGENTS.md records the badge copy change to
    // "publishing paused" and bans the old phrasing.
    expect(src).toContain("publishing paused");
  });

  it("LIVE_BOARD off classifier refuses public fire", () => {
    const r = classifyBoardState({
      liveBoardOn: false,
      bootstrap: false,
      rowCount: 0,
    });
    expect(r.state).toBe("HONEST_EMPTY_LIVE_BOARD_OFF");
    expect(r.refusePublicFire).toBe(true);
  });
});
