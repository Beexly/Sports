import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GateReadingView, MAX_SNAP_AGE_MS, performanceStatsEnabled, snapIsStale, type GateReadingModel } from "@/components/calibration/gate-reading";
import type { EligibilityDurableSnap } from "@/lib/ops/calibration-eligibility-durable";

/**
 * /calibration gate reading: the numbers the receipt is built on, gated.
 *   - Numbers render only when a receipt exists AND PERFORMANCE_STATS_ENABLED
 *     is on; otherwise status and streak only, no figures.
 *   - The bias-corrected ECE is shown with the raw value beside it.
 *   - The deployed-version row reads the 5th-percentile bound.
 */

const snap: EligibilityDurableSnap = {
  evaluatedAt: "2026-09-09T16:40:00.000Z",
  metricsGeneratedAt: "2026-09-09T16:38:19.081Z",
  pBasis: "market_anchored_v4",
  report: {
    status: "GREEN",
    runMeetsFloors: true,
    reasons: [],
    n: 380,
    brier: 0.2099,
    ece: 0.0589,
    eceNoise: 0.0215,
    eceDebiased: 0.037403,
    mce: 0.12,
    murphy: { reliability: 0.0041, resolution: 0.03, uncertainty: 0.2379 },
    floors: { n: 100, brier: 0.22, ece: 0.05, murphyReliability: 0.05 },
    consecutiveGreen: 5,
    streakRequired: 3,
    deployedVersion: { key: "v5.2.7", n: 258, ece: 0.0911, eceNoise: 0.05197, eceDebiased: 0.058158, eceDebiasedCi90Lo: 0.043762 },
    deployedVersionChecked: true,
    modelVersion: "v5.2.7",
    dateRange: null,
    generatedAt: "2026-09-09T16:38:19.081Z",
    operatorHint: "",
  },
};

const receipt: GateReadingModel["receipt"] = { published: true, at: "2026-09-09T16:40:00.000Z", source: "auto", note: "" };

describe("calibration gate reading", () => {
  it("renders the figures with floors when the receipt exists and stats are enabled", () => {
    const { getByTestId, getAllByTestId, container } = render(
      <GateReadingView model={{ snap, receipt, pBasis: "market_anchored_v4", numbersPublished: true, stale: false }} />,
    );
    expect(getByTestId("gate-reading-status").textContent).toBe("GREEN");
    const text = container.textContent ?? "";
    expect(text).toContain("streak 5 of 3 required");
    expect(text).toContain("0.037 (raw 0.059)");
    expect(text).toContain("380");
    expect(text).toContain("0.044 (point 0.058)");
    expect(getAllByTestId("gate-reading-value").length).toBe(5);
    expect(text).not.toMatch(/win rate|ROI|units/i);
  });

  it("withholds every figure until the receipt lands and the founder opens the record", () => {
    const { getByTestId, queryAllByTestId, container } = render(
      <GateReadingView model={{ snap, receipt: null, pBasis: "market_anchored_v4", numbersPublished: false, stale: false }} />,
    );
    expect(getByTestId("gate-reading-withheld")).toBeInTheDocument();
    expect(queryAllByTestId("gate-reading-value").length).toBe(0);
    expect(container.textContent).not.toContain("380");
  });

  it("labels the deployed-version row as a point estimate when the artifact carries no bound", () => {
    const noBound: EligibilityDurableSnap = {
      ...snap,
      report: { ...snap.report, deployedVersion: { key: "v5.2.7", n: 258, ece: 0.0911, eceDebiased: 0.058158, eceDebiasedCi90Lo: null } },
    };
    const { container } = render(
      <GateReadingView model={{ snap: noBound, receipt, pBasis: "market_anchored_v4", numbersPublished: true, stale: false }} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("point estimate, no bound on this artifact");
    expect(text).not.toContain("5th-percentile bound");
    expect(text).toContain("0.058");
    expect(text).toContain("fail");
  });

  it("marks a snap older than the schedule allows as STALE and withholds figures", () => {
    const old: EligibilityDurableSnap = { ...snap, evaluatedAt: "2026-09-01T00:00:00.000Z" };
    expect(snapIsStale(old, Date.parse("2026-09-09T00:00:00.000Z"))).toBe(true);
    expect(snapIsStale(snap, Date.parse(snap.evaluatedAt) + MAX_SNAP_AGE_MS - 1)).toBe(false);
    expect(snapIsStale({ ...snap, evaluatedAt: "not a date" })).toBe(true);
    const { getByTestId, queryAllByTestId } = render(
      <GateReadingView model={{ snap: old, receipt, pBasis: "market_anchored_v4", numbersPublished: false, stale: true }} />,
    );
    expect(getByTestId("gate-reading-stale").textContent).toContain("2026-09-01T00:00:00.000Z");
    expect(getByTestId("gate-reading-withheld").textContent).toMatch(/older than the measurement schedule/);
    expect(queryAllByTestId("gate-reading-value").length).toBe(0);
  });

  it("a RED evaluation closes the figures even while the last receipt still says published", async () => {
    const red: EligibilityDurableSnap = { ...snap, evaluatedAt: new Date().toISOString(), report: { ...snap.report, status: "RED", reasons: ["ECE 0.061 > 0.05"] } };
    const mod = await import("@/components/calibration/gate-reading");
    const { queryAllByTestId, getByTestId } = render(
      <mod.GateReadingView model={{ snap: red, receipt, pBasis: "market_anchored_v4", numbersPublished: false, stale: false }} />,
    );
    expect(getByTestId("gate-reading-status").textContent).toBe("RED");
    expect(queryAllByTestId("gate-reading-value").length).toBe(0);
  });

  it("reads PERFORMANCE_STATS_ENABLED literally", () => {
    expect(performanceStatsEnabled({ PERFORMANCE_STATS_ENABLED: "true" })).toBe(true);
    expect(performanceStatsEnabled({ PERFORMANCE_STATS_ENABLED: "1" })).toBe(false);
    expect(performanceStatsEnabled({})).toBe(false);
  });
});
