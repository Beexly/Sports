#!/usr/bin/env node
/**
 * Multi-league ESPN scoreboard resolver for hex32 espnEventId values.
 * Football + MLB + NBA + NHL + MLS. No DB. Unresolved stays unresolved.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, "incoming", "board-export.jsonl");
const OUT = path.join(__dirname, "out", "resolved_game_ids.json");
const OUT_V2 = path.join(__dirname, "out", "resolved_game_ids_v2.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.espn.com/",
};

const LEAGUES = {
  // league key -> espn path segment under sports
  NFL: { path: "football/nfl", sport: "NFL" },
  NCAAF: { path: "football/college-football", sport: "NCAAF" },
  MLB: { path: "baseball/mlb", sport: "MLB" },
  NBA: { path: "basketball/nba", sport: "NBA" },
  NHL: { path: "hockey/nhl", sport: "NHL" },
  MLS: { path: "soccer/usa.1", sport: "MLS" },
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s) {
  return norm(s)
    .split(" ")
    .filter((x) => x.length >= 3);
}

function teamsMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  let hit = 0;
  for (const t of ta) if (tb.includes(t)) hit++;
  return hit >= 2 || (ta[0] === tb[0] && hit >= 1);
}

function dateStr(iso, deltaDays = 0) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function inferLeagues(row) {
  const s = norm(`${row.sport} ${row.homeTeam || ""} ${row.awayTeam || ""} ${row.selection || ""} ${row.espnEventId || ""}`);
  const out = [];
  const field = String(row.sport || "").toUpperCase();
  if (LEAGUES[field]) out.push(field);
  if (/\bnfl\b|nfl:/.test(s) && !out.includes("NFL")) out.push("NFL");
  if (/ncaaf|college|jayhawks|sun devils|blue devils|bearcats|chippewas|orange|panthers|falcons|wolverines|buckeyes/.test(s) && !out.includes("NCAAF"))
    out.push("NCAAF");
  if (/\bmlb\b|dodgers|yankees|cardinals|tigers|braves|padres|cubs/.test(s) && !out.includes("MLB")) out.push("MLB");
  if (/\bnba\b|celtics|lakers|bucks|nuggets/.test(s) && !out.includes("NBA")) out.push("NBA");
  if (/\bnhl\b|bruins|kings|oilers/.test(s) && !out.includes("NHL")) out.push("NHL");
  if (/\bmls\b|inter miami|galaxy|sounders/.test(s) && !out.includes("MLS")) out.push("MLS");
  // hex32 NCAAF moneyline signal rows often still say NCAAF in sport field
  if (!out.length) out.push("NCAAF", "MLB", "NFL", "NBA", "NHL", "MLS");
  return out.slice(0, 4);
}

async function fetchScoreboard(leagueKey, yyyymmdd, cache) {
  const key = `${leagueKey}|${yyyymmdd}`;
  if (cache.has(key)) return cache.get(key);
  const meta = LEAGUES[leagueKey];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${meta.path}/scoreboard?dates=${yyyymmdd}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const rec = { ok: false, status: res.status, events: [] };
      cache.set(key, rec);
      return rec;
    }
    const data = await res.json();
    const events = (data.events || []).map((ev) => {
      const comp = (ev.competitions || [])[0] || {};
      return {
        eventId: String(ev.id),
        name: ev.name || "",
        date: ev.date || comp.date || null,
        competitors: (comp.competitors || []).map((c) => ({
          displayName: c.team?.displayName || c.team?.location || c.team?.name || "",
          abbreviation: c.team?.abbreviation || "",
          homeAway: c.homeAway,
        })),
      };
    });
    const rec = { ok: true, events };
    cache.set(key, rec);
    return rec;
  } catch (e) {
    const rec = { ok: false, status: 0, error: String(e), events: [] };
    cache.set(key, rec);
    return rec;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveOne(row, cache) {
  const home = row.homeTeamName || row.homeTeam || "";
  const away = row.awayTeamName || row.awayTeam || "";
  const selection = row.selection || "";
  const leagues = inferLeagues(row);
  const dates = [];
  for (const d of [-1, 0, 1]) {
    const ymd = dateStr(row.commenceTime, d);
    if (ymd && !dates.includes(ymd)) dates.push(ymd);
  }
  for (const league of leagues) {
    for (const ymd of dates) {
      const sb = await fetchScoreboard(league, ymd, cache);
      if (!sb.ok || !sb.events.length) continue;
      await sleep(80);
      for (const ev of sb.events) {
        const names = ev.competitors.map((c) => c.displayName);
        const mh = names.some((n) => teamsMatch(home, n));
        const ma = names.some((n) => teamsMatch(away, n));
        const core = norm(selection)
          .replace(/\b(ml|spread|total|over|under)\b.*/g, "")
          .trim();
        const ms =
          core &&
          names.some((n) => {
            const tn = tokens(n);
            const tc = tokens(core);
            if (!tn.length || !tc.length) return false;
            let hit = 0;
            for (const t of tc.slice(0, 3)) if (tn.includes(t)) hit++;
            return hit >= 2;
          });
        if ((mh && ma) || (mh && ms) || (ma && ms)) {
          return {
            status: "RESOLVED",
            canonicalEventId: ev.eventId,
            sport: LEAGUES[league].sport,
            homeTeam: ev.competitors.find((c) => c.homeAway === "home")?.displayName || home,
            awayTeam: ev.competitors.find((c) => c.away === "away")?.displayName || away,
            kickoffUtc: ev.date || row.commenceTime,
            espnName: ev.name,
            leagueTried: league,
            ymd,
          };
        }
      }
    }
  }
  return {
    status: "UNRESOLVED_NO_SCOREBOARD_MATCH",
    leaguesTried: leagues,
    home,
    away,
    selection: selection && String(selection).slice(0, 80),
    kickoffUtc: row.commenceTime,
  };
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.log(JSON.stringify({ ok: false, status: "DATA_BLOCKED", path: INPUT }));
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
  const statusCount = {};
  let resolved = 0;

  for (const r of hex) {
    const out = await resolveOne(r, cache);
    const rec = {
      gameId: r.gameId,
      pickId: r.pickId,
      hexEventId: r.espnEventId,
      sportField: r.sport,
      pickType: r.pickType,
      selection: r.selection,
      homeTeam: r.homeTeam || r.homeTeamName,
      awayTeam: r.awayTeam || r.awayTeamName,
      commenceTime: r.commenceTime,
      closingSpread: null,
      closingTotal: null,
      ...out,
    };
    results.push(rec);
    statusCount[out.status] = (statusCount[out.status] || 0) + 1;
    if (out.status === "RESOLVED") resolved++;
  }

  const report = {
    ok: true,
    protocol: "ESPN multi-league scoreboard (public)",
    generatedAt: new Date().toISOString(),
    n_export: rows.length,
    n_hex32: hex.length,
    n_espn_prefixed: rows.filter((r) => /^espn:/i.test(String(r.espnEventId || ""))).length,
    resolved,
    unresolved: hex.length - resolved,
    resolution_rate: hex.length ? resolved / hex.length : null,
    status_counts: statusCount,
    mission_100pct: "NOT ACHIEVED unless resolved==n_hex32",
    notes: [
      "closingSpread/closingTotal null — no close archive in export",
      "Unresolved never defaulted to a fake sport",
    ],
    results,
  };
  fs.writeFileSync(OUT_V2, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      ok: true,
      out: OUT_V2,
      hex32: hex.length,
      resolved,
      rate: report.resolution_rate,
      statusCounts: statusCount,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
