import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import { evaluatePublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { inPlayExclusionNote } from "@/lib/calibration/in-play-exclusion";

/**
 * C-350 — L10's first enforcement: the in-play exclusion count is not allowed
 * to live only in the JSON payload. When `inPlayExcluded > 0`, the public
 * surfaces that publish a rate that the exclusion moved must render the count
 * AND the shared disclosure sentence (`inPlayNote`) beside that rate.
 *
 * Surfaces pinned here:
 *   - /clv ClvScoreboard (the beat-close rate)
 *   - CalibrationPanel (the /performance reliability sample)
 *
 * The API already carried the fields (api-clv-route.test.ts); this file is the
 * first check that a human reading the page can see them.
 */

const mocks = vi.hoisted(() => ({ calibration: vi.fn() }));
vi.mock("@/lib/calibration/report", () => ({
  loadPublicCalibrationReport: mocks.calibration,
}));

// /clv page module-level imports (db, Nav, Footer, …) are not under test.
// Stub them so importing ClvScoreboard stays a pure presentational render.
// prediction-engine is partially mocked: the page needs getReadinessGates,
// but wilson/clopper-pearson helpers re-export real math from it.
vi.mock("@sports/db", () => ({ db: {} }));
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    }),
  };
});
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/ui/risk-disclosure", () => ({
  RiskDisclosure: (): null => null,
}));
vi.mock("@/lib/performance/clv-coverage", () => ({
  loadClvCoverage: async () => null,
}));

import { CalibrationPanel } from "@/components/performance/calibration-panel";
import { ClvScoreboard } from "@/app/clv/page";

function picks(confidence: number, count: number): CalibrationPickInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${confidence}-${i}`,
    confidence,
    result: i % 2 === 0 ? "WIN" : "LOSS",
  }));
}

function calibrationPayload(excludedInPlay: number) {
  const computed = computeCalibration(picks(75, 35));
  const population = 35 + excludedInPlay;
  return {
    data: {
      ...computed,
      updatedAt: "2026-09-15T00:00:00.000Z",
      isCollecting: false,
      publicMessage: "Calibration is computed from settled canonical picks only.",
      modelVersions: ["v6.2.0"],
      excludedInPlay,
      inPlayNote: inPlayExclusionNote(excludedInPlay, population),
    },
    meta: { gated: false, isSampleData: false },
  };
}

/** A publishable CLV policy with the given in-play exclusion count. */
function clvPolicy(inPlayExcluded: number) {
  const graded = 40;
  const population = graded + inPlayExcluded;
  return evaluatePublicClvPolicy({
    canExposePerformanceStats: true,
    minGradedForPublic: 25,
    gradedSampleSize: graded,
    beatCloseCount: 24,
    lostToCloseCount: 12,
    matchedCloseCount: 4,
    inPlayExcluded,
    inPlayNote: inPlayExclusionNote(inPlayExcluded, population),
  });
}

describe("C-350 — in-play exclusion count renders on the surfaces it changes", () => {
  describe("/clv ClvScoreboard", () => {
    it("shows the excluded count and inPlayNote beside the beat-close rate when inPlayExcluded > 0", () => {
      const policy = clvPolicy(10);
      expect(policy.canExposeClv).toBe(true);

      render(<ClvScoreboard policy={policy} coverage={null} />);

      const note = screen.getByTestId("clv-in-play-exclusion");
      expect(note).toBeInTheDocument();
      // The COUNT is visible, not buried in a tooltip or only in the API.
      expect(note.textContent).toMatch(/10 in-play rows excluded/);
      // The shared sentence carries the denominator the rate was taken over.
      expect(note.textContent).toMatch(/Excluded 10 of 50 settled rows as in-play/);
      // It sits on the same scoreboard as the rate.
      expect(screen.getByTestId("clv-scoreboard").textContent).toContain("60%");
    });

    it("omits the note when nothing was excluded (no phantom 0-count noise)", () => {
      render(<ClvScoreboard policy={clvPolicy(0)} coverage={null} />);
      expect(screen.queryByTestId("clv-in-play-exclusion")).not.toBeInTheDocument();
    });
  });

  describe("CalibrationPanel (/performance)", () => {
    it("shows the excluded count and inPlayNote when excludedInPlay > 0", async () => {
      mocks.calibration.mockResolvedValue(calibrationPayload(7));

      render(await CalibrationPanel());

      const note = screen.getByTestId("calibration-in-play-exclusion");
      expect(note).toBeInTheDocument();
      expect(note.textContent).toMatch(/7 in-play rows excluded/);
      expect(note.textContent).toMatch(/Excluded 7 of 42 settled rows as in-play/);
    });

    it("omits the note when nothing was excluded", async () => {
      mocks.calibration.mockResolvedValue(calibrationPayload(0));

      render(await CalibrationPanel());

      expect(
        screen.queryByTestId("calibration-in-play-exclusion"),
      ).not.toBeInTheDocument();
    });
  });
});
