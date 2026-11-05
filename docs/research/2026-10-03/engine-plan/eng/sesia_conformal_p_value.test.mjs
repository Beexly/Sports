import { sesiaConformalPValue } from './sesia_conformal_p_value.mjs';
import assert from 'node:assert/strict';

// fail-closed tests
assert.equal(sesiaConformalPValue([], 1), null);
assert.equal(sesiaConformalPValue([1,2], NaN), null);
assert.equal(sesiaConformalPValue([1,'a'], 1), null);

// valid: scores [1,3,2], test 2.5 -> count of <=2.5 is 1 (the 1) +1 =2, n=3, p=2/4=0.5
assert.equal(sesiaConformalPValue([1,3,2], 2.5), 0.5);

// all larger: test 0, scores positive, count=1, p=1/4=0.25
assert.equal(sesiaConformalPValue([1,2,3], 0), 0.25);

console.log('ok');
