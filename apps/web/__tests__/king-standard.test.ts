import { describe, expect, it } from "vitest";
import {
  computeLiveFeeds,
  computeMetricDepth,
  computeOverall,
  computeProofArchive,
  computeSourceCoverage,
  isMeasured,
  KING_DIMENSION_LABELS,
  type KingStandardDimensions,
} from "../lib/statking/king-standard";
import { REFRESH_STALE_AFTER_MINUTES } from "../lib/data-reliability/refresh-sla";

/**
 * King Standard pure core. Pins the exact computation for each dimension so
 * a future edit can't silently reintroduce a hardcoded literal (see
 * reports/audits/public-number-audit-2026-07-16.md, findings #1-2).
 */

const NOW = new Date("2026-07-16T12:00:00.000Z");

function minutesAgo(m: number): Date {
  return new Date(NOW.getTime() - m * 60 * 1000);
}

describe("computeSourceCoverage", () => {
  it("is notMeasured when there is no required-stat catalog to audit against", () => {
    const dimension = computeSourceCoverage([], []);
    expect(isMeasured(dimension)).toBe(false);
    if (!isMeasured(dimension)) {
      expect(dimension.reason).toMatch(/no required data-type catalog/);
    }
  });

  it("computes the implemented/required ratio via the real stat-coverage auditor, gaps included", () => {
    const dimension = computeSourceCoverage(["a", "b", "c"], ["a", "b"]);
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) {
      expect(dimension.score).toBe(67); // round(2/3 * 100)
      expect(dimension.basis).toContain("2/3");
      expect(dimension.basis).toContain("gaps: c");
    }
  });

  it("reports a full 100 with no gaps when everything required is implemented", () => {
    const dimension = computeSourceCoverage(["x", "y"], ["x", "y"]);
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) {
      expect(dimension.score).toBe(100);
      expect(dimension.basis).toContain("no gaps");
    }
  });
});

describe("computeMetricDepth", () => {
  it("is always measured — a compile-time catalog count has no failure mode", () => {
    const dimension = computeMetricDepth(20);
    expect(dimension.score).toBe(20);
    expect(dimension.basis).toContain("20 registered metric modules");
  });

  it("caps the score at 100 for a catalog larger than 100", () => {
    const dimension = computeMetricDepth(150);
    expect(dimension.score).toBe(100);
  });

  it("scores 0 (not notMeasured) for an empty catalog", () => {
    const dimension = computeMetricDepth(0);
    expect(dimension.score).toBe(0);
  });
});

describe("computeProofArchive", () => {
  it("is notMeasured when the DB was not reachable", () => {
    const dimension = computeProofArchive({ reachable: false });
    expect(isMeasured(dimension)).toBe(false);
    if (!isMeasured(dimension)) {
      expect(dimension.reason).toMatch(/database not reachable/);
    }
  });

  it("is notMeasured when reachable but no settled count was actually returned", () => {
    const dimension = computeProofArchive({ reachable: true });
    expect(isMeasured(dimension)).toBe(false);
  });

  it("computes settled count against the readiness floor, with calibration gate state in the basis", () => {
    const collecting = computeProofArchive({
      reachable: true,
      settledCount: 50,
      settledThreshold: 100,
      calibrationGateOpen: false,
    });
    expect(isMeasured(collecting)).toBe(true);
    if (isMeasured(collecting)) {
      expect(collecting.score).toBe(50);
      expect(collecting.basis).toContain("50 settled/graded canonical picks");
      expect(collecting.basis).toContain("100-pick");
      expect(collecting.basis).toContain("collecting");
    }

    const publishing = computeProofArchive({
      reachable: true,
      settledCount: 150,
      settledThreshold: 100,
      calibrationGateOpen: true,
    });
    expect(isMeasured(publishing)).toBe(true);
    if (isMeasured(publishing)) {
      expect(publishing.score).toBe(100); // capped, not 150
      expect(publishing.basis).toContain("publishing");
    }
  });

  it("defaults the threshold to 100 when the caller doesn't supply one", () => {
    const dimension = computeProofArchive({ reachable: true, settledCount: 0 });
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) {
      expect(dimension.score).toBe(0);
      expect(dimension.basis).toContain("100-pick");
    }
  });
});

describe("computeLiveFeeds", () => {
  it("is notMeasured when ingestion status was not reachable", () => {
    const dimension = computeLiveFeeds({ reachable: false }, NOW);
    expect(isMeasured(dimension)).toBe(false);
    if (!isMeasured(dimension)) {
      expect(dimension.reason).toMatch(/ingestion status not reachable/);
    }
  });

  it("scores 0 — a real measurement, not notMeasured — when ingestion has never succeeded", () => {
    const dimension = computeLiveFeeds({ reachable: true, lastSuccessAt: null }, NOW);
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) {
      expect(dimension.score).toBe(0);
      expect(dimension.basis).toContain("has ever completed");
    }
  });

  it("scores 100 for a just-completed ingestion run", () => {
    const dimension = computeLiveFeeds({ reachable: true, lastSuccessAt: NOW }, NOW);
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) expect(dimension.score).toBe(100);
  });

  it("scores linearly against the shared stale threshold", () => {
    const halfway = computeLiveFeeds(
      { reachable: true, lastSuccessAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES / 2) },
      NOW,
    );
    expect(isMeasured(halfway)).toBe(true);
    if (isMeasured(halfway)) expect(halfway.score).toBe(50);

    const atThreshold = computeLiveFeeds(
      { reachable: true, lastSuccessAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES) },
      NOW,
    );
    expect(isMeasured(atThreshold)).toBe(true);
    if (isMeasured(atThreshold)) expect(atThreshold.score).toBe(0);
  });

  it("clamps to 0 rather than going negative well past the stale threshold", () => {
    const dimension = computeLiveFeeds(
      { reachable: true, lastSuccessAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES * 2) },
      NOW,
    );
    expect(isMeasured(dimension)).toBe(true);
    if (isMeasured(dimension)) expect(dimension.score).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages only the measured dimensions and labels the coverage", () => {
    const dimensions: KingStandardDimensions = {
      sourceCoverage: { score: 67, basis: "x" },
      liveFeeds: { score: 100, basis: "x" },
      proofArchive: { score: 50, basis: "x" },
      metricDepth: { score: 20, basis: "x" },
    };
    const overall = computeOverall(dimensions);
    expect(overall.measuredCount).toBe(4);
    expect(overall.totalDimensions).toBe(4);
    expect(overall.score).toBe(59); // round((67+100+50+20)/4)
    expect(overall.basis).toContain("4 of 4 dimensions");
  });

  it("excludes notMeasured dimensions from both the mean and the count", () => {
    const dimensions: KingStandardDimensions = {
      sourceCoverage: { score: 80, basis: "x" },
      liveFeeds: { notMeasured: true, reason: "unreachable" },
      proofArchive: { notMeasured: true, reason: "unreachable" },
      metricDepth: { score: 20, basis: "x" },
    };
    const overall = computeOverall(dimensions);
    expect(overall.measuredCount).toBe(2);
    expect(overall.score).toBe(50); // round((80+20)/2)
    expect(overall.basis).toContain("2 of 4 dimensions");
    expect(overall.basis).toContain(KING_DIMENSION_LABELS.sourceCoverage);
    expect(overall.basis).not.toContain(KING_DIMENSION_LABELS.liveFeeds);
  });

  it("is null, not 0, when nothing at all is measured", () => {
    const dimensions: KingStandardDimensions = {
      sourceCoverage: { notMeasured: true, reason: "x" },
      liveFeeds: { notMeasured: true, reason: "x" },
      proofArchive: { notMeasured: true, reason: "x" },
      metricDepth: { notMeasured: true, reason: "x" },
    };
    const overall = computeOverall(dimensions);
    expect(overall.measuredCount).toBe(0);
    expect(overall.score).toBeNull();
    expect(overall.basis).toContain("0 of 4");
  });
});
