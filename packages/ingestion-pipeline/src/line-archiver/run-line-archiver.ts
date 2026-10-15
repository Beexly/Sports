/**
 * run-line-archiver.ts — production wiring + operator CLI for the
 * ESPN/DraftKings line archiver (espn-line-archive.ts). The core module is
 * dependency-injected; this file binds the real implementations:
 *
 *   fetch    → fetchEspnOddsForSport (keyless ESPN public scoreboard,
 *              DraftKings inline block) from @sports/data-ingestion
 *   normalize→ DataNormalizer from @sports/data-ingestion
 *   resolve  → canonical Game row via ../game-identity.ts
 *              (resolveCanonicalGame: ESPN events are seeded with
 *              externalId `espn:<sportKey>:<id>`, so the direct lookup hits;
 *              the twin matcher covers games first created by the paid path)
 *   store    → the production Prisma client (@sports/db) via
 *              createDbLineArchiveStore — or, in --dry-run, a local JSONL
 *              file via createJsonlLineArchiveStore with gameId = the ESPN
 *              event id (which IS the seeded Game externalId, so dry-run
 *              rows join to real Game rows on that key unchanged).
 *
 * Entry points:
 *   - Cron (production cadence): apps/web/app/api/cron/line-archiver calls
 *     runLineArchiverJob() hourly (vercel.json: "7 * * * *"). DB mode,
 *     hard-gated on LINE_ARCHIVE_ENABLED inside the job — flag off ⇒ the
 *     job is a logged no-op with zero fetches and zero DB calls.
 *   - CLI (operator / verification):
 *       npx tsx packages/ingestion-pipeline/src/line-archiver/run-line-archiver.ts --dry-run [--out <path>]
 *       npx tsx packages/ingestion-pipeline/src/line-archiver/run-line-archiver.ts            (DB mode; flag-gated)
 *
 * DB mode NEVER runs against anything but the DATABASE_URL the environment
 * provides, and this module contains no migration/DDL — it only appends
 * OddsLineSnapshot rows through the store seam.
 */

import type { OddsApiEvent } from "@sports/types";
import type { GameIdentityDb } from "../game-identity.js";
import { isLineArchiveEnabled } from "../line-archive.js";
import {
  createDbLineArchiveStore,
  createJsonlLineArchiveStore,
  runEspnLineArchiver,
  runEspnLineArchiverIfEnabled,
  zeroEspnLineArchiverResult,
  LINE_ARCHIVER_SPORT_KEY,
  type EspnLineArchiverDeps,
  type EspnLineArchiverIfEnabledResult,
} from "./espn-line-archive.js";

export interface RunLineArchiverJobOptions {
  /** Dry-run: write JSONL to `outPath`, never touch a database. An explicit
   *  operator action — NOT gated on LINE_ARCHIVE_ENABLED (it writes only a
   *  local file), and the result is marked dryRun so it can never be
   *  mistaken for production capture. */
  readonly dryRun?: boolean;
  readonly outPath?: string;
  readonly now?: Date;
  readonly env?: NodeJS.ProcessEnv;
  readonly logPrefix?: string;
}

export interface RunLineArchiverJobResult extends EspnLineArchiverIfEnabledResult {
  readonly dryRun: boolean;
  readonly outPath: string | null;
}

const DEFAULT_DRY_RUN_PATH = "line-archive-dry-run.jsonl";

/** Real deps for one mode. The DB handles are imported lazily so importing
 *  this module (e.g. from the cron route's bundle graph) never opens a
 *  database connection, and dry-run never loads the Prisma client at all. */
async function buildDeps(
  mode: "db" | "dry-run",
  outPath: string,
  logPrefix?: string,
): Promise<EspnLineArchiverDeps> {
  const { fetchEspnOddsForSport, DataNormalizer } = await import(
    "@sports/data-ingestion"
  );
  const normalizer = new DataNormalizer();

  const fetchEvents: EspnLineArchiverDeps["fetchEvents"] = async (
    sportKey,
    options,
  ) => {
    const result = await fetchEspnOddsForSport(sportKey, {
      horizonDays: options.horizonDays,
      maxEvents: options.maxEvents,
    });
    return { events: result.events, error: result.error };
  };
  const normalizeOdds: EspnLineArchiverDeps["normalizeOdds"] = (
    events,
    fetchedAt,
  ) => normalizer.normalizeOdds([...events], fetchedAt);

  if (mode === "dry-run") {
    return {
      fetchEvents,
      normalizeOdds,
      logPrefix,
      // The ESPN event id IS the seeded Game externalId
      // (`espn:<sportKey>:<id>` — see seed-games-from-espn.ts), so dry-run
      // rows carry the exact key production rows resolve to.
      resolveGameId: async (event: OddsApiEvent) => event.id,
      store: createJsonlLineArchiveStore(outPath),
    };
  }

  const { db } = await import("@sports/db");
  const { resolveCanonicalGame } = await import("../game-identity.js");

  let sportIdPromise: Promise<string | null> | null = null;
  const sportId = () =>
    (sportIdPromise ??= (async () => {
      const sport = await db.sport.findUnique({
        where: { key: LINE_ARCHIVER_SPORT_KEY },
        select: { id: true },
      });
      return sport?.id ?? null;
    })());

  return {
    fetchEvents,
    normalizeOdds,
    logPrefix,
    resolveGameId: async (event: OddsApiEvent) => {
      const sport = await sportId();
      if (!sport) return null; // sport not seeded — nothing is tracked yet
      const resolved = await resolveCanonicalGame(
        db as unknown as GameIdentityDb,
        {
          sportId: sport,
          sportKey: LINE_ARCHIVER_SPORT_KEY,
          externalId: event.id,
          homeTeamName: event.home_team,
          awayTeamName: event.away_team,
          commenceTime: new Date(event.commence_time),
        },
        { logPrefix: "[line-archiver]" },
      );
      return resolved?.game.id ?? null;
    },
    store: createDbLineArchiveStore(db),
  };
}

/**
 * The job both entry points run. DB mode is hard-gated on
 * LINE_ARCHIVE_ENABLED (checked BEFORE any dep is built, so a flag-off run
 * loads neither the ESPN client nor the Prisma client and makes zero calls
 * of any kind). Dry-run is explicit and local-file only.
 */
export async function runLineArchiverJob(
  options: RunLineArchiverJobOptions = {},
): Promise<RunLineArchiverJobResult> {
  const env = options.env ?? process.env;
  const dryRun = options.dryRun ?? false;
  const outPath = options.outPath ?? DEFAULT_DRY_RUN_PATH;
  const now = options.now;

  if (!dryRun && !isLineArchiveEnabled(env)) {
    // Hard gate, checked before any dep is built: flag off ⇒ no ESPN
    // client, no Prisma client, zero calls — the inert-by-default no-op.
    return {
      enabled: false,
      ...zeroEspnLineArchiverResult(now ?? new Date()),
      dryRun: false,
      outPath: null,
    };
  }

  const deps = await buildDeps(dryRun ? "dry-run" : "db", outPath, options.logPrefix);
  if (now) deps.now = () => now;

  if (dryRun) {
    const result = await runEspnLineArchiver(deps);
    return { ...result, enabled: true, dryRun: true, outPath };
  }
  const result = await runEspnLineArchiverIfEnabled(deps, env);
  return { ...result, dryRun: false, outPath: null };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseCliArgs(argv: readonly string[]): {
  dryRun: boolean;
  outPath?: string;
} {
  let dryRun = false;
  let outPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--out") outPath = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: run-line-archiver [--dry-run] [--out <path>]\n" +
          "  (no flags)  DB mode — appends OddsLineSnapshot rows; no-op unless\n" +
          "              LINE_ARCHIVE_ENABLED=true.\n" +
          "  --dry-run   Fetch live ESPN/DK lines and append the identical row\n" +
          "              shape to a JSONL file instead of the database.\n" +
          "  --out       JSONL path for --dry-run (default line-archive-dry-run.jsonl).",
      );
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { dryRun, outPath };
}

async function main(): Promise<void> {
  const { dryRun, outPath } = parseCliArgs(process.argv.slice(2));
  const result = await runLineArchiverJob({ dryRun, outPath });
  console.log(JSON.stringify(result, null, 2));
  // A run that captured nothing because the upstream failed is a failed
  // run for cron/operator purposes — say so via the exit code. A flag-off
  // no-op and an honestly empty board are successes.
  const upstreamFailed =
    result.errors.length > 0 && result.rowsPersisted === 0 && result.enabled;
  if (upstreamFailed) process.exitCode = 1;
}

// Direct-invocation guard, argv-shaped per repo convention (this package
// typechecks as CommonJS — no import.meta): matches both the .ts source
// under tsx and a built .js of the same name.
const invokedDirectly = (process.argv[1] ?? "").includes("run-line-archiver");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(
      `[line-archiver] fatal: ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
  });
}
