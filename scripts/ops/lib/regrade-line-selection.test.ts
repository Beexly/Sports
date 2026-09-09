import { describe, expect, it } from "vitest";
import {
  buildRegradeReport,
  gradingBasisOf,
  gradingLineOf,
  isOffHalfPointGrid,
  latestLinePerBookmaker,
  refusedWriteFlag,
  regradeOne,
  resolveBookLine,
  type CalculateResultFn,
  type RegradeOddsRow,
  type RegradePickRow,
} from "./regrade-line-selection";

/**
 * C-284 (ledger C-197). Fixtures only — every number is a LINE or a SCORE on a
 * fixture game, and nothing here is or becomes product data.
 */

const at = (iso: string): Date => new Date(iso);
const PUBLISH = at("2026-09-01T12:00:00Z");

const odds = (
  bookmaker: string,
  line: number | null,
  fetchedAt = "2026-09-01T11:00:00Z",
): RegradeOddsRow => ({ bookmaker, line, fetchedAt: at(fetchedAt) });

function pick(over: Partial<RegradePickRow> = {}): RegradePickRow {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.2",
    line: -3.25,
    clvLockLine: -3.25,
    proofReceipt: null,
    result: "LOSS",
    generatedAt: PUBLISH,
    sportKey: "americanfootball_nfl",
    homeTeamName: "Fixture Home Bears",
    awayTeamName: "Fixture Away Hawks",
    homeScore: 24,
    awayScore: 21,
    ...over,
  };
}

/** The engine's rule, inlined so the test does not depend on its import path. */
const calc: CalculateResultFn = (pickType, selection, line, homeTeam, homeScore, awayScore) => {
  if (pickType === "SPREAD") {
    const pickedHome = selection.startsWith(homeTeam);
    const cover = homeScore - awayScore + line;
    if (cover === 0) return "PUSH";
    return (pickedHome ? cover > 0 : cover < 0) ? "WIN" : "LOSS";
  }
  const total = homeScore + awayScore;
  if (total === line) return "PUSH";
  return (selection.startsWith("OVER") ? total > line : total < line) ? "WIN" : "LOSS";
};

describe("latestLinePerBookmaker — the calibration loader's resolver order", () => {
  it("keeps each real book's latest row at or before generatedAt", () => {
    const rows = [
      odds("dk", -3, "2026-09-01T08:00:00Z"),
      odds("dk", -3.5, "2026-09-01T11:00:00Z"),
      odds("fd", -3.5, "2026-09-01T09:00:00Z"),
    ];
    expect(latestLinePerBookmaker(rows, PUBLISH).map((r) => [r.bookmaker, r.line])).toEqual([
      ["dk", -3.5],
      ["fd", -3.5],
    ]);
  });

  it("ignores a row a book posted AFTER we published", () => {
    const rows = [odds("dk", -7, "2026-09-01T18:00:00Z"), odds("fd", -3.5)];
    expect(latestLinePerBookmaker(rows, PUBLISH).map((r) => r.bookmaker)).toEqual(["fd"]);
  });

  it("ignores non-book writers and rows carrying no line", () => {
    const rows = [odds("rundown_default", -3.5), odds("dk", null), odds(" ", -3.5)];
    expect(latestLinePerBookmaker(rows, PUBLISH)).toEqual([]);
  });
});

describe("resolveBookLine", () => {
  it("takes the modal line across books", () => {
    const r = resolveBookLine([odds("a", -3), odds("b", -3.5), odds("c", -3.5)], PUBLISH, -3.25);
    expect(r).toEqual({ bookLine: -3.5, bookCount: 3, modalCount: 2 });
  });

  it("breaks a tie toward the line nearest the stored value", () => {
    // -3 and -3.5 each have one book; stored -3.1 is nearer -3.
    const r = resolveBookLine([odds("a", -3), odds("b", -3.5)], PUBLISH, -3.1);
    expect(r.bookLine).toBe(-3);
    expect(r.modalCount).toBe(1);
  });

  it("reports NONE when no real book quoted a line by publish time", () => {
    expect(resolveBookLine([odds("rundown_default", -3.5)], PUBLISH, -3.25)).toEqual({
      bookLine: null,
      bookCount: 0,
      modalCount: 0,
    });
  });
});

describe("gradingBasisOf — mirrors judgementFor in the lane", () => {
  const at = (iso: string): Date => new Date(iso);
  const base = { line: -3.25, generatedAt: at("2026-09-01T12:00:00Z") };

  it("prefers the immutable lock and honours a genuine zero", () => {
    expect(gradingLineOf({ ...base, clvLockLine: -3.5, proofReceipt: null })).toBe(-3.5);
    expect(gradingLineOf({ ...base, clvLockLine: 0, proofReceipt: null })).toBe(0);
  });

  it("falls back to the proof receipt's line AND its asOf, never to `line`", () => {
    const receiptAt = at("2026-08-30T10:00:00Z");
    const basis = gradingBasisOf({
      ...base,
      clvLockLine: null,
      proofReceipt: { line: -4.5, asOf: receiptAt },
    });
    expect(basis).toEqual({
      kind: "resolved",
      line: -4.5,
      asOf: receiptAt,
      basis: "proof_receipt_at_as_of",
    });
  });

  it("is UNRESOLVABLE with no lock and no receipt — `line` has drifted since publish", () => {
    expect(gradingBasisOf({ ...base, clvLockLine: null, proofReceipt: null })).toEqual({
      kind: "unresolvable",
      basis: "no_publish_lock",
    });
    expect(gradingLineOf({ ...base, clvLockLine: null, proofReceipt: null })).toBeNull();
  });
});

describe("isOffHalfPointGrid", () => {
  it("selects the candidates and clears grid values", () => {
    expect(isOffHalfPointGrid(-3.25)).toBe(true);
    expect(isOffHalfPointGrid(-53.833333333333336)).toBe(true);
    expect(isOffHalfPointGrid(-3.5)).toBe(false);
    expect(isOffHalfPointGrid(44)).toBe(false);
  });
});

describe("regradeOne", () => {
  it("reports a difference when the book line flips the recorded result", () => {
    // Home wins by 3. Stored -3.25 => cover -0.25 => LOSS (on record).
    // Book line -3 => cover 0 => PUSH. Different.
    const v = regradeOne(pick(), [odds("a", -3), odds("b", -3)], calc);
    expect(v).toMatchObject({
      status: "compared",
      storedLine: -3.25,
      bookLine: -3,
      storedResult: "LOSS",
      bookResult: "PUSH",
      differs: true,
    });
  });

  it("reports no difference when the book line agrees with the record", () => {
    const v = regradeOne(pick(), [odds("a", -3.5), odds("b", -3.5)], calc);
    expect(v).toMatchObject({ status: "compared", bookResult: "LOSS", differs: false });
  });

  it("grades against the LOCKED line, not the drifting one", () => {
    const v = regradeOne(pick({ clvLockLine: -6.25 }), [odds("a", -3)], calc);
    expect(v).toMatchObject({ status: "compared", storedLine: -6.25 });
  });

  it("refuses a legacy row with no lock and no receipt rather than guessing", () => {
    const v = regradeOne(pick({ clvLockLine: null, proofReceipt: null }), [odds("a", -3)], calc);
    expect(v).toEqual({ status: "no_publish_lock" });
  });

  it("uses the receipt's asOf, so a quote posted after it cannot vouch", () => {
    const v = regradeOne(
      pick({ clvLockLine: null, proofReceipt: { line: -3.25, asOf: at("2026-09-01T10:00:00Z") } }),
      [odds("a", -3.25, "2026-09-01T11:00:00Z")], // AFTER the receipt
      calc,
    );
    expect(v).toEqual({ status: "no_book_line" });
  });

  it("returns no_book_line rather than inventing one", () => {
    expect(regradeOne(pick(), [], calc)).toEqual({ status: "no_book_line" });
  });

  it("returns no_final when the game carries no score", () => {
    expect(regradeOne(pick({ homeScore: null }), [odds("a", -3)], calc)).toEqual({
      status: "no_final",
    });
  });
});

describe("buildRegradeReport", () => {
  it("aggregates by sport and market and keeps NONE out of the compared set", () => {
    const total = pick({
      id: "c",
      pickType: "TOTAL",
      selection: "OVER 44.3",
      line: 44.333333333333336,
    });
    const rows = [
      { pick: pick({ id: "a" }), verdict: regradeOne(pick({ id: "a" }), [odds("x", -3)], calc) },
      { pick: pick({ id: "b" }), verdict: regradeOne(pick({ id: "b" }), [], calc) },
      { pick: total, verdict: regradeOne(total, [odds("x", 44)], calc) },
    ];
    const report = buildRegradeReport(rows);
    expect(report.examined).toBe(3);
    expect(report.compared).toBe(2);
    expect(report.noBookLine).toBe(1);
    expect(report.buckets).toHaveLength(2);
    const spread = report.buckets.find((b) => b.pickType === "SPREAD")!;
    expect(spread).toMatchObject({ examined: 2, compared: 1, noBookLine: 1, differs: 1 });
  });
});

describe("refusedWriteFlag — the tool has no write mode", () => {
  it("names any write flag it is handed", () => {
    expect(refusedWriteFlag(["--json"])).toBeNull();
    for (const flag of ["--execute", "--write", "--apply", "--fix", "--regrade"]) {
      expect(refusedWriteFlag([flag])).toBe(flag);
    }
  });
});
