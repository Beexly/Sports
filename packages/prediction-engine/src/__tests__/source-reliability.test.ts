/**
 * Per-Source Reliability (Pillar D — stub) — unit tests
 *
 * The stub always returns INSUFFICIENT_DATA because SignalLedgerEvent is not
 * yet available on this branch. Tests verify:
 *   - Correct return type and shape
 *   - Always returns INSUFFICIENT_DATA verdict
 *   - Never writes to the database (no Prisma calls in stub)
 */

import { describe, expect, it } from "vitest";
import {
  computeSourceReliability,
  type SourceReliabilityReport,
  type SourceReliabilityVerdict,
} from "../source-reliability.js";

describe("computeSourceReliability (stub)", () => {
  it("returns INSUFFICIENT_DATA for any source name", async () => {
    const result = await computeSourceReliability("openweather");
    expect(result.verdict).toBe<SourceReliabilityVerdict>("INSUFFICIENT_DATA");
  });

  it("always returns INSUFFICIENT_DATA regardless of source name", async () => {
    const sources = [
      "schedule-internal",
      "openweather",
      "the-odds-api",
      "injuries-rotowire",
      "unknown-source",
    ];
    for (const source of sources) {
      const result = await computeSourceReliability(source);
      expect(result.verdict).toBe("INSUFFICIENT_DATA");
    }
  });

  it("returns a correctly shaped SourceReliabilityReport", async () => {
    const result: SourceReliabilityReport =
      await computeSourceReliability("schedule-internal");

    expect(result.sourceName).toBe("schedule-internal");
    expect(typeof result.verdict).toBe("string");
    expect(typeof result.sampleSize).toBe("number");
    expect(result.sampleSize).toBe(0);
    // hitRate must be null in the stub (no data to compute)
    expect(result.hitRate).toBeNull();
    // recommendedTrustLevel must be null (no recommendation possible)
    expect(result.recommendedTrustLevel).toBeNull();
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("echoes the sourceName in the report", async () => {
    const name = "custom-source-xyz";
    const result = await computeSourceReliability(name);
    expect(result.sourceName).toBe(name);
  });

  it("reason mentions feat/ledger so reviewers know why data is absent", async () => {
    const result = await computeSourceReliability("any-source");
    expect(result.reason.toLowerCase()).toContain("ledger");
  });

  it("does NOT write to the database (no Prisma import in the stub)", async () => {
    // This is structural: the stub module does not import @sports/db or @prisma/client.
    // We verify this by calling the function successfully in a vitest environment
    // where no DB connection is available — if Prisma were called, the test would throw.
    const result = await computeSourceReliability("test-source");
    // If we reach here without error, no DB calls were made.
    expect(result).toBeDefined();
  });
});
