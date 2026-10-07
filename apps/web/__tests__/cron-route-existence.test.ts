/**
 * Every scheduled cron path must resolve to a handler that exists.
 *
 * THE FAILURE THIS PREVENTS
 * -------------------------
 * A cron entry is a string in JSON (`apps/web/vercel.json`) or a `curl` argument
 * in shell (`.github/workflows/external-cron.yml`). Neither is connected to the
 * handler it invokes by anything the toolchain checks. Delete or rename a route
 * directory and the schedule keeps firing into a 404 — indefinitely, silently.
 * Vercel logs the invocation as delivered, the build is green, types pass, and
 * every operator surface still lists the cron as registered. The job is simply
 * gone.
 *
 * That is the same shape as the 2026-08-17 incident recorded in
 * `vercel-config-drift.test.ts` (config in the wrong directory deregistered all
 * crons for ~23h with nothing failing loudly), and the existing guards cannot
 * catch it: the drift guard compares the two config copies to each other, and
 * `cron-schedule-manifest.test.ts` compares the config to a TS mirror. Neither
 * ever opens `app/`, so both stay green while production 404s.
 *
 * Structure: the resolution rules are proven against synthetic trees first, then
 * applied to the two real scheduling sources.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  cronRouteCandidates,
  describeUnresolved,
  extractCronPathsFromWorkflow,
  findUnresolvedCronPaths,
  normalizeCronPath,
  type DeclaredCronPath,
} from "@/lib/ops/cron-route-resolution";

const APP_WEB_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(APP_WEB_DIR, "..", "..");

/** The only vercel.json Vercel reads (project Root Directory = apps/web). */
const LIVE_VERCEL_CONFIG = join(APP_WEB_DIR, "vercel.json");
const EXTERNAL_CRON_WORKFLOW = join(REPO_ROOT, ".github", "workflows", "external-cron.yml");

/** Probe the real tree, resolving `apps/web`-relative paths. */
const realRouteFileExists = (relativeRouteFile: string): boolean =>
  existsSync(join(APP_WEB_DIR, relativeRouteFile));

interface VercelConfig {
  readonly crons?: ReadonlyArray<{ readonly path: string; readonly schedule: string }>;
}

function readLiveCrons(): ReadonlyArray<{ path: string; schedule: string }> {
  const config = JSON.parse(readFileSync(LIVE_VERCEL_CONFIG, "utf8")) as VercelConfig;
  return (config.crons ?? []).map((c) => ({ path: c.path, schedule: c.schedule }));
}

/* ------------------------------------------------------------------ *
 * 1. Resolution rules (synthetic — no real filesystem)
 * ------------------------------------------------------------------ */

describe("normalizeCronPath", () => {
  it("drops the query string, which is a runtime argument not part of the route", () => {
    // external-cron.yml really does schedule both of these shapes.
    expect(normalizeCronPath("/api/cron/autonomy-cycle?execute=1")).toBe(
      "/api/cron/autonomy-cycle",
    );
    expect(normalizeCronPath("/api/cron/backfill-independent-trueprob?limit=120")).toBe(
      "/api/cron/backfill-independent-trueprob",
    );
  });

  it("drops a fragment and a trailing slash", () => {
    expect(normalizeCronPath("/api/cron/refresh-odds#frag")).toBe("/api/cron/refresh-odds");
    expect(normalizeCronPath("/api/cron/refresh-odds/")).toBe("/api/cron/refresh-odds");
  });
});

describe("cronRouteCandidates", () => {
  it("maps a cron path to the App Router handler files Next.js would serve", () => {
    const candidates = cronRouteCandidates("/api/cron/refresh-odds");
    expect(candidates?.candidateFiles).toEqual([
      "app/api/cron/refresh-odds/route.ts",
      "app/api/cron/refresh-odds/route.tsx",
      "app/api/cron/refresh-odds/route.js",
      "app/api/cron/refresh-odds/route.jsx",
    ]);
  });

  it("refuses paths the App Router could never serve", () => {
    expect(cronRouteCandidates("")).toBeNull();
    expect(cronRouteCandidates("api/cron/no-leading-slash")).toBeNull();
    expect(cronRouteCandidates("/")).toBeNull();
    expect(cronRouteCandidates("/api/cron/../../etc/passwd")).toBeNull();
  });
});

describe("findUnresolvedCronPaths", () => {
  const declared: readonly DeclaredCronPath[] = [
    { cronPath: "/api/cron/present", source: "test-config" },
    { cronPath: "/api/cron/renamed-away", source: "test-config" },
  ];

  it("flags a declared path whose handler does not exist", () => {
    const present = new Set(["app/api/cron/present/route.ts"]);
    const unresolved = findUnresolvedCronPaths(declared, (f) => present.has(f));

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]?.cronPath).toBe("/api/cron/renamed-away");
    expect(unresolved[0]?.reason).toBe("no_handler");
    expect(unresolved[0]?.source).toBe("test-config");
  });

  it("returns nothing when every declared path resolves", () => {
    const present = new Set([
      "app/api/cron/present/route.ts",
      "app/api/cron/renamed-away/route.ts",
    ]);
    expect(findUnresolvedCronPaths(declared, (f) => present.has(f))).toEqual([]);
  });

  it("accepts any App Router handler extension, not just .ts", () => {
    const present = new Set(["app/api/cron/present/route.js"]);
    const unresolved = findUnresolvedCronPaths(
      [{ cronPath: "/api/cron/present", source: "test-config" }],
      (f) => present.has(f),
    );
    expect(unresolved).toEqual([]);
  });

  it("flags a malformed declaration rather than treating it as needing no handler", () => {
    const unresolved = findUnresolvedCronPaths(
      [{ cronPath: "not-a-path", source: "test-config" }],
      () => true,
    );
    expect(unresolved[0]?.reason).toBe("malformed");
  });

  it("a directory without a route file does not count as a handler", () => {
    // The exact rename hazard: the folder survives, the handler moved.
    const present = new Set(["app/api/cron/present/helpers.ts"]);
    const unresolved = findUnresolvedCronPaths(
      [{ cronPath: "/api/cron/present", source: "test-config" }],
      (f) => present.has(f),
    );
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]?.reason).toBe("no_handler");
  });
});

describe("extractCronPathsFromWorkflow", () => {
  it("finds cron paths inside shell strings, and de-duplicates them", () => {
    const body = [
      'curl -sS "${CRON_TARGET_URL}/api/cron/refresh-odds"',
      'path="/api/cron/autonomy-cycle"',
      'path="/api/cron/autonomy-cycle?execute=1"',
    ].join("\n");

    expect(extractCronPathsFromWorkflow(body)).toEqual([
      "/api/cron/refresh-odds",
      "/api/cron/autonomy-cycle",
    ]);
  });

  it("returns nothing for a workflow that schedules no cron routes", () => {
    expect(extractCronPathsFromWorkflow("jobs:\n  build:\n    runs-on: ubuntu-latest")).toEqual(
      [],
    );
  });
});

/* ------------------------------------------------------------------ *
 * 2. The real scheduling sources
 * ------------------------------------------------------------------ */

describe("apps/web/vercel.json crons resolve to real handlers", () => {
  it("declares at least one cron (guards against a silent parse/shape break)", () => {
    expect(readLiveCrons().length).toBeGreaterThan(0);
  });

  it("every declared cron path has a route handler on disk", () => {
    const declared: DeclaredCronPath[] = readLiveCrons().map((c) => ({
      cronPath: c.path,
      source: "apps/web/vercel.json",
    }));

    const unresolved = findUnresolvedCronPaths(declared, realRouteFileExists);

    expect(
      describeUnresolved(unresolved),
      "A cron is declared for a path with no handler. Vercel will fire this " +
        "schedule into a 404 forever — the invocation is recorded as delivered, " +
        "so nothing reports the job as dead. Either restore the handler or " +
        "remove the cron entry (founder-only: vercel.json is sealed).",
    ).toBe("");
  });
});

describe("external-cron.yml backstop paths resolve to real handlers", () => {
  it("references cron routes at all (guards against a parser/rename break)", () => {
    const body = readFileSync(EXTERNAL_CRON_WORKFLOW, "utf8");
    expect(extractCronPathsFromWorkflow(body).length).toBeGreaterThan(0);
  });

  it("every cron path the backstop curls has a route handler on disk", () => {
    const body = readFileSync(EXTERNAL_CRON_WORKFLOW, "utf8");
    const declared: DeclaredCronPath[] = extractCronPathsFromWorkflow(body).map((p) => ({
      cronPath: p,
      source: ".github/workflows/external-cron.yml",
    }));

    const unresolved = findUnresolvedCronPaths(declared, realRouteFileExists);

    expect(
      describeUnresolved(unresolved),
      "The ingestion backstop curls a cron path with no handler. It will get a " +
        "404 and, because the workflow only checks that a request completed, " +
        "report success while ingesting nothing.",
    ).toBe("");
  });
});
