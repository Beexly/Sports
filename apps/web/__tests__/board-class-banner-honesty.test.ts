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

    // The banner copy itself is no longer authored in the page — it moved into
    // the MESSAGES map in lib/board/classify-board-state.ts, which is the right
    // place for it (one classifier, one vocabulary). This assertion pinned the
    // page-authored literal /No public fires/, which is retired; the refuse-
    // default CLAIM it existed to guard is asserted where it now lives.
    const classifier = readFileSync(
      join(process.cwd(), "lib/board/classify-board-state.ts"),
      "utf8",
    );
    expect(classifier).toMatch(/refuse-default/);
    // An empty board must never be dressed up as a measured zero-edge result.
    expect(classifier).toMatch(/not a fabricated zero-edge win rate/);
  });

  it("badge surfaces boardClass state", () => {
    const src = readFileSync(
      join(process.cwd(), "components/board/board-health-badge.tsx"),
      "utf8",
    );
    expect(src).toContain("boardClass.state");

    // "Public fire held" is emitted by lib/board/gate-consumer.ts, not authored
    // in the badge. The badge surfaces the STATE; the consumer owns the words.
    const consumer = readFileSync(
      join(process.cwd(), "lib/board/gate-consumer.ts"),
      "utf8",
    );
    expect(consumer).toContain("Public fire held");
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
