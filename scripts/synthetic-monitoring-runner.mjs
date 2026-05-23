#!/usr/bin/env node
/**
 * Runs the production probe in structured mode and stores the latest
 * synthetic-monitoring artifact for a scheduler, CI job, or operator to read.
 *
 * Required env:
 *   APP_URL=https://galaxysportsedge.com
 *
 * Optional env:
 *   ADMIN_COOKIE=...
 *   SYNTHETIC_MONITORING_OUTPUT_DIR=.synthetic-monitoring
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(ROOT, process.env.SYNTHETIC_MONITORING_OUTPUT_DIR ?? ".synthetic-monitoring");
const latestPath = join(outputDir, "latest.json");
const shouldFileIssues = process.env.SYNTHETIC_MONITORING_FILE_ISSUES === "1";

const result = spawnSync(process.execPath, [join(ROOT, "scripts", "prod-probe.mjs")], {
  cwd: ROOT,
  env: {
    ...process.env,
    PROD_PROBE_JSON: "1",
  },
  encoding: "utf8",
});

let payload;
try {
  payload = JSON.parse(result.stdout.trim());
} catch (error) {
  payload = {
    appUrl: process.env.APP_URL ?? "",
    generatedAtIso: new Date().toISOString(),
    ok: false,
    failed: 1,
    probes: [],
    runnerError: error instanceof Error ? error.message : "Unable to parse prod-probe output.",
    stderr: result.stderr.trim().slice(0, 500),
  };
}

const artifact = {
  ...payload,
  runner: {
    generatedAtIso: new Date().toISOString(),
    exitCode: result.status ?? 1,
    outputPath: latestPath,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(latestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
if (!artifact.ok && shouldFileIssues) {
  await fileIssueQueueEntry(artifact);
}

if (artifact.ok) {
  console.log(`synthetic-monitoring OK - wrote ${latestPath}`);
} else {
  console.error(`synthetic-monitoring FAIL - wrote ${latestPath}`);
}

process.exit(result.status ?? 1);

async function fileIssueQueueEntry(artifact) {
  const issueQueuePath = join(ROOT, "docs", "ops", "issue-queue.md");
  const failures = artifact.probes?.filter((probe) => !probe.ok) ?? [];
  const fingerprint = failures
    .map((probe) => `${probe.path}:${probe.status}:${probe.bannedPattern ?? ""}`)
    .sort()
    .join("|") || `runner:${artifact.runner?.exitCode ?? "unknown"}`;
  const marker = `<!-- synthetic-monitoring:${fingerprint} -->`;
  let existing = "";
  try {
    existing = await readFile(issueQueuePath, "utf8");
  } catch {
    existing = "# Issue Queue\n\n";
  }
  if (existing.includes(marker)) return;

  const severity = failures.some((probe) => isCriticalProbe(probe.path)) ? "P1" : "P2";
  const failureLines =
    failures.length > 0
      ? failures
          .map((probe) => {
            const banned = probe.bannedPattern ? `, bannedPattern=${probe.bannedPattern}` : "";
            return `  - ${probe.path}: HTTP ${probe.status}, ok=${probe.ok}${banned}`;
          })
          .join("\n")
      : "  - Runner failed before probe records were available.";
  const entry = [
    marker,
    `## ${severity} - Synthetic monitoring failure`,
    "",
    `- **Filed:** ${artifact.generatedAtIso} · **By:** synthetic-monitoring`,
    `- **Status:** OPEN`,
    `- **Source:** ${artifact.appUrl ?? "unknown app url"}`,
    "- **What failed:**",
    failureLines,
    "- **Needed:** investigate the failing route or banned-positioning hit, then rerun `npm run synthetic:run`.",
    "",
  ].join("\n");

  const next = existing.includes("No open issues.")
    ? existing.replace("No open issues.", entry.trim())
    : `${existing.trimEnd()}\n\n${entry}`;
  await writeFile(issueQueuePath, `${next.trimEnd()}\n`, "utf8");
}

function isCriticalProbe(path) {
  return path === "/" || path === "/board" || path === "/ledger" || path === "/api/health";
}
