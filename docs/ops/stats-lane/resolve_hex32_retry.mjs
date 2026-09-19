#!/usr/bin/env node
/** Hex32 retry — date±2 + team-name aliases on UNRESOLVED_NO_SCOREBOARD_MATCH rows. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREV = path.join(__dirname, "out", "resolved_game_ids_v2.json");
const OUT = path.join(__dirname, "out", "resolved_game_ids_v3.json");
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.espn.com/",
};
const LEAGUES = {
  NFL: "football/nfl",
  NCAAF: "football/college-football",
  MLB: "baseball/mlb",
  NBA: "basketball/nba",
  NHL: "hockey/nhl",
  MLS: "soccer/usa.1",
};
const ALIASES = [
  [/\bstate\b/g, "st"],
  [/\buniversity\b/g, ""],
  [/\buniv\b/g, ""],
  [/\bcollege\b/g, ""],
  [/\bu\b/g, ""],
  [/\bsaint\b/g, "st"],
  [/\bmtn\b/g, "mountain"],
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function variants(s) {
  let n = norm(s);
  const out = new Set([n]);
  for (const [re, rep] of ALIASES) out.add(n.replace(re, " ").replace(/\s+/g, " ").trim());
  // first two tokens
  out.add(n.split(" ").slice(0, 2).join(" "));
  out.add(n.split(" ").slice(0, 1).join(""));
  return [...out].filter(Boolean);
}
function match(a, b) {
  const va = variants(a);
  const vb = variants(b);
  if (!va[0] || !vb[0]) return false;
  for (const x of va) for (const y of vb) {
    if (x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y))) return true;
    const tx = x.split(" ").filter((t) => t.length >= 3);
    const ty = new Set(y.split(" ").filter((t) => t.length >= 3));
    let hit = 0;
    for (const t of tx) if (ty.has(t)) hit++;
    if (hit >= 2) return true;
  }
  return false;
}
function dateStr(iso, d) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}
async function sb(league, ymd, cache) {
  const key = league + "|" + ymd;
  if (cache.has(key)) return cache.get(key);
  const url = `https://site.api.espn.com/apis/site/v2/sports/${LEAGUES[league]}/scoreboard?dates=${ymd}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      cache.set(key, { events: [] });
      return cache.get(key);
    }
    const data = await res.json();
    const events = (data.events || []).map((ev) => {
      const comp = (ev.competitions || [])[0] || {};
      return {
        eventId: String(ev.id),
        name: ev.name || "",
        date: ev.date || comp.date,
        competitors: (comp.competitors || []).map((c) => ({
          displayName: c.team?.displayName || c.team?.location || "",
          abbreviation: c.team?.abbreviation || "",
          homeAway: c.homeAway,
        })),
      };
    });
    cache.set(key, { events });
    return cache.get(key);
  } catch {
    cache.set(key, { events: [] });
    return cache.get(key);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(PREV)) {
    console.log(JSON.stringify({ ok: false, status: "NEED_PREV", path: PREV }));
    process.exit(2);
  }
  const prev = JSON.parse(fs.readFileSync(PREV, "utf8"));
  const unresolved = (prev.results || []).filter((r) => r.status !== "RESOLVED");
  const cache = new Map();
  const still = [];
  let newly = 0;
  for (const r of unresolved) {
    const leagues = (r.leaguesTried && r.leaguesTried.length ? r.leaguesTried : Object.keys(LEAGUES)).slice(0, 5);
    const dates = [];
    for (const d of [-2, -1, 0, 1, 2]) {
      const ymd = dateStr(r.kickoffUtc || r.commenceTime, d);
      if (ymd && !dates.includes(ymd)) dates.push(ymd);
    }
    let found = null;
    for (const league of leagues) {
      if (!LEAGUES[league]) continue;
      for (const ymd of dates) {
        const board = await sb(league, ymd, cache);
        await sleep(60);
        for (const ev of board.events || []) {
          const names = ev.competitors.map((c) => c.displayName);
          const mh = names.some((n) => match(r.homeTeam || r.home, n));
          const ma = names.some((n) => match(r.awayTeam || r.away, n));
          const core = norm(r.selection || "").replace(/\b(ml|spread|total|over|under)\b.*/g, "").trim();
          const ms = core && names.some((n) => match(core, n));
          if ((mh && ma) || (mh && ms) || (ma && ms)) {
            found = {
              status: "RESOLVED",
              canonicalEventId: ev.eventId,
              sport: league,
              homeTeam: ev.competitors.find((c) => c.homeAway === "home")?.displayName || r.homeTeam,
              awayTeam: ev.competitors.find((c) => c.homeAway === "away")?.displayName || r.awayTeam,
              kickoffUtc: ev.date || r.kickoffUtc,
              espnName: ev.name,
              retry: "date_pm2_aliases",
              ymd,
            };
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) {
      newly++;
      still.push({ ...r, ...found });
    } else {
      still.push({ ...r, status: "UNRESOLVED_AFTER_RETRY", retry: "date_pm2_aliases" });
    }
  }
  const priorResolved = (prev.results || []).filter((r) => r.status === "RESOLVED");
  const all = [...priorResolved, ...still];
  const resolved = all.filter((r) => r.status === "RESOLVED").length;
  const hex = prev.n_hex32 || all.length;
  const report = {
    ok: true,
    protocol: "hex32 retry date±2 + aliases",
    n_hex32: hex,
    prior_unresolved: unresolved.length,
    newly_resolved: newly,
    resolved_total: resolved,
    unresolved_total: hex - resolved,
    resolution_rate: hex ? resolved / hex : null,
    status_counts: all.reduce((a, r) => {
      a[r.status] = (a[r.status] || 0) + 1;
      return a;
    }, {}),
    results: all,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      ok: true,
      out: OUT,
      newly,
      resolved,
      hex,
      rate: report.resolution_rate,
      statusCounts: report.status_counts,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
