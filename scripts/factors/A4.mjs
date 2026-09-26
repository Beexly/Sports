#!/usr/bin/env node
/**
 * scripts/factors/A4.mjs — C-368 numerical runner for docs/factors/A4.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A4.yaml, Fodor & Krieger published spec):
 *   Away-team ATS cover-rate residual for REG afternoon kickoffs where the
 *   visitor crossed >= 2 whole time zones EASTWARD, vs matched afternoon
 *   controls (same era, < 2 zones eastward). Discover 2000-2019; validate
 *   2020-2025.
 *
 * Sign convention: effect = control_away_cover − treated_away_cover (pp).
 * Positive means eastward travelers cover LESS often (the published lean).
 * kill_line treats effect <= 0 as DEAD.
 *
 * Afternoon = kickoff hour ET in [12, 16) (standard 1 p.m. window). Blank
 * gametime defaults to 13:00 ET (nfl-games.ts assumption). Neutral-site
 * games (location=Neutral) are excluded — home-stadium tz is not the
 * listed home team's.
 *
 * Timezone offsets and zone-crossing math are a port of
 * apps/web/lib/conviction/signals/rest-travel.ts (utcOffsetMinutes,
 * zonesCrossedEastward). Team-abbreviation → IANA zone table covers every
 * abbr in nfldata games.csv (including historical OAK/SD/STL/LA).
 *
 * Data: free public nflverse/nfldata games.csv, local cache under
 * packages/verifier/data/ (untracked). No credential, no DB.
 *
 * On success writes number / ci / n / mde_80pct_power / run_sha / run_at /
 * status (CANDIDATE|DEAD) back into docs/factors/A4.yaml. Never UNTESTED.
 *
 * Usage:
 *   node scripts/factors/A4.mjs
 *   node scripts/factors/A4.mjs --no-cache
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A4.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const DISCOVER_MIN = 2000;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2025;
const ZONES_EASTWARD_MIN = 2;
const AFTERNOON_START_ET = 12;
const AFTERNOON_END_ET = 16; // exclusive — the 1 p.m. window, not the late slot
const DEFAULT_KICKOFF_ET = "13:00";
const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

const GAMES_COLS = [
  "season",
  "game_type",
  "week",
  "gameday",
  "gametime",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "result",
  "spread_line",
  "location",
];

const noCache = process.argv.includes("--no-cache");

/**
 * nflverse/nfldata team abbreviation → IANA zone of that club's home stadium
 * for the seasons the abbreviation was in use. Every abbr observed in
 * games.csv REG rows is covered (ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET
 * GB HOU IND JAX KC LA LAC LV MIA MIN NE NO NYG NYJ OAK PHI PIT SD SEA SF
 * STL TB TEN WAS).
 */
const TEAM_TZ = Object.freeze({
  ARI: "America/Phoenix",
  ATL: "America/New_York",
  BAL: "America/New_York",
  BUF: "America/New_York",
  CAR: "America/New_York",
  CHI: "America/Chicago",
  CIN: "America/New_York",
  CLE: "America/New_York",
  DAL: "America/Chicago",
  DEN: "America/Denver",
  DET: "America/New_York",
  GB: "America/Chicago",
  HOU: "America/Chicago",
  IND: "America/New_York",
  JAX: "America/New_York",
  KC: "America/Chicago",
  LA: "America/Los_Angeles",
  LAC: "America/Los_Angeles",
  LV: "America/Los_Angeles",
  MIA: "America/New_York",
  MIN: "America/Chicago",
  NE: "America/New_York",
  NO: "America/Chicago",
  NYG: "America/New_York",
  NYJ: "America/New_York",
  OAK: "America/Los_Angeles",
  PHI: "America/New_York",
  PIT: "America/New_York",
  SD: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  SF: "America/Los_Angeles",
  STL: "America/Chicago",
  TB: "America/New_York",
  TEN: "America/Chicago",
  WAS: "America/New_York",
});

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
    headers: { "user-agent": "gse-factor-foundry-A4/1.0 (research; nflverse CC-BY-4.0)" },
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

// ── stats + timezone (ports) ────────────────────────────────────────────────

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

/** Minutes that timeZone sits ahead of UTC at `at` (port of rest-travel.ts). */
function utcOffsetMinutes(timeZone, at) {
  if (Number.isNaN(at.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const read = (type) => {
      const found = parts.find((p) => p.type === type);
      return found ? Number(found.value) : Number.NaN;
    };
    const year = read("year");
    const month = read("month");
    const day = read("day");
    const rawHour = read("hour");
    const minute = read("minute");
    const second = read("second");
    if ([year, month, day, rawHour, minute, second].some((n) => Number.isNaN(n))) return null;
    const hour = rawHour === 24 ? 0 : rawHour;
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return null;
  }
}

/** Positive = eastward (port of rest-travel.ts zonesCrossedEastward). */
function zonesCrossedEastward(fromTz, toTz, at) {
  const from = utcOffsetMinutes(fromTz, at);
  const to = utcOffsetMinutes(toTz, at);
  if (from === null || to === null) return null;
  return Math.round((to - from) / 60);
}

/** ET wall clock → UTC (port of edge-lab/loaders/nfl-games.ts easternWallClockToUtcIso). */
function easternWallClockToUtc(gameday, gametime) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gameday);
  if (dateMatch === null) return null;
  const timeSource =
    gametime !== null && gametime !== undefined && String(gametime).trim() !== ""
      ? String(gametime).trim()
      : DEFAULT_KICKOFF_ET;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeSource);
  if (timeMatch === null) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const first = newYorkOffsetMinutes(naiveUtcMs);
  const correctedMs = naiveUtcMs - first * 60_000;
  const second = newYorkOffsetMinutes(correctedMs);
  return new Date(naiveUtcMs - second * 60_000);
}

function newYorkOffsetMinutes(atUtcMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(atUtcMs));
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName);
  if (!m) return -300;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2]);
  const mm = m[3] ? Number(m[3]) : 0;
  return sign * (hh * 60 + mm);
}

/** Kickoff hour 0-23 Eastern. */
function kickoffHourEastern(at) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
    }).formatToParts(at);
    const found = parts.find((p) => p.type === "hour");
    if (!found) return null;
    const hour = Number(found.value);
    return Number.isNaN(hour) ? null : hour === 24 ? 0 : hour;
  } catch {
    return null;
  }
}

function proportionResidual(k1, n1, k0, n0) {
  if (n1 <= 0 || n0 <= 0) return { theta: NaN, se: NaN, p1: NaN, p0: NaN };
  const p1 = k1 / n1;
  const p0 = k0 / n0;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0);
  // effect = control − treated (positive = travelers cover less)
  return { theta: (p0 - p1) * 100, se: se * 100, p1, p0 };
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
  let skippedNeutral = 0;
  let skippedNoTz = 0;
  let skippedNotAfternoon = 0;
  let skippedNoAts = 0;
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const era = eraOf(season);
    if (era === "other") continue;
    if ((g.location ?? "").trim() === "Neutral") {
      skippedNeutral += 1;
      continue;
    }
    const result = toNumber(g.result);
    const spread = toNumber(g.spread_line);
    if (result === null || spread === null) {
      skippedNoAts += 1;
      continue;
    }
    if (result === spread) continue; // push
    const kickoff = easternWallClockToUtc(g.gameday, g.gametime);
    if (kickoff === null) continue;
    const hourEt = kickoffHourEastern(kickoff);
    if (hourEt === null || hourEt < AFTERNOON_START_ET || hourEt >= AFTERNOON_END_ET) {
      skippedNotAfternoon += 1;
      continue;
    }
    const awayTz = TEAM_TZ[(g.away_team ?? "").trim()];
    const homeTz = TEAM_TZ[(g.home_team ?? "").trim()];
    if (!awayTz || !homeTz) {
      skippedNoTz += 1;
      continue;
    }
    const zones = zonesCrossedEastward(awayTz, homeTz, kickoff);
    if (zones === null) {
      skippedNoTz += 1;
      continue;
    }
    const awayCovers = result < spread ? 1 : 0; // away +spread covers when home wins by less
    const treated = zones >= ZONES_EASTWARD_MIN;
    rows.push({
      season,
      era,
      zones,
      treated,
      awayCovers,
      away: (g.away_team ?? "").trim(),
      home: (g.home_team ?? "").trim(),
      hourEt,
    });
  }
  return { rows, skippedNeutral, skippedNoTz, skippedNotAfternoon, skippedNoAts };
}

function summarize(rows) {
  const treated = rows.filter((r) => r.treated);
  const control = rows.filter((r) => !r.treated);
  const kT = treated.reduce((s, r) => s + r.awayCovers, 0);
  const kC = control.reduce((s, r) => s + r.awayCovers, 0);
  const res = proportionResidual(kT, treated.length, kC, control.length);
  return {
    nTreated: treated.length,
    nControl: control.length,
    kTreated: kT,
    kControl: kC,
    ...res,
  };
}

function decideStatus({ theta, ci, n }) {
  if (!Number.isFinite(theta) || n <= 0) return "BLOCKED";
  if (theta <= 0) return "DEAD";
  const includesZero = Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && ci[0] <= 0 && ci[1] >= 0;
  if (includesZero && n >= 200) return "DEAD";
  if (includesZero) return "DEAD"; // kill line: CI includes 0 → dead regardless
  return "CANDIDATE";
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A4] run_at=${runAt} run_sha=${runSha}`);

  let gamesText;
  try {
    const loaded = await loadText("games_nfldata.csv", GAMES_URL);
    gamesText = loaded.text;
    console.log(`[A4] schedules: ${loaded.cached ? "cache" : "fetched"} (${gamesText.length} bytes)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A4] BLOCKED — schedules unreachable: ${msg}`);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const built = buildObservations(parseCsv(gamesText, GAMES_COLS).records);
  const { rows, skippedNeutral, skippedNoTz, skippedNotAfternoon, skippedNoAts } = built;
  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  console.log(
    `[A4] afternoon REG ATS rows: discover=${discover.length} validate=${validate.length} ` +
      `(skipped neutral=${skippedNeutral} noAts=${skippedNoAts} notAfternoon=${skippedNotAfternoon} noTz=${skippedNoTz})`,
  );

  if (discover.length === 0 || validate.length === 0) {
    console.error("[A4] BLOCKED — empty era after afternoon/travel join");
    writeYamlBlocked("empty discover or validate era after afternoon/travel join", runSha, runAt);
    return 2;
  }

  const d = summarize(discover);
  const v = summarize(validate);

  console.log("[A4] ── discover 2000-2019 ──");
  console.log(
    `  treated n=${d.nTreated} away-cover ${round(d.p1 * 100, 2)}%  ` +
      `control n=${d.nControl} away-cover ${round(d.p0 * 100, 2)}%  ` +
      `effect(control−treated)=${round(d.theta, 4)} pp SE=${round(d.se, 4)}`,
  );
  console.log("[A4] ── validate 2020-2025 ──");
  console.log(
    `  treated n=${v.nTreated} away-cover ${round(v.p1 * 100, 2)}%  ` +
      `control n=${v.nControl} away-cover ${round(v.p0 * 100, 2)}%  ` +
      `effect(control−treated)=${round(v.theta, 4)} pp SE=${round(v.se, 4)}`,
  );

  if (v.nTreated === 0 || v.nControl === 0 || !Number.isFinite(v.theta)) {
    console.error("[A4] BLOCKED — validate era missing treated or control afternoon games");
    writeYamlBlocked("validate era has zero treated or zero control afternoon games", runSha, runAt);
    return 2;
  }

  const mde = Number.isFinite(v.se) ? Z_SUM_80PCT * v.se : NaN;
  const ci = [v.theta - Z_95 * v.se, v.theta + Z_95 * v.se];
  console.log(
    `[A4] CI [${round(ci[0], 4)}, ${round(ci[1], 4)}]  MDE80=${round(mde, 4)}  nTreated=${v.nTreated}`,
  );

  // Decay check by season (validate era), as the YAML notes require.
  const bySeason = new Map();
  for (const r of validate) {
    const e = bySeason.get(r.season) ?? { t: [], c: [] };
    (r.treated ? e.t : e.c).push(r.awayCovers);
    bySeason.set(r.season, e);
  }
  const seasonLines = [];
  for (const season of [...bySeason.keys()].sort((a, b) => a - b)) {
    const e = bySeason.get(season);
    const kT = e.t.reduce((s, x) => s + x, 0);
    const kC = e.c.reduce((s, x) => s + x, 0);
    const pT = e.t.length > 0 ? kT / e.t.length : NaN;
    const pC = e.c.length > 0 ? kC / e.c.length : NaN;
    const eff = (pC - pT) * 100;
    seasonLines.push(
      `${season}: nT=${e.t.length} cover=${Number.isFinite(pT) ? round(pT * 100, 2) : "—"}% ` +
        `nC=${e.c.length} cover=${Number.isFinite(pC) ? round(pC * 100, 2) : "—"}% eff=${round(eff, 2)}`,
    );
    console.log(`  ${seasonLines[seasonLines.length - 1]}`);
  }

  // Zone distribution among treated (sanity).
  const zoneDist = new Map();
  for (const r of rows) {
    if (!r.treated) continue;
    zoneDist.set(r.zones, (zoneDist.get(r.zones) ?? 0) + 1);
  }
  const zoneSummary = [...zoneDist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([z, n]) => `${z}z:${n}`)
    .join(" ");
  console.log(`[A4] treated zone distribution: ${zoneSummary}`);

  const status = decideStatus({ theta: v.theta, ci, n: v.nTreated });
  console.log(`[A4] kill_line check → status=${status}`);

  const notes = [
    "F12 tested west-early (sign flip) and east-late (collapsed), not this exact published",
    "spec. Run the published spec first, then the decay check by season. C-368.",
    `C-368 run ${runAt.slice(0, 10)}: Fodor-Krieger shape — away ATS cover residual for`,
    `eastward >=${ZONES_EASTWARD_MIN}-zone afternoon (ET hour [${AFTERNOON_START_ET},${AFTERNOON_END_ET})) REG games vs`,
    `afternoon controls. effect = control − treated (pp); positive = travelers cover less.`,
    `Discover 2000-2019 treated n=${d.nTreated} cover=${round(d.p1 * 100, 2)}% ` +
      `control n=${d.nControl} cover=${round(d.p0 * 100, 2)}% θ=${round(d.theta, 4)} pp.`,
    `Validate 2020-2025 treated n=${v.nTreated} cover=${round(v.p1 * 100, 2)}% ` +
      `control n=${v.nControl} cover=${round(v.p0 * 100, 2)}% θ=${round(v.theta, 4)} pp ` +
      `CI[${round(ci[0], 4)},${round(ci[1], 4)}] MDE80=${round(mde, 4)}.`,
    `Validate yearly: ${seasonLines.join("; ")}.`,
    `Treated zones: ${zoneSummary}. Neutral sites excluded (n=${skippedNeutral}).`,
    "Data: nflverse/nfldata games.csv (CC BY 4.0), local cache only; tz table port of rest-travel.ts; no DB.",
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
  console.log(`[A4] wrote ${YAML_PATH}`);
  console.log(
    `[A4] RESULT status=${status} number=${round(v.theta, 4)} pp ci=[${round(ci[0], 4)}, ${round(ci[1], 4)}] n=${v.nTreated}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A4] fatal:", err);
    process.exit(1);
  },
);
