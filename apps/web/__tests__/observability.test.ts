/**
 * Observability — Sentry integration tests.
 *
 * Source-pin style: no network, no real Sentry calls.
 * All assertions either exercise exported logic or verify structural facts
 * about the source files (imports, exports, config absence).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

// ─── 1. initObservability — no-DSN path ──────────────────────────────────────

describe("initObservability — no DSN", () => {
  beforeEach(() => {
    // Ensure no DSN leaks in from environment
    delete process.env["SENTRY_DSN"];
    delete process.env["NEXT_PUBLIC_SENTRY_DSN"];
    // Reset module state between tests by re-importing a fresh copy
    vi.resetModules();
  });

  it("returns cleanly without throwing when SENTRY_DSN is absent", async () => {
    const { initObservability } = await import("@/lib/observability/sentry");
    expect(() => initObservability()).not.toThrow();
  });

  it("calling initObservability twice without DSN does not throw", async () => {
    const { initObservability } = await import("@/lib/observability/sentry");
    expect(() => {
      initObservability();
      initObservability();
    }).not.toThrow();
  });
});

// ─── 2. captureError — no-DSN path ───────────────────────────────────────────

describe("captureError — no DSN", () => {
  beforeEach(() => {
    delete process.env["SENTRY_DSN"];
    delete process.env["NEXT_PUBLIC_SENTRY_DSN"];
    vi.resetModules();
  });

  it("no-ops without throwing when called before init or without DSN", async () => {
    const { captureError } = await import("@/lib/observability/sentry");
    expect(() => captureError(new Error("test-noop"), { ctx: "test" })).not.toThrow();
  });

  it("no-ops without throwing when called multiple times without DSN", async () => {
    const { captureError } = await import("@/lib/observability/sentry");
    expect(() => {
      captureError(new Error("first"));
      captureError(new Error("second"), { extra: "data" });
      captureError("string error");
    }).not.toThrow();
  });
});

// ─── 3. Source pins ───────────────────────────────────────────────────────────

describe("instrumentation.ts — source pins", () => {
  const src = readSource("instrumentation.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("exports register function", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+register/);
  });

  it("imports initObservability from observability/sentry", () => {
    expect(src).toMatch(/initObservability/);
    expect(src).toMatch(/observability\/sentry/);
  });

  it("calls initObservability inside register", () => {
    // The call must appear after the export async function register declaration
    const registerIdx = src.indexOf("export async function register");
    const callIdx = src.indexOf("initObservability()", registerIdx);
    expect(callIdx).toBeGreaterThan(registerIdx);
  });
});

describe("error.tsx — source pins", () => {
  const src = readSource("app/error.tsx");

  it("imports captureError from observability/sentry", () => {
    expect(src).toMatch(/captureError/);
    expect(src).toMatch(/observability\/sentry/);
  });

  it("calls captureError with the error", () => {
    expect(src).toMatch(/captureError\s*\(\s*error/);
  });
});

describe("next.config.mjs — source pins", () => {
  const src = readSource("next.config.mjs");

  it("does NOT contain withSentryConfig", () => {
    expect(src).not.toMatch(/withSentryConfig/);
  });
});

describe("package.json — @sentry/nextjs present", () => {
  const src = readSource("package.json");
  const pkg = JSON.parse(src) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it("lists @sentry/nextjs in dependencies or devDependencies", () => {
    const hasDep = "@sentry/nextjs" in (pkg.dependencies ?? {});
    const hasDevDep = "@sentry/nextjs" in (pkg.devDependencies ?? {});
    expect(hasDep || hasDevDep).toBe(true);
  });
});
