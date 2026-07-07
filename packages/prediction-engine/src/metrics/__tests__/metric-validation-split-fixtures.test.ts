import { describe, expect, it } from "vitest";
import {
  DECISION_WINDOW_VALIDATION_SPLITS,
  ROLE_STABILITY_VALIDATION_SPLITS,
  runDecisionWindowValidationSplits,
  runMetricValidationSplitFixtures,
  runRoleStabilityValidationSplits,
  summarizeMetricValidationSplitResults,
} from "../core/index.js";

describe("metric validation split fixtures", () => {
  it("runs the expected local-only role and decision split library", () => {
    expect(ROLE_STABILITY_VALIDATION_SPLITS.map((split) => split.splitId)).toEqual([
      "role_stable_clean",
      "role_elevated_watch",
      "role_stale_fail_closed",
      "role_blocked_source_fail_closed",
    ]);
    expect(DECISION_WINDOW_VALIDATION_SPLITS.map((split) => split.splitId)).toEqual([
      "decision_window_open_clean",
      "decision_window_context_watch",
      "decision_window_stale_market_fail_closed",
      "decision_window_calibration_fail_closed",
      "decision_window_blocked_source_fail_closed",
    ]);
  });

  it("preserves lifecycle, API, and licensing locks for every split result", () => {
    const results = runMetricValidationSplitFixtures();

    for (const result of results) {
      expect(result.lifecycleStatus).toBe("SHADOW");
      expect(result.apiExposure).toBe("INTERNAL");
      expect(result.licensingStatus).toBe("NOT_READY");
      expect(result.publicApiAllowed).toBe(false);
      expect(result.notes.length).toBeGreaterThan(0);
    }
  });

  it("classifies role-stability splits as stable, watch, stale fail-closed, and source fail-closed", () => {
    const results = runRoleStabilityValidationSplits();
    const stable = splitFor(results, "role_stable_clean");
    const watch = splitFor(results, "role_elevated_watch");
    const stale = splitFor(results, "role_stale_fail_closed");
    const blocked = splitFor(results, "role_blocked_source_fail_closed");

    expect(stable.status).toBe("PASS");
    expect(stable.allowed).toBe(true);
    expect(stable.observedBand).toBe("LOW");

    expect(watch.status).toBe("WATCH");
    expect(watch.allowed).toBe(true);
    expect(watch.observedBand).toBe("ELEVATED");

    expect(stale.status).toBe("FAIL_CLOSED");
    expect(stale.allowed).toBe(false);
    expect(stale.observedBand).toBe("BLOCK");
    expect(stale.reasons).toContain("stale_usage");

    expect(blocked.status).toBe("FAIL_CLOSED");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toContain("source_policy_blocks_modeling");
  });

  it("classifies decision-window splits as open, watch, and hard fail-closed", () => {
    const results = runDecisionWindowValidationSplits();
    const open = splitFor(results, "decision_window_open_clean");
    const contextWatch = splitFor(results, "decision_window_context_watch");
    const stale = splitFor(results, "decision_window_stale_market_fail_closed");
    const calibration = splitFor(results, "decision_window_calibration_fail_closed");
    const blocked = splitFor(results, "decision_window_blocked_source_fail_closed");

    expect(open.status).toBe("PASS");
    expect(open.allowed).toBe(true);
    expect(open.observedBand).toBe("OPEN");

    expect(contextWatch.status).toBe("WATCH");
    expect(contextWatch.allowed).toBe(true);
    expect(contextWatch.observedBand).not.toBe("OPEN");

    expect(stale.status).toBe("FAIL_CLOSED");
    expect(stale.allowed).toBe(false);
    expect(stale.reasons).toContain("Market signal is stale or blocked.");

    expect(calibration.status).toBe("FAIL_CLOSED");
    expect(calibration.allowed).toBe(false);
    expect(calibration.reasons).toContain("Calibration debt is too high.");

    expect(blocked.status).toBe("FAIL_CLOSED");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toContain("Source policy blocks modeling.");
  });

  it("summarizes split coverage without treating any split as public API eligible", () => {
    const summary = summarizeMetricValidationSplitResults(runMetricValidationSplitFixtures());

    expect(summary).toEqual({
      failClosed: 5,
      pass: 2,
      publicApiAllowedCount: 0,
      total: 9,
      watch: 2,
    });
  });
});

function splitFor(results: ReturnType<typeof runMetricValidationSplitFixtures>, splitId: string) {
  const result = results.find((candidate) => candidate.splitId === splitId);
  if (!result) throw new Error(`Missing split result for ${splitId}`);
  return result;
}
