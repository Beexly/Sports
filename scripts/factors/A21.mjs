#!/usr/bin/env node
/**
 * scripts/factors/A21.mjs — C-402 offensive-line continuity.
 *
 * Estimand: team-game rush ypc residual when the five OL snap leaders differ
 * from the prior REG week. Secondary: sack rate. kill_line in A21.yaml.
 */

import path from "node:path";
import {
  REPO_ROOT,
  SEASONS,
  SNAP_COUNTS_URL,
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

const TAG = "A21";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A21.yaml");
const noCache = process.argv.includes("--no-cache");

const OL_POS = new Set(["T", "G", "C", "OT", "OG", "OL", "T/G", "G/T", "C/G", "G/C", "OT/OG"]);

const SNAP_COLS = [
  "season",
  "week",
  "game_type",
  "team",
  "opponent",
  "player",
  "pfr_player_id",
  "position",
  "offense_snaps",
  "offense_pct",
];

const STATS_COLS = [
  "player_id",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "carries",
  "rushing_yards",
  "attempts",
  "sacks",
];

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

  /** team-game OL starters: top-5 offense snaps among OL */
  const olStarters = new Map();
  /** `${season}|${week}|${team}` → Map pfrId → snaps */
  const olPool = new Map();
  for (const r of snaps) {
    if ((r.game_type ?? "").toUpperCase().startsWith("POST")) continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const team = r.team;
    const pid = r.pfr_player_id;
    const pos = (r.position ?? "").toUpperCase();
    const off = Number(r.offense_snaps);
    if (!Number.isFinite(season) || !Number.isFinite(week) || !team || !pid) continue;
    if (!OL_POS.has(pos)) continue;
    if (!Number.isFinite(off)) continue;
    const key = `${season}|${week}|${team}`;
    const m = olPool.get(key) ?? new Map();
    m.set(pid, (m.get(pid) ?? 0) + off);
    olPool.set(key, m);
  }
  for (const [key, m] of olPool) {
    const ranked = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (ranked.length < 5) continue;
    olStarters.set(key, ranked.map(([id]) => id).sort());
  }
  console.log(`[${TAG}] team-games with 5 OL starters: ${olStarters.size}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  /** `${season}|${week}|${team}` → {carries, rushYds, att, sacks} */
  const teamGame = new Map();
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const team = r.recent_team || "";
    if (!Number.isFinite(season) || !Number.isFinite(week) || !team) continue;
    const key = `${season}|${week}|${team}`;
    const cur = teamGame.get(key) ?? { carries: 0, rushYds: 0, att: 0, sacks: 0 };
    cur.carries += Number(r.carries) || 0;
    cur.rushYds += Number(r.rushing_yards) || 0;
    cur.att += Number(r.attempts) || 0;
    cur.sacks += Number(r.sacks) || 0;
    teamGame.set(key, cur);
  }

  const obs = [];
  /** team → sorted team-game keys by season/week */
  const byTeam = new Map();
  for (const [key, starters] of olStarters) {
    const [seasonS, weekS, team] = key.split("|");
    const season = Number(seasonS);
    const week = Number(weekS);
    const tg = teamGame.get(key);
    if (!tg) continue;
    if (tg.carries < 10) continue;
    const ypc = tg.rushYds / tg.carries;
    const dropbacks = tg.att + tg.sacks;
    const sackRate = dropbacks > 0 ? tg.sacks / dropbacks : null;
    const list = byTeam.get(team) ?? [];
    list.push({ season, week, key, starters, ypc, sackRate });
    byTeam.set(team, list);
  }
  for (const list of byTeam.values()) {
    list.sort((a, b) => a.season - b.season || a.week - b.week);
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1];
      const cur = list[i];
      // prior week must be adjacent REG week (allow bye: same season, week = prev.week+1 or +2)
      const sameSeason = prev.season === cur.season;
      const weekGap = cur.week - prev.week;
      if (!sameSeason || weekGap < 1 || weekGap > 2) continue;
      const changed = prev.starters.join(",") !== cur.starters.join(",");
      const era = eraOf(cur.season);
      if (era === "other") continue;
      obs.push({ team: cur.team ?? cur.key.split("|")[2], season: cur.season, week: cur.week, era, changed, ypc: cur.ypc, sackRate: cur.sackRate });
    }
  }

  function analyze(era, key) {
    const list = obs.filter((o) => o.era === era && Number.isFinite(o[key]));
    const changed = list.filter((o) => o.changed);
    const same = list.filter((o) => !o.changed);
    if (changed.length === 0 || same.length === 0) {
      return { theta: NaN, ci: [NaN, NaN], mde: NaN, n: changed.length, n0: same.length };
    }
    const crC = clusterRobustMean(changed.map((o) => o[key]), changed.map((o) => o.team));
    const crS = clusterRobustMean(same.map((o) => o[key]), same.map((o) => o.team));
    const theta = crC.theta - crS.theta;
    const se = Math.sqrt(crC.se ** 2 + crS.se ** 2);
    return {
      theta,
      changedMean: crC.theta,
      sameMean: crS.theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      n: changed.length,
      n0: same.length,
    };
  }

  const dYpc = analyze("discover", "ypc");
  const vYpc = analyze("validate", "ypc");
  const vSack = analyze("validate", "sackRate");

  console.log(
    `[${TAG}] validate Δypc changed−same=${round(vYpc.theta, 4)} CI[${round(vYpc.ci[0], 4)},${round(vYpc.ci[1], 4)}] nChg=${vYpc.n} nSame=${vYpc.n0}`,
  );
  console.log(
    `[${TAG}] validate ΔsackRate=${round(vSack.theta, 4)} CI[${round(vSack.ci[0], 4)},${round(vSack.ci[1], 4)}]`,
  );
  console.log(`[${TAG}] discover Δypc=${round(dYpc.theta, 4)} CI[${round(dYpc.ci[0], 4)},${round(dYpc.ci[1], 4)}]`);

  if (!Number.isFinite(vYpc.theta) || vYpc.n === 0) {
    writeYamlBlocked(YAML, "zero OL-change team-games with ypc in validate era", runSha, runAt);
    return 2;
  }

  // Hypothesis: ypc worsens (negative) when OL changes.
  // kill_line: ypc residual when change is >= 0 (no harm) or CI includes 0 with n>=200
  let status;
  if (vYpc.theta >= 0) status = "DEAD";
  else if (vYpc.ci[0] <= 0 && vYpc.ci[1] >= 0 && vYpc.n >= 200) status = "DEAD";
  else if (vYpc.theta < 0 && !(vYpc.ci[0] <= 0 && vYpc.ci[1] >= 0)) status = "CANDIDATE";
  else if (vYpc.theta < 0 && vYpc.n < 200) status = "CANDIDATE";
  else status = "DEAD";

  const notes = [
    "C-402. Five OL starters = top-5 offense snaps among OL positions that team-week (snap_counts).",
    "Continuity break = starter id set differs from prior REG week (bye gap allowed).",
    "Primary: team-game ypc (rushing_yards/carries) mean(changed)-mean(same), CR1 by team.",
    `Validate nChg=${vYpc.n} nSame=${vYpc.n0} Δypc=${round(vYpc.theta, 4)} ` +
      `CI[${round(vYpc.ci[0], 4)},${round(vYpc.ci[1], 4)}] MDE80=${round(vYpc.mde, 4)}; ` +
      `changed μ=${round(vYpc.changedMean, 4)} same μ=${round(vYpc.sameMean, 4)}.`,
    `Secondary ΔsackRate=${round(vSack.theta, 4)} CI[${round(vSack.ci[0], 4)},${round(vSack.ci[1], 4)}].`,
    `Discover nChg=${dYpc.n} Δypc=${round(dYpc.theta, 4)} CI[${round(dYpc.ci[0], 4)},${round(dYpc.ci[1], 4)}].`,
    "YAML lists 1999-2019/2020-2024; this run uses 2017-2024 (discover 2017-2019).",
    "Data: nflverse snap_counts + player_stats (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: vYpc.theta,
    ci: vYpc.ci,
    n: vYpc.n,
    mde: vYpc.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(vYpc.theta, 4)} n=${vYpc.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
