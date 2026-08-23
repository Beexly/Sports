import { describe, it, expect } from 'vitest';
import { runRealBacktest } from '../run-real-backtest';

describe('YACoe real backtest — fast slice', () => {
  it('runs on small slice without error', () => {
    // Uses full JSON but computation is deterministic and fast (<1s for 7.3k rows)
    const result = runRealBacktest('data/nflverse/ngs_receiving_2021_2025_harness_rows.json');
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.correlations.length).toBe(2);
    expect(result.verdict).toContain('STARVED/NO-SIGNAL');
  });
});
