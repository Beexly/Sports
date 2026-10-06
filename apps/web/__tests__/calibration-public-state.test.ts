import { describe, expect, it } from "vitest";
import {
  resolveCalibrationState,
  calibrationStateClearsFloor,
  worseState,
  rankState,
  MEASURED_QUANTITY,
  NOT_ESTABLISHED,
  type CalibrationStateInput,
} from "@/lib/calibration/public-state";
import { CONFIDENCE_PROBABILITY_CAVEAT } from "@/lib/calibration/compute";
import { scanForBannedPhrases, scanForNumericPerformanceClaims } from "@/lib/trust-claims";
import { evaluateCalibrationEligibility, DEFAULT_CALIBRATION_FLOORS } from "@/lib/ops/calibration-eligibility";
import type { EligibilityDurableSnap, CalibrationEligibilityReport } from "@/lib/ops/calibration-eligibility-durable";

/**
 * The honesty properties, pinned.
 *
 * Every claim this module makes is falsifiable, so each one is a test: the
 * state can only be reached on real evidence, a withheld reading can never be
 * reported as a passing one, a failed read is never a verdict, and no string it
 * emits trips the platform's own banned-phrase and numeric-claim scanners.
 */

/** A report that clears every floor, built through the real evaluator. */
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
      dateRange: "2026-01-01..2026-09-01",
      generatedAt: "2026-09-01T00:00:00.000Z",
    },
    canonicalSettled: n,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 3,
    streakRequired: 3,
  });
}

function snapWith(report: CalibrationEligibilityReport, evaluatedAt: string): EligibilityDurableSnap {
  return { evaluatedAt, schema: 1, report } as unknown as EligibilityDurableSnap;
}

function input(overrides: Partial<CalibrationStateInput> = {}): CalibrationStateInput {
  return {
    snap: null,
    confidenceScoreDisclosure: CONFIDENCE_PROBABILITY_CAVEAT,
    now: Date.parse("2026-09-30T12:00:00.000Z"),
    ...overrides,
  };
}

describe("resolveCalibrationState — MEETS_FLOOR is unreachable without real evidence", () => {
  it("reads MEETS_FLOOR only from a report that actually cleared every floor", () => {
    const s = resolveCalibrationState(
      input({ snap: snapWith(greenReport(), "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.state).toBe("MEETS_FLOOR");
    expect(s.clearsOurFloor).toBe(true);
    expect(s.evidence?.n).toBe(420);
  });

  it("no input short of a real GREEN report yields MEETS_FLOOR", () => {
    expect(resolveCalibrationState(input()).state).not.toBe("MEETS_FLOOR");
    expect(resolveCalibrationState(input({ readFailed: true })).state).not.toBe("MEETS_FLOOR");
  });

  it("does not grant clearsOurFloor on any non-MEETS_FLOOR state", () => {
    const states = [
      resolveCalibrationState(input()),
      resolveCalibrationState(input({ readFailed: true })),
      resolveCalibrationState(input({ snap: snapWith(greenReport(40), "2026-09-30T11:00:00.000Z") })),
      resolveCalibrationState(input({ snap: snapWith(greenReport(), "2020-01-01T00:00:00.000Z") })),
    ];
    for (const s of states) {
      if (s.state !== "MEETS_FLOOR") expect(s.clearsOurFloor).toBe(false);
      expect(calibrationStateClearsFloor(s)).toBe(s.state === "MEETS_FLOOR");
    }
  });
});

describe("withheld evidence is withheld, not approximated", () => {
  it("withholds every figure below the sample floor", () => {
    const s = resolveCalibrationState(
      input({ snap: snapWith(greenReport(40), "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.state).toBe("COLLECTING");
    // The whole point: a sub-floor sample is no reading, so there is nothing to
    // print. A renderer given `evidence` here would be printing a 40-row number.
    expect(s.evidence).toBeNull();
    expect(s.statement).toContain("40");
  });

  it("NO_EVIDENCE and UNAVAILABLE both withhold figures", () => {
    const none = resolveCalibrationState(input());
    const failed = resolveCalibrationState(input({ readFailed: true }));
    expect(none.state).toBe("NO_EVIDENCE");
    expect(failed.state).toBe("UNAVAILABLE");
    expect(none.evidence).toBeNull();
    expect(failed.evidence).toBeNull();
  });

  it("withholds figures on a stale reading rather than showing an old number", () => {
    const s = resolveCalibrationState(
      input({ snap: snapWith(greenReport(), "2020-01-01T00:00:00.000Z") }),
    );
    expect(s.state).toBe("STALE");
    // A previously-passing reading that has expired keeps NONE of its numbers.
    expect(s.evidence).toBeNull();
    expect(s.clearsOurFloor).toBe(false);
  });
});

describe("a failed read is not a verdict", () => {
  it("never reports UNAVAILABLE as a failing measurement", () => {
    const s = resolveCalibrationState(input({ readFailed: true }));
    expect(s.state).toBe("UNAVAILABLE");
    // No floors, no failing list: there is nothing to have failed.
    expect(s.failingFloors).toEqual([]);
    expect(s.statement).toMatch(/not a result/i);
  });

  it("a read failure outranks evidence in worseState, never the reverse", () => {
    expect(worseState("UNAVAILABLE", "MEETS_FLOOR")).toBe("UNAVAILABLE");
    expect(worseState("MEETS_FLOOR", "UNAVAILABLE")).toBe("UNAVAILABLE");
    expect(worseState("NO_EVIDENCE", "MEETS_FLOOR")).toBe("NO_EVIDENCE");
  });
});

describe("BELOW_FLOOR is publishable bad news", () => {
  it("names the failing floor and keeps the measured evidence", () => {
    const report = evaluateCalibrationEligibility({
      metrics: {
        n: 420,
        brier: 0.31, // over the 0.22 ceiling
        ece: 0.04,
        eceNoise: 0.01,
        eceDebiased: 0.03,
        mce: 0.05,
        murphy: { reliability: 0.03, resolution: 0.02, uncertainty: 0.01 },
        modelVersion: "v5.2.8",
        dateRange: null,
        generatedAt: null,
      },
      canonicalSettled: 420,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 3,
      streakRequired: 3,
    });
    const s = resolveCalibrationState(
      input({ snap: snapWith(report, "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.state).toBe("BELOW_FLOOR");
    expect(s.clearsOurFloor).toBe(false);
    // Bad news ships WITH its evidence and the specific reason, never instead of it.
    expect(s.evidence?.brier).toBe(0.31);
    expect(s.failingFloors.join(" ")).toMatch(/brier/i);
    expect(s.statement).toMatch(/does not clear/i);
  });

  it("a failing state is never ranked above a passing one", () => {
    expect(rankState("BELOW_FLOOR")).toBeLessThan(rankState("MEETS_FLOOR"));
    expect(rankState("COLLECTING")).toBeLessThan(rankState("BELOW_FLOOR"));
    expect(rankState("STALE")).toBeLessThan(rankState("COLLECTING"));
  });
});

describe("the state is disclosed, not asserted", () => {
  const states = [
    resolveCalibrationState(input()),
    resolveCalibrationState(input({ readFailed: true })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(40), "2026-09-30T11:00:00.000Z") })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(), "2020-01-01T00:00:00.000Z") })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(), "2026-09-30T11:00:00.000Z") })),
  ];

  it("every state names what it does NOT establish", () => {
    for (const s of states) {
      expect(s.notEstablished.length).toBeGreaterThan(0);
      expect(s.notEstablished).toEqual(NOT_ESTABLISHED);
      expect(s.notEstablished.join(" ")).toMatch(/not a win rate/i);
      expect(s.notEstablished.join(" ")).toMatch(/not a claim about future results/i);
    }
  });

  it("every state says what the numbers were measured ON", () => {
    for (const s of states) {
      expect(s.measuredQuantity).toBe(MEASURED_QUANTITY);
      expect(MEASURED_QUANTITY).toMatch(/market-implied win probability/i);
    }
  });

  it("every state carries the confidence-score disclosure, unvaried by the reading", () => {
    for (const s of states) {
      expect(s.confidenceScoreDisclosure).toBe(CONFIDENCE_PROBABILITY_CAVEAT);
      expect(s.confidenceScoreDisclosure).toMatch(/not a calibrated win probability/i);
    }
  });
});

describe("no state emits copy the platform's own scanners reject", () => {
  const states = [
    resolveCalibrationState(input()),
    resolveCalibrationState(input({ readFailed: true })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(40), "2026-09-30T11:00:00.000Z") })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(), "2020-01-01T00:00:00.000Z") })),
    resolveCalibrationState(input({ snap: snapWith(greenReport(), "2026-09-30T11:00:00.000Z") })),
  ];

  it("carries no banned phrase in any statement or limit line", () => {
    for (const s of states) {
      const copy = [s.statement, ...s.notEstablished, s.confidenceScoreDisclosure, s.measuredQuantity].join(" ");
      expect(scanForBannedPhrases(copy)).toEqual([]);
    }
  });

  it("claims no performance figure — this module states a state, never a win rate", () => {
    for (const s of states) {
      // The numeric-claim scanner fires on a percentage beside a performance
      // word. Calibration statements are allowed to carry metric values but
      // must not assert a hit/win/success rate, which /performance owns.
      expect(scanForNumericPerformanceClaims(s.statement)).toEqual([]);
    }
  });

  it("a MEETS_FLOOR statement does not say the model 'is calibrated'", () => {
    const s = resolveCalibrationState(
      input({ snap: snapWith(greenReport(), "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.state).toBe("MEETS_FLOOR");
    // The narrow wording: it cleared OUR floor on THIS sample. Never "we are
    // calibrated", which survives being quoted without the caveats attached.
    expect(s.statement).toMatch(/cleared every floor we set/i);
    expect(s.statement).not.toMatch(/\b(is|are) calibrated\b/i);
    expect(s.statement).not.toMatch(/\baccurate\b/i);
  });
});

describe("the ECE the state reports is the ECE the gate read", () => {
  it("reports the bias-corrected figure, not the raw one beside it", () => {
    const report = evaluateCalibrationEligibility({
      metrics: {
        n: 420,
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
      canonicalSettled: 420,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 3,
      streakRequired: 3,
    });
    const s = resolveCalibrationState(
      input({ snap: snapWith(report, "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.evidence?.eceDebiased).toBe(0.03);
    // The noise it corrected by travels with it, so the number is never read bare.
    expect(s.evidence?.eceNoise).toBe(0.01);
    expect(s.evidence?.eceDebiased).not.toBe(report.ece);
  });

  it("keeps the default floors visible so a reader can check the comparison", () => {
    const s = resolveCalibrationState(
      input({ snap: snapWith(greenReport(), "2026-09-30T11:00:00.000Z") }),
    );
    expect(s.floors).toEqual(DEFAULT_CALIBRATION_FLOORS);
  });
});
