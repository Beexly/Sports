import { describe, expect, it } from "vitest";
import { classifyBoardState } from "@/lib/board/classify-board-state";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("board class UI honesty", () => {
  it("page surfaces boardClass banner + refuse-default empty copy", () => {
    const src = readFileSync(
      join(process.cwd(), "app/board/page.tsx"),
      "utf8",
    );
    expect(src).toContain('data-testid="board-class-banner"');
    expect(src).toContain("boardClass.publicMessage");
    expect(src).toContain("refusePublicFire");
    // Was /No public fires/. The humanizer pass replaced that copy; the
    // PROPERTY it guarded is that a closed board must not read as "we looked and
    // found nothing". The shipped string states that far more explicitly, so
    // pin the property rather than the retired wording.
    expect(src).toMatch(/An empty lane is not a claim about results/);
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
