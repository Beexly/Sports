import { describe, it, expect } from "vitest";
import { composePickReasoning, scoreGame } from "../scoring.js";
import type { IndependentEdgeSummary, OddsInput } from "@sports/types";

/**
 * The pick reasoning composer is the customer-facing "why" on every pick. These
 * tests pin two things that matter for trust:
 *   1. It NEVER fabricates — an independent-model claim only appears when a real
 *      independent estimate is fed (and only when that estimate has an opinion).
 *   2. It narrates the real signals honestly: edge framed as capturable only
 *      when positive; a full/negative price said plainly, not dressed up.
 *
 * The composer is pure, so it's tested directly for the branch logic, and then
 * through the live scoreGame() path for the no-fabrication guarantee.
 */

const baseArgs = {
  subject: "Chiefs to win outright",
  bookmakerCount: 8,
  consensusPct: 0.6,
  consensusIsProbability: true,
  rawEdge: 0.02,
  contextClauses: [] as string[],
  independentEdge: null as IndependentEdgeSummary | null,
  confidence: 72,
  pickGrade: "SOLID_PLAY" as const,
};

function independentEdge(overrides: Partial<IndependentEdgeSummary> = {}): IndependentEdgeSummary {
  return {
    decision: "LEAN",
    agreement: "CONFIRMS",
    marketFairProb: 0.58,
    trueProb: 0.65,
    rawEdge: 0.07,
    shrunkEdge: 0.05,
    expectedClv: 2.1,
    conviction: 60,
    sources: ["elo"],
    priced: false,
    rationale: "Elo reads the home side higher than the de-vigged close.",
    ...overrides,
  };
}

describe("composePickReasoning — narration", () => {
  it("opens with the market read and closes with a plain verdict", () => {
    const { reasoning } = composePickReasoning(baseArgs);
    expect(reasoning).toContain("Chiefs to win outright");
    expect(reasoning).toContain("8 books");
    expect(reasoning).toMatch(/Net read: solid play at 72\/100\./);
  });

  it("never invents an independent-model claim when none is provided", () => {
    const { reasoning } = composePickReasoning(baseArgs);
    expect(reasoning).not.toMatch(/independent model/i);
  });

  it("surfaces the independent model's read and source when it has an opinion", () => {
    const { reasoning } = composePickReasoning({ ...baseArgs, independentEdge: independentEdge() });
    expect(reasoning).toMatch(/independent model \(elo\)/i);
    expect(reasoning).toContain("65%"); // trueProb surfaced as a number
    expect(reasoning).toMatch(/agrees there's value here/);
  });

  it("stays silent on a PASS decision — no false signal", () => {
    const { reasoning } = composePickReasoning({
      ...baseArgs,
      independentEdge: independentEdge({ decision: "PASS" }),
    });
    expect(reasoning).not.toMatch(/independent model/i);
  });

  it("stays silent when the independent estimate has no probability", () => {
    const { reasoning } = composePickReasoning({
      ...baseArgs,
      independentEdge: independentEdge({ trueProb: null }),
    });
    expect(reasoning).not.toMatch(/independent model/i);
  });

  it("notes when the independent model sees LESS than the market", () => {
    const { reasoning } = composePickReasoning({
      ...baseArgs,
      independentEdge: independentEdge({ shrunkEdge: -0.03, trueProb: 0.55 }),
    });
    expect(reasoning).toMatch(/sees less than the market does/);
  });

  it("frames a real edge as capturable", () => {
    const { reasoning } = composePickReasoning({ ...baseArgs, rawEdge: 0.05 });
    expect(reasoning).toMatch(/edge to capture/i);
  });

  it("calls a full/negative price honestly instead of dressing it up", () => {
    const { reasoning } = composePickReasoning({ ...baseArgs, rawEdge: -0.02 });
    expect(reasoning).toMatch(/price is full|grade it on signal strength/i);
    expect(reasoning).not.toMatch(/edge to capture/i);
  });

  it("weaves up to three supporting context clauses, not more", () => {
    const { reasoning } = composePickReasoning({
      ...baseArgs,
      contextClauses: ["rest advantage", "favorable H2H history", "strong venue form", "confirming line movement"],
    });
    expect(reasoning).toContain("Supporting signals:");
    expect(reasoning).toContain("rest advantage");
    // the 4th clause is dropped (cap at 3)
    expect(reasoning).not.toContain("confirming line movement");
  });

  it("short form is one honest consensus line, tagged with edge only when material", () => {
    const big = composePickReasoning({ ...baseArgs, rawEdge: 0.05 });
    expect(big.reasoningShort).toMatch(/consensus on Chiefs to win outright/);
    expect(big.reasoningShort).toMatch(/edge/);

    const thin = composePickReasoning({ ...baseArgs, rawEdge: 0.01 });
    expect(thin.reasoningShort).not.toMatch(/edge/);
  });
});

// ── No-fabrication guarantee through the live scoring path ──────────────────

const makeOddsInput = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  gameId: "game-reason-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: [
    { bookmaker: "fanduel", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -112, awaySpreadPrice: -108 },
    { bookmaker: "betmgm", market: "SPREADS", spread: -3.0, homeSpreadPrice: -115, awaySpreadPrice: -105 },
    { bookmaker: "caesars", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "fanduel", market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "draftkings", market: "H2H", homePrice: -175, awayPrice: 150 },
    { bookmaker: "betmgm", market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "caesars", market: "H2H", homePrice: -185, awayPrice: 160 },
  ],
  ...overrides,
});

describe("pick reasoning through scoreGame — no fabrication", () => {
  it("real picks never mention an independent model with no fair values fed", () => {
    const picks = scoreGame(makeOddsInput());
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(pick.reasoning).not.toMatch(/independent model/i);
      // and never the retired robotic template
      expect(pick.reasoning).not.toMatch(/backed by \d+% of/);
    }
  });
});
