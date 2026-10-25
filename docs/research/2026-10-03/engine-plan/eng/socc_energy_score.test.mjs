import assert from "node:assert/strict";
import { soccEnergyScore } from "./socc_energy_score.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("identical members zero pair contribution", () => {
  const ens = [[1, 2], [1, 2]];
  const y = [1, 2];
  const r = soccEnergyScore(ens, y);
  assert.equal(r.ok, true);
  assert.equal(r.energyScore, 0);
});

check("single member reduces to distance", () => {
  const ens = [[0, 0]];
  const y = [3, 4];
  const r = soccEnergyScore(ens, y);
  assert.equal(r.ok, true);
  assert.equal(r.energyScore, 5);
});

check("non-finite fails closed", () => {
  const r = soccEnergyScore([[1, Number.NaN]], [1, 2]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_ensemble");
});

check("dimension mismatch fails closed", () => {
  const r = soccEnergyScore([[1, 2]], [1]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "dimension_mismatch");
});

check("empty ensemble fails closed", () => {
  const r = soccEnergyScore([], [1, 2]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_ensemble");
});

console.log("TEST_COUNT", passed);
