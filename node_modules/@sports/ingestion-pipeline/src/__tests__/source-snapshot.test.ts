import { describe, it, expect } from "vitest";
import { resolveSnapshotMode, snapshotPayloadFor } from "../source-snapshot.js";

describe("resolveSnapshotMode", () => {
  it("honors an explicit SOURCE_SNAPSHOT_MODE", () => {
    expect(resolveSnapshotMode({ SOURCE_SNAPSHOT_MODE: "hash-only" })).toBe("hash-only");
    expect(resolveSnapshotMode({ SOURCE_SNAPSHOT_MODE: "db-full" })).toBe("db-full");
  });

  it("defaults to hash-only in production (protect Neon)", () => {
    expect(resolveSnapshotMode({ NODE_ENV: "production" })).toBe("hash-only");
  });

  it("defaults to db-full outside production (debugging)", () => {
    expect(resolveSnapshotMode({ NODE_ENV: "development" })).toBe("db-full");
    expect(resolveSnapshotMode({})).toBe("db-full");
  });

  it("falls back to the env default on an unrecognized value", () => {
    expect(resolveSnapshotMode({ SOURCE_SNAPSHOT_MODE: "weird", NODE_ENV: "production" })).toBe("hash-only");
    expect(resolveSnapshotMode({ SOURCE_SNAPSHOT_MODE: "weird" })).toBe("db-full");
  });
});

describe("snapshotPayloadFor", () => {
  const raw = { a: 1, b: [2, 3], nested: { x: "y" } };

  it("db-full keeps the full payload verbatim", () => {
    expect(snapshotPayloadFor("db-full", raw)).toEqual(raw);
  });

  it("hash-only drops the raw payload, leaving only a small stub", () => {
    const stub = snapshotPayloadFor("hash-only", raw) as Record<string, unknown>;
    expect(stub["_mode"]).toBe("hash-only");
    expect(stub).not.toHaveProperty("a");
    expect(stub).not.toHaveProperty("nested");
    // Stub must be far smaller than a real payload would be.
    expect(JSON.stringify(stub).length).toBeLessThan(JSON.stringify(raw).length + 200);
  });
});
