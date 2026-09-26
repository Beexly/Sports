#!/usr/bin/env node
/**
 * scripts/factors/A17.mjs — C-398 QB-receiver games-together chemistry.
 *
 * Estimand: residual target_share (pp vs trailing-5) regressed on cumulative
 * games the (QB, receiver) pair has co-appeared, CR1 by pair. Secondary:
 * residual receiving_epa slope. kill_line in docs/factors/A17.yaml.
 */

import path from "node:path";
import {
  REPO_ROOT,
  VALIDATE_MAX,
  Z_95,
  Z_SUM_80PCT,
  decidePositiveEffect,
  eraOf,
  headSha,
  loadGames,
  loadPlayerStats,
  mean,
  olsSlope,
  round,
  shareScale,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A17";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A17.yaml");
const TRAILING = 5;
const noCache = process.argv.includes("--no-cache");

const STATS_COLS = [
  "player_id",
  "player_display_name",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "opponent_team",
  "targets",
  "target_share",
  "receiving_epa",
];

const GAMES_COLS = ["season", "week", "game_type", "home_team", "away_team", "home_qb_id", "away_qb_id"];

function analyze(list, useEpa) {
  const usable = list.filter((r) => (useEpa ? Number.isFinite(r.residualEpa) : Number.isFinite(r.residualTs)));
  const x = usable.map((r) => r.gamesTogether / 10);
  const y = usable.map((r) => (useEpa ? r.residualEpa : r.residualTs));
  const clusters = usable.map((r) => r.pairKey);
  const fit = olsSlope(x, y, clusters);
  if (!fit) return { slope: NaN, ci: [NaN, NaN], mde: NaN, n: 0, G: 0 };
  const ci = [fit.slope - Z_95 * fit.seSlope, fit.slope + Z_95 * fit.seSlope];
  const mde = Number.isFinite(fit.seSlope) ? Z_SUM_80PCT * fit.seSlope : NaN;
  return { slope: fit.slope, ci, mde, n: fit.n, G: fit.G };
}

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let gamesRec;
  try {
    gamesRec = await loadGames({ noCache, tag: TAG, cols: GAMES_COLS });
    console.log(`[${TAG}] games: ${gamesRec.records.length} rows ${gamesRec.cached ? "(cache)" : ""}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    console.error(`[${TAG}] BLOCKED — games: ${msg}`);
    return 2;
  }

  const qbByTeamGame = new Map();
  for (const g of gamesRec.records) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const week = Number(g.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    if (g.home_team && g.home_qb_id) qbByTeamGame.set(`${season}|${week}|${g.home_team}`, g.home_qb_id);
    if (g.away_team && g.away_qb_id) qbByTeamGame.set(`${season}|${week}|${g.away_team}`, g.away_qb_id);
  }
  console.log(`[${TAG}] team-game QB index: ${qbByTeamGame.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
    console.log(`[${TAG}] player_stats window rows=${stats.records.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    console.error(`[${TAG}] BLOCKED — player_stats: ${msg}`);
    return 2;
  }

  const skill = new Set(["WR", "TE"]);
  const timelines = new Map();
  let raw = 0;
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!skill.has((r.position ?? "").toUpperCase())) continue;
    const playerId = r.player_id;
    if (!playerId) continue;
    const ts = Number(r.target_share);
    if (!Number.isFinite(ts)) continue;
    const season = Number(r.season);
    const week = Number(r.week);
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    raw += 1;
    const team = r.recent_team || "";
    const list = timelines.get(playerId) ?? [];
    list.push({
      playerId,
      season,
      week,
      team,
      qbId: qbByTeamGame.get(`${season}|${week}|${team}`) ?? null,
      targetShareRaw: ts,
      epa: Number(r.receiving_epa),
      targets: Number(r.targets) || 0,
    });
    timelines.set(playerId, list);
  }

  const tsScale = shareScale([...timelines.values()].flat().map((g) => g.targetShareRaw));
  console.log(`[${TAG}] skill REG rows=${raw} players=${timelines.size} tsScale=×${tsScale}`);

  const pairGames = new Map();
  const rows = [];

  for (const games of timelines.values()) {
    games.sort((a, b) => a.season - b.season || a.week - b.week);
    for (let idx = 0; idx < games.length; idx += 1) {
      const g = games[idx];
      if (!g.qbId) continue;
      if (g.targets <= 0 && g.targetShareRaw <= 0) continue;
      const prior = games.slice(Math.max(0, idx - TRAILING), idx);
      if (prior.length < TRAILING) continue;
      const pairKey = `${g.qbId}|${g.playerId}`;
      const gamesTogether = pairGames.get(pairKey) ?? 0;
      const trailingTs = mean(prior.map((p) => p.targetShareRaw * tsScale));
      const trailingEpaList = prior.map((p) => p.epa).filter((v) => Number.isFinite(v));
      const trailingEpa = trailingEpaList.length === TRAILING ? mean(trailingEpaList) : null;
      const residualTs = g.targetShareRaw * tsScale - trailingTs;
      const residualEpa =
        Number.isFinite(g.epa) && trailingEpa !== null ? g.epa - trailingEpa : null;
      const era = eraOf(g.season);
      if (era === "other") {
        pairGames.set(pairKey, gamesTogether + 1);
        continue;
      }
      rows.push({ pairKey, season: g.season, week: g.week, era, gamesTogether, residualTs, residualEpa });
      pairGames.set(pairKey, gamesTogether + 1);
    }
  }

  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(`[${TAG}] observations discover=${discover.length} validate=${validate.length}`);

  if (validate.length < 30) {
    writeYamlBlocked(
      YAML,
      `insufficient pair-games (discover=${discover.length} validate=${validate.length})`,
      runSha,
      runAt,
    );
    console.error(`[${TAG}] BLOCKED — insufficient observations`);
    return 2;
  }

  const dTs = analyze(discover, false);
  const vTs = analyze(validate, false);
  const vEpa = analyze(validate, true);

  console.log(
    `[${TAG}] validate TS slope/10gt=${round(vTs.slope, 4)} CI[${round(vTs.ci[0], 4)},${round(vTs.ci[1], 4)}] n=${vTs.n} pairs=${vTs.G}`,
  );
  console.log(
    `[${TAG}] validate EPA slope/10gt=${round(vEpa.slope, 4)} CI[${round(vEpa.ci[0], 4)},${round(vEpa.ci[1], 4)}] n=${vEpa.n}`,
  );
  console.log(
    `[${TAG}] discover TS slope/10gt=${round(dTs.slope, 4)} CI[${round(dTs.ci[0], 4)},${round(dTs.ci[1], 4)}]`,
  );

  if (!Number.isFinite(vTs.slope)) {
    writeYamlBlocked(YAML, "validate-era chemistry slope not finite", runSha, runAt);
    return 2;
  }

  const status = decidePositiveEffect({ theta: vTs.slope, ci: vTs.ci, n: vTs.n, minN: 300 });

  const notes = [
    "C-398. Pair = team QB (games.csv) + WR/TE with a target_share row on the same REG team-game.",
    "gamesTogether counts prior pair co-appearances. Residuals vs trailing-5 player baseline.",
    "Primary: CR1-by-pair OLS slope of residual target_share (pp) per 10 games together.",
    `Validate n=${vTs.n} pairs=${vTs.G} slope=${round(vTs.slope, 4)} ` +
      `CI[${round(vTs.ci[0], 4)},${round(vTs.ci[1], 4)}] MDE80=${round(vTs.mde, 4)}.`,
    `Secondary EPA slope=${round(vEpa.slope, 4)} CI[${round(vEpa.ci[0], 4)},${round(vEpa.ci[1], 4)}].`,
    `Discover n=${dTs.n} slope=${round(dTs.slope, 4)} CI[${round(dTs.ci[0], 4)},${round(dTs.ci[1], 4)}].`,
    "YAML lists 1999-2019/2020-2024; this run uses the fetched 2017-2024 window (discover 2017-2019).",
    "Data: nflverse player_stats + nfldata games.csv (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: vTs.slope,
    ci: vTs.ci,
    n: vTs.n,
    mde: vTs.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(vTs.slope, 4)} n=${vTs.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
