#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  ".claude/commands/genesis-reconcile.md",
  "docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md",
  "docs/genesis/BRANCH_RECONCILIATION_SEED.md",
];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`missing required reconciliation file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

const command = read(requiredFiles[0]);
const contract = read(requiredFiles[1]);
const seed = read(requiredFiles[2]);

const requiredStatuses = [
  "ON_MAIN_EXACT",
  "ON_MAIN_EQUIVALENT",
  "ACTIVE_PR",
  "RECOVER_WHOLE",
  "RECOVER_PARTIAL",
  "REBASE_REQUIRED",
  "OWNER_GATE",
  "SUPERSEDED",
  "ARCHIVE_ONLY",
  "DELETE_AFTER_PROOF",
  "UNKNOWN",
];

for (const status of requiredStatuses) {
  if (!contract.includes(status)) errors.push(`reconciliation contract is missing status: ${status}`);
  if (!command.includes(status)) errors.push(`genesis-reconcile command is missing status: ${status}`);
}

const requiredOutputs = [
  "BRANCH_PR_LEDGER.json",
  "BRANCH_PR_LEDGER.md",
  "FILE_SYMBOL_OWNERSHIP.csv",
  "RECOVERY_WAVES.md",
  "DELETION_RECEIPTS.md",
  "audit-work-inventory.mjs",
];

for (const output of requiredOutputs) {
  if (!contract.includes(output)) errors.push(`reconciliation contract is missing required output: ${output}`);
  if (!command.includes(output)) errors.push(`genesis-reconcile command is missing required output: ${output}`);
}

for (const invariant of [
  "Improve, do not remove",
  "Ahead count is not evidence of missing work",
  "No branch deletion without a deletion receipt",
  "No bulk merge of a stale frontier branch",
]) {
  if (!contract.includes(invariant)) errors.push(`reconciliation contract is missing invariant: ${invariant}`);
}

for (const requiredSeedReference of [
  "#128",
  "#127",
  "#125",
  "#126",
  "#129",
  "#123",
  "#121",
  "#124",
  "#122",
  "#112",
  "#52",
  "#101",
  "claude/fix-metric-source-fixture-alignment",
]) {
  if (!seed.includes(requiredSeedReference)) {
    errors.push(`reconciliation seed is missing required ref: ${requiredSeedReference}`);
  }
}

if (!command.includes("/genesis-reconcile") && !command.includes("genesis-reconcile")) {
  errors.push("reconciliation command does not identify itself");
}

if (errors.length > 0) {
  console.error(`Galaxy Genesis reconciliation package validation FAILED (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Galaxy Genesis reconciliation package validation PASSED");
console.log(`- required files: ${requiredFiles.length}`);
console.log(`- required statuses: ${requiredStatuses.length}`);
console.log(`- required outputs: ${requiredOutputs.length}`);
console.log("- current reconciliation workstream: GX-R00");
