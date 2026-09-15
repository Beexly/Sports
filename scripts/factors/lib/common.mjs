/**
 * scripts/factors/lib/common.mjs — shared helpers for A11–A16 runners.
 * Patterns mirror A6–A10 (standalone CSV load, joint Brier, YAML write-back).
 * No new dependencies (law 7). No DB. No invented numbers.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
export const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

export const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
export const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
export const PBP_URL = (s) => `${BASE}/pbp/play_by_play_${s}.csv`;
export const FTN_URL = (s) => `${BASE}/ftn_charting/ftn_charting_${s}.csv`;
export const CONTRACTS_URL = `${BASE}/contracts/historical_contracts.csv.gz`;

export const Z_95 = 1.959963984540054;
export const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;
export const BOOTSTRAP_RESAMPLES = 1000;
export const BOOTSTRAP_SEED = 20260915;
export const LOGIT_EPS = 1e-6;

export const GAMES_COLS = [
  "game_id", "season", "game_type", "week", "gameday",
  "home_team", "away_team", "home_score", "away_score", "result",
  "home_moneyline", "away_moneyline", "spread_line", "total_line", "total",
  "home_rest", "away_rest", "home_qb_name", "away_qb_name",
  "home_qb_id", "away_qb_id", "roof", "div_game",
];

export const PBP_COLS = [
  "play_id", "game_id", "season", "week", "season_type", "home_team", "away_team",
  "posteam", "defteam", "fixed_drive", "drive", "play_type", "down", "ydstogo",
  "yardline_100", "epa", "ep", "wp", "home_wp", "away_wp",
  "pass_oe", "success", "qb_dropback", "pass_attempt", "rush_attempt",
  "fourth_down_failed", "fourth_down_converted", "punt_attempt", "field_goal_attempt",
];

export const TEAM_ALIASES = { OAK: "LV", SD: "LAC", STL: "LA", JAC: "JAX" };

export function round(x, d = 5) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export function mean(a) {
  if (!a || a.length === 0) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

export function variance(a) {
  if (!a || a.length < 2) return NaN;
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) ** 2;
  return s / (a.length - 1);
}

export function stdev(a) {
  const v = variance(a);
  return Number.isFinite(v) ? Math.sqrt(v) : NaN;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function logit(p, eps = LOGIT_EPS) {
  const x = Math.min(1 - eps, Math.max(eps, p));
  return Math.log(x / (1 - x));
}

export function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function brierScore(p, y) {
  const pp = Math.min(1, Math.max(0, p));
  return (pp - y) ** 2;
}

export function impliedFromAmerican(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return -a / (-a + 100);
}

export function marketFairHome(homeMl, awayMl) {
  const ih = impliedFromAmerican(homeMl);
  const ia = impliedFromAmerican(awayMl);
  if (ih == null || ia == null) return null;
  const s = ih + ia;
  if (!(s > 0)) return null;
  const p = ih / s;
  return p > 0 && p < 1 ? p : null;
}

export function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export function eraOf(season, dMin, dMax, vMin, vMax) {
  if (season >= dMin && season <= dMax) return "discover";
  if (season >= vMin && season <= vMax) return "validate";
  return "other";
}

// ── CSV / fetch / cache ─────────────────────────────────────────────────────

export function parseCsv(text, project) {
  const records = [];
  let i = 0;
  const n = text.length;
  function readRow() {
    const row = [];
    let field = "";
    let inQuotes = false;
    while (i < n) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i += 1; continue;
        }
        field += c; i += 1; continue;
      }
      if (c === '"') { inQuotes = true; i += 1; continue; }
      if (c === ",") { row.push(field); field = ""; i += 1; continue; }
      if (c === "\n") { i += 1; row.push(field); return row; }
      if (c === "\r") {
        i += 1;
        if (text[i] === "\n") i += 1;
        row.push(field);
        return row;
      }
      field += c; i += 1;
    }
    if (field.length > 0 || row.length > 0) row.push(field);
    return row;
  }
  const header = readRow();
  if (header.length === 0 || (header.length === 1 && header[0] === "")) {
    return { header: [], records: [] };
  }
  const keep = [];
  const keys = [];
  const wanted = project ? new Set(project) : null;
  for (let c = 0; c < header.length; c += 1) {
    const name = header[c];
    if (!wanted || wanted.has(name)) { keep.push(c); keys.push(name); }
  }
  while (i < n) {
    const row = readRow();
    if (row.length === 1 && row[0] === "") continue;
    const rec = {};
    for (let k = 0; k < keep.length; k += 1) rec[keys[k]] = row[keep[k]] ?? "";
    records.push(rec);
  }
  return { header, records };
}

export function decodeBody(buf) {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString("utf8");
  return buf.toString("utf8");
}

export async function fetchText(url, { timeoutMs = 300_000, tag = "factor" } = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": `gse-factor-foundry-${tag}/1.0 (research; nflverse CC-BY-4.0)` },
  });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  return decodeBody(Buffer.from(await res.arrayBuffer()));
}

export function cachePath(name) { return path.join(DATA_DIR, name); }

export function loadCachedText(name, { noCache = false } = {}) {
  const p = cachePath(name);
  if (!noCache && existsSync(p) && statSync(p).size > 0) {
    // player_stats_combined.csv.gz is plain CSV despite the name.
    const buf = readFileSync(p);
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString("utf8");
    return buf.toString("utf8");
  }
  return null;
}

export function saveCachedText(name, text) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(cachePath(name), text, "utf8");
}

export async function loadTextCached(name, url, { noCache = false, tag = "factor" } = {}) {
  const cached = loadCachedText(name, { noCache });
  if (cached !== null) return { text: cached, fromCache: true };
  const text = await fetchText(url, { tag });
  saveCachedText(name, text);
  return { text, fromCache: false };
}

export function projectedCacheName(season) { return `pbp_proj_${season}.jsonl`; }

export function loadProjectedSeason(season, { noCache = false } = {}) {
  const text = loadCachedText(projectedCacheName(season), { noCache });
  if (text === null) return null;
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t) rows.push(JSON.parse(t));
  }
  return rows;
}

export function saveProjectedSeason(season, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    cachePath(projectedCacheName(season)),
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
}

export function projectPbpRow(r) {
  return {
    play_id: toNumber(r.play_id),
    game_id: r.game_id ?? "",
    season: toNumber(r.season),
    week: toNumber(r.week),
    season_type: r.season_type ?? "",
    home_team: r.home_team ?? "",
    away_team: r.away_team ?? "",
    posteam: r.posteam ?? "",
    defteam: r.defteam ?? "",
    drive: toNumber(r.fixed_drive) ?? toNumber(r.drive),
    play_type: r.play_type ?? "",
    down: toNumber(r.down),
    ydstogo: toNumber(r.ydstogo),
    yardline_100: toNumber(r.yardline_100),
    epa: toNumber(r.epa),
    ep: toNumber(r.ep),
    wp: toNumber(r.wp),
    home_wp: toNumber(r.home_wp),
    away_wp: toNumber(r.away_wp),
    pass_oe: toNumber(r.pass_oe),
    success: toNumber(r.success),
    qb_dropback: toNumber(r.qb_dropback),
    pass_attempt: toNumber(r.pass_attempt),
    rush_attempt: toNumber(r.rush_attempt),
    fourth_down_failed: toNumber(r.fourth_down_failed),
    fourth_down_converted: toNumber(r.fourth_down_converted),
    punt_attempt: toNumber(r.punt_attempt),
    field_goal_attempt: toNumber(r.field_goal_attempt),
  };
}

export async function loadPbpSeason(season, { noCache = false, tag = "factor" } = {}) {
  const cached = loadProjectedSeason(season, { noCache });
  if (cached !== null) {
    console.log(`[${tag}] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[${tag}] pbp ${season}: fetching ${url}`);
  const text = await fetchText(url, { tag });
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveProjectedSeason(season, rows);
  console.log(`[${tag}] pbp ${season}: projected ${rows.length} rows`);
  return rows;
}

export async function loadGames({ noCache = false, tag = "factor" } = {}) {
  const { text } = await loadTextCached("games_nfldata.csv", GAMES_URL, { noCache, tag });
  return parseCsv(text, GAMES_COLS).records;
}

// ── logistic / bootstrap / joint ────────────────────────────────────────────

export function fitLogistic(X, y, ridge = 1e-4, maxIter = 50) {
  const n = y.length;
  if (n === 0 || X.length === 0) return null;
  const k = X[0].length + 1;
  let beta = new Array(k).fill(0);
  for (let iter = 0; iter < maxIter; iter += 1) {
    const g = new Array(k).fill(0);
    const H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i += 1) {
      const xi = [1, ...X[i]];
      let z = 0;
      for (let j = 0; j < k; j += 1) z += beta[j] * xi[j];
      const p = sigmoid(z);
      const w = Math.max(1e-8, p * (1 - p));
      const r = y[i] - p;
      for (let a = 0; a < k; a += 1) {
        g[a] += xi[a] * r;
        for (let b = 0; b < k; b += 1) H[a][b] += w * xi[a] * xi[b];
      }
    }
    for (let a = 1; a < k; a += 1) H[a][a] += ridge;
    const A = H.map((row, i) => [...row, g[i]]);
    for (let col = 0; col < k; col += 1) {
      let pivot = col;
      for (let r = col + 1; r < k; r += 1) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      if (Math.abs(A[pivot][col]) < 1e-12) return null;
      [A[col], A[pivot]] = [A[pivot], A[col]];
      const div = A[col][col];
      for (let c = col; c <= k; c += 1) A[col][c] /= div;
      for (let r = 0; r < k; r += 1) {
        if (r === col) continue;
        const f = A[r][col];
        if (f === 0) continue;
        for (let c = col; c <= k; c += 1) A[r][c] -= f * A[col][c];
      }
    }
    const delta = A.map((row) => row[k]);
    let maxAbs = 0;
    for (let j = 0; j < k; j += 1) {
      beta[j] += delta[j];
      maxAbs = Math.max(maxAbs, Math.abs(delta[j]));
    }
    if (maxAbs < 1e-8) break;
  }
  return beta;
}

export function logisticPredict(beta, X) {
  return X.map((row) => {
    let z = beta[0];
    for (let j = 0; j < row.length; j += 1) z += beta[j + 1] * row[j];
    return sigmoid(z);
  });
}

export function pairedBootstrap(candLoss, mktLoss, resamples = BOOTSTRAP_RESAMPLES, seed = BOOTSTRAP_SEED) {
  const n = Math.min(candLoss.length, mktLoss.length);
  if (n === 0) return { pBetter: 0.5, delta: NaN, n: 0 };
  let full = 0;
  for (let i = 0; i < n; i += 1) full += candLoss[i] - mktLoss[i];
  const delta = full / n;
  const rand = mulberry32(seed);
  let better = 0;
  for (let r = 0; r < resamples; r += 1) {
    let sa = 0;
    let sb = 0;
    for (let i = 0; i < n; i += 1) {
      const idx = Math.floor(rand() * n);
      sa += candLoss[idx];
      sb += mktLoss[idx];
    }
    if (sa / n < sb / n) better += 1;
  }
  return { pBetter: better / resamples, delta, n };
}

/**
 * Joint market-logit test (§4.2 shape used by A8–A10).
 * rows: { factor, marketFairProb, outcome, era }
 * Returns ΔBrier, P(better), CI, MDE, coefficients, signAgrees.
 */
export function runJointFactor(rows, { minN = 30 } = {}) {
  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  if (discover.length < minN || validate.length < minN) {
    return {
      ok: false,
      reason: `insufficient joint rows (discover=${discover.length} validate=${validate.length})`,
      nDiscover: discover.length,
      nValidate: validate.length,
    };
  }
  const XdBase = discover.map((r) => [logit(r.marketFairProb)]);
  const XdFull = discover.map((r) => [logit(r.marketFairProb), r.factor]);
  const yd = discover.map((r) => r.outcome);
  const betaBase = fitLogistic(XdBase, yd);
  const betaFull = fitLogistic(XdFull, yd);
  if (!betaBase || !betaFull) {
    return { ok: false, reason: "logistic fit failed on discover era", nDiscover: discover.length, nValidate: validate.length };
  }
  const XvBase = validate.map((r) => [logit(r.marketFairProb)]);
  const XvFull = validate.map((r) => [logit(r.marketFairProb), r.factor]);
  const yv = validate.map((r) => r.outcome);
  const pBase = logisticPredict(betaBase, XvBase);
  const pFull = logisticPredict(betaFull, XvFull);
  const baseLoss = pBase.map((p, i) => brierScore(p, yv[i]));
  const fullLoss = pFull.map((p, i) => brierScore(p, yv[i]));
  const meanLoss = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const bBase = meanLoss(baseLoss);
  const bFull = meanLoss(fullLoss);
  const deltaBrier = bFull - bBase;
  const boot = pairedBootstrap(fullLoss, baseLoss);
  const diffs = fullLoss.map((v, i) => v - baseLoss[i]);
  const dMean = meanLoss(diffs);
  let ss = 0;
  for (const d of diffs) ss += (d - dMean) ** 2;
  const se = Math.sqrt(ss / (diffs.length * (diffs.length - 1)));
  const ci = [dMean - Z_95 * se, dMean + Z_95 * se];
  const mde = Z_SUM_80PCT * se;
  const coefD = betaFull[2];
  const betaFullV = fitLogistic(XvFull, yv);
  const coefV = betaFullV ? betaFullV[2] : NaN;
  const signAgrees =
    Number.isFinite(coefD) && Number.isFinite(coefV) &&
    Math.sign(coefD) === Math.sign(coefV) && coefD !== 0;
  return {
    ok: true,
    nDiscover: discover.length,
    nValidate: validate.length,
    bBase,
    bFull,
    deltaBrier,
    pBetter: boot.pBetter,
    ci,
    mde,
    coefD,
    coefV,
    signAgrees,
  };
}

/** Cluster-robust SE of a mean residual, clustered by key. */
export function clusterRobustMeanCi(residuals, keys) {
  // residuals[i], keys[i]; θ = mean(residual)
  const n = residuals.length;
  if (n === 0) return { theta: NaN, ci: [NaN, NaN], se: NaN, n: 0, nClusters: 0 };
  const theta = mean(residuals);
  const byCluster = new Map();
  for (let i = 0; i < n; i += 1) {
    const k = keys[i];
    const list = byCluster.get(k) ?? [];
    list.push(residuals[i] - theta);
    byCluster.set(k, list);
  }
  // CR0 meat: sum_c (sum_i e_i)^2
  let meat = 0;
  for (const list of byCluster.values()) {
    let s = 0;
    for (const e of list) s += e;
    meat += s * s;
  }
  const se = Math.sqrt(meat) / n;
  const ci = [theta - Z_95 * se, theta + Z_95 * se];
  return { theta, ci, se, n, nClusters: byCluster.size };
}

// ── YAML write-back ─────────────────────────────────────────────────────────

export function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function writeYamlResult(yamlPath, { status, number, ci, n, mde, runSha, runAt, notes, blockedOn = null }) {
  const existing = readFileSync(yamlPath, "utf8");
  const lines = existing.split(/\r?\n/);
  const out = [];
  let inNotes = false;
  let notesWritten = false;
  for (const line of lines) {
    if (/^notes:/.test(line)) {
      inNotes = true;
      out.push("notes: >");
      out.push(`  ${notes}`);
      notesWritten = true;
      continue;
    }
    if (inNotes) {
      if (line.trim().length === 0) continue;
      if (/^\s/.test(line)) continue;
      inNotes = false;
    }
    if (/^status:/.test(line)) { out.push(`status: ${status}`); continue; }
    if (/^number:/.test(line)) { out.push(`number: ${number === null ? "null" : round(number, 5)}`); continue; }
    if (/^ci:/.test(line)) {
      out.push(ci === null ? "ci: null" : `ci: [${round(ci[0], 5)}, ${round(ci[1], 5)}]`);
      continue;
    }
    if (/^n:/.test(line)) { out.push(`n: ${n === null ? "null" : n}`); continue; }
    if (/^mde_80pct_power:/.test(line)) {
      out.push(`mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 5)}`);
      continue;
    }
    if (/^run_sha:/.test(line)) { out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`); continue; }
    if (/^run_at:/.test(line)) { out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`); continue; }
    if (/^blocked_on:/.test(line)) {
      out.push(blockedOn === null ? "blocked_on: null" : `blocked_on: ${yamlQuote(blockedOn)}`);
      continue;
    }
    out.push(line);
  }
  if (!notesWritten) {
    out.push("notes: >");
    out.push(`  ${notes}`);
  }
  writeFileSync(yamlPath, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

export function writeYamlBlocked(yamlPath, blockedOn, runSha, runAt) {
  writeYamlResult(yamlPath, {
    status: "BLOCKED",
    number: null,
    ci: null,
    n: null,
    mde: null,
    runSha,
    runAt,
    notes: `BLOCKED: ${blockedOn}`,
    blockedOn,
  });
}

export function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Normalize a team code across relocation aliases. */
export function normTeam(t) {
  if (!t) return t;
  return TEAM_ALIASES[t] ?? t;
}

/** gameId from games.csv row: `${season}_${week}_${away}_${home}` */
export function gameIdFromRow(g) {
  const season = Number(g.season);
  const week = String(g.week).padStart(2, "0");
  return `${season}_${week}_${normTeam(g.away_team)}_${normTeam(g.home_team)}`;
}

export function isReg(g) {
  return (g.game_type ?? "") === "REG";
}
