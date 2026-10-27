import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Barrel re-export integrity.
 *
 * A barrel that does `export type { Foo } from "./mod.js"` while `./mod.js`
 * never declares `Foo` is a silent lie: `tsc --noEmit` reports it as TS2305,
 * but only if someone runs a full type-check. Six such lines existed in
 * `coach-sim/index.ts` and `nfl/belichick-ten-metrics.ts`, contributing six of
 * the repo's pre-existing type errors. This test makes the failure loud and
 * local so the count cannot creep back up.
 *
 * It is a source-level check rather than a type-level one so it runs in the
 * ordinary vitest suite instead of requiring a separate `tsc` invocation.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..");

const BARRELS = [
  "coach-sim/index.ts",
  "nfl/belichick-ten-metrics.ts",
] as const;

/** Collect `export type { A, B } from "./x.js"` names, including multi-line. */
function collectTypeReexports(source: string): Array<{ name: string; target: string }> {
  const out: Array<{ name: string; target: string }> = [];
  const blockRe = /export\s+type\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(source)) !== null) {
    const [, body, target] = match;
    for (const raw of (body ?? "").split(",")) {
      const name = raw.trim();
      if (name.length > 0) out.push({ name, target: target ?? "" });
    }
  }
  return out;
}

/** Names a module actually declares as exported types. */
function declaredTypeNames(source: string): Set<string> {
  const names = new Set<string>();
  const patterns = [
    /export\s+(?:interface|type|class|enum)\s+([A-Za-z_$][\w$]*)/g,
    /export\s+type\s+([A-Za-z_$][\w$]*)\s*=/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      if (m[1]) names.add(m[1]);
    }
  }
  return names;
}

describe("barrel type re-exports resolve to real declarations", () => {
  for (const barrel of BARRELS) {
    it(`${barrel} only re-exports types its source modules declare`, () => {
      const barrelPath = resolve(SRC, barrel);
      const barrelSource = readFileSync(barrelPath, "utf8");
      const reexports = collectTypeReexports(barrelSource);

      assert.ok(
        reexports.length > 0,
        `${barrel}: expected at least one "export type { ... } from ..." block`,
      );

      const cache = new Map<string, Set<string>>();
      const missing: string[] = [];

      for (const { name, target } of reexports) {
        const targetTs = target.replace(/\.js$/, ".ts");
        const targetPath = resolve(dirname(barrelPath), targetTs);
        let declared = cache.get(targetPath);
        if (!declared) {
          declared = declaredTypeNames(readFileSync(targetPath, "utf8"));
          cache.set(targetPath, declared);
        }
        if (!declared.has(name)) {
          const known = [...declared].sort().join(", ");
          missing.push(`${name} (from ${targetTs}; declares: ${known})`);
        }
      }

      assert.deepEqual(
        missing,
        [],
        `${barrel} re-exports types that do not exist:\n  ${missing.join("\n  ")}`,
      );
    });
  }
});
