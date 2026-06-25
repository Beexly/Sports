/**
 * GSE — Free betting-market efficiency scan (due-diligence BEFORE any paid odds spend).
 *
 * Question: is there ANY exploitable inefficiency in NFL CLOSING lines that a simple,
 * pre-registered angle could beat — enough to justify paying for odds data later?
 *
 * Uses only FREE nflverse games data (closing spread_line/total_line + final scores) and
 * the engine's Benjamini-Hochberg FDR control (multiple-testing.ts) so that testing many
 * angles at once does not manufacture a false "winner". The break-even bar for a -110 bet
 * is 52.38% — an angle must clear that AND survive FDR to be even a candidate edge.
 *
 * HONEST SCOPE: beating the CLOSING line is the HARDEST bar (closing lines are the market's
 * most efficient estimate). A null result does NOT prove no edge exists earlier in the week
 * (that is CLV, which needs opening→closing movement = paid data) — it proves there is no
 * FREE edge sitting in the closing number, which is the precondition for deciding whether
 * paid line-movement data is worth chasing. Nothing here bets real money or flips a gate.
 *
 * RUN: NODE_OPTIONS=--use-system-ca NODE_USE_ENV_PROXY=1 npx tsx scripts/backtest/market-efficiency-scan.ts
 */

import { benjaminiHochberg, type PValueEntry } from "../../packages/prediction-engine/src/multiple-testing.js";

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const BREAK_EVEN = 0.5238; // -110 vig break-even

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split("\n");
  if (lines.length === 0) return [];
  const header = lines[0]!.split(",");
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(",");
    if (cells.length < header.length) continue;
    const o: Record<string, string> = {};
    header.forEach((h, idx) => { o[h] = cells[idx] ?? ""; });
    out.push(o);
  }
  return out;
}
function n(r: Record<string, string>, k: string): number {
  const v = r[k]; if (v === undefined || v === "") return Number.NaN;
  const x = Number(v); return Number.isFinite(x) ? x : Number.NaN;
}

interface Game {
  season: number; week: number; weekday: string; divGame: number;
  homeRest: number; awayRest: number; spread: number; total: number;
  homeMargin: number; actualTotal: number;
}

// Standard normal CDF (Abramowitz-Stegun) for a two-sided binomial-vs-0.5 p-value.
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function twoSidedP(hits: number, total: number): number {
  if (total === 0) return 1;
  const z = (hits - total / 2) / Math.sqrt(total / 4);
  return Math.max(0, Math.min(1, 2 * (1 - normCdf(Math.abs(z)))));
}

// An angle returns: 1 (bet wins), 0 (bet loses), or null (game excluded / push).
type Angle = { name: string; bet: (g: Game) => 0 | 1 | null };

const ANGLES: Angle[] = [
  { name: "ALL: bet HOME ATS", bet: (g) => atsHome(g) },
  { name: "ALL: bet AWAY ATS", bet: (g) => flip(atsHome(g)) },
  { name: "ALL: bet OVER", bet: (g) => ou(g, true) },
  { name: "ALL: bet UNDER", bet: (g) => ou(g, false) },
  { name: "HOME DOGS cover", bet: (g) => (g.spread < 0 ? atsHome(g) : null) },
  { name: "HOME FAVES cover", bet: (g) => (g.spread > 0 ? atsHome(g) : null) },
  { name: "BIG FAVES (>=7) cover", bet: (g) => (Math.abs(g.spread) >= 7 ? favCover(g) : null) },
  { name: "BIG DOGS (>=7) cover", bet: (g) => (Math.abs(g.spread) >= 7 ? flip(favCover(g)) : null) },
  { name: "HOME rest edge (>=3): HOME ATS", bet: (g) => (g.homeRest - g.awayRest >= 3 ? atsHome(g) : null) },
  { name: "AWAY rest edge (>=3): AWAY ATS", bet: (g) => (g.awayRest - g.homeRest >= 3 ? flip(atsHome(g)) : null) },
  { name: "PRIMETIME (Thu/Mon): UNDER", bet: (g) => (g.weekday === "Thursday" || g.weekday === "Monday" ? ou(g, false) : null) },
  { name: "DIVISIONAL: UNDER", bet: (g) => (g.divGame === 1 ? ou(g, false) : null) },
  { name: "HIGH TOTAL (>=49): UNDER", bet: (g) => (g.total >= 49 ? ou(g, false) : null) },
  { name: "LOW TOTAL (<=39): OVER", bet: (g) => (g.total <= 39 ? ou(g, true) : null) },
  { name: "EARLY (wk<=4): OVER", bet: (g) => (g.week <= 4 ? ou(g, true) : null) },
  { name: "LATE (wk>=15): UNDER", bet: (g) => (g.week >= 15 ? ou(g, false) : null) },
];

function atsHome(g: Game): 0 | 1 | null {
  if (g.homeMargin === g.spread) return null; // push
  return g.homeMargin > g.spread ? 1 : 0;
}
function favCover(g: Game): 0 | 1 | null {
  const a = atsHome(g); if (a === null) return null;
  return g.spread > 0 ? a : flip(a); // if home favored, home cover = fav cover; else away is fav
}
function ou(g: Game, over: boolean): 0 | 1 | null {
  if (g.actualTotal === g.total) return null; // push
  const isOver = g.actualTotal > g.total;
  return (over ? isOver : !isOver) ? 1 : 0;
}
function flip(x: 0 | 1 | null): 0 | 1 | null { return x === null ? null : ((1 - x) as 0 | 1); }

async function main(): Promise<void> {
  console.log("\nGSE — free betting-market efficiency scan (closing lines, all seasons)\n");
  const res = await fetch(GAMES_URL);
  if (!res.ok) { console.error("games.csv not reachable"); process.exit(2); }
  const rows = parseCsv(await res.text());
  const games: Game[] = [];
  for (const r of rows) {
    const spread = n(r, "spread_line");
    const total = n(r, "total_line");
    const homeMargin = n(r, "result");
    const actualTotal = n(r, "total");
    if ([spread, total, homeMargin, actualTotal].some((x) => !Number.isFinite(x))) continue; // unplayed/missing
    games.push({
      season: n(r, "season"), week: n(r, "week"), weekday: r["weekday"] ?? "",
      divGame: n(r, "div_game") || 0, homeRest: n(r, "home_rest") || 0, awayRest: n(r, "away_rest") || 0,
      spread, total, homeMargin, actualTotal,
    });
  }
  const seasons = [...new Set(games.map((g) => g.season))].sort();
  console.log(`Loaded ${games.length} completed games, seasons ${seasons[0]}–${seasons.at(-1)}.\n`);

  type Row = { name: string; hits: number; n: number; rate: number; p: number };
  const rowsOut: Row[] = [];
  for (const a of ANGLES) {
    let hits = 0, tot = 0;
    for (const g of games) { const b = a.bet(g); if (b === null) continue; tot += 1; hits += b; }
    if (tot < 30) continue;
    rowsOut.push({ name: a.name, hits, n: tot, rate: hits / tot, p: twoSidedP(hits, tot) });
  }

  const fdr = benjaminiHochberg(rowsOut.map((r): PValueEntry => ({ key: r.name, pValue: r.p })), 0.1);
  const disc = new Map(fdr.results.map((r) => [r.key, r]));

  rowsOut.sort((a, b) => b.rate - a.rate);
  console.log("angle                                    n     hit%    p-val   FDR-disc  beats52.4%");
  for (const r of rowsOut) {
    const d = disc.get(r.name)!;
    console.log(
      `${r.name.padEnd(40)} ${String(r.n).padStart(4)}  ${(r.rate * 100).toFixed(1).padStart(5)}  ` +
      `${r.p.toFixed(4)}   ${String(d.discovery).padStart(5)}     ${r.rate >= BREAK_EVEN}`,
    );
  }
  const winners = rowsOut.filter((r) => disc.get(r.name)!.discovery && r.rate >= BREAK_EVEN);
  console.log(`\nFDR discoveries clearing the 52.4% break-even: ${winners.length}`);
  if (winners.length === 0) {
    console.log("→ No free edge in the closing line. A betting edge, if any, lives in pre-close");
    console.log("  movement (CLV) — which needs paid line-movement data. Verdict: defer the spend.\n");
  } else {
    for (const w of winners) console.log(`  • ${w.name}: ${(w.rate * 100).toFixed(1)}% over ${w.n} bets`);
    console.log("");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
