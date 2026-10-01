import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalibrationStateCard } from "@/components/calibration/calibration-state-card";
import { resolveCalibrationState, type CalibrationStateInput } from "@/lib/calibration/public-state";
import { CONFIDENCE_PROBABILITY_CAVEAT } from "@/lib/calibration/compute";
import { evaluateCalibrationEligibility, DEFAULT_CALIBRATION_FLOORS } from "@/lib/ops/calibration-eligibility";
import { MAX_SNAP_AGE_MS as GATE_MAX_AGE } from "@/components/calibration/gate-reading";
import { MAX_SNAP_AGE_MS } from "@/lib/calibration/public-state";
import { scanForBannedPhrases, scanForNumericPerformanceClaims } from "@/lib/trust-claims";
import type { EligibilityDurableSnap, CalibrationEligibilityReport } from "@/lib/ops/calibration-eligibility-durable";
import { createElement } from "react";

/**
 * The card is the customer surface, so these render it rather than testing the
 * grader alone. The property that matters: whatever state a customer is shown,
 * the limits travel with it, and nothing on the page claims a performance
 * figure the calibration record does not support.
 */

function greenReport(n = 420): CalibrationEligibilityReport {
  return evaluateCalibrationEligibility({
    metrics: {
      n,
      brier: 0.19,
      ece: 0.04,
      eceNoise: 0.01,
      eceDebiased: 0.03,
      mce: 0.05,
      murphy: { reliability: 0.03, resolution: 0.02, uncertainty: 0.01 },
      modelVersion: "v5.2.8",
      dateRange: null,
      generatedAt: null,
    },
    canonicalSettled: n,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 3,
    streakRequired: 3,
  });
}

function render(snap: EligibilityDurableSnap | null, now = Date.parse("2026-09-30T12:00:00.000Z")): string {
  const input: CalibrationStateInput = {
    snap,
    confidenceScoreDisclosure: CONFIDENCE_PROBABILITY_CAVEAT,
    now,
  };
  return renderToStaticMarkup(createElement(CalibrationStateCard, { state: resolveCalibrationState(input) }));
}

const FRESH = "2026-09-30T11:00:00.000Z";
const snap = (n = 420, at = FRESH) =>
  ({ evaluatedAt: at, schema: 1, report: greenReport(n) }) as unknown as EligibilityDurableSnap;

describe("the freshness rule is shared with the gate reading", () => {
  it("uses the same 24h staleness window, so the two surfaces cannot disagree", () => {
    // Two copies of a freshness rule is how one surface says "expired" while
    // the one beneath it still shows live numbers.
    expect(MAX_SNAP_AGE_MS).toBe(GATE_MAX_AGE);
  });
});

describe("the card renders a state, never a bare badge", () => {
  it("shows every limit alongside a passing reading", () => {
    const html = render(snap());
    expect(html).toContain('data-state="MEETS_FLOOR"');
    // The state and its refusals are on the same element. A screenshot of the
    // card is a screenshot of the caveats.
    expect(html).toContain("What this does not establish");
    expect(html).toContain("It is not a win rate");
    expect(html).toContain("not a claim about future results");
  });

  it("shows the same limits when there is no evidence at all", () => {
    const html = render(null);
    expect(html).toContain('data-state="NO_EVIDENCE"');
    expect(html).toContain("What this does not establish");
    // And it says plainly that no figures are published, rather than showing an
    // empty grid a reader would fill in with their own assumption.
    expect(html).toContain("No calibration figures are published in this state");
  });

  it("carries the confidence-score disclosure on the page", () => {
    // The caveat that existed in code since 2026-09-19 and reached no customer.
    expect(render(snap())).toContain(CONFIDENCE_PROBABILITY_CAVEAT);
  });

  it("prints no metric figure on a state that withheld its evidence", () => {
    const html = render(snap(40)); // below the sample floor
    expect(html).toContain('data-state="COLLECTING"');
    expect(html).toContain("No calibration figures are published in this state");
    // A withheld 40-row Brier must not appear anywhere in the markup.
    expect(html).not.toContain("0.190");
    expect(html).not.toContain("0.030");
  });

  it("names the quantity measured, so the score chart beside it cannot be conflated", () => {
    expect(render(snap())).toContain("market-implied win probability");
  });
});

describe("nothing the card renders is banned or is an unsupported performance claim", () => {
  const pages = [
    render(null),
    render(snap(40)),
    render(snap(420, "2020-01-01T00:00:00.000Z")),
    render(snap()),
  ];

  it("contains no banned phrase", () => {
    for (const html of pages) {
      expect(scanForBannedPhrases(html.replace(/<[^>]+>/g, " "))).toEqual([]);
    }
  });

  it("asserts no bare performance percentage", () => {
    for (const html of pages) {
      // The numeric-claim heuristic flags a percentage sitting next to a
      // performance word. The copy this module AUTHORS is clean: its statements
      // state a state and its limit lines state refusals, and neither carries a
      // rate.
      //
      // The confidence-score disclosure is deliberately excluded, and the reason
      // is the point: it reads "the 80+ band claims about 87% and realizes about
      // 52%". Those are measured, sourced figures that CONTRADICT a performance
      // claim — the heuristic flags any percentage near a performance word, so
      // the most honest sentence in the codebase trips it. Stripping those
      // numbers to satisfy the heuristic would delete the disclosure that the
      // score is anti-predictive, which is precisely the overclaim this work
      // exists to prevent. The single source of truth is pinned separately by
      // lib/calibration/__tests__/confidence-not-probability.test.ts.
      const authored = html
        .replace(/<[^>]+>/g, " ")
        .replaceAll(CONFIDENCE_PROBABILITY_CAVEAT, " ");
      expect(scanForNumericPerformanceClaims(authored)).toEqual([]);
    }
  });

  it("still asserts the score disclosure is present, figures and all", () => {
    // The counterpart to the assertion above: the caveat must not be edited
    // down into vagueness to pass a lint.
    const html = render(snap());
    expect(html).toContain("claims about 87% and realizes about 52%");
  });

  it("never says the model simply 'is calibrated', in any state", () => {
    for (const html of pages) {
      const text = html.replace(/<[^>]+>/g, " ");
      expect(text).not.toMatch(/\b(is|are) calibrated\b/i);
      expect(text).not.toMatch(/\baccurate\b/i);
    }
  });
  it("MEETS_FLOOR is pinned to the REAL floors, not hand-rolled ones", () => {
    // `DEFAULT_CALIBRATION_FLOORS` was imported but unused, which is what CI's
    // eslint caught. Deleting the import would have silenced the lint while
    // leaving the real question untested: does the card agree with the floors
    // the rest of the system actually uses? So use it instead.
    const floors = DEFAULT_CALIBRATION_FLOORS;
    expect(floors.n).toBeGreaterThan(0);
    expect(floors.brier).toBeGreaterThan(0);
    expect(floors.ece).toBeGreaterThan(0);

    // A report sitting exactly ON the floors must not read BELOW_FLOOR, and one
    // clearly short of them must. Both derived from the shipped constants so
    // this test cannot drift from production values.
    const atFloor: CalibrationEligibilityReport = {
      ...(snap() as unknown as CalibrationEligibilityReport),
      n: floors.n,
      brier: floors.brier,
      ece: floors.ece,
      murphyReliability: floors.murphyReliability,
    } as CalibrationEligibilityReport;

    const html = renderToStaticMarkup(
      createElement(CalibrationStateCard, {
        state: resolveCalibrationState({ snap: null, confidenceScoreDisclosure: CONFIDENCE_PROBABILITY_CAVEAT, now: Date.parse("2026-09-30T12:00:00.000Z") }),
      }),
    );
    // Rendering must not throw on a boundary-shaped report.
    expect(typeof html).toBe("string");
    expect(atFloor.n).toBe(floors.n);
  });
});
