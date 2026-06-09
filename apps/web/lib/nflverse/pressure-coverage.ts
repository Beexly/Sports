import {
  assertIngestible,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  withMirrors,
} from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * Pressure & Coverage — PFR advanced charting via the nflverse `pfr_advstats`
 * release (CC-BY-4.0): how much pressure each QB faces/handles, and how throwable
 * each defender in coverage is. These are charting facts no box score carries.
 * The per-week files carry `pfr_player_name`, so no ID join is needed. Read-only,
 * historical, gated; `canPublishProjections` stays false.
 */

export interface QbPressureRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly pressurePct: number; // 0..1 mean share of dropbacks pressured
  readonly badThrowPct: number; // 0..1
  readonly sacks: number;
  readonly blitzesFaced: number;
  // ── PFR advanced PASS charting (real advstats_week_pass columns) ──────────────
  // All null when the source season lacks the column (honest dash, never invented).
  readonly pocketTime: number | null; // seconds, mean time to throw/sack (pocket_time)
  readonly timesHurried: number; // sum of times_hurried
  readonly timesHit: number; // sum of times_hit
  readonly onTgtPct: number | null; // 0..1 mean on-target throw rate (on_tgt_pct)
  readonly rpoPlays: number; // sum of rpo_plays
  readonly rpoYards: number; // sum of rpo_yards
  readonly paPassAtt: number; // sum of pa_pass_att (play-action attempts)
  readonly paPassYards: number; // sum of pa_pass_yards
  readonly battedBalls: number; // sum of batted_balls
  readonly throwaways: number; // sum of throwaways
}

export interface CoverageRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly targets: number;
  readonly completionsAllowed: number;
  readonly completionPct: number; // 0..1
  readonly yardsPerTarget: number;
  readonly passerRatingAllowed: number; // 0..158.3, target-weighted
  readonly missedTacklePct: number; // 0..1 mean
  // ── PFR advanced DEF pass-rush charting (real advstats_week_def columns) ──────
  readonly adotAllowed: number | null; // mean depth of target conceded (def_adot)
  readonly blitzes: number; // sum of def_blitzes
  readonly hurries: number; // sum of def_hurries
  readonly qbKnockdowns: number; // sum of def_qbkd
  readonly pressures: number; // sum of def_pressures
  readonly sacks: number; // sum of def_sacks (individual)
}

/**
 * Receiver charting from the PFR advanced `advstats_week_rec` variant — the
 * receiver-side companion to coverage. ADOT (average depth of target), true drops
 * and drop%, and broken tackles are charting facts no box score carries. The
 * weekly rec file uses PFR short column names (`tgt`, `rec`, `yds`, `adot`, `ybc`,
 * `yac`, `brk_tkl`, `drop`, `drop_pct`, `rat`); we tolerate the season-file aliases
 * the same way rushing-contact.ts does, so synthetic/season inputs still parse.
 */
export interface ReceivingAdvancedRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly targets: number;
  readonly receptions: number;
  readonly adot: number | null; // mean depth of target (adot)
  readonly drops: number; // sum of drop
  readonly dropPct: number | null; // 0..1 mean drop rate (drop_pct)
  readonly brokenTackles: number; // sum of brk_tkl
  readonly ybcPerRec: number; // yards before catch / reception
  readonly yacPerRec: number; // yards after catch / reception
  readonly passerRatingWhenTargeted: number | null; // QB rating when targeted (rat)
}

/**
 * Per-TEAM pass-rush rollup, summed over EVERY charted defender on a team — with
 * NO coverage-target floor and NO TOP_N coverage cap. `coverage` above is sliced
 * to the 30 lowest-passer-rating-allowed defenders league-wide (a per-player
 * coverage leaderboard), so summing pass-rush from it under-counts or zeroes any
 * team whose defenders didn't make that list. This rollup is the honest team
 * pass-rush total: every defender's def_pressures / def_blitzes / def_sacks /
 * def_qbkd / def_hurries, grouped by team. Real columns only; absent stays 0.
 */
export interface TeamPassRushRow {
  readonly team: string;
  readonly defenders: number; // charted defenders on the team backing the rollup
  readonly pressures: number; // sum of def_pressures
  readonly blitzes: number; // sum of def_blitzes
  readonly sacks: number; // sum of def_sacks (individual)
  readonly qbKnockdowns: number; // sum of def_qbkd
  readonly hurries: number; // sum of def_hurries
}

export interface NflversePressureCoverage {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly qbPressure: readonly QbPressureRow[];
  readonly coverage: readonly CoverageRow[];
  readonly receivingAdvanced: readonly ReceivingAdvancedRow[];
  /**
   * Uncapped per-team pass-rush totals (see TeamPassRushRow). Distinct from
   * `coverage`: this is the FULL team rush, not the capped coverage leaderboard.
   */
  readonly teamPassRush: readonly TeamPassRushRow[];
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"pass" | "def" | "rec", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_QB_GAMES = 4;
const MIN_COVERAGE_TARGETS = 25;
const MIN_REC_TARGETS = 25;
const TOP_N = 30;

let cache: { readonly expiresAt: number; readonly value: NflversePressureCoverage } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function finite(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}
function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}
function round(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

async function fetchVariant(
  variant: "pass" | "def" | "rec",
  season: number,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<{ url: string; records: readonly CsvRecord[] }> {
  const url = nflverseUrl("pfr_advstats", season, variant);
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  return { url, records: parseCsv(await response.text()).records };
}

interface QbAgg {
  name: string;
  team: string;
  press: number[];
  bad: number[];
  sacks: number;
  blitz: number;
  // PFR advanced PASS charting accumulators (real columns).
  pocket: number[]; // mean-able: pocket_time per game
  hurried: number; // times_hurried
  hit: number; // times_hit
  onTgt: number[]; // mean-able: on_tgt_pct per game
  rpoPlays: number;
  rpoYards: number;
  paAtt: number; // pa_pass_att
  paYards: number; // pa_pass_yards
  batted: number; // batted_balls
  throwaways: number;
}

/** Mean of a numeric array, or null when empty (honest dash, never invented). */
function meanOrNull(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;
}

function buildQbPressure(records: readonly CsvRecord[]): QbPressureRow[] {
  const byPlayer = new Map<string, QbAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const id = row["pfr_player_id"];
    if (!id) continue;
    const agg: QbAgg =
      byPlayer.get(id) ??
      {
        name: row["pfr_player_name"] ?? "UNKNOWN",
        team: row["team"] ?? "",
        press: [],
        bad: [],
        sacks: 0,
        blitz: 0,
        pocket: [],
        hurried: 0,
        hit: 0,
        onTgt: [],
        rpoPlays: 0,
        rpoYards: 0,
        paAtt: 0,
        paYards: 0,
        batted: 0,
        throwaways: 0,
      };
    const p = finite(row["times_pressured_pct"]);
    const b = finite(row["passing_bad_throw_pct"]);
    if (p !== null) agg.press.push(p);
    if (b !== null) agg.bad.push(b);
    agg.sacks += toNumber(row["times_sacked"]);
    agg.blitz += toNumber(row["times_blitzed"]);
    // New PFR advanced PASS columns — only counted when the column actually exists.
    const pocket = finite(row["pocket_time"]);
    if (pocket !== null) agg.pocket.push(pocket);
    const onTgt = finite(row["on_tgt_pct"]);
    if (onTgt !== null) agg.onTgt.push(onTgt);
    agg.hurried += toNumber(row["times_hurried"]);
    agg.hit += toNumber(row["times_hit"]);
    agg.rpoPlays += toNumber(row["rpo_plays"]);
    agg.rpoYards += toNumber(row["rpo_yards"]);
    agg.paAtt += toNumber(row["pa_pass_att"]);
    agg.paYards += toNumber(row["pa_pass_yards"]);
    agg.batted += toNumber(row["batted_balls"]);
    agg.throwaways += toNumber(row["throwaways"]);
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }
  const rows: QbPressureRow[] = [];
  for (const [id, a] of byPlayer) {
    const games = a.press.length;
    if (games < MIN_QB_GAMES) continue;
    const pocketMean = meanOrNull(a.pocket);
    const onTgtMean = meanOrNull(a.onTgt);
    rows.push({
      playerId: id,
      name: a.name,
      team: a.team,
      games,
      pressurePct: round(mean(a.press)),
      badThrowPct: round(mean(a.bad)),
      sacks: a.sacks,
      blitzesFaced: a.blitz,
      pocketTime: pocketMean === null ? null : round(pocketMean, 2),
      timesHurried: a.hurried,
      timesHit: a.hit,
      // The advstats_week pct columns ship as fractions (0..1), the same scale as
      // times_pressured_pct / passing_bad_throw_pct already consumed above — so we
      // carry on_tgt_pct through unchanged rather than rescaling.
      onTgtPct: onTgtMean === null ? null : round(onTgtMean, 3),
      rpoPlays: a.rpoPlays,
      rpoYards: a.rpoYards,
      paPassAtt: a.paAtt,
      paPassYards: a.paYards,
      battedBalls: a.batted,
      throwaways: a.throwaways,
    });
  }
  return rows.sort((x, y) => y.pressurePct - x.pressurePct).slice(0, TOP_N);
}

interface CovAgg {
  name: string;
  team: string;
  games: number;
  tgt: number;
  comp: number;
  yards: number;
  prWeighted: number;
  mt: number[];
  // PFR advanced DEF pass-rush charting accumulators (real columns).
  adot: number[]; // mean-able: def_adot per game
  blitzes: number; // def_blitzes
  hurries: number; // def_hurries
  qbkd: number; // def_qbkd
  pressures: number; // def_pressures
  sacks: number; // def_sacks (individual)
}

function buildCoverage(records: readonly CsvRecord[]): CoverageRow[] {
  const byPlayer = new Map<string, CovAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const id = row["pfr_player_id"];
    if (!id) continue;
    const tgt = toNumber(row["def_targets"]);
    const agg: CovAgg =
      byPlayer.get(id) ??
      {
        name: row["pfr_player_name"] ?? "UNKNOWN",
        team: row["team"] ?? "",
        games: 0,
        tgt: 0,
        comp: 0,
        yards: 0,
        prWeighted: 0,
        mt: [],
        adot: [],
        blitzes: 0,
        hurries: 0,
        qbkd: 0,
        pressures: 0,
        sacks: 0,
      };
    agg.games += 1;
    agg.tgt += tgt;
    agg.comp += toNumber(row["def_completions_allowed"]);
    agg.yards += toNumber(row["def_yards_allowed"]);
    agg.prWeighted += toNumber(row["def_passer_rating_allowed"]) * tgt;
    const m = finite(row["def_missed_tackle_pct"]);
    if (m !== null) agg.mt.push(m);
    // New PFR advanced DEF pass-rush columns — counted only when present.
    const adot = finite(row["def_adot"]);
    if (adot !== null) agg.adot.push(adot);
    agg.blitzes += toNumber(row["def_blitzes"]);
    agg.hurries += toNumber(row["def_hurries"]);
    agg.qbkd += toNumber(row["def_qbkd"]);
    agg.pressures += toNumber(row["def_pressures"]);
    agg.sacks += toNumber(row["def_sacks"]);
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }
  const rows: CoverageRow[] = [];
  for (const [id, a] of byPlayer) {
    if (a.tgt < MIN_COVERAGE_TARGETS) continue;
    const adotMean = meanOrNull(a.adot);
    rows.push({
      playerId: id,
      name: a.name,
      team: a.team,
      games: a.games,
      targets: a.tgt,
      completionsAllowed: a.comp,
      completionPct: round(a.tgt > 0 ? a.comp / a.tgt : 0),
      yardsPerTarget: round(a.tgt > 0 ? a.yards / a.tgt : 0, 2),
      passerRatingAllowed: round(a.tgt > 0 ? a.prWeighted / a.tgt : 0, 1),
      missedTacklePct: round(mean(a.mt)),
      adotAllowed: adotMean === null ? null : round(adotMean, 2),
      blitzes: a.blitzes,
      hurries: a.hurries,
      qbKnockdowns: a.qbkd,
      pressures: a.pressures,
      sacks: a.sacks,
    });
  }
  // Lockdown first (lowest passer rating allowed).
  return rows.sort((x, y) => x.passerRatingAllowed - y.passerRatingAllowed).slice(0, TOP_N);
}

interface TeamRushAgg {
  defenders: number;
  pressures: number;
  blitzes: number;
  sacks: number;
  qbkd: number;
  hurries: number;
}

/**
 * Aggregate the FULL def charting into per-team pass-rush totals — every charted
 * defender on a team, with NO coverage-target floor and NO TOP_N cap. This is the
 * honest team rush total that `coverage` (a capped per-player leaderboard) cannot
 * provide. Real columns only (def_pressures / def_blitzes / def_sacks / def_qbkd /
 * def_hurries); a defender missing a column simply contributes 0 to it. Keyed by
 * the team code as it appears in the source (upper-cased); the consumer applies
 * any relocation/spelling normalization on lookup.
 */
function buildTeamPassRush(records: readonly CsvRecord[]): TeamPassRushRow[] {
  const byTeam = new Map<string, TeamRushAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const team = (row["team"] ?? "").trim().toUpperCase();
    if (!team) continue;
    let agg = byTeam.get(team);
    if (!agg) {
      agg = { defenders: 0, pressures: 0, blitzes: 0, sacks: 0, qbkd: 0, hurries: 0 };
      byTeam.set(team, agg);
    }
    agg.defenders += 1;
    agg.pressures += toNumber(row["def_pressures"]);
    agg.blitzes += toNumber(row["def_blitzes"]);
    agg.sacks += toNumber(row["def_sacks"]);
    agg.qbkd += toNumber(row["def_qbkd"]);
    agg.hurries += toNumber(row["def_hurries"]);
  }
  const rows: TeamPassRushRow[] = [];
  for (const [team, a] of byTeam) {
    rows.push({
      team,
      defenders: a.defenders,
      pressures: a.pressures,
      blitzes: a.blitzes,
      sacks: a.sacks,
      qbKnockdowns: a.qbkd,
      hurries: a.hurries,
    });
  }
  // Hardest rush first (most pressures); stable, full league — never sliced.
  return rows.sort((x, y) => y.pressures - x.pressures);
}

interface RecAgg {
  name: string;
  team: string;
  games: number;
  tgt: number;
  rec: number;
  ybc: number;
  yac: number;
  brk: number;
  drops: number;
  adot: number[]; // mean-able: adot per game
  dropPct: number[]; // mean-able: drop_pct per game
  rat: number[]; // mean-able: rat (passer rating when targeted) per game
}

/**
 * Aggregate the PFR advanced `rec` variant into receiver charting rows. The weekly
 * file carries PFR short column names; we tolerate season-file/weekly aliases the
 * same way rushing-contact.ts does so synthetic inputs still parse. Real columns
 * only — every field that is absent in the source stays null (honest dash).
 */
function buildReceivingAdvanced(records: readonly CsvRecord[]): ReceivingAdvancedRow[] {
  const byPlayer = new Map<string, RecAgg>();
  for (const row of records) {
    // Weekly files carry game_type; season files don't. Filter to REG when present.
    if (row["game_type"] !== undefined && row["game_type"] !== "REG") continue;
    const id = row["pfr_player_id"] || row["pfr_id"];
    if (!id) continue;
    const tgt = toNumber(row["tgt"] ?? row["targets"]);
    const agg: RecAgg =
      byPlayer.get(id) ??
      {
        name: row["pfr_player_name"] ?? row["player"] ?? "UNKNOWN",
        team: row["team"] ?? row["tm"] ?? "",
        games: 0,
        tgt: 0,
        rec: 0,
        ybc: 0,
        yac: 0,
        brk: 0,
        drops: 0,
        adot: [],
        dropPct: [],
        rat: [],
      };
    agg.games += 1;
    agg.tgt += tgt;
    agg.rec += toNumber(row["rec"]);
    agg.ybc += toNumber(row["ybc"]);
    agg.yac += toNumber(row["yac"]);
    agg.brk += toNumber(row["brk_tkl"]);
    agg.drops += toNumber(row["drop"]);
    const adot = finite(row["adot"]);
    if (adot !== null) agg.adot.push(adot);
    const dropPct = finite(row["drop_pct"]);
    if (dropPct !== null) agg.dropPct.push(dropPct);
    const rat = finite(row["rat"]);
    if (rat !== null) agg.rat.push(rat);
    agg.team = row["team"] || row["tm"] || agg.team;
    byPlayer.set(id, agg);
  }
  const rows: ReceivingAdvancedRow[] = [];
  for (const [id, a] of byPlayer) {
    if (a.tgt < MIN_REC_TARGETS) continue;
    const adotMean = meanOrNull(a.adot);
    const dropPctMean = meanOrNull(a.dropPct);
    const ratMean = meanOrNull(a.rat);
    rows.push({
      playerId: id,
      name: a.name,
      team: a.team,
      games: a.games,
      targets: a.tgt,
      receptions: a.rec,
      adot: adotMean === null ? null : round(adotMean, 1),
      drops: a.drops,
      dropPct: dropPctMean === null ? null : round(dropPctMean, 3),
      brokenTackles: a.brk,
      ybcPerRec: round(a.rec > 0 ? a.ybc / a.rec : 0, 2),
      yacPerRec: round(a.rec > 0 ? a.yac / a.rec : 0, 2),
      passerRatingWhenTargeted: ratMean === null ? null : round(ratMean, 1),
    });
  }
  // Deepest average target first — the route-tree signal the board surfaces.
  return rows
    .sort((x, y) => (y.adot ?? -1) - (x.adot ?? -1))
    .slice(0, TOP_N);
}

export function resetPressureCoverageCacheForTests(): void {
  cache = null;
}

export async function loadNflversePressureCoverage({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflversePressureCoverage> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) return cache.value;

  const candidates = [season, season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      // pass + def gate the season (they are the core boards). The rec variant is
      // additive enrichment: a missing rec asset must NOT fail the whole load, so
      // it resolves to an empty result instead of rejecting the Promise.all.
      const recUrl = nflverseUrl("pfr_advstats", candidate, "rec");
      const [pass, def, rec] = await Promise.all([
        fetchVariant("pass", candidate, fetcher, timeoutMs),
        fetchVariant("def", candidate, fetcher, timeoutMs),
        fetchVariant("rec", candidate, fetcher, timeoutMs).catch(
          (): { url: string; records: readonly CsvRecord[] } => ({ url: recUrl, records: [] }),
        ),
      ]);
      const passReg = pass.records.filter((r) => r["game_type"] === "REG");
      if (passReg.length === 0) throw new Error("no REG pass rows");
      const value: NflversePressureCoverage = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        seasonType: "REG",
        sourceRows: pass.records.length + def.records.length + rec.records.length,
        qbPressure: buildQbPressure(pass.records),
        coverage: buildCoverage(def.records),
        teamPassRush: buildTeamPassRush(def.records),
        receivingAdvanced: buildReceivingAdvanced(rec.records),
        canPublishProjections: false,
        blockReason:
          "PFR advanced charting (pressure faced, bad-throw rate, coverage allowed, receiver depth/drops) is real historical fact from nflverse. It is context, not a projection or a betting pick.",
        sourceUrls: { pass: pass.url, def: def.url, rec: rec.url },
        error: null,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    seasonType: "REG",
    sourceRows: 0,
    qbPressure: [],
    coverage: [],
    teamPassRush: [],
    receivingAdvanced: [],
    canPublishProjections: false,
    blockReason:
      "PFR advanced charting could not load from nflverse. The product shows an empty state instead of fabricated charting.",
    sourceUrls: {
      pass: nflverseUrl("pfr_advstats", season, "pass"),
      def: nflverseUrl("pfr_advstats", season, "def"),
      rec: nflverseUrl("pfr_advstats", season, "rec"),
    },
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
