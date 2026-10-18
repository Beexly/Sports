#!/usr/bin/env node
/**
 * backfill-nfl-depth-chart-weeks.mjs — import REAL nflverse depth-chart weeks.
 *
 * WHY THIS EXISTS
 * `depth_chart_entries` was written by `ingestDepthCharts`, which keeps only the
 * latest snapshot of the season and stamps it `week: 0` (the upstream asset has
 * no `week` column — it is a timestamped snapshot feed, one `dt` per day). With
 * a single week in the table, no week-over-week continuity delta can be
 * computed, which is why the picks route used to emit constants. This script
 * imports one real snapshot PER REGULAR-SEASON WEEK so the delta is measurable.
 *
 * SOURCE OF TRUTH (no hand-edited rows, no synthetic data)
 *   depth charts: <NFLVERSE_BASE>/depth_charts/depth_charts_<season>.csv
 *   schedule:     <NFLVERSE_BASE>/schedules/games.csv   (week → gameday)
 * Both are the same CC-BY-4.0 nflverse-data release assets declared in
 * `packages/data-ingestion/src/nflverse-source.ts`. Every row written here comes
 * from those files; the only decision the script makes is WHICH snapshot
 * represents a week.
 *
 * WEEK → SNAPSHOT RULE
 * The chart that matters for week W is the last one published BEFORE that
 * week's first kickoff: `max(dt) where dt < first_gameday(W)`. That is the
 * lineup the team actually carried into the game, not a post-game revision.
 *
 * SNAPSHOT MODE (used for the week-over-week continuity pair)
 * `--snapshot <dt>[,<dt>]` imports specific upstream snapshots verbatim and
 * labels each with the NFL week whose game window [first gameday, last gameday]
 * contains it. The continuity metric compares the latest snapshot with the one
 * nearest seven days earlier, so that pair is landed as two adjacent weeks.
 *
 * PROVENANCE
 * Rows keep `sourceId: "nflverse"` and copy the `rightsSnapshot` already stored
 * on the season's existing rows, so the licensing record is identical to what
 * the normal ingest writes. `fetchedAt` is the real upstream snapshot time.
 *
 * IDEMPOTENT: rows for (season, week in --weeks) are replaced inside one
 * transaction. Re-running produces the same table. `--drop-week0` additionally
 * removes the season's unlabeled `week: 0` rows, which the normal ingest writes
 * from the same latest snapshot (they would otherwise duplicate the newest
 * week and confuse the "two newest weeks" selection).
 *
 * USAGE
 *   DATABASE_URL=... node scripts/backfill-nfl-depth-chart-weeks.mjs --season 2026 --weeks 1-6
 *   ... --snapshot 2026-10-17T11:33:46Z,2026-10-10T13:32:40Z --drop-week0
 *   ... --dry-run          plan only, writes nothing
 *   ... --csv <path>       use a local depth-charts CSV instead of downloading
 *   ... --games <path>     use a local games.csv instead of downloading
 *
 * NOTE: `ingestDepthCharts` still deletes the WHOLE season and re-inserts a
 * single `week: 0` snapshot, so a later ingestion run will remove these weeks
 * and continuity deltas will honestly fall back to null. Re-run this script to
 * restore them (or fix the ingest to stop wiping history).
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";

const NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const INSERT_BATCH = 500;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "true";
}

/** "1-6" | "1,2,5" | "3" → [1,2,5] / [3] */
function parseWeeks(spec) {
  if (!spec || spec === "true") return null;
  const out = new Set();
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map(Number);
    if (!Number.isInteger(a)) continue;
    const end = Number.isInteger(b) ? b : a;
    for (let w = a; w <= end; w += 1) out.add(w);
  }
  return [...out].sort((x, y) => x - y);
}

/** Minimal RFC4180 parser: quoted fields, escaped quotes, CRLF. */
function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { fields.push(field); field = ""; }
    else field += ch;
  }
  fields.push(field);
  return fields;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length !== header.length) continue;
    const row = {};
    header.forEach((h, idx) => { row[h] = cells[idx]; });
    rows.push(row);
  }
  return { header, rows };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "sports-continuity-backfill" } });
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  return res.text();
}

function firstGamedayByWeek(gamesCsv, season) {
  const { rows } = parseCsv(gamesCsv);
  const map = new Map();
  for (const r of rows) {
    if (Number(r.season) !== season) continue;
    if ((r.game_type ?? "REG") !== "REG") continue;
    const week = Number(r.week);
    const day = r.gameday;
    if (!Number.isInteger(week) || !day) continue;
    const prev = map.get(week);
    if (!prev || day < prev) map.set(week, day);
  }
  return map;
}

function snapshotByWeek(depthCsv, gameFirstDay) {
  const { rows } = parseCsv(depthCsv);
  const allDts = [...new Set(rows.map((r) => r.dt).filter(Boolean))].sort();
  const byWeek = new Map();
  for (const [week, day] of [...gameFirstDay.entries()].sort((a, b) => a[0] - b[0])) {
    const eligible = allDts.filter((dt) => dt.slice(0, 10) < day);
    if (eligible.length > 0) byWeek.set(week, eligible[eligible.length - 1]);
  }
  return { allDts, byWeek };
}

function gamedayWindowsByWeek(gamesCsv, season) {
  const { rows } = parseCsv(gamesCsv);
  const map = new Map();
  for (const r of rows) {
    if (Number(r.season) !== season) continue;
    if ((r.game_type ?? "REG") !== "REG") continue;
    const week = Number(r.week);
    const day = r.gameday;
    if (!Number.isInteger(week) || !day) continue;
    const prev = map.get(week);
    if (!prev) map.set(week, { first: day, last: day });
    else map.set(week, { first: day < prev.first ? day : prev.first, last: day > prev.last ? day : prev.last });
  }
  return map;
}

/** NFL week whose game window contains `day`; else the latest week that started before it. */
function weekForDate(windows, day) {
  const weeks = [...windows.entries()].sort((a, b) => a[0] - b[0]);
  for (const [week, w] of weeks) if (day >= w.first && day <= w.last) return week;
  let best = null;
  for (const [week, w] of weeks) if (w.first <= day) best = week;
  return best;
}

async function main() {
  const season = Number(arg("season", String(new Date().getUTCFullYear())));
  const dryRun = arg("dry-run") === "true";
  const csvPath = arg("csv");
  const gamesPath = arg("games");
  if (!Number.isInteger(season)) throw new Error("--season must be an integer");

  const depthCsv = csvPath ? readFileSync(csvPath, "utf8") : await fetchText(`${NFLVERSE_BASE}/depth_charts/depth_charts_${season}.csv`);
  const gamesCsv = gamesPath ? readFileSync(gamesPath, "utf8") : await fetchText(`${NFLVERSE_BASE}/schedules/games.csv`);

  const firstDay = firstGamedayByWeek(gamesCsv, season);
  if (firstDay.size === 0) throw new Error(`no REG weeks for season ${season} in games.csv`);
  const { allDts } = snapshotByWeek(depthCsv, firstDay);
  console.log(`season ${season}: ${allDts.length} snapshots ${allDts[0]} … ${allDts[allDts.length - 1]}`);

  const requested = parseWeeks(arg("weeks"));
  const today = new Date().toISOString().slice(0, 10);
  const snapshotSpec = arg("snapshot");
  let byWeek;
  let weeks;
  if (snapshotSpec && snapshotSpec !== "true") {
    // Explicit snapshots: label each with the NFL week whose window contains it.
    const windows = gamedayWindowsByWeek(gamesCsv, season);
    byWeek = new Map();
    for (const dt of snapshotSpec.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!allDts.includes(dt)) throw new Error(`snapshot ${dt} is not present in the ${season} asset`);
      const week = weekForDate(windows, dt.slice(0, 10));
      if (week === null) throw new Error(`cannot place snapshot ${dt} in a ${season} NFL week`);
      if (byWeek.has(week)) throw new Error(`two snapshots map to week ${week}; pass at most one per week`);
      byWeek.set(week, dt);
    }
    weeks = [...byWeek.keys()].sort((a, b) => a - b);
  } else {
    ({ byWeek } = snapshotByWeek(depthCsv, firstDay));
    weeks = (requested ?? [...byWeek.keys()]).filter((w) => byWeek.has(w) && firstDay.get(w) <= today);
  }
  if (weeks.length === 0) throw new Error("no weeks selected (check --weeks / --snapshot / season schedule)");
  for (const w of weeks) console.log(`  week ${String(w).padStart(2)} → snapshot ${byWeek.get(w)} (first gameday ${firstDay.get(w)})`);
  const dropWeek0 = arg("drop-week0") === "true";

  const wantedDt = new Map([...byWeek].filter(([w]) => weeks.includes(w)).map(([w, dt]) => [dt, w]));
  const { rows } = parseCsv(depthCsv);
  const byWeekRows = new Map();
  for (const r of rows) {
    const week = wantedDt.get(r.dt);
    if (week === undefined) continue;
    const playerName = (r.player_name || r.full_name || "").trim();
    const team = (r.team || r.club_code || "").toUpperCase();
    const position = (r.pos_abb || r.position || "").toUpperCase();
    const rank = Number(r.pos_rank ?? r.depth_team);
    if (!playerName || !team || !position || !Number.isInteger(rank)) continue;
    if (!byWeekRows.has(week)) byWeekRows.set(week, []);
    byWeekRows.get(week).push({
      playerName, gsisId: (r.gsis_id || "").trim() || null, team, position,
      depthRank: rank, role: (r.pos_slot || "").trim() || null, fetchedAt: r.dt,
    });
  }

  if (dryRun) {
    for (const w of weeks) console.log(`  week ${w}: ${(byWeekRows.get(w) ?? []).length} rows (dry run, nothing written)`);
    return;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const players = await client.query("select id, \"gsisId\" from players");
    const idByGsis = new Map(players.rows.map((p) => [p.gsisId, p.id]));
    const rights = await client.query(
      "select \"rightsSnapshot\" from depth_chart_entries where season = $1 limit 1", [season],
    );
    if (rights.rowCount === 0) throw new Error(`no existing season ${season} rows to copy rightsSnapshot from — run the normal ingest first`);
    const rightsSnapshot = rights.rows[0].rightsSnapshot;

    await client.query("begin");
    if (dropWeek0) {
      const dropped = await client.query("delete from depth_chart_entries where season = $1 and week = 0", [season]);
      console.log(`  dropped ${dropped.rowCount} unlabeled week-0 rows for season ${season}`);
    }
    await client.query("delete from depth_chart_entries where season = $1 and week = any($2::int[])", [season, weeks]);
    let total = 0;
    for (const w of weeks) {
      const list = byWeekRows.get(w) ?? [];
      for (let i = 0; i < list.length; i += INSERT_BATCH) {
        const chunk = list.slice(i, i + INSERT_BATCH);
        const values = [];
        const params = [];
        chunk.forEach((r, idx) => {
          const b = idx * 12;
          params.push(
            randomUUID(), idByGsis.get(r.gsisId) ?? null, r.gsisId, r.playerName, season, w,
            r.team, r.position, r.depthRank, r.role, JSON.stringify(rightsSnapshot), new Date(r.fetchedAt),
          );
          values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},'nflverse',$${b + 11}::jsonb,$${b + 12})`);
        });
        await client.query(
          `insert into depth_chart_entries (id,"playerId","gsisId","playerName",season,week,team,position,"depthRank",role,"sourceId","rightsSnapshot","fetchedAt")
           values ${values.join(",")}`,
          params,
        );
      }
      total += list.length;
      console.log(`  week ${w}: inserted ${list.length} rows`);
    }
    await client.query("commit");
    console.log(`done: ${total} rows across ${weeks.length} weeks`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`backfill failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
