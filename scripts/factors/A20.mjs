#!/usr/bin/env node
/**
 * scripts/factors/A20.mjs — C-401 backup-QB effect on receiver usage.
 *
 * Estimand: WR1 residual target_share (pp vs trailing-5) under a non-Week-1
 * starter. Secondary: air_yards_share residual. kill_line in A20.yaml.
 */

import path from "node:path";
import {
  REPO_ROOT,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  decidePositiveEffect,
  eraOf,
  headSha,
  loadGames,
  loadPlayerStats,
  mean,
  round,
  shareScale,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A20";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A20.yaml");
const TRAILING = 5;
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
  "air_yards_share",
];

const GAMES_COLS = ["season", "week", "game_type", "home_team", "away_team", "home_qb_id", "away_qb_id"];

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

  /** `${season}|${week}|${team}` → qbId */
  const qbByTeamGame = new Map();
  /** `${season}|${team}|week` list for week-1 starter */
  const week1Qb = new Map();
  const regGames = [];
  for (const g of gamesRec.records) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const week = Number(g.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    regGames.push({ season, week, home: g.home_team, away: g.away_team, hqb: g.home_qb_id, aqb: g.away_qb_id });
    if (g.home_team && g.home_qb_id) qbByTeamGame.set(`${season}|${week}|${g.home_team}`, g.home_qb_id);
    if (g.away_team && g.away_qb_id) qbByTeamGame.set(`${season}|${week}|${g.away_team}`, g.away_qb_id);
  }
  for (const g of regGames) {
    if (g.week !== 1) continue;
    if (g.home && g.hqb) week1Qb.set(`${g.season}|${g.home}`, g.hqb);
    if (g.away && g.aqb) week1Qb.set(`${g.season}|${g.away}`, g.aqb);
  }
  console.log(`[${TAG}] QB index=${qbByTeamGame.size} week1 starters=${week1Qb.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const wrRows = [];
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    if ((r.position ?? "").toUpperCase() !== "WR") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const playerId = r.player_id;
    const ts = Number(r.target_share);
    if (!Number.isFinite(season) || !Number.isFinite(week) || !playerId || !Number.isFinite(ts)) continue;
    wrRows.push({
      playerId,
      playerName: r.player_display_name || playerId,
      season,
      week,
      team: r.recent_team || "",
      targets: Number(r.targets) || 0,
      tsRaw: ts,
      aysRaw: Number(r.air_yards_share),
    });
  }
  wrRows.sort((a, b) => a.season - b.season || a.week - b.week || a.playerId.localeCompare(b.playerId));

  // Season WR1 from full-season WR targets (ex-post label for "team WR1"); rolling alternative noted in notes.
  const seasonTargets = new Map();
  const seasonGames = new Map();
  for (const row of wrRows) {
    const sk = `${row.season}|${row.team}`;
    const tmap = seasonTargets.get(sk) ?? new Map();
    tmap.set(row.playerId, (tmap.get(row.playerId) ?? 0) + row.targets);
    seasonTargets.set(sk, tmap);
    const gmap = seasonGames.get(sk) ?? new Map();
    gmap.set(row.playerId, (gmap.get(row.playerId) ?? 0) + 1);
    seasonGames.set(sk, gmap);
  }
  const wr1 = new Map();
  for (const [sk, tmap] of seasonTargets) {
    const gmap = seasonGames.get(sk) ?? new Map();
    let best = null;
    let bestT = -1;
    for (const [pid, tot] of tmap) {
      if ((gmap.get(pid) ?? 0) < MIN_WR1_GAMES) continue;
      if (tot > bestT) {
        bestT = tot;
        best = pid;
      }
    }
    if (best) wr1.set(sk, best);
  }

  const tsScale = shareScale(wrRows.map((r) => r.tsRaw));
  const aysScale = shareScale(wrRows.map((r) => r.aysRaw));

  const byPlayer = new Map();
  for (const row of wrRows) {
    const sk = `${row.season}|${row.team}`;
    if (wr1.get(sk) !== row.playerId) continue;
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row);
    byPlayer.set(row.playerId, list);
  }

  const obs = [];
  for (const games of byPlayer.values()) {
    games.sort((a, b) => a.season - b.season || a.week - b.week);
    for (let idx = 0; idx < games.length; idx += 1) {
      const g = games[idx];
      const prior = games.slice(Math.max(0, idx - TRAILING), idx);
      if (prior.length < TRAILING) continue;
      const era = eraOf(g.season);
      if (era === "other") continue;
      const qb = qbByTeamGame.get(`${g.season}|${g.week}|${g.team}`);
      const w1 = week1Qb.get(`${g.season}|${g.team}`);
      if (!qb || !w1) continue;
      const residualTs = g.tsRaw * tsScale - mean(prior.map((p) => p.tsRaw * tsScale));
      const residualAys =
        Number.isFinite(g.aysRaw) && prior.every((p) => Number.isFinite(p.aysRaw))
          ? g.aysRaw * aysScale - mean(prior.map((p) => p.aysRaw * aysScale))
          : null;
      obs.push({
        playerId: g.playerId,
        season: g.season,
        week: g.week,
        era,
        backup: qb !== w1,
        residualTs,
        residualAys,
      });
    }
  }

  function analyze(era, key) {
    const list = obs.filter((o) => o.era === era && Number.isFinite(o[key]));
    const treated = list.filter((o) => o.backup);
    const control = list.filter((o) => !o.backup);
    if (treated.length === 0 || control.length === 0) {
      return { theta: NaN, ci: [NaN, NaN], mde: NaN, n: treated.length, n0: control.length };
    }
    const vals = treated.map((o) => o[key]);
    const clusters = treated.map((o) => o.playerId);
    // Estimand: mean residual under backup (baseline is trailing-5, so control mean is the no-backup residual).
    // Report backup residual minus no-backup residual (concentration loss is negative).
    const crT = clusterRobustMean(treated.map((o) => o[key]), treated.map((o) => o.playerId));
    const crC = clusterRobustMean(control.map((o) => o[key]), control.map((o) => o.playerId));
    const theta = crT.theta - crC.theta;
    // Conservative SE: sqrt(seT^2 + seC^2)
    const se = Math.sqrt(crT.se ** 2 + crC.se ** 2);
    return {
      theta,
      rawBackup: crT.theta,
      rawControl: crC.theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      n: treated.length,
      n0: control.length,
      se,
    };
  }

  const dTs = analyze("discover", "residualTs");
  const vTs = analyze("validate", "residualTs");
  const vAys = analyze("validate", "residualAys");

  console.log(
    `[${TAG}] validate WR1 ΔTS backup−starter=${round(vTs.theta, 4)} CI[${round(vTs.ci[0], 4)},${round(vTs.ci[1], 4)}] nBackup=${vTs.n} nStart=${vTs.n0}`,
  );
  console.log(
    `[${TAG}] validate ΔAYS=${round(vAys.theta, 4)} CI[${round(vAys.ci[0], 4)},${round(vAys.ci[1], 4)}]`,
  );
  console.log(`[${TAG}] discover ΔTS=${round(dTs.theta, 4)} CI[${round(dTs.ci[0], 4)},${round(dTs.ci[1], 4)}]`);

  if (!Number.isFinite(vTs.theta) || vTs.n === 0) {
    writeYamlBlocked(YAML, "zero WR1 backup-QB observations in validate era", runSha, runAt);
    return 2;
  }

  // kill_line: residual under backup >= 0 (no concentration loss) or CI includes 0 with n>=300
  // A negative theta supports the hypothesis (loss). If theta >= 0 → DEAD (no loss).
  // If theta < 0 but CI includes 0 and n>=300 → DEAD.
  let status;
  if (vTs.theta >= 0) status = "DEAD";
  else if (vTs.ci[0] <= 0 && vTs.ci[1] >= 0 && vTs.n >= 300) status = "DEAD";
  else if (vTs.theta < 0 && !(vTs.ci[0] <= 0 && vTs.ci[1] >= 0)) status = "CANDIDATE";
  else if (vTs.theta < 0 && vTs.n < 300) status = "CANDIDATE";
  else status = "DEAD";

  const notes = [
    "C-401. Backup = games.csv QB id != team Week-1 starter. WR1 = season WR targets leader (min 8 games).",
    "Primary: WR1 residual target_share (pp vs trailing-5), backup minus starter means, conservative SE.",
    `Validate nBackup=${vTs.n} nStart=${vTs.n0} Δ=${round(vTs.theta, 4)} ` +
      `CI[${round(vTs.ci[0], 4)},${round(vTs.ci[1], 4)}] MDE80=${round(vTs.mde, 4)}; ` +
      `backup mean=${round(vTs.rawBackup, 4)} starter mean=${round(vTs.rawControl, 4)}.`,
    `Secondary ΔAYS=${round(vAys.theta, 4)} CI[${round(vAys.ci[0], 4)},${round(vAys.ci[1], 4)}].`,
    `Discover nBackup=${dTs.n} Δ=${round(dTs.theta, 4)} CI[${round(dTs.ci[0], 4)},${round(dTs.ci[1], 4)}].`,
    "YAML lists 1999-2019/2020-2024; this run uses 2017-2024 (discover 2017-2019).",
    "Data: nflverse player_stats + nfldata games.csv (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: vTs.theta,
    ci: vTs.ci,
    n: vTs.n,
    mde: vTs.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(vTs.theta, 4)} n=${vTs.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
