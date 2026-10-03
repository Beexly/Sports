/**
 * MLB Statcast player-season feature loader — MLB parity item for the
 * edge-lab loaders (edge-lab handoff §6; intel reconciliation queue item 6:
 * "MLB Statcast + platoon-split loaders behind clearance"). Sibling of
 * ./mlb-platoon-splits.ts; both feed player-level batted-ball/contact-quality
 * signal into the as-of store for later admission through the trials
 * registry (see ../trials-registry.ts) — NOT wired into any scoring path by
 * this change.
 *
 * ── Source & rights ──
 * MLB Statcast data, served via Baseball Savant's public "custom leaderboard"
 * export — free, keyless, no login, no paywall, no CAPTCHA (same access
 * category as this repo's `nws-weather` / `sleeper` registry entries and
 * mlb-games.ts's MLB Stats API loader; see that file's header for why this
 * package doesn't call packages/data-ingestion's source-registry directly —
 * the same "no @sports/data-ingestion dependency declared" reasoning applies
 * here verbatim). Only derived facts (per-player-season contact-quality
 * rates) are extracted, never article prose or proprietary content, per
 * apps/web/lib/scraping/data-rules.ts's "what may be extracted" doctrine —
 * though again, as an ingestion loader rather than an apps/web scraping job,
 * this file's own governance surface is this header, not the Scraping
 * Clearance Engine. Attribution, wherever this data is surfaced downstream:
 * "Data: MLB Statcast via Baseball Savant."
 *
 * ── Endpoint investigation (verified live 2026-07-16) — READ BEFORE CHANGING ──
 * The task brief that produced this file assumed Baseball Savant's custom
 * leaderboard CSV export ("the site's CSV endpoint") has a JSON sibling.
 * That assumption was investigated and does NOT hold: Baseball Savant's own
 * front-end bundle (fetched and read: .../sections/leaderboard/builds/.../
 * scripts/build/sortable-stats.js) fetches the exact same `csv=true` URL
 * client-side and parses it with d3's `csvParse` — there is no separate
 * `/leaderboard/custom/json`-style endpoint; `/leaderboard/custom/json` and
 * `/api/leaderboard/custom` both 404 to Savant's generic HTML error page.
 * The only other place row data appears is a `var data = [...]` JS-literal
 * embedded in the ~700KB HTML of the leaderboard page itself, which is
 * fragile to scrape (regex-out-of-HTML) and orders of magnitude larger than
 * the dedicated export. So this loader binds to the verified, real,
 * dedicated, small CSV export the site itself uses as its own data source:
 *
 *   GET https://baseballsavant.mlb.com/leaderboard/custom
 *       ?year={sourceSeason}&type={batter|pitcher}&filter=&min={n}
 *       &selections=barrel_batted_rate,xwoba,hard_hit_percent,k_percent,bb_percent
 *       &csv=true
 *
 * (`Content-Type: text/csv`, `content-disposition: attachment;filename=stats.csv`
 * — confirmed live for both `type=batter` and `type=pitcher`, `year=2023` and
 * `year=2024`.) Because it is CSV rather than JSON, "fields may be strings"
 * (the task's parsing-defensiveness instruction) is even more literally true
 * here than a JSON API: EVERY cell is a string as far as CSV syntax is
 * concerned — quoting in the raw text is purely a comma/newline escape, not
 * a type signal (verified: `xwoba` values are always double-quoted, e.g.
 * `".357"`, while `barrel_batted_rate`/`hard_hit_percent`/`k_percent`/
 * `bb_percent` are bare, e.g. `8.8` — but both need identical `Number(...)`
 * coercion once parsed, since CSV quoting says nothing about numeric-ness).
 * Verified live with `min=1` (a low batted-ball-event floor, not Savant's
 * "qualified" default `min=q`, so platoon/part-time players are covered too
 * — a deliberate choice, since a "qualified hitters only" leaderboard would
 * silently drop most of the player population this loader needs to serve):
 * some rows carry BLANK cells for `barrel_batted_rate`/`hard_hit_percent`
 * (e.g. real row `"McCoy, Mason",669200,2023,,".000",,100,0` — insufficient
 * batted-ball events to compute a barrel/hard-hit rate even though `xwoba`,
 * `k_percent`, `bb_percent` are still populated) — this loader treats a
 * blank cell as `null` for that field alone, never as `0` and never as a
 * reason to drop the whole player-season record (missing-field tolerance,
 * per-field not per-row).
 *
 * ── LEAK-FREE DISCIPLINE (non-negotiable — read this before calling) ──
 * Season-aggregate stats leak future games within the same season: a
 * player's July barrel rate is computed from batted balls including games
 * that happened AFTER an April game earlier that same season, so serving a
 * season's own aggregate as a feature for games inside that season is a
 * lookahead leak by construction. This loader therefore NEVER exposes a
 * "give me season S's own stats" call. Its only public entry point takes
 * `targetSeasons` (the seasons whose GAMES you want features for) and
 * internally fetches `targetSeason - 1`'s full-season leaderboard — the
 * player's/pitcher's complete PRIOR season, long since closed out — and
 * returns it framed as `targetSeason`'s feature input. Every emitted record
 * carries `sourceSeason` for audit (so a caller can always see exactly which
 * season's numbers a feature came from) and an `observedAt` stamp fixed at
 * the prior season's conservative close (see ./mlb-season-boundaries.ts) —
 * months before `targetSeason`'s own Opening Day. There is no code path in
 * this file that can return same-season aggregates for a target season; "no
 * same-season aggregates, period" is enforced by the function signature, not
 * just by convention.
 */

import { mlbSeasonEndIso } from "./mlb-season-boundaries.js";

export type StatcastPlayerType = "batter" | "pitcher";

export interface LoadStatcastPriorSeasonFeaturesOptions {
  /** Seasons you want PRIOR-SEASON Statcast features FOR (e.g. 2024 means:
   * fetch and return the 2023 full-season leaderboard, framed as feature
   * input for 2024 games). See header: never same-season. */
  readonly targetSeasons: readonly number[];
  /** Baseball Savant's `min` (minimum batted-ball events) leaderboard floor.
   * Defaults to 1 (broad coverage, including part-time/platoon players) —
   * see header for why Savant's `min=q` "qualified" default is NOT used. */
  readonly minBattedBallEvents?: number;
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetcher?: typeof fetch;
}

/**
 * One player-season's Statcast contact-quality profile, framed as a feature
 * input for `targetSeason` but MEASURED in `sourceSeason` (= targetSeason -
 * 1). `xwoba`/`hardHitPercent`/`kPercent`/`bbPercent`/`barrelRate` are `null`
 * when Baseball Savant's leaderboard cell was blank (insufficient batted-ball
 * events to compute that particular rate) — never fabricated as 0.
 *
 * Scale note (do not conflate these): `barrelRate`, `hardHitPercent`,
 * `kPercent`, `bbPercent` are on Savant's native 0-100 PERCENT scale (e.g.
 * `8.8` means 8.8%). `xwoba` is on the true wOBA/OBP-like decimal scale
 * (e.g. `0.357`, NOT 35.7). For `playerType: "pitcher"`, `xwoba` and
 * `hardHitPercent` are the opponent-facing "allowed" reading (xwOBA allowed,
 * hard-hit% allowed) — Savant's `xwoba`/`hard_hit_percent` columns are the
 * same column names for both `type=batter` and `type=pitcher` leaderboard
 * queries, just computed over the opposite side of contact.
 */
export interface StatcastPlayerSeasonFeature {
  /** MLBAM player id (Savant's `player_id` column). */
  readonly mlbamId: number;
  /** The season these features apply TO — the season whose games they may
   * be used to predict. */
  readonly targetSeason: number;
  /** The season the underlying Statcast aggregate was actually measured in
   * (always targetSeason - 1). Kept for provenance/audit. */
  readonly sourceSeason: number;
  readonly playerType: StatcastPlayerType;
  /** Barrel rate, percent scale (batter's own for playerType "batter";
   * allowed-against for playerType "pitcher"). */
  readonly barrelRate: number | null;
  /** xwOBA (batter) / xwOBA allowed (pitcher), true decimal scale ~0-1. */
  readonly xwoba: number | null;
  /** Hard-hit%, percent scale (batter's own / allowed-against per playerType). */
  readonly hardHitPercent: number | null;
  /** K%, percent scale. */
  readonly kPercent: number | null;
  /** BB%, percent scale. */
  readonly bbPercent: number | null;
  /** ISO instant this record becomes safe to serve as a feature — the prior
   * season's conservative end-of-season cutoff (see ./mlb-season-boundaries.js). */
  readonly observedAt: string;
}

const SAVANT_SELECTIONS = "barrel_batted_rate,xwoba,hard_hit_percent,k_percent,bb_percent";

/** Build the Baseball Savant custom-leaderboard CSV export URL for one
 * (season, player type) pair. See header for the endpoint investigation. */
export function baseballSavantLeaderboardUrl(
  sourceSeason: number,
  type: StatcastPlayerType,
  minBattedBallEvents: number = 1,
): string {
  const params = new URLSearchParams({
    year: String(sourceSeason),
    type,
    filter: "",
    min: String(minBattedBallEvents),
    selections: SAVANT_SELECTIONS,
    csv: "true",
  });
  return `https://baseballsavant.mlb.com/leaderboard/custom?${params.toString()}`;
}

/**
 * Load PRIOR-SEASON Statcast player features for the requested target
 * seasons, covering both batters and pitchers. Two requests per target
 * season (one per `type`) — see baseballSavantLeaderboardUrl.
 */
export async function loadStatcastPriorSeasonFeatures(
  opts: LoadStatcastPriorSeasonFeaturesOptions,
): Promise<StatcastPlayerSeasonFeature[]> {
  const doFetch = opts.fetcher ?? fetch;
  const minEvents = opts.minBattedBallEvents ?? 1;
  const out: StatcastPlayerSeasonFeature[] = [];

  for (const targetSeason of opts.targetSeasons) {
    const sourceSeason = targetSeason - 1;
    for (const playerType of ["batter", "pitcher"] as const satisfies readonly StatcastPlayerType[]) {
      const url = baseballSavantLeaderboardUrl(sourceSeason, playerType, minEvents);
      const res = await doFetch(url);
      if (!res.ok) {
        throw new Error(`Baseball Savant custom leaderboard fetch failed (${res.status}) for ${url}`);
      }
      const text = await res.text();
      const table = parseCsv(text);
      for (const record of table.records) {
        const row = mapSavantRow(record, targetSeason, sourceSeason, playerType);
        if (row !== null) out.push(row);
      }
    }
  }

  return out;
}

// ── row mapping ────────────────────────────────────────────────────────────

function mapSavantRow(
  row: Readonly<Record<string, string>>,
  targetSeason: number,
  sourceSeason: number,
  playerType: StatcastPlayerType,
): StatcastPlayerSeasonFeature | null {
  const mlbamId = toInt(row["player_id"]);
  if (mlbamId === null) return null;

  return {
    mlbamId,
    targetSeason,
    sourceSeason,
    playerType,
    barrelRate: toNumber(row["barrel_batted_rate"]),
    xwoba: toNumber(row["xwoba"]),
    hardHitPercent: toNumber(row["hard_hit_percent"]),
    kPercent: toNumber(row["k_percent"]),
    bbPercent: toNumber(row["bb_percent"]),
    observedAt: mlbSeasonEndIso(sourceSeason),
  };
}

// ── minimal quote-aware CSV parser ──────────────────────────────────────────
// Deliberately self-contained (same RFC-4180-ish parser convention as
// ../loaders/nfl-games.ts — doubled-quote escaping, embedded commas —
// written fresh rather than shared/imported for the same reason nfl-games.ts
// gives: each loader in this directory is a complete, independently
// reviewable unit). Savant's own header row needs this: the FIRST column
// name is literally `last_name, first_name` — a comma inside a quoted field
// — so a naive `split(",")` would misparse every row.

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

  // Savant's CSV export is prefixed with a UTF-8 BOM on the header cell —
  // strip it so `row["last_name, first_name"]`-style lookups (and, more
  // importantly, every OTHER column name on the same header row) key
  // correctly rather than the first header cell silently keying under
  // "﻿last_name, first_name".
  const rawHeader = rows.shift() ?? [];
  const header = rawHeader.map((h, idx) => (idx === 0 ? h.replace(/^﻿/, "") : h));

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
