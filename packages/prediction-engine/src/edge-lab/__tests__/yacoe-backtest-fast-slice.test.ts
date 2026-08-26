import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { runRealBacktest, DEFAULT_NGS_ROWS_PATH } from '../run-real-backtest';

// The NGS harness artifact this exercises is NOT committed to the repo (it is
// absent from every origin ref, not merely from this branch), so the suite
// skips rather than fabricating rows to run against. The existence check uses
// the repo-root-anchored path from run-real-backtest, so the day the artifact
// is committed this suite starts running on its own — a cwd-relative check
// would resolve under packages/prediction-engine/ and skip forever.
const dataAvailable = existsSync(DEFAULT_NGS_ROWS_PATH);
const suite = dataAvailable ? describe : describe.skip;

if (!dataAvailable) {
  console.warn(
    `SKIPPED-GREEN: yacoe fast slice — missing ${DEFAULT_NGS_ROWS_PATH}`,
  );
}

suite('YACoe real backtest — fast slice', () => {
  it('runs on small slice without error', () => {
    // Uses full JSON but computation is deterministic and fast (<1s for 7.3k rows)
    const result = runRealBacktest();
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.correlations.length).toBe(2);
    expect(result.verdict).toContain('STARVED/NO-SIGNAL');
  });
});
