#!/usr/bin/env node
/**
 * Actor-minting import boundary (directive 4.2).
 *
 * The raw TrustedActor constructors `serviceActor` / `systemActor` perform NO
 * allowlist, credential, or operation-scope checks — application code must use
 * `resolveServiceActor()` instead. This guard makes that rule structural: it
 * AST-scans the repo (TypeScript compiler API, same pattern as the transport
 * import-boundary guard) and fails CI when any module other than
 *
 *   - apps/web/lib/auth/actor.ts            (the definitions themselves),
 *   - apps/web/lib/auth/actor-test-internal.ts (the sanctioned test re-export),
 *   - test files (__tests__/, *.test.*, *.spec.*) and guard fixtures,
 *
 * can reach the raw constructors. Detected escape hatches:
 *
 *   RULE raw-import        import { serviceActor | systemActor } (incl. alias)
 *                          from the actor module.
 *   RULE raw-reexport      export { serviceActor | systemActor } from ... .
 *   RULE export-star       export * from the actor module (relaunders every
 *                          symbol, including the raw constructors).
 *   RULE namespace-minting import * as ns from the actor module, then
 *                          ns.serviceActor / ns["systemActor"] access.
 *   RULE dynamic-import    import("actor module") / require("actor module")
 *                          outside the allowlist (whole-module access).
 *   RULE test-internal     ANY import/re-export of actor-test-internal from a
 *                          non-test module.
 *
 * Fail-closed doctrine: the scan never infers "clean" from an unparsed file —
 * files the compiler cannot produce a SourceFile for are reported as
 * violations (rule parse-failure).
 *
 * Usage:
 *   node scripts/guardrails/actor-minting-boundary.mjs           # repo scan
 *   node scripts/guardrails/actor-minting-boundary.mjs --scan-root <dir>
 *     # fixture mode for the guard's own tests: scans <dir> only and does NOT
 *     # apply the test-file/fixture allowlist.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const argv = process.argv.slice(2);
const scanRootFlag = argv.indexOf("--scan-root");
const FIXTURE_MODE = scanRootFlag !== -1;
const ROOT = resolve(process.cwd());
const SCAN_ROOTS = FIXTURE_MODE
  ? [resolve(ROOT, argv[scanRootFlag + 1] ?? ".")]
  : ["apps", "packages", "workers", "scripts"].map((d) => resolve(ROOT, d));

const SCAN_EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", ".git", ".turbo"]);

const RAW_CONSTRUCTORS = new Set(["serviceActor", "systemActor"]);

/** Files that may reference the raw constructors in the default repo scan. */
const ALLOWLIST_FILES = new Set([
  "apps/web/lib/auth/actor.ts",
  "apps/web/lib/auth/actor-test-internal.ts",
]);

function norm(p) {
  return p.split(sep).join("/");
}

function isTestPath(relPath) {
  const n = norm(relPath);
  return (
    n.includes("/__tests__/") ||
    /\.test\.[cm]?tsx?$/.test(n) ||
    /\.spec\.[cm]?tsx?$/.test(n) ||
    n.includes("/fixtures/")
  );
}

function isAllowlisted(relPath) {
  if (FIXTURE_MODE) return false;
  const n = norm(relPath);
  return ALLOWLIST_FILES.has(n) || isTestPath(n);
}

/** Does a module specifier resolve to the trusted-actor module? */
function isActorModuleSpecifier(specifier, importerRel) {
  const s = specifier.replace(/\.(js|ts|mjs|cjs)$/, "");
  if (s.endsWith("auth/actor")) return true; // "@/lib/auth/actor", "../auth/actor", "apps/web/lib/auth/actor"
  if (s === "./actor" && norm(importerRel).includes("lib/auth/")) return true;
  return false;
}

function isTestInternalSpecifier(specifier) {
  return specifier.replace(/\.(js|ts|mjs|cjs)$/, "").endsWith("actor-test-internal");
}

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile() && SCAN_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Scans one source file; returns violations [{rule, line, detail}].
 * Never infers clean from a parse failure (fail closed).
 */
function scanSource(relPath, text) {
  const violations = [];
  let source;
  try {
    source = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  } catch (err) {
    return [{ rule: "parse-failure", line: 0, detail: String(err) }];
  }
  if (!source) {
    return [{ rule: "parse-failure", line: 0, detail: "compiler returned no SourceFile" }];
  }

  const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  // Pass 1 — collect local names bound to a namespace import of the actor
  // module (imports are hoisted, so usage may appear anywhere in the file).
  const actorNamespaces = new Set();
  const collectNamespaces = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isActorModuleSpecifier(node.moduleSpecifier.text, relPath)
    ) {
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        actorNamespaces.add(bindings.name.text);
      }
    }
    ts.forEachChild(node, collectNamespaces);
  };
  collectNamespaces(source);

  // Pass 2 — emit violations.
  const visit = (node) => {
    // import ... from "specifier"
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (isTestInternalSpecifier(spec)) {
        violations.push({
          rule: "test-internal",
          line: lineOf(node),
          detail: `imports "${spec}" (test-internal module) from application code`,
        });
      } else if (isActorModuleSpecifier(spec, relPath)) {
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            const importedName = (el.propertyName ?? el.name).text;
            if (RAW_CONSTRUCTORS.has(importedName)) {
              violations.push({
                rule: "raw-import",
                line: lineOf(el),
                detail: `imports raw constructor "${importedName}" from "${spec}"`,
              });
            }
          }
        }
      }
    }

    // export ... from "specifier"
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const fromActor = isActorModuleSpecifier(spec, relPath);
      const fromTestInternal = isTestInternalSpecifier(spec);
      if (fromTestInternal) {
        violations.push({
          rule: "test-internal",
          line: lineOf(node),
          detail: `re-exports from "${spec}" (test-internal module)`,
        });
      } else if (fromActor) {
        if (!node.exportClause) {
          violations.push({
            rule: "export-star",
            line: lineOf(node),
            detail: `export * from "${spec}" relaunders the raw constructors`,
          });
        } else if (ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            const exportedName = (el.propertyName ?? el.name).text;
            if (RAW_CONSTRUCTORS.has(exportedName)) {
              violations.push({
                rule: "raw-reexport",
                line: lineOf(el),
                detail: `re-exports raw constructor "${exportedName}" from "${spec}"`,
              });
            }
          }
        }
      }
    }

    // dynamic import("specifier") / require("specifier")
    if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((isDynamicImport || isRequire) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteralLike(arg)) {
          if (isActorModuleSpecifier(arg.text, relPath) || isTestInternalSpecifier(arg.text)) {
            violations.push({
              rule: "dynamic-import",
              line: lineOf(node),
              detail: `dynamic ${isRequire ? "require" : "import"} of "${arg.text}" exposes the whole module (incl. raw constructors)`,
            });
          }
        }
      }
    }

    // ns.serviceActor / ns["systemActor"] on a namespace import of the module
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      if (actorNamespaces.has(node.expression.text) && RAW_CONSTRUCTORS.has(node.name.text)) {
        violations.push({
          rule: "namespace-minting",
          line: lineOf(node),
          detail: `accesses raw constructor "${node.name.text}" via namespace import "${node.expression.text}"`,
        });
      }
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      actorNamespaces.has(node.expression.text) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      RAW_CONSTRUCTORS.has(node.argumentExpression.text)
    ) {
      violations.push({
        rule: "namespace-minting",
        line: lineOf(node),
        detail: `accesses raw constructor "${node.argumentExpression.text}" via computed namespace access`,
      });
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  return violations;
}

async function main() {
  const hits = [];
  let scanned = 0;

  for (const rootDir of SCAN_ROOTS) {
    const files = await walk(rootDir);
    for (const file of files) {
      const relPath = norm(relative(ROOT, file));
      if (isAllowlisted(relPath)) continue;
      scanned++;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch (err) {
        hits.push({ file: relPath, rule: "parse-failure", line: 0, detail: String(err) });
        continue;
      }
      // Cheap pre-filter: files that cannot mention the constructors or the
      // test-internal module cannot violate; the AST confirms the rest.
      if (
        !text.includes("serviceActor") &&
        !text.includes("systemActor") &&
        !text.includes("actor-test-internal") &&
        !(text.includes("auth/actor") || text.includes("./actor"))
      ) {
        continue;
      }
      for (const v of scanSource(relPath, text)) {
        hits.push({ file: relPath, ...v });
      }
    }
  }

  if (hits.length > 0) {
    console.error(`[actor-minting-boundary] FAIL — ${hits.length} violation(s):`);
    for (const h of hits) {
      console.error(`  ${h.file}:${h.line} [${h.rule}] ${h.detail}`);
    }
    console.error(
      "\nApplication code must use resolveServiceActor() from @/lib/auth/actor " +
        "(allowlisted principal + verified credential context + operation scope). " +
        "Raw serviceActor()/systemActor() are test-only."
    );
    process.exit(1);
  }

  console.log(`[actor-minting-boundary] OK — scanned ${scanned} files, no raw actor minting outside the boundary.`);
}

main().catch((err) => {
  console.error("[actor-minting-boundary] ERROR", err);
  process.exit(1);
});
