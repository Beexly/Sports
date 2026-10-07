/**
 * Every cron route handler must reach an authorization check.
 *
 * THE FAILURE THIS PREVENTS
 * -------------------------
 * `lib/cron/authorize.ts` already fails closed — unset `CRON_SECRET` yields 500,
 * not a free pass, and secrets are compared in constant time (proven in
 * `cron-authorize-dual-secret.test.ts`). None of that helps a route that never
 * calls it. A cron handler without the call is an anonymous, unauthenticated,
 * side-effecting endpoint on the public internet.
 *
 * The cost is not hypothetical. `/api/cron/refresh-odds` spends metered The Odds
 * API credits per invocation, so an open handler lets a stranger drain the plan
 * quota; the visible symptom downstream is a dark board, not a 500. Other cron
 * routes write to the database, reconcile Stripe entitlements, or send mail.
 *
 * This sweep is source-level on purpose — see the note in
 * `lib/ops/cron-auth-coverage.ts`. A behavioral sweep would need Prisma and the
 * prediction engine loaded for 25 modules, and a route that failed to import
 * would quietly vanish from coverage instead of failing.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeCronRouteAuth,
  stripComments,
  stripCommentsAndStrings,
} from "@/lib/ops/cron-auth-coverage";

const APP_WEB_DIR = resolve(__dirname, "..");
const CRON_DIR = join(APP_WEB_DIR, "app", "api", "cron");

/**
 * Routes permitted to accept the `x-vercel-cron` header instead of a Bearer
 * secret. That header is NOT cryptographic proof of Vercel origin — anyone can
 * send it — so `authorize.ts` makes it an explicit per-route opt-in reserved for
 * read-only probes.
 *
 * Exact equality, not subset: a tolerated-exception list that only forbids NEW
 * entries rots into permanent tolerance. Today nothing opts in, and adding an
 * entry should require deliberately editing this line.
 */
const DUAL_MODE_ALLOWLIST: readonly string[] = [];

interface CronRouteFile {
  readonly name: string;
  readonly file: string;
  readonly source: string;
}

function cronRouteFiles(): readonly CronRouteFile[] {
  return readdirSync(CRON_DIR)
    .filter((entry) => statSync(join(CRON_DIR, entry)).isDirectory())
    .map((name) => ({ name, file: join(CRON_DIR, name, "route.ts") }))
    .filter((r) => {
      try {
        return statSync(r.file).isFile();
      } catch {
        return false;
      }
    })
    .map((r) => ({ ...r, source: readFileSync(r.file, "utf8") }));
}

/* ------------------------------------------------------------------ *
 * 1. Analyzer behaviour (synthetic sources)
 * ------------------------------------------------------------------ */

describe("stripCommentsAndStrings", () => {
  it("removes line and block comments", () => {
    expect(stripCommentsAndStrings("a // cronAuthError(request)\nb")).not.toContain(
      "cronAuthError",
    );
    expect(stripCommentsAndStrings("/* cronAuthError(request) */ b")).not.toContain(
      "cronAuthError",
    );
  });

  it("blanks string literals so their contents cannot satisfy a code check", () => {
    expect(stripCommentsAndStrings('const s = "cronAuthError(request)";')).not.toContain(
      "cronAuthError",
    );
  });
});

describe("stripComments", () => {
  it("removes comments but preserves string literals", () => {
    const out = stripComments('// note\nconst m = { mode: "dual" };');
    expect(out).not.toContain("note");
    expect(out).toContain('"dual"');
  });
});

describe("analyzeCronRouteAuth", () => {
  it("flags a handler that never calls an authorization helper", () => {
    const source = `
      import { NextResponse } from "next/server";
      export async function GET(request: Request) {
        return NextResponse.json({ ok: true });
      }
    `;
    const analysis = analyzeCronRouteAuth(source);
    expect(analysis.unauthorizedHandlers).toEqual(["GET"]);
  });

  it("accepts a handler that calls the shared helper", () => {
    const source = `
      import { cronAuthError } from "@/lib/cron/authorize";
      export async function GET(request: Request) {
        const denied = cronAuthError(request);
        if (denied) return denied;
        return NextResponse.json({ ok: true });
      }
    `;
    const analysis = analyzeCronRouteAuth(source);
    expect(analysis.unauthorizedHandlers).toEqual([]);
    expect(analysis.importsSharedHelper).toBe(true);
    expect(analysis.exportedHandlers[0]?.authCall).toBe("cronAuthError");
  });

  it("does NOT accept a commented-out authorization call", () => {
    const source = `
      export async function GET(request: Request) {
        // const denied = cronAuthError(request);
        return NextResponse.json({ ok: true });
      }
    `;
    expect(analyzeCronRouteAuth(source).unauthorizedHandlers).toEqual(["GET"]);
  });

  it("accepts delegation to an authorized sibling handler", () => {
    // gamma's real shape: POST is `return GET(request)`.
    const source = `
      import { cronAuthError } from "@/lib/cron/authorize";
      export async function GET(request: Request) {
        const denied = cronAuthError(request);
        if (denied) return denied;
        return NextResponse.json({ ok: true });
      }
      export async function POST(request: Request) {
        return GET(request);
      }
    `;
    const analysis = analyzeCronRouteAuth(source);
    expect(analysis.unauthorizedHandlers).toEqual([]);
    expect(analysis.exportedHandlers.map((h) => h.handler)).toEqual(["GET", "POST"]);
  });

  it("rejects delegation to a sibling that is itself unauthorized", () => {
    const source = `
      export async function GET(request: Request) {
        return NextResponse.json({ ok: true });
      }
      export async function POST(request: Request) {
        return GET(request);
      }
    `;
    expect(analyzeCronRouteAuth(source).unauthorizedHandlers).toEqual(["GET", "POST"]);
  });

  it("detects an explicit dual-mode opt-in, and ignores prose about it", () => {
    const optIn = `
      import { cronAuthError } from "@/lib/cron/authorize";
      export async function GET(request: Request) {
        const denied = cronAuthError(request, { mode: "dual" });
        if (denied) return denied;
      }
    `;
    expect(analyzeCronRouteAuth(optIn).usesDualMode).toBe(true);

    const prose = `
      /** This route could use mode: "dual" but deliberately does not. */
      import { cronAuthError } from "@/lib/cron/authorize";
      export async function GET(request: Request) {
        const denied = cronAuthError(request);
        if (denied) return denied;
      }
    `;
    expect(analyzeCronRouteAuth(prose).usesDualMode).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 2. The real cron routes
 * ------------------------------------------------------------------ */

describe("every cron route on disk is authenticated", () => {
  it("finds the cron routes at all (guards against a parser/rename break)", () => {
    expect(cronRouteFiles().length).toBeGreaterThan(10);
  });

  it("every exported handler reaches an authorization check", () => {
    const holes = cronRouteFiles()
      .map((r) => ({ route: r.name, analysis: analyzeCronRouteAuth(r.source) }))
      .filter((r) => r.analysis.unauthorizedHandlers.length > 0)
      .map((r) => `${r.route}: ${r.analysis.unauthorizedHandlers.join(", ")}`);

    expect(
      holes.join("\n"),
      "A cron route exports an HTTP handler with no authorization call. That is " +
        "a publicly triggerable job — on the ingestion routes it lets an " +
        "anonymous caller burn the metered The Odds API quota. Call " +
        "cronAuthError(request) first thing in the handler.",
    ).toBe("");
  });

  it("every cron route imports the shared authorize module", () => {
    const missing = cronRouteFiles()
      .filter((r) => !analyzeCronRouteAuth(r.source).importsSharedHelper)
      .map((r) => r.name);

    expect(
      missing.join(", "),
      "A cron route does not import lib/cron/authorize. Hand-rolled secret " +
        "comparison misses the constant-time check and the unset-secret " +
        "fail-closed path; always go through the shared helper.",
    ).toBe("");
  });

  it("only allowlisted routes opt into the spoofable x-vercel-cron dual mode", () => {
    const dual = cronRouteFiles()
      .filter((r) => analyzeCronRouteAuth(r.source).usesDualMode)
      .map((r) => r.name)
      .sort();

    expect(
      dual,
      "A cron route opted into mode: \"dual\", which accepts the x-vercel-cron " +
        "header in place of a Bearer secret. That header is trivially spoofable " +
        "by any caller, so it is only acceptable for read-only probes. If this " +
        "is genuinely read-only, add the route name to DUAL_MODE_ALLOWLIST in " +
        "this file — deliberately, in review.",
    ).toEqual([...DUAL_MODE_ALLOWLIST].sort());
  });
});
