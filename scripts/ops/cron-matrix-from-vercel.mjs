#!/usr/bin/env node
/**
 * Generate docs/ops/CRON_MATRIX.generated.md from the vercel.json copies.
 *
 * Default source of truth: apps/web/vercel.json (the file Vercel reads).
 * Also reads repo-root vercel.json and reports DRIFT when they disagree.
 *
 *   node scripts/ops/cron-matrix-from-vercel.mjs          # write generated md
 *   node scripts/ops/cron-matrix-from-vercel.mjs --check  # exit 1 if stale
 *
 * Test overrides (never used in prod):
 *   CRON_MATRIX_ROOT  repo root
 *   CRON_MATRIX_SOT   SoT vercel.json path (absolute or root-relative)
 *   CRON_MATRIX_OTHER other vercel.json path
 *   CRON_MATRIX_OUT   generated markdown path
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_SOT_REL = "apps/web/vercel.json";
export const DEFAULT_OTHER_REL = "vercel.json";
export const DEFAULT_OUT_REL = "docs/ops/CRON_MATRIX.generated.md";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");

/** @typedef {{ path: string, schedule: string }} Cron */

/**
 * @param {string} filePath
 * @returns {Cron[]}
 */
export function readCrons(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  const crons = Array.isArray(raw.crons) ? raw.crons : [];
  return crons.map((c) => ({
    path: String(c.path ?? ""),
    schedule: String(c.schedule ?? ""),
  }));
}

/**
 * @param {Cron[]} sot
 * @param {Cron[]} other
 * @returns {{ path: string, sot: string | null, other: string | null }[]}
 */
export function diffCrons(sot, other) {
  const sotMap = new Map(sot.map((c) => [c.path, c.schedule]));
  const otherMap = new Map(other.map((c) => [c.path, c.schedule]));
  const paths = new Set([...sotMap.keys(), ...otherMap.keys()]);
  const rows = [];
  for (const path of [...paths].sort()) {
    const a = sotMap.has(path) ? sotMap.get(path) : null;
    const b = otherMap.has(path) ? otherMap.get(path) : null;
    if (a !== b) rows.push({ path, sot: a ?? null, other: b ?? null });
  }
  return rows;
}

/**
 * @param {string} text
 */
export function stripGeneratedTimestamp(text) {
  return text.replace(/^Generated:.*$/m, "Generated: <checked>").trimEnd();
}

/**
 * @param {{
 *   sotRel: string,
 *   otherRel: string,
 *   sotCrons: Cron[],
 *   otherCrons: Cron[],
 *   generatedAt?: string,
 * }} input
 */
export function renderMatrix(input) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const drift = diffCrons(input.sotCrons, input.otherCrons);
  const lines = [
    "# CRON matrix (generated from vercel.json)",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Default SoT: \`${input.sotRel}\` (the file Vercel actually reads).`,
    `Compared against: \`${input.otherRel}\`.`,
    "",
    "| Path | Schedule |",
    "|------|----------|",
  ];
  for (const c of input.sotCrons) {
    lines.push(`| \`${c.path}\` | \`${c.schedule}\` |`);
  }
  lines.push("");
  lines.push(`**Count:** ${input.sotCrons.length} scheduled routes in ${input.sotRel}.`);
  lines.push("");
  if (drift.length === 0) {
    lines.push("**DRIFT:** none — both vercel.json copies agree.");
  } else {
    lines.push(
      `**DRIFT:** copies disagree. Default SoT is \`${input.sotRel}\`. Extra or mismatched paths:`,
    );
    lines.push("");
    lines.push(`| Path | ${input.sotRel} | ${input.otherRel} |`);
    lines.push("|------|----------------|-------------------|");
    for (const row of drift) {
      lines.push(
        `| \`${row.path}\` | \`${row.sot ?? "MISSING"}\` | \`${row.other ?? "MISSING"}\` |`,
      );
    }
  }
  lines.push("");
  lines.push("Do not hand-edit this file. Run: `node scripts/ops/cron-matrix-from-vercel.mjs`");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function resolvePaths(env = process.env) {
  const root = env.CRON_MATRIX_ROOT ? resolve(env.CRON_MATRIX_ROOT) : REPO_ROOT;
  const sotRel = env.CRON_MATRIX_SOT || DEFAULT_SOT_REL;
  const otherRel = env.CRON_MATRIX_OTHER || DEFAULT_OTHER_REL;
  const outRel = env.CRON_MATRIX_OUT || DEFAULT_OUT_REL;
  return {
    root,
    sotRel,
    otherRel,
    outRel,
    sotPath: resolve(root, sotRel),
    otherPath: resolve(root, otherRel),
    outPath: resolve(root, outRel),
  };
}

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ code: number, stdout: string, written?: string }}
 */
export function run(argv = process.argv.slice(2), env = process.env) {
  const check = argv.includes("--check");
  const paths = resolvePaths(env);
  if (!existsSync(paths.sotPath)) {
    return { code: 2, stdout: `missing SoT: ${paths.sotPath}\n` };
  }
  if (!existsSync(paths.otherPath)) {
    return { code: 2, stdout: `missing other copy: ${paths.otherPath}\n` };
  }
  const sotCrons = readCrons(paths.sotPath);
  const otherCrons = readCrons(paths.otherPath);
  const expected = renderMatrix({
    sotRel: paths.sotRel.replace(/\\/g, "/"),
    otherRel: paths.otherRel.replace(/\\/g, "/"),
    sotCrons,
    otherCrons,
    generatedAt: new Date().toISOString(),
  });
  if (check) {
    if (!existsSync(paths.outPath)) {
      return { code: 1, stdout: `stale: missing ${paths.outPath}\n` };
    }
    const existing = readFileSync(paths.outPath, "utf8");
    if (stripGeneratedTimestamp(existing) !== stripGeneratedTimestamp(expected)) {
      return {
        code: 1,
        stdout: `stale: ${paths.outRel} does not match ${paths.sotRel}\n`,
      };
    }
    return { code: 0, stdout: `ok: ${paths.outRel} matches ${paths.sotRel}\n` };
  }
  mkdirSync(dirname(paths.outPath), { recursive: true });
  writeFileSync(paths.outPath, expected, "utf8");
  const drift = diffCrons(sotCrons, otherCrons);
  const driftLine =
    drift.length === 0
      ? "DRIFT: none"
      : `DRIFT: ${drift.map((d) => d.path).join(", ")}`;
  return {
    code: 0,
    stdout: `wrote ${paths.outRel} (${sotCrons.length} crons). ${driftLine}\n`,
    written: expected,
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = run();
  process.stdout.write(result.stdout);
  process.exit(result.code);
}
