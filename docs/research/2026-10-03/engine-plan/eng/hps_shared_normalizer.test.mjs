import { test } from "node:test";
import assert from "node:assert/strict";
import { hpsSharedNormalizer } from "./hps_shared_normalizer.mjs";

test("hpsSharedNormalizer fail closed on empty", () => {
  const r = hpsSharedNormalizer([], 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_similarities");
});

test("hpsSharedNormalizer fail closed on bad T", () => {
  const r = hpsSharedNormalizer([0.5], 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_temperature");
});

test("hpsSharedNormalizer computes printed eq", () => {
  const sims = [1.0, 0.0];
  const T = 1;
  const r = hpsSharedNormalizer(sims, T);
  assert.equal(r.ok, true);
  const expected = Math.log((Math.exp(1) + Math.exp(0)) / 2);
  assert.ok(Math.abs(r.normalizer - expected) < 1e-10);
  assert.equal(r.K, 2);
});

test("hpsSharedNormalizer fail closed on non-finite", () => {
  const r = hpsSharedNormalizer([1, NaN], 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_similarity");
});
