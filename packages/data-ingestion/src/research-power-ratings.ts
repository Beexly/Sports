/**
 * Research-corpus NFL power-ratings loader (docs/research full-tables).
 *
 * Unused capacity this wires: the X-sweep CSVs under
 * `docs/research/2026-09-22/full-tables/` (composite power ratings and
 * market-implied objective power ratings) sat in the repo with no ingest path.
 *
 * HOW: parse CSV text into team-strength rows keyed by NFL abbreviation.
 * Two scales:
 *   - `composite` — expected spread vs an average team (points)
 *   - `market_implied_win_pct` — P(beat average team on a neutral field), 0–100
 *
 * Default OFF. `RESEARCH_POWER_RATINGS_ENABLED` must be an explicit true/1/yes/on
 * before any file is read. Absence of a file, empty parse, or stale as-of date
 * all yield null (honest no-opinion) — never a stub rating.
 *
 * Rights: transcribed public research tables already committed under
 * docs/research/; no network, no scrape at runtime.
 */

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { envFlagEnabled } from "./fail-closed-env.js";

export const RESEARCH_POWER_RATINGS_SOURCE = "research_power_ratings";
export const RESEARCH_POWER_RATINGS_FLAG = "RESEARCH_POWER_RATINGS_ENABLED";
export const RESEARCH_POWER_RATINGS_DIR_ENV = "RESEARCH_POWER_RATINGS_DIR";
export const RESEARCH_POWER_RATINGS_MAX_AGE_DAYS_ENV =
  "RESEARCH_POWER_RATINGS_MAX_AGE_DAYS";

/** Default: repo-relative research folder from the 2026-09-22 AM/PM sweep. */
export const DEFAULT_RESEARCH_POWER_RATINGS_DIR = join(
  "docs",
  "research",
  "2026-09-22",
  "full-tables",
);
export const DEFAULT_COMPOSITE_CSV = "samhoppen-composite-power-ratings-week3.csv";
export const DEFAULT_OBJECTIVE_CSV = "benbbaldwin-objective-power-ratings-week2.csv";

/** Snapshots older than this are refused (stale for a live slate). */
export const DEFAULT_MAX_AGE_DAYS = 21;

export function isResearchPowerRatingsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, RESEARCH_POWER_RATINGS_FLAG);
}

export type ResearchTeamRating = {
  readonly team: string;
  /** Points vs league average (composite). Null when only win% is present. */
  readonly rating: number | null;
  /** P(beat average team on neutral field) in (0, 1). Null when only points. */
  readonly winPctVsAvg: number | null;
  readonly rank: number | null;
};

export type ResearchPowerRatingsTable = {
  readonly teams: ReadonlyMap<string, ResearchTeamRating>;
  /** ISO timestamp of the snapshot (file mtime or caller-supplied). */
  readonly asOf: string;
  readonly source: string;
  readonly rowCount: number;
};

/** Full NFL franchise name → abbreviation (CSVs use abbreviations). */
export const NFL_NAME_TO_ABBR: Readonly<Record<string, string>> = {
  "arizona cardinals": "ARI",
  "atlanta falcons": "ATL",
  "baltimore ravens": "BAL",
  "buffalo bills": "BUF",
  "carolina panthers": "CAR",
  "chicago bears": "CHI",
  "cincinnati bengals": "CIN",
  "cleveland browns": "CLE",
  "dallas cowboys": "DAL",
  "denver broncos": "DEN",
  "detroit lions": "DET",
  "green bay packers": "GB",
  "houston texans": "HOU",
  "indianapolis colts": "IND",
  "jacksonville jaguars": "JAX",
  "kansas city chiefs": "KC",
  "las vegas raiders": "LV",
  "los angeles chargers": "LAC",
  "los angeles rams": "LAR",
  "miami dolphins": "MIA",
  "minnesota vikings": "MIN",
  "new england patriots": "NE",
  "new orleans saints": "NO",
  "new york giants": "NYG",
  "new york jets": "NYJ",
  "philadelphia eagles": "PHI",
  "pittsburgh steelers": "PIT",
  "san francisco 49ers": "SF",
  "seattle seahawks": "SEA",
  "tampa bay buccaneers": "TB",
  "tennessee titans": "TEN",
  "washington commanders": "WAS",
};

/** Abbreviations accepted as-is (CSV native form). */
const NFL_ABBRS: ReadonlySet<string> = new Set(Object.values(NFL_NAME_TO_ABBR));

/**
 * Resolve a game team name or CSV token to an NFL abbreviation.
 * Returns null when the token is not a known franchise — never guess.
 */
export function resolveNflTeamAbbr(name: string): string | null {
  const t = name.trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (NFL_ABBRS.has(upper)) return upper;
  const byName = NFL_NAME_TO_ABBR[t.toLowerCase()];
  if (byName) return byName;
  // Accept "Los Angeles Rams" / "LA Rams" style: last token as abbr if known.
  const parts = t.split(/\s+/);
  const last = parts[parts.length - 1]?.toUpperCase() ?? "";
  if (NFL_ABBRS.has(last)) return last;
  return null;
}

function parseNum(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/%/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "–" || cleaned === "—") {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim());
}

/**
 * Parse composite power-ratings CSV:
 *   rank,team,composite,std_dev,fpi,...
 * `composite` is expected spread vs an average team (points).
 * Pure: exported for testing.
 */
export function parseCompositePowerRatingsCsv(csvText: string): ResearchTeamRating[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const teamIdx = headers.indexOf("team");
  const compositeIdx = headers.indexOf("composite");
  const rankIdx = headers.indexOf("rank");
  if (teamIdx === -1 || compositeIdx === -1) return [];
  const out: ResearchTeamRating[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const abbr = resolveNflTeamAbbr(cells[teamIdx] ?? "");
    const rating = parseNum(cells[compositeIdx]);
    if (!abbr || rating == null) continue;
    out.push({
      team: abbr,
      rating,
      winPctVsAvg: null,
      rank: rankIdx >= 0 ? parseNum(cells[rankIdx]) : null,
    });
  }
  return out;
}

/**
 * Parse objective power-ratings CSV:
 *   tier,rank,team,market_implied_win_pct
 * Win% is vs a league-average team on a neutral field (0–100 in the file).
 * Pure: exported for testing.
 */
export function parseObjectivePowerRatingsCsv(csvText: string): ResearchTeamRating[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const teamIdx = headers.indexOf("team");
  const pctIdx = headers.findIndex((h) => h.includes("win") && h.includes("pct"));
  const rankIdx = headers.indexOf("rank");
  if (teamIdx === -1 || pctIdx === -1) return [];
  const out: ResearchTeamRating[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const abbr = resolveNflTeamAbbr(cells[teamIdx] ?? "");
    const pct = parseNum(cells[pctIdx]);
    if (!abbr || pct == null) continue;
    const winPctVsAvg = pct > 1 ? pct / 100 : pct;
    if (!(winPctVsAvg > 0 && winPctVsAvg < 1)) continue;
    out.push({
      team: abbr,
      rating: null,
      winPctVsAvg,
      rank: rankIdx >= 0 ? parseNum(cells[rankIdx]) : null,
    });
  }
  return out;
}

/** Merge two row lists: composite points win when both present; win% fills gaps. */
export function mergeResearchRatings(
  composite: readonly ResearchTeamRating[],
  objective: readonly ResearchTeamRating[],
): Map<string, ResearchTeamRating> {
  const byTeam = new Map<string, ResearchTeamRating>();
  for (const o of objective) {
    byTeam.set(o.team, o);
  }
  for (const c of composite) {
    const prev = byTeam.get(c.team);
    if (!prev) {
      byTeam.set(c.team, c);
      continue;
    }
    byTeam.set(c.team, {
      team: c.team,
      rating: c.rating,
      winPctVsAvg: prev.winPctVsAvg,
      rank: c.rank ?? prev.rank,
    });
  }
  return byTeam;
}

export type LoadResearchPowerRatingsOptions = {
  readonly env?: NodeJS.ProcessEnv;
  readonly dir?: string;
  readonly compositeCsv?: string;
  readonly objectiveCsv?: string;
  /** Override snapshot timestamp (tests). Default: newest file mtime. */
  readonly asOf?: Date;
  readonly now?: () => Date;
};

/**
 * Load research power ratings from disk. Returns null when the flag is off,
 * files are missing, parse yields nothing, or the snapshot is older than the
 * max-age window. Never fabricates a table.
 */
export async function loadResearchPowerRatings(
  options: LoadResearchPowerRatingsOptions = {},
): Promise<ResearchPowerRatingsTable | null> {
  const env = options.env ?? process.env;
  if (!isResearchPowerRatingsEnabled(env)) return null;

  const dir =
    options.dir ??
    env[RESEARCH_POWER_RATINGS_DIR_ENV]?.trim() ??
    DEFAULT_RESEARCH_POWER_RATINGS_DIR;
  const compositeName = options.compositeCsv ?? DEFAULT_COMPOSITE_CSV;
  const objectiveName = options.objectiveCsv ?? DEFAULT_OBJECTIVE_CSV;

  let compositeText = "";
  let objectiveText = "";
  let newestMtimeMs = 0;
  try {
    const cPath = join(dir, compositeName);
    compositeText = await readFile(cPath, "utf8");
    const cStat = await stat(cPath);
    newestMtimeMs = Math.max(newestMtimeMs, cStat.mtimeMs);
  } catch {
    compositeText = "";
  }
  try {
    const oPath = join(dir, objectiveName);
    objectiveText = await readFile(oPath, "utf8");
    const oStat = await stat(oPath);
    newestMtimeMs = Math.max(newestMtimeMs, oStat.mtimeMs);
  } catch {
    objectiveText = "";
  }

  const composite = parseCompositePowerRatingsCsv(compositeText);
  const objective = parseObjectivePowerRatingsCsv(objectiveText);
  const teams = mergeResearchRatings(composite, objective);
  if (teams.size === 0) return null;

  const now = options.now ?? (() => new Date());
  const asOfDate =
    options.asOf ?? (newestMtimeMs > 0 ? new Date(newestMtimeMs) : now());
  const maxAgeDays = Number(
    env[RESEARCH_POWER_RATINGS_MAX_AGE_DAYS_ENV]?.trim() ?? DEFAULT_MAX_AGE_DAYS,
  );
  const limitDays = Number.isFinite(maxAgeDays) && maxAgeDays > 0 ? maxAgeDays : DEFAULT_MAX_AGE_DAYS;
  const ageMs = now().getTime() - asOfDate.getTime();
  if (ageMs > limitDays * 24 * 3_600_000) return null;

  return {
    teams,
    asOf: asOfDate.toISOString(),
    source: RESEARCH_POWER_RATINGS_SOURCE,
    rowCount: teams.size,
  };
}

/** Resolve one team's rating from a loaded table (abbreviation or full name). */
export function lookupResearchRating(
  table: ResearchPowerRatingsTable,
  teamName: string,
): ResearchTeamRating | null {
  const abbr = resolveNflTeamAbbr(teamName);
  if (!abbr) return null;
  return table.teams.get(abbr) ?? null;
}
