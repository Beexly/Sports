#!/usr/bin/env node
/**
 * scripts/factors/A12.mjs — C-376 numerical runner for docs/factors/A12.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A12.yaml, IRL coaching estimand):
 *   Residual go-for-it rate vs the EPA-optimal threshold under Prelec
 *   decision weighting, on REG 4th-and-short-to-medium downs.
 *
 *   This is a COACHING estimand, not a pick input. Last in the pbp group.
 *
 *   Per situation cell (yardline bucket × ydstogo bucket), discover era
 *   supplies mean EPA(go), mean EPA(punt), and empirical conversion rate
 *   p. Prelec weight w(p) = exp(−(−ln p)^γ) with γ = 0.65 (published
 *   Prelec α; not fit on this sample). Prelec-weighted go value uses
 *   w on the conversion probability against the punt baseline.
 *
 *   residual_i = 1{coach went} − 1{Prelec-EPA says go}
 *   θ = mean residual (pp), cluster-robust by situation cell.
 *
 *   kill_line: validate-era residual sign flips from discover OR
 *              95% CI includes 0 with n >= 400 → DEAD.
 *
 * Data: nflverse pbp 2017–2024 projected cache. No games join required
 * for the residual itself; n is 4th-down decision rows.
 *
 * Usage:
 *   node scripts/factors/A12.mjs
 *   node scripts/factors/A12.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  clusterRobustMeanCi, eraOf, headSha, loadPbpSeason, mean, round,
  toNumber, writeYamlBlocked, writeYamlResult,
} from "./lib/common.mjs";

const TAG = "A12";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A12.yaml");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
/** Prelec γ (α in Prelec 1998); pre-registered, not estimated here. */
const PRELEC_GAMMA = 0.65;
const MIN_CELL_N = 8;
const noCache = process.argv.includes("--no-cache");

/** Prelec probability weighting w(p) = exp(−(−ln p)^γ), p in (0,1). */
function prelecW(p, gamma = PRELEC_GAMMA) {
  if (!(p > 0) || !(p < 1)) return null;
  return Math.exp(-((-Math.log(p)) ** gamma));
}

function yardBucket(y) {
  if (y == null) return null;
  if (y <= 5) return 1;
  if (y <= 15) return 2;
  if (y <= 30) return 3;
  if (y <= 50) return 4;
  return 5;
}

function togoBucket(t) {
  if (t == null) return null;
  if (t <= 1) return 1;
  if (t <= 2) return 2;
  if (t <= 3) return 3;
  if (t <= 5) return 4;
  return 5;
}

function cellKey(p) {
  const yb = yardBucket(p.yardline_100);
  const tb = togoBucket(p.ydstogo);
  if (yb == null || tb == null) return null;
  return `${yb}_${tb}`;
}

function classifyDecision(p) {
  const pt = (p.play_type ?? "").toLowerCase();
  const isPunt = pt === "punt" || p.punt_attempt === 1;
  const isFg = pt === "field_goal" || p.field_goal_attempt === 1;
  const isGo =
    pt === "pass" || pt === "run" || p.pass_attempt === 1 || p.rush_attempt === 1 ||
    p.qb_dropback === 1;
  if (isGo && !isPunt && !isFg) return "go";
  if (isPunt) return "punt";
  if (isFg) return "fg";
  return null;
}

function buildFourthDowns(allPbp) {
  const rows = [];
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (p.down !== 4) continue;
    if (p.yardline_100 == null || p.ydstogo == null) continue;
    if (p.yardline_100 < 5 || p.yardline_100 > 95) continue;
    if (p.ydstogo < 1 || p.ydstogo > 10) continue;
    const decision = classifyDecision(p);
    if (!decision) continue;
    if (decision === "fg") continue;
    const ck = cellKey(p);
    if (!ck) continue;
    rows.push({
      season: p.season,
      era: eraOf(p.season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX),
      game_id: p.game_id,
      team: p.posteam,
      cell: ck,
      decision, // go | punt
      went: decision === "go" ? 1 : 0,
      converted: p.fourth_down_converted === 1
        ? 1
        : p.fourth_down_failed === 1
          ? 0
          : p.success === 1
            ? 1
            : p.success === 0
              ? 0
              : null,
      epa: p.epa,
    });
  }
  return rows;
}

function fitCellTables(discover) {
  const cells = new Map();
  for (const r of discover) {
    let c = cells.get(r.cell);
    if (!c) {
      c = { n: 0, nGo: 0, nPunt: 0, epaGo: [], epaPunt: [], epaConv: [], epaFail: [], convGo: [] };
      cells.set(r.cell, c);
    }
    c.n += 1;
    if (r.decision === "go") {
      c.nGo += 1;
      if (r.epa != null) c.epaGo.push(r.epa);
      if (r.converted != null) {
        c.convGo.push(r.converted);
        if (r.epa != null) {
          if (r.converted === 1) c.epaConv.push(r.epa);
          else c.epaFail.push(r.epa);
        }
      }
    } else {
      c.nPunt += 1;
      if (r.epa != null) c.epaPunt.push(r.epa);
    }
  }
  const table = new Map();
  for (const [key, c] of cells) {
    if (c.n < MIN_CELL_N) continue;
    if (c.epaGo.length < 3 || c.epaPunt.length < 3) continue;
    const epaGo = mean(c.epaGo);
    const epaPunt = mean(c.epaPunt);
    const pConv = c.convGo.length > 0 ? mean(c.convGo) : null;
    // Linear EPA-optimal: go if mean EPA(go) > mean EPA(punt)
    const epaSaysGo = epaGo > epaPunt ? 1 : 0;
    // Prelec decision weights on the binary go lottery:
    //   V_prelec = w(p)·EPA(go|convert) + w(1−p)·EPA(go|fail)
    // vs EPA(punt). w(p)=exp(−(−ln p)^γ). Falls back to linear when the
    // conversion-split EPA prizes are unavailable (never invent a prize).
    let prelecSaysGo = epaSaysGo;
    let prelecTilt = null;
    let vPrelec = null;
    if (
      pConv != null && c.convGo.length >= 5 &&
      c.epaConv.length >= 2 && c.epaFail.length >= 2
    ) {
      const p = Math.min(0.999, Math.max(0.001, pConv));
      const wp = prelecW(p);
      const wf = prelecW(1 - p);
      if (wp != null && wf != null) {
        const epaConv = mean(c.epaConv);
        const epaFail = mean(c.epaFail);
        vPrelec = wp * epaConv + wf * epaFail;
        prelecTilt = wp;
        prelecSaysGo = vPrelec > epaPunt ? 1 : 0;
      }
    }
    table.set(key, {
      epaGo, epaPunt, pConv, epaSaysGo, prelecSaysGo, prelecTilt, vPrelec,
      n: c.n, nGo: c.nGo,
    });
  }
  return table;
}

function residualFor(rows, table) {
  const out = [];
  for (const r of rows) {
    const t = table.get(r.cell);
    if (!t) continue;
    // residual vs Prelec-EPA threshold (primary), and vs linear EPA (notes)
    const resid = r.went - t.prelecSaysGo;
    const residLinear = r.went - t.epaSaysGo;
    out.push({ ...r, resid, residLinear, prelecTilt: t.prelecTilt, prelecSaysGo: t.prelecSaysGo, epaSaysGo: t.epaSaysGo });
  }
  return out;
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let allPbp = [];
  try {
    for (const season of SEASONS) {
      allPbp = allPbp.concat(await loadPbpSeason(season, { noCache, tag: TAG }));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse pbp unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const fourth = buildFourthDowns(allPbp);
  const discover = fourth.filter((r) => r.era === "discover");
  const validate = fourth.filter((r) => r.era === "validate");
  console.log(`[${TAG}] 4th-down rows: discover=${discover.length} validate=${validate.length}`);
  console.log(`[${TAG}] go rate discover=${round(mean(discover.map((r) => r.went)), 4)} validate=${round(mean(validate.map((r) => r.went)), 4)}`);

  if (discover.length < 100 || validate.length < 100) {
    writeYamlBlocked(
      YAML,
      `insufficient 4th-down rows (discover=${discover.length} validate=${validate.length})`,
      runSha, runAt,
    );
    return 2;
  }

  const table = fitCellTables(discover);
  console.log(`[${TAG}] situation cells with MIN_CELL_N=${MIN_CELL_N}: ${table.size}`);
  if (table.size < 3) {
    writeYamlBlocked(YAML, `too few situation cells (${table.size})`, runSha, runAt);
    return 2;
  }

  const dRows = residualFor(discover, table);
  const vRows = residualFor(validate, table);
  const dStat = clusterRobustMeanCi(dRows.map((r) => r.resid), dRows.map((r) => r.cell));
  const vStat = clusterRobustMeanCi(vRows.map((r) => r.resid), vRows.map((r) => r.cell));
  const dLin = clusterRobustMeanCi(dRows.map((r) => r.residLinear), dRows.map((r) => r.cell));
  const vLin = clusterRobustMeanCi(vRows.map((r) => r.residLinear), vRows.map((r) => r.cell));

  console.log(
    `[${TAG}] Prelec residual discover θ=${round(dStat.theta, 5)} CI[${round(dStat.ci[0], 5)},${round(dStat.ci[1], 5)}] n=${dStat.n}`,
  );
  console.log(
    `[${TAG}] Prelec residual validate θ=${round(vStat.theta, 5)} CI[${round(vStat.ci[0], 5)},${round(vStat.ci[1], 5)}] n=${vStat.n}`,
  );
  let nFlip = 0;
  for (const [, t] of table) if (t.prelecSaysGo !== t.epaSaysGo) nFlip += 1;
  console.log(`[${TAG}] cells where Prelec flips linear EPA: ${nFlip}/${table.size}`);
  console.log(
    `[${TAG}] linear-EPA residual discover θ=${round(dLin.theta, 5)} validate θ=${round(vLin.theta, 5)}`,
  );

  // MDE from validate SE
  const mde = (1.959963984540054 + 0.8416212335729143) * vStat.se;

  // kill_line: sign flip OR CI includes 0 with n >= 400 → DEAD
  // number = validate-era mean residual (pp of go rate)
  const number = vStat.theta;
  const ci = vStat.ci;
  const n = vStat.n;
  const signD = Math.sign(dStat.theta);
  const signV = Math.sign(vStat.theta);
  const signFlips = signD !== 0 && signV !== 0 && signD !== signV;
  const ciIncludes0 = ci[0] <= 0 && ci[1] >= 0;

  let status;
  if (signFlips) status = "DEAD";
  else if (ciIncludes0 && n >= 400) status = "DEAD";
  else if (n < 400) status = "CANDIDATE"; // underpowered; residual recorded, not killed
  else status = "CANDIDATE";
  console.log(`[${TAG}] kill_line check → status=${status} (signFlips=${signFlips} ciIncludes0=${ciIncludes0})`);

  const notes = [
    "IRL coaching estimand, not a pick input; last in the pbp group on purpose.",
    `Prelec γ=${PRELEC_GAMMA} (pre-registered). Cells = yardline×ydstogo buckets on discover.`,
    "Residual = coach go − 1{Prelec-weighted EPA(go|convert/fail) > EPA(punt)}; linear-EPA residual also reported.",
    `Conversion from nflfastR success (fourth_down_* not in the projected cache). Prelec flips linear EPA in ${nFlip}/${table.size} cells — when it does not flip, the Prelec residual is the linear-EPA residual by construction.`,
    "C-376.",
    `C-376 run ${runAt.slice(0, 10)}: REG 4th-down go vs punt 2017–2024.`,
    `Discover n=${dStat.n} θ=${round(dStat.theta, 5)} CI[${round(dStat.ci[0], 5)},${round(dStat.ci[1], 5)}] cells=${dStat.nClusters}.`,
    `Validate n=${vStat.n} θ=${round(vStat.theta, 5)} CI[${round(vStat.ci[0], 5)},${round(vStat.ci[1], 5)}] cells=${vStat.nClusters} MDE80=${round(mde, 5)}.`,
    `Linear-EPA residual discover θ=${round(dLin.theta, 5)} validate θ=${round(vLin.theta, 5)}.`,
    `Go rate discover=${round(mean(discover.map((r) => r.went)), 4)} validate=${round(mean(validate.map((r) => r.went)), 4)}.`,
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Data: nflverse pbp (CC BY 4.0) projected cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number,
    ci,
    n,
    mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] wrote ${YAML}`);
  console.log(
    `[${TAG}] RESULT status=${status} number=${round(number, 5)} ` +
      `ci=[${round(ci[0], 5)}, ${round(ci[1], 5)}] n=${n}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
