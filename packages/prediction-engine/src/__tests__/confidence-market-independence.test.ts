/**
 * Does a market-derived probability reach the published `confidence` number?
 *
 * HISTORY: this file was written when the answer was YES. The three channel
 * tests below were committed as `it.fails` guards asserting the invariance we
 * wanted while the leak stood, with the measured size pinned separately:
 * marketFairProb 0.5000 -> 0.3957 at an identical entry price moved confidence
 * 57 -> 50, and flipping the H2H market moved 61 -> 54.
 *
 * 2026-09-27, owner-authorized rewire: the market-probability channels were
 * removed from the confidence sum (scoring.ts market-echo guard — the
 * market-internal edgeComponent and the cross-market ±4/−3 bonus are now
 * context-only factors with weight 0). The guards flipped green, which is the
 * signal their own header said to act on, so they are plain `it()` invariance
 * tests now. The magnitude pin became an invariance pin: confidence must NOT
 * move when only a market probability moves.
 *
 * STILL TRUE AND DELIBERATE: scoreMoneyline anchors its confidence on the
 * de-vigged win probability (consensusPct = fairProb). For a moneyline pick
 * that probability IS the pick's substance; the publication gate is
 * fairProb >= 0.58 and the factor text says "Market implies a N% win
 * probability". These tests pin the SPREAD path, which has no such excuse.
 *
 * What guards the invariance, by code reference:
 *   scoring.ts market-echo guard  edgeComponentScore and crossMarketScore are
 *                                 excluded from the confidence sum; their
 *                                 factorBreakdown entries carry weight 0.
 *   scoring.ts:520-521            fairProb still feeds marketFairProb (context
 *                                 + receipt) and the Edge Index — both labeled
 *                                 as market quantities. That is correct and
 *                                 out of scope here: the invariant is about
 *                                 the CONFIDENCE number only.
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
  it("CHANNEL 1: published confidence is invariant to marketFairProb", () => {
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

  it("CHANNEL 2: published confidence is invariant to the H2H market-implied probability", () => {
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

  it("the number frozen onto the proof receipt is the same leaked number", () => {
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

  it("MEASURED HISTORY -> INVARIANCE: confidence does not move when only a market probability moves", () => {
    // Historical record: before the 2026-09-27 rewire this same fixture moved
    // published confidence by 7 points (57 -> 50) on a byte-identical bet when
    // marketFairProb moved 0.5000 -> 0.3957, and the H2H flip moved 61 -> 54.
    // The channels were the market-internal edgeComponent and the cross-market
    // ±4/−3 bonus; both are context-only now. The assertion below is the
    // invariant that replaces the old magnitude pin.
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
        `identical entry price moved confidence ${a.confidence} -> ${b.confidence} — ` +
        `the market-echo guard in scoring.ts has regressed`,
    ).toBe(0);
  });
});
