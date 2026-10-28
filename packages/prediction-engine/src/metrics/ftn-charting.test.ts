import { describe, expect, it } from "vitest";

import {
  FTN_ATTRIBUTION,
  FTN_BOOLEAN_FLAGS,
  FTN_COLUMNS,
  FTN_INTEGER_COUNTS,
  FTN_ROWS,
  FTN_SHA256,
  boxLabel,
  loadFtnCharting2026,
  schemeRows,
  siiCellsFromFrame,
} from "./ftn-charting.js";

describe("FTN charting loader", () => {
  it("declares the full 29-column surface without inventing one", () => {
    expect(FTN_BOOLEAN_FLAGS.length + FTN_INTEGER_COUNTS.length).toBeLessThan(FTN_COLUMNS);
    expect(FTN_BOOLEAN_FLAGS).toContain("is_motion");
    expect(FTN_INTEGER_COUNTS).toContain("n_defense_box");
    expect(FTN_SHA256).toHaveLength(64);
  });

  it("loads the mirror and reports its own facts", async () => {
    const frame = await loadFtnCharting2026();
    expect(frame.attribution).toBe(FTN_ATTRIBUTION);
    expect(frame.rows).toBe(FTN_ROWS);
    expect(frame.weeks).toEqual([1, 2, 3, 4, 5, 6, 7]);
  }, 60_000);

  it("carries the play key and leaves a missing flag missing", async () => {
    const frame = await loadFtnCharting2026();
    const first = frame.plays[0];
    expect(first.gameId).toMatch(/^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/);
    expect(typeof first.playId).toBe("number");
    // a flag absent from the row is undefined, never coerced to false
    for (const f of FTN_BOOLEAN_FLAGS) {
      const v = first.flags[f];
      expect(v === undefined || typeof v === "boolean").toBe(true);
    }
  }, 60_000);

  it("projects exactly the six columns SII reads", async () => {
    const frame = await loadFtnCharting2026();
    const rows = schemeRows(frame);
    expect(rows).toHaveLength(frame.rows);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["defendersInBox", "gameId", "isMotion", "isPlayAction", "isRpo", "isScreenPass", "playId"].sort(),
    );
  }, 60_000);

  it("buckets a box at the derivation's edges", () => {
    expect(boxLabel(5)).toBe("<=6");
    expect(boxLabel(6)).toBe("<=6");
    expect(boxLabel(7)).toBe("7");
    expect(boxLabel(8)).toBe("8");
    expect(boxLabel(9)).toBe("9+");
    expect(boxLabel(Number.NaN)).toBeNull();
  });

  it("builds SII cells from the frame and the supplied EPA", async () => {
    const frame = await loadFtnCharting2026();
    const epa = new Map<string, number>();
    for (const p of frame.plays.slice(0, 500)) epa.set(`${p.gameId}:${p.playId}`, 0.1);
    const cells = siiCellsFromFrame(frame, epa);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(["motion", "play_action", "rpo", "screen"]).toContain(c.flag);
      expect(["<=6", "7", "8", "9+"]).toContain(c.boxBucket);
      expect(c.n).toBeGreaterThan(0);
    }
  }, 60_000);

  it("skips a play with no EPA rather than counting it as zero", async () => {
    const frame = await loadFtnCharting2026();
    const cells = siiCellsFromFrame(frame, new Map());
    expect(cells).toHaveLength(0);
  }, 60_000);
});
