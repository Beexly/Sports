/**
 * CLV FORECASTER BACKTEST (Charter Move #1) — keystone-shaped OOS report.
 *
 * Runs the closing-line forecaster (closing-line-forecaster.ts) through an expanding-
 * window, purged/embargoed walk-forward and reports exactly what the build spec
 * demands: OOS RMSE vs the Δ̂=0 baseline, directional accuracy, and — at a
 * PRE-REGISTERED decision threshold — beat-close rate (target ≥52.4%) and mean signed
 * CLV, with the sample size shown so no thin headline can hide.
 *
 * HONEST FAILURE IS A SUCCESS: if the forecaster does not beat the baseline OOS and
 * clear 52.4% at adequate sample, the verdict is "shelve + publish the null". We do
 * not tune τ to a winner — the sweep is printed for transparency, but the verdict
 * uses one pre-registered τ. Tuning τ on this data would need BH-FDR control and OOS
 * reconfirmation (see multiple-testing.ts).
 *
 * DATA: decoupled from acquisition. Feed `--samples <path.json>` — a JSON array of
 *   { features: {hoursToKickoff, driftSoFar, crossBookDispersion, independentGap, hasIndependent},
 *     label: <realized close − current> }
 * ordered oldest→newest. That file is produced by a separate, key-gated line-movement
 * pull (The Odds API historical endpoint or a production Odds-table export). Until it
 * exists, run `--demo` to watch the full pipeline on CLEARLY-LABELED synthetic data.
 *
 * USAGE:
 *   npx tsx scripts/backtest/clv-forecaster-backtest.ts --demo
 *   npx tsx scripts/backtest/clv-forecaster-backtest.ts --samples data/clv-samples.json --tau 0.5
 */

import { readFileSync } from "node:fs";
import {
  walkForwardForecast,
  evaluateForecastRmse,
  evaluateClvAtThreshold,
  type ForecastSample,
} from "../../packages/prediction-engine/src/closing-line-forecaster.js";

const BREAK_EVEN = 0.524; // ≥52.4% beat-close = the ESTABLISHED rung
const MIN_SAMPLE = 100; // honesty floor — no headline rate below this

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const TAU = Number(arg("tau") ?? 0.5); // pre-registered decision threshold (points)
const LAMBDA = Number(arg("lambda") ?? 1);
const MIN_TRAIN = Number(arg("min-train") ?? 100);
const EMBARGO = Number(arg("embargo") ?? 1);

/**
 * Synthetic line-movement with a SMALL planted signal + realistic noise. Purely to
 * demonstrate the pipeline — it proves the MACHINERY, never a real edge. The signal
 * is intentionally modest so the report looks like a plausible real result, not a
 * fantasy 70% hit rate.
 */
function demoSamples(n: number): ForecastSample[] {
  const out: ForecastSample[] = [];
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo-noise (no RNG, so the demo is replayable).
    const u1 = ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
    const u2 = ((i * 4093 + 18293) % 233280) / 233280 - 0.5;
    const driftSoFar = (((i % 13) - 6) * 0.5) + u1; // already-observed move
    const crossBookDispersion = Math.abs(u2) * 1.5;
    const hasIndependent = (i % 3 === 0 ? 1 : 0) as 0 | 1;
    const independentGap = hasIndependent ? u1 * 2 : 0;
    const hoursToKickoff = (i % 9) * 6 + 1;
    // Truth: a faint reversion of the prior drift + a faint pull toward the independent
    // fair line, buried in noise ~3× the signal. This is what an honest market looks like.
    const signal = -0.15 * driftSoFar + 0.2 * independentGap;
    const noise = (u1 + u2) * 1.2;
    out.push({
      features: { hoursToKickoff, driftSoFar, crossBookDispersion, independentGap, hasIndependent },
      label: signal + noise,
    });
  }
  return out;
}

function loadSamples(): { samples: ForecastSample[]; synthetic: boolean } {
  if (flag("demo")) return { samples: demoSamples(Number(arg("n") ?? 600)), synthetic: true };
  const path = arg("samples");
  if (!path) {
    console.error("No data. Pass --samples <path.json> for a real run, or --demo to see the pipeline.\n");
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as ForecastSample[];
  if (!Array.isArray(raw) || raw.length === 0) {
    console.error(`--samples file ${path} did not contain a non-empty array.\n`);
    process.exit(2);
  }
  return { samples: raw, synthetic: false };
}

function main(): void {
  const { samples, synthetic } = loadSamples();

  console.log("\n" + "═".repeat(70));
  console.log("CLV FORECASTER — walk-forward OOS backtest (Charter Move #1)");
  if (synthetic) {
    console.log("⚠  SYNTHETIC DEMO DATA — proves the machinery, NOT a real edge. ⚠");
  }
  console.log("═".repeat(70));
  console.log(`samples=${samples.length}  minTrain=${MIN_TRAIN}  embargo=${EMBARGO}  λ=${LAMBDA}  τ=${TAU}\n`);

  const oos = walkForwardForecast(samples, { minTrain: MIN_TRAIN, lambda: LAMBDA, embargo: EMBARGO });
  if (oos.length === 0) {
    console.log("No out-of-sample predictions produced (sample too small for minTrain). Add data.\n");
    return;
  }

  const rmse = evaluateForecastRmse(oos);
  console.log("— Forecast accuracy vs the Δ̂=0 baseline (lock-now) —");
  console.log(`  OOS predictions:      ${oos.length}`);
  console.log(`  forecaster RMSE:      ${rmse.rmse.toFixed(4)}`);
  console.log(`  baseline   RMSE:      ${rmse.baselineRmse.toFixed(4)}`);
  console.log(
    `  improvement:          ${rmse.rmseImprovement.toFixed(4)}  ` +
      `(${rmse.rmseImprovement > 0 ? "beats" : "does NOT beat"} lock-now)`,
  );
  console.log(`  directional accuracy: ${(rmse.directionalAccuracy * 100).toFixed(1)}%\n`);

  // Transparency sweep across thresholds — NOT used for the verdict (would be tuning).
  console.log("— CLV by decision threshold τ (transparency; verdict uses pre-registered τ) —");
  console.log("   τ      fired  passed  beat-close%   meanCLV");
  for (const t of [0, 0.5, 1, 1.5, 2]) {
    const c = evaluateClvAtThreshold(oos, t);
    console.log(
      `  ${t.toFixed(1).padStart(4)}   ${String(c.fired).padStart(5)}  ${String(c.passed).padStart(6)}   ` +
        `${(c.beatCloseRate * 100).toFixed(1).padStart(8)}   ${c.meanSignedClv.toFixed(3).padStart(7)}`,
    );
  }

  // The verdict — pre-registered τ, honest minimum-sample gate, no cherry-picking.
  const v = evaluateClvAtThreshold(oos, TAU);
  console.log(`\n— Verdict (pre-registered τ=${TAU}) —`);
  console.log(`  fired bets: ${v.fired}   beat-close: ${(v.beatCloseRate * 100).toFixed(1)}%   meanCLV: ${v.meanSignedClv.toFixed(3)}`);
  if (v.fired < MIN_SAMPLE) {
    console.log(`  → INSUFFICIENT SAMPLE (${v.fired} < ${MIN_SAMPLE}). No honest headline. Collect more data.\n`);
  } else if (v.beatCloseRate >= BREAK_EVEN && rmse.rmseImprovement > 0) {
    console.log(`  → CANDIDATE EDGE: clears ${(BREAK_EVEN * 100).toFixed(1)}% AND beats lock-now OOS.`);
    console.log("    NOT a conclusion — reconfirm on a different season before any reliance.\n");
  } else {
    console.log(`  → NO EDGE at τ=${TAU}: below ${(BREAK_EVEN * 100).toFixed(1)}% or no RMSE gain.`);
    console.log("    Honest result — shelve, publish the null, keep the close-beating bar intact.\n");
  }
  if (synthetic) {
    console.log("Reminder: numbers above are from synthetic data. Re-run with --samples for the real verdict.\n");
  }
}

main();
