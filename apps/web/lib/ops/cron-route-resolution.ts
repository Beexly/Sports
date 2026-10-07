/**
 * Declared-cron → App Router handler resolution (pure).
 *
 * WHY THIS EXISTS
 * ---------------
 * A Vercel cron entry is a *string*. Nothing in the toolchain connects it to the
 * handler it is supposed to invoke. Rename `app/api/cron/refresh-odds/` to
 * `.../refresh-market-odds/` and `vercel.json` keeps happily declaring
 * `/api/cron/refresh-odds` — the platform then fires that schedule forever into
 * a 404. Vercel records the invocation as *delivered*; the route simply does not
 * exist. No build error, no type error, no test failure, no alert. The job is
 * dead and every dashboard still shows the cron as "registered".
 *
 * The same hazard applies to `.github/workflows/external-cron.yml`, which is the
 * documented ingestion backstop and hits nine cron paths as hard-coded `curl`
 * strings inside shell — the least type-checked surface in the repo.
 *
 * This module reduces both to one question a test can answer: does every path
 * anybody schedules resolve to a file Next.js will actually serve? The
 * filesystem probe is injected so the matching logic is unit-testable without
 * touching the real tree, and so the same logic can be pointed at any source of
 * declared paths.
 *
 * Companion guards, deliberately kept separate:
 *   - `vercel-config-drift.test.ts`  — the two vercel.json copies agree.
 *   - `cron-schedule-manifest.ts`    — declared cadence is mirrored for liveness.
 * Neither of those ever opens `app/`, so neither can see a 404ing cron.
 */

/** App Router file extensions Next.js will serve as a route handler. */
const ROUTE_FILE_EXTENSIONS = ["ts", "tsx", "js", "jsx"] as const;

/** Where a cron path's handler must live, relative to `apps/web`. */
export interface CronRouteCandidates {
  /** Path with query string and trailing slash removed. */
  readonly normalizedPath: string;
  /** Candidate handler files, relative to `apps/web`, in resolution order. */
  readonly candidateFiles: readonly string[];
}

/**
 * Strip query string / fragment / trailing slash from a scheduled path.
 *
 * `external-cron.yml` schedules `/api/cron/autonomy-cycle?execute=1` and
 * `/api/cron/backfill-independent-trueprob?limit=120`. The query is a runtime
 * argument, not part of the route's identity on disk.
 */
export function normalizeCronPath(cronPath: string): string {
  const withoutFragment = cronPath.split("#", 1)[0] ?? "";
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? "";
  const trimmed = withoutQuery.trim();
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed;
}

/**
 * Candidate handler files for a scheduled path, relative to `apps/web`.
 *
 * Returns null when the path is not something the App Router could serve at all
 * (empty, relative, or containing traversal) — a malformed declaration is itself
 * a defect worth surfacing rather than silently treating as "no route needed".
 */
export function cronRouteCandidates(cronPath: string): CronRouteCandidates | null {
  const normalizedPath = normalizeCronPath(cronPath);
  if (!normalizedPath.startsWith("/")) return null;
  if (normalizedPath === "/") return null;
  if (normalizedPath.includes("..")) return null;

  const segments = normalizedPath.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;

  const dir = ["app", ...segments].join("/");
  return {
    normalizedPath,
    candidateFiles: ROUTE_FILE_EXTENSIONS.map((ext) => `${dir}/route.${ext}`),
  };
}

/** One scheduled path, tagged with the file that scheduled it. */
export interface DeclaredCronPath {
  readonly cronPath: string;
  /** Human-readable origin, e.g. "apps/web/vercel.json". */
  readonly source: string;
}

/** A scheduled path with no handler on disk — i.e. a permanent silent 404. */
export interface UnresolvedCronPath {
  readonly cronPath: string;
  readonly source: string;
  readonly reason: "malformed" | "no_handler";
  /** Files that were probed (empty when the path is malformed). */
  readonly triedFiles: readonly string[];
}

/**
 * Find scheduled paths that do not resolve to a handler.
 *
 * `routeFileExists` receives a path relative to `apps/web` and must report
 * whether that file is present. Injected rather than imported so the matching
 * rules can be proven against synthetic trees.
 */
export function findUnresolvedCronPaths(
  declared: readonly DeclaredCronPath[],
  routeFileExists: (relativeRouteFile: string) => boolean,
): readonly UnresolvedCronPath[] {
  const unresolved: UnresolvedCronPath[] = [];

  for (const entry of declared) {
    const candidates = cronRouteCandidates(entry.cronPath);
    if (candidates === null) {
      unresolved.push({
        cronPath: entry.cronPath,
        source: entry.source,
        reason: "malformed",
        triedFiles: [],
      });
      continue;
    }

    const found = candidates.candidateFiles.some((f) => routeFileExists(f));
    if (!found) {
      unresolved.push({
        cronPath: entry.cronPath,
        source: entry.source,
        reason: "no_handler",
        triedFiles: candidates.candidateFiles,
      });
    }
  }

  return unresolved;
}

/**
 * Every distinct `/api/cron/...` path a workflow body references.
 *
 * Deliberately a text scan, not a YAML parse: these paths live inside shell
 * heredocs and `curl` argument strings, where a YAML parser sees one opaque
 * scalar. Order is preserved and duplicates removed so the report reads cleanly.
 */
export function extractCronPathsFromWorkflow(workflowBody: string): readonly string[] {
  const matches = workflowBody.matchAll(/\/api\/cron\/[A-Za-z0-9._-]+/g);
  const seen = new Set<string>();
  for (const match of matches) {
    const raw = match[0];
    if (raw !== undefined) seen.add(raw);
  }
  return [...seen];
}

/** One-line-per-entry rendering for assertion messages. */
export function describeUnresolved(unresolved: readonly UnresolvedCronPath[]): string {
  return unresolved
    .map((u) =>
      u.reason === "malformed"
        ? `${u.source} declares "${u.cronPath}" — not a servable absolute path`
        : `${u.source} declares "${u.cronPath}" — no handler at ${u.triedFiles.join(" | ")}`,
    )
    .join("\n");
}
