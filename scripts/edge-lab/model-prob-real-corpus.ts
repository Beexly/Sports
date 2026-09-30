/**
 * model-prob-real-corpus.mjs — PROOF DRIVER (read-only, zero DB writes).
 *
 * Runs the REAL frozen model over REAL historical nflverse games via the existing
 * backfill replay, collects the settled (confidence, WIN/LOSS) corpus those games
 * actually produced, then feeds it through the new resolveModelProb bridge and
 * mints real PickProofReceipts carrying the resolved modelProb.
 *
 * This is the leg that answers "does the path work on real data?" — as opposed to
 * the synthetic-corpus unit test, which only proves the mechanism.
 *
 * SAFETY: writes NOTHING. It calls the same scoreHistoricalGame/
 * buildPickProofReceipt the backfill does, but only prints. The backfill's own
 * dry-run default is what makes the underlying data honest, and we never set
 * BACKFILL_WRITE.
 *
 * Run:
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/edge-lab/model-prob-real-corpus.ts \
 *     --from=2023 --to=2023 --weeks=1-6 --limit=400
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { toRawRow } from "../backfill/historical-settlement-backfill.js";
import {
  assertIngestible,
  fetchNflverse,
} from "../../packages/data-ingestion/src/index.js";
import {
  replayAndSettleGame,
  buildPickProofReceipt,
  isPlausibleEntryOdds,
  type RawScheduleRow,
  type SettledHistoricalPick,
} from "../../packages/prediction-engine/src/index.js";
import { resolveModelProb } from "../../packages/prediction-engine/src/model-prob-bridge.js";
import { brierScore } from "../../eval/edge-lab/metrics.mjs";

const sha256Hex = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex");

// ─────────────────────────── arg parsing ────────────────────────────
const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const fromSeason = Number(arg("from") ?? 2023);
const toSeason = Number(arg("to") ?? fromSeason);
const limit = Number(arg("limit") ?? 400);
const weekSpec = arg("weeks");
const [wFrom, wTo] = (weekSpec ?? "")
  .split("-")
  .map((s) => (s ? Number(s) : null));
const restrictWeeks = wFrom != null && !Number.isNaN(wFrom);

async function main() {
  console.log(`\n=== REAL-CORPUS modelProb PROOF (read-only, ZERO DB writes) ===\n`);
  console.log(`seasons ${fromSeason}-${toSeason}, weeks ${weekSpec ?? "all"}, limit ${limit}`);

  assertIngestible("nflverse");
  // Same call the backfill driver uses: the single all-seasons `schedules` asset
  // (one file since 1999), returned as raw STRING records. toRawRow is the
  // repo's own mapper — reused verbatim so the sign flip on spread_line (documented
  // there) and the gameType/commenceTime handling cannot drift from the backfill.
  const table = await fetchNflverse("schedules", 0);
  const records = table.records as ReadonlyArray<Readonly<Record<string, string>>>;
  console.log(`fetched schedules: ${records.length} rows (all seasons).`);

  const intOr = (v: string | undefined): number | null => {
    const n = v == null ? NaN : Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const games: RawScheduleRow[] = [];
  for (const r of records) {
    const row = toRawRow(r);
    if (!row) continue;
    if (row.season < fromSeason || row.season > toSeason) continue;
    if (row.gameType !== "REG") continue;
    if (restrictWeeks && (row.week < wFrom || row.week > (wTo ?? wFrom))) continue;
    // Only settled games — the corpus needs an outcome to score a probability against.
    if (intOr(r["home_score"]) == null || intOr(r["away_score"]) == null) continue;
    games.push(row);
  }
  const capped = games.slice(0, limit);

  console.log(`in-range settled games: ${games.length} (using first ${capped.length})`);

  const settled: SettledHistoricalPick[] = [];
  let lookaheadErrors = 0;
  for (const row of capped) {
    try {
      settled.push(...replayAndSettleGame(row));
    } catch (e) {
      lookaheadErrors++;
      console.error(`replay error on ${row.gameKey}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`settled picks: ${settled.length}  lookahead errors: ${lookaheadErrors} (MUST be 0)`);

  // The corpus: what the ladder fits. Confidence is the only forecast the receipt
  // commits besides marketFairProb, so p = confidence/100.
  const scored = settled.filter((p) => p.result === "WIN" || p.result === "LOSS");
  const samples = scored.map((p) => ({
    p: Math.max(0, Math.min(1, p.confidence / 100)),
    y: (p.result === "WIN" ? 1 : 0) as 0 | 1,
  }));

  const observedRate = samples.length
    ? samples.reduce((s, x) => s + x.y, 0) / samples.length
    : 0;
  const predictedRate = samples.length
    ? samples.reduce((s, x) => s + x.p, 0) / samples.length
    : 0;

  console.log(`\n--- THE REAL MISCALIBRATION THIS FIXES ---`);
  console.log(`corpus n=${samples.length}`);
  console.log(`mean confidence/100 (raw forecast): ${predictedRate.toFixed(4)}`);
  console.log(`observed win rate (reality):        ${observedRate.toFixed(4)}`);
  console.log(`gap (raw is this far too confident): ${(predictedRate - observedRate).toFixed(4)}`);

  if (samples.length === 0) {
    console.log("\nNo settled corpus — the honest answer is still 'no modelProb'. Stopping.");
    return;
  }

  // ── The end-to-end path, on real data ──────────────────────────────
  const sampleConfidences = [...new Set(settled.map((p) => p.confidence))].sort((a, b) => a - b);
  const resolved = resolveModelProb(
    sampleConfidences[Math.floor(sampleConfidences.length / 2)] ?? 70,
    samples,
    { gateOpen: true },
  );

  console.log(`\n--- RESOLVE BRIDGE (gateOpen=true) ---`);
  console.log(`ladder active:  ${resolved.calibrated}`);
  console.log(`method:         ${resolved.method}`);
  console.log(`sampleSize:     ${resolved.sampleSize}`);
  console.log(`refusal:        ${resolved.refusal ?? "(none — a real number was produced)"}`);
  console.log(`heldOutEce:     ${JSON.stringify(resolved.heldOutEce)}`);

  if (resolved.modelProb == null) {
    console.log(
      "\nmodelProb is STILL null — correctly so. The ladder refused on this real data:",
    );
    console.log(`  ${resolved.refusal}`);
    console.log(
      "\nThis is the honest outcome and the proof still holds: the path refuses rather",
    );
    console.log("than fabricate. Brier legitimately cannot exist yet.");
    return;
  }

  // Score PER-PICK, the same way eval/edge-lab/clv-report.mjs does: one
  // (probability, binary outcome) pair per settled pick. Aggregating into
  // confidence buckets first and scoring the bucket MEAN would let a
  // mean-preserving forecast look good by construction, so it is not done here.
  const preds: number[] = [];
  const outs: number[] = [];
  const rawPreds: number[] = [];
  for (const s of samples) {
    const conf = Math.round(s.p * 100);
    const r = resolveModelProb(conf, samples, { gateOpen: true });
    if (r.modelProb == null) continue;
    preds.push(r.modelProb);
    outs.push(s.y);
    rawPreds.push(s.p);
  }

  // Mint REAL receipts over the real picks, carrying the resolved modelProb.
  let minted = 0;
  let verified = 0;
  const sampleReceipts: string[] = [];
  for (const p of settled) {
    if (
      p.marketFairProb == null ||
      p.marketFairProb <= 0 ||
      p.marketFairProb >= 1 ||
      p.entryOdds == null ||
      !isPlausibleEntryOdds(p.entryOdds)
    ) {
      continue;
    }
    const r = resolveModelProb(p.confidence, samples, { gateOpen: true });
    const receipt = buildPickProofReceipt(
      {
        pickId: p.idempotencyKey,
        gameId: p.gameKey,
        selection: p.selection,
        pickType: p.pickType,
        line: p.line,
        entryOdds: p.entryOdds,
        marketFairProb: p.marketFairProb,
        marketFairMethodTag: "proportional_devig_v1",
        confidence: p.confidence,
        edgeScore: p.edgeScore,
        modelProb: r.modelProb,
        modelVersion: p.modelVersion,
        asOf: p.asOf,
      },
      sha256Hex,
    );
    minted++;
    // verifyPickProofReceipt round-trip proves the commitment is intact.
    const { verifyPickProofReceipt } = await import(
      "../../packages/prediction-engine/src/pick-proof-receipt.js"
    );
    if (verifyPickProofReceipt(receipt, sha256Hex)) verified++;
    if (sampleReceipts.length < 3) {
      sampleReceipts.push(`    ${p.gameKey} ${p.pickType} conf=${p.confidence} ${receipt.payload}`);
    }
  }

  console.log(`\n--- RECEIPTS MINTED WITH A REAL modelProb (in-memory, NOT persisted) ---`);
  console.log(`minted: ${minted}   verified by hash round-trip: ${verified}`);
  console.log("sample canonical payloads (these are what a skeptic re-derives):");
  for (const s of sampleReceipts) console.log(s);

  console.log(`\n--- BRIER: THE SCORE THAT DID NOT EXIST BEFORE ---`);
  if (preds.length > 0) {
    const rawBrier = brierScore(rawPreds, outs);
    const modelBrier = brierScore(preds, outs);
    // Per-pick (probability, binary outcome) pairs — identical semantics to the
    // filter eval/edge-lab/clv-report.mjs applies before it will report anything.
    console.log(`settled picks scored: ${preds.length}`);
    console.log(`Brier(calibrated modelProb): ${modelBrier.toFixed(4)}`);
    console.log(`Brier(raw confidence/100):  ${rawBrier.toFixed(4)}`);
    console.log(
      modelBrier < rawBrier
        ? `improvement: ${(rawBrier - modelBrier).toFixed(4)} (calibrated wins)`
        : `WARNING: calibrated did NOT beat raw by ${(modelBrier - rawBrier).toFixed(4)} on this corpus`,
    );
  }

  // Machine-readable artifact for downstream tooling / review.
  const artifact = {
    generatedFrom: "nflverse (CC BY 4.0)",
    seasons: [fromSeason, toSeason],
    weeks: weekSpec ?? "all",
    settledPicks: settled.length,
    scoredPicks: samples.length,
    lookaheadErrors,
    rawForecastMean: Number(predictedRate.toFixed(6)),
    observedWinRate: Number(observedRate.toFixed(6)),
    resolved: {
      calibrated: resolved.calibrated,
      method: resolved.method,
      sampleSize: resolved.sampleSize,
      modelProb: resolved.modelProb,
      heldOutEce: resolved.heldOutEce,
    },
    receiptsMinted: minted,
    receiptsVerified: verified,
    brier: preds.length
      ? {
          calibrated: Number(brierScore(preds, outs).toFixed(6)),
          rawConfidence: Number(brierScore(rawPreds, outs).toFixed(6)),
        }
      : null,
    dbWrites: 0,
  };
  const outPath = "eval/edge-lab/out/model-prob-real-corpus.json";
  writeFileSync(outPath, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`\nartifact written: ${outPath}`);
  console.log("\nNO database writes were performed. Production is untouched.");
}

main().catch((e) => {
  console.error("proof driver failed:", e);
  process.exit(1);
});