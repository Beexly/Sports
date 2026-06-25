/**
 * Free seasonality probe — is the "early-season UNDER" a persistent effect, or did
 * 2021–2023 just run under-heavy?
 *
 * The settlement test showed UNDER-at-close ≈57% on 2021–2023 weeks 1–4 — but the
 * 27-season ALL-unders-at-close rate is ≈50% (market-efficiency-scan). So either weeks
 * 1–4 are genuinely special, or our 3-season window was lucky. This probe answers it
 * with ZERO API credits, using only nflverse closing totals + final scores across every
 * available season. Honest test: does the early-season under edge hold OUT of our sample?
 *
 * RUN: npx tsx scripts/backtest/under-seasonality-probe.ts
 */

const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const BREAK_EVEN = 0.524;

function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function binomP(hits: number, n: number): number {
  if (n === 0) return 1;
  const z = (hits - n / 2) / Math.sqrt(n / 4);
  return Math.max(0, Math.min(1, 2 * (1 - normCdf(Math.abs(z)))));
}

interface Bucket { hits: number; n: number; pushes: number; }
function b(): Bucket { return { hits: 0, n: 0, pushes: 0 }; }
function settleUnder(actual: number, line: number): 0 | 1 | null {
  if (actual === line) return null;
  return actual < line ? 1 : 0;
}
function add(bk: Bucket, actual: number, line: number): void {
  const r = settleUnder(actual, line);
  if (r === null) { bk.pushes += 1; return; }
  bk.n += 1; bk.hits += r;
}
function show(label: string, bk: Bucket): void {
  if (bk.n === 0) { console.log(`  ${label.padEnd(22)} (none)`); return; }
  const rate = bk.hits / bk.n;
  console.log(
    `  ${label.padEnd(22)} ${String(bk.n).padStart(5)} bets  under ${(rate * 100).toFixed(1).padStart(5)}%  ` +
      `p=${binomP(bk.hits, bk.n).toFixed(3)}  ${rate >= BREAK_EVEN ? "≥52.4%" : "<52.4%"}`,
  );
}

async function main(): Promise<void> {
  console.log(`\nUNDER-at-close seasonality — all nflverse seasons (free; closing total_line vs actual)\n`);
  const res = await fetch(GAMES_URL);
  if (!res.ok) { console.error("games.csv not reachable"); process.exit(2); }
  const lines = (await res.text()).split("\n");
  const header = lines[0]!.split(",");
  const col = (n: string) => header.indexOf(n);
  const c = { season: col("season"), week: col("week"), total: col("total"), totalLine: col("total_line"), gt: col("game_type") };

  const wk14 = b(), wk59 = b(), wk10p = b();
  const early14BySeason = new Map<number, Bucket>();
  let minS = Infinity, maxS = -Infinity;

  for (let i = 1; i < lines.length; i++) {
    const r = lines[i]!.split(",");
    const season = Number(r[c.season]);
    const week = Number(r[c.week]);
    const actual = Number(r[c.total]);
    const lineT = Number(r[c.totalLine]);
    const gt = r[c.gt] ?? "";
    if (gt !== "REG") continue; // regular season only — week numbers are comparable
    if (![season, week, actual, lineT].every(Number.isFinite)) continue;
    // Exclude UNPLAYED games: a completed NFL game never totals 0. Unplayed future
    // games (e.g. the not-yet-started 2026 season) carry total=0 and would read as a
    // fake under-win every time, contaminating the rate. Require a real final score.
    if (actual <= 0 || lineT <= 0) continue;
    minS = Math.min(minS, season); maxS = Math.max(maxS, season);
    if (week <= 4) {
      add(wk14, actual, lineT);
      const s = early14BySeason.get(season) ?? b();
      add(s, actual, lineT); early14BySeason.set(season, s);
    } else if (week <= 9) add(wk59, actual, lineT);
    else add(wk10p, actual, lineT);
  }

  console.log(`Seasons ${minS}–${maxS} (regular season).\n`);
  console.log("By week bucket (UNDER at the close):");
  show("weeks 1–4", wk14);
  show("weeks 5–9", wk59);
  show("weeks 10+", wk10p);

  console.log("\nWeeks 1–4 UNDER-at-close, season by season (most recent 12):");
  const seasons = [...early14BySeason.keys()].sort((a, z) => z - a).slice(0, 12).reverse();
  let over524 = 0;
  for (const s of seasons) {
    const bk = early14BySeason.get(s)!;
    show(String(s), bk);
    if (bk.n > 0 && bk.hits / bk.n >= BREAK_EVEN) over524 += 1;
  }

  console.log("\n— Read —");
  const r14 = wk14.n ? wk14.hits / wk14.n : 0;
  console.log(`  All-history weeks 1–4 under rate: ${(r14 * 100).toFixed(1)}% (p=${binomP(wk14.hits, wk14.n).toFixed(3)}, n=${wk14.n}).`);
  console.log(`  Seasons (last ${seasons.length}) where weeks 1–4 unders cleared 52.4%: ${over524}/${seasons.length}.`);
  if (r14 >= BREAK_EVEN && binomP(wk14.hits, wk14.n) < 0.05) {
    console.log(`  → Early-season under bias looks PERSISTENT across history, not a 2021–2023 fluke.`);
  } else {
    console.log(`  → Early-season under bias is NOT robust across history — our 2021–2023 window`);
    console.log(`    was likely an under-heavy sample. The honest call: do not treat it as an edge.`);
  }
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
