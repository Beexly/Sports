/**
 * Repo-root resolution for modules that inspect the repository tree
 * (assurance evidence, foundry proof-source checks).
 *
 * `resolve(process.cwd(), "..", "..")` is a lie outside dev: on a serverless
 * runtime cwd is the function root and source files are only present if the
 * bundler traced an import — existsSync on repo paths then returns false and
 * every fs-based "evidence" claim silently inverts. This helper walks upward
 * looking for the monorepo markers and returns NULL when the tree is not
 * reachable, so callers degrade honestly ("cannot inspect from this
 * runtime") instead of reporting absence as fact.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findRepoRoot(startDir: string = process.cwd()): string | null {
  let dir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(join(dir, "apps", "web", "package.json")) &&
      existsSync(join(dir, "packages", "db"))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
