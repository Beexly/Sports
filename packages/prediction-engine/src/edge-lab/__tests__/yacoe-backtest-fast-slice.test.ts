import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { runRealBacktest } from '../run-real-backtest';

// The real NGS harness rows are a data artifact generated on the originating
// machine and are not committed to this repo (no fake data — see CLAUDE.md
// rule 1). Gated the same way apps/web/__tests__/ai-control-plane-claim-pg.test.ts
// gates on a missing disposable-Postgres URL: skip, don't fabricate.
const DATA_PATH = 'data/nflverse/ngs_receiving_2021_2025_harness_rows.json';
const dataAvailable = existsSync(DATA_PATH);
const suite = dataAvailable ? describe : describe.skip;

if (!dataAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    `SKIPPED-GREEN: yacoe-backtest-fast-slice.test.ts did not run — ${DATA_PATH} ` +
      `not present in this checkout. Real-data YACoe backtest proof not exercised this run.`,
  );
}

suite('YACoe real backtest — fast slice', () => {
  it('runs on small slice without error', () => {
    // Uses full JSON but computation is deterministic and fast (<1s for 7.3k rows)
    const result = runRealBacktest(DATA_PATH);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.correlations.length).toBe(2);
    expect(result.verdict).toContain('STARVED/NO-SIGNAL');
  });
});
