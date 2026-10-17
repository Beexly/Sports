import { runRealBacktest } from './run-real-backtest';
console.log('Starting R36 real-data YACoe backtest...');
const result = runRealBacktest('data/nflverse/ngs_receiving_2021_2025_harness_rows.json');
console.log('Signals count:', result.signals.length);
console.log('Correlations:', JSON.stringify(result.correlations, null, 2));
console.log('VERDICT:', result.verdict);
