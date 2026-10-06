import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_TAIL_FLOOR,
  CONFIDENCE_TAIL_MIN_N,
  loadConfidenceTail,
  summarizeConfidenceTail,
  type ConfidenceTailDb,
  type ConfidenceTailRow,
} from "@/lib/calibration/confidence-tail";

function rows(spec: Array<[confidence: number, wins: number, losses: number, version?: string]>): ConfidenceTailRow[] {
  const out: ConfidenceTailRow[] = [];
  for (const [confidence, wins, losses, version = "v5.2.7"] of spec) {
    for (let i = 0; i < wins; i++) out.push({ confidence, result: "WIN", modelVersion: version });
    for (let i = 0; i < losses; i++) out.push({ confidence, result: "LOSS", modelVersion: version });
  }
  return out;
}

describe("summarizeConfidenceTail", () => {
  it("reproduces the 2026-09-02 production finding: the ≥80 tail is inverted", () => {
    // Observed buckets (n, wins): 80→(77,28) 85→(39,13) 90→(17,8) 95→(11,5) 100→(8,7)
    const s = summarizeConfidenceTail(
      rows([
        [82, 28, 49, "v5.0.0"],
        [87, 13, 26, "v5.0.0"],
        [92, 8, 9, "v5.1.0"],
        [96, 5, 6, "v5.1.0"],
        [100, 7, 1, "v5.2.7"],
      ]),
    );
    expect(s.floor).toBe(CONFIDENCE_TAIL_FLOOR);
    expect(s.n).toBe(152);
    expect(s.wins).toBe(61);
    expect(s.winRate).toBeCloseTo(0.4013, 3);
    expect(s.claimedRate).toBeGreaterThan(0.8);
    expect(s.verdict).toBe("inverted");
    expect(s.operatorHint).toMatch(/anti-predictive/);
    expect(s.byVersion.map((v) => v.modelVersion)).toEqual(["v5.0.0", "v5.1.0", "v5.2.7"]);
    expect(s.byVersion[2]).toEqual({ modelVersion: "v5.2.7", n: 8, wins: 7, winRate: 0.875 });
  });

  it("never issues a verdict below the sample floor", () => {
    const s = summarizeConfidenceTail(rows([[85, 2, CONFIDENCE_TAIL_MIN_N - 3]]));
    expect(s.n).toBe(CONFIDENCE_TAIL_MIN_N - 1);
    expect(s.verdict).toBe("insufficient");
    expect(s.operatorHint).toMatch(/no tail verdict yet/);
  });

  it("overconfident when the tail wins but far less than it claims; calibrated when it earns it", () => {
    expect(summarizeConfidenceTail(rows([[85, 33, 27]])).verdict).toBe("overconfident"); // 55% vs 85%
    expect(summarizeConfidenceTail(rows([[82, 48, 12]])).verdict).toBe("calibrated"); // 80% vs 82%
  });

  it("ignores rows below the floor and non-finite confidences", () => {
    const s = summarizeConfidenceTail([
      ...rows([[79, 10, 0]]),
      { confidence: Number.NaN, result: "WIN", modelVersion: "v5.2.7" },
      ...rows([[80, 1, 1]]),
    ]);
    expect(s.n).toBe(2);
    expect(s.brier).toBeCloseTo(((0.8 - 1) ** 2 + 0.8 ** 2) / 2, 6);
  });
});

describe("summarizeConfidenceTail — by market", () => {
  it("splits the tail per market so the moneyline tail can be read on its own", () => {
    const s = summarizeConfidenceTail(
      [
        { confidence: 85, result: "WIN", modelVersion: "v5.2.7", pickType: "MONEYLINE" },
        { confidence: 90, result: "LOSS", modelVersion: "v5.2.7", pickType: "MONEYLINE" },
        { confidence: 82, result: "LOSS", modelVersion: "v5.2.7", pickType: "SPREAD" },
        { confidence: 70, result: "WIN", modelVersion: "v5.2.7", pickType: "SPREAD" }, // below the floor
      ],
      { minN: 1 },
    );
    expect(s.byMarket).toEqual([
      { market: "MONEYLINE", n: 2, wins: 1, winRate: 0.5, claimedRate: 0.875 },
      { market: "SPREAD", n: 1, wins: 0, winRate: 0, claimedRate: 0.82 },
    ]);
  });

  it("reports no market rows when the rows carry no pickType", () => {
    const s = summarizeConfidenceTail([{ confidence: 85, result: "WIN", modelVersion: "v5.2.7" }], { minN: 1 });
    expect(s.byMarket).toEqual([]);
  });
});

describe("loadConfidenceTail", () => {
  it("reads only graded WIN/LOSS picks at or above the floor from the public population (published, non-bootstrap, not seed)", async () => {
    let seenArgs: unknown = null;
    const db: ConfidenceTailDb = {
      pick: {
        findMany: async (args) => {
          seenArgs = args;
          return [
            { confidence: 85, result: "WIN", modelVersion: "v5.2.7", pickType: "MONEYLINE" },
            { confidence: 90, result: "LOSS", modelVersion: "v5.2.7", pickType: "SPREAD" },
            { confidence: 90, result: "PUSH", modelVersion: "v5.2.7", pickType: "TOTAL" }, // defensive: filtered client-side too
          ];
        },
      },
    };
    const s = await loadConfidenceTail(db, 80);
    // The loader selects pickType and must forward it: until 2026-09-05 the mapped
    // row dropped it, so byMarket was always empty on the public truth surface.
    expect(s.byMarket.map((m) => [m.market, m.n, m.wins])).toEqual([
      ["MONEYLINE", 1, 1],
      ["SPREAD", 1, 0],
    ]);
    expect(seenArgs).toMatchObject({
      where: {
        result: { in: ["WIN", "LOSS"] },
        confidence: { gte: 80 },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
    });
    expect(s.n).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.verdict).toBe("insufficient");
  });

  /**
   * C-302: the tail verdict is a public number, so a row generated at or after
   * kickoff (priced off a LIVE line that already encodes part of the outcome) must
   * not move it. The withheld row here is a WIN at 90 on purpose — it is the row
   * that would help the tail — while the kept row is a LOSS, so the exclusion
   * cannot be mistaken for outcome-shopping.
   */
  it("withholds a row generated at or after kickoff and discloses the count with its denominator", async () => {
    const kickoff = new Date("2026-09-10T23:00:00Z");
    const db: ConfidenceTailDb = {
      pick: {
        findMany: async () => [
          {
            confidence: 90,
            result: "WIN",
            modelVersion: "v5.2.7",
            pickType: "MONEYLINE",
            generatedAt: new Date("2026-09-10T23:30:00Z"), // after kickoff
            game: { commenceTime: kickoff },
          },
          {
            confidence: 90,
            result: "LOSS",
            modelVersion: "v5.2.7",
            pickType: "MONEYLINE",
            generatedAt: new Date("2026-09-10T09:00:00Z"), // pre-game
            game: { commenceTime: kickoff },
          },
        ],
      },
    };
    const s = await loadConfidenceTail(db, 80);
    expect(s.n).toBe(1);
    expect(s.wins).toBe(0);
    expect(s.excludedInPlay).toBe(1);
    expect(s.inPlayNote).toMatch(/Excluded 1 of 2 settled rows as in-play/);
  });

  it("keeps a row whose clocks cannot be read, and reports zero exclusions", async () => {
    // Absent means "cannot tell": dropping would shrink the published denominator
    // by however much the data happened to be missing.
    const db: ConfidenceTailDb = {
      pick: {
        findMany: async () => [
          { confidence: 90, result: "WIN", modelVersion: "v5.2.7", pickType: "MONEYLINE", generatedAt: null, game: null },
        ],
      },
    };
    const s = await loadConfidenceTail(db, 80);
    expect(s.n).toBe(1);
    expect(s.excludedInPlay).toBe(0);
    expect(s.inPlayNote).toMatch(/Excluded 0 of 1 settled rows as in-play/);
  });
});
