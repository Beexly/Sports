import { describe, it, expect } from 'vitest';
import { runRealBacktest } from '../run-real-backtest';

import fs from 'node:fs';

describe('YACoe real backtest — fast slice', () => {
  it('runs on small slice without error', () => {
    const dataPath = 'data/nflverse/ngs_receiving_2021_2025_harness_rows.json';
    if (!fs.existsSync(dataPath)) {
      return; // data file not in repo; skip gracefully
    }
    const result = runRealBacktest(dataPath);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.correlations.length).toBe(2);
    expect(result.verdict).toContain('STARVED/NO-SIGNAL');
  });
});
