import { describe, expect, it } from "vitest";
import { walkForwardSplits, type TimedRow } from "../walk-forward";

interface MarketRow extends TimedRow {
  readonly fixtureId: string;
}

function iso(day: number): string {
  return new Date(Date.UTC(2024, 0, day, 18, 0, 0)).toISOString();
}

function row(id: string, fixtureId: string, day: number): MarketRow {
  return {
    id,
    fixtureId,
    decisionAt: iso(day),
    eventEndAt: iso(day + 1),
  };
}

describe("walk-forward fixture grouping", () => {
  it("with a group key, no fixture spans a fold boundary (enumerated)", () => {
    // Three fixtures, two markets each, staggered in time so a row-index
    // cut would put one fixture's markets on both sides of a fold.
    const rows: MarketRow[] = [
      row("g1-ml", "g1", 1),
      row("g1-spread", "g1", 1),
      row("g2-ml", "g2", 2),
      row("g2-spread", "g2", 2),
      row("g3-ml", "g3", 3),
      row("g3-spread", "g3", 3),
      row("g4-ml", "g4", 4),
      row("g4-spread", "g4", 4),
      row("g5-ml", "g5", 5),
      row("g5-spread", "g5", 5),
    ];

    const folds = walkForwardSplits(rows, {
      folds: 2,
      minTrainFraction: 0.4,
      embargoMs: 0,
      groupKey: (r) => r.fixtureId,
    });

    expect(folds.length).toBeGreaterThan(0);
    for (const fold of folds) {
      const trainGroups = new Set(fold.train.map((r) => r.fixtureId));
      const testGroups = new Set(fold.test.map((r) => r.fixtureId));
      const overlap: string[] = [];
      for (const g of testGroups) {
        if (trainGroups.has(g)) overlap.push(g);
      }
      expect(overlap, `fold ${fold.fold} leaked fixtures: ${overlap.join(",")}`).toEqual([]);
    }
  });

  it("without a group key, a multi-market fixture CAN straddle a row-index cut (current path unchanged)", () => {
    const rows: MarketRow[] = [
      row("g1-ml", "g1", 1),
      row("g1-spread", "g1", 1),
      row("g2-ml", "g2", 2),
      row("g2-spread", "g2", 2),
      row("g3-ml", "g3", 3),
      row("g3-spread", "g3", 3),
      row("g4-ml", "g4", 4),
      row("g4-spread", "g4", 4),
    ];
    const withKey = walkForwardSplits(rows, {
      folds: 2,
      minTrainFraction: 0.25,
      embargoMs: 0,
      groupKey: (r) => r.fixtureId,
    });
    const without = walkForwardSplits(rows, {
      folds: 2,
      minTrainFraction: 0.25,
      embargoMs: 0,
    });
    expect(without.length).toBeGreaterThan(0);
    expect(withKey.length).toBeGreaterThan(0);
  });

  it("no-duplicate ids: grouped vs ungrouped train/test ids are byte-identical", () => {
    const rows: MarketRow[] = [
      row("a", "a", 1),
      row("b", "b", 2),
      row("c", "c", 3),
      row("d", "d", 4),
      row("e", "e", 5),
      row("f", "f", 6),
    ];
    const opts = { folds: 2, minTrainFraction: 0.4, embargoMs: 0 } as const;
    const ungrouped = walkForwardSplits(rows, opts);
    const grouped = walkForwardSplits(rows, { ...opts, groupKey: (r) => r.id });
    expect(ungrouped.map((f) => f.train.map((r) => r.id))).toEqual(
      grouped.map((f) => f.train.map((r) => r.id)),
    );
    expect(ungrouped.map((f) => f.test.map((r) => r.id))).toEqual(
      grouped.map((f) => f.test.map((r) => r.id)),
    );
  });

  it("a fixture whose rows would straddle a boundary is moved wholly to one side", () => {
    const rows: MarketRow[] = [
      row("early-ml", "early", 1),
      row("straddle-ml", "straddle", 2),
      row("straddle-spread", "straddle", 3),
      row("late-ml", "late", 4),
      row("later-ml", "later", 5),
      row("last-ml", "last", 6),
    ];
    const folds = walkForwardSplits(rows, {
      folds: 2,
      minTrainFraction: 0.3,
      embargoMs: 0,
      groupKey: (r) => r.fixtureId,
    });
    for (const fold of folds) {
      const train = new Set(fold.train.map((r) => r.fixtureId));
      const test = new Set(fold.test.map((r) => r.fixtureId));
      expect([...train].filter((g) => test.has(g))).toEqual([]);
      const straddleTrain = fold.train.filter((r) => r.fixtureId === "straddle");
      const straddleTest = fold.test.filter((r) => r.fixtureId === "straddle");
      expect(straddleTrain.length === 0 || straddleTrain.length === 2).toBe(true);
      expect(straddleTest.length === 0 || straddleTest.length === 2).toBe(true);
    }
  });

  it("reports the leak-rate gap between grouped and ungrouped on duplicated fixtures", () => {
    // Same fixture at day 1 AND day 8 so a row-index cut puts them on
    // opposite sides unless grouped.
    const rows: MarketRow[] = [];
    for (let d = 1; d <= 10; d++) {
      rows.push(row(`solo-${d}`, `solo-${d}`, d));
    }
    rows.push(row("dup-early", "DUP", 1));
    rows.push(row("dup-late", "DUP", 10));
    const opts = { folds: 2, minTrainFraction: 0.4, embargoMs: 0 } as const;
    const leak = (folds: ReturnType<typeof walkForwardSplits<MarketRow>>) => {
      let testN = 0;
      let leaked = 0;
      for (const fold of folds) {
        const trainG = new Set(fold.train.map((r) => r.fixtureId));
        for (const r of fold.test) {
          testN += 1;
          if (trainG.has(r.fixtureId)) leaked += 1;
        }
      }
      return { leaked, testN, rate: testN === 0 ? 0 : leaked / testN };
    };
    const ungrouped = leak(walkForwardSplits(rows, opts));
    const grouped = leak(walkForwardSplits(rows, { ...opts, groupKey: (r) => r.fixtureId }));
    expect(grouped.leaked).toBe(0);
    expect(ungrouped.leaked).toBeGreaterThan(0);
  });

  it("embargo classifies every group member, not only the earliest decisionAt", () => {
    const T0 = Date.parse("2024-01-01T00:00:00.000Z");
    const DAY = 86_400_000;
    const at = (days: number) => new Date(T0 + days * DAY).toISOString();
    const instant = (id: string, fixtureId: string, days: number): MarketRow => ({
      id,
      fixtureId,
      decisionAt: at(days),
      eventEndAt: at(days),
    });

    const rows: MarketRow[] = [];
    for (let i = 0; i < 8; i++) rows.push(instant(`solo-${i}`, `solo-${i}`, i));
    // Earliest member is in the first training window. Later member sits in
    // the gap (fold-0 testEnd, fold-1 testStart] which is fold-0's embargo
    // once embargoMs covers that gap. Classification on first.decisionAt
    // alone would put both members in fold-1 train.
    rows.push(instant("leak-early", "LEAK", 1));
    rows.push(instant("leak-late", "LEAK", 4.5));

    const folds = walkForwardSplits(rows, {
      folds: 2,
      minTrainFraction: 0.5,
      embargoMs: 2 * DAY,
      groupKey: (r) => r.fixtureId,
    });
    expect(folds.length).toBe(2);
    const later = folds[1]!;
    expect(later.train.filter((r) => r.fixtureId === "LEAK")).toEqual([]);
    expect(
      later.embargoed
        .filter((r) => r.fixtureId === "LEAK")
        .map((r) => r.id)
        .sort(),
    ).toEqual(["leak-early", "leak-late"]);
  });

  it("refuses a group member whose own eventEndAt precedes its own decisionAt (not hidden by collapse)", () => {
    const rows: MarketRow[] = [
      row("ok-a", "G", 1),
      {
        id: "bad-b",
        fixtureId: "G",
        decisionAt: iso(4),
        eventEndAt: iso(2),
      },
      row("g2-ml", "g2", 2),
      row("g3-ml", "g3", 3),
      row("g4-ml", "g4", 4),
      row("g5-ml", "g5", 5),
    ];
    expect(() =>
      walkForwardSplits(rows, {
        folds: 2,
        minTrainFraction: 0.4,
        embargoMs: 0,
        groupKey: (r) => r.fixtureId,
      }),
    ).toThrow(/bad-b.*eventEndAt precedes decisionAt/);
  });
});
