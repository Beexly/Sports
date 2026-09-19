#!/usr/bin/env node
/**
 * Resolve espnEventId hex32 hashes via ESPN college/NFL scoreboard by team names + kickoff date.
 * Law 4: unresolved stays unresolved. Law 7: no DB. ESPN public only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS = __dirname;
const INPUT = path.join(STATS, "incoming", "board-export.jsonl");
const OUT = path.join(STATS, "out", "resolved_game_ids.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.espn.com/",
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamsMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // location token
  const ta = na.split(" ").filter((x) => x.length > 2);
  const tb = nb.split(" ").filter((x) => x.length > 2);
  let hit = 0;
  for (const t of ta) if (tb.some((u) => u === t || u.startsWith(t))) hit++;
  return hit >= 2 || (ta.length && tb.length && ta[0] === tb[0] && hit >= 1);
}

function espnLeague(sport, espnId) {
  const s = String(sport || "").toUpperCase();
  const e = String(espnId || "").toLowerCase();
  if (e.includes("ncaaf") || s.includes("NCAAF") || s === "CFB") return "college-football";
  if (e.includes("nfl") || s.includes("NFL")) return "nfl";
  if (e.includes("mlb") || s.includes("MLB")) return "mlb";
  if (e.includes("nba") || s.includes("NBA")) return "nba";
  if (e.includes("nhl") || s.includes("NHL")) return "nhl";
  if (e.includes("mls") || s.includes("MLS")) return "mls";
  // default by selection heuristics later
  return null;
}

function dateStr(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchScoreboard(league, yyyymmdd) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard?dates=${yyyymmdd}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return { ok: false, status: res.status, events: [] };
  const data = await res.json();
  const events = (data.events || []).map((ev) => {
    const comp = (ev.competitions || [])[0] || {};
    return {
      eventId: String(ev.id),
      name: ev.name || "",
      date: ev.date || comp.date || null,
      competitors: (comp.competitors || []).map((c) => ({
        displayName: c.team?.displayName || c.team?.location || "",
        abbreviation: c.team?.abbreviation || "",
        homeAway: c.homeAway,
        score: c.score ?? null,
      })),
    };
  });
  return { ok: true, events };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveOne(row, cache) {
  const sport = row.sport;
  const kick = row.commenceTime;
  const home = row.homeTeamName || row.homeTeam || "";
  const away = row.awayTeamName || row.awayTeam || "";
  const selection = row.selection || "";
  const espnId = String(row.espnEventId || "");
  let league = espnLeague(sport, espnId);
  if (!league) {
    const blob = norm(`${sport} ${home} ${away} ${selection}`);
    if (blob.includes("nfl")) league = "nfl";
    else if (blob.includes("ncaaf") || blob.includes("college") || /\b(jayhawks|sun devils|blue devils|bearcats|chippewas|falcons|panthers|orange)\b/.test(blob))
      league = "college-football";
    else if (blob.includes("mlb")) league = "mlb";
  }
  if (!league || league === "mlb" || league === "nba" || league === "nhl" || league === "mls") {
    return {
      status: "UNRESOLVED_LEAGUE_OR_NON_FOOTBALL_SCOREBOARD",
      league,
      reason: "scoreboard resolver is football-only tonight; non-football hex32 need sport-specific API",
    };
  }
  // try kickoff date and day before (timezone)
  const dates = [];
  const d0 = dateStr(kick);
  if (d0) dates.push(d0);
  if (d0) {
    const d = new Date(kick);
    d.setUTCDate(d.getUTCDate() - 1);
    dates.push(dateStr(d.toISOString()));
  }
  for (const ymd of dates) {
    const key = `${league}|${ymd}`;
    if (!cache.has(key)) {
      const sb = await fetchScoreboard(league, ymd);
      cache.set(key, sb);
      await sleep(100);
    }
    const sb = cache.get(key);
    if (!sb.ok) continue;
    for (const ev of sb.events) {
      const names = ev.competitors.map((c) => c.displayName);
      const abbrs = ev.competitors.map((c) => c.abbreviation);
      const matchHome = names.some((n) => teamsMatch(home, n) || teamsMatch(home, abbrs.find((a) => a && teamsMatch(a, home)) || ""));
      const matchAway = names.some((n) => teamsMatch(away, n) || (selection && teamsMatch(selection, n)));
      const matchSel =
        selection &&
        names.some((n) => {
          const core = norm(selection).replace(/\bml\b.*$/, "").replace(/\bspread\b.*$/, "").trim();
          return core && (norm(n).includes(core.split(" ").slice(0, 2).join(" ")) || core.includes(norm(n)));
        });
      if ((matchHome && matchAway) || (matchHome && matchSel) || (matchAway && matchSel)) {
        return {
          status: "RESOLVED",
          canonicalEventId: ev.eventId,
          sport: league === "nfl" ? "NFL" : league === "college-football" ? "NCAAF" : league.toUpperCase(),
          homeTeam: ev.competitors.find((c) => c.homeAway === "home")?.displayName || home,
          awayTeam: ev.competitors.find((c) => c.homeAway === "away")?.displayName || away,
          kickoffUtc: ev.date || kick,
          espnName: ev.name,
          matchedOn: { home, away, selection, league, ymd },
        };
      }
    }
  }
  return {
    status: "UNRESOLVED_NO_SCOREBOARD_MATCH",
    league,
    home,
    away,
    selection,
    kickoffUtc: kick,
    triedDates: dates,
  };
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ ok: false, status: "DATA_BLOCKED", path: INPUT }, null, 2));
    console.log(JSON.stringify({ ok: false, status: "DATA_BLOCKED" }));
    process.exit(2);
  }
  const rows = fs
    .readFileSync(INPUT, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const hex = rows.filter((r) => /^[a-f0-9]{32}$/i.test(String(r.espnEventId || "")));
  const cache = new Map();
  const results = [];
  let resolved = 0;
  let unresolved = 0;
  const statusCount = {};

  for (const r of hex) {
    const out = await resolveOne(r, cache);
    const rec = {
      gameId: r.gameId,
      pickId: r.pickId,
      hexEventId: r.espnEventId,
      selection: r.selection,
      sportField: r.sport,
      commenceTime: r.commenceTime,
      homeTeam: r.homeTeam || r.homeTeamName,
      awayTeam: r.awayTeam || r.awayTeamName,
      ...out,
    };
    results.push(rec);
    statusCount[out.status] = (statusCount[out.status] || 0) + 1;
    if (out.status === "RESOLVED") resolved++;
    else unresolved++;
  }

  // also count already-ESPN rows as pre-resolved
  const alreadyEspn = rows.filter((r) => /^espn:/i.test(String(r.espnEventId || "")));

  const report = {
    ok: true,
    protocol: "ESPN scoreboard team+kickoff join (public); no DB",
    n_board_export: rows.length,
    n_hex32_espnField: hex.length,
    n_already_espn_prefixed: alreadyEspn.length,
    resolved,
    unresolved,
    resolution_rate_hex32: hex.length ? resolved / hex.length : null,
    status_counts: statusCount,
    mission_claim: "100% of 45 NCAAF 0-book hex32 — subset of hex pool",
    ncaaf_0book_hex32: hex.filter(
      (r) =>
        r.pickType === "MONEYLINE" &&
        Number(r.bookmakerCount) === 0 &&
        /model signal/i.test(String(r.selection || "")),
    ).length,
    default_sport_fallback_rows: rows.filter((r) => {
      const s = String(r.sport || "");
      return !s || s.length > 20; // CUID-like
    }).length,
    notes: [
      "closingSpread/closingTotal NOT populated — no lawful close archive join in this export; left null",
      "Non-football hex32 (MLB/NBA/etc) need sport-specific APIs — football resolver only",
      "Zero fallthrough to 'default/unassigned' is measured by status UNRESOLVED_* not by inventing sports",
    ],
    results,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      ok: true,
      out: OUT,
      hex32: hex.length,
      resolved,
      unresolved,
      rate: report.resolution_rate_hex32,
      statusCounts: statusCount,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
