#!/usr/bin/env node
/**
 * scripts/factors/A24.mjs — C-405 numerical runner for docs/factors/A24.yaml.
 *
 * Estimand: does the post-bye usage bump (target-share residual vs trailing
 * mean) differ by player age? Age >= 29 vs < 29 at the post-bye game.
 *
 * kill_line: validate-era (age>=29 residual) - (age<29 residual) <= 0 or 95%
 * CI includes 0 with n >= 100 -> DEAD.
 *
 * Data: nfldata games.csv (rest, gameday) + nflverse weekly_rosters
 * (birth_date) + nflverse player_stats (target_share). CC BY 4.0, local
 * cache under packages/verifier/data/. No credential, no DB.
 *
 * Usage:
 *   node scripts/factors/A24.mjs
 *   node scripts/factors/A24.mjs --no-cache
 */

import path from "node:path";
import {
  GAMES_URL,
  REPO_ROOT,
  ROSTER_WEEKLY_URL,
  SEASONS,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  eraOf,
  headSha,
  loadGames,
  loadPlayerStats,
  loadText,
  parseCsv,
  round,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A24";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A24.yaml");
const noCache = process.argv.includes("--no-cache");

const SKILL_POS = new Set(["WR", "TE", "RB"]);
const BYE_REST_DAYS = 12;
const OLD_AGE_YEARS = 29;
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

const GAMES_COLS = ["season", "week", "game_type", "home_team", "away_team", "home_rest", "away_rest", "gameday"];
const ROSTER_COLS = ["season", "team", "position", "birth_date", "gsis_id", "week", "game_type"];
const STATS_COLS = ["player_id", "position", "season", "week", "season_type", "recent_team", "target_share"];

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let games;
  try {
    games = await loadGames({ noCache, tag: TAG, cols: GAMES_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** `${season}|${week}|${team}` -> { rest, gameday } */
  const restByTeamGame = new Map();
  for (const r of games.records) {
    if ((r.game_type ?? "").toUpperCase() !== "REG") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    const gameday = r.gameday;
    const homeRest = Number(r.home_rest);
    const awayRest = Number(r.away_rest);
    if (r.home_team) restByTeamGame.set(`${season}|${week}|${r.home_team}`, { rest: homeRest, gameday });
    if (r.away_team) restByTeamGame.set(`${season}|${week}|${r.away_team}`, { rest: awayRest, gameday });
  }
  console.log(`[${TAG}] games team-rows: ${restByTeamGame.size}`);

  let birthDate = new Map();
  try {
    for (const season of SEASONS) {
      const name = `roster_weekly_${season}.csv`;
      const loaded = await loadText(name, ROSTER_WEEKLY_URL(season), { noCache, tag: TAG });
      const rows = parseCsv(loaded.text, ROSTER_COLS).records;
      for (const r of rows) {
        if (r.gsis_id && r.birth_date && !birthDate.has(r.gsis_id)) birthDate.set(r.gsis_id, r.birth_date);
      }
      console.log(`[${TAG}] roster_weekly ${season}: ${rows.length} rows ${loaded.cached ? "(cache)" : ""}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse weekly_rosters unreachable: ${msg}`, runSha, runAt);
    return 2;
  }
  if (birthDate.size === 0) {
    writeYamlBlocked(YAML, "zero birth_date entries after fetch", runSha, runAt);
    return 2;
  }

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** pid -> sorted [{season, week, ts}] REG skill-position rows */
  const byPlayer = new Map();
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const pos = (r.position ?? "").toUpperCase();
    if (!SKILL_POS.has(pos)) continue;
    const pid = r.player_id;
    const team = r.recent_team;
    const season = Number(r.season);
    const week = Number(r.week);
    const ts = Number(r.target_share);
    if (!pid || !team || !Number.isFinite(season) || !Number.isFinite(week) || !Number.isFinite(ts)) continue;
    const list = byPlayer.get(pid) ?? [];
    list.push({ season, week, team, ts });
    byPlayer.set(pid, list);
  }

  const obs = [];
  for (const [pid, listRaw] of byPlayer) {
    const list = listRaw.slice().sort((a, b) => a.season - b.season || a.week - b.week);
    for (let i = 0; i < list.length; i += 1) {
      const cur = list[i];
      const key = `${cur.season}|${cur.week}|${cur.team}`;
      const restInfo = restByTeamGame.get(key);
      if (!restInfo || !Number.isFinite(restInfo.rest) || restInfo.rest < BYE_REST_DAYS) continue;
      // trailing games: same season, prior weeks, up to 3 most recent
      const trail = [];
      for (let j = i - 1; j >= 0 && trail.length < 3; j -= 1) {
        if (list[j].season !== cur.season) break;
        trail.push(list[j].ts);
      }
      if (trail.length < 2) continue;
      const trailMean = trail.reduce((a, b) => a + b, 0) / trail.length;
      const residual = cur.ts - trailMean;
      const bd = birthDate.get(pid);
      if (!bd || !restInfo.gameday) continue;
      const ageMs = new Date(restInfo.gameday).getTime() - new Date(bd).getTime();
      if (!Number.isFinite(ageMs) || ageMs <= 0) continue;
      const age = ageMs / MS_PER_YEAR;
      const era = eraOf(cur.season);
      if (era === "other") continue;
      obs.push({ era, player: pid, age, residual });
    }
  }
  console.log(`[${TAG}] post-bye observations with age: ${obs.length}`);

  function analyze(era) {
    const list = obs.filter((o) => o.era === era);
    const old = list.filter((o) => o.age >= OLD_AGE_YEARS);
    const young = list.filter((o) => o.age < OLD_AGE_YEARS);
    if (old.length === 0 || young.length === 0) {
      return { theta: NaN, ci: [NaN, NaN], mde: NaN, nOld: old.length, nYoung: young.length };
    }
    const crOld = clusterRobustMean(old.map((o) => o.residual), old.map((o) => o.player));
    const crYoung = clusterRobustMean(young.map((o) => o.residual), young.map((o) => o.player));
    const theta = crOld.theta - crYoung.theta;
    const se = Math.sqrt(crOld.se ** 2 + crYoung.se ** 2);
    return {
      theta,
      oldMean: crOld.theta,
      youngMean: crYoung.theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      nOld: old.length,
      nYoung: young.length,
    };
  }

  const validate = analyze("validate");
  const discover = analyze("discover");
  console.log(
    `[${TAG}] validate Δ=${round(validate.theta, 5)} CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] nOld=${validate.nOld} nYoung=${validate.nYoung}`,
  );
  console.log(`[${TAG}] discover Δ=${round(discover.theta, 5)} nOld=${discover.nOld} nYoung=${discover.nYoung}`);

  const n = validate.nOld + validate.nYoung;
  if (!Number.isFinite(validate.theta) || n === 0) {
    writeYamlBlocked(YAML, "zero post-bye age-splittable observations in validate era", runSha, runAt);
    return 2;
  }

  let status;
  const ciIncludesZero = validate.ci[0] <= 0 && validate.ci[1] >= 0;
  if (validate.theta <= 0) status = "DEAD";
  else if (ciIncludesZero && n >= 100) status = "DEAD";
  else status = "CANDIDATE";

  const notes = [
    "C-405. Bye = games.csv rest field >= 12 days for that team-week. Age = (gameday - birth_date) at the post-bye game.",
    "Trailing baseline: up to 3 most recent same-season games (>=2 required), player's own mean target_share.",
    `Validate nOld=${validate.nOld} nYoung=${validate.nYoung} Δ=${round(validate.theta, 5)} ` +
      `CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] MDE80=${round(validate.mde, 5)}; ` +
      `oldMean=${round(validate.oldMean, 5)} youngMean=${round(validate.youngMean, 5)}.`,
    `Discover nOld=${discover.nOld} nYoung=${discover.nYoung} Δ=${round(discover.theta, 5)}.`,
    "Data: nfldata games.csv + nflverse weekly_rosters + player_stats (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: validate.theta,
    ci: validate.ci,
    n,
    mde: validate.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(validate.theta, 5)} n=${n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
