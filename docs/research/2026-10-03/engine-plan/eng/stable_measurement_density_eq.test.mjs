import assert from "node:assert/strict";
import { stableMeasurementDensityEq } from "./stable_measurement_density_eq.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq holds for equal densities", () => {
  const r = stableMeasurementDensityEq(0.5, 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.equal, true);
});

check("eq fails for unequal densities", () => {
  const r = stableMeasurementDensityEq(0.5, 0.6);
  assert.equal(r.ok, true);
  assert.equal(r.equal, false);
});

check("non-finite fails closed", () => {
  const r = stableMeasurementDensityEq(Number.NaN, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_density");
});

check("negative fails closed", () => {
  const r = stableMeasurementDensityEq(-0.1, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "negative_density");
});

check("non-number fails closed", () => {
  assert.equal(stableMeasurementDensityEq("0.5", 0.5).ok, false);
  assert.equal(stableMeasurementDensityEq(0.5, null).ok, false);
});

console.log("TEST_COUNT", passed);
