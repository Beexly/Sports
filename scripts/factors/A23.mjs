#!/usr/bin/env node
/**
 * scripts/factors/A23.mjs — C-404 numerical runner for docs/factors/A23.yaml.
 *
 * Estimand: does a player's trailing-3-week offense-snap-share SLOPE predict
 * next week's share beyond the trailing mean alone? Outcome = next-week
 * offense_pct minus the trailing-3-week mean (the part the mean can't
 * explain); regressor = OLS slope of offense_pct over those same 3 weeks.
 * Cluster-robust (CR1) by player on the slope coefficient.
 *
 * kill_line: validate-era slope coefficient <= 0 or 95% CI includes 0 with
 * n >= 300 → DEAD.
 *
 * Data: nflverse snap_counts only (CC BY 4.0), local cache under
 * packages/verifier/data/. No credential, no DB.
 *
 * Usage:
 *   node scripts/factors/A23.mjs
 *   node scripts/factors/A23.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  SEASONS,
  SNAP_COUNTS_URL,
  Z_95,
  Z_SUM_80PCT,
  eraOf,
  headSha,
  loadText,
  olsSlope,
  parseCsv,
  round,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A23";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A23.yaml");
const noCache = process.argv.includes("--no-cache");

const SKILL_POS = new Set(["WR", "TE", "RB"]);
const SNAP_COLS = ["season", "week", "game_type", "player", "pfr_player_id", "position", "offense_pct"];

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let snaps = [];
  try {
    for (const season of SEASONS) {
      const name = `snap_counts_${season}.csv`;
      const loaded = await loadText(name, SNAP_COUNTS_URL(season), { noCache, tag: TAG });
      const rows = parseCsv(loaded.text, SNAP_COLS).records;
      snaps = snaps.concat(rows);
      console.log(`[${TAG}] snap_counts ${season}: ${rows.length} ${loaded.cached ? "(cache)" : ""}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse snap_counts unreachable: ${msg}`, runSha, runAt);
    return 2;
  }
  if (snaps.length === 0) {
    writeYamlBlocked(YAML, "zero snap_counts rows after fetch", runSha, runAt);
    return 2;
  }

  /** pid → sorted [{season, week, era, pct}] */
  const byPlayer = new Map();
  for (const r of snaps) {
    if ((r.game_type ?? "").toUpperCase().startsWith("POST")) continue;
    const pos = (r.position ?? "").toUpperCase();
    if (!SKILL_POS.has(pos)) continue;
    const pid = r.pfr_player_id;
    const season = Number(r.season);
    const week = Number(r.week);
    const pct = Number(r.offense_pct);
    if (!pid || !Number.isFinite(season) || !Number.isFinite(week) || !Number.isFinite(pct)) continue;
    const list = byPlayer.get(pid) ?? [];
    list.push({ season, week, pct });
    byPlayer.set(pid, list);
  }

  /** observations: {era, slope, residual, player} */
  const obs = [];
  for (const [pid, listRaw] of byPlayer) {
    const list = listRaw.slice().sort((a, b) => a.season - b.season || a.week - b.week);
    for (let i = 3; i < list.length; i += 1) {
      const w0 = list[i - 3];
      const w1 = list[i - 2];
      const w2 = list[i - 1];
      const cur = list[i];
      const sameSeason = w0.season === w1.season && w1.season === w2.season && w2.season === cur.season;
      if (!sameSeason) continue;
      // require the 3 trailing weeks to be consecutive-ish (allow one bye gap each step)
      if (w1.week - w0.week < 1 || w1.week - w0.week > 2) continue;
      if (w2.week - w1.week < 1 || w2.week - w1.week > 2) continue;
      if (cur.week - w2.week < 1 || cur.week - w2.week > 2) continue;
      const era = eraOf(cur.season);
      if (era === "other") continue;
      const trail = [w0.pct, w1.pct, w2.pct];
      const fit = olsSlope([0, 1, 2], trail, [pid, pid, pid]);
      if (!fit) continue;
      const trailMean = (w0.pct + w1.pct + w2.pct) / 3;
      const residual = cur.pct - trailMean;
      obs.push({ era, player: pid, slope: fit.slope, residual });
    }
  }
  console.log(`[${TAG}] observations: ${obs.length}`);

  function analyze(era) {
    const list = obs.filter((o) => o.era === era);
    if (list.length < 5) return { slope: NaN, ci: [NaN, NaN], mde: NaN, n: list.length };
    const x = list.map((o) => o.slope);
    const y = list.map((o) => o.residual);
    const clusters = list.map((o) => o.player);
    const fit = olsSlope(x, y, clusters);
    if (!fit) return { slope: NaN, ci: [NaN, NaN], mde: NaN, n: list.length };
    return {
      slope: fit.slope,
      ci: [fit.slope - Z_95 * fit.seSlope, fit.slope + Z_95 * fit.seSlope],
      mde: Number.isFinite(fit.seSlope) ? Z_SUM_80PCT * fit.seSlope : NaN,
      n: fit.n,
      G: fit.G,
    };
  }

  const validate = analyze("validate");
  const discover = analyze("discover");
  console.log(
    `[${TAG}] validate slope=${round(validate.slope, 5)} CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] n=${validate.n}`,
  );
  console.log(`[${TAG}] discover slope=${round(discover.slope, 5)} CI[${round(discover.ci[0], 5)},${round(discover.ci[1], 5)}] n=${discover.n}`);

  if (!Number.isFinite(validate.slope) || validate.n === 0) {
    writeYamlBlocked(YAML, "zero validate-era regressable observations", runSha, runAt);
    return 2;
  }

  // kill_line: slope <= 0 or CI includes 0 with n>=300 -> DEAD
  let status;
  const ciIncludesZero = validate.ci[0] <= 0 && validate.ci[1] >= 0;
  if (validate.slope <= 0) status = "DEAD";
  else if (ciIncludesZero && validate.n >= 300) status = "DEAD";
  else status = "CANDIDATE";

  const notes = [
    "C-404. Trailing-3-week offense_pct slope (OLS over indices 0,1,2, weeks consecutive within a 2-week gap for byes).",
    "Outcome: next observed week's offense_pct minus the trailing-3-week mean. WR/TE/RB, snap_counts only.",
    `Validate n=${validate.n} clusters(players)=${validate.G ?? "n/a"} slope=${round(validate.slope, 5)} ` +
      `CI[${round(validate.ci[0], 5)},${round(validate.ci[1], 5)}] MDE80=${round(validate.mde, 5)}.`,
    `Discover n=${discover.n} slope=${round(discover.slope, 5)} CI[${round(discover.ci[0], 5)},${round(discover.ci[1], 5)}].`,
    "Data: nflverse snap_counts (CC BY 4.0), local cache under packages/verifier/data/; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: validate.slope,
    ci: validate.ci,
    n: validate.n,
    mde: validate.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(validate.slope, 5)} n=${validate.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
