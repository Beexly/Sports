/**
 * run-oddsapi-product-prices.ts — production wiring + operator CLI for
 * the KEYED product-price leg (oddsapi-product-prices.ts). Mirrors
 * run-product-prices.ts seam for seam:
 *
 *   window/resolve → The Odds API events list (OddsApiClient#getEvents)
 *                    for the slate; games resolve to canonical Game rows
 *                    exactly as the sibling legs resolve theirs (DB mode:
 *                    resolveCanonicalGame; dry-run: the seeded Game
 *                    externalId, matched off the keyless ESPN board by
 *                    teams + commence time — an Odds API event id is
 *                    NOT a Game key and is never used as one)
 *   payloads       → one OddsApiClient#getEventOdds call per capture
 *                    (h2h/spreads/totals + alternate_spreads/
 *                    alternate_totals), through the caller's own client
 *                    instance — this file constructs it from
 *                    process.env["THE_ODDS_API_KEY"] exactly as
 *                    process-sport.ts and the cron routes do. The key
 *                    value is never printed, logged, or returned.
 *   store          → the featured leg's stores unchanged: Prisma via
 *                    createDbLineArchiveStore in DB mode (product rows
 *                    are OddsLineSnapshot rows under the additive
 *                    ALT_SPREAD / ALT_TOTAL market values), or a local
 *                    JSONL file in --dry-run.
 *
 * Entry point is the operator CLI only — deliberately no cron route:
 * this leg SPENDS credits, and its cadence (≤3 captures per game, 48h
 * window) is a scheduling decision the budget machinery enforces but
 * does not choose. Wire the route when SPEC-B product scoring goes
 * live.
 *
 *   npx tsx packages/ingestion-pipeline/src/line-archiver/run-oddsapi-product-prices.ts --dry-run [--out <path>]
 *   npx tsx packages/ingestion-pipeline/src/line-archiver/run-oddsapi-product-prices.ts            (DB mode; flag-gated)
 *
 * NOTE: unlike the keyless legs, --dry-run here makes LIVE KEYED calls
 * and spends real credits (inside the leg's budget machinery). It is
 * still local-file only — no database is touched.
 */

import type { OddsApiEvent } from "@sports/types";
import type { GameIdentityDb } from "../game-identity.js";
import { isLineArchiveEnabled } from "../line-archive.js";
import {
  createDbLineArchiveStore,
  createJsonlLineArchiveStore,
  LINE_ARCHIVER_MAX_EVENTS,
  LINE_ARCHIVER_SPORT_KEY,
  LINE_ARCHIVER_WINDOW_DAYS,
} from "./espn-line-archive.js";
import {
  runOddsApiProductPriceArchiver,
  runOddsApiProductPriceArchiverIfEnabled,
  zeroOddsApiProductPriceArchiverResult,
  ODDSAPI_EVENT_MARKETS,
  ODDSAPI_LINE_ARCHIVE_SOURCE,
  type OddsApiProductPriceArchiverDeps,
  type OddsApiProductPriceArchiverIfEnabledResult,
} from "./oddsapi-product-prices.js";

export interface RunOddsApiProductPricesJobOptions {
  /** Dry-run: write JSONL to `outPath`, never touch a database. An
   *  explicit operator action — NOT gated on LINE_ARCHIVE_ENABLED (it
   *  writes only a local file), and the result is marked dryRun. It
   *  DOES spend Odds API credits (live keyed calls). */
  readonly dryRun?: boolean;
  readonly outPath?: string;
  readonly now?: Date;
  readonly env?: NodeJS.ProcessEnv;
  readonly logPrefix?: string;
}

export interface RunOddsApiProductPricesJobResult
  extends OddsApiProductPriceArchiverIfEnabledResult {
  readonly dryRun: boolean;
  readonly outPath: string | null;
  /** Whether THE_ODDS_API_KEY was present in the environment. The value
   *  itself is never exposed — this boolean is the whole report. */
  readonly keyConfigured: boolean;
}

const DEFAULT_DRY_RUN_PATH = "line-archive-oddsapi-dry-run.jsonl";

/** ESPN vs Odds API commence clocks for the same contest agree to the
 *  minute in the regular season; 3h is a generous match tolerance. A
 *  match must ALSO agree on both team names — time alone never joins. */
const COMMENCE_MATCH_TOLERANCE_MS = 3 * 60 * 60 * 1000;

/** Defense in depth: no error string leaving this module may carry the
 *  key. Vendor/client errors should never contain it (auth rides a
 *  query param the client builds), but any `apiKey=…` fragment in an
 *  error is redacted before the string can reach a log or a result. */
export function sanitizeOddsApiError(message: string): string {
  return message.replace(/apiKey=[^&\s"']+/gi, "apiKey=<redacted>");
}

function errorFields(err: unknown): {
  message: string;
  usedRequests: number | null;
  remainingRequests: number | null;
} {
  const e = err as {
    message?: unknown;
    usedRequests?: unknown;
    remainingRequests?: unknown;
  } | null;
  return {
    message: sanitizeOddsApiError(
      e && typeof e.message === "string" ? e.message : String(err),
    ),
    usedRequests:
      e && typeof e.usedRequests === "number" ? e.usedRequests : null,
    remainingRequests:
      e && typeof e.remainingRequests === "number"
        ? e.remainingRequests
        : null,
  };
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Count this leg's prior captures for a game in a dry-run JSONL ledger:
 * DISTINCT capturedAt values among rows for the game stamped with this
 * leg's source. Pure — exported for tests.
 */
export function countOddsApiCapturesInJsonl(
  text: string,
  gameId: string,
): number {
  const stamps = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as {
        gameId?: unknown;
        source?: unknown;
        capturedAt?: unknown;
      };
      if (
        parsed.gameId === gameId &&
        parsed.source === ODDSAPI_LINE_ARCHIVE_SOURCE &&
        typeof parsed.capturedAt === "string"
      ) {
        stamps.add(parsed.capturedAt);
      }
    } catch {
      // Torn final line — skip it, as the JSONL store does.
    }
  }
  return stamps.size;
}

interface EspnMatchIndex {
  /** Odds API event id → seeded Game externalId (the ESPN event id). */
  readonly gameIdByOddsApiEventId: ReadonlyMap<string, string>;
  /** Odds API event id → the ESPN board's moneyline for the cross-check. */
  readonly moneylineByOddsApiEventId: ReadonlyMap<
    string,
    { home: number; away: number }
  >;
}

/** Match Odds API events to ESPN board events by normalized team names
 *  + commence time within tolerance. Ambiguous or absent matches are
 *  simply not in the index — the runner reports them unresolved. */
export function buildEspnMatchIndex(
  oddsApiEvents: readonly OddsApiEvent[],
  espnEvents: readonly OddsApiEvent[],
): EspnMatchIndex {
  const gameIdByOddsApiEventId = new Map<string, string>();
  const moneylineByOddsApiEventId = new Map<
    string,
    { home: number; away: number }
  >();
  for (const event of oddsApiEvents) {
    let best: { espn: OddsApiEvent; diff: number } | null = null;
    let ambiguous = false;
    for (const espn of espnEvents) {
      if (
        normalizeTeamName(espn.home_team) !== normalizeTeamName(event.home_team) ||
        normalizeTeamName(espn.away_team) !== normalizeTeamName(event.away_team)
      ) {
        continue;
      }
      const diff = Math.abs(
        Date.parse(espn.commence_time) - Date.parse(event.commence_time),
      );
      if (!Number.isFinite(diff) || diff > COMMENCE_MATCH_TOLERANCE_MS) {
        continue;
      }
      if (best && diff === best.diff) ambiguous = true;
      else if (!best || diff < best.diff) {
        best = { espn, diff };
        ambiguous = false;
      }
    }
    if (!best || ambiguous) continue;
    gameIdByOddsApiEventId.set(event.id, best.espn.id);
    const h2h = best.espn.bookmakers
      .flatMap((b) => b.markets)
      .find((m) => m.key === "h2h");
    if (h2h) {
      let home: number | null = null;
      let away: number | null = null;
      for (const o of h2h.outcomes) {
        if (typeof o.price !== "number") continue;
        if (normalizeTeamName(o.name) === normalizeTeamName(best.espn.home_team)) {
          home = o.price;
        } else if (
          normalizeTeamName(o.name) === normalizeTeamName(best.espn.away_team)
        ) {
          away = o.price;
        }
      }
      if (home !== null && away !== null) {
        moneylineByOddsApiEventId.set(event.id, { home, away });
      }
    }
  }
  return { gameIdByOddsApiEventId, moneylineByOddsApiEventId };
}

/** Real deps for one mode. DB handles and the keyed client are built
 *  lazily so importing this module never opens a connection, and the
 *  gated no-op path never constructs the client at all. */
async function buildDeps(
  mode: "db" | "dry-run",
  outPath: string,
  apiKey: string,
  logPrefix?: string,
): Promise<OddsApiProductPriceArchiverDeps> {
  const { OddsApiClient } = await import("@sports/data-ingestion");
  const client = new OddsApiClient(apiKey);
  const sportKey = LINE_ARCHIVER_SPORT_KEY as Parameters<
    typeof client.getEvents
  >[0];

  const fetchEvents: OddsApiProductPriceArchiverDeps["fetchEvents"] = async () => {
    try {
      const result = await client.getEvents(sportKey);
      return {
        events: result.data,
        usedRequests: result.usedRequests,
        remainingRequests: result.remainingRequests,
      };
    } catch (err) {
      const fields = errorFields(err);
      return {
        events: [],
        error: fields.message,
        usedRequests: fields.usedRequests,
        remainingRequests: fields.remainingRequests,
      };
    }
  };

  const fetchEventOdds: OddsApiProductPriceArchiverDeps["fetchEventOdds"] =
    async (event) => {
      try {
        const result = await client.getEventOdds(
          sportKey,
          event.id,
          ODDSAPI_EVENT_MARKETS,
        );
        return {
          data: result.data,
          usedRequests: result.usedRequests,
          remainingRequests: result.remainingRequests,
        };
      } catch (err) {
        // The client's error carries the failed response's quota
        // headers — preserve them: a failed call may still have spent.
        const fields = errorFields(err);
        return {
          data: null,
          error: fields.message,
          usedRequests: fields.usedRequests,
          remainingRequests: fields.remainingRequests,
        };
      }
    };

  if (mode === "dry-run") {
    const { fetchEspnOddsForSport } = await import("@sports/data-ingestion");
    const expectedMoneylineByEventId = new Map<
      string,
      { home: number; away: number }
    >();
    let indexPromise: Promise<EspnMatchIndex> | null = null;
    let listedEvents: readonly OddsApiEvent[] = [];
    const matchIndex = () =>
      (indexPromise ??= (async () => {
        const board = await fetchEspnOddsForSport(LINE_ARCHIVER_SPORT_KEY, {
          horizonDays: LINE_ARCHIVER_WINDOW_DAYS,
          maxEvents: LINE_ARCHIVER_MAX_EVENTS,
        });
        const index = buildEspnMatchIndex(listedEvents, board.events);
        for (const [k, v] of index.moneylineByOddsApiEventId) {
          expectedMoneylineByEventId.set(k, v);
        }
        return index;
      })());

    return {
      fetchEvents: async (sportKeyArg) => {
        const result = await fetchEvents(sportKeyArg);
        listedEvents = result.events;
        // Populate the cross-check map before the runner resolves any
        // game (it fetches events first, by construction). Best-effort:
        // a board failure costs the cross-check, never the capture.
        try {
          await matchIndex();
        } catch {
          /* cross-check stays not_checked */
        }
        return result;
      },
      fetchEventOdds,
      logPrefix,
      resolveGameId: async (event: OddsApiEvent) => {
        const index = await matchIndex();
        return index.gameIdByOddsApiEventId.get(event.id) ?? null;
      },
      priorCaptureCount: async (gameId: string) => {
        const fs = await import("node:fs/promises");
        let text = "";
        try {
          text = await fs.readFile(outPath, "utf8");
        } catch (err) {
          if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
        }
        return countOddsApiCapturesInJsonl(text, gameId);
      },
      expectedMoneylineByEventId,
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
    fetchEventOdds,
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
        { logPrefix: "[line-archiver-oddsapi]" },
      );
      return resolved?.game.id ?? null;
    },
    priorCaptureCount: async (gameId: string) => {
      const rows = await db.oddsLineSnapshot.findMany({
        where: { gameId, source: ODDSAPI_LINE_ARCHIVE_SOURCE },
        select: { capturedAt: true },
      });
      return new Set(rows.map((r) => r.capturedAt.toISOString())).size;
    },
    store: createDbLineArchiveStore(db),
  };
}

/**
 * The job the CLI runs. DB mode is hard-gated on LINE_ARCHIVE_ENABLED
 * (checked BEFORE the key is read or any dep is built). A missing key is
 * a reported state, not a crash: the leg makes ZERO API calls and the
 * result says exactly why.
 */
export async function runOddsApiProductPricesJob(
  options: RunOddsApiProductPricesJobOptions = {},
): Promise<RunOddsApiProductPricesJobResult> {
  const env = options.env ?? process.env;
  const dryRun = options.dryRun ?? false;
  const outPath = options.outPath ?? DEFAULT_DRY_RUN_PATH;
  const now = options.now;
  // The repo's keyed-leg pattern (process-sport.ts, cron routes):
  // the key is read from the environment, transiently, and never stored.
  const apiKey = env["THE_ODDS_API_KEY"]?.trim();
  const keyConfigured = !!apiKey;

  if (!dryRun && !isLineArchiveEnabled(env)) {
    return {
      enabled: false,
      ...zeroOddsApiProductPriceArchiverResult(now ?? new Date()),
      dryRun: false,
      outPath: null,
      keyConfigured,
    };
  }

  if (!apiKey) {
    return {
      enabled: false,
      ...zeroOddsApiProductPriceArchiverResult(now ?? new Date()),
      dryRun,
      outPath: dryRun ? outPath : null,
      keyConfigured: false,
      errors: [
        "THE_ODDS_API_KEY not configured — the keyed leg made zero API calls",
      ],
    };
  }

  const deps = await buildDeps(
    dryRun ? "dry-run" : "db",
    outPath,
    apiKey,
    options.logPrefix,
  );
  if (now) deps.now = () => now;

  if (dryRun) {
    const result = await runOddsApiProductPriceArchiver(deps);
    return { ...result, enabled: true, dryRun: true, outPath, keyConfigured };
  }
  const result = await runOddsApiProductPriceArchiverIfEnabled(deps, env);
  return { ...result, dryRun: false, outPath: null, keyConfigured };
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
        "Usage: run-oddsapi-product-prices [--dry-run] [--out <path>]\n" +
          "  (no flags)  DB mode — appends ALT_SPREAD / ALT_TOTAL\n" +
          "              OddsLineSnapshot rows from The Odds API's\n" +
          "              alternate markets; no-op unless\n" +
          "              LINE_ARCHIVE_ENABLED=true. Requires\n" +
          "              THE_ODDS_API_KEY in the environment.\n" +
          "  --dry-run   Live keyed capture to a JSONL file instead of\n" +
          "              the database. WARNING: unlike the keyless legs,\n" +
          "              this SPENDS Odds API credits (one event-odds\n" +
          "              call per in-window game, inside the leg's\n" +
          "              budget machinery: 48h window, ≤3 captures per\n" +
          "              game, monthly-burn abort at the cap).\n" +
          "  --out       JSONL path for --dry-run (default\n" +
          "              line-archive-oddsapi-dry-run.jsonl).",
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
  const result = await runOddsApiProductPricesJob({ dryRun, outPath });
  console.log(JSON.stringify(result, null, 2));
  // Exit 1 when the leg could not run at all: no key configured, or the
  // capture itself failed (errors and nothing scanned). An honestly
  // empty alternate board — gaps and all — is a successful run.
  const probeFailed =
    result.errors.length > 0 && result.gamesScanned === 0 && result.enabled;
  if (!result.keyConfigured || probeFailed) process.exitCode = 1;
}

// Direct-invocation guard, argv-shaped per repo convention (see
// run-line-archiver.ts): matches both the .ts source under tsx and a
// built .js of the same name.
const invokedDirectly = (process.argv[1] ?? "").includes(
  "run-oddsapi-product-prices",
);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(
      `[line-archiver-oddsapi] fatal: ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
  });
}
