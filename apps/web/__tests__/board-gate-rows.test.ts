import { describe, expect, it } from "vitest";
import {
  buildCalibrationRows,
  buildCandidateRows,
  resolvePickSide,
  stratumOf,
  type RawPickRow,
} from "@/lib/board/gate-rows";

/**
 * The mapping layer is where a plausible-looking wrong value would enter the
 * gate and come back out as a confident, wrong decision. Every test here is
 * about refusing to guess:
 *
 *  - a push is not a loss
 *  - an unidentifiable side is not "away"
 *  - a totals market is not a home/away market
 *  - a missing price is not a zero probability
 */

const base: RawPickRow = {
  id: "pick-1",
  selection: "Chiefs -3.5",
  confidence: 72,
  pickType: "SPREAD",
  result: "WIN",
  sportName: "nfl",
  homeTeamName: "Chiefs",
  awayTeamName: "Raiders",
  homePrice: -110,
  awayPrice: -110,
};

describe("resolvePickSide — the third answer exists", () => {
  it("identifies the home side", () => {
    expect(resolvePickSide("Chiefs -3.5", "Chiefs", "Raiders")).toBe("home");
  });

  it("identifies the away side", () => {
    expect(resolvePickSide("Raiders +3.5", "Chiefs", "Raiders")).toBe("away");
  });

  it("returns UNDETERMINED rather than defaulting to away when neither matches", () => {
    // This is the case selectionIsHomeSide alone cannot express: a bare
    // boolean makes "no match" indistinguishable from a real away pick, and
    // the side decides which devigged probability becomes q.
    expect(resolvePickSide("OVER 48.5", "Chiefs", "Raiders")).toBe("undetermined");
    expect(resolvePickSide("Broncos -7", "Chiefs", "Raiders")).toBe("undetermined");
  });
});

describe("buildCalibrationRows — a push is not a loss", () => {
  it("includes WIN as y=1 and LOSS as y=0", () => {
    const { rows } = buildCalibrationRows([
      { ...base, id: "w", result: "WIN" },
      { ...base, id: "l", result: "LOSS" },
    ]);
    expect(rows.find((r) => r.rowId === "w")!.y).toBe(1);
    expect(rows.find((r) => r.rowId === "l")!.y).toBe(0);
  });

  it("EXCLUDES push, void, and pending — never coerces them to a loss", () => {
    const { rows } = buildCalibrationRows([
      { ...base, id: "p", result: "PUSH" },
      { ...base, id: "v", result: "VOID" },
      { ...base, id: "n", result: "PENDING" },
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe("buildCalibrationRows — q is a real devig, and absent inputs are reported", () => {
  it("devigs both sides and assigns the picked side's probability", () => {
    const { rows } = buildCalibrationRows([base]);
    const row = rows[0]!;

    // -110/-110 devigs to 0.5/0.5.
    expect(row.q).toBeCloseTo(0.5, 10);
    expect(row.score).toBeCloseTo(0.72, 10);
    expect(row.stratum).toBe("nfl|SPREAD");
  });

  it("assigns the AWAY probability for an away pick — not the home one", () => {
    // Home -200 (0.667 implied), away +150 (0.4 implied) -> devigged ~0.625/0.375.
    const { rows } = buildCalibrationRows([
      { ...base, selection: "Raiders +6.5", homePrice: -200, awayPrice: 150 },
    ]);
    const row = rows[0]!;
    expect(row.q).toBeGreaterThan(0.3);
    expect(row.q).toBeLessThan(0.45);
  });

  it("excludes a row with no two-sided odds and names the missing field", () => {
    const { rows, excluded } = buildCalibrationRows([
      { ...base, homePrice: null },
    ]);
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("two-sided odds");
  });

  it("excludes an undeterminable side rather than defaulting it", () => {
    const { rows, excluded } = buildCalibrationRows([
      { ...base, selection: "Broncos -7" },
    ]);
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("matched neither team");
  });

  it("excludes TOTAL markets — they are not a home/away devig", () => {
    const { rows, excluded } = buildCalibrationRows([
      { ...base, pickType: "TOTAL", selection: "OVER 48.5" },
    ]);
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("totals are not a home/away market");
  });

  it("every produced q is a probability in (0,1) and every score in [0,1]", () => {
    const { rows } = buildCalibrationRows([
      base,
      { ...base, id: "b", selection: "Raiders +3.5", homePrice: -250, awayPrice: 200 },
      { ...base, id: "c", confidence: 0 },
      { ...base, id: "d", confidence: 100 },
    ]);
    for (const r of rows) {
      expect(r.q).toBeGreaterThan(0);
      expect(r.q).toBeLessThan(1);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("buildCandidateRows — only pending picks, and y is inert", () => {
  it("takes PENDING only", () => {
    const { rows } = buildCandidateRows([
      { ...base, id: "pend", result: "PENDING" },
      { ...base, id: "won", result: "WIN" },
    ]);
    expect(rows.map((r) => r.rowId)).toEqual(["pend"]);
  });

  it("sets y=0 as an inert placeholder, not a claim the pick lost", () => {
    const { rows } = buildCandidateRows([{ ...base, result: "PENDING" }]);
    // Documented contract: y is unread for candidates. Pinned so a future
    // change that starts reading it has to confront this deliberately.
    expect(rows[0]!.y).toBe(0);
  });

  it("applies the same exclusion rules as calibration", () => {
    const { rows, excluded } = buildCandidateRows([
      { ...base, result: "PENDING", awayPrice: null },
    ]);
    expect(rows).toHaveLength(0);
    expect(excluded).toHaveLength(1);
  });
});

describe("stratumOf", () => {
  it("is `${sport}|${pickType}`", () => {
    expect(stratumOf(base)).toBe("nfl|SPREAD");
    expect(stratumOf({ ...base, sportName: "nba", pickType: "MONEYLINE" })).toBe("nba|MONEYLINE");
  });
});
