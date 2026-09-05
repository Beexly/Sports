import { describe, expect, it } from "vitest";
import { classifyBoardState } from "@/lib/board/classify-board-state";
import { liveBoardOn } from "@/lib/board/state";

describe("liveBoardOn env gate (D-3)", () => {
  it("only trimmed case-insensitive 'true' opens the gate — house flag convention", () => {
    expect(liveBoardOn({ LIVE_BOARD: "true" })).toBe(true);
    expect(liveBoardOn({ LIVE_BOARD: " TRUE " })).toBe(true);
    expect(liveBoardOn({ LIVE_BOARD: "1" })).toBe(false);
    expect(liveBoardOn({ LIVE_BOARD: "yes" })).toBe(false);
    expect(liveBoardOn({ LIVE_BOARD: "" })).toBe(false);
    expect(liveBoardOn({})).toBe(false);
    expect(liveBoardOn({ LIVE_BOARD: undefined })).toBe(false);
  });

  it("gate ON + real rows → HAS_ROWS (previously unreachable: hardcoded false)", () => {
    const r = classifyBoardState({
      liveBoardOn: liveBoardOn({ LIVE_BOARD: "true" }),
      bootstrap: false,
      rowCount: 3,
    });
    expect(r.state).toBe("HAS_ROWS");
    expect(r.refusePublicFire).toBe(false);
  });
});

describe("classifyBoardState", () => {
  it("LIVE_BOARD off → honest empty refuse public fire", () => {
    const r = classifyBoardState({
      liveBoardOn: false,
      bootstrap: false,
      rowCount: 0,
    });
    expect(r.state).toBe("HONEST_EMPTY_LIVE_BOARD_OFF");
    expect(r.honestEmpty).toBe(true);
    expect(r.refusePublicFire).toBe(true);
    expect(r.publicMessage).toMatch(/honesty-correct/i);
  });

  it("LIVE_BOARD on + rows → HAS_ROWS", () => {
    const r = classifyBoardState({
      liveBoardOn: true,
      bootstrap: false,
      rowCount: 3,
    });
    expect(r.state).toBe("HAS_ROWS");
    expect(r.refusePublicFire).toBe(false);
    expect(r.honestEmpty).toBe(false);
  });

  it("LIVE_BOARD on + zero rows → honest empty no eligible", () => {
    const r = classifyBoardState({
      liveBoardOn: true,
      bootstrap: false,
      rowCount: 0,
    });
    expect(r.state).toBe("HONEST_EMPTY_NO_ELIGIBLE");
    expect(r.honestEmpty).toBe(true);
    expect(r.refusePublicFire).toBe(true);
  });

  it("DB unreachable wins over LIVE_BOARD", () => {
    const r = classifyBoardState({
      liveBoardOn: true,
      bootstrap: false,
      rowCount: 5,
      dataError: "DB_UNREACHABLE",
    });
    expect(r.state).toBe("DB_UNREACHABLE");
    expect(r.refusePublicFire).toBe(true);
  });

  it("stale / demo suppression", () => {
    expect(
      classifyBoardState({
        liveBoardOn: false,
        bootstrap: false,
        rowCount: 0,
        suppressedReason: "STALE_DATA",
      }).state,
    ).toBe("SUPPRESSED_STALE");
    expect(
      classifyBoardState({
        liveBoardOn: false,
        bootstrap: false,
        rowCount: 0,
        suppressedReason: "DEMO_DATA",
      }).state,
    ).toBe("SUPPRESSED_DEMO");
  });

  it("bootstrap refuses public fire even with rows", () => {
    const r = classifyBoardState({
      liveBoardOn: true,
      bootstrap: true,
      rowCount: 2,
    });
    expect(r.state).toBe("BOOTSTRAP");
    expect(r.refusePublicFire).toBe(true);
  });
});
