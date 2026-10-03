#!/usr/bin/env node
/**
 * W2-04 benchmark: for each of 3 small, real historical tasks pulled from
 * this repo's actual commit history, measure:
 *
 *  (a) "naive full context" size — every file the fix commit touched, plus
 *      every file that statically imports those files (real git-grep hits,
 *      not estimated) — the rough proxy a human/agent would have pasted in
 *      wholesale before touching the code.
 *  (b) the compiled ContextPackManifest size for the same objective.
 *  (c) a determinism check — compile twice, diff, compare contentHash.
 *
 * Token counts use the real `gpt-tokenizer` (cl100k_base, the GPT-4/3.5
 * encoding) — not a bytes/4 estimate — run against real file content read
 * from the actual git blobs at each commit's parent. Every number below is
 * measured by actually running this script, not guessed.
 */
import path from "node:path";
import { encode } from "gpt-tokenizer";
import { compileContextPack } from "./compiler.js";
import { canonicalStringify } from "./canonical.js";
import { filesTouchedBy, git, grepFilesAtSha, readBlobAtSha } from "./git.js";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..", "..");

interface HistoricalTask {
  name: string;
  objective: string;
  fixSha: string; // the real commit that made the fix
  targetFiles: string[]; // repo-relative paths the compiler should focus on
}

const TASKS: HistoricalTask[] = [
  {
    name: "T1: guard-order fix (council ledgers)",
    objective:
      "Reorder input validation before the admin auth check in council ledger write paths (logHandoff/logSubagentRun/reviewSubagentRun) so seat/confidence guards fire before LedgerStoreUnavailableError in test environments",
    fixSha: "fcec492c",
    targetFiles: ["apps/web/lib/jarvis/ledgers.ts"],
  },
  {
    name: "T2: S3 field-rename rebase fix (opportunity-engine evidence)",
    objective:
      "Rebase S3's isMoneyBearing() onto S1's renamed scenarioAvailableCreditsUsd field (was availableCredits) in opportunity-engine evidence code",
    fixSha: "228f04f6",
    targetFiles: ["apps/web/lib/opportunity-engine/evidence.ts"],
  },
  {
    name: "T3: seed.ts parse-blocker fix (W2-01)",
    objective:
      "Remove the unresolved merge/paste corruption (stray main() calls + orphaned duplicate seed fragments) blocking prisma/seed.ts from parsing",
    fixSha: "c24588f3",
    targetFiles: ["packages/db/prisma/seed.ts"],
  },
];

function tokenCount(text: string): number {
  return encode(text).length;
}

/** Real "naive full context": fix-commit-touched files + files at the pre-fix parent sha that import them (git grep, real hits). */
function naiveFullContext(fixSha: string, cwd: string): { files: string[]; text: string; bytes: number } {
  const parentSha = git(["rev-parse", `${fixSha}^`], cwd).trim();
  const touched = filesTouchedBy(fixSha, cwd);

  const fileSet = new Set<string>(touched);
  for (const t of touched) {
    if (!t.endsWith(".ts") && !t.endsWith(".tsx")) continue;
    const stem = t.replace(/\.tsx?$/, "").split("/").slice(-1)[0] ?? "";
    const dirStem = path.posix.dirname(t).split("/").slice(-1)[0] ?? "";
    const importers = grepFilesAtSha(parentSha, `${dirStem}/${stem}`, cwd).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx")
    );
    for (const imp of importers) fileSet.add(imp);
  }

  const parts: string[] = [];
  let bytes = 0;
  const files = Array.from(fileSet).sort();
  for (const f of files) {
    try {
      const content = readBlobAtSha(parentSha, f, cwd);
      parts.push(`// ===== ${f} =====\n${content}`);
      bytes += Buffer.byteLength(content, "utf8");
    } catch {
      // file didn't exist at parent (e.g. newly added by the fix) — skip, it's not "naive context to load"
    }
  }
  return { files, text: parts.join("\n\n"), bytes };
}

async function runOne(task: HistoricalTask) {
  const cwd = REPO_ROOT;
  const naive = naiveFullContext(task.fixSha, cwd);
  const naiveTokens = tokenCount(naive.text);

  const parentSha = git(["rev-parse", `${task.fixSha}^`], cwd).trim();

  const manifest1 = await compileContextPack({
    cwd,
    objective: task.objective,
    targetFiles: task.targetFiles,
    headRef: parentSha, // compile against the PRE-FIX state, same as a naive agent would have seen
    collisionInventoryRef: "origin/nova/convergence-inventory-tooling",
    collisionInventoryPath: "reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.json",
  });
  const manifest2 = await compileContextPack({
    cwd,
    objective: task.objective,
    targetFiles: task.targetFiles,
    headRef: parentSha,
    collisionInventoryRef: "origin/nova/convergence-inventory-tooling",
    collisionInventoryPath: "reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.json",
  });

  const json1 = canonicalStringify(manifest1);
  const json2 = canonicalStringify(manifest2);
  const deterministic = json1 === json2 && manifest1.contentHash === manifest2.contentHash;

  const packTokens = tokenCount(json1);
  const packBytes = Buffer.byteLength(json1, "utf8");

  return {
    task: task.name,
    fixSha: task.fixSha,
    parentSha,
    naiveFiles: naive.files,
    naiveBytes: naive.bytes,
    naiveTokens,
    packBytes,
    packTokens,
    reductionFactor: naiveTokens / packTokens,
    deterministic,
    contentHash: manifest1.contentHash,
  };
}

async function main() {
  const results = [];
  for (const t of TASKS) {
    console.log(`Compiling: ${t.name} ...`);
    const r = await runOne(t);
    results.push(r);
    console.log(
      `  naive: ${r.naiveFiles.length} files, ${r.naiveBytes} bytes, ${r.naiveTokens} tokens (cl100k_base)`
    );
    console.log(`  pack:  ${r.packBytes} bytes, ${r.packTokens} tokens (cl100k_base)`);
    console.log(`  reduction factor: ${r.reductionFactor.toFixed(2)}x`);
    console.log(`  deterministic (2 runs, byte-identical + equal contentHash): ${r.deterministic}`);
    console.log(`  contentHash: ${r.contentHash}`);
    console.log("");
  }

  console.log("=== SUMMARY (real measured numbers) ===");
  console.table(
    results.map((r) => ({
      task: r.task,
      naiveTokens: r.naiveTokens,
      packTokens: r.packTokens,
      reduction: `${r.reductionFactor.toFixed(2)}x`,
      deterministic: r.deterministic,
    }))
  );

  const totalNaive = results.reduce((s, r) => s + r.naiveTokens, 0);
  const totalPack = results.reduce((s, r) => s + r.packTokens, 0);
  console.log(`\nTotal naive tokens across 3 tasks: ${totalNaive}`);
  console.log(`Total pack tokens across 3 tasks:  ${totalPack}`);
  console.log(`Tokens saved: ${totalNaive - totalPack} (${(((totalNaive - totalPack) / totalNaive) * 100).toFixed(1)}%)`);

  return results;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
