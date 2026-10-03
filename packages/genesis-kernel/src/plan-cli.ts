#!/usr/bin/env node
/**
 * `npm run genesis:plan` — compiles the fixture Intelligence Contract against
 * the fixture candidates and writes a Plan Receipt. Impure shell only: all
 * planning logic lives in plan-compiler.ts/plan-receipt.ts (pure). Not
 * exported from index.ts. `repositoryCommit` is sourced here (git rev-parse,
 * with fallbacks) and INJECTED into the pure builder — the planner itself
 * never shells out.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalHash } from "./canonical-json";
import { buildCodebaseTwin } from "./codebase-twin";
import type { IntelligenceContract } from "./contracts";
import { compileCandidates } from "./plan-compiler";
import { buildPlanReceipt } from "./plan-receipt";
import { REPO_EVIDENCE } from "./repo-evidence";
import type { TemporalCandidate } from "./hard-constraints";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "fixtures");
const OUT_DIR = resolve(__dirname, "../../../tmp/genesis");
const OUT_FILE = resolve(OUT_DIR, "plan-receipt.json");

function repositoryCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: __dirname, encoding: "utf8" }).trim();
  } catch {
    return process.env["GITHUB_SHA"] ?? "UNKNOWN";
  }
}

function main(): void {
  const contract = JSON.parse(readFileSync(resolve(FIXTURES_DIR, "internal-brief.contract.json"), "utf8")) as IntelligenceContract;
  const candidates = JSON.parse(readFileSync(resolve(FIXTURES_DIR, "capability-candidates.example.json"), "utf8")) as readonly TemporalCandidate[];

  const twin = buildCodebaseTwin(REPO_EVIDENCE);
  const outcome = compileCandidates(contract, candidates);
  const receipt = buildPlanReceipt({
    contract,
    outcome,
    codebaseTwinHash: twin.twinHash,
    contractHash: canonicalHash(contract),
    candidateSetHash: canonicalHash(candidates),
    repositoryCommit: repositoryCommit(),
    generatedAt: new Date().toISOString(),
  });

  console.log(`decision: ${receipt.decision}`);
  console.log(`selected: ${receipt.selectedPlan?.planId ?? "(none)"}`);
  console.log(`rejected: ${receipt.rejectedPlans.length}`);
  console.log(`receiptHash: ${receipt.receiptHash}`);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${OUT_FILE}`);
}

main();
