/**
 * PFR advanced stats — typed season-level priors from the nflverse mirror.
 *
 * Attribution: "Pro-Football-Reference via nflverse pfr_advstats mirror".
 * The domain is not crawled. These are SEASON AGGREGATES: priors, not play-level
 * truth. Nothing here expands a season row into a play.
 *
 * Four files, each with its own loader. Facts recorded from the parquet at build
 * time; the column lists below are the full schema, in order, with nothing added
 * and nothing dropped.
 *
 *   advstats_season_def   8,146 rows  30 cols  sha 763addbd1ef6...
 *   advstats_season_rec   4,476 rows  25 cols  sha 1596cfd51066...
 *   advstats_season_rush  2,996 rows  19 cols  sha 983e74596eff...
 *   advstats_season_pass    848 rows  37 cols  sha 8c03634f2830...
 *
 * Full SHA-256s are in PFR_REGISTRY below.
 *
 * Columns per file:
 *   def:  season, player, pfr_id, tm, age, pos, g, gs, int, tgt, cmp, cmp_percent,
 *         yds, yds_cmp, yds_tgt, td, rat, dadot, air, yac, bltz, hrry, qbkd, sk,
 *         prss, comb, m_tkl, m_tkl_percent, loaded, bats
 *   rec:  season, player, pfr_id, tm, age, pos, g, gs, tgt, rec, yds, td, x1d, ybc,
 *         ybc_r, yac, yac_r, adot, brk_tkl, rec_br, drop, drop_percent, int, rat, loaded
 *   rush: season, player, pfr_id, tm, age, pos, g, gs, att, yds, td, x1d, ybc,
 *         ybc_att, yac, yac_att, brk_tkl, att_br, loaded
 *   pass: player, team, pass_attempts, throwaways, spikes, drops, drop_pct,
 *         bad_throws, bad_throw_pct, season, pfr_id, pocket_time, times_blitzed,
 *         times_hurried, times_hit, times_pressured, pressure_pct, batted_balls,
 *         on_tgt_throws, on_tgt_pct, rpo_plays, rpo_yards, rpo_pass_att,
 *         rpo_pass_yards, rpo_rush_att, rpo_rush_yards, pa_pass_att, pa_pass_yards,
 *         intended_air_yards, intended_air_yards_per_pass_attempt,
 *         completed_air_yards, completed_air_yards_per_completion,
 *         completed_air_yards_per_pass_attempt, pass_yards_after_catch,
 *         pass_yards_after_catch_per_completion, scrambles, scramble_yards_per_attempt
 *
 * Units are recorded only where the column name makes them unambiguous (`_percent`,
 * `_pct`, `_per_*`, `yds`, `air`). Where a name does not settle the unit, the unit is
 * left null rather than guessed.
 */
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const PFR_ATTRIBUTION = "Pro-Football-Reference via nflverse pfr_advstats mirror";
export const PFR_DIR = "data/nflverse";

export type PfrTable = "def" | "rec" | "rush" | "pass";

export const PFR_REGISTRY: Readonly<
  Record<PfrTable, { file: string; rows: number; cols: number; sha256: string; columns: readonly string[] }>
> = {
  def: {
    file: "advstats_season_def.parquet",
    rows: 8146,
    cols: 30,
    sha256: "763addbd1ef64fbe3a29860816bc07cac9aacf21c69eb953fb39fbc9cae4e9a6",
    columns: ["season", "player", "pfr_id", "tm", "age", "pos", "g", "gs", "int", "tgt", "cmp", "cmp_percent", "yds", "yds_cmp", "yds_tgt", "td", "rat", "dadot", "air", "yac", "bltz", "hrry", "qbkd", "sk", "prss", "comb", "m_tkl", "m_tkl_percent", "loaded", "bats"],
  },
  rec: {
    file: "advstats_season_rec.parquet",
    rows: 4476,
    cols: 25,
    sha256: "1596cfd510664f08e61bd2ce9593ecd4ee348a792da6d214cc9029075ce49c16",
    columns: ["season", "player", "pfr_id", "tm", "age", "pos", "g", "gs", "tgt", "rec", "yds", "td", "x1d", "ybc", "ybc_r", "yac", "yac_r", "adot", "brk_tkl", "rec_br", "drop", "drop_percent", "int", "rat", "loaded"],
  },
  rush: {
    file: "advstats_season_rush.parquet",
    rows: 2996,
    cols: 19,
    sha256: "983e74596effdcecf9ce131876cb0fff9966cf138ac049beeff3ade65044f7cc",
    columns: ["season", "player", "pfr_id", "tm", "age", "pos", "g", "gs", "att", "yds", "td", "x1d", "ybc", "ybc_att", "yac", "yac_att", "brk_tkl", "att_br", "loaded"],
  },
  pass: {
    file: "advstats_season_pass.parquet",
    rows: 848,
    cols: 37,
    sha256: "8c03634f283043c6b4a0c366872581a5dbead0a4d7ec3b6e1ac027b66cb7bbf8",
    columns: ["player", "team", "pass_attempts", "throwaways", "spikes", "drops", "drop_pct", "bad_throws", "bad_throw_pct", "season", "pfr_id", "pocket_time", "times_blitzed", "times_hurried", "times_hit", "times_pressured", "pressure_pct", "batted_balls", "on_tgt_throws", "on_tgt_pct", "rpo_plays", "rpo_yards", "rpo_pass_att", "rpo_pass_yards", "rpo_rush_att", "rpo_rush_yards", "pa_pass_att", "pa_pass_yards", "intended_air_yards", "intended_air_yards_per_pass_attempt", "completed_air_yards", "completed_air_yards_per_completion", "completed_air_yards_per_pass_attempt", "pass_yards_after_catch", "pass_yards_after_catch_per_completion", "scrambles", "scramble_yards_per_attempt"],
  },
};

export interface PfrRow {
  readonly table: PfrTable;
  readonly season: number | null;
  readonly player: string | null;
  readonly pfrId: string | null;
  readonly team: string | null;
  /** Every column of the source row, keyed by its original name. */
  readonly raw: Readonly<Record<string, unknown>>;
  readonly attribution: typeof PFR_ATTRIBUTION;
}

async function loadTable(table: PfrTable): Promise<PfrRow[]> {
  const meta = PFR_REGISTRY[table];
  const file = await asyncBufferFromFile(resolve(REPO_ROOT, PFR_DIR, meta.file));
  const rows = (await parquetReadObjects({ file })) as Record<string, unknown>[];
  const out: PfrRow[] = [];
  for (const r of rows) {
    out.push({
      table,
      season: typeof r["season"] === "number" ? r["season"] : null,
      player: typeof r["player"] === "string" ? r["player"] : null,
      pfrId: typeof r["pfr_id"] === "string" ? r["pfr_id"] : null,
      team: typeof r["tm"] === "string" ? r["tm"] : typeof r["team"] === "string" ? r["team"] : null,
      raw: r,
      attribution: PFR_ATTRIBUTION,
    });
  }
  return out;
}

/** Season defensive advanced stats. Prior, not play-level. */
export const loadPfrAdvstatsDef = (): Promise<PfrRow[]> => loadTable("def");
/** Season receiving advanced stats. Prior, not play-level. */
export const loadPfrAdvstatsRec = (): Promise<PfrRow[]> => loadTable("rec");
/** Season rushing advanced stats. Prior, not play-level. */
export const loadPfrAdvstatsRush = (): Promise<PfrRow[]> => loadTable("rush");
/** Season passing advanced stats. Prior, not play-level. */
export const loadPfrAdvstatsPass = (): Promise<PfrRow[]> => loadTable("pass");

/**
 * Adapters — one per column that no kernel expects yet.
 *
 * Each adapter is a pure read of a column that exists in the file. It is available
 * for a future kernel; no future kernel is invented here. `unit` is filled only
 * where the column name settles it.
 */
export interface PfrAdapter {
  readonly table: PfrTable;
  readonly column: string;
  readonly unit: string | null;
  readonly read: (row: PfrRow) => number | null;
}

function num(table: PfrTable, column: string, unit: string | null): PfrAdapter {
  return {
    table,
    column,
    unit,
    read: (row) => {
      const v = row.raw[column];
      return typeof v === "number" ? v : null;
    },
  };
}

/** Columns with no kernel consumer, exposed as named features. */
export const PFR_ADAPTERS: readonly PfrAdapter[] = [
  num("def", "dadot", "yards"),
  num("def", "air", "yards"),
  num("def", "yac", "yards"),
  num("def", "bltz", null),
  num("def", "hrry", null),
  num("def", "qbkd", null),
  num("def", "prss", null),
  num("def", "comb", null),
  num("def", "m_tkl", null),
  num("def", "m_tkl_percent", "percent"),
  num("def", "bats", null),
  num("rec", "ybc", "yards"),
  num("rec", "ybc_r", "yards"),
  num("rec", "yac_r", "yards"),
  num("rec", "adot", "yards"),
  num("rec", "brk_tkl", null),
  num("rec", "rec_br", null),
  num("rec", "drop_percent", "percent"),
  num("rush", "ybc", "yards"),
  num("rush", "ybc_att", "yards_per_attempt"),
  num("rush", "yac_att", "yards_per_attempt"),
  num("rush", "brk_tkl", null),
  num("rush", "att_br", null),
  num("pass", "pocket_time", "seconds"),
  num("pass", "times_blitzed", null),
  num("pass", "times_hurried", null),
  num("pass", "times_hit", null),
  num("pass", "times_pressured", null),
  num("pass", "pressure_pct", "percent"),
  num("pass", "batted_balls", null),
  num("pass", "on_tgt_pct", "percent"),
  num("pass", "rpo_plays", null),
  num("pass", "rpo_yards", "yards"),
  num("pass", "pa_pass_att", null),
  num("pass", "pa_pass_yards", "yards"),
  num("pass", "intended_air_yards", "yards"),
  num("pass", "intended_air_yards_per_pass_attempt", "yards_per_attempt"),
  num("pass", "completed_air_yards", "yards"),
  num("pass", "scrambles", null),
  num("pass", "scramble_yards_per_attempt", "yards_per_attempt"),
];

/**
 * Which columns are wired to a kernel versus adapter-only.
 *
 * No kernel in packages/prediction-engine/src/metrics currently takes a PFR
 * advanced input, so every column is adapter-only today. The map exists so the
 * distinction is explicit rather than implied.
 */
export const PFR_KERNEL_WIRED: Readonly<Record<PfrTable, readonly string[]>> = {
  def: [],
  rec: [],
  rush: [],
  pass: [],
};
