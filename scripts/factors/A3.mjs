#!/usr/bin/env node
/**
 * scripts/factors/A3.mjs — C-367 numerical runner for docs/factors/A3.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A3.yaml):
 *   ATS home-cover rate and total-side (under) rate by referee vs league base
 *   rate, on REG games with a named referee, spread_line, result, total_line
 *   and total. Discover 2009-2019; validate 2020-2025. Bonferroni over the
 *   crews tested in discover.
 *
 * Primary number = validate-era home-cover residual (pp) for the discover-era
 * best |effect| crew. Under-rate residual for the same crew (and the best
 * under crew) is reported in notes.
 *
 * Data: free public nflverse/nfldata games.csv + nflverse officials release,
 * local cache under packages/verifier/data/ (untracked). No credential, no DB.
 *
 * On success writes number / ci / n / mde_80pct_power / run_sha / run_at /
 * status (CANDIDATE|DEAD) back into docs/factors/A3.yaml. Never UNTESTED.
 *
 * Usage:
 *   node scripts/factors/A3.mjs
 *   node scripts/factors/A3.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A3.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const DISCOVER_MIN = 2009;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2025;
const MIN_GAMES_DISCOVER = 30;
const MIN_GAMES_VALIDATE = 20;
const ALPHA = 0.05;
const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const OFFICIALS_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/officials/officials.csv";

const GAMES_COLS = [
  "season",
  "game_type",
  "week",
  "gameday",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "result",
  "spread_line",
  "total_line",
  "total",
  "referee",
  "roof",
];

const noCache = process.argv.includes("--no-cache");

// ── minimal CSV (mirrors A1.mjs / packages/data-ingestion parseCsv) ─────────

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
    headers: { "user-agent": "gse-factor-foundry-A3/1.0 (research; nflverse CC-BY-4.0)" },
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

async function loadText(name, url, { required = true } = {}) {
  const hit = loadCachedText(name);
  if (hit !== null) return { text: hit, url, cached: true };
  try {
    const text = await fetchText(url);
    saveCachedText(name, text);
    return { text, url, cached: false };
  } catch (e) {
    if (!required) return { text: null, url, cached: false, error: e };
    throw e;
  }
}

// ── stats ───────────────────────────────────────────────────────────────────

function round(x, d = 4) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** Acklam inverse normal CDF. */
function invNorm(p) {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    const num = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    const den = (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1;
    return num / den;
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    const num = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    const den = (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1;
    return -num / den;
  }
  const q = p - 0.5;
  const r = q * q;
  const num = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q;
  const den = ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1;
  return num / den;
}

/** Two-proportion residual (pp) and its SE. */
function proportionResidual(k1, n1, k0, n0) {
  if (n1 <= 0 || n0 <= 0) return { theta: NaN, se: NaN, p1: NaN, p0: NaN };
  const p1 = k1 / n1;
  const p0 = k0 / n0;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0);
  return { theta: (p1 - p0) * 100, se: se * 100, p1, p0 };
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

function toNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

function buildGames(gamesRecords) {
  const rows = [];
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const era = eraOf(season);
    if (era === "other") continue;
    const referee = (g.referee ?? "").trim();
    if (!referee) continue;
    const result = toNumber(g.result);
    const spread = toNumber(g.spread_line);
    const total = toNumber(g.total);
    const totalLine = toNumber(g.total_line);
    if (result === null || spread === null) continue;
    if (result === spread) continue; // ATS push
    const homeCovers = result > spread ? 1 : 0;
    let under = null;
    if (total !== null && totalLine !== null && total !== totalLine) {
      under = total < totalLine ? 1 : 0;
    }
    rows.push({ season, era, referee, homeCovers, under });
  }
  return rows;
}

function leagueBase(rows) {
  let nAts = 0;
  let kHome = 0;
  let nTot = 0;
  let kUnder = 0;
  for (const r of rows) {
    nAts += 1;
    kHome += r.homeCovers;
    if (r.under !== null) {
      nTot += 1;
      kUnder += r.under;
    }
  }
  return { nAts, kHome, pHome: nAts > 0 ? kHome / nAts : NaN, nTot, kUnder, pUnder: nTot > 0 ? kUnder / nTot : NaN };
}

function byReferee(rows) {
  const map = new Map();
  for (const r of rows) {
    const e = map.get(r.referee) ?? {
      referee: r.referee,
      nAts: 0,
      kHome: 0,
      nTot: 0,
      kUnder: 0,
    };
    e.nAts += 1;
    e.kHome += r.homeCovers;
    if (r.under !== null) {
      e.nTot += 1;
      e.kUnder += r.under;
    }
    map.set(r.referee, e);
  }
  return map;
}

function decideStatus({ theta, ci }) {
  if (!Number.isFinite(theta)) return "BLOCKED";
  const includesZero = Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && ci[0] <= 0 && ci[1] >= 0;
  if (theta <= 0) return "DEAD";
  if (includesZero) return "DEAD";
  return "CANDIDATE";
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A3] run_at=${runAt} run_sha=${runSha}`);

  let gamesText;
  try {
    const loaded = await loadText("games_nfldata.csv", GAMES_URL);
    gamesText = loaded.text;
    console.log(`[A3] schedules: ${loaded.cached ? "cache" : "fetched"} (${gamesText.length} bytes)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A3] BLOCKED — schedules unreachable: ${msg}`);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  // officials release is optional enrichment (crew roster coverage), not required.
  let officialsRows = 0;
  try {
    const off = await loadText("officials.csv", OFFICIALS_URL, { required: false });
    if (off.text) {
      officialsRows = parseCsv(off.text, ["official_name", "position", "season", "game_id"]).records.length;
      console.log(`[A3] officials: ${off.cached ? "cache" : "fetched"} rows=${officialsRows}`);
    } else {
      console.log(`[A3] officials: unavailable (${off.error instanceof Error ? off.error.message : off.error}); referee split uses games.csv only`);
    }
  } catch {
    console.log("[A3] officials: unavailable; referee split uses games.csv only");
  }

  const games = buildGames(parseCsv(gamesText, GAMES_COLS).records);
  const discover = games.filter((g) => g.era === "discover");
  const validate = games.filter((g) => g.era === "validate");
  console.log(`[A3] ATS-usable REG rows: discover=${discover.length} validate=${validate.length}`);

  if (discover.length === 0 || validate.length === 0) {
    console.error("[A3] BLOCKED — empty era after referee/spread join");
    writeYamlBlocked("empty discover or validate era after referee/spread join", runSha, runAt);
    return 2;
  }

  const baseD = leagueBase(discover);
  const baseV = leagueBase(validate);
  console.log(
    `[A3] league base home-cover: discover ${round(baseD.pHome * 100, 2)}% (n=${baseD.nAts})  ` +
      `validate ${round(baseV.pHome * 100, 2)}% (n=${baseV.nAts})`,
  );
  console.log(
    `[A3] league base under: discover ${round(baseD.pUnder * 100, 2)}% (n=${baseD.nTot})  ` +
      `validate ${round(baseV.pUnder * 100, 2)}% (n=${baseV.nTot})`,
  );

  const refsD = byReferee(discover);
  const refsV = byReferee(validate);

  const scoredD = [];
  for (const e of refsD.values()) {
    if (e.nAts < MIN_GAMES_DISCOVER) continue;
    const home = proportionResidual(e.kHome, e.nAts, baseD.kHome, baseD.nAts);
    const under =
      e.nTot >= MIN_GAMES_DISCOVER
        ? proportionResidual(e.kUnder, e.nTot, baseD.kUnder, baseD.nTot)
        : { theta: NaN, se: NaN, p1: NaN, p0: NaN };
    scoredD.push({ ...e, home, under });
  }
  scoredD.sort((a, b) => Math.abs(b.home.theta) - Math.abs(a.home.theta));
  const K = scoredD.length;
  console.log(`[A3] discover crews with nAts>=${MIN_GAMES_DISCOVER}: ${K}`);

  if (K === 0) {
    console.error("[A3] BLOCKED — no crew reaches min discover games");
    writeYamlBlocked(`no referee with n>=${MIN_GAMES_DISCOVER} in discover era`, runSha, runAt);
    return 2;
  }

  const best = scoredD[0];
  console.log(
    `[A3] discover best |home-cover residual|: ${best.referee} θ=${round(best.home.theta, 4)} pp ` +
      `n=${best.nAts} rate=${round(best.home.p1 * 100, 2)}% vs base ${round(best.home.p0 * 100, 2)}% ` +
      `under θ=${round(best.under.theta, 4)} pp (n=${best.nTot})`,
  );

  // Best under-rate crew in discover (secondary, reported).
  const underSorted = scoredD
    .filter((e) => Number.isFinite(e.under.theta))
    .slice()
    .sort((a, b) => Math.abs(b.under.theta) - Math.abs(a.under.theta));
  const bestUnder = underSorted[0] ?? null;
  if (bestUnder) {
    console.log(
      `[A3] discover best |under residual|: ${bestUnder.referee} θ=${round(bestUnder.under.theta, 4)} pp n=${bestUnder.nTot}`,
    );
  }

  const vRow = refsV.get(best.referee) ?? null;
  if (!vRow || vRow.nAts < MIN_GAMES_VALIDATE) {
    console.error(`[A3] BLOCKED — validate era has insufficient games for ${best.referee}`);
    writeYamlBlocked(
      `validate era has nAts<${MIN_GAMES_VALIDATE} for discover-best crew ${best.referee}`,
      runSha,
      runAt,
    );
    return 2;
  }

  const vHome = proportionResidual(vRow.kHome, vRow.nAts, baseV.kHome, baseV.nAts);
  const vUnder =
    vRow.nTot > 0
      ? proportionResidual(vRow.kUnder, vRow.nTot, baseV.kUnder, baseV.nTot)
      : { theta: NaN, se: NaN, p1: NaN, p0: NaN, n: vRow.nTot };

  // Bonferroni over K discover crews: z_{1 - α/(2K)}
  const zBonf = invNorm(1 - ALPHA / (2 * K));
  const mde = Number.isFinite(vHome.se) ? Z_SUM_80PCT * vHome.se : NaN;
  const ci = [vHome.theta - zBonf * vHome.se, vHome.theta + zBonf * vHome.se];
  const ciNaive = [vHome.theta - Z_95 * vHome.se, vHome.theta + Z_95 * vHome.se];

  console.log("[A3] ── validate 2020-2025 (discover-best crew) ──");
  console.log(
    `  crew=${best.referee} nAts=${vRow.nAts} home-cover residual θ=${round(vHome.theta, 4)} pp ` +
      `rate=${round(vHome.p1 * 100, 2)}% vs base ${round(vHome.p0 * 100, 2)}%`,
  );
  console.log(
    `  Bonferroni K=${K} z=${round(zBonf, 4)} CI [${round(ci[0], 4)}, ${round(ci[1], 4)}]  ` +
      `naive95 [${round(ciNaive[0], 4)}, ${round(ciNaive[1], 4)}]  MDE80=${round(mde, 4)}`,
  );
  console.log(
    `  under residual θ=${round(vUnder.theta, 4)} pp nTot=${vRow.nTot} ` +
      `rate=${Number.isFinite(vUnder.p1) ? round(vUnder.p1 * 100, 2) : "—"}% vs base ${Number.isFinite(vUnder.p0) ? round(vUnder.p0 * 100, 2) : "—"}%`,
  );

  // Validate-era under residual for the discover-best under crew.
  let bestUnderValidate = "no validate sample";
  if (bestUnder) {
    bestUnderValidate = `discover ${bestUnder.referee} θ=${round(bestUnder.under.theta, 4)} pp n=${bestUnder.nTot}`;
    const vu = refsV.get(bestUnder.referee);
    if (vu && vu.nTot > 0) {
      const r = proportionResidual(vu.kUnder, vu.nTot, baseV.kUnder, baseV.nTot);
      bestUnderValidate +=
        `; validate θ=${round(r.theta, 4)} pp n=${vu.nTot} ` +
        `rate=${round(r.p1 * 100, 2)}% vs base ${round(r.p0 * 100, 2)}%`;
      console.log(`  discover-best-under crew: ${bestUnderValidate}`);
    } else {
      console.log(`  discover-best-under crew: ${bestUnderValidate} (no validate sample)`);
    }
  }

  const status = decideStatus({ theta: vHome.theta, ci });
  console.log(`[A3] kill_line check → status=${status}`);

  const notes = [
    "Best-of-17 was 49.61% uncorrected. Bonferroni over crews is mandatory. officials",
    "release (full crew) is catalogued in nflverse; games.csv referee alone is the",
    "single-referee split. C-367.",
    `C-367 run ${runAt.slice(0, 10)}: REG, home ATS cover residual (pp) vs league base,`,
    `Bonferroni over K=${K} discover crews (nAts>=${MIN_GAMES_DISCOVER}).`,
    `Discover best |θ| crew ${best.referee}: home θ=${round(best.home.theta, 4)} pp n=${best.nAts};`,
    `under θ=${round(best.under.theta, 4)} pp n=${best.nTot}.`,
    `Validate ${best.referee}: home θ=${round(vHome.theta, 4)} pp n=${vRow.nAts}`,
    `CI_bonf[${round(ci[0], 4)},${round(ci[1], 4)}] z=${round(zBonf, 4)} MDE80=${round(mde, 4)};`,
    `under θ=${round(vUnder.theta, 4)} pp n=${vRow.nTot}.`,
    `Discover best |under| ${bestUnderValidate}.`,
    `League base home-cover: discover ${round(baseD.pHome * 100, 2)}%, validate ${round(baseV.pHome * 100, 2)}%.`,
    `Officials rows loaded=${officialsRows}.`,
    "Data: nflverse/nfldata games.csv (+ officials when reachable), CC BY 4.0, local cache only; no DB.",
  ].join(" ");

  writeYamlResult({
    status,
    number: vHome.theta,
    ci,
    n: vRow.nAts,
    mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A3] wrote ${YAML_PATH}`);
  console.log(
    `[A3] RESULT status=${status} number=${round(vHome.theta, 4)} pp ci=[${round(ci[0], 4)}, ${round(ci[1], 4)}] n=${vRow.nAts}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A3] fatal:", err);
    process.exit(1);
  },
);
