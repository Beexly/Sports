#!/usr/bin/env node
/**
 * scripts/factors/A28.mjs — C-409 numerical runner for docs/factors/A28.yaml.
 *
 * Estimand: does in-season target-share growth (early weeks -> late weeks)
 * for Day 1-2 rookie WR/TE (draft round <= 3) exceed the same growth for Day
 * 3 rookies (round >= 4)?
 *
 * Rookie season = player_stats season equals the player's draft_picks
 * season (nflverse draft_picks has no separate entry_year field; season IS
 * the draft year). Early = weeks 1-6, late = weeks 12-17 of that season,
 * each player's own mean target_share in that window (>=2 games each
 * window required).
 *
 * kill_line: validate-era (round<=3 growth) - (round>=4 growth) <= 0 or 95%
 * CI includes 0 with n >= 100 -> DEAD.
 *
 * Data: nflverse draft_picks + player_stats. CC BY 4.0, local cache under
 * packages/verifier/data/. No credential, no DB.
 *
 * Usage:
 *   node scripts/factors/A28.mjs
 *   node scripts/factors/A28.mjs --no-cache
 */

import path from "node:path";
import {
  DRAFT_PICKS_URL,
  REPO_ROOT,
  SEASONS,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  eraOf,
  headSha,
  loadPlayerStats,
  loadText,
  parseCsv,
  round,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A28";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A28.yaml");
const noCache = process.argv.includes("--no-cache");

const WR_TE = new Set(["WR", "TE"]);
const EARLY_WEEKS = new Set([1, 2, 3, 4, 5, 6]);
const LATE_WEEKS = new Set([12, 13, 14, 15, 16, 17]);
const DAY12_MAX_ROUND = 3;

const DRAFT_COLS = ["season", "round", "gsis_id", "position"];
const STATS_COLS = ["player_id", "position", "season", "week", "season_type", "target_share"];

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let draftRows;
  try {
    const loaded = await loadText("draft_picks.csv", DRAFT_PICKS_URL, { noCache, tag: TAG });
    draftRows = parseCsv(loaded.text, DRAFT_COLS).records;
    console.log(`[${TAG}] draft_picks: ${draftRows.length} rows ${loaded.cached ? "(cache)" : ""}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse draft_picks unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** gsis_id -> { round, draftSeason } for WR/TE only */
  const draftInfo = new Map();
  for (const r of draftRows) {
    const pos = (r.position ?? "").toUpperCase();
    if (!WR_TE.has(pos)) continue;
    const gsis = r.gsis_id;
    const round = Number(r.round);
    const season = Number(r.season);
    if (!gsis || !Number.isFinite(round) || !Number.isFinite(season)) continue;
    draftInfo.set(gsis, { round, draftSeason: season });
  }
  console.log(`[${TAG}] WR/TE draft entries with gsis_id: ${draftInfo.size}`);
  if (draftInfo.size === 0) {
    writeYamlBlocked(YAML, "zero WR/TE draft_picks rows with gsis_id after fetch", runSha, runAt);
    return 2;
  }

  let stats;
  try {
    // player_id in player_stats IS the gsis_id for modern seasons (nflverse convention).
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** gsis -> { early: [ts], late: [ts] } restricted to the player's own draft (rookie) season */
  const byPlayer = new Map();
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const pos = (r.position ?? "").toUpperCase();
    if (!WR_TE.has(pos)) continue;
    const gsis = r.player_id;
    const info = draftInfo.get(gsis);
    if (!info) continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const ts = Number(r.target_share);
    if (season !== info.draftSeason || !Number.isFinite(week) || !Number.isFinite(ts)) continue;
    const bucket = byPlayer.get(gsis) ?? { early: [], late: [], round: info.round, season };
    if (EARLY_WEEKS.has(week)) bucket.early.push(ts);
    if (LATE_WEEKS.has(week)) bucket.late.push(ts);
    byPlayer.set(gsis, bucket);
  }

  const obs = [];
  for (const [gsis, b] of byPlayer) {
    if (b.early.length < 2 || b.late.length < 2) continue;
    const earlyMean = b.early.reduce((a, x) => a + x, 0) / b.early.length;
    const lateMean = b.late.reduce((a, x) => a + x, 0) / b.late.length;
    const era = eraOf(b.season);
    if (era === "other") continue;
    obs.push({ era, player: gsis, round: b.round, growth: lateMean - earlyMean });
  }
  console.log(`[${TAG}] rookie-seasons with both windows: ${obs.length}`);

  function analyze(era) {
    const list = obs.filter((o) => o.era === era);
    const day12 = list.filter((o) => o.round <= DAY12_MAX_ROUND);
    const day3 = list.filter((o) => o.round > DAY12_MAX_ROUND);
    if (day12.length === 0 || day3.length === 0) {
      return { theta: NaN, ci: [NaN, NaN], mde: NaN, nDay12: day12.length, nDay3: day3.length };
    }
    const crA = clusterRobustMean(day12.map((o) => o.growth), day12.map((o) => o.player));
    const crB = clusterRobustMean(day3.map((o) => o.growth), day3.map((o) => o.player));
    const theta = crA.theta - crB.theta;
    const se = Math.sqrt(crA.se ** 2 + crB.se ** 2);
    return {
      theta,
      day12Mean: crA.theta,
      day3Mean: crB.theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      nDay12: day12.length,
      nDay3: day3.length,
    };
  }

  const validate = analyze("validate");
  const discover = analyze("discover");
  console.log(
    `[${TAG}] validate Δ=${round(validate.theta, 5)} CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] nDay12=${validate.nDay12} nDay3=${validate.nDay3}`,
  );
  console.log(`[${TAG}] discover Δ=${round(discover.theta, 5)} nDay12=${discover.nDay12} nDay3=${discover.nDay3}`);

  const n = validate.nDay12 + validate.nDay3;
  if (!Number.isFinite(validate.theta) || n === 0) {
    writeYamlBlocked(YAML, "zero validate-era rookie-seasons splittable by draft day", runSha, runAt);
    return 2;
  }

  let status;
  const ciIncludesZero = validate.ci[0] <= 0 && validate.ci[1] >= 0;
  if (validate.theta <= 0) status = "DEAD";
  else if (ciIncludesZero && n >= 100) status = "DEAD";
  else status = "CANDIDATE";

  const notes = [
    "C-409. Rookie season = player_stats season equals the player's draft_picks season (draft_picks has no entry_year field).",
    "Early = weeks 1-6, late = weeks 12-17, player's own mean target_share each window (>=2 games each).",
    `Validate nDay12(round<=3)=${validate.nDay12} nDay3(round>=4)=${validate.nDay3} Δ=${round(validate.theta, 5)} ` +
      `CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] MDE80=${round(validate.mde, 5)}; ` +
      `day12Mean=${round(validate.day12Mean, 5)} day3Mean=${round(validate.day3Mean, 5)}.`,
    `Discover nDay12=${discover.nDay12} nDay3=${discover.nDay3} Δ=${round(discover.theta, 5)}.`,
    "WR/TE only (draft_picks position field); RB/QB rookies not included in this spec.",
    "Data: nflverse draft_picks + player_stats (CC BY 4.0), local cache; no DB.",
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
