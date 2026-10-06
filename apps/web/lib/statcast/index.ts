/**
 * Baseball Savant / Statcast loader — MLB underlying metrics for the factor engine.
 *
 * Reads the public CSV export endpoints that Baseball Savant exposes on its
 * leaderboards (the same ones pybaseball documents). Season-aggregate rows only.
 * Historical fact, not a projection or pick — `canPublishProjections` stays false.
 *
 * Source: baseball-savant (source-registry, use-with-caution, facts-as-inputs).
 * Attribution: "Statcast data via Baseball Savant (baseballsavant.mlb.com)."
 */

import { assertIngestible, fetchWithFailover } from "@sports/data-ingestion";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SAVANT_BASE = "https://baseballsavant.mlb.com";

/** Statcast leaderboard CSV endpoints (season aggregates). */
function leaderboardCsvUrl(type: "batter" | "pitcher", year: number): string {
  return `${SAVANT_BASE}/leaderboard/statcast?csv=true&type=${type}&year=${year}&min=q`;
}

function sprintSpeedCsvUrl(year: number): string {
  return `${SAVANT_BASE}/leaderboard/sprint_speed?csv=true&year=${year}`;
}

export interface StatcastBatterLine {
  readonly playerName: string;
  readonly team: string;
  readonly pa: number;
  /** Average exit velocity (MPH). */
  readonly ev: number;
  /** Average of the hardest 50% of batted balls (MPH). */
  readonly ev50: number;
  /** Average launch angle (degrees). */
  readonly launchAngle: number;
  /** Launch angle sweet-spot % (8–32°). */
  readonly laSweetSpotPct: number;
  /** Hard-hit rate (95 MPH+). */
  readonly hardHitPct: number;
  /** Barrel rate per batted-ball event. */
  readonly barrelPct: number;
  /** Barrel rate per plate appearance. */
  readonly barrelPaPct: number;
  /** Expected batting average. */
  readonly xba: number;
  /** Expected slugging. */
  readonly xslg: number;
  /** Expected weighted on-base average. */
  readonly xwoba: number;
  /** Sprint speed (ft/sec, fastest one-second window). */
  readonly sprintSpeed: number;
  /** Runs at or above 30 ft/sec. */
  readonly bolts: number;
}

export interface StatcastPitcherLine {
  readonly playerName: string;
  readonly team: string;
  readonly bf: number;
  readonly ev: number;
  readonly ev50: number;
  readonly launchAngle: number;
  readonly hardHitPct: number;
  readonly barrelPct: number;
  readonly xba: number;
  readonly xslg: number;
  readonly xwoba: number;
}

export interface StatcastLoadResult<T> {
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly rows: readonly T[];
  readonly error?: string;
}

/** Minimal CSV parser for Savant's simple comma-delimited exports. */
function parseSimpleCsv(text: string): ReadonlyArray<Readonly<Record<string, string>>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headerLine = lines[0] ?? "";
  const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Array<Readonly<Record<string, string>>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] ?? "").split(",");
    if (cols.length < headers.length) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (key === undefined) continue;
      row[key] = (cols[j] ?? "").trim().replace(/^"|"$/g, "");
    }
    rows.push(row);
  }
  return rows;
}

function num(v: string | undefined): number {
  if (v == null || v === "" || v === "null" || v === "NA") return Number.NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function str(v: string | undefined): string {
  return (v ?? "").trim();
}

/** Map a Savant batter leaderboard row to our typed line. */
function mapBatterRow(r: Readonly<Record<string, string>>): StatcastBatterLine | null {
  const name = str(r.player_name ?? r["last_name, first_name"] ?? r.player);
  if (!name) return null;
  return {
    playerName: name,
    team: str(r.team),
    pa: num(r.pa ?? r.plate_appearances),
    ev: num(r.evl ?? r.avg_hit_speed ?? r.exit_velocity),
    ev50: num(r.ev50 ?? r["ev50"]),
    launchAngle: num(r.launch_angle ?? r.avg_launch_angle),
    laSweetSpotPct: num(r.launch_angle ?? r["la sweet-spot"] ?? r.la_sweet_spot_pct),
    hardHitPct: num(r.hard_hit_percent ?? r["hard_hit_percent"] ?? r.hardhit_percent),
    barrelPct: num(r.barrel_percent ?? r["barrel_percent"] ?? r.barrels_per_bbe),
    barrelPaPct: num(r.barrel_pa_percent ?? r["barrel_pa_percent"] ?? r.barrels_per_pa),
    xba: num(r.xba ?? r.batting_avg),
    xslg: num(r.xslg ?? r.slugging_percent),
    xwoba: num(r.xwoba ?? r.on_base_percent),
    sprintSpeed: num(r.sprint_speed ?? r["sprint_speed"]),
    bolts: num(r.bolts ?? r["bolts"]),
  };
}

/** Map a Savant pitcher leaderboard row to our typed line. */
function mapPitcherRow(r: Readonly<Record<string, string>>): StatcastPitcherLine | null {
  const name = str(r.player_name ?? r["last_name, first_name"] ?? r.player);
  if (!name) return null;
  return {
    playerName: name,
    team: str(r.team),
    bf: num(r.bf ?? r.batters_faced),
    ev: num(r.evl ?? r.avg_hit_speed ?? r.exit_velocity),
    ev50: num(r.ev50 ?? r["ev50"]),
    launchAngle: num(r.launch_angle ?? r.avg_launch_angle),
    hardHitPct: num(r.hard_hit_percent ?? r["hard_hit_percent"]),
    barrelPct: num(r.barrel_percent ?? r["barrel_percent"]),
    xba: num(r.xba ?? r.batting_avg),
    xslg: num(r.xslg ?? r.slugging_percent),
    xwoba: num(r.xwoba ?? r.on_base_percent),
  };
}

async function fetchCsv(
  url: string,
  fetcher: FetchLike,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    assertIngestible("baseball-savant");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "source not cleared" };
  }
  try {
    const res = await fetchWithFailover([url], fetcher, {
      timeoutMs: 20_000,
    });
    const text = await res.response.text();
    if (!text || text.length < 50) {
      return { ok: false, error: `empty or truncated CSV from ${url}` };
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Load season-aggregate Statcast batting lines for a given year.
 * Returns an honest source-error on failure — never fabricates rows.
 */
export async function loadStatcastBatters(
  season: number,
  fetcher: FetchLike = fetch,
): Promise<StatcastLoadResult<StatcastBatterLine>> {
  const result = await fetchCsv(leaderboardCsvUrl("batter", season), fetcher);
  if (!result.ok) {
    return { status: "source-error", season, sourceRows: 0, rows: [], error: result.error };
  }
  const parsed = parseSimpleCsv(result.text);
  const rows = parsed.map(mapBatterRow).filter((r): r is StatcastBatterLine => r != null);
  return { status: "live", season, sourceRows: parsed.length, rows };
}

/**
 * Load season-aggregate Statcast pitching lines for a given year.
 */
export async function loadStatcastPitchers(
  season: number,
  fetcher: FetchLike = fetch,
): Promise<StatcastLoadResult<StatcastPitcherLine>> {
  const result = await fetchCsv(leaderboardCsvUrl("pitcher", season), fetcher);
  if (!result.ok) {
    return { status: "source-error", season, sourceRows: 0, rows: [], error: result.error };
  }
  const parsed = parseSimpleCsv(result.text);
  const rows = parsed.map(mapPitcherRow).filter((r): r is StatcastPitcherLine => r != null);
  return { status: "live", season, sourceRows: parsed.length, rows };
}

/**
 * Load sprint speed leaderboard (batters only).
 */
export async function loadSprintSpeed(
  season: number,
  fetcher: FetchLike = fetch,
): Promise<StatcastLoadResult<{ playerName: string; team: string; sprintSpeed: number; bolts: number }>> {
  const result = await fetchCsv(sprintSpeedCsvUrl(season), fetcher);
  if (!result.ok) {
    return { status: "source-error", season, sourceRows: 0, rows: [], error: result.error };
  }
  const parsed = parseSimpleCsv(result.text);
  const rows = parsed
    .map((r) => {
      const name = str(r.player_name ?? r["last_name, first_name"] ?? r.player);
      if (!name) return null;
      return {
        playerName: name,
        team: str(r.team),
        sprintSpeed: num(r.sprint_speed ?? r["sprint_speed"]),
        bolts: num(r.bolts ?? r["bolts"]),
      };
    })
    .filter((r): r is { playerName: string; team: string; sprintSpeed: number; bolts: number } => r != null);
  return { status: "live", season, sourceRows: parsed.length, rows };
}

/**
 * Find a batter's Statcast line by fuzzy name match.
 * Returns null when not found — the caller treats that as an ABSENT factor.
 */
export function findBatter(
  rows: readonly StatcastBatterLine[],
  playerName: string,
): StatcastBatterLine | null {
  const target = playerName.toLowerCase().trim();
  // Exact match first
  const exact = rows.find((r) => r.playerName.toLowerCase() === target);
  if (exact) return exact;
  // Last-name match (handles "Smith, John" vs "John Smith")
  const last = target.split(/[\s,]+/).pop() ?? target;
  const matches = rows.filter((r) => r.playerName.toLowerCase().includes(last));
  const first = matches.length === 1 ? matches[0] : undefined;
  return first ?? null;
}

/**
 * Find a pitcher's Statcast line by fuzzy name match.
 */
export function findPitcher(
  rows: readonly StatcastPitcherLine[],
  playerName: string,
): StatcastPitcherLine | null {
  const target = playerName.toLowerCase().trim();
  const exact = rows.find((r) => r.playerName.toLowerCase() === target);
  if (exact) return exact;
  const last = target.split(/[\s,]+/).pop() ?? target;
  const matches = rows.filter((r) => r.playerName.toLowerCase().includes(last));
  const first = matches.length === 1 ? matches[0] : undefined;
  return first ?? null;
}
