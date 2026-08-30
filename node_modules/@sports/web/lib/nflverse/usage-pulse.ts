import { fetchNflverseTableCached, nflverseUrl } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

export interface NflverseUsagePlayerRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly opponent: string;
  readonly position: string;
  readonly targets: number;
  readonly receptions: number;
  readonly carries: number;
  readonly opportunities: number;
  readonly targetShare: number | null;
  readonly airYardsShare: number | null;
  readonly wopr: number | null;
  readonly receivingAirYards: number;
  readonly receivingYards: number;
  readonly rushingYards: number;
  readonly fantasyPointsPpr: number;
  readonly age: number | null;
  readonly headshotUrl: string | null;
}

export interface NflverseQbAgeRow {
  readonly team: string;
  readonly opponent: string;
  readonly qbName: string;
  readonly qbAge: number | null;
  readonly qbAgeBucket: "34+" | "30-33" | "under-30" | "unknown";
  readonly passAttempts: number;
  readonly teamTargets: number;
  readonly rbTargets: number;
  /** RB targets as a share of TEAM targets (not QB pass attempts). */
  readonly rbTargetShare: number | null;
}

export interface NflverseUsagePulse {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly week: number | null;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly seasonRows: number;
  readonly latestWeekRows: number;
  readonly playerRows: readonly NflverseUsagePlayerRow[];
  readonly qbAgeRows: readonly NflverseQbAgeRow[];
  readonly canPublishTrends: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"playerStats" | "rosters", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface RosterProfile {
  readonly fullName: string;
  readonly birthDate: string;
  readonly headshotUrl: string;
}

let usagePulseCache: { readonly expiresAt: number; readonly value: NflverseUsagePulse } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function ageOnWeek(birthDate: string | undefined, season: number, week: number): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const gameDate = new Date(Date.UTC(season, 8, 1 + week * 7));
  let age = gameDate.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    gameDate.getUTCMonth() < birth.getUTCMonth() ||
    (gameDate.getUTCMonth() === birth.getUTCMonth() && gameDate.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function qbAgeBucket(age: number | null): NflverseQbAgeRow["qbAgeBucket"] {
  if (age === null) return "unknown";
  if (age >= 34) return "34+";
  if (age >= 30) return "30-33";
  return "under-30";
}

function rosterMap(records: readonly CsvRecord[]): Map<string, RosterProfile> {
  const profiles = new Map<string, RosterProfile>();
  for (const row of records) {
    const id = row["gsis_id"];
    if (!id) continue;
    profiles.set(id, {
      fullName: row["full_name"] ?? "",
      birthDate: row["birth_date"] ?? "",
      headshotUrl: row["headshot_url"] ?? "",
    });
  }
  return profiles;
}

function buildPlayerRows({
  latestRows,
  profiles,
  season,
  week,
}: {
  latestRows: readonly CsvRecord[];
  profiles: Map<string, RosterProfile>;
  season: number;
  week: number;
}): NflverseUsagePlayerRow[] {
  const skillPositions = new Set(["RB", "WR", "TE"]);
  return latestRows
    .filter((row) => skillPositions.has(row["position"] ?? ""))
    .map((row): NflverseUsagePlayerRow => {
      const profile = profiles.get(row["player_id"] ?? "");
      const targets = toNumber(row["targets"]);
      const carries = toNumber(row["carries"]);
      const playerName = row["player_display_name"] || row["player_name"] || profile?.fullName || "UNKNOWN";
      return {
        playerId: row["player_id"] ?? "",
        playerName,
        team: row["recent_team"] ?? "",
        opponent: row["opponent_team"] ?? "",
        position: row["position"] ?? "",
        targets,
        receptions: toNumber(row["receptions"]),
        carries,
        opportunities: targets + carries,
        targetShare: toNullableNumber(row["target_share"]),
        airYardsShare: toNullableNumber(row["air_yards_share"]),
        wopr: toNullableNumber(row["wopr"]),
        receivingAirYards: toNumber(row["receiving_air_yards"]),
        receivingYards: toNumber(row["receiving_yards"]),
        rushingYards: toNumber(row["rushing_yards"]),
        fantasyPointsPpr: toNumber(row["fantasy_points_ppr"]),
        age: ageOnWeek(profile?.birthDate, season, week),
        headshotUrl: row["headshot_url"] || profile?.headshotUrl || null,
      };
    })
    .filter((row) => row.opportunities > 0)
    .sort((a, b) => b.opportunities - a.opportunities || b.fantasyPointsPpr - a.fantasyPointsPpr)
    .slice(0, 24);
}

function buildQbAgeRows({
  latestRows,
  profiles,
  season,
  week,
}: {
  latestRows: readonly CsvRecord[];
  profiles: Map<string, RosterProfile>;
  season: number;
  week: number;
}): NflverseQbAgeRow[] {
  const teams = new Set(latestRows.map((row) => row["recent_team"]).filter((team): team is string => Boolean(team)));
  const rows: NflverseQbAgeRow[] = [];

  for (const team of teams) {
    const teamRows = latestRows.filter((row) => row["recent_team"] === team);
    const qbRows = teamRows.filter((row) => row["position"] === "QB" && toNumber(row["attempts"]) > 0);
    if (qbRows.length === 0) continue;
    const startingQb = qbRows.sort((a, b) => toNumber(b["attempts"]) - toNumber(a["attempts"]))[0]!;
    const passAttempts = qbRows.reduce((sum, row) => sum + toNumber(row["attempts"]), 0);
    /** team_targets = sum of every player's targets on the team for the week.
     * In nflverse player_stats: target_share = player_targets / team_targets,
     * so team_targets = sum(targets) across all players on the team. We use
     * the raw sum (not QB pass attempts) as the denominator for rbTargetShare. */
    const teamTargets = teamRows.reduce((sum, row) => sum + toNumber(row["targets"]), 0);
    const rbTargets = teamRows
      .filter((row) => row["position"] === "RB")
      .reduce((sum, row) => sum + toNumber(row["targets"]), 0);
    const profile = profiles.get(startingQb["player_id"] ?? "");
    const age = ageOnWeek(profile?.birthDate, season, week);

    rows.push({
      team,
      opponent: startingQb["opponent_team"] ?? "",
      qbName: startingQb["player_display_name"] || startingQb["player_name"] || profile?.fullName || "UNKNOWN",
      qbAge: age,
      qbAgeBucket: qbAgeBucket(age),
      passAttempts,
      teamTargets,
      rbTargets,
      rbTargetShare: teamTargets > 0 ? rbTargets / teamTargets : null,
    });
  }

  return rows
    .sort((a, b) => (b.qbAge ?? -1) - (a.qbAge ?? -1) || (b.rbTargetShare ?? -1) - (a.rbTargetShare ?? -1))
    .slice(0, 16);
}

function resolveActiveSeason(records: readonly CsvRecord[], requestedSeason: number): number {
  const seasons = Array.from(
    new Set(
      records
        .filter((row) => row["season_type"] === "REG")
        .map((row) => toNumber(row["season"]))
        .filter((season) => season > 0),
    ),
  ).sort((a, b) => a - b);
  const atOrBeforeRequested = seasons.filter((season) => season <= requestedSeason);
  return atOrBeforeRequested.at(-1) ?? seasons.at(-1) ?? requestedSeason;
}

export function resetNflverseUsagePulseCacheForTests(): void {
  usagePulseCache = null;
}

export async function loadNflverseUsagePulse({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseUsagePulse> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && usagePulseCache && usagePulseCache.expiresAt > now) {
    return usagePulseCache.value;
  }

  try {
    const statsResult = await fetchNflverseTableCached({ key: "player_stats_week", season, fetcher, timeoutMs });
    const stats = { url: statsResult.url, records: statsResult.table.records };
    const activeSeason = resolveActiveSeason(stats.records, season);
    const rostersResult = await fetchNflverseTableCached({
      key: "rosters",
      season: activeSeason,
      fetcher,
      timeoutMs,
    });
    const rosters = { url: rostersResult.url, records: rostersResult.table.records };
    const seasonRows = stats.records.filter(
      (row) => row["season"] === String(activeSeason) && row["season_type"] === "REG",
    );
    const week = seasonRows.reduce((max, row) => Math.max(max, toNumber(row["week"])), 0);
    const latestRows = week > 0 ? seasonRows.filter((row) => toNumber(row["week"]) === week) : [];
    const profiles = rosterMap(rosters.records);
    const value: NflverseUsagePulse = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      week: week || null,
      seasonType: "REG",
      sourceRows: stats.records.length,
      seasonRows: seasonRows.length,
      latestWeekRows: latestRows.length,
      playerRows: week > 0 ? buildPlayerRows({ latestRows, profiles, season, week }) : [],
      qbAgeRows: week > 0 ? buildQbAgeRows({ latestRows, profiles, season, week }) : [],
      canPublishTrends: false,
      blockReason:
        "This pulse reads real nflverse rows directly. It is not a published betting pick or statistically significant trend until persisted joins and tests clear.",
      sourceUrls: {
        playerStats: stats.url,
        rosters: rosters.url,
      },
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) usagePulseCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season,
      week: null,
      seasonType: "REG",
      sourceRows: 0,
      seasonRows: 0,
      latestWeekRows: 0,
      playerRows: [],
      qbAgeRows: [],
      canPublishTrends: false,
      blockReason:
        "The nflverse usage pulse could not load source rows. The product must show an empty state instead of fabricated usage data.",
      sourceUrls: {
        playerStats: nflverseUrl("player_stats_week", season),
        rosters: nflverseUrl("rosters", season),
      },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
