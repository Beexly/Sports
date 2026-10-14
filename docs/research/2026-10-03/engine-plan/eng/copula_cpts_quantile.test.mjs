import { copulaCptsQuantile } from './copula_cpts_quantile.mjs';

// Fail-closed tests for copulaCptsQuantile

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg + ': expected ' + expected + ', got ' + actual);
  }
}

function assertThrows(fn, msg) {
  try {
    fn();
    throw new Error(msg + ': expected throw');
  } catch (e) {
    if (e.message.includes('expected throw')) throw e;
  }
}

// Valid case
const scores = [1, 2, 3, 4, 5];
assertEqual(copulaCptsQuantile(0.2, scores), 5, 'quantile for alpha=0.2');
assertEqual(copulaCptsQuantile(0.5, scores), 3, 'quantile for alpha=0.5');

// Fail-closed cases
assertThrows(() => copulaCptsQuantile(0, scores), 'alpha=0');
assertThrows(() => copulaCptsQuantile(1, scores), 'alpha=1');
assertThrows(() => copulaCptsQuantile(0.5, []), 'empty scores');
assertThrows(() => copulaCptsQuantile(0.5, null), 'null scores');

console.log('All tests passed');
