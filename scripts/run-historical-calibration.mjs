#!/usr/bin/env node
/**
 * run-historical-calibration.mjs — REAL calibration over real historical games.
 *
 * Fetches the nflverse all-seasons schedule (games.csv: every game since 1999 with
 * CLOSING moneylines + final scores), de-vigs each closing line into a market
 * home-win probability, and measures how well-calibrated that market is against
 * actual outcomes (Brier score, Expected Calibration Error, a reliability curve).
 *
 * Why this is the honest "run calibration": our own PICK model can't be calibrated
 * until real settled picks exist (none do yet). But the market closing line is a
 * settled, real probability we CAN score — it establishes the calibration baseline
 * the signal engine must beat, and it proves the de-vig + calibration math on real
 * data end to end. Read-only; nflverse is CC-BY-4.0.
 *
 *   node scripts/run-historical-calibration.mjs [minSeason]
 */
import { gunzipSync } from "node:zlib";

const GAMES_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";
const minSeason = Number(process.argv[2] ?? 1999);

function parseCsv(text) {
  const rows = [];
  let field = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])));
}

// American odds -> raw implied probability.
function impliedProb(ml) {
  const n = Number(ml);
  if (!Number.isFinite(n) || n === 0) return null;
  return n < 0 ? -n / (-n + 100) : 100 / (n + 100);
}

async function main() {
  process.stdout.write(`Fetching ${GAMES_URL} ...\n`);
  const res = await fetch(GAMES_URL);
  if (!res.ok) throw new Error(`fetch failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
  const games = parseCsv(text);

  // Build calibration samples from settled games with both closing moneylines.
  const samples = [];
  for (const g of games) {
    if (Number(g.season) < minSeason) continue;
    const hs = Number(g.home_score), as = Number(g.away_score);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || g.home_score === "" || g.away_score === "") continue;
    if (hs === as) continue; // ties excluded (no binary home win)
    const ph = impliedProb(g.home_moneyline), pa = impliedProb(g.away_moneyline);
    if (ph === null || pa === null) continue;
    const overround = ph + pa;
    if (overround <= 0) continue;
    samples.push({ p: ph / overround, y: hs > as ? 1 : 0 }); // de-vig (proportional) home win prob
  }

  const n = samples.length;
  if (n === 0) { process.stdout.write("No samples (no closing moneylines in range).\n"); return; }

  const baseRate = samples.reduce((s, x) => s + x.y, 0) / n;
  const brier = samples.reduce((s, x) => s + (x.p - x.y) ** 2, 0) / n;

  // ECE + reliability over 10 equal-width bins.
  const BINS = 10;
  const cnt = Array(BINS).fill(0), fSum = Array(BINS).fill(0), oSum = Array(BINS).fill(0);
  for (const x of samples) {
    let b = Math.floor(x.p * BINS); if (b === BINS) b = BINS - 1;
    cnt[b]++; fSum[b] += x.p; oSum[b] += x.y;
  }
  let ece = 0;
  const curve = [];
  for (let b = 0; b < BINS; b++) {
    if (!cnt[b]) continue;
    const meanP = fSum[b] / cnt[b], obs = oSum[b] / cnt[b];
    ece += (cnt[b] / n) * Math.abs(meanP - obs);
    curve.push({ bin: `${(b * 10)}–${(b + 1) * 10}%`, n: cnt[b], predicted: +(meanP * 100).toFixed(1), actual: +(obs * 100).toFixed(1) });
  }

  const seasons = samples.length ? `${minSeason}–present` : "—";
  process.stdout.write(`\n=== Market closing-line calibration (NFL, ${seasons}) ===\n`);
  process.stdout.write(`Settled games scored : ${n}\n`);
  process.stdout.write(`Home-win base rate   : ${(baseRate * 100).toFixed(1)}%\n`);
  process.stdout.write(`Brier score          : ${brier.toFixed(4)}  (lower is better; 0.25 = coin flip)\n`);
  process.stdout.write(`Expected Calib. Error: ${ece.toFixed(4)}  (0 = perfectly calibrated)\n`);
  process.stdout.write(`\nReliability curve (predicted vs actual home-win %):\n`);
  for (const r of curve) process.stdout.write(`  ${r.bin.padStart(8)}  n=${String(r.n).padStart(5)}  pred ${String(r.predicted).padStart(5)}%  actual ${String(r.actual).padStart(5)}%\n`);
  process.stdout.write(`\nInterpretation: this is the baseline the signal engine must beat. Our own pick\n`);
  process.stdout.write(`model is NOT calibrated here — that requires real settled picks, which do not\n`);
  process.stdout.write(`exist yet. This proves the de-vig + calibration math on real outcomes.\n`);
}

main().catch((e) => { process.stderr.write(`ERROR: ${e.message}\n`); process.exit(1); });
