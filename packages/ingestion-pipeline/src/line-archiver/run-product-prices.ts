/**
 * run-product-prices.ts — production wiring + operator CLI for the
 * product-price extension (espn-product-prices.ts). Mirrors
 * run-line-archiver.ts seam for seam:
 *
 *   window/resolve → fetchEspnOddsForSport (keyless ESPN public
 *                    scoreboard) from @sports/data-ingestion — the same
 *                    board fetch the featured leg runs, used here only
 *                    to select the window and resolve games
 *   payloads       → per event, two keyless ESPN fetches (this file):
 *                    the core-API odds index → provider detail objects,
 *                    and the summary pickcenter. No API key, no credits,
 *                    no login. (DraftKings' own guest API answers 403
 *                    from the capture environment and is not used; see
 *                    README "Product-price gaps".)
 *   store          → the featured leg's stores unchanged: Prisma via
 *                    createDbLineArchiveStore in DB mode (product rows
 *                    are OddsLineSnapshot rows under the additive
 *                    ALT_SPREAD / ALT_TOTAL market values), or a local
 *                    JSONL file in --dry-run via
 *                    createJsonlLineArchiveStore with gameId = the ESPN
 *                    event id (the seeded Game externalId).
 *
 * Entry point is the operator CLI only — there is deliberately no cron
 * route for this leg yet: the keyless surfaces expose no ladders today
 * (every run's `gaps` says so from live evidence), and hourly production
 * fan-out for an availability probe is spend without capture. Wire the
 * route the day a run reports a class exposed.
 *
 *   npx tsx packages/ingestion-pipeline/src/line-archiver/run-product-prices.ts --dry-run [--out <path>]
 *   npx tsx packages/ingestion-pipeline/src/line-archiver/run-product-prices.ts            (DB mode; flag-gated)
 */

import type { OddsApiEvent } from "@sports/types";
import type { GameIdentityDb } from "../game-identity.js";
import { isLineArchiveEnabled } from "../line-archive.js";
import {
  createDbLineArchiveStore,
  createJsonlLineArchiveStore,
  LINE_ARCHIVER_SPORT_KEY,
} from "./espn-line-archive.js";
import {
  runEspnProductPriceArchiver,
  runEspnProductPriceArchiverIfEnabled,
  zeroEspnProductPriceArchiverResult,
  PRODUCT_SOURCE_CORE_ODDS,
  PRODUCT_SOURCE_SUMMARY_PICKCENTER,
  type EspnProductPriceArchiverDeps,
  type EspnProductPriceArchiverIfEnabledResult,
  type ProductPricePayloads,
} from "./espn-product-prices.js";

export interface RunProductPricesJobOptions {
  /** Dry-run: write JSONL to `outPath`, never touch a database. An
   *  explicit operator action — NOT gated on LINE_ARCHIVE_ENABLED (it
   *  writes only a local file), and the result is marked dryRun. */
  readonly dryRun?: boolean;
  readonly outPath?: string;
  readonly now?: Date;
  readonly env?: NodeJS.ProcessEnv;
  readonly logPrefix?: string;
}

export interface RunProductPricesJobResult
  extends EspnProductPriceArchiverIfEnabledResult {
  readonly dryRun: boolean;
  readonly outPath: string | null;
}

const DEFAULT_DRY_RUN_PATH = "line-archive-products-dry-run.jsonl";

/** Per-call ceiling for the keyless payload fetches — a blackholed host
 *  must never stall the run (same discipline as the ESPN odds client). */
const PRODUCT_FETCH_TIMEOUT_MS = 12_000;

/** Providers per event are capped — ESPN carries one book for the NFL
 *  today; the cap keeps a pathological index from fanning out. */
const MAX_PROVIDERS_PER_EVENT = 4;

/** The archiver's sport is NFL-only (LINE_ARCHIVER_SPORT_KEY); these are
 *  its ESPN paths (cf. ESPN_ODDS_SPORT_MAP in @sports/data-ingestion). */
const CORE_ODDS_BASE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";
const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(PRODUCT_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** OddsApiEvent.id is `espn:<sportKey>:<eventId>` for ESPN-seeded events;
 *  the payload endpoints want the bare ESPN event id. */
function espnEventId(event: OddsApiEvent): string {
  const idx = event.id.lastIndexOf(":");
  return idx >= 0 ? event.id.slice(idx + 1) : event.id;
}

type Loose = Record<string, unknown>;

/**
 * The real per-event payload fetch: core odds index → each provider's
 * detail object, plus the summary pickcenter. Each surface fails
 * independently — a surface that fails is simply not consulted (and not
 * claimed in sourcesChecked); only when BOTH fail does the event fail,
 * which the runner records and isolates.
 */
async function fetchProductPayloads(
  event: OddsApiEvent,
): Promise<ProductPricePayloads> {
  const eventId = espnEventId(event);
  const sourcesChecked: string[] = [];
  const failures: string[] = [];

  let coreProviderDetails: unknown[] = [];
  try {
    const index = (await fetchJson(
      `${CORE_ODDS_BASE}/events/${eventId}/competitions/${eventId}/odds`,
    )) as Loose;
    const items = Array.isArray(index["items"]) ? index["items"] : [];
    const refs = items
      .map((item) => (item as Loose)?.["$ref"])
      .filter((r): r is string => typeof r === "string")
      .slice(0, MAX_PROVIDERS_PER_EVENT);
    const details: unknown[] = [];
    for (const ref of refs) {
      // $refs are already on the public core host in live responses; the
      // internal host spelling is rewritten defensively, never fetched.
      const url = ref.replace("sports.core.api.espn.pvt", "sports.core.api.espn.com");
      details.push(await fetchJson(url));
    }
    coreProviderDetails = details;
    sourcesChecked.push(PRODUCT_SOURCE_CORE_ODDS);
  } catch (err) {
    failures.push(
      `core odds: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let summaryPickcenter: unknown[] = [];
  try {
    const summary = (await fetchJson(
      `${SUMMARY_URL}?event=${eventId}`,
    )) as Loose;
    summaryPickcenter = Array.isArray(summary["pickcenter"])
      ? summary["pickcenter"]
      : [];
    sourcesChecked.push(PRODUCT_SOURCE_SUMMARY_PICKCENTER);
  } catch (err) {
    failures.push(
      `summary: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (sourcesChecked.length === 0) {
    throw new Error(`product payload fetch failed (${failures.join("; ")})`);
  }
  return { coreProviderDetails, summaryPickcenter, sourcesChecked };
}

/** Real deps for one mode. DB handles are imported lazily so importing
 *  this module never opens a database connection, and dry-run never
 *  loads the Prisma client at all (same discipline as the featured leg). */
async function buildDeps(
  mode: "db" | "dry-run",
  outPath: string,
  logPrefix?: string,
): Promise<EspnProductPriceArchiverDeps> {
  const { fetchEspnOddsForSport } = await import("@sports/data-ingestion");

  const fetchEvents: EspnProductPriceArchiverDeps["fetchEvents"] = async (
    sportKey,
    options,
  ) => {
    const result = await fetchEspnOddsForSport(sportKey, {
      horizonDays: options.horizonDays,
      maxEvents: options.maxEvents,
    });
    return { events: result.events, error: result.error };
  };

  if (mode === "dry-run") {
    return {
      fetchEvents,
      fetchProductPayloads,
      logPrefix,
      // The ESPN event id IS the seeded Game externalId — see
      // run-line-archiver.ts for the same dry-run convention.
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
    fetchProductPayloads,
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
        { logPrefix: "[line-archiver-products]" },
      );
      return resolved?.game.id ?? null;
    },
    store: createDbLineArchiveStore(db),
  };
}

/**
 * The job the CLI runs. DB mode is hard-gated on LINE_ARCHIVE_ENABLED
 * (checked BEFORE any dep is built). Dry-run is explicit and local-file
 * only.
 */
export async function runProductPricesJob(
  options: RunProductPricesJobOptions = {},
): Promise<RunProductPricesJobResult> {
  const env = options.env ?? process.env;
  const dryRun = options.dryRun ?? false;
  const outPath = options.outPath ?? DEFAULT_DRY_RUN_PATH;
  const now = options.now;

  if (!dryRun && !isLineArchiveEnabled(env)) {
    return {
      enabled: false,
      ...zeroEspnProductPriceArchiverResult(now ?? new Date()),
      dryRun: false,
      outPath: null,
    };
  }

  const deps = await buildDeps(dryRun ? "dry-run" : "db", outPath, options.logPrefix);
  if (now) deps.now = () => now;

  if (dryRun) {
    const result = await runEspnProductPriceArchiver(deps);
    return { ...result, enabled: true, dryRun: true, outPath };
  }
  const result = await runEspnProductPriceArchiverIfEnabled(deps, env);
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
        "Usage: run-product-prices [--dry-run] [--out <path>]\n" +
          "  (no flags)  DB mode — appends ALT_SPREAD / ALT_TOTAL\n" +
          "              OddsLineSnapshot rows for whatever alternate-line\n" +
          "              ladders the keyless ESPN surfaces expose; no-op\n" +
          "              unless LINE_ARCHIVE_ENABLED=true.\n" +
          "  --dry-run   Probe live ESPN surfaces and append any product\n" +
          "              rows to a JSONL file instead of the database.\n" +
          "              Zero rows with gaps reported is a finding, not a\n" +
          "              failure.\n" +
          "  --out       JSONL path for --dry-run (default\n" +
          "              line-archive-products-dry-run.jsonl).",
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
  const result = await runProductPricesJob({ dryRun, outPath });
  console.log(JSON.stringify(result, null, 2));
  // Exit 1 only when the probe itself failed (errors and nothing
  // scanned). An honestly empty product board — gaps and all — is a
  // successful run: the surfaces were checked and the answer recorded.
  const probeFailed =
    result.errors.length > 0 && result.gamesScanned === 0 && result.enabled;
  if (probeFailed) process.exitCode = 1;
}

// Direct-invocation guard, argv-shaped per repo convention (see
// run-line-archiver.ts): matches both the .ts source under tsx and a
// built .js of the same name.
const invokedDirectly = (process.argv[1] ?? "").includes("run-product-prices");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(
      `[line-archiver-products] fatal: ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
  });
}
