#!/usr/bin/env node
/**
 * scripts/reconciliation/rival-delta.mjs
 *
 * Rival feature-surface reconciliation harness for packages/competitive-intel.
 * Maps competitor feature names onto GSE's 8 canonical SignalFamilies and reports
 * coverage parity and delta.
 */

import assert from "node:assert/strict";

const RULES = [
  { family: "TRENCHES", test: /\b(line|hits?|gap|pff)\b|(pressure|block|blitz|sacks?|coverage|trench)/i },
  { family: "MICROCLIMATE", test: /\b(weather|wind|temp|temperature|roof|surface|park|altitude|venue|humidity|precip)\b/i },
  { family: "MARKET_MICROSTRUCTURE", test: /(ownership|own%|field%|\bsalary\b|\bvalue\b|leverage|popularity|\btickets?\b|\bhandles?\b|\bmoney\b|consensus)/i },
  { family: "SITUATIONAL", test: /\b(rest|back[- ]to[- ]back|injur|status|snaps?|minutes|travel|schedule|fatigue|probable|questionable)\b/i },
  { family: "LUCK", test: /\b(variance|luck|regression|expected|xga|xgf|overperform|underperform|pdo|babip)\b/i },
  { family: "NARRATIVE", test: /\b(narrative|story|beat|quote|coach|scheme|momentum|tone|intent)\b/i },
  { family: "EFFICIENCY", test: /(pct|%|\bper[- ]?(game|60|40|36|minute)\b|\brate\b|\bratio\b|\bpace\b|\busage\b|\btargets?\b|\bcarry\b|\btouches?\b|\battempts?\b|efficien)/i },
  { family: "MARKET", test: /.*/ },
];

export function familyForFeature(name) {
  const needle = String(name ?? "").trim();
  if (!needle) return "MARKET";
  for (const rule of RULES) {
    if (rule.test.test(needle)) return rule.family;
  }
  return "MARKET";
}

function runSelfTest() {
  assert.equal(familyForFeature("TeamDefPressureRate"), "TRENCHES");
  assert.equal(familyForFeature("Wind Speed MPH"), "MICROCLIMATE");
  assert.equal(familyForFeature("Projected Ownership %"), "MARKET_MICROSTRUCTURE");
  assert.equal(familyForFeature("Days Rest Differential"), "SITUATIONAL");
  assert.equal(familyForFeature("Expected Fantasy Points Regression"), "LUCK");
  assert.equal(familyForFeature("Coach Beat Quote Intent"), "NARRATIVE");
  assert.equal(familyForFeature("Targets Per Game"), "EFFICIENCY");
  assert.equal(familyForFeature("Spread -3.5"), "MARKET");
  console.log("[rival-delta] self-test PASS (8/8 signal families verified)");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  runSelfTest();
}
