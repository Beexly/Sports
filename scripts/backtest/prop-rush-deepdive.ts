/**
 * RUSHING-YARDS UNDER — deep dive (zero new credits; reuses the cached prop snapshots).
 *
 * The probe found a robust directional bias: rushing-yards UNDER hit ~54% across both
 * prop-history seasons (2023, 2024), early and mid-season. That beats a coin flip but is
 * marginal vs the 52.4% vig break-even. Theory says the public-overs bias is STRONGEST on
 * high lines (star RBs get over-bet), so unders on high rush lines should hit harder.
 *
 * This re-analyzes the SAME cached lines (no API spend) pooled across 2023+2024 weeks 1–8,
 * broken down by PRE-REGISTERED line-magnitude buckets, FDR-controlled. A bucket that
 * clears break-even with significance is a sharper candidate; if none does, the bias is
 * real but too diffuse to bank. Honest either way.
 *
 * RUN: npx tsx scripts/backtest/prop-rush-deepdive.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { median } from "../../packages/prediction-engine/src/clv-feasibility.js";
import { benjaminiHochberg, type PValueEntry } from "../../packages/prediction-engine/src/multiple-testing.js";
import type { HistoricalEventOddsSnapshot } from "../../packages/data-ingestion/src/odds-api-client.js";

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const STATS_URLS = (s: number) => [
  `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_${s}.csv`,
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${s}.csv`,
];
const CACHE_DIR = process.env["PROP_CACHE_DIR"] ?? join(process.env["TMPDIR"] ?? "/tmp", "prop-efficiency-cache");
const BREAK_EVEN = 0.524;
const CLOSE_OFFSET_H = 1.5;
const SEASONS = [2023, 2024, 2025];
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

function hourFloorIso(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}
function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.'’]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}
function parseLine(line: string): string[] {
  const out: string[] = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
    else if (ch === '"') inQ = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split("\n");
  const header = parseLine(lines[0]!.replace(/\r$/, ""));
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) { if (!lines[i]) continue; const c = parseLine(lines[i]!.replace(/\r$/, "")); if (c.length >= header.length) rows.push(c); }
  return { header, rows };
}
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const binomP = (h: number, n: number) => n === 0 ? 1 : Math.max(0, Math.min(1, 2 * (1 - normCdf(Math.abs((h - n / 2) / Math.sqrt(n / 4))))));
function wilson(h: number, n: number): [number, number] {
  if (n === 0) return [0, 0]; const p = h / n, z = 1.96, z2 = z * z, d = 1 + z2 / n;
  const c = (p + z2 / (2 * n)) / d, hw = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d; return [c - hw, c + hw];
}

const TEAM_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens", BUF: "Buffalo Bills",
  CAR: "Carolina Panthers", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars", KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders", LAC: "Los Angeles Chargers", LA: "Los Angeles Rams", LAR: "Los Angeles Rams",
  MIA: "Miami Dolphins", MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers",
  SF: "San Francisco 49ers", SEA: "Seattle Seahawks", TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

interface Bet { line: number; actual: number; under: 0 | 1 | null; favDog: "FAV" | "DOG" | null; }

async function main(): Promise<void> {
  console.log(`\nRUSHING-YARDS UNDER deep dive — pooled ${SEASONS.join("+")} wks ${WEEKS[0]}-${WEEKS.at(-1)} (cached, $0)\n`);

  // settle maps per season: name+week -> { rushing_yards, team }
  const settle = new Map<string, { ry: number; team: string }>();
  for (const s of SEASONS) {
    let r: Response | null = null;
    for (const u of STATS_URLS(s)) { const x = await fetch(u); if (x.ok) { r = x; break; } }
    if (!r) { console.error(`stats ${s} not reachable`); process.exit(2); }
    const { header, rows } = parseCsv(await r.text());
    const ni = header.indexOf("player_display_name"), wi = header.indexOf("week"), ry = header.indexOf("rushing_yards");
    const ti = header.indexOf("team") >= 0 ? header.indexOf("team") : header.indexOf("recent_team");
    for (const row of rows) { const nm = row[ni], wk = Number(row[wi]); if (!nm || !Number.isFinite(wk)) continue; settle.set(`${s}|${normName(nm)}|${wk}`, { ry: Number(row[ry] ?? 0) || 0, team: ti >= 0 ? (row[ti] ?? "") : "" }); }
  }

  // schedule
  const gr = await fetch(GAMES_URL); const { header: gh, rows: grows } = parseCsv(await gr.text());
  const gc = (n: string) => gh.indexOf(n);

  const bets: Bet[] = [];
  let games = 0, missing = 0;
  for (const row of grows) {
    const season = Number(row[gc("season")]); const week = Number(row[gc("week")]);
    if (!SEASONS.includes(season) || !WEEKS.includes(week)) continue;
    const day = row[gc("gameday")], time = row[gc("gametime")];
    if (!day || !time) continue;
    const ms = Date.parse(`${day}T${time}:00-05:00`); if (!Number.isFinite(ms)) continue;
    const closeIso = hourFloorIso(ms - CLOSE_OFFSET_H * 3_600_000);
    const home = row[gc("home_team")] ?? "", away = row[gc("away_team")] ?? "";
    const spread = Number(row[gc("spread_line")]); // home-perspective closing spread
    const p = join(CACHE_DIR, `odds_${away}_${home}_${closeIso}`.replace(/[:.\/ ]/g, "-") + ".json");
    if (!existsSync(p)) { missing++; continue; }
    games++;
    const odds = JSON.parse(readFileSync(p, "utf8")) as HistoricalEventOddsSnapshot;
    const linesByPlayer = new Map<string, number[]>();
    for (const book of odds.data.bookmakers ?? []) for (const mk of book.markets ?? []) {
      if (mk.key !== "player_rush_yds") continue;
      for (const o of mk.outcomes) { if (o.name !== "Over" || !o.description || typeof o.point !== "number") continue; const a = linesByPlayer.get(o.description) ?? []; a.push(o.point); linesByPlayer.set(o.description, a); }
    }
    for (const [player, pts] of linesByPlayer) {
      if (pts.length < 2) continue; const line = median(pts); if (line == null) continue;
      const rec = settle.get(`${season}|${normName(player)}|${week}`);
      if (rec === undefined) continue;
      // Favored/underdog of the player's team (home perspective: spread<0 => home favored).
      let favDog: "FAV" | "DOG" | null = null;
      if (Number.isFinite(spread) && spread !== 0 && rec.team) {
        if (rec.team === home) favDog = spread < 0 ? "FAV" : "DOG";
        else if (rec.team === away) favDog = spread > 0 ? "FAV" : "DOG";
      }
      bets.push({ line, actual: rec.ry, under: rec.ry === line ? null : (rec.ry < line ? 1 : 0), favDog });
    }
  }
  const settled = bets.filter((b) => b.under !== null);
  console.log(`Games read from cache: ${games} (missing: ${missing}). Settled rush lines: ${settled.length}\n`);

  function report(label: string, subset: Bet[]): { key: string; p: number; n: number; rate: number } | null {
    const s = subset.filter((b) => b.under !== null);
    const n = s.length; if (n === 0) { console.log(`  ${label.padEnd(22)} (none)`); return null; }
    const hits = s.reduce((a, b) => a + (b.under as number), 0); const rate = hits / n; const [lo, hi] = wilson(hits, n);
    console.log(`  ${label.padEnd(22)} ${String(n).padStart(4)}  UNDER ${(rate * 100).toFixed(1).padStart(5)}%  [${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}]  p=${binomP(hits, n).toFixed(3)}  ${rate >= BREAK_EVEN ? "≥52.4% ✓" : "<52.4%"}`);
    return { key: label, p: binomP(hits, n), n, rate };
  }

  console.log("Pooled, all rush lines:");
  report("ALL", settled);

  console.log("\nBy PRE-REGISTERED line-magnitude bucket (theory: high lines are over-shaded):");
  const buckets: Array<[string, (b: Bet) => boolean]> = [
    ["line < 30", (b) => b.line < 30],
    ["line 30–49.5", (b) => b.line >= 30 && b.line < 50],
    ["line 50–69.5", (b) => b.line >= 50 && b.line < 70],
    ["line ≥ 70", (b) => b.line >= 70],
  ];
  const fdr: PValueEntry[] = [];
  for (const [label, f] of buckets) { const r = report(label, settled.filter(f)); if (r && r.n >= 100) fdr.push({ key: r.key, pValue: r.p }); }

  const disc = benjaminiHochberg(fdr, 0.1);
  console.log(`\nFDR over ${fdr.length} adequately-sampled buckets (q=0.10):`);
  const discMap = new Map(disc.results.map((r) => [r.key, r]));
  for (const [label] of buckets) { const d = discMap.get(label); if (d) console.log(`  ${label.padEnd(22)} q=${d.qValue.toFixed(3)}  discovery=${d.discovery}`); }

  console.log("\nBy game script (theory: underdog RBs get abandoned trailing → stronger UNDER):");
  const withFD = settled.filter((b) => b.favDog !== null);
  console.log(`  (classifiable by spread: ${withFD.length} of ${settled.length} lines)`);
  report("UNDERDOG team RB", withFD.filter((b) => b.favDog === "DOG"));
  report("FAVORED team RB", withFD.filter((b) => b.favDog === "FAV"));
  console.log("  Cross with high lines (≥50) — the over-bet stars:");
  report("DOG & line ≥ 50", withFD.filter((b) => b.favDog === "DOG" && b.line >= 50));
  report("FAV & line ≥ 50", withFD.filter((b) => b.favDog === "FAV" && b.line >= 50));

  console.log("\n— Read —");
  console.log("  A high-line bucket that clears 52.4% with FDR significance is a sharper, more");
  console.log("  bankable subset than the diffuse ~54% overall. If none does, the rush-under bias");
  console.log("  is real but too thin/uniform to beat vig with confidence on 2 seasons of data.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
