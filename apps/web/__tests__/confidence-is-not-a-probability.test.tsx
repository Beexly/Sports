import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

import { AnnotatedSampleSignal } from "@/components/home/annotated-sample-signal";
import { Footer } from "@/components/ui/footer";
import { honestConfidence } from "@/lib/calibration/honest-confidence";

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
 *
 * MEASURED 2026-09-13, which turns the principle above from a design choice
 * into a finding. Read-only over settled published non-bootstrap picks, pushes
 * excluded, founder-v1 excluded (full tables in
 * docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md
 * section 3b):
 *
 *   confidence 80+ : n 235, claimed 0.8663, realized 0.5191, z = -10.7
 *   Brier of confidence-as-probability on that band: 0.3617, where a constant
 *   0.5 forecast scores 0.25 — worse than saying nothing
 *
 * And the structural reason no downstream repair works: confidence is NOT
 * MONOTONE in outcome. Realized win rate peaks at conf 75-79 (0.6146) and falls
 * to 0.4643 by conf 90-94, below the 0.5280 of the lowest band. The display
 * calibrator (packages/prediction-engine/src/calibration-apply.ts) is isotonic
 * regression, monotone non-decreasing BY CONSTRUCTION: it can flatten a curve,
 * it can never invert one.
 *
 * The two blocks at the end of this file were added then. They cover the
 * highest-traffic confidence render, the pick card, which the four surfaces
 * above did not reach, and the calibrator's refusal paths — the only thing
 * standing between a hidden or uncalibrated score and a printed percentage.
 *
 * KNOWN GAP, deliberately not asserted away: /calibration still scores
 * confidence/100 as its forecast (lib/calibration/compute.ts
 * expectedFromConfidence, consumed at :349/:355/:448/:459). That is Phase 2 of
 * the v5.2.8 proposal and the flip is the founder's.
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
  it("retires pModel rather than shipping confidence/100 under a probability name", () => {
    // C-88 was the open product decision "should pModel carry a real
    // probability instead of the confidence score". v5.2.8 Phase 2 takes it:
    // neither. The key is kept so no consumer breaks on a missing field, and
    // pinned to null so none can read a wrong number from it. The score ships
    // beside it under a name that cannot be mistaken for a rate.
    expect(PROBABILITIES_ROUTE).toMatch(/pModel:\s*null/);
    expect(PROBABILITIES_ROUTE).toMatch(/pModel is RETIRED and always null/);
    expect(PROBABILITIES_ROUTE).toMatch(/confidenceScore:/);
    expect(PROBABILITIES_ROUTE).toMatch(/do not read it as a probability/);
  });

  it("still points integrators at the fields that ARE probabilities", () => {
    // A disclaimer that only warns is less useful than one that redirects, and
    // both real quantities are already in the payload.
    expect(PROBABILITIES_ROUTE).toContain("marketFairProb");
    expect(PROBABILITIES_ROUTE).toContain("rankingP");
  });
});

describe("the pick card renders confidence as a score, never a percent", () => {
  const PICK_CARD = fs.readFileSync(
    path.resolve(__dirname, "../components/picks/pick-card.tsx"),
    "utf8",
  );

  it("prints the raw value as NN/100", () => {
    expect(PICK_CARD).toContain("{confidence}/100");
  });

  it("never interpolates the raw value against a percent sign", () => {
    // The card is the highest-traffic surface carrying this number. "91%" here
    // is the exact claim the measurement in the header refutes.
    expect(PICK_CARD).not.toMatch(/\{\s*confidence\s*\}\s*%/);
    expect(PICK_CARD).not.toMatch(/\$\{\s*confidence\s*\}\s*%/);
  });

  it("keeps the reason on the page, so the next editor inherits it", () => {
    expect(PICK_CARD).toMatch(/win probability, which this number is not/i);
  });
});

describe("honestConfidence refuses to manufacture a percentage", () => {
  const calibrator = (over: Record<string, unknown> = {}) =>
    ({
      isActive: true,
      sampleSize: 500,
      minSample: 100,
      rawEce: 0.2,
      calibratedEce: 0.05,
      inactiveReason: "",
      apply: (c: number) => ({ probability: c / 100, calibrated: true }),
      ...over,
    }) as Parameters<typeof honestConfidence>[1];

  it("returns null when the calibrator is INACTIVE, so callers fall back to the score", () => {
    expect(
      honestConfidence(91, calibrator({ isActive: false, inactiveReason: "insufficient sample" }), true),
    ).toBeNull();
  });

  it("returns null when the gate says calibration must not be applied", () => {
    expect(honestConfidence(91, calibrator(), false)).toBeNull();
  });

  it("returns null when there is no confidence to calibrate", () => {
    expect(honestConfidence(null, calibrator(), true)).toBeNull();
  });

  it("only produces a percentage when score, gate and audited calibrator all agree", () => {
    // The one path that may print a percent, asserted positively so this suite
    // pins the boundary rather than only its refusals.
    const ok = honestConfidence(72, calibrator(), true);
    expect(ok).not.toBeNull();
    expect(ok!.pct).toBe(72);
  });
});
