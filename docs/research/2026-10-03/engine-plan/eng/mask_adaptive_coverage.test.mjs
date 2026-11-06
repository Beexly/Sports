import { maskAdaptiveCoverage } from './mask_adaptive_coverage.mjs';
import assert from 'node:assert/strict';

// fail-closed
assert.deepEqual(maskAdaptiveCoverage(NaN, 0.1), { ok: false, reason: 'non_finite_or_invalid_coverage' });
assert.deepEqual(maskAdaptiveCoverage(0.9, NaN), { ok: false, reason: 'non_finite_or_invalid_alpha' });
assert.deepEqual(maskAdaptiveCoverage(0.9, 0.1, -0.1), { ok: false, reason: 'non_finite_or_invalid_epsilon' });
assert.deepEqual(maskAdaptiveCoverage(1.1, 0.1), { ok: false, reason: 'non_finite_or_invalid_coverage' });

// valid cases
assert.deepEqual(maskAdaptiveCoverage(0.9, 0.1), { ok: true, valid: true, target: 0.9 });
assert.deepEqual(maskAdaptiveCoverage(0.85, 0.1, 0.05), { ok: true, valid: true, target: 0.85 });
assert.deepEqual(maskAdaptiveCoverage(0.8, 0.1, 0.05), { ok: true, valid: false, target: 0.85 });

console.log('ok');
