import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("runContentPublisher — INTERNAL_CALIBRATION_ONLY=true (default)", () => {
  beforeEach(() => {
    delete process.env["INTERNAL_CALIBRATION_ONLY"];
    vi.resetModules();
  });

  it("refuses all requests with calibration gate on", async () => {
    const { runContentPublisher } = await import("./index.js");
    const results = await runContentPublisher([
      { id: "a1", kind: "PICK_RECAP" },
      { id: "a2", kind: "TREND_ANALYSIS" },
    ]);
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.status).toBe("REFUSED");
      expect(r.refusedByInternalCalibrationGates).toBe(true);
    }
  });

  it("result ids match request ids", async () => {
    const { runContentPublisher } = await import("./index.js");
    const results = await runContentPublisher([{ id: "id-99", kind: "BLOG" }]);
    expect(results[0]!.id).toBe("id-99");
  });

  it("handles empty request array", async () => {
    const { runContentPublisher } = await import("./index.js");
    const results = await runContentPublisher([]);
    expect(results).toHaveLength(0);
  });
});

describe("runContentPublisher — INTERNAL_CALIBRATION_ONLY=false", () => {
  beforeEach(() => {
    process.env["INTERNAL_CALIBRATION_ONLY"] = "false";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env["INTERNAL_CALIBRATION_ONLY"];
  });

  it("queues requests when calibration gate is off", async () => {
    const { runContentPublisher } = await import("./index.js");
    const results = await runContentPublisher([{ id: "b1", kind: "PICK_RECAP" }]);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("QUEUED");
    expect(results[0]!.refusedByInternalCalibrationGates).toBe(false);
  });

  it("never auto-publishes — note confirms operator review required", async () => {
    const { runContentPublisher } = await import("./index.js");
    const results = await runContentPublisher([{ id: "b2", kind: "TREND" }]);
    expect(results[0]!.note).toMatch(/operator review/i);
  });
});
