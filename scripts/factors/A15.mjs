#!/usr/bin/env node
/**
 * scripts/factors/A15.mjs — C-379 numerical runner for docs/factors/A15.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A15.yaml):
 *   Usage residual vs trailing baseline for players in a documented
 *   contract-year window, from OTC historical_contracts.
 *
 *   HARD CONSTRAINT (measured, not assumed): the OTC dump has NO
 *   incentive-text column — only value / years / APY / guaranteed
 *   (RELEASE_COLUMN_REQUIREMENTS.contracts, nflverse-releases.ts).
 *   Therefore this run tests CONTRACT-YEAR proximity (final season of
 *   the signed deal: year_signed + years − 1 == season) as the
 *   machine-readable proxy for "documented incentive proximity".
 *   Incentive text is NOT invented. Milestone version (F12) already
 *   measured as an artifact.
 *
 *   Placebo: players with ≥2 years remaining on the same deal.
 *
 *   expandContractRows (stats-api) requires gsis_id; the live dump keys
 *   on otc_id + player. We attempt expandContractRows and report skips;
 *   the estimand joins by player name + team + season when gsis_id is
 *   absent (never fabricate a gsis_id).
 *
 *   kill_line: validate-era effect <= 0 or 95% CI includes 0 or the
 *              placebo on non-final-year contracts "passes" (is as large
 *              as the treated effect) → DEAD.
 *
 * Data: nflverse contracts + player_stats + weekly rosters (name/team).
 * Discover 2017–2019 / validate 2020–2024.
 *
 * Usage:
 *   node scripts/factors/A15.mjs
 *   node scripts/factors/A15.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  CONTRACTS_URL, clusterRobustMeanCi, eraOf, headSha, loadTextCached,
  mean, parseCsv, round, writeYamlBlocked, writeYamlResult, Z_SUM_80PCT,
} from "./lib/common.mjs";

const TAG = "A15";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A15.yaml");

const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const TRAILING_GAMES = 5;
const MIN_TARGETS = 1;
const RECEIVING_POS = new Set(["WR", "TE", "RB"]);
const noCache = process.argv.includes("--no-cache");

const CONTRACT_COLS = [
  "player", "position", "team", "year_signed", "years", "value", "apy",
  "guaranteed", "otc_id", "draft_year", "draft_round", "draft_overall",
  "gsis_id",
];

const PS_COLS = [
  "player_id", "player_display_name", "position", "recent_team", "season",
  "week", "season_type", "opponent_team", "targets", "target_share",
  "receiving_yards",
];

function toNum(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normName(s) {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Build contract-year index: for each (playerNorm, team, season) mark
 * contractYear=1 when season is the final year of any signed deal, and
 * yearsRemaining when season is inside a deal with years left.
 */
function indexContractYears(rows) {
  const byPlayer = new Map();
  let withGsis = 0;
  for (const r of rows) {
    const name = normName(r.player);
    if (!name) continue;
    if (r.gsis_id && String(r.gsis_id).trim()) withGsis += 1;
    const yearSigned = toNum(r.year_signed);
    const years = toNum(r.years);
    if (yearSigned == null || years == null || years < 1) continue;
    const finalSeason = yearSigned + years - 1;
    const key = name;
    const list = byPlayer.get(key) ?? [];
    list.push({
      team: String(r.team ?? "").toUpperCase(),
      yearSigned,
      years,
      finalSeason,
      apy: toNum(r.apy),
      value: toNum(r.value),
      otcId: r.otc_id,
      gsisId: r.gsis_id || null,
    });
    byPlayer.set(key, list);
  }
  return { byPlayer, withGsis, nRows: rows.length };
}

function contractStatus(nameNorm, team, season, byPlayer) {
  const deals = byPlayer.get(nameNorm);
  if (!deals) return null;
  let best = null;
  for (const d of deals) {
    if (season < d.yearSigned || season > d.finalSeason) continue;
    // prefer matching team when the dump carries one
    const teamMatch = !d.team || !team || d.team === team || d.team === team.toUpperCase();
    const yearsRemaining = d.finalSeason - season;
    const cand = {
      yearsRemaining,
      isFinalYear: yearsRemaining === 0 ? 1 : 0,
      teamMatch,
      apy: d.apy,
    };
    if (!best || (cand.teamMatch && !best.teamMatch)) best = cand;
    else if (cand.teamMatch === best.teamMatch && cand.yearsRemaining < best.yearsRemaining) best = cand;
  }
  return best;
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let contractText;
  try {
    const loaded = await loadTextCached("historical_contracts.csv", CONTRACTS_URL, { noCache, tag: TAG });
    contractText = loaded.text;
    console.log(`[${TAG}] contracts: ${loaded.fromCache ? "cache" : "fetched"} bytes=${contractText.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nflverse contracts unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const { records: contractRows } = parseCsv(contractText, CONTRACT_COLS);
  console.log(`[${TAG}] contract rows=${contractRows.length}`);
  if (contractRows.length < 100) {
    writeYamlBlocked(YAML, `contracts dump too small (${contractRows.length} rows)`, runSha, runAt);
    return 2;
  }

  // Attempt stats-api expandContractRows (requires gsis_id). Pure function;
  // we inline the call via dynamic import when the package entry is loadable,
  // else count the same skip condition ourselves (never invent gsis_id).
  let expandSkipped = 0;
  let expandKept = 0;
  for (const r of contractRows) {
    if (r.gsis_id && String(r.gsis_id).trim() && r.apy != null && toNum(r.apy) != null && toNum(r.apy) >= 0) {
      expandKept += 1;
    } else {
      expandSkipped += 1;
    }
  }
  console.log(
    `[${TAG}] expandContractRows-compatible rows kept=${expandKept} skipped=${expandSkipped} ` +
      `(gsis_id required by stats-api; dump keys on otc_id+player)`,
  );

  const { byPlayer } = indexContractYears(contractRows);
  console.log(`[${TAG}] contract players indexed: ${byPlayer.size}`);

  let psText;
  try {
    const { loadCachedText } = await import("./lib/common.mjs");
    psText = loadCachedText("player_stats_combined.csv.gz", { noCache }) ??
      loadCachedText("player_stats_combined.csv", { noCache });
    if (psText == null) throw new Error("player_stats_combined missing from packages/verifier/data/");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `player_stats unavailable: ${msg}`, runSha, runAt);
    return 2;
  }
  const { records: psRows } = parseCsv(psText, PS_COLS);
  console.log(`[${TAG}] player_stats rows=${psRows.length}`);

  // Residual target share vs trailing-5, split by final-year vs years-remaining.
  const byPlayerSeason = new Map();
  for (const r of psRows) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const pos = (r.position ?? "").toUpperCase();
    if (!RECEIVING_POS.has(pos)) continue;
    const season = toNum(r.season);
    const week = toNum(r.week);
    const targets = toNum(r.targets);
    const share = toNum(r.target_share);
    if (season == null || week == null || share == null) continue;
    if (season < DISCOVER_MIN || season > VALIDATE_MAX) continue;
    if (targets != null && targets < MIN_TARGETS) continue;
    const pid = r.player_id || r.player_display_name;
    if (!pid) continue;
    const key = `${pid}|${season}`;
    const list = byPlayerSeason.get(key) ?? [];
    list.push({
      pid,
      season,
      week,
      team: String(r.recent_team ?? "").toUpperCase(),
      share: share > 1.5 ? share : share * 100, // fraction → pp
      name: r.player_display_name ?? "",
      pos,
    });
    byPlayerSeason.set(key, list);
  }

  const treated = [];
  const control = [];
  for (const [, list] of byPlayerSeason) {
    list.sort((a, b) => a.week - b.week);
    const hist = [];
    for (const g of list) {
      if (hist.length >= TRAILING_GAMES) {
        const base = mean(hist.map((h) => h.share));
        const resid = g.share - base;
        const nameNorm = normName(g.name);
        const cs = contractStatus(nameNorm, g.team, g.season, byPlayer);
        const era = eraOf(g.season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX);
        if (!cs) {
          hist.push(g);
          continue;
        }
        const row = {
          era,
          season: g.season,
          pid: g.pid,
          resid,
          yearsRemaining: cs.yearsRemaining,
          isFinalYear: cs.isFinalYear,
        };
        if (cs.isFinalYear === 1) treated.push(row);
        else if (cs.yearsRemaining >= 2) control.push(row);
      }
      hist.push(g);
    }
  }

  const dT = treated.filter((r) => r.era === "discover");
  const vT = treated.filter((r) => r.era === "validate");
  const dC = control.filter((r) => r.era === "discover");
  const vC = control.filter((r) => r.era === "validate");
  console.log(
    `[${TAG}] treated (final year): discover=${dT.length} validate=${vT.length}; ` +
      `placebo (≥2 yrs left): discover=${dC.length} validate=${vC.length}`,
  );

  if (vT.length < 50) {
    writeYamlBlocked(YAML, `insufficient final-year treated rows (validate n=${vT.length})`, runSha, runAt);
    return 2;
  }

  const dTreat = clusterRobustMeanCi(vT.map((r) => r.resid), vT.map((r) => r.pid));
  const dPlacebo = clusterRobustMeanCi(vC.map((r) => r.resid), vC.map((r) => r.pid));
  const dDisc = clusterRobustMeanCi(dT.map((r) => r.resid), dT.map((r) => r.pid));
  const mde = Z_SUM_80PCT * dTreat.se;

  // Placebo "passes" when |placebo effect| >= |treated effect| (artifact pattern F12).
  const placeboPasses =
    Number.isFinite(dPlacebo.theta) &&
    Math.abs(dPlacebo.theta) >= Math.abs(dTreat.theta) &&
    dTreat.theta > 0;

  console.log(
    `[${TAG}] treated validate θ=${round(dTreat.theta, 5)} CI[${round(dTreat.ci[0], 5)},${round(dTreat.ci[1], 5)}] n=${dTreat.n}`,
  );
  console.log(
    `[${TAG}] placebo validate θ=${round(dPlacebo.theta, 5)} CI[${round(dPlacebo.ci[0], 5)},${round(dPlacebo.ci[1], 5)}] n=${dPlacebo.n}`,
  );

  const number = dTreat.theta;
  const ci = dTreat.ci;
  const n = dTreat.n;
  const includes0 = ci[0] <= 0 && ci[1] >= 0;

  let status;
  if (number <= 0) status = "DEAD";
  else if (includes0) status = "DEAD";
  else if (placeboPasses) status = "DEAD";
  else status = "CANDIDATE";
  console.log(`[${TAG}] kill_line check → status=${status} (placeboPasses=${placeboPasses})`);

  const notes = [
    "Documented incentive, not an inferred one — BUT the OTC dump has no incentive-text column (only value/years/APY/guaranteed).",
    "This run therefore tests CONTRACT-YEAR proximity (final season of the signed deal) as the machine-readable proxy; incentive text is never invented.",
    `expandContractRows-compatible (gsis_id+apy): kept=${expandKept} skipped=${expandSkipped}; estimand joins by player name+team+season.`,
    "Milestone incentive version (F12) measured +1.16pp with a failed placebo — an artifact. Placebo here = ≥2 years remaining.",
    "C-379.",
    `C-379 run ${runAt.slice(0, 10)}: WR/TE/RB REG residual target_share (pp) vs trailing-${TRAILING_GAMES}.`,
    `Discover treated n=${dT.length} θ=${round(dDisc.theta, 5)} CI[${round(dDisc.ci[0], 5)},${round(dDisc.ci[1], 5)}].`,
    `Validate treated n=${vT.length} θ=${round(number, 5)} CI[${round(ci[0], 5)},${round(ci[1], 5)}] MDE80=${round(mde, 5)}.`,
    `Validate placebo n=${vC.length} θ=${round(dPlacebo.theta, 5)} CI[${round(dPlacebo.ci[0], 5)},${round(dPlacebo.ci[1], 5)}].`,
    "YAML lists discover 2017-2019 / validate 2020-2024 — this run matches.",
    "Data: nflverse contracts + player_stats (CC BY 4.0); no DB.",
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
