import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O-1.7 fail-closed guard: the stub Prisma client must REFUSE to activate in
 * the Vercel production runtime (VERCEL_ENV === "production") — a stub there
 * silently drops every write and empties every read while jobs report
 * success. A console.error was warn-and-continue; the guard now throws at
 * module init so the deployment (or function) fails loudly instead.
 *
 * The gate is VERCEL_ENV, deliberately NOT NODE_ENV: NODE_ENV is
 * "production" during every `next build`, including CI and local builds
 * that legitimately have no database.
 *
 * The module builds its client at import time and caches on globalThis, so
 * each case stages env, clears the cache, resets the module registry, and
 * dynamically imports a fresh copy.
 */

const ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "FORCE_REAL_PRISMA",
  "VERCEL_ENV",
  "ALLOW_STUB_DB_IN_PRODUCTION",
  "DEMO_PICKS_ENABLED",
] as const;

const saved: Record<string, string | undefined> = {};

function clearDbEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

function clearClientCache(): void {
  const g = globalThis as unknown as {
    prisma?: unknown;
    prismaStubMode?: boolean;
  };
  delete g.prisma;
  delete g.prismaStubMode;
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  clearDbEnv();
  clearClientCache();
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  clearClientCache();
  vi.restoreAllMocks();
});

describe("stub client fail-closed in the production runtime (O-1.7)", () => {
  it("THROWS at init when the stub would activate and VERCEL_ENV is production", async () => {
    process.env["VERCEL_ENV"] = "production";

    await expect(import("../index.js")).rejects.toThrow(/REFUSING/);
  });

  it("allows the stub in production ONLY via the explicit escape hatch", async () => {
    process.env["VERCEL_ENV"] = "production";
    process.env["ALLOW_STUB_DB_IN_PRODUCTION"] = "true";

    const mod = await import("../index.js");
    expect(mod.isStubMode()).toBe(true);
  });

  it("preview and local runtimes keep the graceful stub (no throw)", async () => {
    process.env["VERCEL_ENV"] = "preview";

    const mod = await import("../index.js");
    expect(mod.isStubMode()).toBe(true);
  });

  it("a real DATABASE_URL in production never trips the guard", async () => {
    process.env["VERCEL_ENV"] = "production";
    process.env["DATABASE_URL"] = "postgresql://user:pw@db-host.test:5432/gse";

    const mod = await import("../index.js");
    expect(mod.isStubMode()).toBe(false);
  });
});
