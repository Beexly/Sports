#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  ".claude/skills/gse-launch/SKILL.md",
  "docs/genesis/PRODUCTION_ACTIVATION_CONTRACT.md",
  "docs/genesis/LIVE_PRODUCTION_BASELINE_2026-07-18.md",
  "docs/genesis/LAUNCH_GATE_MATRIX.json",
  "docs/genesis/LAUNCH_REVENUE_CONVERGENCE_CONTRACT.md",
  "docs/genesis/PACKAGE_INVENTORY.md",
];

function pathOf(relativePath) {
  return resolve(root, relativePath);
}

function read(relativePath) {
  const absolutePath = pathOf(relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`missing required production activation file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function parseJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    errors.push(
      `invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

for (const file of requiredFiles) read(file);

const skill = read(requiredFiles[0]);
const contract = read(requiredFiles[1]);
const baseline = read(requiredFiles[2]);
const matrix = parseJson(requiredFiles[3]);
const appendix = read(requiredFiles[4]);
const inventory = read(requiredFiles[5]);

const loopTerms = [
  "REVIEW",
  "FREEZE CONTRACT",
  "CODE",
  "INDEPENDENT REVIEW",
  "IMPROVE",
  "POLISH",
  "FINAL VERIFY",
  "CONTINUE",
];

for (const term of loopTerms) {
  if (!skill.includes(term)) errors.push(`gse-launch skill is missing loop term: ${term}`);
  if (!contract.includes(term)) errors.push(`production activation contract is missing loop term: ${term}`);
}

for (let phase = 0; phase <= 11; phase += 1) {
  if (!contract.includes(`Phase L${phase}`)) {
    errors.push(`production activation contract is missing Phase L${phase}`);
  }
}

for (const reference of [
  "PRODUCTION_ACTIVATION_CONTRACT.md",
  "LAUNCH_GATE_MATRIX.json",
  "LIVE_PRODUCTION_BASELINE_2026-07-18.md",
  "LAUNCH_REVENUE_CONVERGENCE_CONTRACT.md",
]) {
  if (!skill.includes(reference)) errors.push(`gse-launch skill is missing reference: ${reference}`);
  if (!inventory.includes(reference)) errors.push(`PACKAGE_INVENTORY is missing reference: ${reference}`);
}

for (const invariant of [
  "No paywall weakening",
  "No future leakage",
  "No bulk merge of a frontier branch",
  "No hidden production action",
  "No auto-publication",
]) {
  if (!contract.includes(invariant)) errors.push(`production activation contract is missing invariant: ${invariant}`);
}

for (const baselineMarker of [
  "PROD-001",
  "PROD-002",
  "PROD-003",
  "PROD-004",
  "PROD-005",
  "0e56c4770e715630eaaac974702336447e367b5a",
]) {
  if (!baseline.includes(baselineMarker)) {
    errors.push(`live production baseline is missing marker: ${baselineMarker}`);
  }
}

for (const appendixMarker of [
  "LR-000",
  "LR-008",
  "PAID_PROMISE_LEDGER",
  "RELEASE_MANIFEST",
  "Nightly Sentinel v2",
  "24-hour",
  "7-day",
]) {
  if (!appendix.includes(appendixMarker)) {
    errors.push(`launch convergence appendix is missing marker: ${appendixMarker}`);
  }
}

const allowedStatuses = new Set([
  "PASS",
  "PARTIAL",
  "FAIL",
  "UNKNOWN",
  "BLOCKED",
  "OWNER_GATE",
  "EVIDENCE_GATED",
  "CLOSED_BY_DESIGN",
  "NOT_APPLICABLE",
]);

if (matrix) {
  if (matrix.product !== "Galaxy Sports Edge") {
    errors.push("LAUNCH_GATE_MATRIX product must remain Galaxy Sports Edge");
  }
  if (matrix.program !== "Launch and Revenue Convergence") {
    errors.push("LAUNCH_GATE_MATRIX program must remain Launch and Revenue Convergence");
  }
  if (!Array.isArray(matrix.statusVocabulary)) {
    errors.push("LAUNCH_GATE_MATRIX statusVocabulary must be an array");
  } else {
    for (const status of allowedStatuses) {
      if (!matrix.statusVocabulary.includes(status)) {
        errors.push(`LAUNCH_GATE_MATRIX statusVocabulary is missing ${status}`);
      }
    }
  }

  if (!Array.isArray(matrix.gates) || matrix.gates.length < 20) {
    errors.push("LAUNCH_GATE_MATRIX must contain at least 20 explicit gates");
  } else {
    const ids = new Set();
    for (const [index, gate] of matrix.gates.entries()) {
      const prefix = `LAUNCH_GATE_MATRIX gates[${index}]`;
      if (!gate || typeof gate !== "object") {
        errors.push(`${prefix} must be an object`);
        continue;
      }

      for (const field of ["id", "name", "class", "criticality", "status", "owner", "rollback"]) {
        if (typeof gate[field] !== "string" || gate[field].trim() === "") {
          errors.push(`${prefix}.${field} must be a non-empty string`);
        }
      }

      if (typeof gate.id === "string") {
        if (!/^LR-GATE-\d{3}$/.test(gate.id)) {
          errors.push(`${prefix}.id must match LR-GATE-NNN`);
        }
        if (ids.has(gate.id)) errors.push(`duplicate launch gate id: ${gate.id}`);
        ids.add(gate.id);
      }

      if (!allowedStatuses.has(gate.status)) {
        errors.push(`${prefix}.status is outside the allowed vocabulary: ${String(gate.status)}`);
      }
      if (typeof gate.mayAutoOpen !== "boolean") {
        errors.push(`${prefix}.mayAutoOpen must be boolean`);
      }
      for (const field of ["currentEvidence", "requiredEvidence"]) {
        if (!Array.isArray(gate[field]) || gate[field].length === 0) {
          errors.push(`${prefix}.${field} must be a non-empty array`);
        } else if (gate[field].some((value) => typeof value !== "string" || value.trim() === "")) {
          errors.push(`${prefix}.${field} must contain non-empty strings only`);
        }
      }
      if (gate.criticality === "P0" && gate.status === "UNKNOWN" && gate.requiredEvidence.length === 0) {
        errors.push(`${prefix} is P0 UNKNOWN without an evidence contract`);
      }
    }

    for (let gateNumber = 1; gateNumber <= 20; gateNumber += 1) {
      const id = `LR-GATE-${String(gateNumber).padStart(3, "0")}`;
      if (!ids.has(id)) errors.push(`LAUNCH_GATE_MATRIX is missing ${id}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Galaxy Genesis production activation package validation FAILED (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Galaxy Genesis production activation package validation PASSED");
console.log(`- required files: ${requiredFiles.length}`);
console.log("- canonical queue-first launch sequence: L0-L11");
console.log(`- machine-readable launch gates: ${matrix?.gates?.length ?? 0}`);
console.log("- live production baseline markers: 5");
console.log("- paid-promise, release, sentinel, and post-launch appendix: validated");
console.log("- review/code/improve/review/polish/continue loop: validated");
