import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guard for the content-publishing kill switch.
 *
 * INTERNAL_CALIBRATION_ONLY defaults to true (safe) and must REFUSE every
 * publish request until an operator explicitly sets it to "false". These
 * tests are the last line of defense against accidental auto-publication.
 */

// Dynamic import used so vi.stubEnv takes effect before module constant reads.
async function importPublisher() {
  const mod = await import(
    "../../../workers/content-publishing/src/index.js"
  );
  return mod.runContentPublisher;
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("content-publisher kill switch — INTERNAL_CALIBRATION_ONLY", () => {
  it("REFUSES all requests when gate is on (default)", async () => {
    // Default: env var absent → gate is ON
    const runContentPublisher = await importPublisher();
    const results = await runContentPublisher([
      { id: "post-1", kind: "BLOG" },
      { id: "post-2", kind: "BLOG" },
    ]);

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.status).toBe("REFUSED");
      expect(r.refusedByInternalCalibrationGates).toBe(true);
    }
  });

  it("REFUSES all requests when INTERNAL_CALIBRATION_ONLY=true", async () => {
    vi.stubEnv("INTERNAL_CALIBRATION_ONLY", "true");
    const runContentPublisher = await importPublisher();
    const results = await runContentPublisher([{ id: "post-3", kind: "RECAP" }]);

    expect(results[0]!.status).toBe("REFUSED");
    expect(results[0]!.refusedByInternalCalibrationGates).toBe(true);
  });

  it("QUEUES (never auto-publishes) when gate is explicitly off", async () => {
    vi.stubEnv("INTERNAL_CALIBRATION_ONLY", "false");
    const runContentPublisher = await importPublisher();
    const results = await runContentPublisher([{ id: "post-4", kind: "BLOG" }]);

    expect(results[0]!.status).toBe("QUEUED");
    expect(results[0]!.refusedByInternalCalibrationGates).toBe(false);
    // Gate OFF still must not auto-publish — note field confirms operator review required
    expect(results[0]!.note).toMatch(/operator review/i);
  });

  it("handles an empty request list without error", async () => {
    const runContentPublisher = await importPublisher();
    const results = await runContentPublisher([]);
    expect(results).toHaveLength(0);
  });

  it("preserves request id in every result", async () => {
    const runContentPublisher = await importPublisher();
    const results = await runContentPublisher([
      { id: "abc-123", kind: "BLOG" },
    ]);
    expect(results[0]!.id).toBe("abc-123");
  });
});
