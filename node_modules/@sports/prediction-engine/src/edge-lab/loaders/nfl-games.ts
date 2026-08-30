/**
 * NFL historical game loader — the "games" edge-lab feed (edge-lab handoff §6:
 * per-sport loaders map onto the shared, sport-agnostic `GameRow`; see
 * ../game-row.ts).
 *
 * Source: nflverse/nfldata's "Lee Sharpe" games.csv — the same schedule +
 * closing-line dataset the repo's `schedules` nflverse catalog entry serves
 * (packages/data-ingestion/src/nflverse-source.ts NFLVERSE_CATALOG.schedules),
 * fetched here directly from its home repo rather than the nflverse-data
 * release mirror, because the raw-github copy needs no gunzip step:
 *
 *   https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv
 *
 * Licensed CC-BY-4.0 (nflverse) — attribution required wherever this data
 * appears: "Data via nflverse (nflverse/nfldata), licensed CC BY 4.0."
 * (matches the `nflverse` entry in packages/data-ingestion/src/source-registry.ts —
 * see the "no cross-package import" note below for why this loader doesn't
 * call that registry directly).
 *
 * ── Why this file re-implements fetch + CSV parsing instead of importing
 *    packages/data-ingestion/src/nflverse-source.ts ──
 * packages/prediction-engine/package.json does NOT declare a dependency on
 * @sports/data-ingestion (only "@sports/types"), and prediction-engine's
 * tsconfig.json has no path mapping for it either — by the letter of the
 * package.json manifest, prediction-engine cannot import from data-ingestion.
 * (Node's npm-workspaces hoisting happens to make the package physically
 * resolvable from here via node_modules/@sports/data-ingestion, but relying
 * on that undeclared, hoisting-order-dependent resolution would be exactly
 * the kind of invisible coupling bug this monorepo's per-package manifests
 * exist to prevent — and editing package.json was explicitly out of scope
 * for this task.) So this loader is self-contained: a small quote-aware CSV
 * parser mirroring the conventions of `parseCsv` in nflverse-source.ts (same
 * RFC-4180-ish behavior — doubled-quote escaping, embedded commas/newlines —
 * same unguarded `text[i]` char-indexing idiom already used there), written
 * fresh rather than imported. For the same reason, this loader does not call
 * `assertIngestible("nflverse")` from source-registry.ts; the CC-BY-4.0
 * attribution requirement above is honored here in the header/docs instead.
 *
 * ── Spread sign convention (VERIFIED against real data, not assumed) ──
 * nflverse/nfldata's `spread_line` column is HOME-perspective but the
 * OPPOSITE polarity of this repo's internal spread convention (scoring.ts /
 * clv.ts / market-read.ts / ml-estimator.ts / game-context.ts: negative =
 * home favored). Verified two ways against the live games.csv (fetched
 * 2026-07-16, 7276 rows with both `spread_line` and `result` populated):
 *
 *   1. Correlation of `spread_line` with `result` (home_score - away_score)
 *      is +0.43, with a majority of rows sharing the same sign (4810 vs
 *      2420) — a positive `spread_line` predicts the home team outscoring
 *      the away team, i.e. POSITIVE spread_line = home favored.
 *   2. Direct check against the 2007 New England Patriots' 16-0 regular
 *      season — an unambiguous "home team is the heavy favorite every week"
 *      case: every 2007 NE home game carries a strongly POSITIVE
 *      spread_line (e.g. 2007_08_WAS_NE: NE home favored by 15,
 *      spread_line = 15, total_line = 46.5, home_moneyline = -1225,
 *      away_moneyline = 825; NE won 52-7). This is the row modeled in this
 *      loader's fixture (see ../__tests__/nfl-games.test.ts) as the
 *      known-spread-sign case.
 *
 * So this loader NEGATES the raw column to land on GameRow's documented
 * convention (`closing.spreadHome`: negative = home favored):
 *
 *   spreadHome = spread_line === null ? null : -spread_line
 *
 * (Aside, out of scope for this task: packages/prediction-engine/src/
 * historical-replay.ts's header comment claims nflverse spread_line is
 * ALREADY "negative = home favored" and passes it straight through
 * unnegated — that comment appears to be incorrect per this verification,
 * while packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts's
 * comment, "nflverse spread_line is HOME-framed (positive = home favored)",
 * matches what was verified here. Not fixed by this change — a different
 * existing file, out of scope.)
 *
 * ── Kickoff timezone assumption ──
 * `gameday` (YYYY-MM-DD) + `gametime` (HH:MM, 24h) are nfldata's local
 * wall-clock kickoff; nfldata does not publish a timezone column. This
 * loader ASSUMES `gametime` is always America/New_York (ET) regardless of
 * the actual stadium's timezone — the convention nflreadr/nflfastR
 * documentation uses, cross-checked here against a known kickoff (2024's
 * Thursday opener, 2024_01_BAL_KC, gametime "20:20" = the actual 8:20pm ET
 * kickoff at Arrowhead, which is in the Central timezone — confirming
 * gametime is ET-normalized, not stadium-local). The ET wall clock is
 * converted to UTC via `Intl.DateTimeFormat`, so the conversion is correct
 * across the DST boundary rather than assuming a fixed UTC-4/UTC-5 offset.
 * A row with a blank `gametime` (present on some pre-2011 rows) defaults to
 * 13:00 ET, the standard early-Sunday-window kickoff — an explicit
 * assumption, not a fact recovered from the source.
 *
 * REG season only, matching this package's existing convention
 * (nflverse-replay-parser.ts): postseason rows are filtered out.
 */

import type { GameRow } from "../game-row.js";
import { americanToDecimal } from "../game-row.js";

/** The upstream dataset this loader reads. */
export const NFLDATA_GAMES_CSV_URL =
  "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

export interface LoadNflGamesOptions {
  readonly seasons: readonly number[];
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetcher?: typeof fetch;
}

/**
 * Load REG-season NFL games for the requested seasons as sport-agnostic
 * `GameRow`s. NODE_OPTIONS=--use-system-ca is required for a live fetch in
 * this environment (see packages/data-ingestion/src/nflverse-source.ts).
 */
export async function loadNflGames(opts: LoadNflGamesOptions): Promise<GameRow[]> {
  const seasons = new Set(opts.seasons);
  const doFetch = opts.fetcher ?? fetch;

  const res = await doFetch(NFLDATA_GAMES_CSV_URL);
  if (!res.ok) {
    throw new Error(`nfldata games.csv fetch failed (${res.status}) for ${NFLDATA_GAMES_CSV_URL}`);
  }
  const text = await res.text();
  const table = parseCsv(text);

  const rows: GameRow[] = [];
  for (const record of table.records) {
    const row = mapNflRow(record);
    if (row !== null && seasons.has(row.season)) {
      rows.push(row);
    }
  }
  return rows;
}

// ── row mapping ────────────────────────────────────────────────────────────

function mapNflRow(row: Readonly<Record<string, string>>): GameRow | null {
  if ((row["game_type"] ?? "") !== "REG") return null;

  const gameId = nonEmpty(row["game_id"]);
  const season = toInt(row["season"]);
  const week = toInt(row["week"]);
  const homeTeam = nonEmpty(row["home_team"]);
  const awayTeam = nonEmpty(row["away_team"]);
  const gameday = nonEmpty(row["gameday"]);

  if (
    gameId === null ||
    season === null ||
    week === null ||
    homeTeam === null ||
    awayTeam === null ||
    gameday === null
  ) {
    return null;
  }

  const startTime = easternWallClockToUtcIso(gameday, row["gametime"] ?? null);
  if (startTime === null) return null;

  const rawSpread = toNumber(row["spread_line"]);
  const homeMoneyline = toNumber(row["home_moneyline"]);
  const awayMoneyline = toNumber(row["away_moneyline"]);

  return {
    sport: "nfl",
    gameId,
    season,
    week,
    startTime,
    homeTeam,
    awayTeam,
    homeScore: toNumber(row["home_score"]),
    awayScore: toNumber(row["away_score"]),
    closing: {
      // Negate: nfldata's spread_line is positive-home-favored (see header),
      // GameRow's contract is negative-home-favored.
      spreadHome: rawSpread === null ? null : -rawSpread,
      total: toNumber(row["total_line"]),
      moneylineHomeDecimal: homeMoneyline === null ? null : americanToDecimal(homeMoneyline),
      moneylineAwayDecimal: awayMoneyline === null ? null : americanToDecimal(awayMoneyline),
    },
  };
}

// ── ET wall clock -> UTC ISO (see header: kickoff timezone assumption) ─────

const DEFAULT_KICKOFF_ET = "13:00"; // assumption for rows with a blank gametime

function easternWallClockToUtcIso(gameday: string, gametime: string | null): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gameday);
  if (dateMatch === null) return null;
  const timeSource = gametime !== null && gametime.trim() !== "" ? gametime.trim() : DEFAULT_KICKOFF_ET;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeSource);
  if (timeMatch === null) return null;

  const year = Number(dateMatch[1] ?? NaN);
  const month = Number(dateMatch[2] ?? NaN);
  const day = Number(dateMatch[3] ?? NaN);
  const hour = Number(timeMatch[1] ?? NaN);
  const minute = Number(timeMatch[2] ?? NaN);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  // Treat the wall-clock fields as if they were UTC, then correct by the
  // actual America/New_York offset at that instant (handles the EDT/EST
  // boundary correctly instead of assuming a fixed UTC-4/UTC-5 offset).
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const firstPassOffset = newYorkOffsetMinutes(naiveUtcMs);
  const correctedMs = naiveUtcMs - firstPassOffset * 60_000;
  // Re-check at the corrected instant in case the first pass landed on the
  // wrong side of a DST transition.
  const secondPassOffset = newYorkOffsetMinutes(correctedMs);
  const finalMs = naiveUtcMs - secondPassOffset * 60_000;

  return new Date(finalMs).toISOString();
}

/** Minutes to ADD to a New York wall-clock reading to get UTC (e.g. EDT -> -240). */
function newYorkOffsetMinutes(atUtcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(atUtcMs));
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const match = /GMT([+-]\d{1,2})(?::?(\d{2}))?/.exec(tzName);
  if (match === null) return -300; // fallback: standard time
  const hours = Number(match[1] ?? NaN);
  const minutes = match[2] !== undefined ? Number(match[2]) : 0;
  if (!Number.isFinite(hours)) return -300;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

// ── minimal quote-aware CSV parser (see header: intentionally self-contained) ──

interface CsvTable {
  readonly header: readonly string[];
  readonly records: ReadonlyArray<Readonly<Record<string, string>>>;
}

function parseCsv(text: string): CsvTable {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift() ?? [];
  const records = rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
    .map((r) => {
      const rec: Record<string, string> = {};
      for (let j = 0; j < header.length; j++) {
        const key = header[j];
        if (key !== undefined) rec[key] = r[j] ?? "";
      }
      return rec;
    });

  return { header, records };
}

// ── small parsing helpers ───────────────────────────────────────────────────

function nonEmpty(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toInt(value: string | undefined): number | null {
  const n = toNumber(value);
  return n !== null && Number.isInteger(n) ? n : null;
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
