import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ECE_MARKET_ECHO_CAVEAT, brierSkillScoreVsBaseRate } from "@/lib/fable/ece-caveat";

const mocks = vi.hoisted(() => ({
  calibration: vi.fn(),
  durable: vi.fn(),
}));

vi.mock("@/lib/calibration/report", () => ({
  loadPublicCalibrationReport: mocks.calibration,
}));

vi.mock("@/lib/ops/calibration-eligibility-durable", () => ({
  loadLatestCalibrationMetrics: mocks.durable,
}));

import { ProofDashboard } from "@/app/fable/proof-dashboard";

const CAVEAT =
  "This ECE largely measures the market's calibration through our confidence echo. It is not evidence of independent skill.";

function gatedReport() {
  return {
    data: {
      buckets: [],
      proposals: [],
      sampleSize: 0,
      brierScore: null,
      discrimination: {
        trend: "insufficient-data" as const,
        populatedBucketCount: 0,
        lowestBucketLabel: null,
        highestBucketLabel: null,
        lowestBucketWinRate: null,
        highestBucketWinRate: null,
        spread: null,
        monotonic: false,
        note: "collecting",
      },
      note: "collecting",
      updatedAt: "2026-08-20T00:00:00.000Z",
      isCollecting: true,
      publicMessage: "Building calibration history from settled canonical picks.",
    },
    meta: { gated: true, isSampleData: false },
  };
}

function publishedReport() {
  return {
    data: {
      buckets: [
        {
          label: "50-59",
          confidenceMin: 50,
          confidenceMax: 59,
          sampleSize: 40,
          observedWinRate: 0.52,
          expectedWinRate: 0.55,
          delta: -0.03,
          brierScore: 0.25,
          sufficientSample: true,
        },
      ],
      proposals: [],
      sampleSize: 40,
      brierScore: 0.2556,
      discrimination: {
        trend: "flat" as const,
        populatedBucketCount: 1,
        lowestBucketLabel: "50-59",
        highestBucketLabel: "50-59",
        lowestBucketWinRate: 0.52,
        highestBucketWinRate: 0.52,
        spread: 0,
        monotonic: true,
        note: "flat",
      },
      note: "ok",
      updatedAt: "2026-08-20T00:00:00.000Z",
      isCollecting: false,
      publicMessage: "Calibration is computed from settled canonical picks only.",
    },
    meta: { gated: false, isSampleData: false },
  };
}

function durableOk(ece: number) {
  return {
    generatedAt: "2026-08-20T00:00:00.000Z",
    gitSha: null,
    n: 40,
    status: "ok" as const,
    modelVersion: "v-test",
    dateRange: "2026-04-01…2026-08-01",
    overall: {
      brier: 0.2556,
      ece,
      mce: 0.04,
      murphy: {
        reliability: 0.0041,
        resolution: 0.0017,
        uncertainty: 0.2499,
      },
    },
  };
}

describe("ECE caveat constant", () => {
  it("is the charter-verbatim sentence", () => {
    expect(ECE_MARKET_ECHO_CAVEAT).toBe(CAVEAT);
  });

  it("BSS is 1 − Brier / UNC and withholds a zero UNC", () => {
    expect(brierSkillScoreVsBaseRate(0.2556, 0.2499)).toBeCloseTo(1 - 0.2556 / 0.2499, 10);
    expect(brierSkillScoreVsBaseRate(0.2, 0)).toBeNull();
  });
});

describe("Proof Dashboard", () => {
  it("renders the section and the ECE caveat", async () => {
    mocks.calibration.mockResolvedValue(gatedReport());
    mocks.durable.mockResolvedValue(null);
    render(await ProofDashboard());
    expect(screen.getByTestId("fable-proof-dashboard")).toBeTruthy();
    expect(screen.getByTestId("fable-proof-ece-caveat")).toHaveTextContent(CAVEAT);
  });

  it("stays honestly empty when the readiness gate is dark", async () => {
    mocks.calibration.mockResolvedValue(gatedReport());
    mocks.durable.mockResolvedValue(durableOk(0.0699));
    render(await ProofDashboard());
    expect(screen.getByTestId("fable-proof-empty")).toBeTruthy();
    expect(screen.getByTestId("fable-proof-ece")).toHaveTextContent("—");
    expect(screen.queryByTestId("fable-proof-curve")).toBeNull();
    expect(screen.getByRole("link", { name: /Calibration/i })).toHaveAttribute("href", "/calibration");
    expect(screen.getByRole("link", { name: /Kill Ledger/i })).toHaveAttribute("href", "/kill-ledger");
    expect(screen.getByRole("link", { name: /BookGrade/i })).toHaveAttribute("href", "/bookgrade");
  });

  it("renders the live durable ECE, never a hardcoded literal", async () => {
    mocks.calibration.mockResolvedValue(publishedReport());
    mocks.durable.mockResolvedValue(durableOk(0.0699));
    render(await ProofDashboard());
    expect(screen.getByTestId("fable-proof-ece")).toHaveTextContent("0.0699");
    expect(screen.getByTestId("fable-proof-rel")).toHaveTextContent("0.004");
    expect(screen.getByTestId("fable-proof-res")).toHaveTextContent("0.002");
    expect(screen.getByTestId("fable-proof-unc")).toHaveTextContent("0.250");
    expect(screen.getByTestId("fable-proof-curve")).toBeTruthy();
    expect(screen.getByTestId("fable-proof-ece-caveat")).toHaveTextContent(CAVEAT);
  });
});

describe("H-F1 source contract", () => {
  it("does not hardcode the historic ECE literal in dashboard sources", () => {
    const files = [
      "app/fable/proof-dashboard.tsx",
      "lib/fable/ece-caveat.ts",
      "app/fable/page.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(__dirname, "..", file), "utf8");
      expect(src).not.toMatch(/0\.0044/);
    }
  });

  it("wires the dashboard through the existing public calibration loader", () => {
    const src = readFileSync(resolve(__dirname, "..", "app/fable/proof-dashboard.tsx"), "utf8");
    expect(src).toMatch(/loadPublicCalibrationReport/);
    expect(src).toMatch(/loadLatestCalibrationMetrics/);
    expect(src).toMatch(/ECE_MARKET_ECHO_CAVEAT/);
  });
});
