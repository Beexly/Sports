import { describe, expect, it } from "vitest";
import {
  HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES,
  runHistoricalDistributionAdapterFixtures,
  summarizeHistoricalDistributionAdapterResults,
} from "../core/index.js";

describe("metric historical distribution adapter", () => {
  it("keeps CIG/PFS fixture coverage explicit and local", () => {
    expect(HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES.map((fixture) => fixture.splitId)).toEqual([
      "historical_cig_nflverse_watch",
      "historical_pfs_portfolio_stable",
      "historical_dpi_drift_watch",
      "historical_cuw_width_watch",
      "historical_cig_raw_payload_blocked",
      "historical_dpi_raw_payload_blocked",
      "historical_cuw_raw_payload_blocked",
      "historical_pfs_sleeper_manual_review",
      "historical_pfs_permission_blocked",
    ]);
  });

  it("adapts only records passing source and payload rights gates", () => {
    const results = runHistoricalDistributionAdapterFixtures();
    const cig = resultFor(results, "historical_cig_nflverse_watch");
    const pfs = resultFor(results, "historical_pfs_portfolio_stable");
    const dpi = resultFor(results, "historical_dpi_drift_watch");
    const cuw = resultFor(results, "historical_cuw_width_watch");

    expect(cig.status).toBe("ADAPTED");
    expect(cig.lifecycleStatus).toBe("SHADOW");
    expect(cig.apiExposure).toBe("INTERNAL");
    expect(cig.licensingStatus).toBe("NOT_READY");
    expect(cig.publicApiAllowed).toBe(false);
    expect(cig.observedBand).toBe("B");
    expect(cig.driftStatus).toBe("WATCH");
    expect(cig.allowed).toBe(true);
    expect(cig.payloadRights?.allowed).toBe(true);

    expect(pfs.status).toBe("ADAPTED");
    expect(pfs.observedBand).toBe("FIT");
    expect(pfs.driftStatus).toBe("STABLE");
    expect(pfs.publicApiAllowed).toBe(false);
    expect(pfs.allowed).toBe(true);
    expect(pfs.payloadRights?.approvedFields).toContain("portfolio-fit-score.score");

    expect(dpi.status).toBe("ADAPTED");
    expect(dpi.observedBand).toBe("WATCH");
    expect(dpi.driftStatus).toBe("WATCH");
    expect(dpi.publicApiAllowed).toBe(false);
    expect(dpi.allowed).toBe(true);
    expect(dpi.payloadRights?.approvedFields).toContain("drift-pressure-index.score");

    expect(cuw.status).toBe("ADAPTED");
    expect(cuw.observedBand).toBe("WATCH");
    expect(cuw.driftStatus).toBe("WATCH");
    expect(cuw.publicApiAllowed).toBe(false);
    expect(cuw.allowed).toBe(true);
    expect(cuw.payloadRights?.approvedFields).toContain("conformal-uncertainty-width.score");
  });

  it("blocks raw payload leakage after source rights pass", () => {
    const results = runHistoricalDistributionAdapterFixtures();
    const rawLeak = resultFor(results, "historical_cig_raw_payload_blocked");
    const rawDpiLeak = resultFor(results, "historical_dpi_raw_payload_blocked");
    const rawCuwLeak = resultFor(results, "historical_cuw_raw_payload_blocked");

    expect(rawLeak.status).toBe("BLOCKED_BY_PAYLOAD_RIGHTS");
    expect(rawLeak.sourceReview.status).toBe("ADAPTED");
    expect(rawLeak.payloadRights?.blockedFields).toContain("calibration-integrity-grade.raw_input_snapshot");
    expect(rawLeak.score).toBeNull();
    expect(rawLeak.observedBand).toBeNull();
    expect(rawLeak.allowed).toBe(false);
    expect(rawDpiLeak.status).toBe("BLOCKED_BY_PAYLOAD_RIGHTS");
    expect(rawDpiLeak.sourceReview.status).toBe("ADAPTED");
    expect(rawDpiLeak.payloadRights?.blockedFields).toContain("drift-pressure-index.raw_input_snapshot");
    expect(rawDpiLeak.score).toBeNull();
    expect(rawCuwLeak.status).toBe("BLOCKED_BY_PAYLOAD_RIGHTS");
    expect(rawCuwLeak.sourceReview.status).toBe("ADAPTED");
    expect(rawCuwLeak.payloadRights?.blockedFields).toContain("conformal-uncertainty-width.raw_input_snapshot");
    expect(rawCuwLeak.score).toBeNull();
  });

  it("blocks manual-review and permission-required sources before metric execution", () => {
    const results = runHistoricalDistributionAdapterFixtures();
    const manual = resultFor(results, "historical_pfs_sleeper_manual_review");
    const blocked = resultFor(results, "historical_pfs_permission_blocked");

    expect(manual.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(manual.payloadRights).toBeNull();
    expect(manual.score).toBeNull();
    expect(blocked.status).toBe("BLOCKED_BY_SOURCE_RIGHTS");
    expect(blocked.sourceReview.violations).toContain("scores24-live blocks validation");
    expect(blocked.payloadRights).toBeNull();
  });

  it("summarizes adaptation without opening public API exposure", () => {
    const summary = summarizeHistoricalDistributionAdapterResults(runHistoricalDistributionAdapterFixtures());

    expect(summary).toEqual({
      adapted: 4,
      manualReview: 1,
      payloadBlocked: 3,
      publicApiAllowedCount: 0,
      sourceBlocked: 1,
      total: 9,
    });
  });
});

function resultFor(results: ReturnType<typeof runHistoricalDistributionAdapterFixtures>, splitId: string) {
  const result = results.find((candidate) => candidate.splitId === splitId);
  if (!result) throw new Error(`Missing historical distribution adapter result for ${splitId}`);
  return result;
}
