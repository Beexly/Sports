/**
 * Regression: durable calibration writes must NOT fail silently.
 *
 * Before this test's fix, persistCalibrationMetrics / persistEligibilitySnap /
 * persistPublishReceipt each had a bare `catch { return "error" }` — no log, no
 * metric — and every call site discarded the return. A DB outage therefore left
 * the FOUNDING -> PROVEN proof gate frozen at status "collecting" forever with
 * a 200 from the cron and nothing at all in the logs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findFirstMock = vi.fn();

vi.mock("@sports/db", () => ({
  isStubMode: () => false,
  db: {
    jarvisMemoryEvent: {
      create: (...args: unknown[]) => createMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

import {
  loadLatestCalibrationMetrics,
  loadLatestEligibilitySnap,
  loadPublishReceipt,
  persistCalibrationMetrics,
  persistEligibilitySnap,
  persistPublishReceipt,
  type DurableMetricsPayload,
  type EligibilityDurableSnap,
  type PublishReceipt,
} from "@/lib/ops/calibration-eligibility-durable";

const BOOM = new Error("P1001: Can't reach database server");

const METRICS: DurableMetricsPayload = {
  generatedAt: "2026-08-25T00:00:00.000Z",
  gitSha: null,
  n: 118,
  status: "ok",
  modelVersion: "v5.0.0",
  dateRange: "2026-01-01..2026-08-25",
  overall: {
    brier: 0.21,
    ece: 0.03,
    mce: 0.08,
    murphy: { reliability: 0.01, resolution: 0.02, uncertainty: 0.22 },
  },
};

const SNAP: EligibilityDurableSnap = {
  evaluatedAt: "2026-08-25T00:00:00.000Z",
  metricsGeneratedAt: METRICS.generatedAt,
  report: {
    status: "GREEN",
    consecutiveGreen: 2,
    streakRequired: 3,
    runMeetsFloors: true,
    reasons: [],
    operatorHint: "streak advancing",
  } as EligibilityDurableSnap["report"],
};

const RECEIPT: PublishReceipt = {
  published: true,
  at: "2026-08-25T00:00:00.000Z",
  source: "auto",
  note: "Auto-publish",
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  createMock.mockReset();
  findFirstMock.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("durable calibration persist failures are audible", () => {
  it("persistCalibrationMetrics logs at error when the create rejects", async () => {
    createMock.mockRejectedValue(BOOM);

    const result = await persistCalibrationMetrics(METRICS);

    expect(result).toBe("error");
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toMatch(/persistCalibrationMetrics FAILED/);
    // The caught error itself must reach the log, not just a generic string.
    expect(logged).toMatch(/Can't reach database server/);
  });

  it("persistEligibilitySnap logs at error when the create rejects", async () => {
    createMock.mockRejectedValue(BOOM);

    const result = await persistEligibilitySnap(SNAP);

    expect(result).toBe("error");
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toMatch(/persistEligibilitySnap FAILED/);
    expect(logged).toMatch(/Can't reach database server/);
  });

  it("persistPublishReceipt logs at error when the create rejects", async () => {
    createMock.mockRejectedValue(BOOM);

    const result = await persistPublishReceipt(RECEIPT);

    expect(result).toBe("error");
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toMatch(/persistPublishReceipt FAILED/);
    expect(logged).toMatch(/Can't reach database server/);
  });

  it("a successful create logs nothing", async () => {
    createMock.mockResolvedValue({ id: "evt_1" });

    await expect(persistCalibrationMetrics(METRICS)).resolves.toBe("ok");
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("durable calibration read failures are distinguishable from absence", () => {
  it("loadLatestCalibrationMetrics logs when the query throws, silent when simply empty", async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(loadLatestCalibrationMetrics()).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();

    findFirstMock.mockRejectedValue(BOOM);
    await expect(loadLatestCalibrationMetrics()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(
      /loadLatestCalibrationMetrics FAILED/,
    );
  });

  it("loadLatestEligibilitySnap logs when the query throws", async () => {
    findFirstMock.mockRejectedValue(BOOM);
    await expect(loadLatestEligibilitySnap()).resolves.toBeNull();
    expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(
      /loadLatestEligibilitySnap FAILED/,
    );
  });

  it("loadPublishReceipt logs when the query throws", async () => {
    findFirstMock.mockRejectedValue(BOOM);
    await expect(loadPublishReceipt()).resolves.toBeNull();
    expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(
      /loadPublishReceipt FAILED/,
    );
  });
});

describe("the cron's 200 body carries the durable-write outcome", () => {
  it("calibration-metrics route captures persist into its response payload", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(__dirname, "../app/api/cron/calibration-metrics/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/const persist = await persistCalibrationMetrics\(payload\)/);
    // The result must reach the JSON body, not just a local variable.
    expect(src).toMatch(/^\s*persist,\s*$/m);
  });
});
