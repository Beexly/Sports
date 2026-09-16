#!/usr/bin/env node
/**
 * scripts/factors/A9.mjs — C-373 numerical runner for docs/factors/A9.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A9.yaml, W6):
 *   Out-of-sample ΔBrier of a DFA-scaling-exponent feature added to the
 *   market logit for REG home-win.
 *
 *   Per team-season, the offensive EPA sequence (chronological scrimmage
 *   plays) is reduced to a DFA scaling exponent α (windows 8..N/4, linear
 *   detrend). The game-level factor is (home α − away α) using season-to-date
 *   α from PRIOR games only (no same-game leakage).
 *
 *   EP model caveat (YAML / Brill 2409.04889): the EPA input is nflfastR's
 *   published EP on the nflverse pbp release — not a custom EP — and Brill
 *   documents that model's selection bias.
 *
 *   kill_line: validate-era ΔBrier >= 0 or P(better) < 0.75 → DEAD.
 *
 * Data: nflverse pbp 2017–2024 (A6 projected cache) + nfldata games.csv
 * moneylines for marketFairProb.
 *
 * Usage:
 *   node scripts/factors/A9.mjs
 *   node scripts/factors/A9.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A9.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const MIN_EPA_FOR_DFA = 120;
const MIN_PRIOR_GAMES = 4;
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;
const BOOTSTRAP_RESAMPLES = 1000;
const BOOTSTRAP_SEED = 20260915;
const LOGIT_EPS = 1e-6;

const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const PBP_URL = (s) => `${BASE}/pbp/play_by_play_${s}.csv`;
const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

const PBP_COLS = [
  "play_id", "game_id", "season", "week", "season_type", "home_team", "away_team",
  "posteam", "fixed_drive", "drive", "play_type", "down", "ydstogo", "yardline_100",
  "epa", "ep", "pass_oe", "success", "qb_dropback", "pass_attempt", "rush_attempt",
];

const GAMES_COLS = [
  "season", "week", "game_type", "gameday", "home_team", "away_team",
  "home_score", "away_score", "home_moneyline", "away_moneyline", "spread_line", "result",
];

const noCache = process.argv.includes("--no-cache");

// ── CSV / fetch / cache ─────────────────────────────────────────────────────

function parseCsv(text, project) {
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

function decodeBody(buf) {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf).toString("utf8");
  return buf.toString("utf8");
}

async function fetchText(url, { timeoutMs = 300_000 } = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "gse-factor-foundry-A9/1.0 (research; nflverse CC-BY-4.0)" },
  });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  return decodeBody(Buffer.from(await res.arrayBuffer()));
}

function cachePath(name) { return path.join(DATA_DIR, name); }

function loadCachedText(name) {
  const p = cachePath(name);
  if (!noCache && existsSync(p) && statSync(p).size > 0) return readFileSync(p, "utf8");
  return null;
}

function saveCachedText(name, text) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(cachePath(name), text, "utf8");
}

function projectedCacheName(season) { return `pbp_proj_${season}.jsonl`; }

function loadProjectedSeason(season) {
  const text = loadCachedText(projectedCacheName(season));
  if (text === null) return null;
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t) rows.push(JSON.parse(t));
  }
  return rows;
}

function saveProjectedSeason(season, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(cachePath(projectedCacheName(season)), rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}

function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

function projectPbpRow(r) {
  return {
    play_id: toNumber(r.play_id),
    game_id: r.game_id ?? "",
    season: toNumber(r.season),
    week: toNumber(r.week),
    season_type: r.season_type ?? "",
    home_team: r.home_team ?? "",
    away_team: r.away_team ?? "",
    posteam: r.posteam ?? "",
    drive: toNumber(r.fixed_drive) ?? toNumber(r.drive),
    play_type: r.play_type ?? "",
    down: toNumber(r.down),
    ydstogo: toNumber(r.ydstogo),
    yardline_100: toNumber(r.yardline_100),
    epa: toNumber(r.epa),
    ep: toNumber(r.ep),
    pass_oe: toNumber(r.pass_oe),
    success: toNumber(r.success),
    qb_dropback: toNumber(r.qb_dropback),
    pass_attempt: toNumber(r.pass_attempt),
    rush_attempt: toNumber(r.rush_attempt),
  };
}

async function loadPbpSeason(season) {
  const cached = loadProjectedSeason(season);
  if (cached !== null) {
    console.log(`[A9] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[A9] pbp ${season}: fetching ${url}`);
  const text = await fetchText(url);
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveProjectedSeason(season, rows);
  console.log(`[A9] pbp ${season}: projected ${rows.length} rows`);
  return rows;
}

async function loadGames() {
  const cached = loadCachedText("games_nfldata.csv");
  let text = cached;
  if (text === null) {
    text = await fetchText(GAMES_URL);
    saveCachedText("games_nfldata.csv", text);
  }
  return parseCsv(text, GAMES_COLS).records;
}

// ── math ────────────────────────────────────────────────────────────────────

function mean(a) {
  if (a.length === 0) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function round(x, d = 5) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function logit(p, eps = LOGIT_EPS) {
  const x = Math.min(1 - eps, Math.max(eps, p));
  return Math.log(x / (1 - x));
}

function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function brierScore(p, y) {
  const pp = Math.min(1, Math.max(0, p));
  return (pp - y) ** 2;
}

/** American odds → implied probability (no vig). */
function impliedFromAmerican(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return -a / (-a + 100);
}

/** Vig-free home-win probability from a pair of American moneylines. */
function marketFairHome(homeMl, awayMl) {
  const ih = impliedFromAmerican(homeMl);
  const ia = impliedFromAmerican(awayMl);
  if (ih == null || ia == null) return null;
  const s = ih + ia;
  if (!(s > 0)) return null;
  const p = ih / s;
  return p > 0 && p < 1 ? p : null;
}

/**
 * DFA scaling exponent α of a 1-D series.
 * Integrate mean-centered series, RMS fluctuation in windows, log-log slope.
 */
function dfaAlpha(series) {
  const n = series.length;
  if (n < MIN_EPA_FOR_DFA) return null;
  const mu = mean(series);
  const y = new Array(n);
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    acc += series[i] - mu;
    y[i] = acc;
  }
  const sizes = [];
  for (let w = 8; w <= Math.floor(n / 4); w *= 2) sizes.push(w);
  if (sizes.length < 3) return null;
  const logN = [];
  const logF = [];
  for (const w of sizes) {
    const nSeg = Math.floor(n / w);
    if (nSeg < 1) continue;
    let sumSq = 0;
    let count = 0;
    for (let s = 0; s < nSeg; s += 1) {
      const start = s * w;
      // linear detrend on [start, start+w)
      let sumX = 0;
      let sumY = 0;
      let sumXX = 0;
      let sumXY = 0;
      for (let i = 0; i < w; i += 1) {
        const x = i;
        const yy = y[start + i];
        sumX += x;
        sumY += yy;
        sumXX += x * x;
        sumXY += x * yy;
      }
      const denom = w * sumXX - sumX * sumX;
      if (Math.abs(denom) < 1e-12) continue;
      const b = (w * sumXY - sumX * sumY) / denom;
      const a = (sumY - b * sumX) / w;
      let segSq = 0;
      for (let i = 0; i < w; i += 1) {
        const resid = y[start + i] - (a + b * i);
        segSq += resid * resid;
      }
      sumSq += segSq / w;
      count += 1;
    }
    if (count === 0) continue;
    const F = Math.sqrt(sumSq / count);
    if (F > 1e-12) {
      logN.push(Math.log(w));
      logF.push(Math.log(F));
    }
  }
  if (logN.length < 3) return null;
  // OLS slope
  const k = logN.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < k; i += 1) {
    sx += logN[i];
    sy += logF[i];
    sxx += logN[i] * logN[i];
    sxy += logN[i] * logF[i];
  }
  const denom = k * sxx - sx * sx;
  if (Math.abs(denom) < 1e-12) return null;
  return (k * sxy - sx * sy) / denom;
}

/** Newton–Raphson logistic. X rows are feature vectors (no intercept). */
function fitLogistic(X, y, ridge = 1e-4, maxIter = 50) {
  const n = y.length;
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
    // Solve H Δ = g
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

function logisticPredict(beta, X) {
  return X.map((row) => {
    let z = beta[0];
    for (let j = 0; j < row.length; j += 1) z += beta[j + 1] * row[j];
    return sigmoid(z);
  });
}

function pairedBootstrap(candLoss, mktLoss, resamples = BOOTSTRAP_RESAMPLES, seed = BOOTSTRAP_SEED) {
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

function eraOf(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

function isScrimmage(play) {
  const t = (play.play_type ?? "").toLowerCase();
  return t === "pass" || t === "run" || play.pass_attempt === 1 || play.rush_attempt === 1;
}

/**
 * Build team-season EPA series, then team-game season-to-date DFA α from
 * PRIOR games only.
 */
function buildGameFactors(allPbp) {
  // team|season → array of {week, game_id, epas: number[]}
  const teamSeasonGames = new Map();
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!p.posteam || !p.game_id || p.season == null) continue;
    if (!isScrimmage(p) || p.epa == null) continue;
    const key = `${p.posteam}|${p.season}`;
    let games = teamSeasonGames.get(key);
    if (!games) {
      games = new Map();
      teamSeasonGames.set(key, games);
    }
    let g = games.get(p.game_id);
    if (!g) {
      g = { game_id: p.game_id, season: p.season, week: p.week, team: p.posteam, epas: [] };
      games.set(p.game_id, g);
    }
    g.epas.push(p.epa);
  }

  // season-to-date α after each game (using plays from PRIOR games)
  /** `${team}|${season}|${game_id}` → alpha */
  const alphaByTeamGame = new Map();
  for (const [, gamesMap] of teamSeasonGames) {
    const games = [...gamesMap.values()].sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
    let priorEpas = [];
    let priorGames = 0;
    for (const g of games) {
      if (priorGames >= MIN_PRIOR_GAMES && priorEpas.length >= MIN_EPA_FOR_DFA) {
        const a = dfaAlpha(priorEpas);
        if (a != null) alphaByTeamGame.set(`${g.team}|${g.season}|${g.game_id}`, a);
      }
      priorEpas = priorEpas.concat(g.epas);
      priorGames += 1;
    }
  }
  return alphaByTeamGame;
}

// ── YAML write-back ─────────────────────────────────────────────────────────

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function writeYamlResult({ status, number, ci, n, mde, runSha, runAt, notes }) {
  const existing = readFileSync(YAML_PATH, "utf8");
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
    if (/^blocked_on:/.test(line)) { out.push(`blocked_on: null`); continue; }
    out.push(line);
  }
  if (!notesWritten) {
    out.push("notes: >");
    out.push(`  ${notes}`);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

function writeYamlBlocked(blockedOn, runSha, runAt) {
  const existing = readFileSync(YAML_PATH, "utf8");
  const lines = existing.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (/^status:/.test(line)) { out.push("status: BLOCKED"); continue; }
    if (/^blocked_on:/.test(line)) { out.push(`blocked_on: ${yamlQuote(blockedOn)}`); continue; }
    if (/^run_sha:/.test(line)) { out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`); continue; }
    if (/^run_at:/.test(line)) { out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`); continue; }
    out.push(line);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A9] run_at=${runAt} run_sha=${runSha}`);

  let allPbp = [];
  try {
    for (const season of SEASONS) {
      allPbp = allPbp.concat(await loadPbpSeason(season));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(`nflverse pbp unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  let gamesRecords;
  try {
    gamesRecords = await loadGames();
    console.log(`[A9] games.csv rows=${gamesRecords.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const alphaByTeamGame = buildGameFactors(allPbp);
  console.log(`[A9] team-game DFA alphas (season-to-date, prior games only): ${alphaByTeamGame.size}`);

  const rows = [];
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const era = eraOf(season);
    if (era === "other") continue;
    const home = g.home_team;
    const away = g.away_team;
    if (!home || !away) continue;
    // pbp uses current franchise codes; games.csv may use era codes.
    // Direct match first; OAK→LV / SD→LAC / STL→LA handled below.
    const aliases = { OAK: "LV", SD: "LAC", STL: "LA", JAC: "JAX" };
    const resolve = (t, season) => {
      if (alphaByTeamGame.has(`${t}|${season}|${g.season}_${g.week}_${away}_${home}`)) return t;
      return t;
    };
    // gameId in pbp is like 2017_01_NE_KC (away_home). Reconstruct both orders.
    const week = String(g.week).padStart(2, "0");
    const gidA = `${season}_${week}_${away}_${home}`;
    const gidB = `${season}_${week}_${home}_${away}`;
    const findAlpha = (team) => {
      const cands = [team];
      for (const [from, to] of Object.entries(aliases)) {
        if (team === from) cands.push(to);
        if (team === to) cands.push(from);
      }
      for (const t of cands) {
        const a = alphaByTeamGame.get(`${t}|${season}|${gidA}`) ?? alphaByTeamGame.get(`${t}|${season}|${gidB}`);
        if (a != null) return a;
      }
      return null;
    };
    const aHome = findAlpha(home);
    const aAway = findAlpha(away);
    if (aHome == null || aAway == null) continue;
    const mkt = marketFairHome(g.home_moneyline, g.away_moneyline);
    if (mkt == null) continue;
    const hs = toNumber(g.home_score);
    const as = toNumber(g.away_score);
    if (hs == null || as == null) continue;
    const outcome = hs > as ? 1 : hs < as ? 0 : null;
    if (outcome === null) continue;
    rows.push({
      season,
      week: Number(g.week),
      era,
      marketFairProb: mkt,
      factor: aHome - aAway,
      outcome,
      home,
      away,
    });
  }

  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(`[A9] game rows with market+DFA: discover=${discover.length} validate=${validate.length}`);
  console.log(
    `[A9] mean factor D=${round(mean(discover.map((r) => r.factor)), 4)} ` +
      `V=${round(mean(validate.map((r) => r.factor)), 4)}`,
  );

  if (discover.length < 30 || validate.length < 30) {
    writeYamlBlocked(
      `insufficient market+DFA game rows (discover=${discover.length} validate=${validate.length})`,
      runSha, runAt,
    );
    return 2;
  }

  // Fit on discover: market-only vs market+factor
  const XdBase = discover.map((r) => [logit(r.marketFairProb)]);
  const XdFull = discover.map((r) => [logit(r.marketFairProb), r.factor]);
  const yd = discover.map((r) => r.outcome);
  const betaBase = fitLogistic(XdBase, yd);
  const betaFull = fitLogistic(XdFull, yd);
  if (!betaBase || !betaFull) {
    writeYamlBlocked("logistic fit failed on discover era", runSha, runAt);
    return 2;
  }

  const XvBase = validate.map((r) => [logit(r.marketFairProb)]);
  const XvFull = validate.map((r) => [logit(r.marketFairProb), r.factor]);
  const yv = validate.map((r) => r.outcome);
  const pBase = logisticPredict(betaBase, XvBase);
  const pFull = logisticPredict(betaFull, XvFull);
  const baseLoss = pBase.map((p, i) => brierScore(p, yv[i]));
  const fullLoss = pFull.map((p, i) => brierScore(p, yv[i]));
  const mktLoss = validate.map((r) => brierScore(r.marketFairProb, r.outcome));

  const bBase = mean(baseLoss);
  const bFull = mean(fullLoss);
  const bMkt = mean(mktLoss);
  // number = ΔBrier full − market-only (negative = factor helps)
  const deltaBrier = bFull - bBase;
  const boot = pairedBootstrap(fullLoss, baseLoss);

  // paired CI on ΔBrier
  const diffs = fullLoss.map((v, i) => v - baseLoss[i]);
  const dMean = mean(diffs);
  let ss = 0;
  for (const d of diffs) ss += (d - dMean) ** 2;
  const se = Math.sqrt(ss / (diffs.length * (diffs.length - 1)));
  const Z_95 = 1.959963984540054;
  const ci = [dMean - Z_95 * se, dMean + Z_95 * se];
  const mde = Z_SUM_80PCT * se;

  const coefD = betaFull[2];
  // re-fit on validate for sign check
  const betaFullV = fitLogistic(XvFull, yv);
  const coefV = betaFullV ? betaFullV[2] : NaN;
  const signAgrees = Number.isFinite(coefD) && Number.isFinite(coefV) && Math.sign(coefD) === Math.sign(coefV) && coefD !== 0;

  console.log(
    `[A9] Brier market-only=${round(bBase, 5)} with-factor=${round(bFull, 5)} raw-market=${round(bMkt, 5)}`,
  );
  console.log(
    `[A9] ΔBrier=${round(deltaBrier, 5)} P(better)=${round(boot.pBetter, 3)} ` +
      `coefD=${round(coefD, 4)} coefV=${round(coefV, 4)} signAgrees=${signAgrees}`,
  );
  console.log(`[A9] CI[${round(ci[0], 5)}, ${round(ci[1], 5)}] MDE80=${round(mde, 5)}`);

  // kill_line: validate-era ΔBrier >= 0 or P(better) < 0.75 → DEAD
  // (sign agreement is part of the §4.2 keep rule; include it)
  let status;
  if (!Number.isFinite(deltaBrier)) status = "BLOCKED";
  else if (deltaBrier >= 0 || boot.pBetter < 0.75 || !signAgrees) status = "DEAD";
  else status = "CANDIDATE";
  console.log(`[A9] kill_line check → status=${status}`);

  const notes = [
    "W6. Low prior (Koopman p=0.89); cheap; run. EPA input is nflfastR EP from",
    "the nflverse pbp release (not a custom EP). Brill 2409.04889 documents",
    "nflfastR EP selection bias — named caveat, not a correction. C-373.",
    `C-373 run ${runAt.slice(0, 10)}: REG home-win, factor = home DFA α − away DFA α`,
    "(season-to-date, prior games only; min 4 prior games and 120 EPA plays).",
    `Discover n=${discover.length}; Validate n=${validate.length}.`,
    `Brier market-only=${round(bBase, 5)} with-factor=${round(bFull, 5)}.`,
    `ΔBrier=${round(deltaBrier, 5)} CI[${round(ci[0], 5)},${round(ci[1], 5)}] ` +
      `P(better)=${round(boot.pBetter, 3)} MDE80=${round(mde, 5)} ` +
      `coefD=${round(coefD, 4)} coefV=${round(coefV, 4)} signAgrees=${signAgrees}.`,
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Data: nflverse pbp + nfldata games.csv (CC BY 4.0); no DB.",
  ].join(" ");

  if (status === "BLOCKED") {
    writeYamlBlocked("ΔBrier not finite", runSha, runAt);
    return 2;
  }

  writeYamlResult({
    status,
    number: deltaBrier,
    ci,
    n: validate.length,
    mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A9] wrote ${YAML_PATH}`);
  console.log(
    `[A9] RESULT status=${status} number=${round(deltaBrier, 5)} ` +
      `ci=[${round(ci[0], 5)}, ${round(ci[1], 5)}] n=${validate.length}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A9] fatal:", err);
    process.exit(1);
  },
);
