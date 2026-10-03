import { describe, it, expect } from "vitest";
import {
  resolvePayloadPolicy,
  PRODUCTION_DEFAULT_MODE,
  ALWAYS_KEPT_METADATA,
} from "@/lib/proof/source-payload-policy";

describe("source payload policy", () => {
  it("defaults production AWAY from unlimited raw DB payload storage", () => {
    expect(PRODUCTION_DEFAULT_MODE).toBe("hash-only");
    const d = resolvePayloadPolicy();
    expect(d.storeRawInPostgres).toBe(false);
    expect(d.retentionDays).toBeNull();
  });

  it("keeps the proof-anchor metadata in every mode", () => {
    for (const mode of ["hash-only", "db-full", "object-storage-planned"] as const) {
      const d = resolvePayloadPolicy(mode, { retentionDays: 7, objectKey: "k" });
      expect(d.metadataFields).toEqual([...ALWAYS_KEPT_METADATA]);
      expect(d.metadataFields).toContain("hash");
    }
  });

  it("db-full always carries a retention bound and warns", () => {
    const noBound = resolvePayloadPolicy("db-full");
    expect(noBound.storeRawInPostgres).toBe(true);
    expect(noBound.retentionDays).toBeGreaterThan(0); // defaulted, not unbounded
    expect(noBound.warnings.join(" ")).toMatch(/retention/i);

    const bounded = resolvePayloadPolicy("db-full", { retentionDays: 3 });
    expect(bounded.retentionDays).toBe(3);
  });

  it("object-storage mode requires an object key", () => {
    const d = resolvePayloadPolicy("object-storage-planned");
    expect(d.requiresObjectKey).toBe(true);
    expect(d.storeRawInPostgres).toBe(false);
    expect(d.warnings.join(" ")).toMatch(/objectKey/i);
  });
});
