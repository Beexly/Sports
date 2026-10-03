import { describe, expect, it } from "vitest";
import {
  resolveBoardSurface,
  boardSurfacePosture,
} from "@/lib/board/board-surface-policy";

describe("board surface policy", () => {
  it("auto signal when odds not fresh / unset", () => {
    expect(resolveBoardSurface({})).toBe("signal");
    expect(boardSurfacePosture({}).killSwitch).toBe("slate_fresh");
  });

  it("market when oddsFresh true and no explicit env", () => {
    expect(resolveBoardSurface({}, { oddsFresh: true })).toBe("market");
  });

  it("signal mode slate-fresh model label", () => {
    const p = boardSurfacePosture({ PUBLIC_BOARD_SURFACE: "signal" });
    expect(p.surface).toBe("signal");
    expect(p.killSwitch).toBe("slate_fresh");
    expect(p.lineLabel).toBe("model_signal");
  });
});
