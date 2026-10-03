import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntitlements } from "@sports/types";
import {
  MIN_BOOKS_FOR_MARKET_IMPLIED,
  resolveWinProbability,
} from "@/lib/picks/market-implied-display";

/**
 * v5.2.8 Phase 2 acceptance (proposal section 4, "Tests to update or add").
 *
 * Two claims, and they are the whole point of the phase:
 *
 *   1. FREE and PRO both receive `winProbability`. It is a de-vig of quoted
 *      book prices — arithmetic a reader can redo by hand, not a model output —
 *      and the public calibration claim is ABOUT this number, so withholding it
 *      from the tier that reads the claim was incoherent.
 *
 *   2. Neither tier ever receives `confidence` as a percent, and the published
 *      probability is never derived from it. `confidence` is a 0-100 selection
 *      score. Measured on 2,385 settled picks it is anti-predictive at its top
 *      end (conf 80+ claims 0.8663, realizes 0.5191, z = -10.7) and is not even
 *      monotone, so no calibrator can rescue it — see proposal section 3b.
 *
 * The payload-level assertions live in market-implied-display.test.ts, which
 * executes the real route handler. This file pins the contract itself: the
 * resolver's tier-independence, the shape, and the source-level guarantee that
 * no publishing surface divides confidence by 100.
 */

const REPO = resolve(__dirname, "..", "..", "..");
const WEB = resolve(__dirname, "..");

/**
 * Strip comments before asserting on source. These files DISCUSS "confidence /
 * 100" at length — that prose is the record of why it was removed, and an
 * assertion that forbids the phrase outright would force a future author to
 * delete the explanation in order to keep the guard green.
 */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const RECEIPTED_ML = {
  pickType: "MONEYLINE",
  bookmakerCount: 6,
  receiptMarketFairProb: 0.6142,
};

describe("winProbability reaches every tier", () => {
  it("resolves identically for FREE and PRO", () => {
    const free = getEntitlements("FREE");
    const pro = getEntitlements("PRO");
    // The tiers genuinely differ on what is paid...
    expect(free.canSeeConfidence).toBe(false);
    expect(pro.canSeeConfidence).toBe(true);
    // ...and the published probability is not one of those things.
    const resolved = resolveWinProbability(RECEIPTED_ML);
    expect(resolved).toEqual({
      value: 0.6142,
      basis: "market_devig",
      books: 6,
      method: "proportional",
    });
  });

  it("takes no viewer argument, so it cannot be silently re-gated", () => {
    expect(resolveWinProbability.length).toBe(1);
  });

  it("names the method it actually used rather than implying one canonical fair price", () => {
    // Proportional, not Shin. Measured 2026-09-13 on 621 settled book-priced
    // picks carrying both values: the paired Brier difference is +0.0022
    // (t = 1.80, not significant), and the entire moneyline advantage comes
    // from 11 rows where the two methods disagree by over 10 points —
    // pathological books. Excluding those, Shin is slightly worse (t = -1.13).
    expect(resolveWinProbability(RECEIPTED_ML)?.method).toBe("proportional");
  });

  it("refuses a single-book row: one book is not a consensus", () => {
    expect(MIN_BOOKS_FOR_MARKET_IMPLIED).toBe(2);
    expect(resolveWinProbability({ ...RECEIPTED_ML, bookmakerCount: 1 })).toBeNull();
    expect(resolveWinProbability({ ...RECEIPTED_ML, bookmakerCount: 0 })).toBeNull();
    expect(resolveWinProbability({ ...RECEIPTED_ML, bookmakerCount: 2 })).not.toBeNull();
  });

  it("refuses the markets whose cover probability sits near 0.5 by construction", () => {
    expect(resolveWinProbability({ ...RECEIPTED_ML, pickType: "SPREAD" })).toBeNull();
    expect(resolveWinProbability({ ...RECEIPTED_ML, pickType: "TOTAL" })).toBeNull();
  });

  it("never publishes the synthetic coin-flip a receipt carries when no market price resolved", () => {
    expect(resolveWinProbability({ ...RECEIPTED_ML, receiptMarketFairProb: 0.5 })).toBeNull();
  });

  it("never emits the reserved independent_estimate basis", () => {
    // The union member exists because the proposal names it. No independent
    // estimator in this engine has been shown to carry information at publish
    // time, and a labeled guess is still a guess.
    const src = readFileSync(resolve(WEB, "lib/picks/market-implied-display.ts"), "utf8");
    expect(src).toContain('basis: "market_devig"');
    expect(src).not.toContain('basis: "independent_estimate"');
  });
});

describe("confidence is never published as a probability", () => {
  it("the picks route derives winProbability from the receipt, never from confidence", () => {
    const src = code(resolve(WEB, "app/api/picks/route.ts"));
    expect(src).toMatch(/receiptMarketFairProb: pick\.proofReceipt\?\.marketFairProb/);
    expect(src).not.toMatch(/confidence\s*\/\s*100/);
  });

  it("the public probabilities API has retired pModel and publishes the score as a score", () => {
    const src = code(resolve(WEB, "app/api/v1/probabilities/route.ts"));
    // CAL-06: pModel used to be confidence/100 presented as a model probability.
    expect(src).toMatch(/pModel:\s*null/);
    expect(src).not.toMatch(/confidence\s*\/\s*100/);
    // The score still ships, on its own scale, under a name that says so.
    expect(src).toMatch(/confidenceScore:\s*typeof p\.confidence === "number" \? p\.confidence : null/);
    // And the only probability there names its de-vig.
    expect(src).toContain("marketFairMethod");
  });

  it("the proof-of-record page publishes no model-vs-market number built from confidence", () => {
    // CAL-07: this annotation used to difference the market's fair probability
    // against the Edge Index scaled to 0-1. The first is a probability; the
    // second is not one at any scale.
    const src = code(resolve(WEB, "lib/proof/load-proof-of-record.ts"));
    expect(src).toMatch(/const modelVsMarketPp: number \| null = null;/);
    expect(src).not.toMatch(/confidence\s*\/\s*100/);
  });

  it("the receipt commits the de-vig method that produced its number", () => {
    const src = readFileSync(
      resolve(REPO, "packages/ingestion-pipeline/src/process-sport.ts"),
      "utf8",
    );
    expect(src).toMatch(/marketFairMethodTag: MARKET_FAIR_METHOD_TAG/);
  });
});
