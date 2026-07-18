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
];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
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

const skill = read(requiredFiles[0]);
const contract = read(requiredFiles[1]);
const baseline = read(requiredFiles[2]);
const matrix = parseJson(requiredFiles[3]);
const appendix = read(requiredFiles[4]);

for (const term of [
  "REVIEW",
  "FREEZE CONTRACT",
  "CODE",
  "INDEPENDENT REVIEW",
  "IMPROVE",
  "POLISH",
  "FINAL VERIFY",
  "CONTINUE",
]) {
  if (!skill.includes(term)) errors.push(`gse-launch skill is missing loop term: ${term}`);
  if (!contract.includes(term)) errors.push(`production activation contract is missing loop term: ${term}`);
}

for (const phase of [
  "Phase L0",
  "Phase L1",
  "Phase L2",
  "Phase L3",
  "Phase L4",
  "Phase L5",
  "Phase L6",
  "Phase L7",
  "Phase L8",
  "Phase L9",
  "Phase L10",
  "Phase L11",
]) {
  if (!contract.includes(phase)) errors.push(`production activation contract is missing phase: ${phase}`);
}

for (const invariant of [
  "finish the live current queue before launch convergence",
  "No paywall weakening",
  "No future leakage",
  "No bulk merge of a frontier branch",
  "No hidden production action",
  "No auto-publication",
]) {
  if (!contract.includes(invariant)) errors.push(`production activation contract is missing invariant: ${invariant}`);
}

for (const capability of [
  "Nightly Sentinel Repair",
  "Revenue Contract Audit",
  "Revenue Path End-to-End Proof",
  "Production Drift and Claim Reconciliation",
  "Release Candidate Convergence",
  "Full Release Qualification",
  "Owner Activation Packet",
  "Gate Opening Matrix",
  "Controlled Production Deployment",
]) {
  if (!contract.includes(capability)) errors.push(`production activation contract is missing capability: ${capability}`);
}

for (const boundary of [
  "Stripe test mode",
  "explicit founder authorization",
  "EVIDENCE_ACCRUAL",
  "RIGHTS_LEGAL_OR_HIGH_RISK",
]) {
  if (!skill.includes(boundary) && !contract.includes(boundary)) {
    errors.push(`production activation package is missing boundary: ${boundary}`);
  }
}

for (const baselineFinding of [
  "Refund promise contradiction",
  "Microsoft Clarity",
  "Nightly Sentinel has zero unattended coverage",
  "Paid-feature promise parity is not yet proven",
  "Production code does not contain the current recovery program",
]) {
  if (!baseline.includes(baselineFinding)) {
    errors.push(`live production baseline is missing confirmed finding: ${baselineFinding}`);
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
  if (!Array.isArray(matrix.gates) || matrix.gates.length < 15) {
    errors.push("LAUNCH_GATE_MATRIX must contain at least 15 explicit launch gates");
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
      if (ids.has(gate.id)) errors.push(`duplicate launch gate id: ${gate.id}`);
      ids.add(gate.id);
      if (!allowedStatuses.has(gate.status)) {
        errors.push(`${prefix}.status is outside the allowed vocabulary: ${String(gate.status)}`);
      }
      if (typeof gate.mayAutoOpen !== "boolean") {
        errors.push(`${prefix}.mayAutoOpen must be boolean`);
      }
      for (const field of ["currentEvidence", "requiredEvidence"]) {
        if (!Array.isArray(gate[field]) || gate[field].length === 0) {
          errors.push(`${prefix}.${field} must be a non-empty array`);
        }
      }
    }

    for (const requiredGate of [
      "LR-GATE-002",
      "LR-GATE-005",
      "LR-GATE-006",
      "LR-GATE-007",
      "LR-GATE-008",
      "LR-GATE-009",
      "LR-GATE-010",
      "LR-GATE-012",
      "LR-GATE-013",
      "LR-GATE-014",
      "LR-GATE-017",
      "LR-GATE-018",
      "LR-GATE-020",
    ]) {
      if (!ids.has(requiredGate)) errors.push(`LAUNCH_GATE_MATRIX is missing required gate: ${requiredGate}`);
    }
  }
}

for (const appendixTerm of [
  "PAID_PROMISE_LEDGER",
  "RELEASE_MANIFEST",
  "Nightly Sentinel v2",
  "24-hour",
  "7-day",
  "all technically and legally eligible gates open",
]) {
  if (!appendix.includes(appendixTerm)) {
    errors.push(`launch convergence appendix is missing requirement: ${appendixTerm}`);
  }
}

for (const skillReference of [
  "PRODUCTION_ACTIVATION_CONTRACT.md",
  "LAUNCH_GATE_MATRIX.json",
  "LIVE_PRODUCTION_BASELINE_2026-07-18.md",
  "LAUNCH_REVENUE_CONVERGENCE_CONTRACT.md",
  "two consecutive scheduled green runs",
]) {
  if (!skill.includes(skillReference)) {
    errors.push(`gse-launch skill is missing launch-package reference: ${skillReference}`);
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
console.log("- live production baseline and paid-promise requirements: validated");
console.log("- review/code/improve/review/polish/continue loop: validated");
console.log("- protected production and revenue boundaries: validated");
