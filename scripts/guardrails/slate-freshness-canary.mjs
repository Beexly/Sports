#!/usr/bin/env node
/**
 * Slate freshness canary.
 *
 * The storefront shipped a Week 9 catalog through Week 10 because the week label is a
 * hardcoded string with nothing checking it. This canary compares what the catalog claims
 * against the live NFL week from ESPN and exits non-zero on a mismatch, so staleness fails
 * loudly instead of quietly selling expired games.
 *
 * Usage: node scripts/guardrails/slate-freshness-canary.mjs [--json]
 * Exit: 0 fresh, 1 stale/mismatch, 2 could not determine.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOG = join(HERE, "..", "..", "apps", "web", "lib", "packages", "catalog.ts");
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

function catalogWeek() {
  const src = readFileSync(CATALOG, "utf8");
  const m = src.match(/slateWindowLabel:\s*"Week (\d+)/);
  return m ? Number(m[1]) : null;
}

async function liveWeek() {
  // The plain scoreboard endpoint returns the *last* week of the season, not the current
  // one, so it cannot be trusted here. Walk the season's week calendar and take the window
  // that actually contains now.
  const base =
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons";
  const now = Date.now();
  for (const year of [new Date().getUTCFullYear(), new Date().getUTCFullYear() - 1]) {
    for (let w = 1; w <= 25; w += 1) {
      let d;
      try {
        const res = await fetch(`${base}/${year}/types/2/weeks/${w}`);
        if (!res.ok) break;
        d = await res.json();
      } catch {
        break;
      }
      const start = Date.parse(d.startDate ?? "");
      const end = Date.parse(d.endDate ?? "");
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (now >= start && now <= end) return { week: w, year };
      if (now < start) return { week: w, year }; // next scheduled week
    }
  }
  return null;
}

const claimed = catalogWeek();
const live = await liveWeek();

if (claimed === null) {
  console.error("CANARY FAIL: could not read slateWindowLabel from catalog.ts");
  process.exit(2);
}
if (live === null) {
  console.error("CANARY FAIL: could not determine the live NFL week from ESPN");
  process.exit(2);
}

// A catalog is healthy if it sells the current week or the next one (pre-sale ahead of a
// Thursday game is normal and desirable). It is stale only when it sells a week that has
// already finished, or one further out than the next scheduled week.
const acceptable = new Set([live.week, live.week + 1]);
const ok = acceptable.has(claimed);
const payload = {
  catalogWeek: claimed,
  liveWeek: live.week,
  acceptableWeeks: [...acceptable],
  season: live.year,
  status: ok ? "fresh" : "STALE",
  message: ok
    ? `catalog week ${claimed} is current or next (live week ${live.week})`
    : claimed < live.week
      ? `catalog advertises Week ${claimed}, which has already finished (live week ${live.week})`
      : `catalog advertises Week ${claimed}, beyond the next scheduled week ${live.week + 1}`,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`${ok ? "PASS" : "CANARY FAIL"}: ${payload.message}`);
}

process.exit(ok ? 0 : 1);
