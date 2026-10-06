#!/usr/bin/env node
/**
 * scripts/factors/A10.mjs — C-374 numerical runner for docs/factors/A10.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A10.yaml, W5):
 *   Out-of-sample ΔBrier of a Wasserstein-barycenter-distance feature added
 *   to the market logit for REG home-win.
 *
 *   Each team-game's offensive scrimmage plays are histogrammed on a 1-D
 *   ordered support of (down-bucket × call) codes — NOT field position, so
 *   this is not W2-in-disguise. The league barycenter is the mean histogram
 *   over the discover era. Factor = W2(home_dist, barycenter) −
 *   W2(away_dist, barycenter), using only PRIOR team-games this season.
 *
 *   1-D W2² between histograms on unit-spaced bins: Σ |CDF_p − CDF_q|.
 *
 *   kill_line: validate-era ΔBrier >= 0 or P(better) < 0.75 → DEAD.
 *
 * Data: nflverse pbp 2017–2024 (A6 projected cache) + nfldata games.csv.
 *
 * Usage:
 *   node scripts/factors/A10.mjs
 *   node scripts/factors/A10.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A10.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const MIN_PRIOR_GAMES = 4;
const MIN_PRIOR_PLAYS = 80;
/** Ordered support: down 1–4 × pass/run = 8 bins (NOT field position). */
const N_BINS = 8;
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
    headers: { "user-agent": "gse-factor-foundry-A10/1.0 (research; nflverse CC-BY-4.0)" },
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
    console.log(`[A10] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[A10] pbp ${season}: fetching ${url}`);
  const text = await fetchText(url);
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveProjectedSeason(season, rows);
  console.log(`[A10] pbp ${season}: projected ${rows.length} rows`);
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

function impliedFromAmerican(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return -a / (-a + 100);
}

function marketFairHome(homeMl, awayMl) {
  const ih = impliedFromAmerican(homeMl);
  const ia = impliedFromAmerican(awayMl);
  if (ih == null || ia == null) return null;
  const s = ih + ia;
  if (!(s > 0)) return null;
  const p = ih / s;
  return p > 0 && p < 1 ? p : null;
}

/** Normalize a count vector to a probability histogram. */
function normalizeHist(counts) {
  const s = counts.reduce((a, b) => a + b, 0);
  if (!(s > 0)) return null;
  return counts.map((c) => c / s);
}

/**
 * 1-D W2² between two probability histograms on unit-spaced bins.
 * W2² = Σ_k |CDF_p(k) − CDF_q(k)|  (earth-mover on the unit grid).
 */
function w2sq(p, q) {
  if (!p || !q || p.length !== q.length) return null;
  let cp = 0;
  let cq = 0;
  let s = 0;
  for (let k = 0; k < p.length - 1; k += 1) {
    cp += p[k];
    cq += q[k];
    s += Math.abs(cp - cq);
  }
  return s;
}

function w2(p, q) {
  const v = w2sq(p, q);
  return v == null ? null : Math.sqrt(v);
}

/** Map a play to an ordered (down × call) bin, or null. */
function playBin(play) {
  const down = play.down;
  if (down == null || down < 1 || down > 4) return null;
  const t = (play.play_type ?? "").toLowerCase();
  let isPass = null;
  if (t === "pass") isPass = 1;
  else if (t === "run") isPass = 0;
  else if (play.pass_attempt === 1) isPass = 1;
  else if (play.rush_attempt === 1) isPass = 0;
  if (isPass === null) return null;
  // bins: down1-run, down1-pass, down2-run, down2-pass, ...
  return (down - 1) * 2 + isPass;
}

function eraOf(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

/**
 * Team-game histograms + season-to-date prior-only pooled histogram.
 */
function buildTeamGameHists(allPbp) {
  const byTeamGame = new Map();
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!p.posteam || !p.game_id || p.season == null) continue;
    const key = `${p.game_id}|${p.posteam}`;
    let entry = byTeamGame.get(key);
    if (!entry) {
      entry = { season: p.season, week: p.week, team: p.posteam, game_id: p.game_id, counts: new Array(N_BINS).fill(0), n: 0 };
      byTeamGame.set(key, entry);
    }
    const bin = playBin(p);
    if (bin == null) continue;
    entry.counts[bin] += 1;
    entry.n += 1;
  }

  // group by team|season, ordered by week → season-to-date prior hist
  const byTeamSeason = new Map();
  for (const [key, entry] of byTeamGame) {
    if (entry.n < 10) continue;
    const tsKey = `${entry.team}|${entry.season}`;
    const list = byTeamSeason.get(tsKey) ?? [];
    list.push({ key, ...entry });
    byTeamSeason.set(tsKey, list);
  }

  /** `${game_id}|${team}` → { hist, nPlays, priorGames } */
  const priorByTeamGame = new Map();
  for (const [, list] of byTeamSeason) {
    list.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
    const acc = new Array(N_BINS).fill(0);
    let accN = 0;
    let priorGames = 0;
    for (const g of list) {
      if (priorGames >= MIN_PRIOR_GAMES && accN >= MIN_PRIOR_PLAYS) {
        const hist = normalizeHist(acc);
        if (hist) priorByTeamGame.set(g.key, { hist, nPlays: accN, priorGames });
      }
      for (let b = 0; b < N_BINS; b += 1) acc[b] += g.counts[b];
      accN += g.n;
      priorGames += 1;
    }
  }
  return priorByTeamGame;
}

/** Discover-era league barycenter = mean of team-game histograms. */
function leagueBarycenter(allPbp) {
  const sums = new Array(N_BINS).fill(0);
  let n = 0;
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (p.season == null || eraOf(p.season) !== "discover") continue;
    const bin = playBin(p);
    if (bin == null) continue;
    sums[bin] += 1;
    n += 1;
  }
  if (n === 0) return null;
  return normalizeHist(sums);
}

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
  console.log(`[A10] run_at=${runAt} run_sha=${runSha}`);

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
    console.log(`[A10] games.csv rows=${gamesRecords.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const bary = leagueBarycenter(allPbp);
  if (!bary) {
    writeYamlBlocked("empty discover-era play-call histogram", runSha, runAt);
    return 2;
  }
  console.log(`[A10] league barycenter (discover) = [${bary.map((v) => round(v, 3)).join(", ")}]`);

  const priorByTeamGame = buildTeamGameHists(allPbp);
  console.log(`[A10] team-games with prior-only hist: ${priorByTeamGame.size}`);

  const aliases = { OAK: "LV", SD: "LAC", STL: "LA", JAC: "JAX" };

  const rows = [];
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const era = eraOf(season);
    if (era === "other") continue;
    const home = g.home_team;
    const away = g.away_team;
    if (!home || !away) continue;
    const week = String(g.week).padStart(2, "0");
    const gid = `${season}_${week}_${away}_${home}`;
    const findHist = (team) => {
      const cands = [team];
      for (const [from, to] of Object.entries(aliases)) {
        if (team === from) cands.push(to);
        if (team === to) cands.push(from);
      }
      for (const t of cands) {
        const hit = priorByTeamGame.get(`${gid}|${t}`);
        if (hit) return hit;
      }
      return null;
    };
    const hHome = findHist(home);
    const hAway = findHist(away);
    if (!hHome || !hAway) continue;
    const dHome = w2(hHome.hist, bary);
    const dAway = w2(hAway.hist, bary);
    if (dHome == null || dAway == null) continue;
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
      factor: dHome - dAway,
      outcome,
      home,
      away,
    });
  }

  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(`[A10] game rows with market+W2: discover=${discover.length} validate=${validate.length}`);
  console.log(
    `[A10] mean factor D=${round(mean(discover.map((r) => r.factor)), 4)} ` +
      `V=${round(mean(validate.map((r) => r.factor)), 4)}`,
  );

  if (discover.length < 30 || validate.length < 30) {
    writeYamlBlocked(
      `insufficient market+W2 game rows (discover=${discover.length} validate=${validate.length})`,
      runSha, runAt,
    );
    return 2;
  }

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
  const Z_95 = 1.959963984540054;
  const ci = [dMean - Z_95 * se, dMean + Z_95 * se];
  const mde = Z_SUM_80PCT * se;

  const coefD = betaFull[2];
  const betaFullV = fitLogistic(XvFull, yv);
  const coefV = betaFullV ? betaFullV[2] : NaN;
  const signAgrees = Number.isFinite(coefD) && Number.isFinite(coefV) && Math.sign(coefD) === Math.sign(coefV) && coefD !== 0;

  console.log(`[A10] Brier market-only=${round(bBase, 5)} with-factor=${round(bFull, 5)}`);
  console.log(
    `[A10] ΔBrier=${round(deltaBrier, 5)} P(better)=${round(boot.pBetter, 3)} ` +
      `coefD=${round(coefD, 4)} coefV=${round(coefV, 4)} signAgrees=${signAgrees}`,
  );
  console.log(`[A10] CI[${round(ci[0], 5)}, ${round(ci[1], 5)}] MDE80=${round(mde, 5)}`);

  let status;
  if (!Number.isFinite(deltaBrier)) status = "BLOCKED";
  else if (deltaBrier >= 0 || boot.pBetter < 0.75 || !signAgrees) status = "DEAD";
  else status = "CANDIDATE";
  console.log(`[A10] kill_line check → status=${status}`);

  const notes = [
    "W5. Low prior (W2 was field position in disguise). This run bins",
    "(down 1-4 × pass/run) only — no field-position channel — so the W2",
    "distance is not a yardline_100 proxy by construction. Barycenter =",
    "discover-era mean histogram. Factor = W2(home,bary) − W2(away,bary),",
    "season-to-date prior games only (min 4 games, 80 plays). C-374.",
    `C-374 run ${runAt.slice(0, 10)}: REG home-win, nBins=${N_BINS}.`,
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
  console.log(`[A10] wrote ${YAML_PATH}`);
  console.log(
    `[A10] RESULT status=${status} number=${round(deltaBrier, 5)} ` +
      `ci=[${round(ci[0], 5)}, ${round(ci[1], 5)}] n=${validate.length}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A10] fatal:", err);
    process.exit(1);
  },
);
