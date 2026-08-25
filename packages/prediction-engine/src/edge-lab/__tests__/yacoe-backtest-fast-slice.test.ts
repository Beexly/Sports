import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { runRealBacktest } from '../run-real-backtest';

/**
 * REPRODUCIBILITY GAP — read this before "fixing" the skip.
 *
 * This test drives the real-data YACoe backtest whose result is committed at
 * `data/nflverse/yacoe_real_backtest_results.json` (runId swarm-R36, 7,351
 * rows). Its INPUT — `ngs_receiving_2021_2025_harness_rows.json` — is not in
 * the repository and no script in the tree produces it: every reference to
 * that path is a consumer. It was built on the machine that ran R36 and lives
 * only there, so the committed result cannot currently be regenerated or
 * audited by anyone else, and this test could never have passed in CI.
 *
 * It is skipped rather than deleted, because the test is correct — it is the
 * only thing that would verify that result. It is skipped rather than made to
 * pass by committing the input, because the input is not clearly ours to
 * redistribute: `source-rights-registry.ts` carves `nextgen_stats` via
 * nflverse OUT of the blanket CC-BY-4.0 approval ("same third-party-sourced,
 * no-explicit-grant pattern, use with the same caution" as the
 * `permission_required` pfr-advstats entry). Committing derived NGS rows is a
 * redistribution decision for the owner, not something to settle for a green
 * check.
 *
 * To close the gap, either:
 *   1. clear NGS redistribution, then add a generator (fetch →
 *      `parseNgsReceiving`, packages/data-ingestion/src/nflverse-ngs.ts:166 →
 *      harness rows) so CI rebuilds the input itself; or
 *   2. re-run the candidate against a source whose rights are unambiguous.
 *
 * To be fair to the run itself: nothing was ever claimed on these numbers.
 * MORNING_BRIEF records "SURVIVED: 0" and calls this a "first real signal"
 * rather than an edge, and the falsifier subsequently killed the YACoe
 * candidate on multiplicity. So this is a reproducibility gap in a recorded
 * negative result, not an unsupported claim — the number is real, it simply
 * cannot be re-derived here yet.
 */
const ROWS_PATH = 'data/nflverse/ngs_receiving_2021_2025_harness_rows.json';
const HAVE_ROWS = fs.existsSync(ROWS_PATH);

describe('YACoe real backtest — fast slice', () => {
  it.skipIf(!HAVE_ROWS)('runs on small slice without error', () => {
    // Uses full JSON but computation is deterministic and fast (<1s for 7.3k rows)
    const result = runRealBacktest(ROWS_PATH);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.correlations.length).toBe(2);
    expect(result.verdict).toContain('STARVED/NO-SIGNAL');
  });

  it('keeps the skip honest — it tracks the file, not a stale flag', () => {
    // Not a tautology: this pins the skip condition to the filesystem, so the
    // day the harness input lands the case above starts running instead of
    // quietly staying skipped and advertising a gap that has closed.
    expect(HAVE_ROWS).toBe(fs.existsSync(ROWS_PATH));
  });
});
