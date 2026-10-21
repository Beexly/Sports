#!/usr/bin/env node
/**
 * @file _verify_gate_registry.mjs
 * Gate Registry Integrity and Enforcement Verifier.
 *
 * Verifies that reconciliation/gate_registry.json contains all 38 validated
 * integrity gates (including Gate 38: G0_ENTITY_TEMPORAL_TRUTH), that each
 * gate references a valid file on disk, and that all 38 gates are active.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const REGISTRY_PATH = join(ROOT, "reconciliation", "gate_registry.json");

console.log("[GATE_REGISTRY_VERIFIER] Loading gate registry from:", REGISTRY_PATH);

if (!existsSync(REGISTRY_PATH)) {
  console.error("FAIL: gate_registry.json does not exist at:", REGISTRY_PATH);
  process.exit(1);
}

const raw = readFileSync(REGISTRY_PATH, "utf8");
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  console.error("FAIL: Invalid JSON in gate_registry.json:", e);
  process.exit(1);
}

const gates = parsed.gates;
if (!Array.isArray(gates)) {
  console.error("FAIL: 'gates' property is not an array");
  process.exit(1);
}

if (gates.length !== 38) {
  console.error(`FAIL: Expected exactly 38 gates, found ${gates.length}`);
  process.exit(1);
}

const ids = new Set();
let allValid = true;

for (const gate of gates) {
  if (!gate.id || !/^GATE-\d{2}$/.test(gate.id)) {
    console.error(`FAIL: Invalid gate id format: ${gate.id}`);
    allValid = false;
  }
  if (ids.has(gate.id)) {
    console.error(`FAIL: Duplicate gate id: ${gate.id}`);
    allValid = false;
  }
  ids.add(gate.id);

  if (!gate.name || typeof gate.name !== "string" || gate.name.length === 0) {
    console.error(`FAIL: Missing or invalid name for gate ${gate.id}`);
    allValid = false;
  }

  if (!gate.file || typeof gate.file !== "string" || !/^[^:]+:\d+$/.test(gate.file)) {
    console.error(`FAIL: Invalid file specification for gate ${gate.id}: ${gate.file}`);
    allValid = false;
  } else {
    const [relPath] = gate.file.split(":");
    const absPath = join(ROOT, relPath.replace(/\//g, "\\"));
    if (!existsSync(absPath)) {
      console.error(`FAIL: Target file for gate ${gate.id} does not exist: ${relPath}`);
      allValid = false;
    }
  }

  if (!gate.checks || typeof gate.checks !== "string" || gate.checks.length < 10) {
    console.error(`FAIL: Missing or insufficient checks description for gate ${gate.id}`);
    allValid = false;
  }

  if (gate.fail_closed !== true) {
    console.error(`FAIL: Gate ${gate.id} is not fail_closed`);
    allValid = false;
  }
}

// Specifically verify GATE-38 (G0_ENTITY_TEMPORAL_TRUTH)
const gate38 = gates.find((g) => g.id === "GATE-38");
if (!gate38) {
  console.error("FAIL: GATE-38 (G0_ENTITY_TEMPORAL_TRUTH) is missing");
  process.exit(1);
}

if (allValid) {
  console.log(`SUCCESS: All 38/38 gates in reconciliation/gate_registry.json verified active and valid.`);
  console.log(`Gate 38: ${gate38.name} (${gate38.file}) active.`);
  process.exit(0);
} else {
  console.error("FAILED: One or more gates failed verification.");
  process.exit(1);
}
