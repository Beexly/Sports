import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";

/**
 * Closing-line value (CLV) on the PUBLIC calibration panel.
 *
 * DECISIONS 2026-06-01 follow-up: wire CLV into the public calibration panel
 * once lock-time closing-line capture lands. Invariants under test:
 *
 *   1. RENDER GATE: the beat-the-close rate renders ONLY when the graded
 *      sample clears MIN_PUBLIC_CLV_SAMPLE; below the floor the panel shows
 *      the collecting treatment with no percentage anywhere (no fake numbers).
 *   2. LOADER: loadPublicCalibrationReport feeds the aggregate from REAL
 *      settled picks — published, non-bootstrap, graded against a captured
 *      closing line — and skips the DB entirely while the readiness gate is
 *      closed.
 *   3. WIRING: CalibrationPanel renders the stat from report data, never from
 *      a hardcoded value.
 */

const mocks = vi.hoisted(() => ({
  pickFindMany:
    vi.fn<
      (args: {
        where?: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => Promise<unknown[]>
    >(),
  canExposePerformanceStats: { value: false },
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.pickFindMany } },
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: mocks.canExposePerformanceStats.value,
      minSettledPicksForLearning: 25,
    }),
  };
});

import {
  aggregatePublicClv,
  MIN_PUBLIC_CLV_SAMPLE,
  type PublicClvRow,
} from "@sports/prediction-engine";
import { ClvProofStat } from "@/components/performance/calibration-panel";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

afterEach(() => {
  mocks.pickFindMany.mockReset();
  mocks.canExposePerformanceStats.value = false;
});

const gradedRow = (
  clvVerdict: string,
  clvValue: number,
  clvKind: string
): PublicClvRow => ({ clvVerdict, clvValue, clvKind });

/** 25 graded rows: 15 beat / 8 lost / 2 matched → 60% beat rate. */
function sufficientRows(): PublicClvRow[] {
  return [
    ...Array.from({ length: 15 }, () => gradedRow("BEAT_CLOSE", 0.5, "POINTS")),
    ...Array.from({ length: 8 }, () => gradedRow("LOST_TO_CLOSE", -1, "POINTS")),
    ...Array.from({ length: 2 }, () => gradedRow("MATCHED_CLOSE", 0, "POINTS")),
  ];
}

describe("ClvProofStat — render gate", () => {
  it("renders the beat-the-close rate with a sufficient graded sample", () => {
    render(<ClvProofStat clv={aggregatePublicClv(sufficientRows())} />);
    expect(screen.getByTestId("clv-proof")).toBeInTheDocument();
    expect(screen.getByTestId("clv-beat-close-rate").textContent).toBe("60.0%");
    // Sample size is disclosed next to the rate.
    expect(screen.getByTestId("clv-proof").textContent).toContain("25 graded picks");
    expect(screen.queryByTestId("clv-proof-collecting")).not.toBeInTheDocument();
  });

  it("falls back to the collecting treatment below the sample floor — no percentages", () => {
    const belowFloor = Array.from({ length: MIN_PUBLIC_CLV_SAMPLE - 1 }, () =>
      gradedRow("BEAT_CLOSE", 1, "POINTS")
    );
    const { container } = render(
      <ClvProofStat clv={aggregatePublicClv(belowFloor)} />
    );
    expect(screen.getByTestId("clv-proof-collecting")).toBeInTheDocument();
    expect(screen.queryByTestId("clv-proof")).not.toBeInTheDocument();
    // No rate may leak while collecting — a fabricated-looking "100%" from a
    // tiny sample is exactly what the floor exists to prevent.
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?%/);
  });

  it("falls back when nothing is graded at all", () => {
    const { container } = render(<ClvProofStat clv={aggregatePublicClv([])} />);
    expect(screen.getByTestId("clv-proof-collecting")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?%/);
  });
});

describe("loadPublicCalibrationReport — CLV aggregation from real rows", () => {
  it("returns an empty floor-failing aggregate and never touches the DB while gated", async () => {
    mocks.canExposePerformanceStats.value = false;
    const report = await loadPublicCalibrationReport();
    expect(report.meta.gated).toBe(true);
    expect(report.data.clv.gradedSampleSize).toBe(0);
    expect(report.data.clv.beatCloseRate).toBeNull();
    expect(report.data.clv.meetsPublicSampleFloor).toBe(false);
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });

  it("aggregates graded CLV from published, non-bootstrap settled picks when the gate is open", async () => {
    mocks.canExposePerformanceStats.value = true;
    mocks.pickFindMany.mockImplementation(async (args) =>
      // The CLV query selects only the clv* columns; the calibration query
      // includes the game relation. Dispatch on shape.
      args.select?.clvVerdict ? sufficientRows() : []
    );

    const report = await loadPublicCalibrationReport();
    expect(report.data.clv.gradedSampleSize).toBe(25);
    expect(report.data.clv.beatCloseRate).toBeCloseTo(0.6, 5);
    expect(report.data.clv.meetsPublicSampleFloor).toBe(true);

    const clvCall = mocks.pickFindMany.mock.calls.find(
      ([args]) => args.select?.clvVerdict
    );
    expect(clvCall).toBeDefined();
    const where = clvCall![0].where as Record<string, unknown>;
    // Public surface: bootstrap picks and ungraded closes must never enter.
    expect(where.isBootstrap).toBe(false);
    expect(where.isPublished).toBe(true);
    expect(where.clvVerdict).toEqual({ not: null });
    expect(where.result).toEqual({ in: ["WIN", "LOSS", "PUSH"] });
    // Per-pick premium fields are not selected — aggregate only.
    const select = clvCall![0].select as Record<string, boolean>;
    expect(Object.keys(select).sort()).toEqual([
      "clvKind",
      "clvValue",
      "clvVerdict",
    ]);
  });
});

describe("CalibrationPanel — wiring (source-level)", () => {
  const panelSrc = readFileSync(
    resolve(
      __dirname,
      "..",
      "components",
      "performance",
      "calibration-panel.tsx"
    ),
    "utf8"
  );

  it("renders ClvProofStat from report data, not a literal", () => {
    expect(panelSrc).toMatch(/<ClvProofStat\s+clv=\{data\.clv\}\s*\/>/);
  });

  it("gates on meetsPublicSampleFloor inside ClvProofStat", () => {
    expect(panelSrc).toMatch(/meetsPublicSampleFloor/);
  });

  it("formats the rate with the shared pct helper and tabular-nums", () => {
    expect(panelSrc).toMatch(/pct\(clv\.beatCloseRate \* 100\)/);
    expect(panelSrc).toMatch(/TABULAR/);
  });
});
