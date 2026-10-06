#!/usr/bin/env tsx
/**
 * npm run factors:run -- A1
 *
 * Validates the factor's YAML pre-registration and prints its kill line.
 * The numerical runner (scripts/factors/A1.mjs) lands in C-364; this CLI is
 * the gate that refuses to invoke a runner whose kill_line was not committed
 * first (§4.1).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseFactorYaml, toFactorSpec, validatePreRegistration } from "../factgraph";

function repoRootFromCwd(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("packages", "verifier"))) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

function main(argv: readonly string[]): number {
  const id = argv.find((a) => !a.startsWith("-") && a !== "factors-run.ts");
  if (!id) {
    console.error("usage: npm run factors:run -- A1");
    return 2;
  }
  const repoRoot = repoRootFromCwd();
  const yamlPath = path.join(repoRoot, "docs", "factors", `${id}.yaml`);
  if (!existsSync(yamlPath)) {
    console.error(`[factors:run] missing spec: ${yamlPath}`);
    console.error("Write the pre-registered YAML (kill_line first) before running.");
    return 2;
  }
  const spec = toFactorSpec(parseFactorYaml(readFileSync(yamlPath, "utf8")), id);
  const check = validatePreRegistration(spec);
  if (!check.ok) {
    console.error(`[factors:run] ${id} failed pre-registration:`);
    for (const e of check.errors) console.error(`  ${e}`);
    return 1;
  }
  console.log(`[factors:run] ${id} pre-registration OK`);
  console.log(`  title:     ${spec.title}`);
  console.log(`  status:    ${spec.status}`);
  console.log(`  kill_line: ${spec.kill_line}`);
  console.log(`  script:    ${spec.script || "(none)"}`);
  const scriptPath = spec.script
    ? path.isAbsolute(spec.script)
      ? spec.script
      : path.join(repoRoot, spec.script)
    : null;
  if (!scriptPath || !existsSync(scriptPath)) {
    console.log(
      `[factors:run] numerical runner not present — C-364 lands scripts/factors/${id}.mjs. Gate passed; nothing to execute.`,
    );
    return 0;
  }
  console.log(
    `[factors:run] runner exists at ${scriptPath}; execute it via the C-364 scripts/factors/run.mjs harness.`,
  );
  return 0;
}

process.exit(main(process.argv.slice(2)));
