import assert from "node:assert/strict";
export function check(actual) {
  assert.partialDeepStrictEqual(actual, { ok: true });
}
