#!/usr/bin/env node
/**
 * scripts/factors/A25.mjs — C-406 numerical runner for docs/factors/A25.yaml.
 *
 * Estimand: A5 (Borghesi wind-on-totals) extended to player yardage. Outcome
 * = player yards residual (actual minus trailing-3-game mean) for games with
 * wind >= 15 mph on an open/outdoors roof, vs the indoor (dome/closed)
 * baseline. Receiving yards (WR/TE/RB) is primary; passing yards (QB) is
 * reported secondary in notes.
 *
 * No posted player prop line exists in the free spine for any historical
 * season (same honest limit A22 already states), so this is a
 * trailing-baseline residual, not a book-line comparison.
 *
 * kill_line: validate-era wind-minus-indoor residual difference >= 0 (no
 * suppression) or 95% CI includes 0 with n >= 200 -> DEAD.
 *
 * Data: nfldata games.csv (wind/roof) + nflverse player_stats (yards). CC BY
 * 4.0, local cache under packages/verifier/data/. No credential, no DB.
 *
 * Usage:
 *   node scripts/factors/A25.mjs
 *   node scripts/factors/A25.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  eraOf,
  headSha,
  loadGames,
  loadPlayerStats,
  round,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A25";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A25.yaml");
const noCache = process.argv.includes("--no-cache");

const WIND_MIN_MPH = 15;
const OPEN_ROOFS = new Set(["outdoors", "open"]);
const INDOOR_ROOFS = new Set(["dome", "closed"]);
const RECEIVING_POS = new Set(["WR", "TE", "RB"]);

const GAMES_COLS = ["season", "week", "game_type", "home_team", "away_team", "roof", "wind"];
const STATS_COLS = [
  "player_id",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "passing_yards",
  "receiving_yards",
];

function envGroup(roof, wind) {
  const r = (roof ?? "").toLowerCase();
  if (INDOOR_ROOFS.has(r)) return "indoor";
  if (OPEN_ROOFS.has(r) && Number.isFinite(wind) && wind >= WIND_MIN_MPH) return "wind";
  return null;
}

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

  /** `${season}|${week}|${team}` -> "wind"|"indoor"|null */
  const envByTeamGame = new Map();
  for (const r of games.records) {
    if ((r.game_type ?? "").toUpperCase() !== "REG") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    const grp = envGroup(r.roof, Number(r.wind));
    if (!grp) continue;
    if (r.home_team) envByTeamGame.set(`${season}|${week}|${r.home_team}`, grp);
    if (r.away_team) envByTeamGame.set(`${season}|${week}|${r.away_team}`, grp);
  }
  console.log(`[${TAG}] classified team-games: ${envByTeamGame.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  function collect(position, field) {
    const byPlayer = new Map();
    for (const r of stats.records) {
      if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
      const pos = (r.position ?? "").toUpperCase();
      if (position === "QB" && pos !== "QB") continue;
      if (position === "REC" && !RECEIVING_POS.has(pos)) continue;
      const pid = r.player_id;
      const team = r.recent_team;
      const season = Number(r.season);
      const week = Number(r.week);
      const yards = Number(r[field]);
      if (!pid || !team || !Number.isFinite(season) || !Number.isFinite(week) || !Number.isFinite(yards)) continue;
      const list = byPlayer.get(pid) ?? [];
      list.push({ season, week, team, yards });
      byPlayer.set(pid, list);
    }
    const obs = [];
    for (const [pid, listRaw] of byPlayer) {
      const list = listRaw.slice().sort((a, b) => a.season - b.season || a.week - b.week);
      for (let i = 0; i < list.length; i += 1) {
        const cur = list[i];
        const grp = envByTeamGame.get(`${cur.season}|${cur.week}|${cur.team}`);
        if (!grp) continue;
        const trail = [];
        for (let j = i - 1; j >= 0 && trail.length < 3; j -= 1) {
          if (list[j].season !== cur.season) break;
          trail.push(list[j].yards);
        }
        if (trail.length < 2) continue;
        const trailMean = trail.reduce((a, b) => a + b, 0) / trail.length;
        const era = eraOf(cur.season);
        if (era === "other") continue;
        obs.push({ era, player: pid, grp, residual: cur.yards - trailMean });
      }
    }
    return obs;
  }

  function analyze(obs, era) {
    const list = obs.filter((o) => o.era === era);
    const wind = list.filter((o) => o.grp === "wind");
    const indoor = list.filter((o) => o.grp === "indoor");
    if (wind.length === 0 || indoor.length === 0) {
      return { theta: NaN, ci: [NaN, NaN], mde: NaN, nWind: wind.length, nIndoor: indoor.length };
    }
    const crW = clusterRobustMean(wind.map((o) => o.residual), wind.map((o) => o.player));
    const crI = clusterRobustMean(indoor.map((o) => o.residual), indoor.map((o) => o.player));
    const theta = crW.theta - crI.theta;
    const se = Math.sqrt(crW.se ** 2 + crI.se ** 2);
    return {
      theta,
      windMean: crW.theta,
      indoorMean: crI.theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      nWind: wind.length,
      nIndoor: indoor.length,
    };
  }

  const recObs = collect("REC", "receiving_yards");
  const qbObs = collect("QB", "passing_yards");
  const recValidate = analyze(recObs, "validate");
  const recDiscover = analyze(recObs, "discover");
  const qbValidate = analyze(qbObs, "validate");

  console.log(
    `[${TAG}] REC validate Δ=${round(recValidate.theta, 4)} CI[${round(recValidate.ci[0], 4)},${round(recValidate.ci[1], 4)}] nWind=${recValidate.nWind} nIndoor=${recValidate.nIndoor}`,
  );
  console.log(`[${TAG}] QB validate Δ=${round(qbValidate.theta, 4)} nWind=${qbValidate.nWind} nIndoor=${qbValidate.nIndoor}`);

  const n = recValidate.nWind + recValidate.nIndoor;
  if (!Number.isFinite(recValidate.theta) || n === 0) {
    writeYamlBlocked(YAML, "zero receiving-yards wind/indoor observations in validate era", runSha, runAt);
    return 2;
  }

  // kill_line: difference >= 0 (no suppression) or CI includes 0 with n>=200 -> DEAD
  let status;
  const ciIncludesZero = recValidate.ci[0] <= 0 && recValidate.ci[1] >= 0;
  if (recValidate.theta >= 0) status = "DEAD";
  else if (ciIncludesZero && n >= 200) status = "DEAD";
  else status = "CANDIDATE";

  const notes = [
    "C-406. Primary: receiving yards (WR/TE/RB) residual vs trailing 3-game mean, wind>=15mph+open/outdoors vs dome/closed.",
    `Validate REC nWind=${recValidate.nWind} nIndoor=${recValidate.nIndoor} Δ=${round(recValidate.theta, 4)} ` +
      `CI[${round(recValidate.ci[0], 4)},${round(recValidate.ci[1], 4)}] MDE80=${round(recValidate.mde, 4)}; ` +
      `windMean=${round(recValidate.windMean, 4)} indoorMean=${round(recValidate.indoorMean, 4)}.`,
    `Discover REC nWind=${recDiscover.nWind} nIndoor=${recDiscover.nIndoor} Δ=${round(recDiscover.theta, 4)}.`,
    `Secondary QB passing_yards: validate nWind=${qbValidate.nWind} nIndoor=${qbValidate.nIndoor} Δ=${round(qbValidate.theta, 4)} ` +
      `CI[${round(qbValidate.ci[0], 4)},${round(qbValidate.ci[1], 4)}].`,
    "No posted player prop line exists in the free spine for any historical season; this is a trailing-baseline residual, not a book-line comparison.",
    "YAML lists 1999-2019/2020-2024 (A5's convention); this run uses 2017-2024 (discover 2017-2019) since player_stats/games.csv rest fields are only reliable from 2017 in _lib.mjs's eraOf().",
    "Data: nfldata games.csv + nflverse player_stats (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: recValidate.theta,
    ci: recValidate.ci,
    n,
    mde: recValidate.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(recValidate.theta, 4)} n=${n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
