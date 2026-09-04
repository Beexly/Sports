/**
 * Does ANY field the engine emits separate winners from losers?
 *
 * docs/path-to-70.md §8 makes this the blocker. §1.1's north star is a calibrated
 * confidence tier where a pick labelled ~70% wins ~70%. Calibration re-maps a
 * signal onto honest probabilities — it cannot create ranking that is not there.
 * Isotonic regression on a signal with no resolution yields a flat curve and a
 * small ECE, which LOOKS like success. So discrimination has to be established
 * before recalibration means anything.
 *
 * The measure is AUC (equivalently the Mann-Whitney U statistic): the probability
 * that a randomly chosen WINNING pick scored higher than a randomly chosen LOSING
 * one. 0.5 is coin-flip — no ranking ability at all. Significance is by permutation
 * (labels shuffled, AUC recomputed), which assumes nothing about the distribution.
 *
 * HONEST SCOPE — read before quoting any number here. The replay prices both sides
 * of spread/total at -110, so the edge component of confidence is a constant and
 * consensus/depth are degenerate (see docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md).
 * Only fields that actually VARY here can be tested, and this file reports which
 * did. A field with zero variance is reported as untestable, never as 0.5.
 *
 * Read-only. No DB. nflverse is CC-BY-4.0 and gated through assertIngestible.
 * Data via nflverse (nflverse-data), licensed CC BY 4.0.
 *
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/analytics/replay-discrimination.ts
 */

import { assertIngestible, fetchNflverse } from "../../packages/data-ingestion/src/index.js";
import { replayAndSettleGame } from "../../packages/prediction-engine/src/index.js";
import { toRawRow } from "../backfill/historical-settlement-backfill.js";

const PERMUTATIONS = 2000;

interface Sample {
  readonly score: number; // the candidate signal
  readonly win: 1 | 0; // outcome
}

/**
 * AUC via the rank-sum identity, with ties given average ranks — a tie must count
 * as half a concordant pair, not a whole one, or a constant signal would score 1.0.
 */
function auc(samples: readonly Sample[]): number | null {
  const pos = samples.filter((s) => s.win === 1).length;
  const neg = samples.length - pos;
  if (pos === 0 || neg === 0) return null;

  const sorted = [...samples].sort((a, b) => a.score - b.score);
  const ranks = new Array<number>(sorted.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1]!.score === sorted[i]!.score) j++;
    const avg = (i + j + 2) / 2; // ranks are 1-based
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let rankSumPos = 0;
  for (let k = 0; k < sorted.length; k++) if (sorted[k]!.win === 1) rankSumPos += ranks[k]!;
  return (rankSumPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

/** Deterministic PRNG so a reported p-value is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutationP(samples: readonly Sample[], observed: number): number {
  const rng = mulberry32(20260904);
  const labels = samples.map((s) => s.win);
  const scores = samples.map((s) => s.score);
  let atLeastAsExtreme = 0;
  for (let p = 0; p < PERMUTATIONS; p++) {
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [labels[i], labels[j]] = [labels[j]!, labels[i]!];
    }
    const shuffled = scores.map((score, i) => ({ score, win: labels[i]! }));
    const a = auc(shuffled);
    if (a !== null && Math.abs(a - 0.5) >= Math.abs(observed - 0.5)) atLeastAsExtreme++;
  }
  return (atLeastAsExtreme + 1) / (PERMUTATIONS + 1); // add-one: never reports p = 0
}

function report(name: string, samples: Sample[]): void {
  const distinct = new Set(samples.map((s) => s.score)).size;
  if (samples.length === 0) {
    console.log(`${name.padEnd(26)} no samples`);
    return;
  }
  if (distinct <= 1) {
    console.log(
      `${name.padEnd(26)} n=${String(samples.length).padStart(5)}  UNTESTABLE — constant in this replay`,
    );
    return;
  }
  const a = auc(samples);
  if (a === null) {
    console.log(`${name.padEnd(26)} n=${String(samples.length).padStart(5)}  UNTESTABLE — one class only`);
    return;
  }
  const p = permutationP(samples, a);
  const verdict = p < 0.05 ? (a > 0.5 ? "SIGNAL" : "INVERTED") : "no discrimination";
  console.log(
    `${name.padEnd(26)} n=${String(samples.length).padStart(5)}  ` +
      `distinct=${String(distinct).padStart(4)}  AUC=${a.toFixed(4)}  p=${p.toFixed(4)}  ${verdict}`,
  );
}

async function main(): Promise<void> {
  const source = assertIngestible("nflverse");
  console.log(`legality: nflverse OK (${source.verdict}). ${source.attributionText}`);
  const { records } = await fetchNflverse("schedules", 0);

  const confidence: Sample[] = [];
  const edgeScore: Sample[] = [];
  const absLine: Sample[] = [];
  const restDiff: Sample[] = [];
  const week: Sample[] = [];
  const marketFair: Sample[] = [];

  for (const r of records) {
    const raw = toRawRow(r);
    if (!raw || (raw.gameType ?? "REG") !== "REG") continue;
    for (const p of replayAndSettleGame(raw)) {
      if (p.result !== "WIN" && p.result !== "LOSS") continue; // pushes carry no signal
      // Moneyline is priced differently; a win-rate ranking across mixed odds is not
      // comparable, so discrimination is measured on the -110 markets only.
      if (p.pickType === "MONEYLINE") continue;
      const win: 1 | 0 = p.result === "WIN" ? 1 : 0;
      confidence.push({ score: p.confidence, win });
      edgeScore.push({ score: p.edgeScore, win });
      absLine.push({ score: Math.abs(p.line), win });
      if (raw.restHome != null && raw.restAway != null) {
        restDiff.push({ score: raw.restHome - raw.restAway, win });
      }
      week.push({ score: raw.week, win });
      if (p.marketFairProb != null) marketFair.push({ score: p.marketFairProb, win });
    }
  }

  console.log(`\nAUC = P(a winning pick scored higher than a losing one). 0.5 = no ranking.`);
  console.log(`p by permutation, ${PERMUTATIONS} shuffles, seeded (reproducible).\n`);
  console.log("── ENGINE-EMITTED FIELDS ────────────────────────────────────────────────");
  report("confidence", confidence);
  report("edgeScore (Edge Index)", edgeScore);
  report("marketFairProb", marketFair);
  console.log("\n── PRE-GAME FACTS (control) ─────────────────────────────────────────────");
  console.log("   These are inputs, not engine opinions. If one of THESE discriminates");
  console.log("   while confidence does not, the signal exists and is not being used.");
  report("|line| magnitude", absLine);
  report("rest differential", restDiff);
  report("week of season", week);
}

main().catch((err) => {
  console.error("\nreplay-discrimination fatal:", err);
  process.exit(1);
});
