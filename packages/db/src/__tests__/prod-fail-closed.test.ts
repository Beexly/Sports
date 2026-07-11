import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * O-1.7 fail-closed guard: the stub Prisma client must REFUSE to activate in
 * a production runtime — a stub there silently drops every write and empties
 * every read while jobs report success. A console.error was
 * warn-and-continue; the guard now throws at module init so the deployment
 * (or worker boot) fails loudly instead.
 *
 * Two production signals trip it: VERCEL_ENV==="production" (Vercel) and
 * PRODUCTION_RUNTIME==="true" (declared by the Docker worker images — Codex
 * review, PR #82). Deliberately NOT NODE_ENV: NODE_ENV is "production"
 * during every `next build`, including CI and local builds that
 * legitimately have no database.
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
  "PRODUCTION_RUNTIME",
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

  it("THROWS in a non-Vercel production runtime declared via PRODUCTION_RUNTIME (worker images)", async () => {
    // Codex review (PR #82): the Docker workers run NODE_ENV=production with
    // no VERCEL_ENV — the Vercel-only gate left refresh/settlement writes
    // silently droppable there. The worker images declare
    // PRODUCTION_RUNTIME=true and must trip the same guard.
    process.env["PRODUCTION_RUNTIME"] = "true";

    await expect(import("../index.js")).rejects.toThrow(/REFUSING/);
  });

  it("PRODUCTION_RUNTIME honors the same explicit escape hatch", async () => {
    process.env["PRODUCTION_RUNTIME"] = "true";
    process.env["ALLOW_STUB_DB_IN_PRODUCTION"] = "true";

    const mod = await import("../index.js");
    expect(mod.isStubMode()).toBe(true);
  });
});

describe("the production worker images declare PRODUCTION_RUNTIME (the guard is only as good as the declaration)", () => {
  const repoRoot = resolve(__dirname, "..", "..", "..", "..");

  it.each([
    "workers/data-refresh/Dockerfile",
    "workers/pick-generation/Dockerfile",
    "workers/content-publishing/Dockerfile",
  ])("%s sets PRODUCTION_RUNTIME=true", (rel) => {
    const src = readFileSync(resolve(repoRoot, rel), "utf8");
    expect(src).toMatch(/^ENV PRODUCTION_RUNTIME=true$/m);
  });

  it("oracle-vps compose declares PRODUCTION_RUNTIME on every worker service", () => {
    const src = readFileSync(resolve(repoRoot, "docker/oracle-vps/compose.yml"), "utf8");
    const count = (src.match(/PRODUCTION_RUNTIME:\s*"true"/g) ?? []).length;
    expect(count).toBe(3);
  });
});
