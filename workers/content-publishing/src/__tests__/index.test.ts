import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Kill-switch tests for the content-publishing worker.
 *
 * The worker's entire contract is the hard kill switch documented in its
 * header: INTERNAL_CALIBRATION_ONLY defaults ON, every publish request is
 * REFUSED with refusedByInternalCalibrationGates=true, and even with the gate
 * deliberately OFF the worker only ever QUEUEs for operator review — it can
 * NEVER auto-publish. These tests pin that contract so a regression (any path
 * to "PUBLISHED") fails CI.
 *
 * Gate subtlety: both gates are read at MODULE LOAD (top-level consts), not
 * per call — so each branch must stub the env, reset the module registry, and
 * re-import. Mutating process.env between calls would silently test only one
 * branch.
 */

type WorkerModule = typeof import("../index");

async function importWorkerWithEnv(env: Record<string, string>): Promise<WorkerModule> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("../index");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("runContentPublisher — INTERNAL_CALIBRATION_ONLY kill switch", () => {
  it("default-ON: with no env set, every request is REFUSED by the calibration gate", async () => {
    const { runContentPublisher } = await importWorkerWithEnv({});
    const results = await runContentPublisher([
      { id: "post-1", kind: "blog" },
      { id: "post-2", kind: "recap" },
    ]);

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.status).toBe("REFUSED");
      expect(result.refusedByInternalCalibrationGates).toBe(true);
      expect(result.note).toContain("INTERNAL_CALIBRATION_ONLY");
    }
    expect(results.map((r) => r.id)).toEqual(["post-1", "post-2"]);
  });

  it("any non-'false' value keeps the gate ON (e.g. 'true', '0', empty string)", async () => {
    for (const value of ["true", "0", ""]) {
      const { runContentPublisher } = await importWorkerWithEnv({
        INTERNAL_CALIBRATION_ONLY: value,
      });
      const [result] = await runContentPublisher([{ id: "post-1", kind: "blog" }]);
      expect(result?.status).toBe("REFUSED");
      expect(result?.refusedByInternalCalibrationGates).toBe(true);
    }
  });

  it("gate deliberately OFF: requests are QUEUED for operator review — still never published", async () => {
    const { runContentPublisher } = await importWorkerWithEnv({
      INTERNAL_CALIBRATION_ONLY: "false",
    });
    const [result] = await runContentPublisher([{ id: "post-9", kind: "blog" }]);

    expect(result?.status).toBe("QUEUED");
    expect(result?.refusedByInternalCalibrationGates).toBe(false);
    expect(result?.note).toContain("operator review");
    expect(result?.note).toContain("No automatic publish");
  });

  it("no path to PUBLISHED: across both gate states, status is only REFUSED or QUEUED and no publish timestamp exists", async () => {
    const gateStates: ReadonlyArray<Record<string, string>> = [
      {},
      { INTERNAL_CALIBRATION_ONLY: "false" },
    ];
    for (const gate of gateStates) {
      const { runContentPublisher } = await importWorkerWithEnv(gate);
      const results = await runContentPublisher([
        { id: "a", kind: "blog" },
        { id: "b", kind: "recap" },
        { id: "c", kind: "preview" },
      ]);
      for (const result of results) {
        expect(["REFUSED", "QUEUED"]).toContain(result.status);
        // The result shape must carry no published marker of any kind.
        expect(Object.keys(result).sort()).toEqual([
          "id",
          "note",
          "refusedByInternalCalibrationGates",
          "status",
        ]);
      }
    }
  });

  it("shape: empty input → empty output; one result per request, ids preserved in order", async () => {
    const { runContentPublisher } = await importWorkerWithEnv({});
    await expect(runContentPublisher([])).resolves.toEqual([]);

    const results = await runContentPublisher([
      { id: "x", kind: "blog" },
      { id: "y", kind: "blog" },
    ]);
    expect(results.map((r) => r.id)).toEqual(["x", "y"]);
  });
});
