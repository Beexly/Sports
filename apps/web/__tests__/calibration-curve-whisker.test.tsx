import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { CalibrationCurve } from "@/components/home/calibration-curve";

// jsdom doesn't implement matchMedia; the component reads it in its
// visibility-on-scroll effect. Same stub pattern as P16-02-cold-open-perf.test.tsx.
const makeMatchMedia = (overrides: Record<string, boolean> = {}) => {
  return (query: string) => ({
    matches: !!overrides[query],
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", makeMatchMedia());
});

/**
 * The reliability curve's Clopper-Pearson whisker (Round 15 leverage audit):
 * compute.ts always computed the 95% CI per bucket, but the chart plotted
 * only the point estimate — a 30-sample bucket and a 500-sample bucket read
 * as equally solid. This guards the fix: a bucket with a real interval draws
 * a whisker, a bucket with none (no decided picks yet) draws none, and the
 * point marker still renders either way.
 */

describe("CalibrationCurve — Clopper-Pearson whisker", () => {
  it("draws a whisker line for a bucket with a real interval", () => {
    const { container } = render(
      <CalibrationCurve
        points={[
          {
            label: "70-79%",
            expectedWinRate: 0.75,
            observedWinRate: 0.6,
            sampleSize: 30,
            sufficientSample: true,
            clopperPearsonLow: 0.4,
            clopperPearsonHigh: 0.8,
          },
        ]}
        sampleSize={30}
      />
    );
    // 1 vertical whisker + 2 horizontal caps = 3 lines from this bucket,
    // plus the chart's own 3 fixed axis/diagonal lines = 6 total.
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(6);
  });

  it("draws no whisker when the bucket has no Clopper-Pearson interval", () => {
    const { container } = render(
      <CalibrationCurve
        points={[
          {
            label: "70-79%",
            expectedWinRate: 0.75,
            observedWinRate: 0.6,
            sampleSize: 30,
            sufficientSample: true,
            clopperPearsonLow: null,
            clopperPearsonHigh: null,
          },
        ]}
        sampleSize={30}
      />
    );
    // Only the chart's 3 fixed axis/diagonal lines — no whisker lines added.
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(3);
    // The point marker itself must still render regardless of the interval.
    expect(container.querySelectorAll("circle").length).toBe(1);
  });

  it("scales the whisker's two-tier bucket set correctly (2 bands = 6 whisker lines + 3 fixed)", () => {
    const { container } = render(
      <CalibrationCurve
        points={[
          {
            label: "60-69%",
            expectedWinRate: 0.65,
            observedWinRate: 0.55,
            sampleSize: 30,
            sufficientSample: true,
            clopperPearsonLow: 0.35,
            clopperPearsonHigh: 0.75,
          },
          {
            label: "70-79%",
            expectedWinRate: 0.75,
            observedWinRate: 0.6,
            sampleSize: 500,
            sufficientSample: true,
            clopperPearsonLow: 0.55,
            clopperPearsonHigh: 0.65,
          },
        ]}
        sampleSize={530}
      />
    );
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(9); // 3 fixed + (3 whisker lines * 2 buckets)
  });
});
