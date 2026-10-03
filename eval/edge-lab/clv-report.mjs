/**
 * edge-lab/clv-report.mjs — aggregate REAL graded picks into a CLV track record.
 *
 * Your schema already grades CLV at settlement (Pick.clvValue / clvVerdict), so the
 * honest edge number is a straight aggregation of settled picks — no Odds API
 * backfill needed for picks that already settled. This function is pure and
 * unit-checked (see clv-report.smoke.mjs); run-clv-report.ts feeds it real DB rows.
 *
 * Pick row shape (subset of Prisma Pick + joins):
 *   { season?: string, result: 'WIN'|'LOSS'|'PUSH'|'VOID'|'PENDING',
 *     clvValue: number|null, clvVerdict: 'BEAT_CLOSE'|'MATCHED_CLOSE'|'LOST_TO_CLOSE'|null,
 *     modelProb?: number|null }   // modelProb from PickProofReceipt; null until a real model exists
 */
import { brierScore, expectedCalibrationError } from "./metrics.mjs";

export function clvReport(picks, opts = {}) {
  const minProven = opts.minSampleForProven ?? 100; // PROVEN rung in the pricing ladder
  const graded = picks.filter((p) => p.clvValue != null && p.result && p.result !== "PENDING");

  const bySeason = new Map();
  for (const p of graded) {
    const key = p.season ?? "unknown";
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key).push(p);
  }

  const seasons = [...bySeason.entries()]
    .map(([season, ps]) => summarize(season, ps, minProven))
    .sort((a, b) => String(a.season).localeCompare(String(b.season)));

  const overall = summarize("ALL", graded, minProven);

  // Brier / ECE need a REAL probability and a binary settle. Pushes/voids excluded.
  const probPicks = graded.filter(
    (p) => typeof p.modelProb === "number" && (p.result === "WIN" || p.result === "LOSS"),
  );
  let calibration;
  if (probPicks.length > 0) {
    const preds = probPicks.map((p) => p.modelProb);
    const outs = probPicks.map((p) => (p.result === "WIN" ? 1 : 0));
    calibration = {
      n: probPicks.length,
      brier: brierScore(preds, outs),
      ece: expectedCalibrationError(preds, outs),
    };
  } else {
    calibration = {
      n: 0,
      note: "No settled pick carries a real modelProb yet (modelProb is null until a calibrated win-prob model exists). Brier/ECE are not computable — and we will NOT fabricate them.",
    };
  }

  return { overall, seasons, calibration };
}

function summarize(season, ps, minProven) {
  const n = ps.length;
  const meanClv = n ? ps.reduce((a, p) => a + p.clvValue, 0) / n : 0;
  const beat = ps.filter((p) => p.clvVerdict === "BEAT_CLOSE").length;
  const matched = ps.filter((p) => p.clvVerdict === "MATCHED_CLOSE").length;
  const lost = ps.filter((p) => p.clvVerdict === "LOST_TO_CLOSE").length;
  return {
    season,
    n,
    meanClv,
    beatCloseRate: n ? beat / n : 0,
    verdicts: { beat, matched, lost },
    sampleAdequacy:
      n >= minProven
        ? `adequate (n=${n} ≥ ${minProven})`
        : `INSUFFICIENT (n=${n} < ${minProven} — not PROVEN-eligible; do not publish as a track record yet)`,
  };
}
