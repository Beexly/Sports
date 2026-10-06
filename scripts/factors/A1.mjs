#!/usr/bin/env node
/**
 * scripts/factors/A1.mjs — C-365 numerical runner for docs/factors/A1.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A1.yaml):
 *   residual target_share vs the player's trailing-5-game baseline, pooled,
 *   cluster-robust by player, among WR/TE REG games that are either
 *     (a) within ±3 days of the player's birthday, or
 *     (b) against a team that previously rostered him (weekly-rosters history).
 *
 * Birthday window + day-offset math is a port of
 * apps/web/lib/nflverse/birthday-usage-trend.ts (dayOffsetFromBirthday,
 * ±3-day window). Former-team half rebuilds team history from nflverse
 * weekly_rosters. Outcome is nflverse stats_player weekly `target_share`
 * (fraction 0–1 → percentage points).
 *
 * Data: free public nflverse releases, fetched like edge-lab/loaders/nfl-games.ts
 * and packages/verifier loaders — no credential, no database write. Cached
 * under packages/verifier/data/ (untracked).
 *
 * On success writes number / ci / n / mde_80pct_power / run_sha / run_at /
 * status (CANDIDATE|DEAD) back into docs/factors/A1.yaml. Never UNTESTED.
 * Honest BLOCKED (with blocked_on) when the releases cannot be loaded.
 *
 * Usage:
 *   node scripts/factors/A1.mjs
 *   node scripts/factors/A1.mjs --no-cache   # force re-download
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A1.yaml");
const DATA_DIR = path.join(REPO_ROOT, "packages", "verifier", "data");

const SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const DISCOVER_MAX_SEASON = 2020;
const VALIDATE_MIN_SEASON = 2021;
const VALIDATE_MAX_SEASON = 2024;
const TRAILING_GAMES = 5;
const BIRTHDAY_WINDOW_DAYS = 3;
const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const ROSTER_URL = (s) => `${BASE}/weekly_rosters/roster_weekly_${s}.csv`;
const STATS_COMBINED_URL = `${BASE}/player_stats/player_stats.csv.gz`;
const STATS_SEASON_URL = (s) => `${BASE}/stats_player/stats_player_week_${s}.csv`;

const ROSTER_COLS = ["season", "team", "position", "birth_date", "gsis_id", "week", "game_type", "status"];
const STATS_COLS = [
  "player_id",
  "player_display_name",
  "position",
  "season",
  "week",
  "season_type",
  "team",
  "recent_team",
  "opponent_team",
  "target_share",
  "targets",
];
const GAMES_COLS = ["season", "week", "game_type", "gameday", "home_team", "away_team"];

const noCache = process.argv.includes("--no-cache");

// ── minimal CSV (mirrors packages/data-ingestion parseCsv conventions) ──────

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
  const index = new Map();
  const keep = [];
  const keys = [];
  const wanted = project ? new Set(project) : null;
  for (let c = 0; c < header.length; c += 1) {
    const name = header[c];
    index.set(name, c);
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
    headers: { "user-agent": "gse-factor-foundry-A1/1.0 (research; nflverse CC-BY-4.0)" },
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

// ── birthday day-offset (port of birthday-usage-trend.ts) ──────────────────

/** Calendar-day offset of gameDate from the birthday occurring nearest that year. */
function dayOffsetFromBirthday(gameDate, birthDate) {
  const game = new Date(`${gameDate}T00:00:00Z`);
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(game.getTime()) || Number.isNaN(birth.getTime())) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const birthdayThisYear = Date.UTC(game.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  const gameDay = Date.UTC(game.getUTCFullYear(), game.getUTCMonth(), game.getUTCDate());
  const rawOffset = Math.round((gameDay - birthdayThisYear) / dayMs);
  return [rawOffset, rawOffset - 365, rawOffset + 365, rawOffset - 366, rawOffset + 366].reduce(
    (best, candidate) => (Math.abs(candidate) < Math.abs(best) ? candidate : best),
    rawOffset,
  );
}

// ── cluster-robust mean (CR1, intercept-only) ──────────────────────────────

function clusterRobustMean(values, clusters) {
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
  // CR1 intercept-only: Var(θ̂) = G/(G-1) · Σ_g S_g² / n²
  const finite = G > 1 ? G / (G - 1) : 1;
  const se = Math.sqrt((finite * meat) / (n * n));
  return { theta, se, G, n };
}

function mean(values) {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function round(x, d = 4) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

// ── estimand construction ──────────────────────────────────────────────────

function buildGameDateIndex(gamesRecords) {
  const map = new Map();
  for (const g of gamesRecords) {
    if ((g.game_type ?? "") !== "REG") continue;
    const season = Number(g.season);
    const week = Number(g.week);
    const gameday = g.gameday;
    if (!Number.isFinite(season) || !Number.isFinite(week) || !gameday) continue;
    if (g.home_team) map.set(`${season}|${week}|${g.home_team}`, gameday);
    if (g.away_team) map.set(`${season}|${week}|${g.away_team}`, gameday);
  }
  return map;
}

function analyzeEra(obs) {
  const treated = obs.filter((o) => o.treated);
  const untreated = obs.filter((o) => !o.treated);
  const tVals = treated.map((o) => o.residualPp);
  const tClusters = treated.map((o) => o.playerId);
  const cr = clusterRobustMean(tVals, tClusters);
  const lo = cr.theta - Z_95 * cr.se;
  const hi = cr.theta + Z_95 * cr.se;
  const mde = Number.isFinite(cr.se) ? Z_SUM_80PCT * cr.se : NaN;
  return {
    nTreated: treated.length,
    nUntreated: untreated.length,
    nEligible: obs.length,
    playersTreated: cr.G,
    theta: cr.theta,
    se: cr.se,
    ci: [lo, hi],
    mde,
    untreatedMean: mean(untreated.map((o) => o.residualPp)),
    birthdayOnly: (() => {
      const rows = obs.filter((o) => o.birthdayWindow && !o.formerTeam);
      return { n: rows.length, mean: mean(rows.map((o) => o.residualPp)) };
    })(),
    formerOnly: (() => {
      const rows = obs.filter((o) => o.formerTeam && !o.birthdayWindow);
      return { n: rows.length, mean: mean(rows.map((o) => o.residualPp)) };
    })(),
    both: (() => {
      const rows = obs.filter((o) => o.formerTeam && o.birthdayWindow);
      return { n: rows.length, mean: mean(rows.map((o) => o.residualPp)) };
    })(),
  };
}

function decideStatus({ theta, ci, n }) {
  const includesZero = Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && ci[0] <= 0 && ci[1] >= 0;
  if (!Number.isFinite(theta) || n <= 0) return "BLOCKED";
  if (theta <= 0) return "DEAD";
  if (includesZero && n >= 300) return "DEAD";
  return "CANDIDATE";
}

// ── YAML write-back ────────────────────────────────────────────────────────

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
      // swallow the old folded block (indented lines / blanks under notes)
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
      out.push(
        ci === null
          ? "ci: null"
          : `ci: [${round(ci[0], 4)}, ${round(ci[1], 4)}]`,
      );
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

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A1] run_at=${runAt} run_sha=${runSha}`);
  console.log(`[A1] data dir: ${DATA_DIR}`);

  let gamesText;
  try {
    const loaded = await loadText("games_nfldata.csv", GAMES_URL);
    gamesText = loaded.text;
    console.log(`[A1] schedules: ${loaded.cached ? "cache" : "fetched"} (${gamesText.length} bytes)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A1] BLOCKED — schedules unreachable: ${msg}`);
    writeYamlBlocked(`nflverse/nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const gameDates = buildGameDateIndex(parseCsv(gamesText, GAMES_COLS).records);
  console.log(`[A1] REG team-game dates indexed: ${gameDates.size}`);

  // Weekly rosters → birth_date + prior-team history
  const birthDate = new Map();
  /** playerId -> sorted [{season, week, team}] across all game types. */
  const teamHistory = new Map();
  let rosterRows = 0;
  try {
    for (const season of SEASONS) {
      const name = `roster_weekly_${season}.csv`;
      const loaded = await loadText(name, ROSTER_URL(season));
      const { records } = parseCsv(loaded.text, ROSTER_COLS);
      rosterRows += records.length;
      for (const r of records) {
        const id = r.gsis_id;
        if (!id) continue;
        if (r.birth_date && !birthDate.has(id)) birthDate.set(id, r.birth_date);
        const team = r.team;
        if (!team) continue;
        const list = teamHistory.get(id) ?? [];
        list.push({
          season: Number(r.season),
          week: Number(r.week),
          team,
        });
        teamHistory.set(id, list);
      }
      console.log(`[A1] rosters ${season}: ${records.length} rows ${loaded.cached ? "(cache)" : ""}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A1] BLOCKED — weekly_rosters unreachable: ${msg}`);
    writeYamlBlocked(`nflverse weekly_rosters unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  for (const list of teamHistory.values()) {
    list.sort((a, b) => a.season - b.season || a.week - b.week);
  }
  console.log(`[A1] roster rows=${rosterRows} players_with_birth=${birthDate.size} players_with_history=${teamHistory.size}`);

  // Player-week stats (combined asset first; per-season backfill if combined lags)
  let statsRecords = [];
  try {
    const combined = await loadText("player_stats_combined.csv.gz", STATS_COMBINED_URL);
    statsRecords = parseCsv(combined.text, STATS_COLS).records;
    let maxSeason = 0;
    for (const r of statsRecords) {
      const s = Number(r.season);
      if (Number.isFinite(s) && s > maxSeason) maxSeason = s;
    }
    console.log(
      `[A1] player_stats combined: ${statsRecords.length} rows, max season ${maxSeason} ${combined.cached ? "(cache)" : ""}`,
    );
    for (const season of SEASONS) {
      if (season <= maxSeason) continue;
      const name = `stats_player_week_${season}.csv`;
      try {
        const extra = await loadText(name, STATS_SEASON_URL(season));
        const rows = parseCsv(extra.text, STATS_COLS).records;
        statsRecords = statsRecords.concat(rows);
        console.log(`[A1] player_stats backfill ${season}: +${rows.length}`);
      } catch (e) {
        console.warn(`[A1] per-season stats ${season} unavailable: ${e instanceof Error ? e.message : e}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A1] BLOCKED — player_stats unreachable: ${msg}`);
    writeYamlBlocked(`nflverse player_stats unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  // Detect target_share scale (fraction vs percent)
  let tsMax = 0;
  let tsSeen = 0;
  for (const r of statsRecords) {
    const v = Number(r.target_share);
    if (Number.isFinite(v) && v > 0) {
      tsSeen += 1;
      if (v > tsMax) tsMax = v;
    }
  }
  const tsScale = tsMax > 1.5 ? 1 : 100; // fraction → percentage points
  console.log(`[A1] target_share max=${tsMax} (${tsSeen} positive rows) → scale ×${tsScale}`);

  // Build WR/TE REG timelines with trailing-5 baseline
  const skill = new Set(["WR", "TE"]);
  /** playerId -> array of stats games sorted by season/week */
  const timelines = new Map();
  let skillRegRows = 0;
  for (const r of statsRecords) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    if (!skill.has((r.position ?? "").toUpperCase())) continue;
    const season = Number(r.season);
    const week = Number(r.week);
    if (season < SEASONS[0] || season > SEASONS[SEASONS.length - 1]) continue;
    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;
    const playerId = r.player_id;
    if (!playerId) continue;
    const ts = Number(r.target_share);
    if (!Number.isFinite(ts)) continue;
    skillRegRows += 1;
    const team = r.team || r.recent_team || "";
    const opponent = r.opponent_team ?? "";
    const gameDate = gameDates.get(`${season}|${week}|${team}`) ?? null;
    const list = timelines.get(playerId) ?? [];
    list.push({
      playerId,
      playerName: r.player_display_name || playerId,
      season,
      week,
      team,
      opponent,
      gameDate,
      targetShare: ts * tsScale, // percentage points
    });
    timelines.set(playerId, list);
  }
  console.log(`[A1] WR/TE REG stat rows=${skillRegRows} players=${timelines.size}`);

  const observations = [];
  let skippedNoBirth = 0;
  let skippedNoDate = 0;
  let skippedShortBaseline = 0;

  for (const games of timelines.values()) {
    games.sort((a, b) => a.season - b.season || a.week - b.week);
    const history = teamHistory.get(games[0].playerId) ?? [];
    const birth = birthDate.get(games[0].playerId) ?? null;

    for (let idx = 0; idx < games.length; idx += 1) {
      const g = games[idx];
      const prior = games.slice(Math.max(0, idx - TRAILING_GAMES), idx);
      if (prior.length < TRAILING_GAMES) {
        skippedShortBaseline += 1;
        continue;
      }
      if (!birth) {
        skippedNoBirth += 1;
        continue;
      }
      if (!g.gameDate) {
        skippedNoDate += 1;
        continue;
      }
      const trailingMean = mean(prior.map((p) => p.targetShare));
      const residualPp = g.targetShare - trailingMean;
      const dayOffset = dayOffsetFromBirthday(g.gameDate, birth);
      const birthdayWindow = dayOffset !== null && Math.abs(dayOffset) <= BIRTHDAY_WINDOW_DAYS;

      // Former team: opponent appeared on this player's weekly roster strictly
      // before (season, week) of the current game.
      let formerTeam = false;
      if (g.opponent) {
        for (const h of history) {
          if (h.team !== g.opponent) continue;
          if (h.season < g.season || (h.season === g.season && h.week < g.week)) {
            formerTeam = true;
            break;
          }
        }
      }

      const treated = birthdayWindow || formerTeam;
      const era =
        g.season <= DISCOVER_MAX_SEASON
          ? "discover"
          : g.season >= VALIDATE_MIN_SEASON && g.season <= VALIDATE_MAX_SEASON
            ? "validate"
            : "other";
      if (era === "other") continue;

      observations.push({
        playerId: g.playerId,
        playerName: g.playerName,
        season: g.season,
        week: g.week,
        residualPp,
        dayOffset,
        birthdayWindow,
        formerTeam,
        treated,
        era,
      });
    }
  }

  const discover = observations.filter((o) => o.era === "discover");
  const validate = observations.filter((o) => o.era === "validate");
  console.log(
    `[A1] eligible observations: discover=${discover.length} validate=${validate.length} ` +
      `(skipped baseline=${skippedShortBaseline} birth=${skippedNoBirth} date=${skippedNoDate})`,
  );

  if (discover.length === 0 && validate.length === 0) {
    console.error("[A1] BLOCKED — zero eligible observations after join");
    writeYamlBlocked(
      "zero eligible WR/TE REG observations after join (rosters/player_stats/schedules columns drifted or empty)",
      runSha,
      runAt,
    );
    return 2;
  }

  const d = analyzeEra(discover);
  const v = analyzeEra(validate);

  console.log("[A1] ── discover 2017-2020 ──");
  console.log(
    `  treated n=${d.nTreated} (players=${d.playersTreated})  mean residual=${round(d.theta, 4)} pp  ` +
      `CI [${round(d.ci[0], 4)}, ${round(d.ci[1], 4)}]  SE=${round(d.se, 4)}  MDE80=${round(d.mde, 4)}`,
  );
  console.log(`  untreated n=${d.nUntreated} mean residual=${round(d.untreatedMean, 4)} pp`);
  console.log(
    `  birthday-only n=${d.birthdayOnly.n} mean=${round(d.birthdayOnly.mean, 4)}  ` +
      `former-only n=${d.formerOnly.n} mean=${round(d.formerOnly.mean, 4)}  both n=${d.both.n}`,
  );

  console.log("[A1] ── validate 2021-2024 ──");
  console.log(
    `  treated n=${v.nTreated} (players=${v.playersTreated})  mean residual=${round(v.theta, 4)} pp  ` +
      `CI [${round(v.ci[0], 4)}, ${round(v.ci[1], 4)}]  SE=${round(v.se, 4)}  MDE80=${round(v.mde, 4)}`,
  );
  console.log(`  untreated n=${v.nUntreated} mean residual=${round(v.untreatedMean, 4)} pp`);
  console.log(
    `  birthday-only n=${v.birthdayOnly.n} mean=${round(v.birthdayOnly.mean, 4)}  ` +
      `former-only n=${v.formerOnly.n} mean=${round(v.formerOnly.mean, 4)}  both n=${v.both.n}`,
  );

  if (v.nTreated === 0 || !Number.isFinite(v.theta)) {
    console.error("[A1] BLOCKED — validate era has zero treated observations");
    writeYamlBlocked(
      "validate era (2021-2024) has zero treated WR/TE rows after trailing-5 join",
      runSha,
      runAt,
    );
    return 2;
  }

  const status = decideStatus({ theta: v.theta, ci: v.ci, n: v.nTreated });
  console.log(`[A1] kill_line check → status=${status}`);

  const notes = [
    "Components already measured separately on YARDS (F6): birthday ±3d +1.11 yds p=0.57 (dead);",
    "former team +2.01 yds n=336 p=0.11 CI[-0.72,+4.73] (unresolved, power to +3.0). The",
    "conjunction on TARGET SHARE has never been run. Milestone incentive (F12) +1.16pp with a",
    "failed placebo — an artifact, not a factor. Birthday half reuses lib/nflverse/birthday-usage-trend.ts;",
    "former-team half from weekly rosters team history (or trades).",
    `C-365 run ${runAt.slice(0, 10)}: WR/TE REG, residual target_share (pp) vs trailing-5, CR1 by player.`,
    `Validate 2021-2024 treated n=${v.nTreated} (players=${v.playersTreated}) θ=${round(v.theta, 4)} pp ` +
      `CI[${round(v.ci[0], 4)},${round(v.ci[1], 4)}] MDE80=${round(v.mde, 4)}; ` +
      `untreated mean ${round(v.untreatedMean, 4)} pp (n=${v.nUntreated}); ` +
      `birthday-only n=${v.birthdayOnly.n} μ=${round(v.birthdayOnly.mean, 4)}, ` +
      `former-only n=${v.formerOnly.n} μ=${round(v.formerOnly.mean, 4)}, ` +
      `both n=${v.both.n}.`,
    `Discover 2017-2020 treated n=${d.nTreated} θ=${round(d.theta, 4)} pp ` +
      `CI[${round(d.ci[0], 4)},${round(d.ci[1], 4)}].`,
    "Data: nflverse weekly_rosters + player_stats + nfldata games.csv (CC BY 4.0), local cache only; no DB.",
  ].join(" ");

  writeYamlResult({
    status,
    number: v.theta,
    ci: v.ci,
    n: v.nTreated,
    mde: v.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A1] wrote ${YAML_PATH}`);
  console.log(
    `[A1] RESULT status=${status} number=${round(v.theta, 4)} pp ci=[${round(v.ci[0], 4)}, ${round(v.ci[1], 4)}] n=${v.nTreated}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A1] fatal:", err);
    process.exit(1);
  },
);
