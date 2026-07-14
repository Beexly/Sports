import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "FORCE_REAL_PRISMA",
] as const;

function resetPrismaGlobals(): void {
  Reflect.deleteProperty(globalThis, "prisma");
  Reflect.deleteProperty(globalThis, "prismaStubMode");
}

describe("@sports/db production boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetPrismaGlobals();
    vi.resetModules();
  });

  it("rejects a missing production database instead of returning the write-dropping stub", async () => {
    // Given: a production runtime with no real database URL or fallback.
    vi.stubEnv("NODE_ENV", "production");
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, "");
    }
    resetPrismaGlobals();
    vi.resetModules();

    // When / Then: importing the DB boundary must fail before any caller can
    // read empty data or silently drop a write.
    let importError: unknown = null;
    try {
      await import("../index.js");
    } catch (error) {
      importError = error;
    }

    expect(importError).toBeInstanceOf(Error);
    expect(importError).toMatchObject({
      message: expect.stringContaining("Production requires a real DATABASE_URL"),
    });
  });
});
