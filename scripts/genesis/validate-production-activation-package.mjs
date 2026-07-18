#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  ".claude/skills/gse-launch/SKILL.md",
  "docs/genesis/PRODUCTION_ACTIVATION_CONTRACT.md",
];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`missing required production activation file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

const skill = read(requiredFiles[0]);
const contract = read(requiredFiles[1]);

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

if (errors.length > 0) {
  console.error(`Galaxy Genesis production activation package validation FAILED (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Galaxy Genesis production activation package validation PASSED");
console.log(`- required files: ${requiredFiles.length}`);
console.log("- queue-first launch sequence: L0-L11");
console.log("- review/code/improve/review/polish/continue loop: validated");
console.log("- protected production and revenue boundaries: validated");
