/**
 * nflverse → fantasy-engine NFL input mappers.
 *
 * Pure aggregation layer between nflverse CSV rows and the glass-box engine's
 * typed inputs (@sports/fantasy-engine): QbSeason, ReceiverSeason,
 * TeamOffensiveLine/TeamDefensiveLine, TeamSchemeTendencies,
 * TeamDefenseCategories, TeamWindowAggregates. The math mirrors the reference
 * engine's data prep verbatim (attempt-weighted trench aggregates, QB-room
 * sack rate, top-share concentration, pbp EPA/PROE windows), so mapper output
 * feeds the engine on the same conventions its golden fixtures were built on.
 *
 * Rights: nflverse is CC-BY-4.0 (source-rights registry "nflverse",
 * storage/derived/display all cleared; attribution required on outputs). The
 * app-side nflverse-gate still fronts every ingestion job.
 *
 * SCHEMA DISCIPLINE — verified-by-execution, enforced fail-closed:
 * The column names below are the exact reads the reference engine executed
 * against real nflverse downloads on 2026-07-11 (runs + outputs banked in the
 * confidential intel bank). This sandbox cannot re-fetch the release assets
 * (proxy scope), so instead of trusting the names silently, every parser here
 * ASSERTS its required columns exist in the actual header and THROWS with the
 * missing list otherwise: schema drift or a wrong asset name becomes a loud
 * failure, never a silently-empty or fabricated table (no-fake-data rule).
 */

import type {
  QbSeason,
  ReceiverSeason,
  TeamDefenseCategories,
  TeamDefensiveLine,
  TeamOffensiveLine,
  TeamSchemeTendencies,
  TeamWindowAggregates,
} from "@sports/fantasy-engine";
import type { CsvTable } from "./nflverse-source.js";

/** Reference team-code set (pbp uses "LA" for the Rams; keep both spellings). */
export const VALID_NFL_TEAMS: ReadonlySet<string> = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET",
  "GB", "HOU", "IND", "JAX", "KC", "LV", "LAC", "LA", "LAR", "MIA", "MIN",
  "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
]);

function num(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return Number.NaN;
  return Number(value);
}

/** Throw unless every required column is present in the parsed header. */
export function assertColumns(
  table: CsvTable,
  required: readonly string[],
  assetLabel: string,
): void {
  const have = new Set(table.header);
  const missing = required.filter((c) => !have.has(c));
  if (missing.length > 0) {
    throw new Error(
      `nflverse asset "${assetLabel}" is missing expected columns [${missing.join(", ")}] — ` +
        "schema drift or wrong asset. Refusing to parse (fail-closed; verify the release asset).",
    );
  }
}

// ── Season player stats (stats_player_reg_<season>) ───────────────────────────

export const PLAYER_SEASON_COLUMNS = [
  "player_display_name",
  "recent_team",
  "position",
  "games",
  "attempts",
  "carries",
  "rushing_yards",
  "rushing_tds",
  "fantasy_points",
  "sacks_suffered",
  "targets",
  "receiving_yards",
  "receiving_epa",
  "target_share",
] as const;

export interface NflPlayerSeasonRow {
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly passAttempts: number;
  readonly carries: number;
  readonly rushingYards: number;
  readonly rushingTds: number;
  readonly fantasyPoints: number;
  readonly sacksSuffered: number;
  readonly targets: number;
  readonly receivingYards: number;
  readonly receivingEpa: number;
  readonly targetShare: number;
}

export function parsePlayerSeasonRows(table: CsvTable): NflPlayerSeasonRow[] {
  assertColumns(table, PLAYER_SEASON_COLUMNS, "player season stats");
  return table.records
    .filter((r) => VALID_NFL_TEAMS.has(r["recent_team"] ?? ""))
    .map((r) => ({
      playerName: r["player_display_name"] ?? "",
      team: r["recent_team"] ?? "",
      position: r["position"] ?? "",
      games: num(r["games"]),
      passAttempts: num(r["attempts"]),
      carries: num(r["carries"]),
      rushingYards: num(r["rushing_yards"]),
      rushingTds: num(r["rushing_tds"]),
      fantasyPoints: num(r["fantasy_points"]),
      sacksSuffered: num(r["sacks_suffered"]),
      targets: num(r["targets"]),
      receivingYards: num(r["receiving_yards"]),
      receivingEpa: num(r["receiving_epa"]),
      targetShare: num(r["target_share"]),
    }));
}

/** QbSeason population (reference filter: QBs with ≥100 attempts). */
export function toQbSeasons(
  rows: readonly NflPlayerSeasonRow[],
  opts: { readonly minAttempts?: number } = {},
): Array<{ readonly row: NflPlayerSeasonRow; readonly season: QbSeason }> {
  const minAttempts = opts.minAttempts ?? 100;
  return rows
    .filter((r) => r.position === "QB" && r.passAttempts >= minAttempts)
    .map((r) => ({
      row: r,
      season: {
        id: `${r.playerName} (${r.team})`,
        games: r.games,
        passAttempts: r.passAttempts,
        carries: r.carries,
        rushingYards: r.rushingYards,
        rushingTds: r.rushingTds,
        fantasyPoints: r.fantasyPoints,
      },
    }));
}

// ── PFR advanced season stats ─────────────────────────────────────────────────

export const ADV_PASS_COLUMNS = ["team", "pass_attempts", "pressure_pct", "pocket_time"] as const;
export const ADV_RUSH_COLUMNS = ["tm", "att", "ybc_att"] as const;
export const ADV_REC_COLUMNS = [
  "player", "tm", "adot", "yac_r", "brk_tkl", "drop_percent", "rat",
] as const;
export const ADV_DEF_COLUMNS = [
  "tm", "tgt", "cmp_percent", "rat", "prss", "sk", "qbkd", "hrry",
] as const;

export interface AdvPassRow {
  readonly team: string;
  readonly passAttempts: number;
  readonly pressurePct: number;
  readonly pocketTime: number;
}
export interface AdvRushRow {
  readonly team: string;
  readonly attempts: number;
  readonly ybcPerAtt: number;
}
export interface AdvRecRow {
  readonly playerName: string;
  readonly team: string;
  readonly adot: number;
  readonly yacPerReception: number;
  readonly brokenTackles: number;
  readonly dropPercent: number;
  readonly ratingWhenTargeted: number;
}
export interface AdvDefRow {
  readonly team: string;
  readonly targets: number;
  readonly completionPct: number;
  readonly ratingAllowed: number;
  readonly pressures: number;
  readonly sacks: number;
  readonly qbKnockdowns: number;
  readonly hurries: number;
}

function seasonFilter(records: CsvTable["records"], season: number): CsvTable["records"] {
  // Season assets carry every year; the reference filters season == target.
  return records.filter((r) => r["season"] === undefined || Number(r["season"]) === season);
}

export function parseAdvPassRows(table: CsvTable, season: number): AdvPassRow[] {
  assertColumns(table, ADV_PASS_COLUMNS, "pfr advanced passing (season)");
  return seasonFilter(table.records, season)
    .filter((r) => VALID_NFL_TEAMS.has(r["team"] ?? ""))
    .map((r) => ({
      team: r["team"] ?? "",
      passAttempts: num(r["pass_attempts"]),
      pressurePct: num(r["pressure_pct"]),
      pocketTime: num(r["pocket_time"]),
    }));
}

export function parseAdvRushRows(table: CsvTable, season: number): AdvRushRow[] {
  assertColumns(table, ADV_RUSH_COLUMNS, "pfr advanced rushing (season)");
  return seasonFilter(table.records, season)
    .filter((r) => VALID_NFL_TEAMS.has(r["tm"] ?? ""))
    .map((r) => ({
      team: r["tm"] ?? "",
      attempts: num(r["att"]),
      ybcPerAtt: num(r["ybc_att"]),
    }));
}

export function parseAdvRecRows(table: CsvTable, season: number): AdvRecRow[] {
  assertColumns(table, ADV_REC_COLUMNS, "pfr advanced receiving (season)");
  return seasonFilter(table.records, season)
    .filter((r) => VALID_NFL_TEAMS.has(r["tm"] ?? ""))
    .map((r) => ({
      playerName: r["player"] ?? "",
      team: r["tm"] ?? "",
      adot: num(r["adot"]),
      yacPerReception: num(r["yac_r"]),
      brokenTackles: num(r["brk_tkl"]),
      dropPercent: num(r["drop_percent"]),
      ratingWhenTargeted: num(r["rat"]),
    }));
}

export function parseAdvDefRows(table: CsvTable, season: number): AdvDefRow[] {
  assertColumns(table, ADV_DEF_COLUMNS, "pfr advanced defense (season)");
  return seasonFilter(table.records, season)
    .filter((r) => VALID_NFL_TEAMS.has(r["tm"] ?? ""))
    .map((r) => ({
      team: r["tm"] ?? "",
      targets: num(r["tgt"]),
      completionPct: num(r["cmp_percent"]),
      ratingAllowed: num(r["rat"]),
      pressures: num(r["prss"]),
      sacks: num(r["sk"]),
      qbKnockdowns: num(r["qbkd"]),
      hurries: num(r["hrry"]),
    }));
}

// ── Trench (O-line / D-line) ──────────────────────────────────────────────────

function weightedMean(
  rows: readonly { readonly w: number; readonly v: number }[],
): number {
  let wSum = 0;
  let vSum = 0;
  for (const { w, v } of rows) {
    if (!Number.isFinite(v)) continue;
    const weight = Math.max(Number.isFinite(w) ? w : 1, 1);
    wSum += weight;
    vSum += v * weight;
  }
  return wSum > 0 ? vSum / wSum : Number.NaN;
}

/**
 * TeamOffensiveLine on the reference formulas: pass-attempt-weighted pressure
 * rate + pocket time (adv passing), QB-room sack rate sacks/(att+sacks)
 * (season player stats), attempt-weighted yards-before-contact (adv rushing).
 */
export function buildTeamOffensiveLines(
  advPass: readonly AdvPassRow[],
  advRush: readonly AdvRushRow[],
  players: readonly NflPlayerSeasonRow[],
): TeamOffensiveLine[] {
  const teams = new Set<string>([...advPass.map((r) => r.team), ...advRush.map((r) => r.team)]);
  const out: TeamOffensiveLine[] = [];
  for (const team of teams) {
    const pass = advPass.filter((r) => r.team === team);
    const rush = advRush.filter((r) => r.team === team);
    const qbs = players.filter((p) => p.team === team && p.position === "QB");
    const sacks = qbs.reduce((s, q) => s + (Number.isFinite(q.sacksSuffered) ? q.sacksSuffered : 0), 0);
    const att = qbs.reduce((s, q) => s + (Number.isFinite(q.passAttempts) ? q.passAttempts : 0), 0);
    out.push({
      team,
      pressurePct: weightedMean(pass.map((r) => ({ w: r.passAttempts, v: r.pressurePct }))),
      sackRate: att + sacks > 0 ? sacks / (att + sacks) : Number.NaN,
      pocketTime: weightedMean(pass.map((r) => ({ w: r.passAttempts, v: r.pocketTime }))),
      yardsBeforeContactPerAtt: weightedMean(rush.map((r) => ({ w: r.attempts, v: r.ybcPerAtt }))),
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}

/** TeamDefensiveLine: pass-rush counting stats summed per team. */
export function buildTeamDefensiveLines(advDef: readonly AdvDefRow[]): TeamDefensiveLine[] {
  const byTeam = new Map<string, AdvDefRow[]>();
  for (const row of advDef) {
    const list = byTeam.get(row.team) ?? [];
    list.push(row);
    byTeam.set(row.team, list);
  }
  const out: TeamDefensiveLine[] = [];
  for (const [team, rows] of byTeam) {
    const sum = (read: (r: AdvDefRow) => number) =>
      rows.reduce((s, r) => s + (Number.isFinite(read(r)) ? read(r) : 0), 0);
    out.push({
      team,
      pressures: sum((r) => r.pressures),
      sacks: sum((r) => r.sacks),
      qbKnockdowns: sum((r) => r.qbKnockdowns),
      hurries: sum((r) => r.hurries),
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}

// ── Receivers (WR/TE SMASH population) ────────────────────────────────────────

/**
 * ReceiverSeason population: WR/TE with ≥ minTargets (reference floor 30),
 * merged with PFR advanced receiving by (player, team) — a best-effort join
 * exactly like the reference; unmatched advanced fields stay NaN and the
 * engine's NaN policy (tier null, never a fabricated rating) handles them.
 * target_share falls back to targets/games/35 when the column is empty.
 */
export function buildReceiverSeasons(
  players: readonly NflPlayerSeasonRow[],
  advRec: readonly AdvRecRow[],
  opts: { readonly minTargets?: number } = {},
): Array<{ readonly row: NflPlayerSeasonRow; readonly season: ReceiverSeason }> {
  const minTargets = opts.minTargets ?? 30;
  const advByKey = new Map(advRec.map((r) => [`${r.playerName}|${r.team}`, r]));
  return players
    .filter(
      (p) => (p.position === "WR" || p.position === "TE") && p.targets >= minTargets,
    )
    .map((p) => {
      const adv = advByKey.get(`${p.playerName}|${p.team}`);
      const gp = Math.max(p.games, 1);
      const targetShare = Number.isFinite(p.targetShare)
        ? p.targetShare
        : p.targets / gp / 35;
      return {
        row: p,
        season: {
          id: `${p.playerName} (${p.team})`,
          recYardsPerGame: p.receivingYards / gp,
          targetShare,
          adot: adv?.adot ?? Number.NaN,
          yacPerReception: adv?.yacPerReception ?? Number.NaN,
          brokenTackles: adv?.brokenTackles ?? Number.NaN,
          ratingWhenTargeted: adv?.ratingWhenTargeted ?? Number.NaN,
          dropPercent: adv?.dropPercent ?? Number.NaN,
          receivingEpa: p.receivingEpa,
        },
      };
    });
}

// ── Play-by-play aggregates (scheme, defense, rolling windows) ────────────────

/** pbp projection columns (use with parseCsv({ columns }) — OOM defense). */
export const PBP_FANTASY_COLUMNS = [
  "game_id",
  "week",
  "posteam",
  "defteam",
  "pass",
  "rush",
  "pass_oe",
  "epa",
] as const;

export interface PbpFantasyPlay {
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly isPass: boolean;
  readonly isRush: boolean;
  /** Pass rate over expected for this play (percentage points); NaN when absent. */
  readonly passOe: number;
  readonly epa: number;
}

/**
 * Parse the projected pbp table to scrimmage plays (pass or rush), regular
 * season only (week ≤ 18 — the reference's window so every team has data).
 */
export function parsePbpFantasyPlays(
  table: CsvTable,
  opts: { readonly maxWeek?: number } = {},
): PbpFantasyPlay[] {
  assertColumns(table, PBP_FANTASY_COLUMNS, "play-by-play");
  const maxWeek = opts.maxWeek ?? 18;
  const plays: PbpFantasyPlay[] = [];
  for (const r of table.records) {
    const week = num(r["week"]);
    if (!(week <= maxWeek)) continue;
    const isPass = r["pass"] === "1";
    const isRush = r["rush"] === "1";
    if (!isPass && !isRush) continue;
    plays.push({
      gameId: r["game_id"] ?? "",
      week,
      posteam: r["posteam"] ?? "",
      defteam: r["defteam"] ?? "",
      isPass,
      isRush,
      passOe: num(r["pass_oe"]),
      epa: num(r["epa"]),
    });
  }
  return plays;
}

interface OffenseWindow {
  readonly playsPerGame: number;
  readonly proe: number;
  readonly offEpaPerPlay: number;
}

function offenseWindow(plays: readonly PbpFantasyPlay[]): OffenseWindow {
  const games = new Set(plays.map((p) => p.gameId)).size;
  const proeVals = plays.map((p) => p.passOe).filter((v) => Number.isFinite(v));
  const epaVals = plays.map((p) => p.epa).filter((v) => Number.isFinite(v));
  return {
    playsPerGame: games > 0 ? plays.length / games : Number.NaN,
    proe: proeVals.length > 0 ? proeVals.reduce((s, v) => s + v, 0) / proeVals.length : Number.NaN,
    offEpaPerPlay: epaVals.length > 0 ? epaVals.reduce((s, v) => s + v, 0) / epaVals.length : Number.NaN,
  };
}

function groupByTeam(
  plays: readonly PbpFantasyPlay[],
  key: "posteam" | "defteam",
): Map<string, PbpFantasyPlay[]> {
  const byTeam = new Map<string, PbpFantasyPlay[]>();
  for (const p of plays) {
    const team = p[key];
    if (!VALID_NFL_TEAMS.has(team)) continue;
    const list = byTeam.get(team) ?? [];
    list.push(p);
    byTeam.set(team, list);
  }
  return byTeam;
}

/** Top-share concentration (reference top_share): max/sum, NaN on zero total. */
export function topShare(values: readonly number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  const total = finite.reduce((s, v) => s + v, 0);
  if (total <= 0) return Number.NaN;
  return Math.max(...finite) / total;
}

/**
 * TeamSchemeTendencies: pace + PROE from pbp offense, concentration shares
 * from season player stats (lead-RB carries share, top WR/TE target share).
 */
export function buildTeamSchemeTendencies(
  plays: readonly PbpFantasyPlay[],
  players: readonly NflPlayerSeasonRow[],
): TeamSchemeTendencies[] {
  const out: TeamSchemeTendencies[] = [];
  for (const [team, g] of groupByTeam(plays, "posteam")) {
    const w = offenseWindow(g);
    const rbCarries = players
      .filter((p) => p.team === team && p.position === "RB")
      .map((p) => p.carries);
    const wrTargets = players
      .filter((p) => p.team === team && (p.position === "WR" || p.position === "TE"))
      .map((p) => p.targets);
    out.push({
      team,
      playsPerGame: w.playsPerGame,
      proe: w.proe,
      rbBellcowShare: topShare(rbCarries),
      wr1TargetShare: topShare(wrTargets),
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}

/**
 * TeamDefenseCategories: EPA/success splits from pbp defense + tgt-weighted
 * coverage (completion % and rating allowed) and pressure volume from PFR
 * advanced defense. Success = EPA > 0 (the reference definition).
 */
export function buildTeamDefenseCategories(
  plays: readonly PbpFantasyPlay[],
  advDef: readonly AdvDefRow[],
): TeamDefenseCategories[] {
  const covByTeam = new Map<string, { cmp: number; rat: number; prss: number }>();
  const defByTeam = new Map<string, AdvDefRow[]>();
  for (const row of advDef) {
    const list = defByTeam.get(row.team) ?? [];
    list.push(row);
    defByTeam.set(row.team, list);
  }
  for (const [team, rows] of defByTeam) {
    covByTeam.set(team, {
      cmp: weightedMean(rows.map((r) => ({ w: r.targets, v: r.completionPct }))),
      rat: weightedMean(rows.map((r) => ({ w: r.targets, v: r.ratingAllowed }))),
      prss: rows.reduce((s, r) => s + (Number.isFinite(r.pressures) ? r.pressures : 0), 0),
    });
  }

  const out: TeamDefenseCategories[] = [];
  for (const [team, g] of groupByTeam(plays, "defteam")) {
    const passPlays = g.filter((p) => p.isPass);
    const rushPlays = g.filter((p) => p.isRush);
    const mean = (vals: readonly number[]) => {
      const finite = vals.filter((v) => Number.isFinite(v));
      return finite.length > 0 ? finite.reduce((s, v) => s + v, 0) / finite.length : Number.NaN;
    };
    const successRate = (ps: readonly PbpFantasyPlay[]) => {
      const finite = ps.filter((p) => Number.isFinite(p.epa));
      return finite.length > 0
        ? finite.filter((p) => p.epa > 0).length / finite.length
        : Number.NaN;
    };
    const cov = covByTeam.get(team);
    out.push({
      team,
      passEpaAllowed: mean(passPlays.map((p) => p.epa)),
      rushEpaAllowed: mean(rushPlays.map((p) => p.epa)),
      rushSuccessRateAllowed: successRate(rushPlays),
      epaPerPlayAllowed: mean(g.map((p) => p.epa)),
      coverageCompletionPct: cov?.cmp ?? Number.NaN,
      coverageRating: cov?.rat ?? Number.NaN,
      pressures: cov?.prss ?? Number.NaN,
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}

/**
 * TeamWindowAggregates: full-season window vs the last `recentWeeks` weeks
 * (reference: max regular-season week − 3 → a 4-week recent window).
 */
export function buildTeamWindowAggregates(
  plays: readonly PbpFantasyPlay[],
  opts: { readonly recentWeeks?: number } = {},
): TeamWindowAggregates[] {
  const recentWeeks = opts.recentWeeks ?? 4;
  const weeks = plays.map((p) => p.week).filter((w) => Number.isFinite(w));
  if (weeks.length === 0) return [];
  const maxWeek = Math.max(...weeks);
  const lo = maxWeek - (recentWeeks - 1);
  const out: TeamWindowAggregates[] = [];
  for (const [team, g] of groupByTeam(plays, "posteam")) {
    out.push({
      team,
      season: offenseWindow(g),
      recent: offenseWindow(g.filter((p) => p.week >= lo)),
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}
