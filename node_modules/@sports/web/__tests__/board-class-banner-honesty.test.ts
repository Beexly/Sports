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
    expect(src).toMatch(/No public fires/);
  });

  it("badge surfaces boardClass state", () => {
    const src = readFileSync(
      join(process.cwd(), "components/board/board-health-badge.tsx"),
      "utf8",
    );
    expect(src).toContain("boardClass.state");
    expect(src).toContain("public fire held");
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
