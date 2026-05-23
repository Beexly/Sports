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

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(ROOT, process.env.SYNTHETIC_MONITORING_OUTPUT_DIR ?? ".synthetic-monitoring");
const latestPath = join(outputDir, "latest.json");

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

if (artifact.ok) {
  console.log(`synthetic-monitoring OK - wrote ${latestPath}`);
} else {
  console.error(`synthetic-monitoring FAIL - wrote ${latestPath}`);
}

process.exit(result.status ?? 1);
