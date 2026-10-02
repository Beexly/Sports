#!/usr/bin/env node
/**
 * scripts/factors/A7.mjs — C-371 numerical runner for docs/factors/A7.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A7.yaml, W7):
 *   Out-of-sample R² margin of an intrinsic-dimension feature of the
 *   play-call manifold vs a distinct-play-type-count baseline for
 *   team-game offensive EPA/play.
 *
 *   Each team-game's offensive scrimmage plays are points in
 *   R^3 = [down, ydstogo, yardline_100] (standardized). Intrinsic dimension
 *   is the covariance participation ratio (sum λ)² / sum λ².
 *   Baseline = count of distinct play_type labels on that team-game.
 *   kill_line: validate-era R² margin vs distinct-play-type count < 0.02.
 *
 * Data: nflverse pbp 2017–2024, projected cache from A6 (rebuilds if missing).
 *
 * Usage:
 *   node scripts/factors/A7.mjs
 *   node scripts/factors/A7.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A7.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MIN = 2017;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2024;
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;
const BOOTSTRAP_RESAMPLES = 1000;
const BOOTSTRAP_SEED = 20260915;

const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const PBP_URL = (s) => `${BASE}/pbp/play_by_play_${s}.csv`;

const PBP_COLS = [
  "play_id", "game_id", "season", "week", "season_type", "home_team", "away_team",
  "posteam", "fixed_drive", "drive", "play_type", "down", "ydstogo", "yardline_100",
  "epa", "ep", "pass_oe", "success", "qb_dropback", "pass_attempt", "rush_attempt",
  "home_score", "away_score",
];

const noCache = process.argv.includes("--no-cache");

// ── CSV / fetch / cache (mirrors A6) ────────────────────────────────────────

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
    headers: { "user-agent": "gse-factor-foundry-A7/1.0 (research; nflverse CC-BY-4.0)" },
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
    home_score: toNumber(r.home_score),
    away_score: toNumber(r.away_score),
  };
}

async function loadPbpSeason(season) {
  const cached = loadProjectedSeason(season);
  if (cached !== null) {
    console.log(`[A7] pbp ${season}: cache (${cached.length} projected rows)`);
    return cached;
  }
  const url = PBP_URL(season);
  console.log(`[A7] pbp ${season}: fetching ${url}`);
  const text = await fetchText(url);
  const { records } = parseCsv(text, PBP_COLS);
  const rows = records.map(projectPbpRow).filter((r) => r.game_id && r.posteam);
  saveProjectedSeason(season, rows);
  console.log(`[A7] pbp ${season}: projected ${rows.length} rows`);
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

/** Eigenvalues of a small symmetric matrix via Jacobi rotations. */
function jacobiEigenvalues(Ain, sweeps = 50) {
  const n = Ain.length;
  const A = Ain.map((row) => row.slice());
  for (let s = 0; s < sweeps; s += 1) {
    let off = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) off += A[i][j] * A[i][j];
    }
    if (off < 1e-14) break;
    for (let p = 0; p < n - 1; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const sn = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - sn * akq;
          A[k][q] = sn * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - sn * aqk;
          A[q][k] = sn * apk + c * aqk;
        }
      }
    }
  }
  return A.map((row, i) => row[i]);
}

/**
 * Participation-ratio intrinsic dimension of standardized feature rows.
 * ID = (Σλ)² / Σλ² of the covariance eigenvalues.
 */
function intrinsicDimension(featureRows) {
  const n = featureRows.length;
  const d = featureRows[0].length;
  if (n < d + 2) return null;
  const mu = new Array(d).fill(0);
  for (const row of featureRows) {
    for (let j = 0; j < d; j += 1) mu[j] += row[j];
  }
  for (let j = 0; j < d; j += 1) mu[j] /= n;
  const sd = new Array(d).fill(0);
  for (const row of featureRows) {
    for (let j = 0; j < d; j += 1) sd[j] += (row[j] - mu[j]) ** 2;
  }
  for (let j = 0; j < d; j += 1) {
    sd[j] = Math.sqrt(sd[j] / n);
    if (!(sd[j] > 1e-12)) return null;
  }
  const C = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const row of featureRows) {
    const z = [];
    for (let j = 0; j < d; j += 1) z.push((row[j] - mu[j]) / sd[j]);
    for (let a = 0; a < d; a += 1) {
      for (let b = 0; b < d; b += 1) C[a][b] += z[a] * z[b];
    }
  }
  for (let a = 0; a < d; a += 1) {
    for (let b = 0; b < d; b += 1) C[a][b] /= n;
  }
  const eig = jacobiEigenvalues(C).map((v) => Math.max(0, v));
  const sum = eig.reduce((s, v) => s + v, 0);
  const sumSq = eig.reduce((s, v) => s + v * v, 0);
  if (!(sumSq > 1e-15)) return null;
  return (sum * sum) / sumSq;
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

function buildTeamGames(allPbp) {
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
  let skipped = 0;
  for (const [key, plays] of byTeamGame) {
    plays.sort((a, b) => (a.play_id ?? 0) - (b.play_id ?? 0));
    const season = plays[0].season;
    const era = eraOf(season);
    if (era === "other") continue;

    const features = [];
    const types = new Set();
    const epas = [];
    for (const p of plays) {
      if (!isScrimmage(p)) continue;
      if (p.down == null || p.ydstogo == null || p.yardline_100 == null) continue;
      features.push([p.down, p.ydstogo, p.yardline_100]);
      types.add((p.play_type ?? "").toLowerCase() || (p.pass_attempt ? "pass" : "run"));
      if (p.epa != null) epas.push(p.epa);
    }
    if (features.length < 12 || epas.length === 0) {
      skipped += 1;
      continue;
    }
    const id = intrinsicDimension(features);
    if (id == null) {
      skipped += 1;
      continue;
    }
    const [game_id, posteam] = key.split("|");
    rows.push({
      game_id,
      posteam,
      season,
      week: plays[0].week,
      era,
      id,
      nDistinctTypes: types.size,
      epaPerPlay: mean(epas),
      nPlays: features.length,
    });
  }
  return { rows, skipped };
}

function bootstrapMargin(discover, validate, baseKeys, fullKeys) {
  const yD = discover.map((r) => r.epaPerPlay);
  const XbD = discover.map((r) => baseKeys.map((k) => r[k]));
  const XfD = discover.map((r) => fullKeys.map((k) => r[k]));
  const betaB = fitOls(XbD, yD);
  const betaF = fitOls(XfD, yD);
  if (!betaB || !betaF) return { margin: NaN, ci: [NaN, NaN], mde: NaN, r2Base: NaN, r2Full: NaN };
  const yV = validate.map((r) => r.epaPerPlay);
  const XbV = validate.map((r) => baseKeys.map((k) => r[k]));
  const XfV = validate.map((r) => fullKeys.map((k) => r[k]));
  const r2Base = r2Oos(yV, predictOls(betaB, XbV));
  const r2Full = r2Oos(yV, predictOls(betaF, XfV));
  const margin = r2Full - r2Base;
  const rand = mulberry32(BOOTSTRAP_SEED);
  const n = validate.length;
  const margins = [];
  for (let b = 0; b < BOOTSTRAP_RESAMPLES; b += 1) {
    const idx = [];
    for (let i = 0; i < n; i += 1) idx.push(Math.floor(rand() * n));
    const yB = idx.map((i) => yV[i]);
    const rb = r2Oos(yB, predictOls(betaB, idx.map((i) => XbV[i])));
    const rf = r2Oos(yB, predictOls(betaF, idx.map((i) => XfV[i])));
    if (Number.isFinite(rb) && Number.isFinite(rf)) margins.push(rf - rb);
  }
  margins.sort((a, b) => a - b);
  const q = (p) => (margins.length === 0 ? NaN : margins[Math.min(margins.length - 1, Math.max(0, Math.floor(p * (margins.length - 1))))]);
  const ci = [q(0.025), q(0.975)];
  const m = mean(margins);
  let ss = 0;
  for (const v of margins) ss += (v - m) ** 2;
  const se = margins.length > 1 ? Math.sqrt(ss / (margins.length - 1)) : NaN;
  return { margin, ci, mde: Number.isFinite(se) ? Z_SUM_80PCT * se : NaN, r2Base, r2Full };
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
    if (/^number:/.test(line)) { out.push(`number: ${number === null ? "null" : round(number, 4)}`); continue; }
    if (/^ci:/.test(line)) {
      out.push(ci === null ? "ci: null" : `ci: [${round(ci[0], 4)}, ${round(ci[1], 4)}]`);
      continue;
    }
    if (/^n:/.test(line)) { out.push(`n: ${n === null ? "null" : n}`); continue; }
    if (/^mde_80pct_power:/.test(line)) {
      out.push(`mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 4)}`);
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
  console.log(`[A7] run_at=${runAt} run_sha=${runSha}`);

  let allPbp = [];
  try {
    for (const season of SEASONS) {
      allPbp = allPbp.concat(await loadPbpSeason(season));
    }
    console.log(`[A7] total projected pbp rows=${allPbp.length}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A7] BLOCKED — pbp unreachable: ${msg}`);
    writeYamlBlocked(`nflverse pbp unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  if (allPbp.length === 0) {
    writeYamlBlocked("zero nflverse pbp rows after projection", runSha, runAt);
    return 2;
  }

  const { rows, skipped } = buildTeamGames(allPbp);
  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(`[A7] team-games: discover=${discover.length} validate=${validate.length} skipped=${skipped}`);
  console.log(
    `[A7] mean ID discover=${round(mean(discover.map((r) => r.id)), 4)} ` +
      `validate=${round(mean(validate.map((r) => r.id)), 4)}; ` +
      `mean distinct types D=${round(mean(discover.map((r) => r.nDistinctTypes)), 3)} ` +
      `V=${round(mean(validate.map((r) => r.nDistinctTypes)), 3)}`,
  );

  if (discover.length < 30 || validate.length < 30) {
    writeYamlBlocked(
      `insufficient team-games (discover=${discover.length} validate=${validate.length})`,
      runSha, runAt,
    );
    return 2;
  }

  const disc = bootstrapMargin(discover, validate, ["nDistinctTypes"], ["nDistinctTypes", "id"]);
  console.log(
    `[A7] R2 base(nDistinctTypes)=${round(disc.r2Base, 4)} full(+id)=${round(disc.r2Full, 4)} ` +
      `margin=${round(disc.margin, 4)} CI[${round(disc.ci[0], 4)}, ${round(disc.ci[1], 4)}]`,
  );

  if (!Number.isFinite(disc.margin)) {
    writeYamlBlocked("R² margin not finite (singular design or zero outcome variance)", runSha, runAt);
    return 2;
  }

  // kill_line: R² margin vs distinct-play-type count < 0.02 → DEAD
  const status = disc.margin < 0.02 ? "DEAD" : "CANDIDATE";
  console.log(`[A7] kill_line check → status=${status}`);

  const notes = [
    "W7. Never run before this row. Intrinsic dimension = covariance participation",
    "ratio of standardized [down, ydstogo, yardline_100] on each team-game's",
    "scrimmage plays. Baseline = distinct play_type count. Outcome = EPA/play.",
    "kill_line: R² margin vs distinct-play-type count < 0.02. C-371.",
    `C-371 run ${runAt.slice(0, 10)}: REG team-games 2017–2024.`,
    `Discover n=${discover.length}; Validate n=${validate.length}.`,
    `R2 base=${round(disc.r2Base, 4)} full=${round(disc.r2Full, 4)} ` +
      `margin=${round(disc.margin, 4)} CI[${round(disc.ci[0], 4)},${round(disc.ci[1], 4)}] ` +
      `MDE80=${round(disc.mde, 4)}.`,
    `Mean ID D=${round(mean(discover.map((r) => r.id)), 4)} V=${round(mean(validate.map((r) => r.id)), 4)}.`,
    "YAML lists discover 1999-2019; this run uses the user-sliced 2017-2024 window.",
    "Data: nflverse pbp (CC BY 4.0), projected cache; no DB.",
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
  console.log(`[A7] wrote ${YAML_PATH}`);
  console.log(
    `[A7] RESULT status=${status} number=${round(disc.margin, 4)} ` +
      `ci=[${round(disc.ci[0], 4)}, ${round(disc.ci[1], 4)}] n=${validate.length}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A7] fatal:", err);
    process.exit(1);
  },
);
