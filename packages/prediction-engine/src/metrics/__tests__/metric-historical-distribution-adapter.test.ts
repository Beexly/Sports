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
      "historical_cig_raw_payload_blocked",
      "historical_pfs_sleeper_manual_review",
      "historical_pfs_permission_blocked",
    ]);
  });

  it("adapts only records passing source and payload rights gates", () => {
    const results = runHistoricalDistributionAdapterFixtures();
    const cig = resultFor(results, "historical_cig_nflverse_watch");
    const pfs = resultFor(results, "historical_pfs_portfolio_stable");

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
  });

  it("blocks raw payload leakage after source rights pass", () => {
    const rawLeak = resultFor(runHistoricalDistributionAdapterFixtures(), "historical_cig_raw_payload_blocked");

    expect(rawLeak.status).toBe("BLOCKED_BY_PAYLOAD_RIGHTS");
    expect(rawLeak.sourceReview.status).toBe("ADAPTED");
    expect(rawLeak.payloadRights?.blockedFields).toContain("calibration-integrity-grade.raw_input_snapshot");
    expect(rawLeak.score).toBeNull();
    expect(rawLeak.observedBand).toBeNull();
    expect(rawLeak.allowed).toBe(false);
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
      adapted: 2,
      manualReview: 1,
      payloadBlocked: 1,
      publicApiAllowedCount: 0,
      sourceBlocked: 1,
      total: 5,
    });
  });
});

function resultFor(results: ReturnType<typeof runHistoricalDistributionAdapterFixtures>, splitId: string) {
  const result = results.find((candidate) => candidate.splitId === splitId);
  if (!result) throw new Error(`Missing historical distribution adapter result for ${splitId}`);
  return result;
}
