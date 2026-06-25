/**
 * GSE — Pillar-2 projection feature BAKE-OFF (REAL nflverse data, FREE features only).
 *
 * Answers the make-or-break Pillar-2 question without any paid data:
 *   "Do free, leakage-safe ORTHOGONAL features beat the naive trailing-points baseline?"
 *
 * It reuses the keystone harness (runTweedieBaselineBacktest — purged/embargoed
 * walk-forward + Clark-West) and the keystone naive baseline (trailing-points mean),
 * and adds, per player-week, orthogonal features derived ONLY from the same weekly data:
 *   - recencyPoints / trendPoints  (recent form the flat mean lags),
 *   - targetShare / carryShare      (role, denominated by team opportunity, shrunk),
 *   - oppFpoe                        (opponent points-allowed-OVER-EXPECTED, shrunk to league mean).
 *
 * It then runs an ABLATION: base vs base+each group vs base+all, and prints OOS MAE,
 * the margin over naive, and Clark-West beats-naive per group. Leakage-safety: every
 * feature for week W uses STRICTLY weeks < W (same conventions as the keystone driver).
 * Nothing here flips a gate; everything stays priced=false / shadow.
 *
 * RUN (repo root, node_modules + network):
 *   NODE_OPTIONS=--use-system-ca NODE_USE_ENV_PROXY=1 \
 *     npx tsx scripts/backtest/projection-feature-bakeoff.ts 2023 2024
 * Args = seasons (default 2023 2024 — enough OOS power, far faster than all five).
 */

import {
  runTweedieBaselineBacktest,
  type TweedieProjectionSample,
} from "../../packages/prediction-engine/src/tweedie-baseline.js";
import {
  recencyWeightedMean,
  recentMinusBaseline,
  shrunkUsageShare,
  shrunkOpponentFpoe,
} from "../../packages/prediction-engine/src/projection-features.js";

const SEASONS: number[] =
  process.argv.slice(2).map(Number).filter(Number.isInteger).length > 0
    ? process.argv.slice(2).map(Number).filter(Number.isInteger)
    : [2023, 2024];

const SKILL_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);
const MIN_PRIOR_GAMES = 3;

const BASE = [
  "trailingPoints",
  "trailingTargets",
  "trailingCarries",
  "trailingReceptions",
  "trailingRecYards",
  "trailingRushYards",
  "priorGames",
];
const RECENCY = ["recencyPoints", "trendPoints"];
const SHARES = ["targetShare", "carryShare"];
const FPOE = ["oppFpoe"];
const VEGAS = ["vegasImpliedTotal"];

const GROUPS: ReadonlyArray<{ name: string; ids: readonly string[] }> = [
  { name: "G0 base (control)", ids: BASE },
  { name: "G5 +vegas-probe", ids: [...BASE, ...VEGAS] },
  { name: "G6 +all+vegas", ids: [...BASE, ...RECENCY, ...SHARES, ...FPOE, ...VEGAS] },
];

const TARGET_SHARE_PRIOR: Record<string, number> = { WR: 0.18, TE: 0.13, RB: 0.11, QB: 0.0 };
const CARRY_SHARE_PRIOR: Record<string, number> = { RB: 0.45, QB: 0.1, WR: 0.03, TE: 0.01 };

// ---- nflverse loading (mirrors the keystone driver) ---------------------
function candidateUrls(season: number): string[] {
  const base = "https://github.com/nflverse/nflverse-data/releases/download";
  return [
    `${base}/player_stats/player_stats_${season}.csv`,
    `${base}/stats_player/stats_player_week_${season}.csv`,
    `${base}/player_stats/stats_player_week_${season}.csv`,
  ];
}

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
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
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
        const parsed = parseCsv(await res.text());
        if (parsed.length > 0) { console.log(`  ${season}: ${parsed.length} rows`); return parsed; }
      }
    } catch { /* try next */ }
  }
  console.warn(`  ${season}: no nflverse asset reachable`);
  return [];
}

// nflverse games (all seasons) → (season|team|week) -> Vegas implied team total.
// LEAKAGE-RISK PROBE: spread_line/total_line are CLOSING lines (incorporate late info such as
// inactives/weather), so this measures whether the Vegas implied total carries SIGNAL — it is NOT
// an honest gate-flip feature (that needs a pre-kickoff snapshot via the paid historical Odds API).
// nflverse convention: spread_line > 0 means the HOME team is favored by that many points, so
//   home implied total = (total + spread)/2,  away implied total = (total - spread)/2.
async function fetchScheduleImpliedTotals(): Promise<Map<string, number>> {
  const url = "https://github.com/nflverse/nflverse-data/releases/download/games/games.csv";
  const map = new Map<string, number>();
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn("  schedules: not reachable"); return map; }
    const rows = parseCsv(await res.text());
    for (const r of rows) {
      const season = num(r, "season");
      const week = num(r, "week");
      const home = str(r, "home_team");
      const away = str(r, "away_team");
      const total = num(r, "total_line");
      const spread = num(r, "spread_line");
      if (!season || !week || !home || !away || total === 0) continue;
      map.set(`${season}|${home}|${week}`, (total + spread) / 2);
      map.set(`${season}|${away}|${week}`, (total - spread) / 2);
    }
    console.log(`  schedules: ${map.size} team-week implied totals (CLOSING-line probe)`);
  } catch { console.warn("  schedules: fetch failed"); }
  return map;
}

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

// ---- sample build with orthogonal features (leakage-safe) ---------------
function buildSamples(rows: WeekRow[], vegas: Map<string, number>): TweedieProjectionSample[] {
  // team-week opportunity totals (for usage shares)
  const teamTargets = new Map<string, number>(); // season|team|week
  const teamCarries = new Map<string, number>();
  // defense allowed-to-position per week (for opponent FPOE)
  const allowedByPos = new Map<string, number>(); // season|defense|pos|week
  // league pool per (season,pos,week) → {sum,count} across defenses (for the "over-expected" anchor)
  const leaguePool = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    teamTargets.set(`${r.season}|${r.team}|${r.week}`, (teamTargets.get(`${r.season}|${r.team}|${r.week}`) ?? 0) + r.targets);
    teamCarries.set(`${r.season}|${r.team}|${r.week}`, (teamCarries.get(`${r.season}|${r.team}|${r.week}`) ?? 0) + r.carries);
    if (r.opponent) {
      allowedByPos.set(`${r.season}|${r.opponent}|${r.position}|${r.week}`, (allowedByPos.get(`${r.season}|${r.opponent}|${r.position}|${r.week}`) ?? 0) + r.points);
    }
  }
  for (const [key, pts] of allowedByPos) {
    const [season, , pos, week] = key.split("|");
    const lk = `${season}|${pos}|${week}`;
    const cur = leaguePool.get(lk) ?? { sum: 0, count: 0 };
    cur.sum += pts; cur.count += 1; leaguePool.set(lk, cur);
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
      if (i < MIN_PRIOR_GAMES) continue;
      const prior = weeks.slice(0, i);
      const w = weeks[i]!;
      const priorPoints = prior.map((p) => p.points);
      const trailingPoints = mean(priorPoints); // NAIVE baseline

      // usage shares (sum of player vs team over prior weeks, shrunk to a position prior)
      let pT = 0, tT = 0, pC = 0, tC = 0;
      for (const p of prior) {
        pT += p.targets; tT += teamTargets.get(`${p.season}|${p.team}|${p.week}`) ?? 0;
        pC += p.carries; tC += teamCarries.get(`${p.season}|${p.team}|${p.week}`) ?? 0;
      }
      const targetShare = shrunkUsageShare(pT, tT, TARGET_SHARE_PRIOR[w.position] ?? 0.1, prior.length);
      const carryShare = shrunkUsageShare(pC, tC, CARRY_SHARE_PRIOR[w.position] ?? 0.05, prior.length);

      // opponent FPOE: defense trailing allowed-to-pos minus league trailing, shrunk by games
      const defVals: number[] = [];
      const leagueVals: number[] = [];
      for (let wk = 1; wk < w.week; wk++) {
        const d = allowedByPos.get(`${w.season}|${w.opponent}|${w.position}|${wk}`);
        if (d !== undefined) {
          defVals.push(d);
          const lp = leaguePool.get(`${w.season}|${w.position}|${wk}`);
          leagueVals.push(lp && lp.count > 0 ? lp.sum / lp.count : d);
        }
      }
      const fpoeRaw = defVals.length === 0 ? 0 : mean(defVals) - mean(leagueVals);
      const oppFpoe = shrunkOpponentFpoe(fpoeRaw, defVals.length, 5);

      samples.push({
        sampleId: `${w.playerId}-${w.season}-W${w.week}`,
        season: w.season,
        week: w.week,
        position: w.position,
        actualFantasyPoints: Math.max(0, w.points),
        marketBaselineFantasyPoints: Math.max(0, trailingPoints),
        features: {
          trailingPoints,
          trailingTargets: mean(prior.map((p) => p.targets)),
          trailingCarries: mean(prior.map((p) => p.carries)),
          trailingReceptions: mean(prior.map((p) => p.receptions)),
          trailingRecYards: mean(prior.map((p) => p.recYards)),
          trailingRushYards: mean(prior.map((p) => p.rushYards)),
          priorGames: prior.length,
          recencyPoints: recencyWeightedMean(priorPoints, 3),
          trendPoints: recentMinusBaseline(priorPoints, 3),
          targetShare,
          carryShare,
          oppFpoe,
          // same-week Vegas implied team total (known pre-game; CLOSING-line probe — see fetch note)
          vegasImpliedTotal: vegas.get(`${w.season}|${w.team}|${w.week}`) ?? 0,
        },
      });
    }
  }
  return samples;
}

async function main(): Promise<void> {
  console.log(`\nGSE Pillar-2 feature bake-off — seasons ${SEASONS.join(", ")} (PPR, FREE features)\n`);
  const raw: WeekRow[] = [];
  for (const season of SEASONS) {
    const rows = await fetchSeason(season);
    for (const r of rows) { const wr = toWeekRow(r); if (wr) raw.push(wr); }
  }
  if (raw.length === 0) { console.error("\nNo data fetched (network / nflverse).\n"); process.exit(2); }

  const vegas = await fetchScheduleImpliedTotals();
  const samples = buildSamples(raw, vegas);
  console.log(`Built ${samples.length} samples (>= ${MIN_PRIOR_GAMES} prior games); ${[...vegas.keys()].length} team-week Vegas totals.\n`);

  const opts = { rounds: 8, learningRate: 0.2, minTrainWeeks: 4, purgeWeeks: 1, embargoWeeks: 1 };
  type Row = { name: string; feats: number; modelMae: number; naiveMae: number; marginPct: number; t: number; beats: boolean };
  const results: Row[] = [];
  for (const g of GROUPS) {
    const report = runTweedieBaselineBacktest(samples, { ...opts, clearedFeatureIds: [...g.ids] });
    const cw = report.clarkWest;
    const marginPct = cw.marketMae === 0 ? 0 : ((cw.marketMae - cw.modelMae) / cw.marketMae) * 100;
    results.push({ name: g.name, feats: g.ids.length, modelMae: cw.modelMae, naiveMae: cw.marketMae, marginPct, t: cw.tStatistic, beats: cw.beatsMarket });
    console.log(`  ran ${g.name} (${g.ids.length} feats): model ${cw.modelMae} vs naive ${cw.marketMae} — beats=${cw.beatsMarket}`);
  }

  console.log(`\n================ BAKE-OFF (OOS, vs naive points-persistence) ================`);
  console.log(`group               feats   modelMAE   naiveMAE   margin%   t-stat   beatsNaive`);
  for (const r of results) {
    console.log(
      `${r.name.padEnd(19)} ${String(r.feats).padStart(3)}    ` +
      `${r.modelMae.toFixed(4).padStart(8)}   ${r.naiveMae.toFixed(4).padStart(8)}   ` +
      `${r.marginPct.toFixed(2).padStart(6)}   ${r.t.toFixed(2).padStart(6)}   ${r.beats}`,
    );
  }
  console.log(`=============================================================================`);
  console.log(`\nNOTE: margin% > 0 means model MAE is BELOW naive (good). beatsNaive requires`);
  console.log(`Clark-West n>=30 & t>1.64 & modelMAE<naiveMAE. FREE features only — no Vegas.`);
  console.log(`Nothing here flips a gate; priced=false / shadow.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
