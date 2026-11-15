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
  it("two-doctrine /board page renders no legacy board-class banner", () => {
    const src = readFileSync(
      join(process.cwd(), "app/board/page.tsx"),
      "utf8",
    );
    expect(src).toContain("loadDoctrineBoard");
    expect(src).toContain("DoctrineBoardView");
    // No legacy boardClass banner state may be rendered on this page.
    expect(src).not.toContain('data-testid="board-class-banner"');
    expect(src).not.toContain("boardClass.publicMessage");
    expect(src).not.toContain("refusePublicFire");
    expect(src).not.toContain("loadBoardState");
    expect(src).toContain('href="/packages"');
    expect(src).toContain('href="/record"');
    expect(src).toContain('href="/picks"');
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
