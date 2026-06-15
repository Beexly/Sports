/**
 * nflverse Data Adapter — GSE Evidence Source.
 *
 * nflverse (https://github.com/nflverse) publishes free NFL play-by-play,
 * player stats, injuries, and rosters as CSV/Parquet via GitHub releases.
 *
 * LICENSE: CC-BY-4.0 — attribution required, no share-alike. This covers
 *   every dataset used here (player stats, snaps, injuries, depth charts,
 *   rosters, pbp, NGS). Credit: "Data from nflverse
 *   (https://github.com/nflverse), CC-BY-4.0".
 *   NOTE: the one nflverse exception is FTN charting/participation data
 *   (2023+), which is CC-BY-SA-4.0 with attribution to FTN Data. We do NOT
 *   ingest FTN here; if that ever changes, it carries share-alike and needs
 *   its own attribution.
 *
 * DATA QUALITY: "authoritative-free" — nflverse is the canonical free NFL
 * data source, built from official play-by-play data by nflreadr maintainers.
 * It is NOT a real-time feed; data typically lags 24–48 hours post-game.
 *
 * USAGE NOTE: This adapter fetches CSV files directly from GitHub release
 * assets. GitHub releases are stable, versioned URLs — not scraping.
 */

export type NflverseDataQuality = "authoritative-free";
export type NflverseAttribution = "nflverse (https://github.com/nflverse), CC-BY-4.0";

export const NFLVERSE_ATTRIBUTION: NflverseAttribution =
  "nflverse (https://github.com/nflverse), CC-BY-4.0";

export const NFLVERSE_LICENSE = "CC-BY-4.0" as const;
export const NFLVERSE_BASE =
  "https://github.com/nflverse/nflverse-data/releases/download" as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type NflversePlayerStatRow = {
  readonly playerId: string;
  readonly playerName: string;
  readonly recentTeam: string;
  readonly season: number;
  readonly week: number;
  readonly seasonType: string;
  readonly position: string;
  readonly passingYards: number;
  readonly rushingYards: number;
  readonly receivingYards: number;
  readonly touchdowns: number;
  readonly carries: number;
  readonly targets: number;
  readonly receptions: number;
  readonly fantasyPointsPpr: number;
};

export type NflverseInjuryRow = {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly season: number;
  readonly week: number;
  readonly reportStatus: string;
  readonly practiceStatus: string;
  readonly primaryInjury: string;
};

export type NflverseRosterRow = {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly depthChartPosition: string;
  readonly season: number;
  readonly status: string;
  readonly yearsExp: number;
};

export type NflverseResult<T> = {
  readonly ok: true;
  readonly data: readonly T[];
  readonly season: number;
  readonly fetchedAt: string;
  readonly dataQuality: NflverseDataQuality;
  readonly attribution: NflverseAttribution;
  readonly license: typeof NFLVERSE_LICENSE;
  readonly source: "nflverse";
  readonly cacheMaxAgeSeconds: number;
};

export type NflverseError = {
  readonly ok: false;
  readonly status: number | "network-error" | "parse-error";
  readonly message: string;
  readonly season: number;
  readonly source: "nflverse";
};

export type Fetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

// ─── CSV parsing (minimal — nflverse CSVs are well-formed) ────────────────────

function parseNflverseCsv(raw: string): Array<Record<string, string>> {
  const lines = raw
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return headers.reduce<Record<string, string>>((row, h, i) => {
      row[h] = cells[i] ?? "";
      return row;
    }, {});
  });
}

function num(v: string | undefined): number {
  const n = parseFloat(v ?? "0");
  return isNaN(n) ? 0 : n;
}

// ─── Player stats ─────────────────────────────────────────────────────────────

function nflversePlayerStatsUrl(season: number): string {
  return `${NFLVERSE_BASE}/player_stats/player_stats_${season}.csv`;
}

function parsePlayerStatRow(row: Record<string, string>): NflversePlayerStatRow {
  return {
    playerId: row["player_id"] ?? "",
    playerName: row["player_display_name"] ?? row["player_name"] ?? "",
    recentTeam: row["recent_team"] ?? "",
    season: num(row["season"]),
    week: num(row["week"]),
    seasonType: row["season_type"] ?? "",
    position: row["position"] ?? "",
    passingYards: num(row["passing_yards"]),
    rushingYards: num(row["rushing_yards"]),
    receivingYards: num(row["receiving_yards"]),
    touchdowns: num(row["touchdowns"]),
    carries: num(row["carries"]),
    targets: num(row["targets"]),
    receptions: num(row["receptions"]),
    fantasyPointsPpr: num(row["fantasy_points_ppr"]),
  };
}

/**
 * Fetch seasonal player stats from nflverse.
 * Requires attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0"
 */
export async function fetchNflversePlayerStats(
  season: number,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<NflverseResult<NflversePlayerStatRow> | NflverseError> {
  const url = nflversePlayerStatsUrl(season);
  const fetchedAt = new Date().toISOString();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", season, source: "nflverse" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `nflverse returned HTTP ${response.status}.`, season, source: "nflverse" };
  }

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to read response body.", season, source: "nflverse" };
  }

  const rows = parseNflverseCsv(raw).map(parsePlayerStatRow);

  return {
    ok: true,
    data: rows,
    season,
    fetchedAt,
    dataQuality: "authoritative-free",
    attribution: NFLVERSE_ATTRIBUTION,
    license: NFLVERSE_LICENSE,
    source: "nflverse",
    cacheMaxAgeSeconds: 3600,
  };
}

// ─── Injuries ─────────────────────────────────────────────────────────────────

function nflverseInjuriesUrl(season: number): string {
  return `${NFLVERSE_BASE}/injuries/injuries_${season}.csv`;
}

function parseInjuryRow(row: Record<string, string>): NflverseInjuryRow {
  return {
    playerId: row["gsis_id"] ?? row["player_id"] ?? "",
    playerName: row["full_name"] ?? "",
    team: row["team"] ?? "",
    season: num(row["season"]),
    week: num(row["week"]),
    reportStatus: row["report_status"] ?? "",
    practiceStatus: row["practice_status"] ?? "",
    primaryInjury: row["primary_injury"] ?? "",
  };
}

/**
 * Fetch injury report data from nflverse for a given season.
 * Requires attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0"
 */
export async function fetchNflverseInjuries(
  season: number,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<NflverseResult<NflverseInjuryRow> | NflverseError> {
  const url = nflverseInjuriesUrl(season);
  const fetchedAt = new Date().toISOString();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", season, source: "nflverse" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `nflverse returned HTTP ${response.status}.`, season, source: "nflverse" };
  }

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to read response body.", season, source: "nflverse" };
  }

  const rows = parseNflverseCsv(raw).map(parseInjuryRow);

  return {
    ok: true,
    data: rows,
    season,
    fetchedAt,
    dataQuality: "authoritative-free",
    attribution: NFLVERSE_ATTRIBUTION,
    license: NFLVERSE_LICENSE,
    source: "nflverse",
    cacheMaxAgeSeconds: 1800,
  };
}

// ─── Rosters ─────────────────────────────────────────────────────────────────

function nflverseRosterUrl(season: number): string {
  return `${NFLVERSE_BASE}/rosters/roster_${season}.csv`;
}

function parseRosterRow(row: Record<string, string>): NflverseRosterRow {
  return {
    playerId: row["gsis_id"] ?? row["player_id"] ?? "",
    playerName: row["full_name"] ?? "",
    team: row["team"] ?? "",
    position: row["position"] ?? "",
    depthChartPosition: row["depth_chart_position"] ?? "",
    season: num(row["season"]),
    status: row["status"] ?? "",
    yearsExp: num(row["years_exp"]),
  };
}

/**
 * Fetch roster data from nflverse for a given season.
 * Requires attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0"
 */
export async function fetchNflverseRosters(
  season: number,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<NflverseResult<NflverseRosterRow> | NflverseError> {
  const url = nflverseRosterUrl(season);
  const fetchedAt = new Date().toISOString();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", season, source: "nflverse" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `nflverse returned HTTP ${response.status}.`, season, source: "nflverse" };
  }

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to read response body.", season, source: "nflverse" };
  }

  const rows = parseNflverseCsv(raw).map(parseRosterRow);

  return {
    ok: true,
    data: rows,
    season,
    fetchedAt,
    dataQuality: "authoritative-free",
    attribution: NFLVERSE_ATTRIBUTION,
    license: NFLVERSE_LICENSE,
    source: "nflverse",
    cacheMaxAgeSeconds: 7200,
  };
}

// ─── URL helpers (for tests and cache-key generation) ────────────────────────

export const nflverseUrls = {
  playerStats: nflversePlayerStatsUrl,
  injuries: nflverseInjuriesUrl,
  rosters: nflverseRosterUrl,
} as const;
