/**
 * Import boundary guard — production code must never import from `workers/`.
 *
 * `workers/` is a standalone-worker topology that the platform does not deploy
 * (see workers/README.md). Production scheduling is 21 Vercel crons declared in
 * apps/web/vercel.json. Today the dependency edge is strictly one-way: the
 * airwave-listener worker imports OUT of workers/ into apps/web/lib/airwave/,
 * and nothing under apps/ or packages/ imports IN.
 *
 * That one-way edge is what keeps the dead subsystem cleanly separable and stops
 * undeployed code from silently becoming load-bearing. Nothing enforced it, so
 * this test does.
 *
 * Scope: static/dynamic imports and require() only. A test that READS a worker
 * file as text is deliberately allowed — apps/web/__tests__/calibration-cockpit
 * .test.ts does exactly that to pin the content-publishing kill switch, and that
 * creates no runtime dependency.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

/** Production source roots. Anything here ships or is imported by something that ships. */
const SCAN_ROOTS = ["apps/web", "packages"] as const;

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  "test-artifacts",
]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"] as const;

/**
 * A module specifier that resolves into workers/.
 *   - "@sports/worker-<name>"        the workspace package names
 *   - any relative specifier whose path contains a "workers/" segment
 *     preceded by "../", i.e. it climbs out of the current package first.
 *
 * Deliberately NOT matched: "@/lib/workers/..." (apps/web/lib/workers is a
 * different, in-app module) and bare "workers/..." with no traversal.
 */
const WORKER_SPECIFIER = /^@sports\/worker-|(^|\/)\.\.\/(?:[^"']*\/)?workers\//;

/** import ... from "x" | export ... from "x" | require("x") | import("x") */
const SPECIFIER_PATTERNS: readonly RegExp[] = [
  /(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?\sfrom\s*["']([^"']+)["']/g,
  /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let isDir: boolean;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue; // broken symlink (node_modules links in worktrees)
    }
    if (isDir) {
      walk(full, out);
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function collectSourceFiles(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = resolve(REPO_ROOT, root);
    try {
      if (!statSync(abs).isDirectory()) continue;
    } catch {
      continue;
    }
    walk(abs, files);
  }
  return files;
}

interface Violation {
  readonly file: string;
  readonly specifier: string;
}

function findViolations(files: readonly string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    // Cheap pre-filter: skip files that can't possibly match.
    if (!src.includes("workers/") && !src.includes("@sports/worker-")) continue;

    for (const pattern of SPECIFIER_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(src)) !== null) {
        const specifier = match[1];
        if (specifier !== undefined && WORKER_SPECIFIER.test(specifier)) {
          violations.push({ file: relative(REPO_ROOT, file), specifier });
        }
      }
    }
  }
  return violations;
}

describe("workers/ import boundary", () => {
  const files = collectSourceFiles();

  it("scans a meaningful number of production source files (non-vacuity check)", () => {
    // Guards against a silently-broken walker passing the real assertion below.
    // apps/web + packages held 3391 .ts/.tsx files when this was written.
    expect(files.length).toBeGreaterThan(1000);
  });

  it("no file under apps/web or packages imports from workers/", () => {
    const violations = findViolations(files);
    const rendered = violations.map((v) => `${v.file}  ->  ${v.specifier}`);

    expect(
      rendered,
      "Production code must not import from workers/. That directory is NOT deployed " +
        "(see workers/README.md): production scheduling is 21 Vercel crons in " +
        "apps/web/vercel.json, and workers/ start scripts fail with " +
        "ERR_UNKNOWN_FILE_EXTENSION. Importing it makes undeployed code load-bearing. " +
        "Put shared logic in packages/ instead.",
    ).toEqual([]);
  });

  it("recognises a worker specifier when it sees one (detector is not inert)", () => {
    // Pins the matcher itself, so the passing result above means "found nothing"
    // rather than "cannot find anything".
    expect(WORKER_SPECIFIER.test("@sports/worker-data-refresh")).toBe(true);
    expect(WORKER_SPECIFIER.test("../../../workers/data-refresh/src/index")).toBe(true);
    expect(WORKER_SPECIFIER.test("../../workers/content-publishing/src/index")).toBe(true);
    // In-app module of the same name is a different thing and must stay allowed.
    expect(WORKER_SPECIFIER.test("@/lib/workers/orchestration-policy")).toBe(false);
    expect(WORKER_SPECIFIER.test("./workers/local-helper")).toBe(false);
  });
});
