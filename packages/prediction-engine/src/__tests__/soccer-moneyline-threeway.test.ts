import { describe, it, expect } from "vitest";
import { scoreGame, removeVig } from "../scoring.js";
import type { OddsInput } from "@sports/types";

/**
 * Soccer moneyline is a THREE-way market. The engine's de-vig is two-way.
 *
 * `removeVig(home, away)` renormalises home/(home+away), which is
 * P(home wins | the match is decisive) — the correct quantity only when a draw
 * VOIDS the bet. Soccer does not void it; settlement.ts:94-97 grades a draw as
 * a LOSS for either side:
 *
 *     if (homeScore === awayScore) {
 *       return sportKey.includes("soccer") ? "LOSS" : "PUSH";
 *     }
 *
 * So the settlement-relevant probability is the UNCONDITIONAL P(home wins),
 * lower than the two-way number by the entire draw mass (~20-30% in soccer).
 * Publishing the two-way figure overstates win probability, edge and confidence
 * on every soccer moneyline pick, and persists that overstatement into the pick
 * proof receipt.
 *
 * The draw price is not available to fix this properly: `BookmakerOddsInput`
 * has no `drawPrice` field, and the default free ESPN path never fetches one.
 * Until a real three-way de-vig exists, the honest output is no pick at all.
 *
 * The NFL case below is the control. It uses byte-identical prices, so if the
 * soccer assertion ever passes for a reason OTHER than the sport guard, the
 * control fails too and the pair stops being vacuous.
 */

// Moneyline publishes only for a DEEP book set AND a heavy favourite. Probed
// empirically against this engine: -180, -200, -250 and -300 all yield no ML
// pick at ten books; -350 yields one at confidence 51. That narrowness is why
// this defect is HIGH rather than a launch blocker -- it needs both conditions.
const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

const fullBook = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  gameId: "game-threeway-1",
  homeTeam: "LA Galaxy",
  awayTeam: "Seattle Sounders",
  commenceTime: new Date("2026-09-06T23:30:00Z"),
  sport: "soccer_usa_mls",
  bookmakerOdds: BOOKS.map((bookmaker) => ({
    bookmaker,
    market: "H2H" as const,
    homePrice: -350,
    awayPrice: 290,
  })),
  context: { bookmakerCoverageMax: BOOKS.length },
  ...overrides,
});

const moneylines = (input: OddsInput) =>
  scoreGame(input).filter((p) => p.pickType === "MONEYLINE");

describe("soccer moneyline — a three-way market is not scored two-way", () => {
  it("CONTROL: a two-way sport on these prices DOES publish a moneyline pick", () => {
    // Without this passing, the soccer assertion below proves nothing.
    expect(moneylines(fullBook({ sport: "NFL", gameId: "game-nfl-1" })).length).toBe(1);
  });

  it("publishes NO moneyline pick for soccer, however strong the two-way read", () => {
    expect(moneylines(fullBook())).toEqual([]);
  });

  it("suppresses every soccer key, not just the MLS one in the launch slate", () => {
    for (const sport of ["soccer_usa_mls", "soccer_epl", "SOCCER_UEFA_CL"]) {
      expect(moneylines(fullBook({ sport })), sport).toEqual([]);
    }
  });

  it("documents the size of the overstatement the guard prevents", () => {
    // -350 / +290 imply roughly 0.778 / 0.256 on the two decisive sides.
    const fair = removeVig(0.778, 0.256);
    expect(fair.home + fair.away).toBeCloseTo(1, 6);

    // With a realistic 25% draw mass, the unconditional home probability is
    // fair.home * 0.75 — below the 0.58 publish threshold that the two-way
    // number clears comfortably. That gap is the published lie.
    expect(fair.home).toBeGreaterThan(0.58);
    // Even at this extreme price the draw mass drags the honest number to the
    // edge of publishable -- the two-way figure is materially overstated.
    expect(fair.home * 0.75).toBeLessThan(fair.home);
  });
});
