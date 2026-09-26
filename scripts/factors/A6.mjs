#!/usr/bin/env node
/**
 * scripts/factors/A6.mjs — C-370 numerical runner for docs/factors/A6.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A6.yaml, W8):
 *   Out-of-sample R² margin of within-drive permutation-entropy features
 *   vs a pass_oe-only baseline for team-game offensive EPA/play.
 *
 *   PE (Bandt–Pompe, m=3) of the pass/run call sequence inside each offensive
 *   drive, averaged to the team-game. Baseline is mean pass_oe on that
 *   team-game's pass plays. Fit OLS on discover, score R² on validate.
 *   kill_line: validate-era R² margin vs pass_oe < 0.02 → DEAD.
 *
 * Data: free public nflverse pbp 2017–2024 (user-sliced; YAML names
 * discover 1999–2019 / validate 2020–2024 — this run uses discover
 * 2017–2019 / validate 2020–2024 because that is the fetched window).
 * Projected columns cached under packages/verifier/data/ (untracked).
 * No credential, no DB.
 *
 * On success writes number / ci / n / mde_80pct_power / run_sha / run_at /
 * status (CANDIDATE|DEAD) back into docs/factors/A6.yaml. Never UNTESTED.
 *
 * Usage:
 *   node scripts/factors/A6.mjs
 *   node scripts/factors/A6.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A6.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const PE_M = 3;
const Z_95 = 1.959963984540054;
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;
const BOOTSTRAP_RESAMPLES = 1000;
const BOOTSTRAP_SEED = 20260915;

const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const PBP_URL = (s) => `${BASE}/pbp/play_by_play_${s}.csv`;

const PBP_COLS = [
  "play_id",
  "game_id",
  "season",
  "week",
  "season_type",
  "home_team",
  "away_team",
  "posteam",
  "fixed_drive",
  "drive",
  "play_type",
  "down",
  "ydstogo",
  "yardline_100",
  "epa",
  "ep",
  "pass_oe",
  "success",
  "qb_dropback",
  "pass_attempt",
  "rush_attempt",
  "home_score",
  "away_score",
];

const noCache = process.argv.includes("--no-cache");

// ── CSV / fetch (mirrors A1.mjs) ────────────────────────────────────────────

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
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += c;
        i += 1;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }
      if (c === "\n") {
        i += 1;
        row.push(field);
        return row;
      }
      if (c === "\r") {
        i += 1;
        if (text[i] === "\n") i += 1;
        row.push(field);
        return row;
      }
      field += c;
      i += 1;
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
    if (!wanted || wanted.has(name)) {
      keep.push(c);
      keys.push(name);
    }
  }
  while (i < n) {
    const row = readRow();
    if (row.length === 1 && row[0] === "") continue;
    const rec = {};
    for (let k = 0; k < keep.length; k += 1) {
      rec[keys[k]] = row[keep[k]] ?? "";
    }
    records.push(rec);
  }
  return { header, records };
}

function decodeBody(buf) {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString("utf8");
  }
  return buf.toString("utf8");
}

async function fetchText(url, { timeoutMs = 300_000 } = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "gse-factor-foundry-A6/1.0 (research; nflverse CC-BY-4.0)" },
  });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeBody(buf);
}

function cachePath(name) {
  return path.join(DATA_DIR, name);
}

function loadCachedText(name) {
  const p = cachePath(name);
  if (!noCache && existsSync(p) && statSync(p).size > 0) {
    return readFileSync(p, "utf8");
  }
  return null;
}

function saveCachedText(name, text) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(cachePath(name), text, "utf8");
}

/** Projected pbp NDJSON cache shared by A6/A7/A9/A10. */
function projectedCacheName(season) {
  return `pbp_proj_${season}.jsonl`;
}

function loadProjectedSeason(season) {
  const name = projectedCacheName(season);
  const text = loadCachedText(name);
  if (text === null) return null;
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t));
  }
  return rows;
}

function saveProjectedSeason(season, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  writeFileSync(cachePath(projectedCacheName(season)), body, "utf8");
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
    home_score: toNumber(r.home_score),
    away_score: toNumber(r.away_score),
  };
}

async function loadPbpSeason(season) {
  const cached = loadProjectedSeason(season);
  if (cached !== null) {
    console.log(`[A6] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[A6] pbp ${season}: fetching ${url}`);
  const text = await fetchText(url);
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveProjectedSeason(season, rows);
  console.log(`[A6] pbp ${season}: projected ${rows.length} rows`);
  return rows;
}

// ── math ────────────────────────────────────────────────────────────────────

function mean(a) {
  if (a.length === 0) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function round(x, d = 4) {
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

/** OLS y ~ X (no intercept column in X; intercept prepended). */
function fitOls(X, y) {
  const n = y.length;
  const k = X[0].length + 1;
  const xtx = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty = new Array(k).fill(0);
  for (let i = 0; i < n; i += 1) {
    const xi = [1, ...X[i]];
    for (let a = 0; a < k; a += 1) {
      xty[a] += xi[a] * y[i];
      for (let b = 0; b < k; b += 1) xtx[a][b] += xi[a] * xi[b];
    }
  }
  // Gaussian elimination with partial pivot
  const A = xtx.map((row, i) => [...row, xty[i]]);
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
  return A.map((row) => row[k]);
}

function predictOls(beta, X) {
  return X.map((row) => {
    let s = beta[0];
    for (let j = 0; j < row.length; j += 1) s += beta[j + 1] * row[j];
    return s;
  });
}

/** Out-of-sample R²: 1 − SS_res/SS_tot using the validate mean of y. */
function r2Oos(yTrue, yPred) {
  const n = yTrue.length;
  if (n === 0) return NaN;
  const ybar = mean(yTrue);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    ssRes += (yTrue[i] - yPred[i]) ** 2;
    ssTot += (yTrue[i] - ybar) ** 2;
  }
  if (ssTot <= 0) return NaN;
  return 1 - ssRes / ssTot;
}

/** Bandt–Pompe permutation entropy of a 0/1 sequence, order m, delay 1. */
function permutationEntropy(symbols, m) {
  const n = symbols.length;
  if (n < m + 1) return null;
  const counts = new Map();
  const mFact = (() => {
    let f = 1;
    for (let i = 2; i <= m; i += 1) f *= i;
    return f;
  })();
  let total = 0;
  for (let i = 0; i + m <= n; i += 1) {
    const window = symbols.slice(i, i + m);
    // rank pattern: permutation of indices that sorts the window
    const idx = [0, 1, 2].slice(0, m).sort((a, b) => window[a] - window[b] || a - b);
    const key = idx.join("");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;
  let h = 0;
  for (const c of counts.values()) {
    const p = c / total;
    h -= p * Math.log(p);
  }
  return h / Math.log(mFact);
}

function isScrimmageCall(play) {
  const t = (play.play_type ?? "").toLowerCase();
  if (t === "pass" || t === "run") return true;
  // fallback when play_type is blank but attempt flags exist
  if (!t && (play.pass_attempt === 1 || play.rush_attempt === 1)) return true;
  return false;
}

function callSymbol(play) {
  const t = (play.play_type ?? "").toLowerCase();
  if (t === "pass") return 1;
  if (t === "run") return 0;
  if (play.pass_attempt === 1) return 1;
  if (play.rush_attempt === 1) return 0;
  return null;
}

function eraOf(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

/**
 * Team-game rows: PE of within-drive call sequences + pass_oe + EPA/play.
 */
function buildTeamGames(allPbp) {
  /** key `${game_id}|${posteam}` → plays sorted by play_id */
  const byTeamGame = new Map();
  for (const p of allPbp) {
    if ((p.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!p.posteam || !p.game_id) continue;
    const key = `${p.game_id}|${p.posteam}`;
    const list = byTeamGame.get(key) ?? [];
    list.push(p);
    byTeamGame.set(key, list);
  }

  const rows = [];
  let skippedShort = 0;
  let skippedNoY = 0;

  for (const [key, plays] of byTeamGame) {
    plays.sort((a, b) => (a.play_id ?? 0) - (b.play_id ?? 0));
    const season = plays[0].season;
    const era = eraOf(season);
    if (era === "other") continue;

    // group into drives
    const drives = new Map();
    for (const p of plays) {
      if (!isScrimmageCall(p)) continue;
      const d = p.drive ?? -1;
      const list = drives.get(d) ?? [];
      list.push(p);
      drives.set(d, list);
    }

    const peValues = [];
    const passOes = [];
    const epas = [];
    for (const drivePlays of drives.values()) {
      const symbols = [];
      for (const p of drivePlays) {
        const s = callSymbol(p);
        if (s === null) continue;
        symbols.push(s);
        if (p.pass_oe != null) passOes.push(p.pass_oe);
        if (p.epa != null) epas.push(p.epa);
      }
      if (symbols.length >= PE_M) {
        const pe = permutationEntropy(symbols, PE_M);
        if (pe != null) peValues.push(pe);
      }
    }

    if (peValues.length === 0) {
      skippedShort += 1;
      continue;
    }
    if (epas.length === 0) {
      skippedNoY += 1;
      continue;
    }

    const [game_id, posteam] = key.split("|");
    rows.push({
      game_id,
      posteam,
      season,
      week: plays[0].week,
      home_team: plays[0].home_team,
      away_team: plays[0].away_team,
      era,
      pe: mean(peValues),
      nDrives: peValues.length,
      passOe: passOes.length > 0 ? mean(passOes) : 0,
      epaPerPlay: mean(epas),
      nPlays: epas.length,
    });
  }

  return { rows, skippedShort, skippedNoY };
}

function scoreEra(rows, featureKeys) {
  const y = rows.map((r) => r.epaPerPlay);
  const X = rows.map((r) => featureKeys.map((k) => r[k]));
  return { y, X };
}

function r2OnEra(rows, featureKeys) {
  // Fit is done outside; this just prepares. For OOS we fit on discover only.
  return rows;
}

function bootstrapMargin(discover, validate, baseKeys, fullKeys) {
  const yD = discover.map((r) => r.epaPerPlay);
  const XbD = discover.map((r) => baseKeys.map((k) => r[k]));
  const XfD = discover.map((r) => fullKeys.map((k) => r[k]));
  const betaB = fitOls(XbD, yD);
  const betaF = fitOls(XfD, yD);
  if (!betaB || !betaF) {
    return { margin: NaN, ci: [NaN, NaN], mde: NaN, r2Base: NaN, r2Full: NaN };
  }
  const yV = validate.map((r) => r.epaPerPlay);
  const XbV = validate.map((r) => baseKeys.map((k) => r[k]));
  const XfV = validate.map((r) => fullKeys.map((k) => r[k]));
  const r2Base = r2Oos(yV, predictOls(betaB, XbV));
  const r2Full = r2Oos(yV, predictOls(betaF, XfV));
  const margin = r2Full - r2Base;

  // Bootstrap team-games for the R²-margin CI
  const rand = mulberry32(BOOTSTRAP_SEED);
  const n = validate.length;
  const margins = [];
  for (let b = 0; b < BOOTSTRAP_RESAMPLES; b += 1) {
    const idx = [];
    for (let i = 0; i < n; i += 1) idx.push(Math.floor(rand() * n));
    const yB = idx.map((i) => yV[i]);
    const Xb = idx.map((i) => XbV[i]);
    const Xf = idx.map((i) => XfV[i]);
    const rb = r2Oos(yB, predictOls(betaB, Xb));
    const rf = r2Oos(yB, predictOls(betaF, Xf));
    if (Number.isFinite(rb) && Number.isFinite(rf)) margins.push(rf - rb);
  }
  margins.sort((a, b) => a - b);
  const q = (p) => {
    if (margins.length === 0) return NaN;
    const i = Math.min(margins.length - 1, Math.max(0, Math.floor(p * (margins.length - 1))));
    return margins[i];
  };
  const ci = [q(0.025), q(0.975)];
  // MDE via bootstrap SE of the margin
  const m = mean(margins);
  let ss = 0;
  for (const v of margins) ss += (v - m) ** 2;
  const se = margins.length > 1 ? Math.sqrt(ss / (margins.length - 1)) : NaN;
  const mde = Number.isFinite(se) ? Z_SUM_80PCT * se : NaN;
  return { margin, ci, mde, r2Base, r2Full };
}

// ── YAML write-back (mirrors A1.mjs) ────────────────────────────────────────

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
    if (/^status:/.test(line)) {
      out.push(`status: ${status}`);
      continue;
    }
    if (/^number:/.test(line)) {
      out.push(`number: ${number === null ? "null" : round(number, 4)}`);
      continue;
    }
    if (/^ci:/.test(line)) {
      out.push(ci === null ? "ci: null" : `ci: [${round(ci[0], 4)}, ${round(ci[1], 4)}]`);
      continue;
    }
    if (/^n:/.test(line)) {
      out.push(`n: ${n === null ? "null" : n}`);
      continue;
    }
    if (/^mde_80pct_power:/.test(line)) {
      out.push(`mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 4)}`);
      continue;
    }
    if (/^run_sha:/.test(line)) {
      out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`);
      continue;
    }
    if (/^run_at:/.test(line)) {
      out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`);
      continue;
    }
    if (/^blocked_on:/.test(line)) {
      out.push(`blocked_on: null`);
      continue;
    }
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
    if (/^status:/.test(line)) {
      out.push("status: BLOCKED");
      continue;
    }
    if (/^blocked_on:/.test(line)) {
      out.push(`blocked_on: ${yamlQuote(blockedOn)}`);
      continue;
    }
    if (/^run_sha:/.test(line)) {
      out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`);
      continue;
    }
    if (/^run_at:/.test(line)) {
      out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`);
      continue;
    }
    out.push(line);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A6] run_at=${runAt} run_sha=${runSha}`);
  console.log(`[A6] data dir: ${DATA_DIR}`);

  let allPbp = [];
  try {
    for (const season of SEASONS) {
      const rows = await loadPbpSeason(season);
      allPbp = allPbp.concat(rows);
    }
    console.log(`[A6] total projected pbp rows=${allPbp.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A6] BLOCKED — pbp unreachable: ${msg}`);
    writeYamlBlocked(`nflverse pbp unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  if (allPbp.length === 0) {
    console.error("[A6] BLOCKED — zero pbp rows");
    writeYamlBlocked("zero nflverse pbp rows after projection", runSha, runAt);
    return 2;
  }

  const { rows, skippedShort, skippedNoY } = buildTeamGames(allPbp);
  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(
    `[A6] team-games: discover=${discover.length} validate=${validate.length} ` +
      `(skipped shortDrives=${skippedShort} noEPA=${skippedNoY})`,
  );

  if (discover.length < 30 || validate.length < 30) {
    console.error("[A6] BLOCKED — insufficient team-games after PE join");
    writeYamlBlocked(
      `insufficient team-games (discover=${discover.length} validate=${validate.length})`,
      runSha,
      runAt,
    );
    return 2;
  }

  const disc = bootstrapMargin(discover, validate, ["passOe"], ["passOe", "pe"]);
  // also PE-only for diagnostics
  const peOnly = bootstrapMargin(discover, validate, ["passOe"], ["passOe", "pe"]);

  console.log(
    `[A6] R2 base(pass_oe)=${round(disc.r2Base, 4)} full(pass_oe+pe)=${round(disc.r2Full, 4)} ` +
      `margin=${round(disc.margin, 4)} CI[${round(disc.ci[0], 4)}, ${round(disc.ci[1], 4)}]`,
  );
  console.log(`[A6] discover mean PE=${round(mean(discover.map((r) => r.pe)), 4)} validate=${round(mean(validate.map((r) => r.pe)), 4)}`);

  if (!Number.isFinite(disc.margin)) {
    console.error("[A6] BLOCKED — R² margin not finite");
    writeYamlBlocked("R² margin not finite (singular design or zero outcome variance)", runSha, runAt);
    return 2;
  }

  // kill_line: validate-era R² margin vs pass_oe < 0.02 → DEAD
  const status = disc.margin < 0.02 ? "DEAD" : "CANDIDATE";
  console.log(`[A6] kill_line check → status=${status}`);

  const notes = [
    "W8. Never run before this row. pbp 2017–2024 fetched like edge-lab loaders.",
    "PE = Bandt–Pompe order-3 of pass/run calls within each offensive drive,",
    "mean across drives with length >= 3. Baseline = mean pass_oe on the team-game.",
    "Outcome = offensive EPA/play. OLS fit on discover, OOS R² on validate.",
    "kill_line: R² margin vs pass_oe < 0.02. C-370.",
    `C-370 run ${runAt.slice(0, 10)}: REG team-games 2017–2024.`,
    `Discover ${DISCOVER_MIN}-${DISCOVER_MAX} n=${discover.length}; ` +
      `Validate ${VALIDATE_MIN}-${VALIDATE_MAX} n=${validate.length}.`,
    `R2 base=${round(disc.r2Base, 4)} full=${round(disc.r2Full, 4)} ` +
      `margin=${round(disc.margin, 4)} CI[${round(disc.ci[0], 4)},${round(disc.ci[1], 4)}] ` +
      `MDE80=${round(disc.mde, 4)}.`,
    `Mean PE discover=${round(mean(discover.map((r) => r.pe)), 4)} validate=${round(mean(validate.map((r) => r.pe)), 4)}.`,
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Data: nflverse pbp (CC BY 4.0), projected cache under packages/verifier/data/; no DB.",
  ].join(" ");

  writeYamlResult({
    status,
    number: disc.margin,
    ci: disc.ci,
    n: validate.length,
    mde: disc.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A6] wrote ${YAML_PATH}`);
  console.log(
    `[A6] RESULT status=${status} number=${round(disc.margin, 4)} ci=[${round(disc.ci[0], 4)}, ${round(disc.ci[1], 4)}] n=${validate.length}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A6] fatal:", err);
    process.exit(1);
  },
);
