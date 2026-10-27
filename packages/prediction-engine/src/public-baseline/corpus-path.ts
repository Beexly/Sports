import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Absolute path to the coach corpus.
 *
 * Resolved by walking UP from process.cwd() until the repo root containing
 * docs/engine/corpus/x-pull-2026-10-24.md is found. The corpus lives at the repo
 * root while these tests live four directories down in the package, so a single
 * cwd-relative join broke whenever the runner's cwd differed (vitest runs from
 * the package dir; node --test runs from the repo root).
 *
 * Deliberately avoids import.meta.url: this package compiles with
 * "module": "CommonJS", where import.meta is a TS1343 error.
 */
const RELATIVE = join("docs", "engine", "corpus", "x-pull-2026-10-24.md");

function findCorpus(): string {
  let dir = process.cwd();
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(dir, RELATIVE);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Best guess so callers get a useful ENOENT path rather than a silent fallback.
  return join(process.cwd(), "..", "..", "..", "..", RELATIVE);
}

export const CORPUS_PATH = findCorpus();
