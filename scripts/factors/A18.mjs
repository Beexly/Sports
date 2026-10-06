#!/usr/bin/env node
/**
 * scripts/factors/A18.mjs — C-399 primetime target concentration.
 *
 * Estimand: within-player mean WR1 target_share (pp), primetime minus Sunday
 * 1pm, CR1 by player. kill_line in docs/factors/A18.yaml.
 */

import path from "node:path";
import {
  REPO_ROOT,
  VALIDATE_MAX,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  decidePositiveEffect,
  eraOf,
  headSha,
  loadGames,
  loadPlayerStats,
  round,
  shareScale,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A18";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A18.yaml");
const noCache = process.argv.includes("--no-cache");
const MIN_WR1_GAMES = 8;

const STATS_COLS = [
  "player_id",
  "player_display_name",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "targets",
  "target_share",
];

const GAMES_COLS = ["season", "week", "game_type", "gameday", "weekday", "gametime", "home_team", "away_team"];

/** Sunday early window = 1pm control. Primetime = 19:00+ or non-Sunday night football weekdays. */
function classifyWindow(weekday, gametime) {
  const wd = (weekday ?? "").toString();
  const gt = (gametime ?? "").toString();
  const hour = gt.includes(":") ? Number(gt.split(":")[0]) : NaN;
  const isSunday = wd === "Sunday";
  const isEarlySunday = isSunday && (hour === 12 || hour === 13);
  const isPrimetime =
    (Number.isFinite(hour) && hour >= 19) ||
    (!isSunday && ["Thursday", "Monday", "Tuesday", "Wednesday"].includes(wd) && (hour >= 19 || !Number.isFinite(hour)));
  if (isEarlySunday) return "one_pm";
  if (isPrimetime) return "primetime";
  return "other";
}

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let gamesRec;
  try {
    gamesRec = await loadGames({ noCache, tag: TAG, cols: GAMES_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** `${season}|${week}|${team}` → {weekday, gametime} */
  const kickoff = new Map();
  for (const g of gamesRec.records) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const week = Number(g.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    const meta = { weekday: g.weekday ?? "", gametime: g.gametime ?? "" };
    if (g.home_team) kickoff.set(`${season}|${week}|${g.home_team}`, meta);
    if (g.away_team) kickoff.set(`${season}|${week}|${g.away_team}`, meta);
  }
  console.log(`[${TAG}] kickoff index=${kickoff.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** `${season}|${team}` → Map playerId → total targets among WR REG games */
  const wrTargets = new Map();
  const wrGames = new Map();
  const wrRows = [];
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    if ((r.position ?? "").toUpperCase() !== "WR") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const playerId = r.player_id;
    const team = r.recent_team || "";
    const ts = Number(r.target_share);
    if (!Number.isFinite(season) || !Number.isFinite(week) || !playerId || !Number.isFinite(ts)) continue;
    const t = Number(r.targets) || 0;
    const sk = `${season}|${team}`;
    const tmap = wrTargets.get(sk) ?? new Map();
    tmap.set(playerId, (tmap.get(playerId) ?? 0) + t);
    wrTargets.set(sk, tmap);
    const gmap = wrGames.get(sk) ?? new Map();
    gmap.set(playerId, (gmap.get(playerId) ?? 0) + 1);
    wrGames.set(sk, gmap);
    wrRows.push({ playerId, playerName: r.player_display_name || playerId, season, week, team, tsRaw: ts, targets: t });
  }

  // Season WR1 = most targets among WRs, min MIN_WR1_GAMES games
  const wr1ByTeamSeason = new Map();
  for (const [sk, tmap] of wrTargets) {
    const gmap = wrGames.get(sk) ?? new Map();
    let best = null;
    let bestT = -1;
    for (const [pid, tot] of tmap) {
      const ng = gmap.get(pid) ?? 0;
      if (ng < MIN_WR1_GAMES) continue;
      if (tot > bestT) {
        bestT = tot;
        best = pid;
      }
    }
    if (best) wr1ByTeamSeason.set(sk, best);
  }
  console.log(`[${TAG}] team-seasons with WR1: ${wr1ByTeamSeason.size}`);

  const tsScale = shareScale(wrRows.map((r) => r.tsRaw));
  /** playerId → { primetime: [], onePm: [] } */
  const byPlayer = new Map();
  for (const row of wrRows) {
    const sk = `${row.season}|${row.team}`;
    if (wr1ByTeamSeason.get(sk) !== row.playerId) continue;
    const meta = kickoff.get(`${row.season}|${row.week}|${row.team}`);
    if (!meta) continue;
    const win = classifyWindow(meta.weekday, meta.gametime);
    if (win === "other") continue;
    const era = eraOf(row.season);
    if (era === "other") continue;
    const entry = byPlayer.get(row.playerId) ?? { playerId: row.playerId, playerName: row.playerName, primetime: [], onePm: [], eras: new Set() };
    const ts = row.tsRaw * tsScale;
    if (win === "primetime") entry.primetime.push({ ts, era });
    else entry.onePm.push({ ts, era });
    entry.eras.add(era);
    byPlayer.set(row.playerId, entry);
  }

  function deltasFor(era) {
    const deltas = [];
    const clusters = [];
    let nPt = 0;
    let n1 = 0;
    for (const e of byPlayer.values()) {
      const pt = e.primetime.filter((x) => x.era === era).map((x) => x.ts);
      const one = e.onePm.filter((x) => x.era === era).map((x) => x.ts);
      if (pt.length === 0 || one.length === 0) continue;
      nPt += pt.length;
      n1 += one.length;
      deltas.push(pt.reduce((a, b) => a + b, 0) / pt.length - (one.reduce((a, b) => a + b, 0) / one.length));
      clusters.push(e.playerId);
    }
    const cr = clusterRobustMean(deltas, clusters);
    return {
      theta: cr.theta,
      ci: [cr.theta - Z_95 * cr.se, cr.theta + Z_95 * cr.se],
      mde: Number.isFinite(cr.se) ? Z_SUM_80PCT * cr.se : NaN,
      n: cr.n,
      G: cr.G,
      nPt,
      n1,
    };
  }

  const d = deltasFor("discover");
  const v = deltasFor("validate");
  console.log(
    `[${TAG}] validate within-player Δ=${round(v.theta, 4)} CI[${round(v.ci[0], 4)},${round(v.ci[1], 4)}] players=${v.G} ptGames=${v.nPt} 1pmGames=${v.n1}`,
  );
  console.log(
    `[${TAG}] discover within-player Δ=${round(d.theta, 4)} CI[${round(d.ci[0], 4)},${round(d.ci[1], 4)}]`,
  );

  if (!Number.isFinite(v.theta) || v.n === 0) {
    writeYamlBlocked(YAML, "zero WR1 players with both primetime and 1pm games in validate era", runSha, runAt);
    return 2;
  }

  const status = decidePositiveEffect({ theta: v.theta, ci: v.ci, n: v.n, minN: 300 });

  const notes = [
    "C-399. WR1 = team WR with most targets (min 8 REG games) that season.",
    "Primetime = hour>=19 or Thu/Mon/Tue/Wed night; control = Sunday 12:30/13:00/13:05.",
    "Within-player mean(TS primetime)-mean(TS 1pm) in pp, CR1 by player.",
    `Validate players=${v.G} Δ=${round(v.theta, 4)} CI[${round(v.ci[0], 4)},${round(v.ci[1], 4)}] MDE80=${round(v.mde, 4)} ` +
      `(pt games ${v.nPt}, 1pm games ${v.n1}).`,
    `Discover players=${d.G} Δ=${round(d.theta, 4)} CI[${round(d.ci[0], 4)},${round(d.ci[1], 4)}].`,
    "YAML lists 1999-2019/2020-2024; this run uses 2017-2024 (discover 2017-2019).",
    "Data: nflverse player_stats + nfldata games.csv (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: v.theta,
    ci: v.ci,
    n: v.n,
    mde: v.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(v.theta, 4)} n=${v.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
