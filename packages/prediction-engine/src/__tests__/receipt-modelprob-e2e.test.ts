/**
 * End-to-end proof that the modelProb gap is actually closed.
 *
 * The unit tests in pick-proof-receipt.test.ts pin the RULE. This file proves the
 * rule is reachable from the real pipeline: an actual ScoredPick produced by
 * scoreGame() — the same call process-sport.ts makes — carries an independent
 * probability that modelProbForReceipt() returns and buildPickProofReceipt()
 * freezes into the committed payload.
 *
 * Before this change the mint passed a hardcoded `modelProb: null`, so all 2,213
 * live receipts committed "none" and Brier/ECE were uncomputable forever: the
 * consumers (eval/edge-lab/clv-report.mjs, scripts/db-calibration-pull.cjs) were
 * built and waiting with nothing to consume.
 */
import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import { buildPickProofReceipt, modelProbForReceipt } from "../pick-proof-receipt.js";
import type { OddsInput, ScoredPick, IndependentMarketFairValue } from "@sports/types";

/**
 * Deterministic non-cryptographic hash (FNV-1a 32-bit). Production injects
 * node:crypto sha256 (apps/web proof-hash.ts); this only proves determinism
 * and tamper-sensitivity.
 */
function testHash(input: string): string {
  let h = [0x811c9dc5];
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

function makeInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "game-ml-e2e",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -800,
      awayPrice: 650,
    })),
    context: { bookmakerCoverageMax: 10, independentFairValues },
  };
}

const ml = (picks: ScoredPick[]): ScoredPick =>
  picks.find((p) => p.pickType === "MONEYLINE")!;

/** Independent estimators that never saw the book price (the whole point). */
const INDEPENDENTS: IndependentMarketFairValue[] = [
  { source: "kalshi", homeFairProb: 0.93, awayFairProb: 0.07 },
  { source: "poisson", homeFairProb: 0.92, awayFairProb: 0.08 },
];

/** Mint exactly as process-sport.ts does, from a real scored pick. */
function mintFor(pick: ScoredPick, pickId: string) {
  return buildPickProofReceipt(
    {
      pickId,
      gameId: pick.gameId,
      selection: pick.selection,
      pickType: pick.pickType,
      line: pick.line,
      entryOdds: pick.entryPrice ?? -800,
      marketFairProb: pick.marketFairProb!,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      modelProb: modelProbForReceipt(pick),
      modelVersion: pick.modelVersion,
      asOf: pick.dataFreshnessAt.toISOString(),
    },
    testHash,
  );
}

describe("modelProb reaches the receipt from a real scored pick", () => {
  it("a publishable pick with independents yields a REAL modelProb", () => {
    const pick = ml(scoreGame(makeInput(INDEPENDENTS)));
    expect(pick).toBeTruthy();

    const modelProb = modelProbForReceipt(pick);
    // The gap: this was null on every one of the 2,213 frozen receipts.
    expect(modelProb).not.toBeNull();
    expect(modelProb!).toBeGreaterThan(0);
    expect(modelProb!).toBeLessThan(1);

    // It is the INDEPENDENT blend, NOT the confidence heuristic. Here the blend
    // (0.925) sits far ABOVE confidence/100 (0.52) -- the opposite direction from
    // the "never confidence/100" rule, so this pins that we commit the blend and
    // would notice if the value silently became the heuristic.
    expect(modelProb!).toBeCloseTo(pick.factorBreakdown.independentEdge!.trueProb!, 6);
    expect(modelProb!).not.toBeCloseTo(pick.confidence / 100, 6);
  });

  it("the value lands in the committed payload — learning is unblocked", () => {
    const pick = ml(scoreGame(makeInput(INDEPENDENTS)));
    const modelProb = modelProbForReceipt(pick)!;
    const receipt = mintFor(pick, "pick_e2e_1");

    // The committed serialization now carries a real probability, so the
    // consumers can finally compute Brier/ECE against settled outcomes.
    expect(receipt.payload).toContain(`modelProb=${modelProb}`);
    expect(receipt.payload).not.toContain("modelProb=none");
  });

  it("a pick with NO independents still commits 'none' — never fabricates", () => {
    const pick = ml(scoreGame(makeInput(undefined)));
    expect(pick.factorBreakdown.independentEdge).toBeUndefined();
    expect(modelProbForReceipt(pick)).toBeNull();
    expect(mintFor(pick, "pick_e2e_none").payload).toContain("modelProb=none");
  });

  it("PASS edges still yield a modelProb (ranking needs the probability, not the edge claim)", () => {
    // A PASS says "no edge", NOT "no opinion". The probability is what Brier needs.
    const pick = ml(
      scoreGame(
        makeInput([
          { source: "kalshi", homeFairProb: 0.93, awayFairProb: 0.07 },
          { source: "poisson", homeFairProb: 0.60, awayFairProb: 0.40 },
        ]),
      ),
    );
    expect(pick.factorBreakdown.independentEdge!.decision).toBe("PASS");
    expect(modelProbForReceipt(pick)).not.toBeNull();
  });
});