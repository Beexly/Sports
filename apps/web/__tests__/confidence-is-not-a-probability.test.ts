import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * C-88: THE EDGE INDEX IS NOT A WIN PROBABILITY, AND THREE PUBLIC SURFACES SAID
 * OTHERWISE.
 *
 * `confidence` is a 0-100 Edge Index. This repository states in two independent
 * places that it is not a probability:
 *
 *   - apps/web/lib/ops/compute-live-calibration-metrics.ts: "confidence/100 is
 *     never scored" - the calibration floors refuse it and use market-anchored
 *     probabilities instead.
 *   - the home page, to customers, in as many words: "Not a probability the
 *     pick wins".
 *
 * Despite that, the public proof page printed `(confidence/100 - fairProb)*100`
 * as "model vs market Xpp" in green or red, and two pieces of customer copy
 * called the index "calibrated" while the calibration gate reads RED and the
 * published ECE value is itself contaminated (C-114).
 *
 * These are SOURCE PINS, matching the idiom in proof-of-record-surface.test.ts:
 * the assertions here are about what a public surface claims, and a claim is a
 * property of the text, not of a return value.
 */

const repo = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

describe("the proof page does not derive a market comparison from confidence", () => {
  const src = read("lib/proof/load-proof-of-record.ts");

  it("never subtracts a fair probability from confidence/100", () => {
    // The exact category error: a probability minus a non-probability, printed
    // as percentage points on a page whose entire purpose is verifiability.
    expect(src).not.toMatch(/confidence\s*\/\s*100\s*-\s*fairProb/);
  });

  it("still exposes the field, so restoring a REAL model probability stays a one-line change", () => {
    // The control. Deleting the field and its render path would also satisfy
    // the assertion above, and would turn a one-line restoration into a
    // re-design once rankingP is threaded into this query.
    expect(src).toContain("modelVsMarketPp");
  });

  it("keeps the rule it already stated for SPREAD and TOTAL", () => {
    // The rule was never wrong. It simply was not applied to MONEYLINE.
    expect(src).toContain("mixes two unrelated quantities");
  });
});

describe("customer copy does not claim the Edge Index is calibrated", () => {
  it("the home page annotated sample makes no calibration claim", () => {
    const src = read("components/home/annotated-sample-signal.tsx");
    expect(src).not.toMatch(/calibrated \d+-\d+ Edge Index/);
    // Positive control: the honest half of that sentence must survive, because
    // it is the sentence that tells a customer what the number is NOT.
    expect(src).toContain("Not a probability the pick wins");
  });

  it("the global footer makes no calibration claim", () => {
    const src = read("components/ui/footer.tsx");
    expect(src).not.toContain("calibrated market signals");
    // Positive control: the risk language is the point of that paragraph and
    // must not be lost while trimming the unearned adjective.
    expect(src).toContain("not certainty");
    expect(src).toContain("Set limits before emotion enters");
  });
});

describe("the B2B probabilities route says what pModel actually is", () => {
  const src = read("app/api/v1/probabilities/route.ts");

  it("names pModel a confidence score rather than leaving the field to imply a probability", () => {
    // The contract is NOT changed here: pModel keeps its value and its type, so
    // no consumer breaks. What changes is that the payload stops letting the
    // field name do the claiming. Which value pModel should carry is an open
    // product decision and is recorded as such.
    expect(src).toMatch(/CONFIDENCE SCORE, not a calibrated win probability/);
    expect(src).toContain("C-88");
  });

  it("still points integrators at the fields that ARE probabilities", () => {
    // The control: a disclaimer that only warns is less useful than one that
    // redirects, and both real quantities are already in the payload.
    expect(src).toContain("marketFairProb");
    expect(src).toContain("rankingP");
  });
});
