import { describe, it, expect } from "vitest";
import {
  dropContradictedModelSignals,
  countContradictedModelSignals,
  isModelSignalRow,
} from "./model-signal-coherence";

/** Minimal row; the rule only reads gameId and bookmakerCount. */
const row = (
  id: string,
  gameId: string,
  bookmakerCount: number | null,
  selection = "",
) => ({ id, gameId, bookmakerCount, selection });

describe("model-signal coherence", () => {
  it("identifies a model-signal row by an absent or zero book count", () => {
    expect(isModelSignalRow(row("a", "g1", 0))).toBe(true);
    expect(isModelSignalRow(row("b", "g1", null))).toBe(true);
    expect(isModelSignalRow(row("c", "g1", 11))).toBe(false);
  });

  it("drops the exact production contradiction: Bears -3.0 beside Panthers ML (model signal)", () => {
    // Measured live 2026-09-13T16:00Z on game cmpg6t8pl000f1hera7bgiigu.
    const rows = [
      row("spread", "bears-panthers", 11, "Chicago Bears -3.0"),
      row("ml", "bears-panthers", 0, "Carolina Panthers ML (model signal)"),
    ];
    const kept = dropContradictedModelSignals(rows);
    expect(kept.map((r) => r.selection)).toEqual(["Chicago Bears -3.0"]);
  });

  it("drops the second production contradiction: Blue Jays -1.5 beside Orioles ML (model signal)", () => {
    const rows = [
      row("spread", "orioles-jays", 11, "Toronto Blue Jays -1.5"),
      row("ml", "orioles-jays", 0, "Baltimore Orioles ML (model signal)"),
      row("total", "orioles-jays", 11, "UNDER 7.5"),
    ];
    const kept = dropContradictedModelSignals(rows);
    expect(kept.map((r) => r.selection)).toEqual([
      "Toronto Blue Jays -1.5",
      "UNDER 7.5",
    ]);
  });

  it("KEEPS a model signal when it is the only read on that game", () => {
    // The honest free-spine case: no book could price this game at all.
    const rows = [
      row("ml", "raiders-dolphins", 0, "Las Vegas Raiders ML (model signal)"),
    ];
    expect(dropContradictedModelSignals(rows)).toHaveLength(1);
  });

  it("keeps model signals on one game while dropping them on another", () => {
    const rows = [
      row("a", "priced", 11, "Detroit Lions ML (-324)"),
      row("b", "priced", 0, "New Orleans Saints ML (model signal)"),
      row("c", "unpriced", 0, "Cincinnati Bengals ML (model signal)"),
    ];
    const kept = dropContradictedModelSignals(rows);
    expect(kept.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("never drops a book-priced row, even when several share a game", () => {
    const rows = [
      row("a", "g", 11, "Yankees -1.5"),
      row("b", "g", 11, "Yankees ML (-185)"),
      row("c", "g", 11, "OVER 7.5"),
    ];
    expect(dropContradictedModelSignals(rows)).toHaveLength(3);
  });

  it("preserves input order for the survivors", () => {
    const rows = [
      row("m1", "g1", 0),
      row("b1", "g1", 11),
      row("m2", "g2", 0),
      row("b2", "g3", 11),
    ];
    expect(dropContradictedModelSignals(rows).map((r) => r.id)).toEqual([
      "b1",
      "m2",
      "b2",
    ]);
  });

  it("is a no-op on an empty set and on an all-model-signal set", () => {
    expect(dropContradictedModelSignals([])).toEqual([]);
    const allSignal = [row("a", "g1", 0), row("b", "g2", 0)];
    expect(dropContradictedModelSignals(allSignal)).toHaveLength(2);
  });

  it("counts what it removed", () => {
    const rows = [
      row("a", "g", 11),
      row("b", "g", 0),
      row("c", "g", 0),
      row("d", "other", 0),
    ];
    expect(countContradictedModelSignals(rows)).toBe(2);
  });

  it("returns a new array and does not mutate the input", () => {
    const rows = [row("a", "g", 11), row("b", "g", 0)];
    const before = rows.length;
    dropContradictedModelSignals(rows);
    expect(rows).toHaveLength(before);
  });
});
