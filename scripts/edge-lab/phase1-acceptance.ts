/**
 * PHASE 1 ACCEPTANCE — the honesty engine (handoff §2 P1).
 *
 * Real nflverse data, three TIME-DISJOINT out-of-fold segments:
 *   [calibration | tuning | eval]  (chronological thirds of the OOF stream)
 *
 *   1. OOF predictions come from the Phase-0 walk-forward harness.
 *   2. The calibration blend is fit on the CALIBRATION segment only.
 *   3. τ is tuned on the TUNING segment only (disjoint — §5 rule).
 *   4. The selective gate + logit-pool β test are evaluated on the EVAL
 *      segment only. The SEALED 2025 season is never touched (its opening
 *      is the founder's sign-off step, implemented by the holdout token).
 *
 * ACCEPTANCE (handoff): the gate produces a coverage-stamped selective
 * rate with a valid Wilson LCB, OR HONESTLY REPORTS 0 COVERAGE; Venn-Abers
 * marginal coverage holds within tolerance per Mondrian stratum; the
 * logit-pool β CI is reported (fire nothing if it includes 0).
 *
 * With Phase-0's deliberately modest schedule features the EXPECTED honest
 * outcome is FIRE_NOTHING + zero coverage — the machinery proving it can
 * say "no" is the acceptance, not a manufactured edge (§0 "It is NOT your
 * job to make CLV positive").
 *
 * Exit codes: 0 = acceptance criteria met (including the honest-zero
 * path) · 2 = a criterion failed · 3 = data/environment error.
 *
 * Run: NODE_OPTIONS=--use-system-ca npx tsx scripts/edge-lab/phase1-acceptance.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AsOfFeatureStore } from "../../packages/prediction-engine/src/edge-lab/asof-store.js";
import { fitOofCalibration } from "../../packages/prediction-engine/src/edge-lab/calibration-blend.js";
import { loadNflGames } from "../../packages/prediction-engine/src/edge-lab/loaders/nfl-games.js";
import { logisticTrainer } from "../../packages/prediction-engine/src/edge-lab/logistic.js";
import { logitPoolTest } from "../../packages/prediction-engine/src/edge-lab/logit-pool.js";
import { walkForwardEval, type OofScore } from "../../packages/prediction-engine/src/edge-lab/placebo.js";
import { stampProvenance } from "../../packages/prediction-engine/src/edge-lab/provenance.js";
import {
  buildScheduleFeatureRows,
  SCHEDULE_FEATURE_KEYS,
} from "../../packages/prediction-engine/src/edge-lab/schedule-features.js";
import {
  applySelectiveGate,
  tuneTau,
  vennAbersInterval,
  type GateDecisionRow,
} from "../../packages/prediction-engine/src/edge-lab/selective-gate.js";
import { sealHoldout } from "../../packages/prediction-engine/src/edge-lab/walk-forward.js";

const WORKING_SEASONS = [2019, 2020, 2021, 2022, 2023, 2024];
const HOLDOUT_SEASON = 2025;
const WF = { folds: 6, minTrainFraction: 0.3, embargoMs: 3 * 86_400_000 };
/** VA marginal coverage tolerance per stratum (|realized − interval band|). */
const COVERAGE_TOLERANCE = 0.05;

function toGateRow(o: OofScore, stratum: string): GateDecisionRow {
  return { rowId: o.rowId, score: o.p, q: o.q, stratum, y: o.y };
}

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();
  const games = await loadNflGames({ seasons: [...WORKING_SEASONS, HOLDOUT_SEASON] });
  if (games.length < 1000) {
    console.error(`Too few games (${games.length}); refusing a stub-corpus acceptance.`);
    return 3;
  }
  const sealed = sealHoldout(
    games.map((g) => ({ ...g, id: g.gameId, decisionAt: g.startTime, eventEndAt: g.startTime })),
    (row) => row.season === HOLDOUT_SEASON,
  );

  const store = new AsOfFeatureStore();
  const { rows } = buildScheduleFeatureRows(sealed.working, store);
  const trainer = logisticTrainer({ featureKeys: [...SCHEDULE_FEATURE_KEYS] });
  const oofRun = walkForwardEval(rows, trainer, WF, 0.03);
  store.assertNoLookahead();

  // Chronological thirds — OOF rows arrive in fold order, which is time order.
  const oof = oofRun.oof;
  const third = Math.floor(oof.length / 3);
  const calSeg = oof.slice(0, third);
  const tuneSeg = oof.slice(third, 2 * third);
  const evalSeg = oof.slice(2 * third);

  // 1) Calibration blend fit on the calibration segment only.
  const calibrationFit = fitOofCalibration(
    calSeg.map((o) => ({ p: o.p, y: o.y })),
    { seed: 20260716 },
  );
  const calibrate = calibrationFit.map;

  // 2) Logit-pool β on the EVAL segment (calibrated model probs).
  const pool = logitPoolTest({
    modelProbs: evalSeg.map((o) => calibrate(o.p)),
    marketProbs: evalSeg.map((o) => o.q),
    outcomes: evalSeg.map((o) => o.y),
  });

  // 3) τ tuned on the TUNING segment; gate evaluated on EVAL.
  const stratum = "nfl|ML";
  const calRows = calSeg.map((o) => toGateRow(o, stratum));
  const tuneRows = tuneSeg.map((o) => toGateRow(o, stratum));
  const evalRows = evalSeg.map((o) => toGateRow(o, stratum));
  const tauSel = tuneTau(calRows, tuneRows, { minFired: 50 });

  const gate =
    tauSel.tau !== null
      ? applySelectiveGate(calRows, evalRows, tauSel.tau)
      : null;

  // 4) Venn-Abers marginal coverage per stratum on EVAL: the realized rate
  //    must sit inside [mean p0 − tol, mean p1 + tol] — the interval's
  //    validity claim, checked empirically.
  const calSamples = calSeg.map((o) => ({ p: o.p, y: o.y }));
  let p0Sum = 0;
  let p1Sum = 0;
  let wins = 0;
  for (const o of evalSeg) {
    const iv = vennAbersInterval(calSamples, o.p);
    p0Sum += iv.lower;
    p1Sum += iv.upper;
    wins += o.y;
  }
  const meanP0 = p0Sum / evalSeg.length;
  const meanP1 = p1Sum / evalSeg.length;
  const realized = wins / evalSeg.length;
  const coverageHolds = realized >= meanP0 - COVERAGE_TOLERANCE && realized <= meanP1 + COVERAGE_TOLERANCE;

  // ACCEPTANCE LOGIC (honest-zero path is a PASS):
  const criteria = {
    oofProduced: oof.length > 500,
    calibrationSelected: calibrationFit.selected,
    betaCiReported: pool.converged,
    gateOutcome:
      tauSel.tau === null
        ? "ZERO_COVERAGE_HONESTLY_REPORTED"
        : gate && gate.fired > 0 && gate.wilsonLcb !== null
          ? "COVERAGE_STAMPED_SELECTIVE_RATE"
          : "GATE_INCONSISTENT",
    vaMarginalCoverageHolds: coverageHolds,
    firingConsistentWithBeta:
      // If β says the model adds nothing, the gate must not be firing.
      pool.verdict === "FIRE_NOTHING" ? tauSel.tau === null : true,
  };
  const passed =
    criteria.oofProduced &&
    criteria.betaCiReported &&
    criteria.gateOutcome !== "GATE_INCONSISTENT" &&
    criteria.vaMarginalCoverageHolds &&
    criteria.firingConsistentWithBeta;

  const report = {
    phase: "1",
    startedAt,
    finishedAt: new Date().toISOString(),
    segments: { calibration: calSeg.length, tuning: tuneSeg.length, eval: evalSeg.length },
    sealedHoldout: { season: HOLDOUT_SEASON, ...sealed.holdoutSummary },
    calibration: {
      selected: calibrationFit.selected,
      heldOutScores: calibrationFit.scores,
      sampleSize: calibrationFit.sampleSize,
    },
    logitPool: {
      note: "The falsifiable edge test: CI including 0 mandates FIRE NOTHING (handoff §2 P1).",
      beta: pool.beta,
      se: pool.se,
      ci95: pool.ci95,
      verdict: pool.verdict,
      n: pool.n,
    },
    selectiveGate: {
      tau: tauSel.tau,
      tauReason: tauSel.reason,
      tuningCurve: tauSel.curve.map((c) => ({ ...c })),
      evalReport: gate
        ? {
            fired: gate.fired,
            eligible: gate.eligible,
            coverage: gate.coverage,
            realizedRate: gate.realizedRate,
            wilsonLcb: gate.wilsonLcb,
          }
        : { fired: 0, eligible: evalRows.length, coverage: 0, realizedRate: null, wilsonLcb: null },
    },
    vennAbersCoverage: {
      stratum,
      meanLower: meanP0,
      meanUpper: meanP1,
      realizedRate: realized,
      tolerance: COVERAGE_TOLERANCE,
      holds: coverageHolds,
    },
    criteria,
    passed,
  };

  const stamp = stampProvenance({
    producer: "edge-lab/phase1-acceptance",
    asOf: startedAt,
    inputs: { workingSeasons: WORKING_SEASONS, holdoutSeason: HOLDOUT_SEASON, walkForward: WF, seed: 20260716 },
    output: JSON.parse(JSON.stringify(report)),
  });

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "edge-lab");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "phase1-nfl-acceptance.json"), JSON.stringify({ report, provenance: stamp }, null, 2));

  const md = [
    "# Phase 1 acceptance — the honesty engine (real nflverse data)",
    "",
    `Generated ${report.finishedAt} (provenance ${stamp.inputsHash.slice(0, 16)}…, model ${stamp.modelVersion}).`,
    "",
    `| item | value |`,
    `|---|---|`,
    `| OOF segments (cal/tune/eval) | ${calSeg.length} / ${tuneSeg.length} / ${evalSeg.length} — time-disjoint |`,
    `| sealed holdout | season ${HOLDOUT_SEASON}: ${sealed.holdoutSummary.count} games, untouched |`,
    `| calibration | selected "${calibrationFit.selected}" by held-out Brier decomposition |`,
    `| logit-pool β | ${pool.beta.toFixed(4)} ± ${pool.se.toFixed(4)}, CI [${pool.ci95[0].toFixed(4)}, ${pool.ci95[1].toFixed(4)}] → **${pool.verdict}** |`,
    `| selective gate | ${tauSel.tau === null ? "τ=null → ZERO COVERAGE, honestly reported" : `τ=${tauSel.tau}, fired ${gate?.fired}/${gate?.eligible}, Wilson LCB ${gate?.wilsonLcb?.toFixed(4)}`} |`,
    `| VA marginal coverage | realized ${realized.toFixed(4)} in [${meanP0.toFixed(4)}−tol, ${meanP1.toFixed(4)}+tol] → ${coverageHolds ? "HOLDS" : "VIOLATED"} |`,
    `| β/gate consistency | ${criteria.firingConsistentWithBeta ? "consistent (no firing without β evidence)" : "INCONSISTENT"} |`,
    "",
    `**ACCEPTANCE: ${passed ? "PASSED" : "FAILED"}.** ` +
      (tauSel.tau === null
        ? "The honest outcome with Phase-0's modest features: the machinery says NO — β adds nothing, so nothing fires, and the zero is coverage-stamped. That refusal IS the honesty engine working (§2 P1 acceptance explicitly blesses this path)."
        : "A selective operating point cleared breakeven on disjoint tuning data — see the coverage-stamped numbers above."),
  ].join("\n");
  writeFileSync(join(outDir, "phase1-nfl-acceptance.md"), md);
  console.log(md);
  return passed ? 0 : 2;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("phase1-acceptance failed:", err);
    process.exit(3);
  });
