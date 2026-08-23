import { describe, expect, it } from "vitest";
import { shapeClvLedgerRows, type RawClvPickRow } from "./user-clv-ledger";

const RAW_ROW: RawClvPickRow = {
  id: "pick-1",
  pickType: "SPREAD",
  selection: "Chiefs -3.5",
  line: -3.5,
  result: "WIN",
  settledAt: new Date("2026-08-20T00:00:00.000Z"),
  clvValue: 1.4,
  clvKind: "POINTS",
  clvVerdict: "BEAT_CLOSE",
  clvCloseLine: -4.5,
  clvClosePrice: -110,
  clvLockLine: -3.5,
  clvLockPrice: -110,
  game: { sport: { name: "NFL" } },
};

const UNGRADED_RAW_ROW: RawClvPickRow = {
  ...RAW_ROW,
  id: "pick-2",
  clvValue: null,
  clvKind: null,
  clvVerdict: null,
  clvCloseLine: null,
  clvClosePrice: null,
};

describe("shapeClvLedgerRows", () => {
  it("returns a locked, empty result for a non-ELITE viewer, regardless of input rows", () => {
    const result = shapeClvLedgerRows([RAW_ROW], false);
    expect(result).toEqual({ locked: true, rows: [] });
  });

  it("returns shaped rows for an ELITE viewer", () => {
    const result = shapeClvLedgerRows([RAW_ROW], true);
    expect(result.locked).toBe(false);
    if (result.locked) throw new Error("expected unlocked");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      id: "pick-1",
      sport: "NFL",
      pickType: "SPREAD",
      selection: "Chiefs -3.5",
      line: -3.5,
      result: "WIN",
      settledAt: "2026-08-20T00:00:00.000Z",
      clvValue: 1.4,
      clvKind: "POINTS",
      clvVerdict: "BEAT_CLOSE",
      clvCloseLine: -4.5,
      clvClosePrice: -110,
      clvLockLine: -3.5,
      clvLockPrice: -110,
    });
  });

  it("a clvValue:null row is passed through honestly — never coerced to 0 or dropped", () => {
    const result = shapeClvLedgerRows([RAW_ROW, UNGRADED_RAW_ROW], true);
    if (result.locked) throw new Error("expected unlocked");
    expect(result.rows).toHaveLength(2);
    const ungraded = result.rows.find((r) => r.id === "pick-2")!;
    expect(ungraded.clvValue).toBeNull();
    expect(ungraded.clvVerdict).toBeNull();
  });

  it("falls back to a safe sport label when the game/sport relation is missing", () => {
    const result = shapeClvLedgerRows([{ ...RAW_ROW, game: null }], true);
    if (result.locked) throw new Error("expected unlocked");
    expect(result.rows[0]!.sport).toBe("Unknown");
  });

  it("never invents a result value outside the settled union", () => {
    const result = shapeClvLedgerRows(
      [{ ...RAW_ROW, result: "PUSH" }, { ...RAW_ROW, id: "pick-3", result: "VOID" }],
      true,
    );
    if (result.locked) throw new Error("expected unlocked");
    expect(result.rows.map((r) => r.result)).toEqual(["PUSH", "VOID"]);
  });
});
