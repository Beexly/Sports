#!/usr/bin/env node
/**
 * scripts/factors/A13.mjs — C-377 numerical runner for docs/factors/A13.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A13.yaml, T7):
 *   Out-of-sample ΔBrier of persistent-homology features of within-game
 *   play sequences, against two published nulls, added to the market logit.
 *
 *   SINGLE SHOT — no re-queue without a new spec. Published prior is null.
 *
 *   For each team-game, the chronological scrimmage-play EPA sequence is
 *   delay-embedded in 2-D (x_t, x_{t+1}). 0-dimensional persistence is
 *   the total MST edge length of the point cloud (equivalent to the sum
 *   of H0 lifetimes under a Rips filtration). Feature per team-game =
 *   total_persistence / n_plays. Season-to-date PRIOR mean is the
 *   pre-game factor: home − away.
 *
 *   Null A: within-sequence shuffle of the EPA values.
 *   Null B: first-order Markov surrogate (same transition counts on the
 *   sign-binarised sequence, emissions resampled from the residual pool).
 *
 *   A real factor must beat BOTH nulls on the joint ΔBrier, and the
 *   real-vs-null total-persistence gap must be non-degenerate.
 *
 *   kill_line: does not beat both Null A and Null B on validate era → DEAD.
 *
 * Data: nflverse pbp 2017–2024 projected cache + nfldata games.csv.
 *
 * Usage:
 *   node scripts/factors/A13.mjs
 *   node scripts/factors/A13.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  eraOf, headSha, isReg, loadGames, loadPbpSeason, marketFairHome,
  mean, mulberry32, normTeam, round, runJointFactor, shuffleInPlace,
  toNumber, writeYamlBlocked, writeYamlResult,
} from "./lib/common.mjs";

const TAG = "A13";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A13.yaml");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const MIN_PLAYS = 30;
const MIN_PRIOR_GAMES = 4;
const NULL_REPS = 8;
const NULL_SEED = 20260915;
const noCache = process.argv.includes("--no-cache");

/** Euclidean distance. */
function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 0-dim persistence total = sum of MST edge lengths on the delay-embedded
 * cloud (equivalent to Σ lifetimes of H0 bars under a Rips filtration).
 */
function totalPersistence(seq) {
  const n = seq.length;
  if (n < 3) return null;
  const pts = [];
  for (let t = 0; t + 1 < n; t += 1) pts.push([seq[t], seq[t + 1]]);
  const m = pts.length;
  if (m < 3) return null;
  // Prim MST
  const inTree = new Array(m).fill(false);
  const best = new Array(m).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let i = 0; i < m; i += 1) {
    let u = -1;
    for (let v = 0; v < m; v += 1) {
      if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v;
    }
    if (u === -1 || !Number.isFinite(best[u])) break;
    inTree[u] = true;
    total += best[u];
    for (let v = 0; v < m; v += 1) {
      if (inTree[v]) continue;
      const d = dist(pts[u], pts[v]);
      if (d < best[v]) best[v] = d;
    }
  }
  return total / m;
}

function binarize(seq) {
  return seq.map((x) => (x >= 0 ? 1 : 0));
}

/** First-order Markov surrogate on the sign-binarised sequence. */
function markovSurrogate(seq, rand) {
  const b = binarize(seq);
  let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
  for (let t = 0; t + 1 < b.length; t += 1) {
    if (b[t] === 0 && b[t + 1] === 0) n00 += 1;
    else if (b[t] === 0 && b[t + 1] === 1) n01 += 1;
    else if (b[t] === 1 && b[t + 1] === 0) n10 += 1;
    else n11 += 1;
  }
  const p01 = n00 + n01 > 0 ? n01 / (n00 + n01) : 0.5;
  const p10 = n10 + n11 > 0 ? n10 / (n10 + n11) : 0.5;
  const pos = seq.filter((x) => x >= 0);
  const neg = seq.filter((x) => x < 0);
  const out = [];
  let state = b[0] ?? 0;
  for (let t = 0; t < seq.length; t += 1) {
    const pool = state === 1 ? pos : neg;
    out.push(pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : 0);
    if (t + 1 < seq.length) {
      state = state === 0 ? (rand() < p01 ? 1 : 0) : (rand() < p10 ? 0 : 1);
    }
  }
  return out;
}

function buildTeamGameEpas(allPbp) {
  const byTeamGame = new Map();
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!p.posteam || !p.game_id || p.season == null) continue;
    if (p.epa == null) continue;
    if (p.pass_attempt !== 1 && p.rush_attempt !== 1 && !(p.play_type === "pass" || p.play_type === "run")) continue;
    const key = `${p.game_id}|${normTeam(p.posteam)}`;
    let e = byTeamGame.get(key);
    if (!e) {
      e = { season: p.season, week: p.week ?? 0, team: normTeam(p.posteam), game_id: p.game_id, epas: [] };
      byTeamGame.set(key, e);
    }
    e.epas.push(p.epa);
  }
  const games = [];
  for (const [, e] of byTeamGame) {
    if (e.epas.length < MIN_PLAYS) continue;
    const ph = totalPersistence(e.epas);
    if (ph == null) continue;
    games.push({ ...e, ph });
  }
  return games;
}

function priorPhByTeamGame(games) {
  const byTeamSeason = new Map();
  for (const g of games) {
    const key = `${g.team}|${g.season}`;
    const list = byTeamSeason.get(key) ?? [];
    list.push(g);
    byTeamSeason.set(key, list);
  }
  const prior = new Map();
  for (const [, list] of byTeamSeason) {
    list.sort((a, b) => a.week - b.week);
    let acc = [];
    for (const g of list) {
      if (acc.length >= MIN_PRIOR_GAMES) {
        prior.set(`${g.game_id}|${g.team}`, mean(acc));
      }
      acc.push(g.ph);
    }
  }
  return prior;
}

function jointRowsFromGames(gamesRecords, priorMap) {
  const rows = [];
  for (const g of gamesRecords) {
    if (!isReg(g)) continue;
    const season = Number(g.season);
    const era = eraOf(season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX);
    if (era === "other") continue;
    const home = normTeam(g.home_team);
    const away = normTeam(g.away_team);
    if (!home || !away) continue;
    const week = String(g.week).padStart(2, "0");
    const gid = `${season}_${week}_${away}_${home}`;
    const pH = priorMap.get(`${gid}|${home}`);
    const pA = priorMap.get(`${gid}|${away}`);
    if (pH == null || pA == null) continue;
    const mkt = marketFairHome(g.home_moneyline, g.away_moneyline);
    if (mkt == null) continue;
    const hs = toNumber(g.home_score);
    const as = toNumber(g.away_score);
    if (hs == null || as == null) continue;
    const outcome = hs > as ? 1 : hs < as ? 0 : null;
    if (outcome === null) continue;
    rows.push({ season, era, marketFairProb: mkt, factor: pH - pA, outcome, home, away });
  }
  return rows;
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

  let gamesRecords;
  try {
    gamesRecords = await loadGames({ noCache, tag: TAG });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const games = buildTeamGameEpas(allPbp);
  console.log(`[${TAG}] team-games with PH: ${games.length}`);
  const realMeanPh = mean(games.map((g) => g.ph));

  // Null A / Null B on a discover-era subsample of sequences (single shot).
  const rand = mulberry32(NULL_SEED);
  const discoverGames = games.filter((g) => eraOf(g.season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX) === "discover");
  const sample = discoverGames.slice(0, Math.min(400, discoverGames.length));
  const nullA = [];
  const nullB = [];
  for (const g of sample) {
    for (let r = 0; r < NULL_REPS; r += 1) {
      const sa = totalPersistence(shuffleInPlace([...g.epas], rand));
      if (sa != null) nullA.push(sa);
      const sb = totalPersistence(markovSurrogate(g.epas, rand));
      if (sb != null) nullB.push(sb);
    }
  }
  const meanNullA = mean(nullA);
  const meanNullB = mean(nullB);
  console.log(
    `[${TAG}] PH means: real=${round(realMeanPh, 5)} nullA=${round(meanNullA, 5)} nullB=${round(meanNullB, 5)} ` +
      `(n real=${games.length} nullA=${nullA.length} nullB=${nullB.length})`,
  );

  const priorReal = priorPhByTeamGame(games);
  const rowsReal = jointRowsFromGames(gamesRecords, priorReal);
  const jointReal = runJointFactor(rowsReal);
  if (!jointReal.ok) {
    writeYamlBlocked(YAML, jointReal.reason, runSha, runAt);
    return 2;
  }
  console.log(
    `[${TAG}] joint real: nV=${jointReal.nValidate} ΔBrier=${round(jointReal.deltaBrier, 5)} P(better)=${round(jointReal.pBetter, 3)}`,
  );

  // Build null game feature streams (one shuffle / one Markov pass) and score.
  const nullJoints = [];
  for (let r = 0; r < 3; r += 1) {
    const nullGamesA = games.map((g) => ({ ...g, ph: totalPersistence(shuffleInPlace([...g.epas], rand)) ?? g.ph }));
    const priorA = priorPhByTeamGame(nullGamesA);
    const jointA = runJointFactor(jointRowsFromGames(gamesRecords, priorA));
    if (jointA.ok) nullJoints.push({ nullId: "A", ...jointA });
    const nullGamesB = games.map((g) => ({ ...g, ph: totalPersistence(markovSurrogate(g.epas, rand)) ?? g.ph }));
    const priorB = priorPhByTeamGame(nullGamesB);
    const jointB = runJointFactor(jointRowsFromGames(gamesRecords, priorB));
    if (jointB.ok) nullJoints.push({ nullId: "B", ...jointB });
  }
  const nullAJoins = nullJoints.filter((j) => j.nullId === "A");
  const nullBJoins = nullJoints.filter((j) => j.nullId === "B");
  const bestNullA = nullAJoins.length
    ? nullAJoins.reduce((a, b) => (a.deltaBrier <= b.deltaBrier ? a : b))
    : { deltaBrier: NaN, pBetter: 0.5 };
  const bestNullB = nullBJoins.length
    ? nullBJoins.reduce((a, b) => (a.deltaBrier <= b.deltaBrier ? a : b))
    : { deltaBrier: NaN, pBetter: 0.5 };
  console.log(
    `[${TAG}] best null A ΔBrier=${round(bestNullA.deltaBrier, 5)}; best null B ΔBrier=${round(bestNullB.deltaBrier, 5)}`,
  );

  // Beat both nulls: real ΔBrier strictly better (more negative) than each,
  // AND real mean PH differs from both null means (structure exists).
  const phBeatsNulls =
    Number.isFinite(realMeanPh) &&
    Number.isFinite(meanNullA) &&
    Number.isFinite(meanNullB) &&
    Math.abs(realMeanPh - meanNullA) > 0 &&
    Math.abs(realMeanPh - meanNullB) > 0;
  const beatsA = jointReal.deltaBrier < bestNullA.deltaBrier;
  const beatsB = jointReal.deltaBrier < bestNullB.deltaBrier;
  const beatsBoth = phBeatsNulls && beatsA && beatsB && jointReal.deltaBrier < 0 && jointReal.pBetter >= 0.75;

  // kill_line primary number = validate ΔBrier of the real PH feature
  const status = beatsBoth ? "CANDIDATE" : "DEAD";
  console.log(
    `[${TAG}] kill_line check → status=${status} (phBeatsNulls=${phBeatsNulls} beatsA=${beatsA} beatsB=${beatsB} ` +
      `ΔBrier=${round(jointReal.deltaBrier, 5)} P(better)=${round(jointReal.pBetter, 3)})`,
  );

  const notes = [
    "T7. Persistent homology (H0 total MST persistence of delay-embedded EPA).",
    "Published prior is null. SINGLE SHOT — no re-queue without a new spec.",
    `Null A = within-sequence shuffle; Null B = order-1 Markov sign surrogate (${NULL_REPS} reps on discover subsample).`,
    `PH means real=${round(realMeanPh, 5)} nullA=${round(meanNullA, 5)} nullB=${round(meanNullB, 5)}.`,
    `Best null joint ΔBrier A=${round(bestNullA.deltaBrier, 5)} B=${round(bestNullB.deltaBrier, 5)}.`,
    "Factor = prior-only season-to-date mean PH home − away.",
    "C-377.",
    `C-377 run ${runAt.slice(0, 10)}: REG home-win 2017–2024.`,
    `Discover n=${jointReal.nDiscover}; Validate n=${jointReal.nValidate}.`,
    `Brier market-only=${round(jointReal.bBase, 5)} with-factor=${round(jointReal.bFull, 5)}.`,
    `ΔBrier=${round(jointReal.deltaBrier, 5)} CI[${round(jointReal.ci[0], 5)},${round(jointReal.ci[1], 5)}] ` +
      `P(better)=${round(jointReal.pBetter, 3)} MDE80=${round(jointReal.mde, 5)} ` +
      `coefD=${round(jointReal.coefD, 4)} coefV=${round(jointReal.coefV, 4)} signAgrees=${jointReal.signAgrees}.`,
    "Topology-only tennis prior 2607.23509 is a different sport — cited, not assumed.",
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Data: nflverse pbp + nfldata games.csv (CC BY 4.0); no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: jointReal.deltaBrier,
    ci: jointReal.ci,
    n: jointReal.nValidate,
    mde: jointReal.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] wrote ${YAML}`);
  console.log(
    `[${TAG}] RESULT status=${status} number=${round(jointReal.deltaBrier, 5)} ` +
      `ci=[${round(jointReal.ci[0], 5)}, ${round(jointReal.ci[1], 5)}] n=${jointReal.nValidate}`,
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
