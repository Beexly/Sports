import { describe, expect, it } from "vitest";
import {
  CORRUPTED_POPULATIONS,
  isOnRunLineLadder,
  narrow,
  reasonFor,
  summarize,
  whereFor,
  type CorruptedPickRow,
} from "../../../scripts/ops/lib/corrupted-pick-selection";

/**
 * The selection is the dangerous half of a remediation tool: it decides which
 * production rows get written. Every value below is a labelled fixture.
 */

const row = (over: Partial<CorruptedPickRow> & Pick<CorruptedPickRow, "id">): CorruptedPickRow => ({
  gameId: "game-fixture",
  pickType: "MONEYLINE",
  selection: "Fixture Home Sox ML",
  line: null,
  result: "WIN",
  settledAt: new Date("2026-09-01T00:00:00.000Z"),
  commenceTime: new Date("2026-09-01T18:00:00.000Z"),
  sportKey: "baseball_mlb",
  modelVersion: "v5.2.7",
  ...over,
});

describe("corrupted-pick selection — settled-before-kickoff (C-114)", () => {
  it("selects a pick graded before its own kickoff", () => {
    const out = narrow("settled-before-kickoff", [
      row({ id: "bad", settledAt: new Date("2026-09-01T00:00:00.000Z") }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["bad"]);
  });

  it("leaves a normally-settled pick alone", () => {
    // The whole population is defined by settledAt < commenceTime, so a pick
    // graded AFTER kickoff must never be selected. This is the control that
    // stops the tool unpublishing the healthy board.
    const out = narrow("settled-before-kickoff", [
      row({ id: "good", settledAt: new Date("2026-09-01T21:30:00.000Z") }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("leaves an ungraded pick alone", () => {
    const out = narrow("settled-before-kickoff", [row({ id: "pending", settledAt: null, result: "PENDING" })]);
    expect(out).toHaveLength(0);
  });

  it("reports the lead time in the reason, so a reviewer can sanity-check a row", () => {
    const r = row({ id: "x", settledAt: new Date("2026-09-01T06:00:00.000Z") });
    expect(reasonFor("settled-before-kickoff", r)).toContain("12.0h BEFORE kickoff");
  });
});

describe("corrupted-pick selection — soccer two-way moneyline (C-118)", () => {
  it("selects a soccer moneyline", () => {
    const out = narrow("soccer-two-way-ml", [
      row({ id: "s1", sportKey: "soccer_usa_mls", pickType: "MONEYLINE" }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["s1"]);
  });

  it("leaves a soccer TOTAL alone — the three-way problem is moneyline-only", () => {
    const out = narrow("soccer-two-way-ml", [
      row({ id: "s2", sportKey: "soccer_usa_mls", pickType: "TOTAL" }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("leaves a non-soccer moneyline alone", () => {
    const out = narrow("soccer-two-way-ml", [row({ id: "m1", sportKey: "baseball_mlb" })]);
    expect(out).toHaveLength(0);
  });
});

describe("corrupted-pick selection — MLB spreads off the run-line ladder (C-125)", () => {
  it("accepts every real run line, either side", () => {
    for (const line of [1.5, 2.5, 3.5]) {
      expect(isOnRunLineLadder(line)).toBe(true);
      expect(isOnRunLineLadder(-line)).toBe(true);
    }
  });

  it("selects the contaminated means measured on production", () => {
    const out = narrow(
      "mlb-off-runline",
      [1.833333333333333, 0.6818181818181818, 1.227272727272727, 4.5].map((line, i) =>
        row({ id: `off-${i}`, pickType: "SPREAD", line }),
      ),
    );
    expect(out).toHaveLength(4);
  });

  it("leaves a legitimate 1.5 run line alone", () => {
    const out = narrow("mlb-off-runline", [row({ id: "ok", pickType: "SPREAD", line: -1.5 })]);
    expect(out).toHaveLength(0);
  });

  it("leaves another sport's spread alone — the ladder is baseball-only", () => {
    // NCAAF -3.1667 is a legitimate consensus mean. A blanket must-be-quoted
    // rule would gut the football board, which is why this is sport-scoped.
    const out = narrow("mlb-off-runline", [
      row({ id: "ncaaf", sportKey: "americanfootball_ncaaf", pickType: "SPREAD", line: -3.1666666666666665 }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("tolerates float drift on a mean that lands on a real rung", () => {
    expect(isOnRunLineLadder((1.5 + 1.5 + 1.5) / 3)).toBe(true);
  });
});

describe("corrupted-pick selection — shared contract", () => {
  it("every population's query is scoped to PUBLISHED rows only", () => {
    // An unpublished row is already withdrawn; touching it again would be an
    // unscoped write, which is the thing this tool must never be.
    for (const p of CORRUPTED_POPULATIONS) {
      expect(whereFor(p)).toMatchObject({ isPublished: true });
    }
  });

  it("summarize reports the ids it will write, so the dry run is auditable", () => {
    const s = summarize("mlb-off-runline", [row({ id: "a", pickType: "SPREAD", line: 4.5 })]);
    expect(s).toMatchObject({ population: "mlb-off-runline", count: 1, pickIds: ["a"] });
  });
});
