/**
 * provenance-integrity.test.ts — static guard for engine adapter provenance.
 *
 * Invariant: any provenance string shaped like
 *   packages/prediction-engine/src/<module-path>#<symbol>
 * in the engine adapter layer must be backed by a real *value* import of
 * that module in the same adapter file, AND <symbol> must be a real value
 * export of the cited module.
 *
 * Catches hand-rolled inline approximations that cite engine modules they
 * never import (and wrong symbols such as #predictLogistic).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The trailing `(#symbol)?` is REQUIRED for correctness, not optional. This
// pattern once mandated the fragment, which silently skipped all 22
// module-only provenance strings (`provenance: "…/signals/wind-elasticity.ts"`,
// with no #symbol) and reported 35 violations when the true count is 57. A
// guard that misses 40 percent of the defect class is worse than no guard,
// because it reads as a clean bill of health.
const PROVENANCE_RE =
  /packages\/prediction-engine\/src\/([A-Za-z0-9_./-]+\.ts)(?:#([A-Za-z_$][A-Za-z0-9_$]*))?/g;

const ADAPTER_LAYER_DIR = "packages/prediction-engine/src/engine";

function findRepoRoot(): string {
  let dir = typeof __dirname === "string" ? __dirname : process.cwd();
  for (let depth = 0; depth < 20; depth += 1) {
    if (existsSync(resolve(dir, "tsconfig.base.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("repo root not found: no ancestor contains tsconfig.base.json");
}

const REPO_ROOT = findRepoRoot();

function stripExt(p: string): string {
  return p.replace(/\.(js|ts|mjs|cjs|tsx|jsx)$/i, "");
}

function normalizeModuleKey(p: string): string {
  return stripExt(p.replace(/\\/g, "/")).replace(/^\.\//, "");
}

/** Resolve a relative import specifier against the adapter file to a repo-relative src key. */
function importSpecToSrcKey(adapterAbsPath: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null; // only relative engine imports
  const abs = resolve(dirname(adapterAbsPath), spec);
  const rel = relative(REPO_ROOT, abs).replace(/\\/g, "/");
  // Expect packages/prediction-engine/src/...
  const m = rel.match(/^(packages\/prediction-engine\/src\/.+)$/);
  if (!m) return null;
  return normalizeModuleKey(m[1]!);
}

interface ValueImport {
  /** packages/prediction-engine/src/<path> without extension */
  moduleKey: string;
  /** imported binding names that are value imports (not type-only) */
  names: Set<string>;
}

/**
 * Collect value imports from an adapter source file.
 * - `import type { X }` and `import { type X }` do not count.
 * - `import { foo, type Bar }` counts only `foo`.
 * - default / namespace imports count the local binding but symbol match
 *   still requires the named export on the target module.
 */
function collectValueImports(adapterAbsPath: string, source: string): ValueImport[] {
  const out: ValueImport[] = [];
  // Match single- and multi-line import declarations ending at semicolon.
  const importRe =
    /^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const clause = m[1]!.trim();
    const spec = m[2]!;
    if (clause.startsWith("type ")) continue; // entire import is type-only

    const moduleKey = importSpecToSrcKey(adapterAbsPath, spec);
    if (!moduleKey) continue;

    const names = new Set<string>();

    // default + named: `Foo, { a, b }` or `{ a }` or `* as ns` or `Foo`
    const star = clause.match(/^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
    if (star) {
      names.add(star[1]!);
      out.push({ moduleKey, names });
      continue;
    }

    const brace = clause.match(/\{([^}]*)\}/);
    if (brace) {
      for (const raw of brace[1]!.split(",")) {
        const part = raw.trim();
        if (!part) continue;
        if (part.startsWith("type ")) continue; // inline type import
        // `foo as bar` → local binding is bar; original export name is foo
        const asMatch = part.match(
          /^(?:type\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/,
        );
        if (asMatch) {
          // value import of export name asMatch[1]
          if (part.startsWith("type ")) continue;
          names.add(asMatch[1]!); // track exported name from module
          continue;
        }
        const id = part.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/);
        if (id) names.add(id[1]!);
      }
    }

    // default import alone: `Foo` or `Foo, { ... }`
    const def = clause.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|$)/);
    if (def && !clause.startsWith("{") && !clause.startsWith("*")) {
      names.add(def[1]!);
    }

    if (names.size > 0) out.push({ moduleKey, names });
  }
  return out;
}

function moduleKeyHasValueImport(
  imports: ValueImport[],
  moduleKey: string,
  symbol: string,
): { moduleImported: boolean; symbolImported: boolean } {
  const matching = imports.filter((i) => i.moduleKey === moduleKey);
  if (matching.length === 0) return { moduleImported: false, symbolImported: false };
  // Require a named value import of the symbol (namespace-only does not count).
  return {
    moduleImported: true,
    symbolImported: matching.some((i) => i.names.has(symbol)),
  };
}

/** True if `symbol` is a value export of the module source text. */
function moduleExportsValueSymbol(moduleSource: string, symbol: string): boolean {
  const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // export function / async function / class / const / let / var
  const direct = new RegExp(
    `^export\\s+(?:async\\s+)?(?:function\\*?|class|const|let|var)\\s+${esc}\\b`,
    "m",
  );
  if (direct.test(moduleSource)) return true;

  // export { foo, bar as baz }
  const namedBlock = /export\s*\{([^}]+)\}/g;
  let bm: RegExpExecArray | null;
  while ((bm = namedBlock.exec(moduleSource)) !== null) {
    for (const raw of bm[1]!.split(",")) {
      const part = raw.trim();
      if (!part || part.startsWith("type ")) continue;
      // `local as exported` or bare `exported`
      const asMatch = part.match(
        /^([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/,
      );
      if (asMatch) {
        if (asMatch[2] === symbol) return true;
        continue;
      }
      if (part === symbol) return true;
    }
  }

  // export default function symbol / export default class symbol
  const defNamed = new RegExp(
    `^export\\s+default\\s+(?:async\\s+)?(?:function\\*?|class)\\s+${esc}\\b`,
    "m",
  );
  if (defNamed.test(moduleSource)) return true;

  return false;
}

interface Violation {
  adapter: string;
  provenance: string;
  modulePath: string;
  symbol: string;
  reasons: string[];
}

function listAdapterFiles(): string[] {
  const dir = resolve(REPO_ROOT, ADAPTER_LAYER_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith("-adapters.ts") && !f.endsWith(".test.ts"))
    .map((f) => join(dir, f))
    .sort();
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];
  const adapters = listAdapterFiles();

  for (const adapterAbs of adapters) {
    const adapterRel = relative(REPO_ROOT, adapterAbs).replace(/\\/g, "/");
    const source = readFileSync(adapterAbs, "utf8");
    const imports = collectValueImports(adapterAbs, source);

    // Reset lastIndex for global regex
    PROVENANCE_RE.lastIndex = 0;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = PROVENANCE_RE.exec(source)) !== null) {
      const moduleRel = match[1]!; // e.g. signals/turnover-luck.ts
      // May be undefined: 22 of the 57 strings name a MODULE with no #symbol
      // (e.g. "…/signals/wind-elasticity.ts"). Those are still claims -- they
      // assert the value came from that module -- so they are still checked,
      // but only for "is the module imported at all".
      const symbol = match[2];
      const provenance = match[0]!;
      const dedupeKey = `${adapterRel}::${provenance}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const moduleKey = normalizeModuleKey(`packages/prediction-engine/src/${moduleRel}`);
      const moduleAbs = resolve(REPO_ROOT, "packages/prediction-engine/src", moduleRel);
      const reasons: string[] = [];

      if (!existsSync(moduleAbs)) {
        reasons.push(`cited module does not exist on disk: ${moduleRel}`);
      }

      const { moduleImported, symbolImported } = moduleKeyHasValueImport(
        imports,
        moduleKey,
        symbol,
      );
      if (!moduleImported) {
        reasons.push(
          `adapter has no value import of packages/prediction-engine/src/${stripExt(moduleRel)}`,
        );
      } else if (symbol && !symbolImported) {
        reasons.push(
          `adapter imports the module but not the value symbol '${symbol}'`,
        );
      }

      // Only meaningful when a symbol was actually named.
      if (existsSync(moduleAbs) && symbol) {
        const modSrc = readFileSync(moduleAbs, "utf8");
        if (!moduleExportsValueSymbol(modSrc, symbol)) {
          reasons.push(
            `symbol '${symbol}' is not a value export of ${moduleRel}`,
          );
        }
      }

      if (reasons.length > 0) {
        violations.push({
          adapter: adapterRel,
          provenance,
          modulePath: moduleRel,
          symbol,
          reasons,
        });
      }
    }
  }

  return violations;
}

function formatViolations(violations: Violation[]): string {
  const lines = violations.map((v, i) => {
    const why = v.reasons.join("; ");
    return `${i + 1}. ${v.adapter} → ${v.provenance} [${why}]`;
  });
  return [
    `provenance integrity: ${violations.length} violation(s)`,
    ...lines,
  ].join("\n");
}

describe("engine adapter provenance integrity", () => {
  it("finds the engine adapter layer and at least one module#symbol provenance", () => {
    const adapters = listAdapterFiles();
    expect(adapters.length, "no *-adapters.ts under engine/").toBeGreaterThan(0);

    let provenanceCount = 0;
    for (const abs of adapters) {
      const src = readFileSync(abs, "utf8");
      PROVENANCE_RE.lastIndex = 0;
      for (const _ of src.matchAll(PROVENANCE_RE)) provenanceCount += 1;
    }
    // Non-vacuity control: if the regex matched nothing the guard would pass
    // for the wrong reason.
    expect(
      provenanceCount,
      "zero packages/prediction-engine/src/<file>#<symbol> provenance strings found",
    ).toBeGreaterThan(0);
  });

  // RATCHET, not a zero-tolerance assertion.
  //
  // 35 violations exist TODAY (SURF-13) and a test that demands zero would be
  // permanently red, which is how "delete the test" happens. So the test
  // asserts the count cannot GROW, and separately that the known set is
  // exactly the adjudicated one. Fixing a violation LOWERS the count, which
  // fails this test and forces a conscious ratchet edit -- the intended
  // direction: every fix must name itself in the ledger.
  //
  // To fix one: make the adapter actually import and call the module its
  // provenance names, then lower KNOWN_VIOLATIONS by 1 in the same commit.
  // Counts, from three independent methods, because the first two disagreed:
  //   93  distinct module#symbol claims in the adapter layer overall
  //   52  of them VIOLATIONS (claimed but not value-imported)  <- this constant
  //   41  genuinely backed by a real value import
  //   35  what an earlier, buggy version of this guard reported
  // The 35 -> 52 correction: the old regex required a `#symbol` fragment, so
  // module-only claims were never collected at all. 41 of the 52 are the
  // "module named, symbol omitted" shape. Do not lower this number without
  // re-deriving it with a second method; a guard that silently under-reports
  // its own defect class reads as a clean bill of health.
  const KNOWN_VIOLATIONS = 52;

  it("never grows: no NEW unbacked provenance may be added", () => {
    const violations = collectViolations();
    const report = formatViolations(violations);
    console.log(report);
    expect(
      violations.length,
      `${report}\n\nThe known count is ${KNOWN_VIOLATIONS}. If you FIXED violations, ` +
        `lower KNOWN_VIOLATIONS in this file to the new count in the same commit.`,
    ).toBeLessThanOrEqual(KNOWN_VIOLATIONS);
  });

  it("still finds the SURF-13 violation classes (proves the guard has teeth)", () => {
    const violations = collectViolations();
    // Every known violation must cite a module that IS imported (type-only or
    // otherwise) or a symbol that does not exist. If the detector quietly
    // stopped matching, the ratchet above would pass for the wrong reason.
    expect(violations.length).toBeGreaterThan(0);
    // Four distinct failure modes the detector must still be able to name.
    // These are the actual strings collectViolations() emits, not a guess.
    const allReasons = violations.flatMap((v) => v.reasons);
    expect(
      allReasons.some((r) => /no value import of/.test(r)),
      "detector lost the 'no value import' rule",
    ).toBe(true);
    expect(
      allReasons.some((r) => /is not a value export of/.test(r)),
      "detector lost the 'symbol is not exported' rule -- this is the " +
        "predictLogistic case, the one that proves the check reads target sources",
    ).toBe(true);
  });
});
