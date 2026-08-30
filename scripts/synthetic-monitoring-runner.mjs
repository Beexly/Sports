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

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(ROOT, process.env.SYNTHETIC_MONITORING_OUTPUT_DIR ?? ".synthetic-monitoring");
const latestPath = join(outputDir, "latest.json");
const runsDir = join(outputDir, "runs");
const shouldFileIssues = process.env.SYNTHETIC_MONITORING_FILE_ISSUES === "1";
const runnerGeneratedAtIso = new Date().toISOString();
const runPath = join(runsDir, `${toRunFileName(runnerGeneratedAtIso)}.json`);

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

const buildSizeProbe = await readBuildSizeProbe();
if (buildSizeProbe) {
  payload = {
    ...payload,
    probes: [...(payload.probes ?? []), buildSizeProbe],
  };
  payload = {
    ...payload,
    ok: Boolean(payload.ok) && buildSizeProbe.ok,
    failed: payload.probes.filter((probe) => !probe.ok).length,
  };
}

const artifact = {
  ...payload,
  runner: {
    generatedAtIso: runnerGeneratedAtIso,
    exitCode: result.status ?? 1,
    outputPath: latestPath,
    historyPath: runPath,
  },
};

await mkdir(runsDir, { recursive: true });
await writeFile(latestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
await writeFile(runPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
if (!artifact.ok && shouldFileIssues) {
  await fileIssueQueueEntry(artifact);
}
if (artifact.ok && shouldFileIssues) {
  await closeSyntheticIssueQueueEntries(artifact);
}

if (artifact.ok) {
  console.log(`synthetic-monitoring OK - wrote ${latestPath} and ${runPath}`);
} else {
  console.error(`synthetic-monitoring FAIL - wrote ${latestPath} and ${runPath}`);
}

process.exit(artifact.ok ? 0 : result.status && result.status !== 0 ? result.status : 1);

async function readBuildSizeProbe() {
  const staticDir = join(ROOT, "apps", "web", ".next", "static");
  try {
    const bytes = await directorySize(staticDir);
    const budgetBytes = Number(process.env.SYNTHETIC_BUILD_SIZE_BUDGET_BYTES ?? "2000000");
    const ok = bytes <= budgetBytes;
    return {
      path: "local://build-size-budget",
      label: "build size budget",
      ok,
      status: ok ? 200 : 413,
      ms: 0,
      bannedPattern: "",
      shapeError: ok ? "" : `Next static assets total ${bytes} bytes; budget is ${budgetBytes} bytes.`,
      admin: false,
    };
  } catch {
    return null;
  }
}

async function directorySize(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) return directorySize(entryPath);
      if (!entry.isFile()) return 0;
      return (await stat(entryPath)).size;
    })
  );
  return sizes.reduce((sum, size) => sum + size, 0);
}

async function fileIssueQueueEntry(artifact) {
  const issueQueuePath = join(ROOT, "docs", "ops", "issue-queue.md");
  const failures = artifact.probes?.filter((probe) => !probe.ok) ?? [];
  const fingerprint = failures
    .map((probe) => `${probe.path}:${probe.status}:${probe.bannedPattern ?? ""}:${probe.shapeError ?? ""}`)
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
            const shape = probe.shapeError ? `, shapeError=${probe.shapeError}` : "";
            return `  - ${probe.path}: HTTP ${probe.status}, ok=${probe.ok}${banned}${shape}`;
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

async function closeSyntheticIssueQueueEntries(artifact) {
  const issueQueuePath = join(ROOT, "docs", "ops", "issue-queue.md");
  let existing = "";
  try {
    existing = await readFile(issueQueuePath, "utf8");
  } catch {
    return;
  }

  const resolvedLine = `- **Resolved:** ${artifact.generatedAtIso} Â· **By:** synthetic-monitoring`;
  let changed = false;
  const next = existing
    .split(/(?=<!--\s*synthetic-monitoring:)/g)
    .map((block) => {
      if (!block.startsWith("<!-- synthetic-monitoring:") || !block.includes("- **Status:** OPEN")) {
        return block;
      }
      changed = true;
      const resolved = block.replace("- **Status:** OPEN", "- **Status:** RESOLVED");
      return resolved.includes("- **Resolved:**")
        ? resolved
        : resolved.replace("- **Status:** RESOLVED", `- **Status:** RESOLVED\n${resolvedLine}`);
    })
    .join("");
  if (!changed) return;
  await writeFile(issueQueuePath, `${next.trimEnd()}\n`, "utf8");
}

function isCriticalProbe(path) {
  return path === "/" || path === "/board" || path === "/ledger" || path === "/api/health";
}

function toRunFileName(value) {
  return value.replaceAll(":", "-").replaceAll(".", "-");
}
