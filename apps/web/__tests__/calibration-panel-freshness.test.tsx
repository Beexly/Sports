import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

/**
 * PL7 — the /performance "Calibration Report" page computes
 * `data.updatedAt` on every payload (report.ts, including the isCollecting
 * and gated branches) but never rendered it. CLAUDE.md non-negotiable 5 is
 * "No stale data — always validate timestamps and freshness"; this pins the
 * fix so a future edit can't drop the freshness stamp again.
 */

const mocks = vi.hoisted(() => ({ calibration: vi.fn() }));
vi.mock("@/lib/calibration/report", () => ({
  loadPublicCalibrationReport: mocks.calibration,
}));

import { CalibrationPanel } from "@/components/performance/calibration-panel";

function picks(confidence: number, count: number): CalibrationPickInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${confidence}-${i}`,
    confidence,
    result: i % 2 === 0 ? "WIN" : "LOSS",
  }));
}

function reportPayload(updatedAt: string, opts: { collecting?: boolean } = {}) {
  const computed = opts.collecting ? computeCalibration([]) : computeCalibration(picks(75, 35));
  return {
    data: {
      ...computed,
      updatedAt,
      isCollecting: opts.collecting ?? false,
      publicMessage: opts.collecting
        ? "Building calibration history from settled canonical picks."
        : "Calibration is computed from settled canonical picks only.",
      modelVersions: opts.collecting ? [] : ["v6.2.0"],
    },
    meta: { gated: false, isSampleData: false },
  };
}

describe("CalibrationPanel — freshness stamp (PL7)", () => {
  it("renders a formatted representation of data.updatedAt", async () => {
    // Fixed far-past timestamp so formatRelative's output is stable regardless
    // of when the test runs ("X years ago" stays true for years).
    mocks.calibration.mockResolvedValue(reportPayload("2020-01-01T00:00:00.000Z"));
    render(await CalibrationPanel());
    const stamp = screen.getByTestId("calibration-updated-at");
    expect(stamp.textContent).toMatch(/Updated/);
    expect(stamp.textContent).toMatch(/ago/);
  });

  it("renders the stamp in the gated/isCollecting state too, not only once published", async () => {
    mocks.calibration.mockResolvedValue(reportPayload("2020-01-01T00:00:00.000Z", { collecting: true }));
    render(await CalibrationPanel());
    const stamp = screen.getByTestId("calibration-updated-at");
    expect(stamp.textContent).toMatch(/Updated/);
    expect(stamp.textContent).toMatch(/ago/);
  });

  it("reflects a DIFFERENT updatedAt with a different rendered string (not a static/build-time stamp)", async () => {
    mocks.calibration.mockResolvedValue(reportPayload("2020-01-01T00:00:00.000Z"));
    render(await CalibrationPanel());
    const old = screen.getByTestId("calibration-updated-at").textContent;

    mocks.calibration.mockResolvedValue(reportPayload(new Date(Date.now() - 60_000).toISOString()));
    render(await CalibrationPanel());
    const recentStamps = screen.getAllByTestId("calibration-updated-at");
    const recent = recentStamps[recentStamps.length - 1]!.textContent;

    expect(recent).not.toBe(old);
    expect(recent).toMatch(/minute/);
  });
});
