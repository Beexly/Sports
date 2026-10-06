#!/usr/bin/env node
/**
 * scripts/factors/A22.mjs — C-403 red-zone target share → anytime TD.
 *
 * Estimand: anytime-TD hit-rate delta, top vs bottom tercile of player-game
 * RZ target share. Posted TD lines are not in the free spine (named, not
 * invented). kill_line in docs/factors/A22.yaml.
 */

import path from "node:path";
import {
  PBP_URL,
  REPO_ROOT,
  SEASONS,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  decidePositiveEffect,
  eraOf,
  headSha,
  loadJsonlCache,
  loadPlayerStats,
  parseCsv,
  round,
  saveJsonlCache,
  toNumber,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A22";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A22.yaml");
const noCache = process.argv.includes("--no-cache");
const RZ_YARDLINE = 20;
const MIN_TARGETS = 2;

const PBP_COLS = [
  "game_id",
  "season",
  "week",
  "season_type",
  "home_team",
  "away_team",
  "posteam",
  "yardline_100",
  "pass_attempt",
  "complete_pass",
  "receiver_player_id",
  "play_type",
];

const STATS_COLS = [
  "player_id",
  "player_display_name",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "targets",
  "receiving_tds",
  "rushing_tds",
];

function projectPbpRow(r) {
  return {
    game_id: r.game_id ?? "",
    season: toNumber(r.season),
    week: toNumber(r.week),
    season_type: r.season_type ?? "",
    posteam: r.posteam ?? "",
    yardline_100: toNumber(r.yardline_100),
    pass_attempt: toNumber(r.pass_attempt),
    receiver_player_id: r.receiver_player_id ?? "",
  };
}

async function loadPbpSeason(season) {
  const cacheName = `pbp_rz_${season}.jsonl`;
  const cached = loadJsonlCache(cacheName, noCache);
  if (cached !== null) {
    console.log(`[${TAG}] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[${TAG}] pbp ${season}: fetching ${url}`);
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(300_000),
    headers: { "user-agent": `gse-factor-foundry-${TAG}/1.0 (research; nflverse CC-BY-4.0)` },
  });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { gunzipSync } = await import("node:zlib");
  const text =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveJsonlCache(cacheName, rows);
  console.log(`[${TAG}] pbp ${season}: projected ${rows.length} rows`);
  return rows;
}

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let allPbp = [];
  try {
    for (const season of SEASONS) {
      const rows = await loadPbpSeason(season);
      allPbp = allPbp.concat(rows);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse pbp unreachable: ${msg}`, runSha, runAt);
    return 2;
  }
  if (allPbp.length === 0) {
    writeYamlBlocked(YAML, "zero pbp rows after projection", runSha, runAt);
    return 2;
  }
  console.log(`[${TAG}] total projected pbp=${allPbp.length}`);

  // Team-game RZ pass attempts + player RZ targets
  /** `${game_id}|${posteam}` → team RZ pass attempts */
  const teamRzAtt = new Map();
  /** `${game_id}|${receiver}` → player RZ targets */
  const playerRzTgt = new Map();
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (p.pass_attempt !== 1) continue;
    if (p.yardline_100 == null || p.yardline_100 > RZ_YARDLINE) continue;
    const tgKey = `${p.game_id}|${p.posteam}`;
    teamRzAtt.set(tgKey, (teamRzAtt.get(tgKey) ?? 0) + 1);
    if (p.receiver_player_id) {
      const prKey = `${p.game_id}|${p.receiver_player_id}`;
      playerRzTgt.set(prKey, (playerRzTgt.get(prKey) ?? 0) + 1);
    }
  }
  console.log(`[${TAG}] team-games with RZ att=${teamRzAtt.size} player RZ targets=${playerRzTgt.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** Build game_id from season/week/teams: nflverse format `YYYY_WW_AWAY_HOME` */
  // Map season|week|team → game_id from pbp
  const gameIdByTeamWeek = new Map();
  for (const p of allPbp) {
    if (!p.game_id || !p.season || !p.week) continue;
    const home = p.game_id.split("_").slice(3).join("_"); // e.g. 2023_01_ARI_WAS → WAS? actually away_home
    // Format is YYYY_WW_AWAY_HOME
    const parts = p.game_id.split("_");
    if (parts.length < 4) continue;
    const away = parts[2];
    const homeTeam = parts.slice(3).join("_");
    gameIdByTeamWeek.set(`${p.season}|${p.week}|${away}`, p.game_id);
    gameIdByTeamWeek.set(`${p.season}|${p.week}|${homeTeam}`, p.game_id);
  }

  const skill = new Set(["WR", "TE", "RB"]);
  const obs = [];
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!skill.has((r.position ?? "").toUpperCase())) continue;
    const playerId = r.player_id;
    const season = Number(r.season);
    const week = Number(r.week);
    const targets = Number(r.targets) || 0;
    if (!playerId || !Number.isFinite(season) || !Number.isFinite(week)) continue;
    if (targets < MIN_TARGETS) continue;
    const team = r.recent_team || "";
    const gameId = gameIdByTeamWeek.get(`${season}|${week}|${team}`);
    if (!gameId) continue;
    const teamAtt = teamRzAtt.get(`${gameId}|${team}`) ?? 0;
    const rzTgt = playerRzTgt.get(`${gameId}|${playerId}`) ?? 0;
    if (teamAtt <= 0) continue;
    const rzShare = rzTgt / teamAtt;
    const tds = (Number(r.receiving_tds) || 0) + (Number(r.rushing_tds) || 0);
    const era = eraOf(season);
    if (era === "other") continue;
    obs.push({
      playerId,
      season,
      week,
      era,
      rzShare,
      rzTgt,
      hit: tds > 0 ? 1 : 0,
    });
  }
  console.log(`[${TAG}] player-game observations=${obs.length}`);

  function terciles(list) {
    const sorted = list.map((o) => o.rzShare).sort((a, b) => a - b);
    const q = (p) => {
      if (sorted.length === 0) return NaN;
      const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
      return sorted[i];
    };
    const t1 = q(1 / 3);
    const t2 = q(2 / 3);
    return { t1, t2 };
  }

  function analyze(era) {
    const list = obs.filter((o) => o.era === era && Number.isFinite(o.rzShare));
    if (list.length < 30) return { theta: NaN, ci: [NaN, NaN], mde: NaN, n: 0, n0: 0 };
    const { t1, t2 } = terciles(list);
    const bottom = list.filter((o) => o.rzShare <= t1);
    const top = list.filter((o) => o.rzShare >= t2);
    if (bottom.length === 0 || top.length === 0) return { theta: NaN, ci: [NaN, NaN], mde: NaN, n: top.length, n0: bottom.length };
    const crT = clusterRobustMean(top.map((o) => o.hit), top.map((o) => o.playerId));
    const crB = clusterRobustMean(bottom.map((o) => o.hit), bottom.map((o) => o.playerId));
    const theta = crT.theta - crB.theta;
    const se = Math.sqrt(crT.se ** 2 + crB.se ** 2);
    return {
      theta,
      topRate: crT.theta,
      bottomRate: crB.theta,
      baseRate: list.reduce((a, o) => a + o.hit, 0) / list.length,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      n: top.length,
      n0: bottom.length,
      t1,
      t2,
    };
  }

  const d = analyze("discover");
  const v = analyze("validate");

  console.log(
    `[${TAG}] validate Δhit top−bottom=${round(v.theta, 4)} CI[${round(v.ci[0], 4)},${round(v.ci[1], 4)}] nTop=${v.n} nBot=${v.n0} base=${round(v.baseRate, 4)}`,
  );
  console.log(`[${TAG}] discover Δhit=${round(d.theta, 4)} CI[${round(d.ci[0], 4)},${round(d.ci[1], 4)}]`);

  if (!Number.isFinite(v.theta) || v.n === 0) {
    writeYamlBlocked(YAML, "zero RZ-tercile observations in validate era", runSha, runAt);
    return 2;
  }

  const status = decidePositiveEffect({ theta: v.theta, ci: v.ci, n: v.n, minN: 300 });

  const notes = [
    "C-403. RZ target share = player RZ targets / team RZ pass attempts (pbp yardline_100<=20, pass_attempt).",
    "Players need >=2 targets that game. Anytime TD = receiving_tds+rushing_tds>0 (player_stats).",
    "Posted player-TD lines are not in the free spine — comparison is tercile hit rates vs era base rate (named, not invented).",
    `Validate top n=${v.n} rate=${round(v.topRate, 4)} bottom n=${v.n0} rate=${round(v.bottomRate, 4)} ` +
      `Δ=${round(v.theta, 4)} CI[${round(v.ci[0], 4)},${round(v.ci[1], 4)}] MDE80=${round(v.mde, 4)} base=${round(v.baseRate, 4)}; ` +
      `terciles t1=${round(v.t1, 4)} t2=${round(v.t2, 4)}.`,
    `Discover nTop=${d.n} Δ=${round(d.theta, 4)} CI[${round(d.ci[0], 4)},${round(d.ci[1], 4)}].`,
    "YAML lists 1999-2019/2020-2024; this run uses 2017-2024 (discover 2017-2019).",
    "Data: nflverse pbp + player_stats (CC BY 4.0), projected cache under packages/verifier/data/; no DB.",
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
