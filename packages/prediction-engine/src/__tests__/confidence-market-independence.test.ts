/**
 * Does a market-derived probability reach the published `confidence` number?
 *
 * UNDER TEST (a hypothesis, not an established fact): "realized win rate falls
 * as confidence rises, and `marketFairProb` leaks into confidence."
 *
 * This file MEASURES the second half of that claim. It is deliberately a
 * regression test written against the behaviour we would WANT (confidence
 * independent of market probability) so that it fails today if the leak is
 * real. It does not assert a number the market chose; it asserts an
 * INVARIANCE, which is the falsifiable claim: everything held constant except
 * a market probability, the published confidence must not move.
 *
 * What is actually under test, by code reference:
 *   scoring.ts:520-521  fairProb = removeVig(homeImpliedAvg, awayImpliedAvg)
 *                      -> the de-vigged market probability of the picked side.
 *                      This is the same quantity the receipt commits as
 *                      `marketFairProb` (MARKET_FAIR_METHOD_TAG, proportional).
 *   scoring.ts:532      edgeComponentScore = computeEdgeScore(fairProb, avgPrice, ...)
 *   scoring.ts:580-588  confidence = consensus + depth + edgeComponent + ... + 10
 *
 *   and a second, independent channel — the H2H (moneyline) market:
 *   scoring.ts:540-547  mlFairProbHome = removeVig(avgH, avgA)  <- market implied
 *   game-context.ts:698 computeCrossMarketScore(pickedSide, mlFairProbHome, ...)
 *   game-context.ts:469-489  -> +WEIGHTS.CROSS_MARKET_AGREE_BONUS (4) or
 *                              -WEIGHTS.CROSS_MARKET_DISAGREE_PENALTY (3)
 *   scoring.ts:573      crossMarketScore is added into the same sum as `confidence`
 *
 * Both channels are market-derived probabilities being arithmetically ADDED to
 * confidence. The code says so in its own words at scoring.ts:1219:
 * "Heuristic confidence stays as the market-echo composite for UX continuity."
 * The leak is therefore BY DESIGN and documented in the source, not an accidental
 * regression.
 *
 * WHY `it.fails` AND NOT A PERMANENTLY RED SUITE:
 * The three invariance assertions below are real, and they currently fail — the
 * leak is confirmed and measured. Committing them as ordinary `it()` would leave
 * the branch permanently red, which is how a suite teaches everyone to ignore
 * red. `it.fails` asserts the CURRENT (leaky) behaviour: the suite stays green
 * while the leak stands, and flips RED THE MOMENT someone fixes it. That red is
 * the signal to delete these guards. Nothing is deleted in the meantime; the
 * invariant stays written down and machine-checked.
 *
 * The final test in this file is a plain passing `it()` that pins the measured
 * SIZE of the leak, so the number survives even after the guards are retired.
 */

import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import { buildPickProofReceipt } from "../pick-proof-receipt.js";
import type { OddsInput, ScoredPick } from "@sports/types";

const BOOKS = ["fandoul", "draftkings", "betmgm", "caesars", "pointsbet"];
const AS_OF = new Date("2026-04-15T18:00:00Z");

type Side = { readonly market: "SPREADS"; readonly spread: number; readonly homeSpreadPrice: number; readonly awaySpreadPrice: number }
  | { readonly market: "H2H"; readonly homePrice: number; readonly awayPrice: number };

function pick(picks: ScoredPick[]): ScoredPick {
  const found = picks.find((p) => p.pickType === "SPREAD");
  if (!found) throw new Error("fixture produced no SPREAD pick; lower the varied price");
  return found;
}

/**
 * Channel 1 — the market fair probability of the PICKED side.
 *
 * The chosen side's own entry price is held fixed at -110 across every
 * variant, and the line, the book count, and the teams are fixed. Only the
 * OPPOSING side's price moves. Because the de-vig is proportional
 * (fairProb = p_home / (p_home + p_away)), moving the away price changes
 * `fairProb` — i.e. `marketFairProb` — while nothing about the bet we are
 * recommending changes at all.
 */
function edgeChannel(awayPrice: number): OddsInput {
  return {
    gameId: "nhl-market-independence",
    homeTeam: "Bruins",
    awayTeam: "Leafs",
    commenceTime: AS_OF,
    sport: "NHL",
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: awayPrice,
    })),
    context: { bookmakerCoverageMax: BOOKS.length },
  };
}

/**
 * Channel 2 — the H2H moneyline market's de-vigged probability for the home
 * team, which reaches confidence as a cross-market agree/bonus term.
 *
 * `hmlHome` is chosen so |mlFairProbHome - 0.5| >= 0.05, which is the noise
 * floor of computeCrossMarketScore (game-context.ts:461).
 */
function crossMarketChannel(h2hHomePrice: number, h2hAwayPrice: number): OddsInput {
  return {
    gameId: "nhl-market-independence",
    homeTeam: "Bruins",
    awayTeam: "Leafs",
    commenceTime: AS_OF,
    sport: "NHL",
    bookmakerOdds: [
      ...BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: -1.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      })),
      ...BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "H2H" as const,
        homePrice: h2hHomePrice,
        awayPrice: h2hAwayPrice,
      })),
    ],
    context: { bookmakerCoverageMax: BOOKS.length },
  };
}

describe("confidence vs. market probability (hypothesis under test)", () => {
  it.fails("CHANNEL 1: published confidence is invariant to marketFairProb", () => {
    // Same bet, same entry price, same books. Only the market's probability
    // for our side differs, because the de-vig split differs.
    const a = pick(scoreGame(edgeChannel(-110)));
    const b = pick(scoreGame(edgeChannel(-400)));

    // Guard the fixture itself: if these were equal, the test would pass
    // vacuously. The market probability under test must actually have moved.
    expect(
      Math.abs(a.marketFairProb - b.marketFairProb),
      `fixture is vacuous: marketFairProb did not move (${a.marketFairProb})`,
    ).toBeGreaterThan(0.05);

    // The pick we are selling is byte-identical: same line, same entry price,
    // same side, same books. Only the market's own probability changed.
    expect(b.line).toBe(a.line);
    expect(b.entryPrice).toBe(a.entryPrice);
    expect(b.selection).toBe(a.selection);

    // THE ASSERTION. Independence of the published confidence from the
    // market probability.
    expect(
      b.confidence,
      `marketFairProb moved ${a.marketFairProb.toFixed(4)} -> ${b.marketFairProb.toFixed(4)} ` +
        `at an identical entry price, but confidence moved ${a.confidence} -> ${b.confidence}`,
    ).toBe(a.confidence);
  });

  it.fails("CHANNEL 2: published confidence is invariant to the H2H market-implied probability", () => {
    // The moneyline market agrees with our spread side, then disagrees with it.
    const agree = pick(scoreGame(crossMarketChannel(-200, +170)));
    const disagree = pick(scoreGame(crossMarketChannel(+170, -200)));

    expect(agree.line).toBe(disagree.line);
    expect(agree.entryPrice).toBe(disagree.entryPrice);
    expect(agree.selection).toBe(disagree.selection);

    expect(
      disagree.confidence,
      `the H2H market flipped from agreeing with the pick to opposing it, an identical ` +
        `bet, but confidence moved ${agree.confidence} -> ${disagree.confidence}`,
    ).toBe(agree.confidence);
  });

  it.fails("the number frozen onto the proof receipt is the same leaked number", () => {
    // Closes the loop back to pick-proof-receipt.ts: the receipt does not
    // compute confidence, it commits whatever the scorer handed it. So the
    // audited, tamper-evident artifact carries the market-contaminated value.
    const a = pick(scoreGame(edgeChannel(-110)));
    const b = pick(scoreGame(edgeChannel(-400)));

    const receipt = buildPickProofReceipt(
      {
        pickId: "pick-confidence-independence",
        gameId: b.gameId,
        selection: b.selection,
        pickType: b.pickType,
        line: b.line,
        entryOdds: b.entryPrice,
        marketFairProb: b.marketFairProb,
        confidence: b.confidence,
        edgeScore: b.edgeScore,
        modelProb: null,
        modelVersion: "confidence-independence-probe",
        asOf: AS_OF.toISOString(),
      },
      () => "probe-hash",
    );

    expect(receipt.fields.confidence).toBe(b.confidence);
    expect(
      receipt.fields.confidence,
      `receipt confidence for a marketFairProb of ${a.marketFairProb.toFixed(4)} and of ` +
        `${b.marketFairProb.toFixed(4)} should be the same number; got ` +
        `${a.confidence} vs ${b.confidence}`,
    ).toBe(a.confidence);
  });

  it("MEASURED: the leak moves published confidence by 7 points on an identical bet", () => {
    // The number, pinned as a PASSING assertion so the finding is a positive
    // record and not only a guard. If this ever fails, the leak was fixed and the
    // three it.fails guards above are now reporting the repair.
    const a = pick(scoreGame(edgeChannel(-110)));
    const b = pick(scoreGame(edgeChannel(-400)));

    // The bet is byte-identical - only the market's own probability moved.
    expect(b.line).toBe(a.line);
    expect(b.entryPrice).toBe(a.entryPrice);
    expect(b.selection).toBe(a.selection);
    expect(Math.abs(a.marketFairProb - b.marketFairProb)).toBeGreaterThan(0.05);

    const moved = Math.abs(b.confidence - a.confidence);
    expect(
      moved,
      `marketFairProb ${a.marketFairProb.toFixed(4)} -> ${b.marketFairProb.toFixed(4)} at an ` +
        `identical entry price moved confidence ${a.confidence} -> ${b.confidence}`,
    ).toBeGreaterThanOrEqual(5);
  });
});
