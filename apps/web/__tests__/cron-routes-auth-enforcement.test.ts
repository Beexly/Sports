import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Runtime access-control enforcement for EVERY route under /api/cron.
 *
 * The shared helper `lib/cron/authorize.ts` is well covered in isolation
 * (cron-authorize-dual-secret.test.ts, cron-vercel-platform.test.ts), but
 * nothing verified that the cron ROUTES actually call it. 14 of the 25 cron
 * routes had no test importing them at all, so a route that shipped without
 * an auth call — or that opted into spoofable "dual" mode while performing
 * mutations — would have been publicly reachable with nothing failing.
 *
 * This suite enumerates the cron directory at runtime rather than hard-coding
 * a list, so a NEW cron route added tomorrow is covered the moment it lands.
 *
 * Scope note (deliberate): only the DENY paths are exercised. Invoking a cron
 * route with a valid secret would run real settlement / ingestion / alerting
 * side effects, so the authorized branch is left to the helper's own unit
 * tests. What is proven here is the property that matters for access control:
 * an unauthenticated caller never gets through, and the spoofable Vercel
 * platform header alone never gets through either (GSE-SEC-016).
 *
 * Runtime assertions only: apps/web/tsconfig.json excludes __tests__ from
 * typechecking, so a type-level assertion here would prove nothing.
 */

const CRON_DIR = resolve(__dirname, "../app/api/cron");

/** Every cron route directory name, discovered at runtime. */
const CRON_ROUTES: readonly string[] = readdirSync(CRON_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

type Handler = (request: Request, context?: unknown) => Promise<Response>;

async function loadHandlers(name: string): Promise<Array<[string, Handler]>> {
  // @vite-ignore: the specifier is fully dynamic by design — the suite
  // enumerates the cron directory so new routes are covered automatically.
  const mod: Record<string, unknown> = await import(
    /* @vite-ignore */ `../app/api/cron/${name}/route.ts`
  );
  return (["GET", "POST"] as const)
    .filter((verb) => typeof mod[verb] === "function")
    .map((verb) => [verb, mod[verb] as Handler]);
}

function cronRequest(name: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://example.com/api/cron/${name}`, { headers });
}

describe("cron route auth enforcement", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env["CRON_SECRET"] = "test-cron-secret-not-real";
    delete process.env["CRON_SECRET_PREVIOUS"];
    delete process.env["CRON_REQUIRE_BEARER"];
    delete process.env["VERCEL"];
    // /api/cron/backtest-calibration checks its feature flag BEFORE calling
    // cronAuthError, so while the flag is off it answers any caller with a
    // 200 config stub (documented in that route's header as "Authentication
    // (once enabled)"). Turn the flag on so the auth branch is the one under
    // test — that is the state the route runs in when it is actually live.
    // The route still denies before any backtest work, so nothing executes.
    process.env["BACKTEST_HARNESS_ENABLED"] = "true";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("discovers the cron routes from disk", () => {
    // Guards the enumeration itself: if this ever reads an empty directory the
    // per-route cases below would all vacuously pass.
    expect(CRON_ROUTES.length).toBeGreaterThan(20);
    expect(CRON_ROUTES).toContain("settle-picks");
    expect(CRON_ROUTES).toContain("refresh-odds");
  });

  for (const name of CRON_ROUTES) {
    describe(`/api/cron/${name}`, () => {
      it("exports at least one HTTP handler", async () => {
        const handlers = await loadHandlers(name);
        expect(handlers.length).toBeGreaterThan(0);
      });

      it("rejects a request with NO Authorization header (401)", async () => {
        for (const [verb, handler] of await loadHandlers(name)) {
          const res = await handler(cronRequest(name), { params: {} });
          expect(
            res.status,
            `${verb} /api/cron/${name} must reject an unauthenticated caller`,
          ).toBe(401);
        }
      });

      it("rejects a WRONG bearer secret (401)", async () => {
        for (const [verb, handler] of await loadHandlers(name)) {
          const res = await handler(
            cronRequest(name, { authorization: "Bearer wrong-secret" }),
            { params: {} },
          );
          expect(
            res.status,
            `${verb} /api/cron/${name} must reject an incorrect secret`,
          ).toBe(401);
        }
      });

      it("rejects the spoofable x-vercel-cron header alone (GSE-SEC-016)", async () => {
        // The platform header is not cryptographic proof of Vercel origin.
        // Default mode is bearer_only, so it must not authorize by itself.
        process.env["VERCEL"] = "1";
        for (const [verb, handler] of await loadHandlers(name)) {
          const res = await handler(
            cronRequest(name, { "x-vercel-cron": "1" }),
            { params: {} },
          );
          expect(
            res.status,
            `${verb} /api/cron/${name} must not accept x-vercel-cron without a Bearer secret`,
          ).toBe(401);
        }
      });

      it("fails closed with 500 when CRON_SECRET is not configured", async () => {
        // An unset secret must never mean "open" — it means misconfigured.
        delete process.env["CRON_SECRET"];
        for (const [verb, handler] of await loadHandlers(name)) {
          const res = await handler(
            cronRequest(name, { authorization: "Bearer anything" }),
            { params: {} },
          );
          expect(
            res.status,
            `${verb} /api/cron/${name} must fail closed when CRON_SECRET is unset`,
          ).toBe(500);
        }
      });
    });
  }
});
