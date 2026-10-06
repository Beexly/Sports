#!/usr/bin/env node
/**
 * scripts/factors/A11.mjs — C-375 numerical runner for docs/factors/A11.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A11.yaml, T3):
 *   Out-of-sample ΔBrier of an HMM form-regime posterior feature added to
 *   the market logit for REG home-win, gated by a shuffle control.
 *
 *   Per team-season, the chronological sequence of game-level offensive
 *   EPA/play is treated as a 1-D emission stream. Gaussian HMMs with
 *   K=1..4 are fit by Baum–Welch on the pooled discover-era sequences.
 *   K* is reported under AIC and BIC. Shuffle gate: the K*=selected vs K=1
 *   log-likelihood gain on real sequences must exceed the 95th percentile
 *   of the same gain on within-team-season shuffled sequences.
 *
 *   Game factor = P(high-mean state | prior games this season)_home −
 *                 P(high-mean state | prior games this season)_away,
 *   using forward-filtered posteriors on season-to-date PRIOR games only.
 *
 *   kill_line: shuffle gate fails or validate-era ΔBrier >= 0 or
 *              P(better) < 0.75 → DEAD.
 *
 * Data: nflverse pbp 2017–2024 (projected cache) + nfldata games.csv.
 *
 * Usage:
 *   node scripts/factors/A11.mjs
 *   node scripts/factors/A11.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  eraOf, headSha, isReg, loadGames, loadPbpSeason, marketFairHome,
  mean, mulberry32, normTeam, round, runJointFactor, shuffleInPlace,
  stdev, toNumber, writeYamlBlocked, writeYamlResult,
} from "./lib/common.mjs";

const TAG = "A11";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A11.yaml");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const K_MAX = 4;
const MIN_GAMES_FOR_POSTERIOR = 4;
const SHUFFLE_REPS = 20;
const SHUFFLE_SEED = 20260915;
const EM_ITERS = 40;
const noCache = process.argv.includes("--no-cache");

// ── Gaussian HMM (1-D emissions, Baum–Welch) ────────────────────────────────

function initParams(K, obs, rand) {
  const m = mean(obs);
  const s = Math.max(1e-3, stdev(obs) || 0.1);
  const means = [];
  const vars = [];
  for (let k = 0; k < K; k += 1) {
    means.push(m + (k - (K - 1) / 2) * s * 0.8);
    vars.push(s * s);
  }
  const A = Array.from({ length: K }, () => new Array(K).fill(1 / K));
  for (let i = 0; i < K; i += 1) {
    let sum = 0;
    for (let j = 0; j < K; j += 1) {
      A[i][j] = 0.7 / K + 0.3 * (i === j ? 1 : 0) + 0.05 * rand();
      sum += A[i][j];
    }
    for (let j = 0; j < K; j += 1) A[i][j] /= sum;
  }
  const pi = new Array(K).fill(1 / K);
  return { means, vars, A, pi };
}

function gaussLogPdf(x, mu, varr) {
  const v = Math.max(varr, 1e-6);
  return -0.5 * Math.log(2 * Math.PI * v) - ((x - mu) ** 2) / (2 * v);
}

function forwardLL(seq, params) {
  const { means, vars, A, pi } = params;
  const K = means.length;
  const T = seq.length;
  if (T === 0) return { ll: -Infinity, gamma: [], xi: [] };
  let logAlpha = [];
  let c = 0;
  // scaled forward
  const scales = new Array(T).fill(0);
  const alpha = Array.from({ length: T }, () => new Array(K).fill(0));
  for (let k = 0; k < K; k += 1) {
    alpha[0][k] = Math.max(1e-300, pi[k] * Math.exp(gaussLogPdf(seq[0], means[k], vars[k])));
  }
  scales[0] = alpha[0].reduce((a, b) => a + b, 0);
  if (!(scales[0] > 0)) return { ll: -Infinity, gamma: [], xi: [] };
  for (let k = 0; k < K; k += 1) alpha[0][k] /= scales[0];
  for (let t = 1; t < T; t += 1) {
    for (let j = 0; j < K; j += 1) {
      let acc = 0;
      for (let i = 0; i < K; i += 1) acc += alpha[t - 1][i] * A[i][j];
      alpha[t][j] = acc * Math.exp(gaussLogPdf(seq[t], means[j], vars[j]));
    }
    scales[t] = alpha[t].reduce((a, b) => a + b, 0);
    if (!(scales[t] > 0)) return { ll: -Infinity, gamma: [], xi: [] };
    for (let j = 0; j < K; j += 1) alpha[t][j] /= scales[t];
  }
  let ll = 0;
  for (let t = 0; t < T; t += 1) ll += Math.log(scales[t]);
  // backward
  const beta = Array.from({ length: T }, () => new Array(K).fill(0));
  for (let k = 0; k < K; k += 1) beta[T - 1][k] = 1;
  for (let t = T - 2; t >= 0; t -= 1) {
    for (let i = 0; i < K; i += 1) {
      let acc = 0;
      for (let j = 0; j < K; j += 1) {
        acc += A[i][j] * Math.exp(gaussLogPdf(seq[t + 1], means[j], vars[j])) * beta[t + 1][j];
      }
      beta[t][i] = acc / scales[t + 1];
    }
  }
  const gamma = Array.from({ length: T }, () => new Array(K).fill(0));
  for (let t = 0; t < T; t += 1) {
    let s = 0;
    for (let k = 0; k < K; k += 1) {
      gamma[t][k] = Math.max(1e-300, alpha[t][k] * beta[t][k]);
      s += gamma[t][k];
    }
    for (let k = 0; k < K; k += 1) gamma[t][k] /= s;
  }
  return { ll, gamma, alpha, scales };
}

function baumWelch(sequences, K, seed = 1) {
  const rand = mulberry32(seed);
  const all = sequences.flat();
  if (all.length < K * 5) return null;
  let params = initParams(K, all, rand);
  let best = null;
  for (let iter = 0; iter < EM_ITERS; iter += 1) {
    const meansAcc = new Array(K).fill(0);
    const varsAcc = new Array(K).fill(0);
    const gammaSum = new Array(K).fill(0);
    const Aacc = Array.from({ length: K }, () => new Array(K).fill(0));
    const piAcc = new Array(K).fill(0);
    let totalLL = 0;
    for (const seq of sequences) {
      if (seq.length < 3) continue;
      const { ll, gamma } = forwardLL(seq, params);
      if (!Number.isFinite(ll)) continue;
      totalLL += ll;
      for (let k = 0; k < K; k += 1) {
        piAcc[k] += gamma[0][k];
        for (let t = 0; t < seq.length; t += 1) {
          gammaSum[k] += gamma[t][k];
          meansAcc[k] += gamma[t][k] * seq[t];
          varsAcc[k] += gamma[t][k] * (seq[t] - params.means[k]) ** 2;
        }
      }
      // transition counts via gamma (approximate: γ_t(i)A_ij b_j / normalizer ≈ γ_t(i)*γ_{t+1}(j))
      for (let t = 0; t < seq.length - 1; t += 1) {
        for (let i = 0; i < K; i += 1) {
          for (let j = 0; j < K; j += 1) {
            Aacc[i][j] += gamma[t][i] * gamma[t + 1][j];
          }
        }
      }
    }
    if (!(gammaSum.every((v) => v > 1e-8))) break;
    const newMeans = meansAcc.map((s, k) => s / gammaSum[k]);
    const newVars = varsAcc.map((s, k) => Math.max(1e-6, s / gammaSum[k]));
    const newA = Aacc.map((row) => {
      const s = row.reduce((a, b) => a + b, 0);
      return s > 0 ? row.map((v) => v / s) : row.map(() => 1 / K);
    });
    const piS = piAcc.reduce((a, b) => a + b, 0);
    const newPi = piS > 0 ? piAcc.map((v) => v / piS) : new Array(K).fill(1 / K);
    params = { means: newMeans, vars: newVars, A: newA, pi: newPi };
    best = { ll: totalLL, params };
  }
  return best;
}

function nParams(K) {
  // K means + K vars + K*(K-1) free transitions + (K-1) pi
  return 2 * K + K * (K - 1) + (K - 1);
}

function aic(ll, k) { return 2 * k - 2 * ll; }
function bic(ll, k, n) { return k * Math.log(n) - 2 * ll; }

function selectK(fits, nObs) {
  let bestAic = { K: 1, score: Infinity, ll: fits[1]?.ll ?? -Infinity };
  let bestBic = { K: 1, score: Infinity, ll: fits[1]?.ll ?? -Infinity };
  for (let K = 1; K <= K_MAX; K += 1) {
    const fit = fits[K];
    if (!fit || !Number.isFinite(fit.ll)) continue;
    const a = aic(fit.ll, nParams(K));
    const b = bic(fit.ll, nParams(K), nObs);
    if (a < bestAic.score) bestAic = { K, score: a, ll: fit.ll };
    if (b < bestBic.score) bestBic = { K, score: b, ll: fit.ll };
  }
  return { bestAic, bestBic };
}

/** Forward-filtered last-step P(state) given a sequence. */
function lastStateProbs(seq, params) {
  const { ll, gamma } = forwardLL(seq, params);
  if (!Number.isFinite(ll) || gamma.length === 0) return null;
  return gamma[gamma.length - 1];
}

// ── build team-game EPA sequences ───────────────────────────────────────────

function buildTeamGameEpa(allPbp) {
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
  return byTeamGame;
}

function seasonSequences(byTeamGame) {
  const byTeamSeason = new Map();
  for (const [, e] of byTeamGame) {
    if (e.epas.length < 20) continue;
    const y = mean(e.epas);
    const key = `${e.team}|${e.season}`;
    const list = byTeamSeason.get(key) ?? [];
    list.push({ week: e.week, y, game_id: e.game_id, team: e.team, season: e.season });
    byTeamSeason.set(key, list);
  }
  const out = [];
  for (const [, list] of byTeamSeason) {
    list.sort((a, b) => a.week - b.week);
    out.push(list);
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

  let gamesRecords;
  try {
    gamesRecords = await loadGames({ noCache, tag: TAG });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const byTeamGame = buildTeamGameEpa(allPbp);
  const teamSeasons = seasonSequences(byTeamGame);
  const discoverSeqs = [];
  const validateSeqs = [];
  for (const list of teamSeasons) {
    const season = list[0].season;
    const era = eraOf(season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX);
    const ys = list.map((g) => g.y);
    if (era === "discover") discoverSeqs.push(ys);
    else if (era === "validate") validateSeqs.push(ys);
  }
  console.log(`[${TAG}] team-season sequences: discover=${discoverSeqs.length} validate=${validateSeqs.length}`);

  if (discoverSeqs.length < 8) {
    writeYamlBlocked(YAML, `too few discover team-season sequences (${discoverSeqs.length})`, runSha, runAt);
    return 2;
  }

  const nObs = discoverSeqs.reduce((s, a) => s + a.length, 0);
  const fits = {};
  for (let K = 1; K <= K_MAX; K += 1) {
    const fit = baumWelch(discoverSeqs, K, 1000 + K);
    if (fit) {
      fits[K] = fit;
      console.log(`[${TAG}] HMM K=${K} LL=${round(fit.ll, 3)} means=[${fit.params.means.map((m) => round(m, 4)).join(", ")}]`);
    }
  }
  if (!fits[1]) {
    writeYamlBlocked(YAML, "HMM K=1 fit failed on discover sequences", runSha, runAt);
    return 2;
  }
  const { bestAic, bestBic } = selectK(fits, nObs);
  const Kstar = bestAic.K; // use AIC selection for the feature; report both
  console.log(`[${TAG}] K* AIC=${bestAic.K} (score=${round(bestAic.score, 2)}) BIC=${bestBic.K} (score=${round(bestBic.score, 2)})`);

  // Shuffle gate
  const gainReal = (fits[Kstar]?.ll ?? -Infinity) - (fits[1]?.ll ?? -Infinity);
  const shuffleGains = [];
  const rand = mulberry32(SHUFFLE_SEED);
  for (let r = 0; r < SHUFFLE_REPS; r += 1) {
    const shuffled = discoverSeqs.map((s) => shuffleInPlace([...s], rand));
    const f1 = baumWelch(shuffled, 1, 2000 + r);
    const fk = baumWelch(shuffled, Kstar, 3000 + r);
    if (f1 && fk) shuffleGains.push(fk.ll - f1.ll);
  }
  shuffleGains.sort((a, b) => a - b);
  const q95 = shuffleGains.length > 0 ? shuffleGains[Math.floor(0.95 * (shuffleGains.length - 1))] : NaN;
  const shufflePass = Number.isFinite(gainReal) && Number.isFinite(q95) && gainReal > q95;
  console.log(
    `[${TAG}] shuffle gate: gainReal=${round(gainReal, 3)} q95_shuffled=${round(q95, 3)} ` +
      `reps=${shuffleGains.length} pass=${shufflePass}`,
  );

  // Build prior-only posteriors per team-game
  const posteriors = new Map(); // `${game_id}|${team}` -> pHigh
  const byTeamSeason = new Map();
  for (const list of teamSeasons) {
    const key = `${list[0].team}|${list[0].season}`;
    byTeamSeason.set(key, list);
  }
  const highState = (() => {
    const m = fits[Kstar].params.means;
    let hi = 0;
    for (let k = 1; k < m.length; k += 1) if (m[k] > m[hi]) hi = k;
    return hi;
  })();

  for (const [, list] of byTeamSeason) {
    const acc = [];
    for (const g of list) {
      if (acc.length >= MIN_GAMES_FOR_POSTERIOR) {
        const probs = lastStateProbs(acc, fits[Kstar].params);
        if (probs) posteriors.set(`${g.game_id}|${g.team}`, probs[highState]);
      }
      acc.push(g.y);
    }
  }

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
    const pH = posteriors.get(`${gid}|${home}`);
    const pA = posteriors.get(`${gid}|${away}`);
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

  const joint = runJointFactor(rows);
  console.log(
    `[${TAG}] joint: discover=${joint.nDiscover} validate=${joint.nValidate} ` +
      `ΔBrier=${round(joint.deltaBrier, 5)} P(better)=${round(joint.pBetter, 3)} ` +
      `coefD=${round(joint.coefD, 4)} coefV=${round(joint.coefV, 4)} signAgrees=${joint.signAgrees}`,
  );

  if (!joint.ok) {
    writeYamlBlocked(YAML, joint.reason, runSha, runAt);
    return 2;
  }

  // kill_line: shuffle gate fails OR ΔBrier >= 0 OR P(better) < 0.75 → DEAD
  let status;
  if (!shufflePass) status = "DEAD";
  else if (joint.deltaBrier >= 0 || joint.pBetter < 0.75) status = "DEAD";
  else status = "CANDIDATE";
  console.log(`[${TAG}] kill_line check → status=${status}`);

  const notes = [
    "T3. HMM form regimes on game-level offensive EPA/play sequences.",
    `Pooled Baum–Welch on discover team-seasons; K* AIC=${bestAic.K} BIC=${bestBic.K}.`,
    `Shuffle gate (within-team-season, ${SHUFFLE_REPS} reps): gainReal=${round(gainReal, 3)} q95=${round(q95, 3)} pass=${shufflePass}.`,
    `Factor = P(high state) home − away from prior-only season-to-date filter (min ${MIN_GAMES_FOR_POSTERIOR} games).`,
    "C-375.",
    `C-375 run ${runAt.slice(0, 10)}: REG home-win 2017–2024.`,
    `Discover n=${joint.nDiscover}; Validate n=${joint.nValidate}.`,
    `Brier market-only=${round(joint.bBase, 5)} with-factor=${round(joint.bFull, 5)}.`,
    `ΔBrier=${round(joint.deltaBrier, 5)} CI[${round(joint.ci[0], 5)},${round(joint.ci[1], 5)}] ` +
      `P(better)=${round(joint.pBetter, 3)} MDE80=${round(joint.mde, 5)} ` +
      `coefD=${round(joint.coefD, 4)} coefV=${round(joint.coefV, 4)} signAgrees=${joint.signAgrees}.`,
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Tennis-momentum priors 2404.13300 and 2409.10176 are a different sport/unit — cited, not assumed.",
    "Data: nflverse pbp + nfldata games.csv (CC BY 4.0); no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: joint.deltaBrier,
    ci: joint.ci,
    n: joint.nValidate,
    mde: joint.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] wrote ${YAML}`);
  console.log(
    `[${TAG}] RESULT status=${status} number=${round(joint.deltaBrier, 5)} ` +
      `ci=[${round(joint.ci[0], 5)}, ${round(joint.ci[1], 5)}] n=${joint.nValidate}`,
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
