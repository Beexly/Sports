/**
 * GSE — Player-projection backtest driver (REAL nflverse data).
 *
 * Stands up the "is the engine actually smart?" test on real games. It:
 *   1. fetches real nflverse weekly player stats for the requested seasons,
 *   2. engineers CLEARED, leakage-safe usage features (trailing means only —
 *      every feature for week W uses strictly weeks < W),
 *   3. builds TweedieProjectionSample[] with a NAIVE points-persistence baseline,
 *   4. runs the engine's EXISTING purged + embargoed walk-forward + Clark-West
 *      harness (runTweedieBaselineBacktest) — no new modeling logic here,
 *   5. prints an out-of-sample report.
 *
 * HONEST SCOPE (read this): the baseline here is a player's trailing-average
 * fantasy points — "you'll score what you've been scoring." This answers
 * "does the model add signal OVER NAIVE PERSISTENCE on real data?" — the correct
 * first question. It is NOT the Vegas market: beating the betting market requires
 * historical player-prop lines, which are not freely available and are a [DATA]
 * follow-up. The report labels this explicitly. Nothing here flips any gate; the
 * engine output stays priced=false / shadow.
 *
 * RUN (from repo root, in an env with node_modules installed + network):
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023 2024 2025
 * Args = seasons (default = all completed NFL seasons 2021..2025; the 2026 season has not been
 * played yet as of this writing). PPR scoring. nflverse renamed the weekly asset after 2024, so the
 * driver tries both the legacy `player_stats_<season>.csv` and the newer
 * `stats_player_week_<season>.csv` names (schemas share all columns this driver reads).
 */

import {
  runTweedieBaselineBacktest,
  type TweedieProjectionSample,
} from "../../packages/prediction-engine/src/tweedie-baseline.js";

// ---- config -------------------------------------------------------------
const SEASONS: number[] = (process.argv.slice(2).map(Number).filter(Number.isInteger).length > 0
  ? process.argv.slice(2).map(Number).filter(Number.isInteger)
  : [2021, 2022, 2023, 2024, 2025]); // all completed NFL seasons as of 2026-06 (2026 not played yet)

const SKILL_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);
const MIN_PRIOR_GAMES = 3; // need history before a player is eligible (trailing features exist)
// Base trailing-usage feature set (the proven default). Opponent matchup features are an OPT-IN
// ablation (set BACKTEST_OPP=1): an empirical experiment showed that adding them naively did NOT
// beat naive persistence — it slightly hurt — so they are off by default until a more careful
// treatment (regularization / proper feature selection) earns their place. The harness is thus an
// honest ablation tool, not a feature-piling exercise.
const BASE_FEATURE_IDS = [
  "trailingPoints",
  "trailingTargets",
  "trailingCarries",
  "trailingReceptions",
  "trailingRecYards",
  "trailingRushYards",
  "priorGames",
];
const OPP_FEATURE_IDS = ["oppAllowedToPos", "oppAllowedOverall", "oppGames"];
const INCLUDE_OPP = process.env.BACKTEST_OPP === "1" || process.env.BACKTEST_OPP === "true";
const CLEARED_FEATURE_IDS: readonly string[] = INCLUDE_OPP
  ? [...BASE_FEATURE_IDS, ...OPP_FEATURE_IDS]
  : BASE_FEATURE_IDS;

// nflverse weekly player stats release asset patterns (tried in order).
function candidateUrls(season: number): string[] {
  const base = "https://github.com/nflverse/nflverse-data/releases/download";
  return [
    `${base}/player_stats/player_stats_${season}.csv`,
    `${base}/stats_player/stats_player_week_${season}.csv`,
    `${base}/player_stats/stats_player_week_${season}.csv`,
  ];
}

// ---- tiny CSV parser (quote-aware) --------------------------------------
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else { field += c; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows[0]!;
  return rows.slice(1).filter((r) => r.length === header.length).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    return obj;
  });
}

async function fetchSeason(season: number): Promise<Array<Record<string, string>>> {
  for (const url of candidateUrls(season)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const parsed = parseCsv(text);
        if (parsed.length > 0) { console.log(`  ${season}: ${parsed.length} rows from ${url}`); return parsed; }
      }
    } catch { /* try next */ }
  }
  console.warn(`  ${season}: no nflverse asset reachable (tried ${candidateUrls(season).length} URLs)`);
  return [];
}

// flexible column lookup (nflverse schema drifts across releases)
function num(row: Record<string, string>, ...keys: string[]): number {
  for (const k of keys) { const v = row[k]; if (v !== undefined && v !== "") { const n = Number(v); if (Number.isFinite(n)) return n; } }
  return 0;
}
function str(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) { const v = row[k]; if (v !== undefined && v.trim() !== "") return v.trim(); }
  return "";
}

interface WeekRow {
  playerId: string; season: number; week: number; position: string; team: string; opponent: string;
  points: number; targets: number; carries: number; receptions: number; recYards: number; rushYards: number;
}

function toWeekRow(r: Record<string, string>): WeekRow | null {
  const season = num(r, "season");
  const week = num(r, "week");
  const position = str(r, "position", "position_group").toUpperCase();
  const playerId = str(r, "player_id", "gsis_id", "player_gsis_id");
  if (!season || !week || !playerId || !SKILL_POSITIONS.has(position)) return null;
  // regular season only
  const seasonType = str(r, "season_type", "game_type");
  if (seasonType && seasonType !== "REG") return null;
  return {
    playerId, season, week, position,
    team: str(r, "recent_team", "team"),
    opponent: str(r, "opponent_team", "opponent"),
    points: num(r, "fantasy_points_ppr", "fantasy_points"),
    targets: num(r, "targets"),
    carries: num(r, "carries", "rushing_attempts"),
    receptions: num(r, "receptions"),
    recYards: num(r, "receiving_yards"),
    rushYards: num(r, "rushing_yards"),
  };
}

function mean(xs: number[]): number { return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length; }

// Build leakage-safe samples: features for week W use ONLY weeks < W (same player, same season).
function buildSamples(rows: WeekRow[]): TweedieProjectionSample[] {
  // Opponent defense-strength tables (leakage-safe matchup signal): how many fantasy points each
  // defense allowed, BY position and overall, per (season, week). The week-W opponent is known
  // pre-game (legal); we only ever average the opponent's PRIOR weeks (< W) below.
  const allowedByPos = new Map<string, number>(); // season|defense|pos|week -> pts allowed
  const allowedTotal = new Map<string, number>(); // season|defense|week -> pts allowed (all skill)
  for (const r of rows) {
    if (!r.opponent) continue;
    const kp = `${r.season}|${r.opponent}|${r.position}|${r.week}`;
    const kt = `${r.season}|${r.opponent}|${r.week}`;
    allowedByPos.set(kp, (allowedByPos.get(kp) ?? 0) + r.points);
    allowedTotal.set(kt, (allowedTotal.get(kt) ?? 0) + r.points);
  }
  // Mean of a defense's prior-week allowances (strictly weeks < targetWeek, same season).
  function oppTrailing(map: Map<string, number>, prefix: string, targetWeek: number): { mean: number; games: number } {
    const vals: number[] = [];
    for (let wk = 1; wk < targetWeek; wk++) { const v = map.get(`${prefix}|${wk}`); if (v !== undefined) vals.push(v); }
    return { mean: mean(vals), games: vals.length };
  }

  const byPlayerSeason = new Map<string, WeekRow[]>();
  for (const r of rows) {
    const key = `${r.playerId}-${r.season}`;
    (byPlayerSeason.get(key) ?? byPlayerSeason.set(key, []).get(key)!).push(r);
  }
  const samples: TweedieProjectionSample[] = [];
  for (const [, weeks] of byPlayerSeason) {
    weeks.sort((a, b) => a.week - b.week);
    for (let i = 0; i < weeks.length; i++) {
      if (i < MIN_PRIOR_GAMES) continue; // need history
      const prior = weeks.slice(0, i);
      const w = weeks[i]!;
      const trailingPoints = mean(prior.map((p) => p.points)); // the NAIVE baseline
      // Week-W opponent's trailing points allowed (matchup); 0 + games-count when no history yet.
      const oppPos = oppTrailing(allowedByPos, `${w.season}|${w.opponent}|${w.position}`, w.week);
      const oppAll = oppTrailing(allowedTotal, `${w.season}|${w.opponent}`, w.week);
      samples.push({
        sampleId: `${w.playerId}-${w.season}-W${w.week}`,
        season: w.season,
        week: w.week,
        position: w.position,
        actualFantasyPoints: Math.max(0, w.points),
        marketBaselineFantasyPoints: Math.max(0, trailingPoints), // naive persistence (NOT the Vegas market)
        features: {
          trailingPoints,
          trailingTargets: mean(prior.map((p) => p.targets)),
          trailingCarries: mean(prior.map((p) => p.carries)),
          trailingReceptions: mean(prior.map((p) => p.receptions)),
          trailingRecYards: mean(prior.map((p) => p.recYards)),
          trailingRushYards: mean(prior.map((p) => p.rushYards)),
          priorGames: prior.length,
          // Opponent matchup (leakage-safe: opponent's weeks < W only)
          oppAllowedToPos: oppPos.mean,
          oppAllowedOverall: oppAll.mean,
          oppGames: oppPos.games,
        },
      });
    }
  }
  return samples;
}

async function main(): Promise<void> {
  console.log(`\nGSE player-projection backtest — seasons ${SEASONS.join(", ")} (PPR)`);
  console.log(`features: ${INCLUDE_OPP ? "base + opponent matchup (ablation: BACKTEST_OPP=1)" : "base trailing-usage (default)"}\n`);
  const raw: WeekRow[] = [];
  for (const season of SEASONS) {
    const rows = await fetchSeason(season);
    for (const r of rows) { const wr = toWeekRow(r); if (wr) raw.push(wr); }
  }
  if (raw.length === 0) {
    console.error("\nNo data fetched. Check network / nflverse asset URLs and retry (NODE_OPTIONS=--use-system-ca).\n");
    process.exit(2);
  }
  const samples = buildSamples(raw);
  console.log(`\nBuilt ${samples.length} leakage-safe player-week samples (>= ${MIN_PRIOR_GAMES} prior games).`);

  const report = runTweedieBaselineBacktest(samples, {
    clearedFeatureIds: [...CLEARED_FEATURE_IDS],
    rounds: 8,
    learningRate: 0.2,
    minTrainWeeks: 4,
    purgeWeeks: 1,
    embargoWeeks: 1,
  });

  const cw = report.clarkWest;
  console.log(`\n================ OUT-OF-SAMPLE RESULT ================`);
  console.log(`folds (walk-forward weeks): ${report.folds}`);
  console.log(`scored OOS samples:         ${report.sampleSize}`);
  console.log(`model MAE:                  ${cw.modelMae}`);
  console.log(`naive-baseline MAE:         ${cw.marketMae}`);
  console.log(`beats NAIVE baseline:       ${cw.beatsMarket}  (Clark-West, n>=30 & t>1.64 & lower MAE)`);
  console.log(`priced:                     ${report.priced}  (shadow — no gate flipped)`);
  console.log(`full Clark-West report:     ${JSON.stringify(cw)}`);
  console.log(`======================================================`);
  console.log(`\nINTERPRETATION:`);
  console.log(`  • This is "model vs naive points-persistence" on REAL nflverse data.`);
  console.log(`  • "beats NAIVE = true" means the engine adds real signal over persistence OOS — the bar to keep building.`);
  console.log(`  • It is NOT yet "beats the Vegas market" — that needs historical player props ([DATA] follow-up).`);
  console.log(`  • Nothing here publishes a projection or changes canPublishProjections.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
