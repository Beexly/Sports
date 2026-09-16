#!/usr/bin/env node
/**
 * scripts/factors/A5.mjs — C-369 numerical runner for docs/factors/A5.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A5.yaml, Borghesi wind-on-totals):
 *   Under-rate residual for REG games with kickoff wind >= 15 mph and an
 *   open/outdoors roof, vs the indoor (dome/closed) baseline. Discover
 *   1999-2019; validate 2020-2025. Yearly decay re-run (not dead forever,
 *   dead now).
 *
 * Sign convention: effect = wind_under_rate − indoor_under_rate (pp).
 * Positive means high wind pushes totals UNDER (the published lean).
 * kill_line: DEAD when validate effect <= 0 OR the effect is not positive
 * in the most recent three seasons (2023-2025).
 *
 * Precipitation is NOT a column in nfldata games.csv (temp/wind/roof are);
 * the precip half of the title is untestable on this spine and is named in
 * notes, never invented.
 *
 * Data: free public nflverse/nfldata games.csv, local cache under
 * packages/verifier/data/ (untracked). No credential, no DB.
 *
 * On success writes number / ci / n / mde_80pct_power / run_sha / run_at /
 * status (CANDIDATE|DEAD) back into docs/factors/A5.yaml. Never UNTESTED.
 *
 * Usage:
 *   node scripts/factors/A5.mjs
 *   node scripts/factors/A5.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A5.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const DISCOVER_MIN = 1999;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2025;
const WIND_MIN_MPH = 15;
const OPEN_ROOFS = new Set(["outdoors", "open"]);
const INDOOR_ROOFS = new Set(["dome", "closed"]);
const RECENT_SEASONS = [2023, 2024, 2025];
const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

const GAMES_COLS = [
  "season",
  "game_type",
  "week",
  "gameday",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "total",
  "total_line",
  "wind",
  "temp",
  "roof",
];

const noCache = process.argv.includes("--no-cache");

// ── minimal CSV (mirrors A1.mjs) ────────────────────────────────────────────

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

async function fetchText(url, { timeoutMs = 120_000 } = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "gse-factor-foundry-A5/1.0 (research; nflverse CC-BY-4.0)" },
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

async function loadText(name, url) {
  const hit = loadCachedText(name);
  if (hit !== null) return { text: hit, url, cached: true };
  const text = await fetchText(url);
  saveCachedText(name, text);
  return { text, url, cached: false };
}

// ── stats ───────────────────────────────────────────────────────────────────

function round(x, d = 4) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** effect = treated_under − indoor_under (pp); positive = wind pushes under. */
function underResidual(k1, n1, k0, n0) {
  if (n1 <= 0 || n0 <= 0) return { theta: NaN, se: NaN, p1: NaN, p0: NaN };
  const p1 = k1 / n1;
  const p0 = k0 / n0;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0);
  return { theta: (p1 - p0) * 100, se: se * 100, p1, p0 };
}

function summarize(rows) {
  const treated = rows.filter((r) => r.group === "wind");
  const indoor = rows.filter((r) => r.group === "indoor");
  const kT = treated.reduce((s, r) => s + r.under, 0);
  const kI = indoor.reduce((s, r) => s + r.under, 0);
  const res = underResidual(kT, treated.length, kI, indoor.length);
  return {
    nTreated: treated.length,
    nIndoor: indoor.length,
    kTreated: kT,
    kIndoor: kI,
    ...res,
  };
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

function eraOf(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

function buildObservations(gamesRecords) {
  const rows = [];
  let skippedNoTotals = 0;
  let skippedPush = 0;
  let skippedRoof = 0;
  let skippedNoWind = 0;
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const era = eraOf(season);
    if (era === "other") continue;
    const total = toNumber(g.total);
    const totalLine = toNumber(g.total_line);
    if (total === null || totalLine === null) {
      skippedNoTotals += 1;
      continue;
    }
    if (total === totalLine) {
      skippedPush += 1;
      continue;
    }
    const under = total < totalLine ? 1 : 0;
    const roof = (g.roof ?? "").trim().toLowerCase();
    if (INDOOR_ROOFS.has(roof)) {
      rows.push({ season, era, group: "indoor", under, wind: null, roof, temp: toNumber(g.temp) });
      continue;
    }
    if (!OPEN_ROOFS.has(roof)) {
      skippedRoof += 1;
      continue;
    }
    const wind = toNumber(g.wind);
    if (wind === null) {
      skippedNoWind += 1;
      continue;
    }
    if (wind >= WIND_MIN_MPH) {
      rows.push({ season, era, group: "wind", under, wind, roof, temp: toNumber(g.temp) });
    }
    // open-roof games below the wind threshold are not part of either arm
  }
  return { rows, skippedNoTotals, skippedPush, skippedRoof, skippedNoWind };
}

function decideStatus({ theta, ci, recentAllPositive, recentLines }) {
  if (!Number.isFinite(theta)) return "BLOCKED";
  if (theta <= 0) return "DEAD";
  if (!recentAllPositive) return "DEAD";
  const includesZero = Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && ci[0] <= 0 && ci[1] >= 0;
  if (includesZero) return "DEAD";
  return "CANDIDATE";
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A5] run_at=${runAt} run_sha=${runSha}`);

  let gamesText;
  try {
    const loaded = await loadText("games_nfldata.csv", GAMES_URL);
    gamesText = loaded.text;
    console.log(`[A5] schedules: ${loaded.cached ? "cache" : "fetched"} (${gamesText.length} bytes)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A5] BLOCKED — schedules unreachable: ${msg}`);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const built = buildObservations(parseCsv(gamesText, GAMES_COLS).records);
  const { rows, skippedNoTotals, skippedPush, skippedRoof, skippedNoWind } = built;
  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(
    `[A5] usable REG rows: discover=${discover.length} validate=${validate.length} ` +
      `(skipped noTotals=${skippedNoTotals} push=${skippedPush} roof=${skippedRoof} noWind=${skippedNoWind})`,
  );

  if (discover.length === 0 || validate.length === 0) {
    console.error("[A5] BLOCKED — empty era after wind/roof/totals join");
    writeYamlBlocked("empty discover or validate era after wind/roof/totals join", runSha, runAt);
    return 2;
  }

  const d = summarize(discover);
  const v = summarize(validate);

  console.log("[A5] ── discover 1999-2019 ──");
  console.log(
    `  wind>=${WIND_MIN_MPH} open n=${d.nTreated} under ${round(d.p1 * 100, 2)}%  ` +
      `indoor n=${d.nIndoor} under ${round(d.p0 * 100, 2)}%  ` +
      `effect=${round(d.theta, 4)} pp SE=${round(d.se, 4)}`,
  );
  console.log("[A5] ── validate 2020-2025 ──");
  console.log(
    `  wind>=${WIND_MIN_MPH} open n=${v.nTreated} under ${round(v.p1 * 100, 2)}%  ` +
      `indoor n=${v.nIndoor} under ${round(v.p0 * 100, 2)}%  ` +
      `effect=${round(v.theta, 4)} pp SE=${round(v.se, 4)}`,
  );

  if (v.nTreated === 0 || v.nIndoor === 0 || !Number.isFinite(v.theta)) {
    console.error("[A5] BLOCKED — validate era missing wind or indoor arm");
    writeYamlBlocked("validate era has zero wind>=15 open-roof games or zero indoor games", runSha, runAt);
    return 2;
  }

  const mde = Number.isFinite(v.se) ? Z_SUM_80PCT * v.se : NaN;
  const ci = [v.theta - Z_95 * v.se, v.theta + Z_95 * v.se];
  console.log(`[A5] CI [${round(ci[0], 4)}, ${round(ci[1], 4)}]  MDE80=${round(mde, 4)}`);

  // Yearly decay across the full sample (the YAML requires a yearly re-run).
  const bySeason = new Map();
  for (const r of rows) {
    const e = bySeason.get(r.season) ?? { wind: [], indoor: [] };
    e[r.group === "wind" ? "wind" : "indoor"].push(r.under);
    bySeason.set(r.season, e);
  }
  const seasonLines = [];
  const recentEffects = [];
  for (const season of [...bySeason.keys()].sort((a, b) => a - b)) {
    const e = bySeason.get(season);
    const kW = e.wind.reduce((s, x) => s + x, 0);
    const kI = e.indoor.reduce((s, x) => s + x, 0);
    const pW = e.wind.length > 0 ? kW / e.wind.length : NaN;
    const pI = e.indoor.length > 0 ? kI / e.indoor.length : NaN;
    const eff = (pW - pI) * 100;
    const line =
      `${season}: nW=${e.wind.length} under=${Number.isFinite(pW) ? round(pW * 100, 2) : "—"}% ` +
      `nI=${e.indoor.length} under=${Number.isFinite(pI) ? round(pI * 100, 2) : "—"}% eff=${round(eff, 2)}`;
    seasonLines.push(line);
    if (RECENT_SEASONS.includes(season)) {
      recentEffects.push({ season, eff, nWind: e.wind.length, pW, pI });
      console.log(`  ${line}  ← recent`);
    }
  }
  // Print a compact decay strip: first, mid, last five validate-era seasons.
  const validateSeasons = [...bySeason.keys()].filter((s) => s >= VALIDATE_MIN).sort((a, b) => a - b);
  console.log(`[A5] validate-era seasons present: ${validateSeasons.join(", ")}`);
  console.log(`[A5] full yearly series length: ${seasonLines.length} seasons`);

  const recentAllPositive =
    recentEffects.length === RECENT_SEASONS.length &&
    recentEffects.every((r) => Number.isFinite(r.eff) && r.eff > 0);
  const recentSummary = recentEffects
    .map((r) => `${r.season}: eff=${round(r.eff, 2)} nW=${r.nWind}`)
    .join("; ");
  console.log(`[A5] recent-3 check (${RECENT_SEASONS.join(",")}): ${recentAllPositive ? "all positive" : "NOT all positive"} — ${recentSummary}`);

  // Whole-sample under rate in wind games (the historical 54.64% shape).
  const allWind = rows.filter((r) => r.group === "wind");
  const allWindUnder = allWind.reduce((s, r) => s + r.under, 0);
  const allWindRate = allWind.length > 0 ? (allWindUnder / allWind.length) * 100 : NaN;
  console.log(
    `[A5] full-sample wind under rate: ${round(allWindRate, 2)}% (n=${allWind.length})`,
  );

  const status = decideStatus({
    theta: v.theta,
    ci,
    recentAllPositive,
    recentLines: recentSummary,
  });
  console.log(`[A5] kill_line check → status=${status}`);

  const notes = [
    "54.64% over 27 seasons, ~0 by 2025. Re-run yearly — not dead forever, dead now.",
    "A 30-second script on games.csv. C-369.",
    `C-369 run ${runAt.slice(0, 10)}: REG, under-rate residual (pp) wind>=${WIND_MIN_MPH} mph`,
    `open/outdoors vs indoor (dome/closed). effect = wind_under − indoor_under; positive =`,
    `wind pushes under. Precip is not a games.csv column — untestable on this spine.`,
    `Discover 1999-2019 wind n=${d.nTreated} under=${round(d.p1 * 100, 2)}% ` +
      `indoor n=${d.nIndoor} under=${round(d.p0 * 100, 2)}% θ=${round(d.theta, 4)} pp.`,
    `Validate 2020-2025 wind n=${v.nTreated} under=${round(v.p1 * 100, 2)}% ` +
      `indoor n=${v.nIndoor} under=${round(v.p0 * 100, 2)}% θ=${round(v.theta, 4)} pp ` +
      `CI[${round(ci[0], 4)},${round(ci[1], 4)}] MDE80=${round(mde, 4)}.`,
    `Recent-3 (${RECENT_SEASONS.join(",")}): ${recentAllPositive ? "all positive" : "not all positive"} — ${recentSummary}.`,
    `Full-sample wind under rate ${round(allWindRate, 2)}% (n=${allWind.length}).`,
    `Validate yearly: ${seasonLines.filter((l) => validateSeasons.some((s) => l.startsWith(`${s}:`))).join("; ")}.`,
    "Data: nflverse/nfldata games.csv (CC BY 4.0), local cache only; no DB.",
  ].join(" ");

  writeYamlResult({
    status,
    number: v.theta,
    ci,
    n: v.nTreated,
    mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A5] wrote ${YAML_PATH}`);
  console.log(
    `[A5] RESULT status=${status} number=${round(v.theta, 4)} pp ci=[${round(ci[0], 4)}, ${round(ci[1], 4)}] n=${v.nTreated}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A5] fatal:", err);
    process.exit(1);
  },
);
