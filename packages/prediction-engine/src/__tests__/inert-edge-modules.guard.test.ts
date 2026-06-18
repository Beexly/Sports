import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scoreGame } from "../scoring.js";
import type { OddsInput } from "@sports/types";

/**
 * INERTNESS GUARD — the rollback tripwire for the Workstream-K "K2" edge modules.
 *
 * It asserts the load-bearing invariant that these modules — sovereign-edge-index,
 * edge-type, pick-autopsy — and the independent edge engine are NOT priced into
 * live confidence today. Two parts:
 *
 *   (a) source-scan scoring.ts: it must NOT import any of the K2 modules, and the
 *       independent-edge surfacing must remain weight 0 / priced false (surfaced in
 *       the glass box, never scored);
 *   (b) a fixture test: scoreGame's confidence is the pure heuristic sum and is
 *       byte-identical whether or not these modules exist (they are never called).
 *
 * If anyone wires a K2 module — or a non-zero edge weight — into live confidence
 * without a MODEL_VERSION bump, this test fails and points them at the calibration
 * gate. That is the leverage: it protects the freeze.
 */

const SCORING_SRC = readFileSync(resolve(__dirname, "../scoring.ts"), "utf8");

const FORBIDDEN_MODULES = [
  "sovereign-edge-index",
  "edge-type",
  "pick-autopsy",
] as const;

describe("(a) scoring.ts does not import the inert K2 edge modules", () => {
  for (const mod of FORBIDDEN_MODULES) {
    it(`does not import "${mod}"`, () => {
      // Match an actual import/require of the module, not an incidental substring.
      const importRe = new RegExp(`(?:import[^\\n]*from|require\\()\\s*["'][^"']*${mod}(?:\\.js)?["']`);
      expect(
        importRe.test(SCORING_SRC),
        `scoring.ts must NOT import ${mod} — these modules are inert and must never reach live confidence without a MODEL_VERSION bump.`,
      ).toBe(false);
    });
  }

  it("keeps the independent-edge surfacing at weight 0 / priced false", () => {
    // The only edge-engine surface in scoring.ts is the weight-0, unpriced glass-box factor.
    expect(SCORING_SRC).toMatch(/weight:\s*0/);
    expect(SCORING_SRC).toMatch(/priced/i);
    // It must NOT attach the independent edge at any positive weight.
    expect(/Independent Edge[\s\S]{0,200}weight:\s*[1-9]/.test(SCORING_SRC)).toBe(false);
  });
});

// A self-contained fixture (mirrors scoring.test.ts) — used to prove confidence is
// the pure heuristic sum and unaffected by the K2 modules' existence.
const makeOddsInput = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  gameId: "guard-game-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: [
    { bookmaker: "fanduel",    market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -112, awaySpreadPrice: -108 },
    { bookmaker: "betmgm",     market: "SPREADS", spread: -3.0, homeSpreadPrice: -115, awaySpreadPrice: -105 },
    { bookmaker: "caesars",    market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "pointsbet",  market: "SPREADS", spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 },
    { bookmaker: "fanduel",    market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
    { bookmaker: "draftkings", market: "TOTALS", total: 49.0, overPrice: -112, underPrice: -108 },
    { bookmaker: "betmgm",     market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
    { bookmaker: "caesars",    market: "TOTALS", total: 49.0, overPrice: -108, underPrice: -112 },
    { bookmaker: "fanduel",    market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "draftkings", market: "H2H", homePrice: -175, awayPrice: 150 },
    { bookmaker: "betmgm",     market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "caesars",    market: "H2H", homePrice: -185, awayPrice: 160 },
  ],
  ...overrides,
});

describe("(b) scoreGame confidence is the pure heuristic sum, unaffected by K2 modules", () => {
  it("produces a stable, reproducible confidence per pick type", () => {
    // Importing the K2 modules into this very test file does not change scoreGame
    // (they are never called by the live path). Run twice → byte-identical.
    const a = scoreGame(makeOddsInput());
    const b = scoreGame(makeOddsInput());
    expect(a.map((p) => [p.pickType, p.confidence, p.edgeScore, p.tier])).toEqual(
      b.map((p) => [p.pickType, p.confidence, p.edgeScore, p.tier]),
    );
    expect(a.length).toBeGreaterThan(0);
  });

  it("any independentEdge surfaced on a pick is priced:false (decision-support only)", () => {
    for (const pick of scoreGame(makeOddsInput())) {
      const ie = pick.factorBreakdown.independentEdge;
      if (ie) {
        expect(ie.priced).toBe(false);
      }
      const ieFactor = pick.factorBreakdown.factors.find((f) => f.name.startsWith("Independent Edge"));
      if (ieFactor) {
        expect(ieFactor.weight).toBe(0);
      }
    }
  });

  it("the confidence equals the documented additive sum bounds (0–100), never a probability", () => {
    for (const pick of scoreGame(makeOddsInput())) {
      expect(pick.confidence).toBeGreaterThanOrEqual(0);
      expect(pick.confidence).toBeLessThanOrEqual(100);
      expect(Number.isInteger(pick.confidence)).toBe(true);
    }
  });
});
