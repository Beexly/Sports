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

/** An adapter source under inspection. `adapterAbs` locates it for relative
 *  import resolution; `source` is its text. Split so the detector can run
 *  against synthetic text without writing files. */
interface AdapterSource {
  adapterAbs: string;
  source: string;
}

function listAdapterFiles(): string[] {
  const dir = resolve(REPO_ROOT, ADAPTER_LAYER_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith("-adapters.ts") && !f.endsWith(".test.ts"))
    .map((f) => join(dir, f))
    .sort();
}

function collectViolations(): Violation[] {
  return collectViolationsIn(
    listAdapterFiles().map((abs) => ({ adapterAbs: abs, source: readFileSync(abs, "utf8") })),
  );
}

/**
 * Core detector. Takes adapter sources in memory so the same code path can be
 * exercised against a synthetic fixture (see the "teeth" test) as well as
 * against the real files. The module-existence and value-export checks still
 * hit real disk, so a fixture proves the detector reads target sources.
 */
function collectViolationsIn(adapters: readonly AdapterSource[]): Violation[] {
  const violations: Violation[] = [];

  for (const { adapterAbs, source } of adapters) {
    const adapterRel = relative(REPO_ROOT, adapterAbs).replace(/\\/g, "/");
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
  // History: 35 violations existed (SURF-13), then 52 once the regex was
  // corrected to collect module-only claims. Every one has now been fixed
  // (SURF-16 provenance sweep), so the count is 0 and the assertion below is
  // effectively zero-tolerance.
  //
  // It was NOT zero-tolerance before, and deliberately so: the "teeth" test
  // below used to prove the detector still worked by requiring live
  // violations to exist. That design made it structurally impossible to fix
  // the last violation -- fixing the defect turned the guard red. The teeth
  // test now runs the SAME detector over a synthetic fixture instead, so the
  // ratchet can sit at 0 without the guard going blind.
  //
  // To reintroduce a violation you must edit a real adapter to claim a module
  // it does not import; the ratchet then fails. Do not lower this number
  // without re-deriving it with a second method; a guard that silently
  // under-reports its own defect class reads as a clean bill of health.
  const KNOWN_VIOLATIONS = 0;

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

  it("still names every violation class (proves the guard has teeth)", () => {
    // Runs the real detector over a synthetic adapter, so the guard keeps its
    // teeth even now that the real adapter layer is clean. If the regex or any
    // rule silently regressed, these expectations fail.
    //
    // The fixture cites four real engine modules so that BOTH disk-backed
    // checks (does the module exist, does it export the symbol) are exercised
    // against real sources rather than stubbed input.
    const fixtureAbs = resolve(REPO_ROOT, ADAPTER_LAYER_DIR, "__fixture-adapters.ts");
    const fixture: AdapterSource = {
      adapterAbs: fixtureAbs,
      source: [
        // A real value import. The fixture adapter sits in
        // packages/prediction-engine/src/engine/, so this specifier resolves
        // to packages/prediction-engine/src/expected-metrics/expected-completion
        // -- the same module RULE 4 and the control below cite.
        'import { computeCpoe } from "../expected-metrics/expected-completion.js";',
        // RULE 1 "no value import": a real module and a real export of it,
        // but this adapter never imports it.
        'export function a(): string { return "packages/prediction-engine/src/expected-metrics/win-probability.ts#predictWinProbability"; }',
        // RULE 2 "module does not exist": the cited module is absent from disk.
        'export function b(): string { return "packages/prediction-engine/src/signals/wind-elasticity.ts"; }',
        // RULE 3 "symbol not exported": the module exists on disk, but
        // predictLogistic is not an export of it (the historic defect).
        'export function c(): string { return "packages/prediction-engine/src/expected-metrics/win-probability.ts#predictLogistic"; }',
        // RULE 4 "imports module, not this symbol": the module IS value-imported
        // (computeCpoe) but predictCompletionProbability is not imported.
        'export function d(): string { return "packages/prediction-engine/src/expected-metrics/expected-completion.ts#predictCompletionProbability"; }',
        // POSITIVE CONTROL: genuinely backed -- computeCpoe is really imported
        // and really exported. This one must NOT be flagged.
        'export function e(): string { return "packages/prediction-engine/src/expected-metrics/expected-completion.ts#computeCpoe"; }',
      ].join("\n"),
    };

    const violations = collectViolationsIn([fixture]);
    const bySymbol = new Map(violations.map((v) => [v.symbol, v.reasons.join("; ")]));

    // Four distinct failure modes the detector must still be able to name.
    // These are the actual strings collectViolationsIn() emits, not a guess.
    expect(
      bySymbol.get("predictWinProbability"),
      "expected the 'no value import' rule to fire",
    ).toMatch(/no value import of/);
    expect(
      bySymbol.get(undefined),
      "expected the module-only claim to be collected",
    ).toMatch(/cited module does not exist on disk/);
    expect(
      bySymbol.get("predictLogistic"),
      "expected the 'symbol not exported' rule to fire",
    ).toMatch(/is not a value export of/);
    expect(bySymbol.get("predictCompletionProbability")).toMatch(
      /imports the module but not the value symbol/,
    );
    // Every violation must name at least one reason (guards against a rule
    // silently emitting nothing).
    for (const v of violations) {
      expect(v.reasons.length, `${v.provenance} produced no reason`).toBeGreaterThan(0);
    }
    // Exactly the four seeded defects; the positive control is not flagged.
    expect(violations.length).toBe(4);

    // POSITIVE CONTROL: the real adapter layer must still contain claims that
    // ARE backed. Without this, an over-eager detector that flags everything
    // would still satisfy every assertion above.
    expect(
      collectBackedClaimCount(),
      "no backed module#symbol claims remain -- the detector may now be flagging everything",
    ).toBeGreaterThan(0);
  });

  it("backed claims stay backed (positive control for the whole guard)", () => {
    expect(collectBackedClaimCount()).toBeGreaterThan(0);
  });
});

/**
 * Count provenance claims in the real adapter layer that ARE backed by a real
 * value import of a module that exists and exports the named symbol.
 */
function collectBackedClaimCount(): number {
  let backed = 0;
  for (const { adapterAbs, source } of listAdapterFiles().map((abs) => ({
    adapterAbs: abs,
    source: readFileSync(abs, "utf8"),
  }))) {
    const imports = collectValueImports(adapterAbs, source);
    PROVENANCE_RE.lastIndex = 0;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = PROVENANCE_RE.exec(source)) !== null) {
      const moduleRel = match[1]!;
      const symbol = match[2];
      const provenance = match[0]!;
      if (seen.has(provenance)) continue;
      seen.add(provenance);
      const moduleKey = normalizeModuleKey(`packages/prediction-engine/src/${moduleRel}`);
      const moduleAbs = resolve(REPO_ROOT, "packages/prediction-engine/src", moduleRel);
      if (!existsSync(moduleAbs)) continue;
      const { moduleImported, symbolImported } = moduleKeyHasValueImport(imports, moduleKey, symbol);
      if (!moduleImported) continue;
      if (symbol && !symbolImported) continue;
      if (symbol && !moduleExportsValueSymbol(readFileSync(moduleAbs, "utf8"), symbol)) continue;
      backed += 1;
    }
  }
  return backed;
}
