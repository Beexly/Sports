import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  buildCalibrationCommitment,
  verifyCalibrationCommitment,
  toCommitmentEnvelope,
  type CalibrationCommitmentInput,
} from "../calibration-commitment.js";

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const base: CalibrationCommitmentInput = {
  modelVersion: "v5.1.0",
  method: "platt",
  paramsCanonical: "platt:a=0.507368|b=-0.088726",
  claimedEce: 0.042,
  sampleSize: 800,
  committedAt: "2026-07-02T10:00:00.000Z",
  anytimeLowerBound: 0.013,
  ledgerRoot: "abc123",
};

describe("buildCalibrationCommitment / verify", () => {
  it("round-trips and verifies", () => {
    const c = buildCalibrationCommitment(base, sha256)!;
    expect(c).not.toBeNull();
    expect(c.commitmentId).toBe("calib:v5.1.0:2026-07-02T10:00:00.000Z");
    expect(c.contentHash).toHaveLength(64); // sha256 hex
    expect(verifyCalibrationCommitment(c, sha256)).toBe(true);
  });

  it("is deterministic (same input → same hash)", () => {
    const a = buildCalibrationCommitment(base, sha256)!;
    const b = buildCalibrationCommitment(base, sha256)!;
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("fails verification when the claimed ECE is altered", () => {
    const c = buildCalibrationCommitment(base, sha256)!;
    const tampered = { ...c, fields: { ...c.fields, claimedEce: 0.001 } };
    expect(verifyCalibrationCommitment(tampered, sha256)).toBe(false);
  });

  it("fails verification when the calibration MAP params are swapped", () => {
    // The whole point: you cannot quietly show a different calibration map.
    const c = buildCalibrationCommitment(base, sha256)!;
    const swapped = {
      ...c,
      fields: { ...c.fields, paramsCanonical: "platt:a=0.9|b=0.0" },
    };
    expect(verifyCalibrationCommitment(swapped, sha256)).toBe(false);
  });

  it("changes the hash when the model version changes", () => {
    const a = buildCalibrationCommitment(base, sha256)!;
    const b = buildCalibrationCommitment({ ...base, modelVersion: "v5.2.0" }, sha256)!;
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it("commits an omitted bound / root as an explicit 'none' (still verifies)", () => {
    const c = buildCalibrationCommitment(
      { ...base, anytimeLowerBound: null, ledgerRoot: null },
      sha256,
    )!;
    expect(c.payload).toContain("anytimeLowerBound=none");
    expect(c.payload).toContain("ledgerRoot=none");
    expect(verifyCalibrationCommitment(c, sha256)).toBe(true);
  });

  it("refuses invalid input (returns null, never throws)", () => {
    expect(buildCalibrationCommitment({ ...base, claimedEce: 1.5 }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, claimedEce: -0.1 }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, modelVersion: "" }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, sampleSize: 0 }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, sampleSize: 12.5 }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, paramsCanonical: "" }, sha256)).toBeNull();
    expect(buildCalibrationCommitment({ ...base, anytimeLowerBound: Infinity }, sha256)).toBeNull();
  });
});

describe("toCommitmentEnvelope (future ZK seam — proof stays null)", () => {
  it("carries the real commitment + bound and a NULL proof", () => {
    const c = buildCalibrationCommitment(base, sha256)!;
    const env = toCommitmentEnvelope(c);
    expect(env.commitment).toBe(c.contentHash);
    expect(env.bound).toBe(0.013);
    expect(env.proof).toBeNull(); // NEVER a fabricated proof
    expect(env.publicInputsHash).toBe("abc123");
  });

  it("passes the bound through as null when there is none", () => {
    const c = buildCalibrationCommitment({ ...base, anytimeLowerBound: null }, sha256)!;
    const env = toCommitmentEnvelope(c);
    expect(env.bound).toBeNull();
    expect(env.proof).toBeNull();
  });
});
