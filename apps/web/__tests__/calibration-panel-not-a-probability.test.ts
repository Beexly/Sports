import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-176. The public calibration panel was the LAST customer surface still
 * treating the Edge Index as a win probability.
 *
 * Two specific claims lived there:
 *   1. a per-band "expected" marker positioned at `confidence / 100`, which
 *      draws the diagonal a perfectly calibrated FORECAST would land on, and
 *   2. a published Brier score computed as `(confidence/100 - outcome)^2`,
 *      labelled "the single calibration number", with reads like "Sharp.
 *      Confidence tracks outcomes closely."
 *
 * A Brier score is only a calibration score if the number being scored is a
 * probability. This repo asserts everywhere else that confidence is not one:
 * compute-live-calibration-metrics.ts states "confidence/100 is never scored",
 * the home copy says "Not a probability the pick wins", and C-88/C-157 removed
 * the same claim from the proof page, the B2B API, the footer and the home
 * annotations. The panel was missed.
 *
 * It was LATENT rather than live - loadPublicCalibrationReport returns
 * `gated: true` with an empty report until the performance gate opens - which
 * is precisely why it had to be fixed BEFORE the flip rather than after.
 *
 * This is a source-level assertion on purpose. The defect is the presence of a
 * particular expression in a rendered component, and a render test would only
 * catch it on whichever fixture happened to exercise that branch.
 */

const PANEL = resolve(__dirname, "..", "components", "performance", "calibration-panel.tsx");

describe("the public calibration panel makes no probability claim", () => {
  const source = readFileSync(PANEL, "utf8");

  it("does not position an expected-value marker from confidence", () => {
    // The marker was `left: ${Math.round(bucket.expectedWinRate * 100)}%`.
    // expectedWinRate is the mean of confidence/100 across the band.
    expect(source).not.toContain("expectedWinRate");
  });

  it("leaves no legend describing the marker it removed", () => {
    // C-191. The marker went; the legend that named it ("marker = expected")
    // did not, so every row documented a cue that is not drawn - and re-made
    // the exact claim the marker was deleted for. A dangling legend is the
    // same false statement as the marker, minus the pixels.
    expect(source).not.toContain("marker = expected");
    expect(source).not.toMatch(/marker\s*=/);
    // And the replacement has to describe what IS rendered, or the chart is
    // just unlabelled.
    expect(source).toContain("bar = observed decided win rate");
    // The legend names the interval METHOD rather than a literal "95%": the
    // no-fake-percentages guard reads any hardcoded percentage on a customer
    // page as an outcome claim, and it is right to - a bare 95% next to a win
    // rate is exactly the kind of number a reader takes as a promise.
    expect(source).toContain("Clopper-Pearson interval");
  });

  it("does not render a Brier score", () => {
    expect(source).not.toContain("formatBrier");
    expect(source).not.toContain("brierScore");
    // The prose reads are gone too - they were the part a reader actually
    // believed ("Sharp. Confidence tracks outcomes closely.").
    expect(source).not.toContain("coin flip");
  });

  it("says in customer-facing copy what the panel actually is", () => {
    // A negative assertion alone would pass on an empty file. The panel has to
    // still explain itself, or removing the claim just leaves a mystery chart.
    expect(source).toContain("not a calibration score");
    expect(source).toContain("not a win probability");
  });

  it("keeps the honest half: observed rates with intervals", () => {
    // The control. The fix must not have gutted the panel - the observed
    // decided win rate per band and its Clopper-Pearson interval are real
    // measurements and stay.
    expect(source).toContain("clopperPearsonLow");
    expect(source).toContain("sufficientSample");
  });
});
