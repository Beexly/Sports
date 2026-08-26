#!/usr/bin/env tsx
/**
 * Run every settled ShadowSignal row through the repaired falsifier —
 * C-67 edge-program-verification's ranked action #2, and the single
 * fastest real-data edge test the program owns: `shadowProb` is a genuinely
 * independent, market-referenced probability that has been accumulating in
 * production on every refresh-odds cycle since the shadow-evaluation-pass
 * cron went live, and has never once been run through falsifyBind.
 *
 * NOT RUN as part of any autonomous session that produced this file — it
 * requires DATABASE_URL, which no such session had. This is prep, not a
 * result: it exists so the founder's "one DB export" is a single command,
 * not a design task, the next time this repo is opened with real
 * credentials.
 *
 * BEFORE TRUSTING A SURVIVOR FROM THIS SCRIPT: spot-check a small sample of
 * rows and confirm `evaluatedAt < settledAt` actually holds. The converter's
 * docblock (packages/prediction-engine/src/edge-lab/shadow-signal-backtest.ts)
 * derives that ordering from reading the recording code, not from real data —
 * this script is the first time it meets real data. Watch the printed
 * `exactTimestampCollisions` and `droppedMalformed` counts; a large or
 * unexpected value in either is a signal to investigate before trusting the
 * verdict, not to explain away.
 *
 * Usage:
 *   npx tsx scripts/edge-lab/run-shadow-falsifier.ts [--since=2026-01-01] [--min-n=100] [--seed=7]
 *
 * Exit codes: 0 = ran to completion (regardless of verdict) · 2 = mechanical
 * failure (DB unreachable, zero rows). A KILLED or PARKED verdict is NOT a
 * script failure — it is data, and this script's job is to report it
 * honestly, not to produce a SURVIVOR.
 */
import { loadSettledShadowSignalsForFalsifier } from "../../apps/web/lib/ops/shadow-signal-store";
import { convertShadowSignalsToBacktestRows, falsifyBind } from "@sports/prediction-engine";

function arg(flag: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return found ? found.split("=").slice(1).join("=") : undefined;
}

async function main(): Promise<void> {
  const sinceArg = arg("since");
  const since = sinceArg ? new Date(sinceArg) : new Date(0); // default: all history
  const minN = Number(arg("min-n") ?? "100");
  const seed = Number(arg("seed") ?? "7");

  if (sinceArg && Number.isNaN(since.getTime())) {
    console.error(`[run-shadow-falsifier] --since is not a valid date: "${sinceArg}"`);
    process.exit(2);
  }

  console.log(`[run-shadow-falsifier] loading settled ShadowSignal rows since ${since.toISOString()}...`);
  // loadSettledShadowSignalsForFalsifier fails OPEN (returns []), matching this
  // store's documented convention ("Reads/writes fail OPEN ... a DB blip must
  // degrade the shadow pipeline, never take down the caller") — so an empty
  // result here is ambiguous between "DB unreachable" and "genuinely zero rows
  // in this window". Either way there is nothing to run; report both honestly
  // as one exit-2 condition rather than guessing which occurred.
  const settled = await loadSettledShadowSignalsForFalsifier(since);
  if (settled.length === 0) {
    console.error(
      "[run-shadow-falsifier] FAILED — zero settled ShadowSignal rows returned (either the DB was " +
        "unreachable, or there are genuinely no settled rows in this window). Nothing was run.",
    );
    process.exit(2);
  }
  console.log(`[run-shadow-falsifier] ${settled.length} settled rows loaded.`);

  type SettledRow = (typeof settled)[number];
  const perModelVersion = new Map<string, SettledRow[]>();
  for (const r of settled) {
    const arr = perModelVersion.get(r.modelVersion) ?? [];
    arr.push(r);
    perModelVersion.set(r.modelVersion, arr);
  }

  for (const [modelVersion, rows] of perModelVersion) {
    console.log(`\n=== modelVersion: ${modelVersion} (${rows.length} rows) ===`);
    const { rows: backtestRows, droppedMalformed, exactTimestampCollisions } =
      convertShadowSignalsToBacktestRows(
        rows.map((r) => ({
          gameId: r.gameId,
          modelVersion: r.modelVersion,
          shadowProb: r.shadowProb,
          marketProb: r.marketProb,
          outcome: r.outcome as 0 | 1,
          evaluatedAt: r.evaluatedAt,
          settledAt: r.settledAt,
        })),
      );
    console.log(
      `converted: ${backtestRows.length} usable rows, ${droppedMalformed} dropped malformed, ` +
        `${exactTimestampCollisions} exact-timestamp collisions`,
    );
    if (exactTimestampCollisions > 0) {
      console.log(
        `  ^ INVESTIGATE before trusting this run's verdict — see this script's file header.`,
      );
    }

    const result = falsifyBind(backtestRows, { minN, seed });
    console.log(`leakage:      ${result.leakage.verdict} — ${result.leakage.detail}`);
    console.log(`shuffle:      ${result.shuffle.verdict} — ${result.shuffle.detail}`);
    console.log(`split:        ${result.split.verdict} — ${result.split.detail}`);
    console.log(`multiplicity: ${result.multiplicity.verdict} — ${result.multiplicity.detail}`);
    console.log(`marketDataCoverage: ${JSON.stringify(result.marketDataCoverage)}`);
    console.log(`OVERALL: ${result.overall.verdict} — ${result.overall.reason}`);
  }

  console.log(
    "\n[run-shadow-falsifier] Reminder: a SURVIVOR here is not a SHIP claim. C-32 (AGENT_LEDGER.md) " +
      "still bars publishing any win rate, ROI, or beat-close claim. This is diagnostic evidence for " +
      "the founder to review, same as every other falsifier run in this program.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[run-shadow-falsifier] unexpected error: ${err instanceof Error ? err.stack : err}`);
    process.exit(2);
  });
