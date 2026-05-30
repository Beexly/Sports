import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Cron route security and shape contract.
 *
 * All cron routes at /api/cron/* must:
 *   1. Check that CRON_SECRET is configured (500 if missing).
 *   2. Validate the Bearer token against CRON_SECRET (401 if wrong).
 *   3. Return a JSON response with `ok: true` on success.
 *
 * These are source-level assertions — we verify the guard logic is
 * present in the source code, not that it was accidentally deleted or
 * that the guard was moved below the return path.
 */

const repoRoot = resolve(__dirname, "..");

function readCronRoute(name: string): string {
  return readFileSync(
    resolve(repoRoot, `app/api/cron/${name}/route.ts`),
    "utf8"
  );
}

const CRON_ROUTES = ["settle-picks", "jarvis-snapshot", "refresh-odds"] as const;

describe("cron route security contract", () => {
  for (const route of CRON_ROUTES) {
    let src: string;
    try {
      src = readCronRoute(route);
    } catch {
      // Route file doesn't exist — skip gracefully so adding a new route
      // doesn't require updating this test file before it's written.
      continue;
    }

    describe(`/api/cron/${route}`, () => {
      it("reads CRON_SECRET from environment (never hardcodes it)", () => {
        expect(src).toMatch(/process\.env\[["']CRON_SECRET["']\]/);
        expect(src).not.toMatch(/Bearer\s+[a-zA-Z0-9+/=]{16,}/);
      });

      it("returns 500 when CRON_SECRET is not configured", () => {
        expect(src).toMatch(/status:\s*500/);
      });

      it("performs Bearer-token auth and returns 401 when token is wrong", () => {
        expect(src).toMatch(/[Bb]earer/);
        expect(src).toMatch(/status:\s*401/);
      });

      it("compares the token against CRON_SECRET (not a static string)", () => {
        // The comparison must use the env var, not a hardcoded value.
        // Pattern: authHeader !== `Bearer ${expected}` or similar.
        expect(src).toMatch(/expected/);
        expect(src).toMatch(/!==\s*`Bearer \$\{expected\}`|!==\s*`Bearer \$\{.*CRON_SECRET.*\}`/);
      });

      it("exports a GET handler", () => {
        expect(src).toMatch(/export\s+async\s+function\s+GET/);
      });

      it("uses force-dynamic to prevent static caching of cron responses", () => {
        expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
      });

      it("returns ok:true JSON on successful auth", () => {
        expect(src).toMatch(/ok:\s*true/);
      });
    });
  }
});

describe("cron route auth guard ordering", () => {
  it("settle-picks: auth check appears before the no-op return", () => {
    const src = readCronRoute("settle-picks");
    const authIdx = src.indexOf("CRON_SECRET");
    const okIdx = src.indexOf("ok: true");
    // Auth check must come first
    expect(authIdx).toBeGreaterThanOrEqual(0);
    expect(okIdx).toBeGreaterThan(authIdx);
  });

  it("jarvis-snapshot: auth check appears before the no-op return", () => {
    const src = readCronRoute("jarvis-snapshot");
    const authIdx = src.indexOf("CRON_SECRET");
    const okIdx = src.indexOf("ok: true");
    expect(authIdx).toBeGreaterThanOrEqual(0);
    expect(okIdx).toBeGreaterThan(authIdx);
  });
});
