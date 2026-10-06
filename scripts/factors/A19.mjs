#!/usr/bin/env node
/**
 * scripts/factors/A19.mjs — C-400 WR1-out target redistribution.
 *
 * Estimand: WR2 (primary) and TE1 target-share (pp) delta when the team WR1
 * is OUT per nflverse injuries. Depth slots pre-registered from season-to-date
 * targets. kill_line in docs/factors/A19.yaml.
 */

import path from "node:path";
import {
  INJURIES_URL,
  REPO_ROOT,
  SEASONS,
  Z_95,
  Z_SUM_80PCT,
  clusterRobustMean,
  decidePositiveEffect,
  eraOf,
  headSha,
  loadPlayerStats,
  loadText,
  parseCsv,
  round,
  shareScale,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A19";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A19.yaml");
const noCache = process.argv.includes("--no-cache");

const OUT_STATUSES = new Set(["out", "doubtful", "ir", "out for season", "injured reserve"]);

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

const INJ_COLS = ["season", "week", "team", "gsis_id", "full_name", "position", "report_status"];

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let stats;
  try {
    stats = await loadPlayerStats({ noCache, tag: TAG, cols: STATS_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  let injRows = [];
  try {
    for (const season of SEASONS) {
      const name = `injuries_${season}.csv`;
      const loaded = await loadText(name, INJURIES_URL(season), { noCache, tag: TAG });
      const rows = parseCsv(loaded.text, INJ_COLS).records;
      injRows = injRows.concat(rows);
      console.log(`[${TAG}] injuries ${season}: ${rows.length} ${loaded.cached ? "(cache)" : ""}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse injuries unreachable: ${msg}`, runSha, runAt);
    return 2;
  }
  if (injRows.length === 0) {
    writeYamlBlocked(YAML, "zero injury report rows after fetch", runSha, runAt);
    return 2;
  }

  /** `${season}|${week}|${team}|${gsis}` → true when OUT/Doubtful/IR */
  const outFlag = new Map();
  for (const r of injRows) {
    const status = (r.report_status ?? "").trim().toLowerCase();
    if (!OUT_STATUSES.has(status)) continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const team = r.team;
    const id = r.gsis_id;
    if (!Number.isFinite(season) || !Number.isFinite(week) || !team || !id) continue;
    outFlag.set(`${season}|${week}|${team}|${id}`, true);
  }
  console.log(`[${TAG}] OUT/Doubtful/IR flags=${outFlag.size}`);

  // Skill rows WR/TE REG
  const skill = [];
  for (const r of stats.records) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const pos = (r.position ?? "").toUpperCase();
    if (pos !== "WR" && pos !== "TE") continue;
    const season = Number(r.season);
    const week = Number(r.week);
    const playerId = r.player_id;
    const ts = Number(r.target_share);
    if (!Number.isFinite(season) || !Number.isFinite(week) || !playerId || !Number.isFinite(ts)) continue;
    skill.push({
      playerId,
      playerName: r.player_display_name || playerId,
      pos,
      season,
      week,
      team: r.recent_team || "",
      targets: Number(r.targets) || 0,
      tsRaw: ts,
    });
  }
  const tsScale = shareScale(skill.map((r) => r.tsRaw));

  // Sort by season/week for season-to-date depth assignment
  skill.sort((a, b) => a.season - b.season || a.week - b.week || a.playerId.localeCompare(b.playerId));

  /** Build per team-season running target totals (prior weeks only) at each week. */
  const observations = [];
  /** team-season → Map playerId → {pos, targetsToDate} */
  const running = new Map();

  // Group by team-season-week
  const byWeek = new Map();
  for (const row of skill) {
    const key = `${row.season}|${row.team}|${row.week}`;
    const list = byWeek.get(key) ?? [];
    list.push(row);
    byWeek.set(key, list);
  }
  const weekKeys = [...byWeek.keys()].sort((a, b) => {
    const [as, aw] = a.split("|").map(Number);
    const [bs, bw] = b.split("|").map(Number);
    return as - bs || aw - bw;
  });

  for (const key of weekKeys) {
    const [seasonS, team, weekS] = key.split("|");
    const season = Number(seasonS);
    const week = Number(weekS);
    const sk = `${season}|${team}`;
    const run = running.get(sk) ?? new Map();
    // Depth from PRIOR weeks only
    let wr1 = null;
    let wr2 = null;
    let te1 = null;
    let wr1T = -1;
    let wr2T = -1;
    let te1T = -1;
    for (const [pid, info] of run) {
      if (info.pos === "WR") {
        if (info.targets > wr1T) {
          wr2 = wr1;
          wr2T = wr1T;
          wr1 = pid;
          wr1T = info.targets;
        } else if (info.targets > wr2T) {
          wr2 = pid;
          wr2T = info.targets;
        }
      } else if (info.pos === "TE" && info.targets > te1T) {
        te1 = pid;
        te1T = info.targets;
      }
    }
    if (!wr1 || !wr2) {
      // still fold this week's targets into running totals
      for (const row of byWeek.get(key)) {
        const cur = run.get(row.playerId) ?? { pos: row.pos, targets: 0 };
        cur.targets += row.targets;
        run.set(row.playerId, cur);
      }
      running.set(sk, run);
      continue;
    }
    const wr1Out = outFlag.has(`${season}|${week}|${team}|${wr1}`);
    // WR1 must have a player_stats row (active) when not OUT — if WR1 has no row and is OUT, still treat as OUT
    const era = eraOf(season);
    if (era !== "other") {
      for (const row of byWeek.get(key)) {
        if (row.playerId === wr1) continue;
        const slot = row.playerId === wr2 ? "WR2" : row.playerId === te1 ? "TE1" : null;
        if (!slot) continue;
        observations.push({
          playerId: row.playerId,
          team,
          season,
          week,
          era,
          slot,
          wr1Out,
          ts: row.tsRaw * tsScale,
        });
      }
    }
    for (const row of byWeek.get(key)) {
      const cur = run.get(row.playerId) ?? { pos: row.pos, targets: 0 };
      cur.targets += row.targets;
      run.set(row.playerId, cur);
    }
    running.set(sk, run);
  }

  function analyze(era, slot) {
    const list = observations.filter((o) => o.era === era && o.slot === slot && Number.isFinite(o.ts));
    const treated = list.filter((o) => o.wr1Out);
    const control = list.filter((o) => !o.wr1Out);
    // Difference of means with CR1 on treated residuals vs control mean — use pooled CR1 on (treated indicator centered) via cluster on player
    // Simpler: cluster-robust mean of treated values, and report control mean; the estimand is treated - control.
    // For CI on the difference, use CR1 on treated residuals from control mean plus control CR1 — conservative: treat each obs as value, cluster player, for treated group; separately compute control mean.
    // Pre-registered estimand is the delta. Use cluster-robust two-sample: values = ts for all, x = treated indicator, CR1 slope of ts on treated (equals delta).
    const usable = list;
    const x = usable.map((o) => (o.wr1Out ? 1 : 0));
    const y = usable.map((o) => o.ts);
    const clusters = usable.map((o) => o.playerId);
    // Manual CR1 for dummy regression = two-sample difference
    let n1 = 0;
    let n0 = 0;
    let s1 = 0;
    let s0 = 0;
    for (let i = 0; i < y.length; i += 1) {
      if (x[i] === 1) {
        n1 += 1;
        s1 += y[i];
      } else {
        n0 += 1;
        s0 += y[i];
      }
    }
    if (n1 === 0 || n0 === 0) return { theta: NaN, ci: [NaN, NaN], mde: NaN, n: n1, G: 0, n0, meanOut: NaN, meanIn: NaN };
    const m1 = s1 / n1;
    const m0 = s0 / n0;
    const theta = m1 - m0;
    // CR1 on residualized values for the treated indicator
    const resid = y.map((v, i) => v - (x[i] === 1 ? m1 : m0));
    // score for delta uses treated residuals / n1 - control residuals / n0; cluster sums
    const cs = new Map();
    for (let i = 0; i < y.length; i += 1) {
      const c = clusters[i];
      const contrib = x[i] === 1 ? resid[i] / n1 : -resid[i] / n0;
      cs.set(c, (cs.get(c) ?? 0) + contrib);
    }
    const G = cs.size;
    let meat = 0;
    for (const v of cs.values()) meat += v * v;
    const finite = G > 1 ? G / (G - 1) : 1;
    const se = Math.sqrt(finite * meat);
    return {
      theta,
      ci: [theta - Z_95 * se, theta + Z_95 * se],
      mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN,
      n: n1,
      n0,
      G,
      meanOut: m1,
      meanIn: m0,
      se,
    };
  }

  const dWr2 = analyze("discover", "WR2");
  const vWr2 = analyze("validate", "WR2");
  const vTe1 = analyze("validate", "TE1");
  const vWr3 = analyze("validate", "WR3");

  console.log(
    `[${TAG}] validate WR2 OUT-Δ=${round(vWr2.theta, 4)} CI[${round(vWr2.ci[0], 4)},${round(vWr2.ci[1], 4)}] nOut=${vWr2.n} nIn=${vWr2.n0}`,
  );
  console.log(
    `[${TAG}] validate TE1 OUT-Δ=${round(vTe1.theta, 4)} CI[${round(vTe1.ci[0], 4)},${round(vTe1.ci[1], 4)}] nOut=${vTe1.n}`,
  );
  console.log(`[${TAG}] discover WR2 OUT-Δ=${round(dWr2.theta, 4)} CI[${round(dWr2.ci[0], 4)},${round(dWr2.ci[1], 4)}]`);

  if (!Number.isFinite(vWr2.theta) || vWr2.n === 0) {
    writeYamlBlocked(YAML, "zero WR2 observations with WR1 OUT in validate era", runSha, runAt);
    return 2;
  }

  const status = decidePositiveEffect({ theta: vWr2.theta, ci: vWr2.ci, n: vWr2.n, minN: 200 });

  const notes = [
    "C-400. Depth slots from season-to-date targets (prior weeks only). WR1 OUT = injuries report_status Out/Doubtful/IR.",
    "Primary: WR2 target-share (pp) mean(OUT)-mean(active), CR1 by player. TE1 secondary.",
    `Validate WR2 nOut=${vWr2.n} nIn=${vWr2.n0} Δ=${round(vWr2.theta, 4)} CI[${round(vWr2.ci[0], 4)},${round(vWr2.ci[1], 4)}] MDE80=${round(vWr2.mde, 4)}; ` +
      `means OUT=${round(vWr2.meanOut, 4)} IN=${round(vWr2.meanIn, 4)}.`,
    `Validate TE1 nOut=${vTe1.n} Δ=${round(vTe1.theta, 4)} CI[${round(vTe1.ci[0], 4)},${round(vTe1.ci[1], 4)}].`,
    `Discover WR2 nOut=${dWr2.n} Δ=${round(dWr2.theta, 4)} CI[${round(dWr2.ci[0], 4)},${round(dWr2.ci[1], 4)}].`,
    "Honest limit: nflverse injuries are lagged weekly reports, not live inactives.",
    "YAML lists 1999-2019/2020-2024; this run uses 2017-2024 (discover 2017-2019).",
    "Data: nflverse injuries + player_stats (CC BY 4.0), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: vWr2.theta,
    ci: vWr2.ci,
    n: vWr2.n,
    mde: vWr2.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(vWr2.theta, 4)} n=${vWr2.n}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
