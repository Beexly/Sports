import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    signalLedgerEntry: {
      create: mocks.create,
      findMany: mocks.findMany,
      groupBy: mocks.groupBy,
    },
  },
  Prisma: {},
}));

import {
  SIGNAL_LEDGER_EVENT_TYPES,
  getCalibrationReport,
  listModelVersions,
} from "@/lib/signal-ledger";

describe("Signal Ledger constants", () => {
  it("exports the expected event types", () => {
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("published");
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("settled_win");
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("settled_loss");
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("settled_push");
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("settled_void");
    expect(SIGNAL_LEDGER_EVENT_TYPES).toContain("model_version_tagged");
  });
});

describe("getCalibrationReport", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.groupBy.mockReset();
  });

  it("returns gateCleared=false when fewer than 30 settled picks", async () => {
    // 12 settled entries
    mocks.findMany.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({
        confidenceAt: 75,
        resultBinary: i % 2 === 0,
      }))
    );

    const report = await getCalibrationReport("v5.0.0");
    expect(report.modelVersion).toBe("v5.0.0");
    expect(report.totalSettled).toBe(12);
    expect(report.gateCleared).toBe(false);
  });

  it("returns gateCleared=true when exactly 30 settled picks exist", async () => {
    mocks.findMany.mockResolvedValueOnce(
      Array.from({ length: 30 }, (_, i) => ({
        confidenceAt: 82,
        resultBinary: i % 2 === 0,
      }))
    );

    const report = await getCalibrationReport("v5.0.0");
    expect(report.gateCleared).toBe(true);
    expect(report.totalSettled).toBe(30);
  });

  it("assigns picks to correct confidence bands", async () => {
    const entries = [
      { confidenceAt: 90, resultBinary: true },
      { confidenceAt: 85, resultBinary: false },
      { confidenceAt: 70, resultBinary: true },
      { confidenceAt: 55, resultBinary: false },
      { confidenceAt: 45, resultBinary: true },
    ];
    mocks.findMany.mockResolvedValueOnce(entries);

    const report = await getCalibrationReport("v5.0.0");
    const highBand = report.bands.find((b) => b.band === "high");
    const strongBand = report.bands.find((b) => b.band === "strong");
    const moderateBand = report.bands.find((b) => b.band === "moderate");
    const exploratoryBand = report.bands.find((b) => b.band === "exploratory");

    expect(highBand?.settledCount).toBe(2);
    expect(strongBand?.settledCount).toBe(1);
    expect(moderateBand?.settledCount).toBe(1);
    expect(exploratoryBand?.settledCount).toBe(1);
  });

  it("sets winRate to null when band has fewer than 30 settled picks", async () => {
    mocks.findMany.mockResolvedValueOnce([
      { confidenceAt: 85, resultBinary: true },
      { confidenceAt: 82, resultBinary: false },
    ]);

    const report = await getCalibrationReport("v5.0.0");
    const strongBand = report.bands.find((b) => b.band === "strong");
    expect(strongBand?.winRate).toBeNull();
  });

  it("includes computedAt timestamp", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    const report = await getCalibrationReport("v5.0.0");
    expect(report.computedAt).toBeInstanceOf(Date);
  });
});

describe("listModelVersions", () => {
  it("returns model versions from groupBy result", async () => {
    mocks.groupBy.mockResolvedValueOnce([
      { modelVersion: "v5.0.0" },
      { modelVersion: "v4.0.0" },
    ]);

    const versions = await listModelVersions();
    expect(versions).toEqual(["v5.0.0", "v4.0.0"]);
  });

  it("returns empty array when no ledger entries", async () => {
    mocks.groupBy.mockResolvedValueOnce([]);
    const versions = await listModelVersions();
    expect(versions).toEqual([]);
  });
});
