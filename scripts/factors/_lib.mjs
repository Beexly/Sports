/**
 * scripts/factors/_lib.mjs — shared I/O + stats for A17–A22 runners.
 *
 * Mirrors the conventions already established in A1.mjs / A6.mjs:
 * free public nflverse releases, local cache under packages/verifier/data/,
 * no credential, no database write, honest BLOCKED on unreachable sources.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

export const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
export const DISCOVER_MIN = 2017;
export const DISCOVER_MAX = 2019;
export const VALIDATE_MIN = 2020;
export const VALIDATE_MAX = 2024;

export const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
export const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

export const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
export const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
export const STATS_COMBINED_URL = `${BASE}/player_stats/player_stats.csv.gz`;
export const STATS_SEASON_URL = (s) => `${BASE}/stats_player/stats_player_week_${s}.csv`;
export const SNAP_COUNTS_URL = (s) => `${BASE}/snap_counts/snap_counts_${s}.csv`;
export const INJURIES_URL = (s) => `${BASE}/injuries/injuries_${s}.csv`;
export const PBP_URL = (s) => `${BASE}/pbp/play_by_play_${s}.csv`;
export const ROSTER_WEEKLY_URL = (s) => `${BASE}/weekly_rosters/roster_weekly_${s}.csv`;
export const OFFICIALS_URL = `${BASE}/officials/officials.csv`;
export const DRAFT_PICKS_URL = `${BASE}/draft_picks/draft_picks.csv`;

export function eraOf(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

export function mean(a) {
  if (a.length === 0) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

export function round(x, d = 4) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

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

async function fetchText(url, { timeoutMs = 300_000, tag = "factor" } = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": `gse-factor-foundry-${tag}/1.0 (research; nflverse CC-BY-4.0)` },
  });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeBody(buf);
}

export function cachePath(name) {
  return path.join(DATA_DIR, name);
}

function loadCachedText(name, noCache) {
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

export async function loadText(name, url, { noCache = false, tag = "factor" } = {}) {
  const hit = loadCachedText(name, noCache);
  if (hit !== null) return { text: hit, url, cached: true };
  const text = await fetchText(url, { tag });
  saveCachedText(name, text);
  return { text, url, cached: false };
}

export function loadJsonlCache(name, noCache) {
  const text = loadCachedText(name, noCache);
  if (text === null) return null;
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t));
  }
  return rows;
}

export function saveJsonlCache(name, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  writeFileSync(cachePath(name), body, "utf8");
}

// ── stats ───────────────────────────────────────────────────────────────────

/** CR1 cluster-robust mean of `values` clustered on `clusters`. */
export function clusterRobustMean(values, clusters) {
  const n = values.length;
  if (n === 0) return { theta: NaN, se: NaN, G: 0, n: 0 };
  let sum = 0;
  for (const v of values) sum += v;
  const theta = sum / n;
  const clusterSums = new Map();
  for (let i = 0; i < n; i += 1) {
    const c = clusters[i];
    clusterSums.set(c, (clusterSums.get(c) ?? 0) + (values[i] - theta));
  }
  const G = clusterSums.size;
  let meat = 0;
  for (const s of clusterSums.values()) meat += s * s;
  const finite = G > 1 ? G / (G - 1) : 1;
  const se = Math.sqrt((finite * meat) / (n * n));
  return { theta, se, G, n };
}

/** OLS y ~ 1 + x; returns { slope, intercept, seSlope, n } or null. */
export function olsSlope(x, y, clusters) {
  const n = y.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += x[i];
    sy += y[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - mx;
    sxx += dx * dx;
    sxy += dx * (y[i] - my);
  }
  if (sxx <= 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const resid = new Array(n);
  for (let i = 0; i < n; i += 1) resid[i] = y[i] - (intercept + slope * x[i]);
  // CR1 by cluster on the slope score (x-centered residual)
  const clusterSums = new Map();
  for (let i = 0; i < n; i += 1) {
    const c = clusters[i];
    clusterSums.set(c, (clusterSums.get(c) ?? 0) + (x[i] - mx) * resid[i]);
  }
  const G = clusterSums.size;
  let meat = 0;
  for (const s of clusterSums.values()) meat += s * s;
  const finite = G > 1 ? G / (G - 1) : 1;
  const varSlope = (finite * meat) / (sxx * sxx);
  const seSlope = Math.sqrt(Math.max(varSlope, 0));
  return { slope, intercept, seSlope, n, G };
}

export function decidePositiveEffect({ theta, ci, n, minN = 300 }) {
  const includesZero = Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && ci[0] <= 0 && ci[1] >= 0;
  if (!Number.isFinite(theta) || n <= 0) return "BLOCKED";
  if (theta <= 0) return "DEAD";
  if (includesZero && n >= minN) return "DEAD";
  return "CANDIDATE";
}

/** WR/TE+RB receive-market skill positions for target-share work. */
export const SKILL = new Set(["WR", "TE"]);

// ── YAML write-back ─────────────────────────────────────────────────────────

export function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function writeYamlResult(yamlPath, { status, number, ci, n, mde, runSha, runAt, notes }) {
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
      out.push(
        `mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 4)}`,
      );
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
  writeFileSync(yamlPath, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

export function writeYamlBlocked(yamlPath, blockedOn, runSha, runAt) {
  const existing = readFileSync(yamlPath, "utf8");
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
  writeFileSync(yamlPath, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

export function headSha() {
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

/**
 * Load player_stats: combined asset first, then per-season backfill for any
 * season the combined file does not carry (it currently lags ~2017+).
 */
export async function loadPlayerStats({ noCache = false, tag = "factor", cols }) {
  let records = [];
  const combined = await loadText("player_stats_combined.csv.gz", STATS_COMBINED_URL, { noCache, tag });
  records = parseCsv(combined.text, cols).records;
  let maxSeason = 0;
  for (const r of records) {
    const s = Number(r.season);
    if (Number.isFinite(s) && s > maxSeason) maxSeason = s;
  }
  for (const season of SEASONS) {
    if (season <= maxSeason) continue;
    const name = `stats_player_week_${season}.csv`;
    try {
      const extra = await loadText(name, STATS_SEASON_URL(season), { noCache, tag });
      const rows = parseCsv(extra.text, cols).records;
      records = records.concat(rows);
      console.log(`[${tag}] player_stats backfill ${season}: +${rows.length}`);
    } catch (e) {
      console.warn(`[${tag}] per-season stats ${season} unavailable: ${e instanceof Error ? e.message : e}`);
    }
  }
  // Keep only the analysis window.
  const windowed = records.filter((r) => {
    const s = Number(r.season);
    return Number.isFinite(s) && s >= DISCOVER_MIN && s <= VALIDATE_MAX;
  });
  return { records: windowed, combinedCached: combined.cached, maxSeasonCombined: maxSeason };
}

export async function loadGames({ noCache = false, tag = "factor", cols }) {
  const loaded = await loadText("games_nfldata.csv", GAMES_URL, { noCache, tag });
  return { records: parseCsv(loaded.text, cols).records, cached: loaded.cached };
}

/** Detect whether a share column is fraction (0–1) or already percentage. */
export function shareScale(values, threshold = 1.5) {
  let mx = 0;
  let seen = 0;
  for (const v of values) {
    if (Number.isFinite(v) && v > 0) {
      seen += 1;
      if (v > mx) mx = v;
    }
  }
  return mx > threshold ? 1 : 100;
}
