import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level contract tests for the ingestion pipeline.
 *
 * The ingestion pipeline has no unit tests of its own (it depends on
 * external services: DB, Odds API). These tests validate the critical
 * invariants by inspecting source code directly — the same pattern used
 * by readiness-gate-enforcement.test.ts.
 *
 * Key invariants:
 *  1. isBootstrap derived from gates — never hardcoded to false
 *  2. isFeatured derived from gates — never hardcoded to true
 *  3. PickSignalSnapshot is immutable (update:{} pattern)
 *  4. Error handling returns status:"failed" — not throws
 *  5. All errors caught at the top level (try/catch wrapping)
 *  6. Source snapshot hash uses SHA-256
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

const PROCESS = read("packages/ingestion-pipeline/src/process-sport.ts");
const SNAPSHOT = read("packages/ingestion-pipeline/src/source-snapshot.ts");

describe("processSport — invariants", () => {
  it("derives isBootstrap from gates, never hardcodes false on a DB write", () => {
    // No literal `isBootstrap: false` should appear in a create/upsert payload.
    // The gate-derived variable is the only valid source.
    const literalFalse = PROCESS.match(/isBootstrap\s*:\s*false(?!\s*\))/g);
    expect(
      literalFalse,
      "isBootstrap must be the gate-derived variable, never a hard-coded false in a write"
    ).toBeNull();
  });

  it("derives isFeatured from gates.canPromoteFeaturedPicks", () => {
    expect(PROCESS).toMatch(/canPromoteFeaturedPicks/);
    expect(PROCESS).toMatch(/isFeatured\s*=\s*[^;]*canPromoteFeaturedPicks/);
  });

  it("never hardcodes isFeatured: true", () => {
    const literalTrue = PROCESS.match(/isFeatured\s*:\s*true/g);
    expect(
      literalTrue,
      "isFeatured must be the gate-derived variable, never a hard-coded true"
    ).toBeNull();
  });

  it("PickSignalSnapshot is immutable (update:{} pattern — never overwrite)", () => {
    // Lines 144 and 386 in process-sport.ts use `update: {}` for upsert.
    // The comment explicitly documents the immutability requirement.
    const updateEmpty = PROCESS.match(/update\s*:\s*\{\s*\}/g);
    expect(
      updateEmpty,
      "PickSignalSnapshot upsert must use update:{} to prevent overwriting"
    ).not.toBeNull();
    expect(updateEmpty!.length).toBeGreaterThanOrEqual(2);
  });

  it("top-level function wraps everything in try/catch and returns status:'failed'", () => {
    expect(PROCESS).toMatch(/status\s*:\s*["']failed["']/);
    expect(PROCESS).toMatch(/catch\s*\(/);
  });

  it("canUseDerivedHistory gate controls ATS/H2H form fetching", () => {
    expect(PROCESS).toMatch(/canUseDerivedHistory/);
    // ATS form must be gated — not called unconditionally
    const gateIdx = PROCESS.indexOf("canUseDerivedHistory");
    const atsIdx = PROCESS.indexOf("getAtsForm");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(atsIdx).toBeGreaterThan(-1);
    // The gate check must appear before the ATS form fetch
    expect(gateIdx).toBeLessThan(atsIdx);
  });
});

describe("recordSourceSnapshot — invariants", () => {
  it("computes SHA-256 hash of the payload", () => {
    expect(SNAPSHOT).toMatch(/sha256/);
    expect(SNAPSHOT).toMatch(/createHash/);
  });

  it("uses stableStringify to produce deterministic hash regardless of key order", () => {
    // The sort() call ensures object keys are canonicalized before hashing
    expect(SNAPSHOT).toMatch(/\.sort\(\)/);
  });

  it("stores payloadBytes as Buffer byte length (not character length)", () => {
    // Buffer.byteLength handles multibyte chars correctly; str.length does not
    expect(SNAPSHOT).toMatch(/Buffer\.byteLength/);
  });
});
