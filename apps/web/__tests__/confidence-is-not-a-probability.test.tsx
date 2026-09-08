import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

import { AnnotatedSampleSignal } from "@/components/home/annotated-sample-signal";
import { Footer } from "@/components/ui/footer";

/**
 * C-88: THE EDGE INDEX IS NOT A WIN PROBABILITY, AND FOUR PUBLIC SURFACES SAID
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
 * Despite that: the public proof page printed a market comparison derived from
 * it, two pieces of copy called the index "calibrated" while the calibration
 * gate reads RED, and two more converted it into an outcome frequency ("still
 * loses 36 of 100 times") three lines after saying it was not one.
 *
 * THE COPY ASSERTIONS RENDER THE COMPONENT rather than reading its source.
 * A claim is made to a customer by the DOM, not by a string literal, so
 * rendering is the honest place to assert it: this survives the copy being
 * moved into a constant, a CMS, or a map, and it fails only when a customer
 * would actually see the claim.
 */

describe("customer copy does not claim the Edge Index is calibrated or a win rate", () => {
  it("the home annotated sample makes no calibration claim and no outcome frequency", () => {
    render(<AnnotatedSampleSignal />);
    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/calibrated/i);
    // No losses-per-100 anywhere, in either callout (CodeRabbit, #719).
    expect(text).not.toMatch(/loses\s*~?\s*\d+\s*(of|per)\s*100/i);
    expect(text).not.toMatch(/\d+%\s*confidence signal/i);

    // Positive controls. The honest halves of those sentences are the reason
    // the section exists, and trimming the unearned adjective must not take
    // them with it.
    expect(screen.getByText(/Not a probability the pick wins/i)).toBeTruthy();
    expect(text).toMatch(/Variance is described, not hidden/i);
  });

  it("the global footer makes no calibration claim and keeps its risk language", () => {
    render(<Footer />);
    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/calibrated market signals/i);
    expect(text).toMatch(/not certainty/i);
    expect(text).toMatch(/Set limits before emotion enters/i);
  });
});

/**
 * The two assertions below are SOURCE PINS, matching the idiom used by 265
 * other test files in this repository (proof-of-record-surface.test.ts is the
 * nearest neighbour). They are pins rather than behavioural tests for reasons
 * worth stating:
 *
 *   - the proof loader's row path needs a database, and stub mode returns no
 *     rows, so there is nothing to assert behaviourally without standing up a
 *     fixture heavier than the claim it would check;
 *   - the B2B route is behind API-key auth, so exercising GET means mocking the
 *     auth layer to assert one string in a disclaimer.
 *
 * Both are honest trade-offs rather than oversights, and both are recorded.
 */
const PROOF_LOADER = fs.readFileSync(
  path.resolve(__dirname, "../lib/proof/load-proof-of-record.ts"),
  "utf8",
);
const PROBABILITIES_ROUTE = fs.readFileSync(
  path.resolve(__dirname, "../app/api/v1/probabilities/route.ts"),
  "utf8",
);

describe("the proof page does not derive a market comparison from confidence", () => {
  it("never subtracts a fair probability from confidence/100", () => {
    // The exact category error: a probability minus a non-probability, printed
    // as percentage points on a page whose entire purpose is verifiability.
    expect(PROOF_LOADER).not.toMatch(/confidence\s*\/\s*100\s*-\s*fairProb/);
  });

  it("still exposes the field, so restoring a REAL model probability stays a one-line change", () => {
    // The control. Deleting the field and its render path would also satisfy
    // the assertion above, and would turn a one-line restoration into a
    // re-design once rankingP is threaded into that query.
    expect(PROOF_LOADER).toContain("modelVsMarketPp");
  });

  it("keeps the rule it already stated for SPREAD and TOTAL", () => {
    // The rule was never wrong. It simply was not applied to MONEYLINE.
    expect(PROOF_LOADER).toContain("mixes two unrelated quantities");
  });
});

describe("the B2B probabilities route says what pModel actually is", () => {
  it("names pModel a confidence score rather than leaving the field to imply a probability", () => {
    // The contract is NOT changed: pModel keeps its value and its type, so no
    // consumer breaks. What changes is that the payload stops letting the field
    // name do the claiming. Which value pModel should carry is an open product
    // decision, recorded as C-88.
    expect(PROBABILITIES_ROUTE).toMatch(/CONFIDENCE SCORE, not a calibrated win probability/);
    expect(PROBABILITIES_ROUTE).toContain("C-88");
  });

  it("still points integrators at the fields that ARE probabilities", () => {
    // A disclaimer that only warns is less useful than one that redirects, and
    // both real quantities are already in the payload.
    expect(PROBABILITIES_ROUTE).toContain("marketFairProb");
    expect(PROBABILITIES_ROUTE).toContain("rankingP");
  });
});
