/**
 * Replay breakdown — WHERE is the frozen model break-even, and does confidence mean anything?
 *
 * The aggregate replay number (52.700% over 1999-2025, 95% CI [51.92%, 53.48%],
 * z = 0.799 vs the 52.381% break-even) says the model has no edge overall. That is
 * an average, and an average can hide a market we are good at and a market we are
 * bad at. This splits the same corpus three ways:
 *
 *   1. By pick type   — SPREAD vs TOTAL vs MONEYLINE.
 *   2. By confidence  — does a 70-confidence pick actually win more than a 55?
 *                       If it does not, the confidence score is decoration and the
 *                       tier ladder that prices off it is not defensible.
 *   3. By era         — is any apparent edge a stable property or a 2000s artifact?
 *
 * NO NEW MODELLING. This re-uses the same `replayAndSettleGame` and the same
 * `toRawRow` mapper the backfill driver uses (imported, not re-implemented), so the
 * numbers are the same numbers, only grouped. Read-only, dry-run only, no DB.
 *
 * MONEYLINE picks are graded on money, not on record: a favourite-heavy book wins
 * often and still loses money, so this reports realised ROI per unit staked for
 * moneyline rather than pretending its 52.38% break-even applies.
 *
 * Data: nflverse `schedules` — CC-BY-4.0, gated through the same `assertIngestible`
 * legality check. Data via nflverse (nflverse-data), licensed CC BY 4.0.
 *
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/analytics/replay-breakdown.ts [--from=1999] [--to=2025]
 */

import { assertIngestible, fetchNflverse } from "../../packages/data-ingestion/src/index.js";
import {
  replayAndSettleGame,
  type SettledHistoricalPick,
} from "../../packages/prediction-engine/src/index.js";
import { toRawRow } from "../backfill/historical-settlement-backfill.js";

const BREAK_EVEN = 110 / 210; // -110 both sides

function arg(name: string, fallback: number): number {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) ? n : fallback;
}

interface Bucket {
  wins: number;
  losses: number;
  pushes: number;
  /** Net units on a 1-unit stake, priced at the pick's real entry odds. */
  units: number;
}

const emptyBucket = (): Bucket => ({ wins: 0, losses: 0, pushes: 0, units: 0 });

/** Profit on a 1-unit stake at American odds, given the settled result. */
function unitsFor(result: string, americanOdds: number): number {
  if (result === "PUSH") return 0;
  if (result === "LOSS") return -1;
  if (!Number.isFinite(americanOdds) || americanOdds === 0) return 0;
  return americanOdds > 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);
}

function add(b: Bucket, p: SettledHistoricalPick): void {
  if (p.result === "WIN") b.wins++;
  else if (p.result === "LOSS") b.losses++;
  else if (p.result === "PUSH") b.pushes++;
  else return; // VOID/unknown — never counted, never guessed
  b.units += unitsFor(p.result, p.entryOdds ?? -110);
}

/** Wilson interval — honest at small n, unlike the normal approximation. */
function wilson(wins: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(centre - half) / d, (centre + half) / d];
}

function row(label: string, b: Bucket): string {
  const n = b.wins + b.losses;
  if (n === 0) return `${label.padEnd(22)} ${"(no decisive picks)".padStart(12)}`;
  const p = b.wins / n;
  const [lo, hi] = wilson(b.wins, n);
  const roi = (b.units / (n + b.pushes)) * 100;
  const beats = lo > BREAK_EVEN ? "  <-- CI clears break-even" : "";
  return (
    `${label.padEnd(22)} n=${String(n).padStart(5)}  ` +
    `${(p * 100).toFixed(2).padStart(6)}%  ` +
    `CI [${(lo * 100).toFixed(2)}%, ${(hi * 100).toFixed(2)}%]  ` +
    `ROI ${(roi >= 0 ? "+" : "") + roi.toFixed(2)}%  ` +
    `push ${String(b.pushes).padStart(3)}${beats}`
  );
}

async function main(): Promise<void> {
  const from = arg("from", 1999);
  const to = arg("to", 2025);

  const source = assertIngestible("nflverse");
  console.log(`legality: nflverse OK (${source.verdict}). ${source.attributionText}`);

  const { records } = await fetchNflverse("schedules", 0);
  console.log(`fetched schedules: ${records.length} rows\n`);

  const byType = new Map<string, Bucket>();
  const byConfidence = new Map<string, Bucket>();
  const byEra = new Map<string, Bucket>();
  const overall = emptyBucket();

  const confidenceBand = (c: number): string => {
    if (c >= 80) return "80+";
    if (c >= 70) return "70-79";
    if (c >= 65) return "65-69";
    if (c >= 60) return "60-64";
    if (c >= 55) return "55-59";
    return "50-54";
  };
  const era = (season: number): string => {
    if (season >= 2020) return "2020-2025";
    if (season >= 2013) return "2013-2019";
    if (season >= 2006) return "2006-2012";
    return "1999-2005";
  };

  let games = 0;
  for (const r of records) {
    const raw = toRawRow(r);
    if (!raw) continue;
    if (raw.season < from || raw.season > to) continue;
    if ((raw.gameType ?? "REG") !== "REG") continue;

    const settled = replayAndSettleGame(raw);
    if (settled.length > 0) games++;

    for (const p of settled) {
      add(overall, p);
      const t = byType.get(p.pickType) ?? emptyBucket();
      add(t, p);
      byType.set(p.pickType, t);

      // Confidence and era bands exclude MONEYLINE: its picks are priced at real
      // odds, so a win-rate band there is not comparable to the -110 markets.
      if (p.pickType !== "MONEYLINE") {
        const c = byConfidence.get(confidenceBand(p.confidence)) ?? emptyBucket();
        add(c, p);
        byConfidence.set(confidenceBand(p.confidence), c);

        const e = byEra.get(era(raw.season)) ?? emptyBucket();
        add(e, p);
        byEra.set(era(raw.season), e);
      }
    }
  }

  console.log(`seasons ${from}-${to} REG · ${games} games with a publishable pick`);
  console.log(`break-even at -110 = ${(BREAK_EVEN * 100).toFixed(3)}%`);
  console.log(`ROI is net units per unit staked, priced at each pick's real entry odds.\n`);

  console.log("── BY PICK TYPE ─────────────────────────────────────────────────────────");
  for (const t of ["SPREAD", "TOTAL", "MONEYLINE"]) {
    const b = byType.get(t);
    if (b) console.log(row(t, b));
  }

  console.log("\n── BY CONFIDENCE (spread + total only) ──────────────────────────────────");
  console.log("   If confidence is meaningful, win rate rises down this list.");
  for (const band of ["80+", "70-79", "65-69", "60-64", "55-59", "50-54"]) {
    const b = byConfidence.get(band);
    if (b) console.log(row(band, b));
  }

  console.log("\n── BY ERA (spread + total only) ─────────────────────────────────────────");
  for (const e of ["1999-2005", "2006-2012", "2013-2019", "2020-2025"]) {
    const b = byEra.get(e);
    if (b) console.log(row(e, b));
  }

  console.log("\n── OVERALL ──────────────────────────────────────────────────────────────");
  console.log(row("all picks", overall));
  console.log(
    "\nRead the CI, not the point estimate. A band clears break-even only when its " +
      "LOWER bound does — and with this many bands, expect one to look good by chance.",
  );
}

main().catch((err) => {
  console.error("\nreplay-breakdown fatal:", err);
  process.exit(1);
});
