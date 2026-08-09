import { describe, expect, it } from "vitest";
import {
  resolveBoardSurface,
  boardSurfacePosture,
} from "@/lib/board/board-surface-policy";

describe("board surface policy", () => {
  it("defaults to market", () => {
    expect(resolveBoardSurface({})).toBe("market");
    expect(boardSurfacePosture({}).killSwitch).toBe("odds_fresh");
  });

  it("signal mode slate-fresh model label", () => {
    const p = boardSurfacePosture({ PUBLIC_BOARD_SURFACE: "signal" });
    expect(p.surface).toBe("signal");
    expect(p.killSwitch).toBe("slate_fresh");
    expect(p.lineLabel).toBe("model_signal");
  });
});
