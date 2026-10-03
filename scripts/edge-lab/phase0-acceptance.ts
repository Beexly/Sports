/**
 * PHASE 0 ACCEPTANCE — the blocking gate for the Glass Ledger + Edge Engine
 * build (handoff §2 P0). Runs against REAL nflverse data (CC-BY-4.0):
 *
 *   1. loads historical NFL games with closing lines (seasons below),
 *   2. SEALS the most recent season as the untouched forward holdout
 *      (never evaluated here; opened only by the founder's literal token),
 *   3. builds honest as-of schedule features through the real store,
 *   4. runs the shuffled-time placebo — measured EV-vs-close on
 *      time-scrambled features must be indistinguishable from 0,
 *   5. runs the market-conditional MI probe I(score; Y | q_close),
 *   6. writes a provenance-stamped report to reports/edge-lab/.
 *
 * Exit codes: 0 = gate PASSED · 2 = gate FAILED (leakage detected) ·
 * 3 = data/environment error. A failed gate BLOCKS Phase 1+ (handoff §2).
 *
 * The real-run EV and the MI reading are reported for founder review and
 * are NOT claimable performance numbers (no coverage/LCB/CLV/provenance
 * quartet is attached to any public surface here — nothing renders).
 *
 * Run: NODE_OPTIONS=--use-system-ca npx tsx scripts/edge-lab/phase0-acceptance.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AsOfFeatureStore } from "../../packages/prediction-engine/src/edge-lab/asof-store.js";
import { loadNflGames } from "../../packages/prediction-engine/src/edge-lab/loaders/nfl-games.js";
import { logisticTrainer } from "../../packages/prediction-engine/src/edge-lab/logistic.js";
import {
  conditionalMiProbe,
  shuffledTimePlacebo,
  walkForwardEval,
} from "../../packages/prediction-engine/src/edge-lab/placebo.js";
import { stampProvenance } from "../../packages/prediction-engine/src/edge-lab/provenance.js";
import {
  buildScheduleFeatureRows,
  SCHEDULE_FEATURE_KEYS,
} from "../../packages/prediction-engine/src/edge-lab/schedule-features.js";
import { sealHoldout } from "../../packages/prediction-engine/src/edge-lab/walk-forward.js";

const WORKING_SEASONS = [2019, 2020, 2021, 2022, 2023, 2024];
const HOLDOUT_SEASON = 2025; // most recent completed season — SEALED (§2 P0)
const WF = { folds: 6, minTrainFraction: 0.3, embargoMs: 3 * 86_400_000 };
const FIRE_THRESHOLD = 0.03;

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();
  const games = await loadNflGames({ seasons: [...WORKING_SEASONS, HOLDOUT_SEASON] });
  if (games.length < 1000) {
    console.error(`Too few games loaded (${games.length}) — refusing to run the gate on a stub corpus.`);
    return 3;
  }

  // Seal the forward holdout BEFORE any feature work sees it.
  const sealed = sealHoldout(
    games.map((g) => ({
      ...g,
      id: g.gameId,
      decisionAt: g.startTime,
      eventEndAt: g.startTime,
    })),
    (row) => row.season === HOLDOUT_SEASON,
  );
  const workingGames = sealed.working;

  const store = new AsOfFeatureStore();
  const { rows, skipped } = buildScheduleFeatureRows(workingGames, store);
  const trainer = logisticTrainer({ featureKeys: [...SCHEDULE_FEATURE_KEYS] });

  const realRun = walkForwardEval(rows, trainer, WF, FIRE_THRESHOLD);
  const placebo = shuffledTimePlacebo(store, rows, trainer, {
    fireThreshold: FIRE_THRESHOLD,
    walkForward: WF,
    featureKeys: [...SCHEDULE_FEATURE_KEYS],
    runs: 12,
    seed: 20260716,
  });
  store.assertNoLookahead();

  const mi = conditionalMiProbe({
    scores: realRun.oof.map((o) => o.p),
    outcomes: realRun.oof.map((o) => o.y),
    qClose: realRun.oof.map((o) => o.q),
    permutations: 300,
    seed: 20260716,
  });

  const report = {
    phase: "0",
    startedAt,
    finishedAt: new Date().toISOString(),
    data: {
      source: "nflverse/nfldata games (CC-BY-4.0)",
      workingSeasons: WORKING_SEASONS,
      gamesLoaded: games.length,
      evalRows: rows.length,
      skipped,
      sealedHoldout: { season: HOLDOUT_SEASON, ...sealed.holdoutSummary },
    },
    walkForward: WF,
    fireThreshold: FIRE_THRESHOLD,
    realRun: {
      note: "EV-vs-close on fired plays. NOT a claimable performance number (no coverage/LCB/CLV/provenance quartet; nothing renders publicly from this).",
      eligible: realRun.eligible,
      fired: realRun.fired,
      coverage: realRun.coverage,
      meanReturn: realRun.meanReturn,
      seReturn: realRun.seReturn,
      foldCount: realRun.foldCount,
    },
    placeboGate: {
      passed: placebo.passed,
      failureReason: placebo.failureReason,
      runs: placebo.runs,
      seed: placebo.seed,
      medianP: placebo.placeboMedianP,
      medianMean: placebo.placeboMedianMean,
      epsilon: placebo.epsilon,
      perRun: placebo.placeboRuns,
    },
    miProbe: {
      note: "I(oof score; Y | q_close). ~0 with high p means these schedule features carry no information beyond the close — an expected, honest finding for deliberately modest features; Phase 3 features must clear this bar to matter.",
      miNats: mi.miNats,
      nullMeanNats: mi.nullMeanNats,
      pValue: mi.pValue,
      strata: mi.strata,
      permutations: mi.permutations,
      n: mi.n,
    },
    noLookaheadCertificate: "AsOfFeatureStore.assertNoLookahead() passed over the full served audit",
  };

  const stamp = stampProvenance({
    producer: "edge-lab/phase0-acceptance",
    asOf: startedAt,
    inputs: {
      workingSeasons: WORKING_SEASONS,
      holdoutSeason: HOLDOUT_SEASON,
      evalRows: rows.length,
      fireThreshold: FIRE_THRESHOLD,
      walkForward: WF,
      placeboSeed: 20260716,
    },
    output: JSON.parse(JSON.stringify(report)),
  });

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outDir = join(scriptDir, "..", "..", "reports", "edge-lab");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "phase0-nfl-acceptance.json"), JSON.stringify({ report, provenance: stamp }, null, 2));

  const md = [
    "# Phase 0 acceptance — NFL (real nflverse data)",
    "",
    `Generated ${report.finishedAt} by \`scripts/edge-lab/phase0-acceptance.ts\` (provenance ${stamp.inputsHash.slice(0, 16)}…, model ${stamp.modelVersion}).`,
    "",
    `| item | value |`,
    `|---|---|`,
    `| games loaded | ${games.length} (${WORKING_SEASONS[0]}–${HOLDOUT_SEASON}) |`,
    `| sealed holdout | season ${HOLDOUT_SEASON}: ${sealed.holdoutSummary.count} games — NEVER evaluated here |`,
    `| eval rows | ${rows.length} (skipped: ${JSON.stringify(skipped)}) |`,
    `| real run | fired ${realRun.fired}/${realRun.eligible} (coverage ${(realRun.coverage * 100).toFixed(1)}%), mean EV-vs-close ${realRun.meanReturn?.toFixed(4) ?? "n/a"} ± ${realRun.seReturn?.toFixed(4) ?? "n/a"} — not claimable |`,
    `| **placebo gate** | **${placebo.passed ? "PASSED" : "FAILED"}** (median p ${placebo.placeboMedianP?.toFixed(3) ?? "n/a"}, median EV ${placebo.placeboMedianMean?.toFixed(4) ?? "n/a"}) |`,
    `| MI probe | I(score;Y|q) = ${mi.miNats.toFixed(5)} nats, null ${mi.nullMeanNats.toFixed(5)}, p = ${mi.pValue.toFixed(3)} |`,
    "",
    placebo.passed
      ? "The pipeline is leak-free at this gate's detection threshold: time-scrambled features cannot beat the close."
      : `**LEAKAGE DETECTED — Phase 1+ is BLOCKED.** ${placebo.failureReason}`,
    "",
    "MI reading: " +
      (mi.pValue >= 0.05
        ? "these schedule features carry no measurable information beyond the closing price — expected for deliberately modest features; the founder should know Phase-3 features must clear this bar to matter."
        : "the features carry measurable information conditional on the close (see p-value)."),
  ].join("\n");
  writeFileSync(join(outDir, "phase0-nfl-acceptance.md"), md);

  console.log(md);
  return placebo.passed ? 0 : 2;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("phase0-acceptance failed:", err);
    process.exit(3);
  });
