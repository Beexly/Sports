import { describe, it, expect } from "vitest";
import {
  americanToImpliedProb,
  clv,
  rollupClv,
  buildClvBacktest,
  loadClvForward,
  type ClvPair,
} from "./clv-calibration";

describe("americanToImpliedProb", () => {
  it("converts even money (+100) to 0.5", () => {
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5, 10);
  });

  it("converts a +150 underdog to 0.40", () => {
    // 100 / (150 + 100) = 0.40
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4, 10);
  });

  it("converts a -200 favorite to ~0.6667", () => {
    // 200 / (200 + 100) = 0.6667
    expect(americanToImpliedProb(-200)).toBeCloseTo(2 / 3, 10);
  });

  it("converts a standard -110 to ~0.5238", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(110 / 210, 10);
  });

  it("returns null on zero / non-finite input (never fabricates)", () => {
    expect(americanToImpliedProb(0)).toBeNull();
    expect(americanToImpliedProb(Number.NaN)).toBeNull();
    expect(americanToImpliedProb(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("clv", () => {
  it("is positive when the model probability beats the close", () => {
    // model thinks 0.58, close implies 0.5238 → beat the close by ~0.056
    expect(clv(0.58, 0.5238)).toBeCloseTo(0.0562, 4);
  });

  it("is negative when the model trails the close", () => {
    expect(clv(0.48, 0.5238)).toBeLessThan(0);
  });

  it("is zero when the model matches the close exactly", () => {
    expect(clv(0.5238, 0.5238)).toBe(0);
  });

  it("rejects out-of-range or non-finite probabilities", () => {
    expect(clv(1.4, 0.5)).toBeNull();
    expect(clv(0.5, -0.1)).toBeNull();
    expect(clv(Number.NaN, 0.5)).toBeNull();
  });
});

describe("rollupClv", () => {
  it("returns an honest empty self-grade for no pairs", () => {
    const r = rollupClv([]);
    expect(r.count).toBe(0);
    expect(r.meanClv).toBe(0);
    expect(r.beatCloseRate).toBe(0);
  });

  it("a model that beats the close yields positive mean CLV", () => {
    const pairs: ClvPair[] = [
      { modelProb: 0.58, closingProb: 0.5238 },
      { modelProb: 0.61, closingProb: 0.5238 },
      { modelProb: 0.55, closingProb: 0.5238 },
    ];
    const r = rollupClv(pairs);
    expect(r.count).toBe(3);
    expect(r.meanClv).toBeGreaterThan(0);
    expect(r.beatCloseCount).toBe(3);
    expect(r.beatCloseRate).toBe(1);
    expect(r.calibration.meanModelProb).toBeGreaterThan(r.calibration.meanClosingProb);
    expect(r.note).toMatch(/beat the clos/i);
  });

  it("a model that trails the close yields negative mean CLV", () => {
    const r = rollupClv([
      { modelProb: 0.45, closingProb: 0.5238 },
      { modelProb: 0.49, closingProb: 0.5238 },
    ]);
    expect(r.meanClv).toBeLessThan(0);
    expect(r.beatCloseCount).toBe(0);
    expect(r.note).toMatch(/trailed the clos/i);
  });

  it("drops invalid pairs instead of fabricating", () => {
    const r = rollupClv([
      { modelProb: 0.58, closingProb: 0.5238 },
      { modelProb: 1.5, closingProb: 0.5238 }, // invalid → dropped
    ]);
    expect(r.count).toBe(1);
  });
});

describe("buildClvBacktest (schedules fixture)", () => {
  // Tiny synthetic nflverse-schedules fixture. KC is home with a big closing
  // spread of -3 (home favored 3); the illustrative model's modest home-field
  // edge plus the model taking the right side should register on the spread market.
  const fixture = [
    {
      season: "2023",
      week: "1",
      game_type: "REG",
      away_team: "DET",
      home_team: "KC",
      spread_line: "3", // CLOSING: home (KC) favored by 3
      total_line: "53",
      home_score: "20",
      away_score: "21", // DET wins outright → home did NOT cover
      result: "-1",
    },
    {
      season: "2023",
      week: "2",
      game_type: "REG",
      away_team: "SF",
      home_team: "LA",
      spread_line: "-2", // CLOSING: away (SF) favored by 2
      total_line: "45",
      home_score: "30",
      away_score: "23",
      result: "7",
    },
    {
      // Not yet played — no scores, no result → must be skipped (never graded blind).
      season: "2024",
      week: "1",
      game_type: "REG",
      away_team: "BUF",
      home_team: "NYJ",
      spread_line: "2.5",
      total_line: "44",
      home_score: "",
      away_score: "",
      result: "",
    },
    {
      // Playoff / non-REG → filtered out by game_type guard.
      season: "2023",
      week: "20",
      game_type: "DIV",
      away_team: "GB",
      home_team: "DAL",
      spread_line: "7",
      total_line: "51",
      home_score: "32",
      away_score: "48",
      result: "-16",
    },
  ];

  it("grades only completed REG games and produces CLV rollups", () => {
    const out = buildClvBacktest(fixture);
    // Two completed REG games → two spread rows + two total rows.
    expect(out.gamesGraded).toBe(2);
    expect(out.rows.filter((r) => r.market === "spread")).toHaveLength(2);
    expect(out.rows.filter((r) => r.market === "total")).toHaveLength(2);
    // The unplayed 2024 game and the DIV game are excluded.
    expect(out.rows.some((r) => r.game.includes("NYJ"))).toBe(false);
    expect(out.rows.some((r) => r.game.includes("DAL"))).toBe(false);
    expect(out.seasonFrom).toBe(2023);
    expect(out.seasonTo).toBe(2023);
  });

  it("spread self-grade beats the close on average (positive mean CLV)", () => {
    const out = buildClvBacktest(fixture);
    // The model always finds a non-negative points edge vs the close on the side it
    // takes, so its implied prob >= the close's vig-line prob → mean CLV > 0.
    expect(out.spread.count).toBe(2);
    expect(out.spread.meanClv).toBeGreaterThan(0);
    expect(out.spread.beatCloseRate).toBeGreaterThan(0);
  });

  it("records whether the taken side actually covered (honest grading)", () => {
    const out = buildClvBacktest(fixture);
    const kc = out.rows.find((r) => r.game === "DET @ KC" && r.market === "spread");
    expect(kc).toBeDefined();
    // spread_line 3 means home (KC) favored by 3; the illustrative model's home-field
    // nudge (1.6) is smaller, so its edge vs the close is negative → it takes the AWAY
    // side (DET +3). DET won outright (margin -1, home did NOT cover by 3), so the
    // away side covered → covered = true. The side string reflects DET.
    expect(kc!.side).toContain("DET");
    expect(kc!.covered).toBe(true);
  });

  it("respects the seasonFrom filter", () => {
    const out = buildClvBacktest(fixture, { seasonFrom: 2024 });
    expect(out.gamesGraded).toBe(0);
    expect(out.rows).toHaveLength(0);
  });
});

describe("loadClvForward (gated by design)", () => {
  it("is inert with no odds key — never fetches or redistributes live odds", () => {
    const r = loadClvForward({ oddsApiKey: undefined });
    expect(r.mode).toBe("forward");
    expect(r.status).toBe("gated");
    expect(r.canPublishProjections).toBe(false);
    expect(r.gateReason).toMatch(/inert|gated|key/i);
  });

  it("stays gated even when a key is present (forward grading not built live)", () => {
    const r = loadClvForward({ oddsApiKey: "test-key" });
    expect(r.status).toBe("gated");
  });
});
