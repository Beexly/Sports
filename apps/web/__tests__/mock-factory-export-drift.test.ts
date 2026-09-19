/**
 * GUARD: partial `vi.mock` factory drift for the two heavily-mocked modules
 * in this workspace, `@/lib/auth` and `@sports/prediction-engine`.
 *
 * THE DEFECT THIS PREVENTS (measured on this branch, 2026-09-19):
 *
 *   `vi.mock(path, factory)` REPLACES the real module wholesale. Anything the
 *   factory's returned object omits is `undefined` at the call site — and
 *   reading that property, not merely importing it, is what throws
 *   `[vitest] No "<name>" export is defined on the "<path>" mock` (verified
 *   empirically below; see "WHY CALL-GRAPH TRACING, NOT IMPORT-GRAPH
 *   TRACING"). `apps/web/__tests__/helpers/auth-mock.ts` already documents
 *   one instance of this (`isAdminEmail` added to `@/lib/auth`, 35 mocks did
 *   not carry it, 3 of them broke). AGENTS.md documents a second instance on
 *   `@sports/prediction-engine` (the board's published lane collapsed to
 *   zero rows because a cross-package import resolved to `undefined` under a
 *   partial factory). Both are the SAME failure class on two different
 *   modules: a mock factory silently drifts from the real module's export
 *   surface as the real module grows, and nothing catches it until the code
 *   path that reads the missing export actually runs.
 *
 * SURVEY (this file computes and reports the live count every run; measured
 * 2026-09-19 on this branch by direct grep, cross-checked against this
 * guard's own AST scan): 36 files call `vi.mock("@/lib/auth", ...)`; 22
 * files call `vi.mock("@sports/prediction-engine", ...)`. AGENTS.md's
 * "nineteen web test files" figure for the prediction-engine module (written
 * 2026-09-13) undercounts by 3 as of this branch — the count in this header
 * is the corrected one, and the survey test below prints the live number so
 * this comment cannot itself go stale silently.
 *
 * WHY AST, NOT A STRING/REGEX SCAN OF `vi.mock("...")`. Repo precedent
 * (`scripts/guardrails/ai-transport-import-boundary.mjs`) already states the
 * reason for this codebase: a regex over source text misses re-exports,
 * aliased named imports, multi-line import lists, and `import type`. The
 * same applies here in both directions this guard needs — reading what a
 * mock factory returns, and reading what real code actually reads from the
 * mocked module — so both are done by parsing the real TypeScript AST
 * (`typescript`, already a devDependency of this workspace), not by
 * pattern-matching source text.
 *
 * WHY CALL-GRAPH TRACING, NOT IMPORT-GRAPH TRACING. The first version of
 * this guard treated "reachable" as "any name any file imports from the
 * target, anywhere in the transitive IMPORT graph starting from the test
 * file's own imports." That over-fired: verified empirically (see the probe
 * below) that reading a missing property on a mocked module throws — even
 * without calling it — but MERELY IMPORTING a file that itself statically
 * imports a name from the target does NOT throw if that name is never
 * actually referenced by code that runs. A transitive import graph does not
 * know which of a file's own exported functions the test's code path
 * actually calls, so it flagged real files (e.g. `board-gate-decisions.
 * test.ts`) for exports (`scoreGames`, `buildPickProofReceipt`, ...) that
 * live two hops away in sibling helper files the exercised functions never
 * call — a false positive that would have broken passing test files this
 * guard has no license to edit. Measured directly, disabling the mock and
 * running that scenario for real:
 *
 *     vi.mock("@sports/prediction-engine", () => ({ getReadinessGates: ... }));
 *     const mod = await import("@sports/prediction-engine");
 *     mod.scoreGames;
 *     // -> throws: [vitest] No "scoreGames" export is defined on the
 *     //    "@sports/prediction-engine" mock.
 *     const stateMod = await import("@/lib/board/state"); // imports scoreGames-less names only
 *     // -> resolves fine; nothing in state.ts's own executed top level reads it
 *
 * So this guard instead walks a CALL graph, seeded from the test file's own
 * top-level code (its `describe`/`it`/`beforeEach` bodies included, since
 * those genuinely run): any IDENTIFIER REFERENCE to a name bound to the
 * target module — call or not, since a bare property read already throws —
 * is recorded as reached; any CALL to a name bound to a different internal
 * (non-target, non-external) file propagates the trace into THAT function's
 * own body, so the analysis only descends into a sibling file's code when
 * something in the currently-traced code path genuinely calls into it. This
 * is a closer static approximation of "reaches for," in the sense the task
 * asked for, than "imports the file that happens to also import it."
 *
 * WHAT THE GUARD ACTUALLY PROVES, PER FILE:
 *
 *   1. It finds every `vi.mock("@/lib/auth", factory)` / `vi.mock("@sports/
 *      prediction-engine", factory)` call in every `*.test.ts(x)` file in
 *      `apps/web`.
 *   2. It statically determines what the factory PROVIDES: literal object
 *      keys, keys merged in from a same-file local mock object it spreads,
 *      or — if the factory spreads the REAL module (`await
 *      importOriginal()/importActual()`) or the shared `authModuleMock()`
 *      complete-defaults helper — the WHOLE real export surface at once.
 *      `authModuleMock`'s own completeness against the live `@/lib/auth`
 *      module is verified separately (see the second `describe` below), so
 *      trusting it is not begging the question: if the real module ever
 *      outgrows the helper's `DEFAULTS`, THAT assertion is what goes red,
 *      naming the helper file.
 *   3. It statically traces, starting from the SAME test file, what its own
 *      code path calls into and, transitively, what THOSE functions read
 *      from the target module (see "WHY CALL-GRAPH TRACING" above).
 *   4. If REACHED is not a subset of PROVIDED, and the factory is not marked
 *      complete, this guard fails LOUDLY, naming the exact file and the
 *      exact missing export name(s) — the fix is spelled out in the failure
 *      message itself: add the key, or spread the real module, or spread the
 *      complete-defaults helper.
 *
 * WHY THIS CANNOT BE SATISFIED BY WEAKENING A MOCK. The guard never asks a
 * factory to supply less; it can only ever demand MORE keys, and only the
 * ones a real, traced call path in this workspace actually reads. There is
 * no threshold, allowlist entry, or count this guard reads that a developer
 * could relax to make a real omission pass — the only way to satisfy a
 * genuine finding is to add the missing key (or make the factory provably
 * complete by spreading the real module).
 *
 * WHERE IT IS DELIBERATELY CONSERVATIVE (documented, not hidden):
 *   - If a factory spreads an identifier this guard cannot resolve to either
 *     the real module, the complete-defaults helper, or a same-file object
 *     literal, it cannot prove the factory is missing anything, so it does
 *     NOT fail that factory — it only records it under
 *     `unresolvedSpreadWarnings`, surfaced by the survey test.
 *   - A factory whose returned shape this guard cannot parse at all is
 *     recorded under `unresolvableFactories`, never failed.
 *   - The call-graph trace only propagates into another file on a direct
 *     `name(...)` or `ns.name(...)` call site it can resolve; it does not
 *     follow a function passed by reference as a callback (`arr.map(fn)`)
 *     without a direct call, and it does not resolve re-exports made by
 *     `export * from "..."` (a repo-wide check below confirms zero such
 *     wildcard re-exports of either target module exist today).
 *   This bias is deliberate: a false PASS on an unprovable case is a gap to
 *   close by hand; a false FAIL on a file outside this guard's own scope
 *   would be exactly the "guard theatre" this task warns against, training
 *   people to stop trusting — or to weaken — the guard.
 *
 * PROOF THE DETECTOR WORKS: the last `describe` block below feeds two
 * hand-written FIXTURE source snippets (never a real `vi.mock` call in this
 * file — see its own comment) through the exact same parsing/analysis
 * functions the real scan uses, and asserts the incomplete one is caught and
 * the complete one is not.
 */
import { beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const APPS_WEB_ROOT = path.join(REPO_ROOT, "apps", "web");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");

interface TargetModule {
  /** Exact string literal as it appears in `vi.mock("...", ...)`. */
  specifier: string;
  /** Absolute path to the real implementation file this specifier resolves to. */
  realFile: string;
}

const AUTH_TARGET: TargetModule = {
  specifier: "@/lib/auth",
  realFile: path.join(APPS_WEB_ROOT, "lib", "auth.ts"),
};

const PREDICTION_ENGINE_TARGET: TargetModule = {
  specifier: "@sports/prediction-engine",
  realFile: path.join(PACKAGES_ROOT, "prediction-engine", "src", "index.ts"),
};

const TARGETS: readonly TargetModule[] = [AUTH_TARGET, PREDICTION_ENGINE_TARGET];

// ---------------------------------------------------------------------------
// Filesystem + module-specifier resolution (cached)
// ---------------------------------------------------------------------------

const fileExistsCache = new Map<string, boolean>();
function fileExists(absPath: string): boolean {
  const cached = fileExistsCache.get(absPath);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    ok = fs.statSync(absPath).isFile();
  } catch {
    ok = false;
  }
  fileExistsCache.set(absPath, ok);
  return ok;
}

/** `.js`/`.jsx`/`.mjs`/`.cjs` relative-import extensions this workspace writes
 * against `.ts`/`.tsx` source (strict-ESM style, e.g. `./scoring.js`). */
const JS_TO_TS_EXT: Record<string, string> = {
  ".js": ".ts",
  ".jsx": ".tsx",
  ".mjs": ".ts",
  ".cjs": ".ts",
};

function resolveWithExtensions(basePath: string): string | null {
  const ext = path.extname(basePath);
  const candidates: string[] = [];
  const swapped = JS_TO_TS_EXT[ext];
  if (swapped) candidates.push(basePath.slice(0, -ext.length) + swapped);
  candidates.push(basePath);
  if (!ext) {
    candidates.push(
      `${basePath}.ts`,
      `${basePath}.tsx`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
    );
  }
  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

const packageMainCache = new Map<string, string | null>();

/** Resolves `@sports/<pkg>[/<subpath>]` to an absolute source file, reading
 * the workspace package's own `package.json#main` (this repo's packages all
 * point `main`/`types` at their TS source, e.g. `@sports/prediction-engine`
 * -> `./src/index.ts`), never a compiled `dist/`. */
function resolveWorkspacePackage(pkgName: string, subpath: string): string | null {
  const pkgDir = path.join(PACKAGES_ROOT, pkgName);
  if (subpath === "") {
    const cached = packageMainCache.get(pkgName);
    if (cached !== undefined) return cached;
    let mainField = "./src/index.ts";
    try {
      const raw = fs.readFileSync(path.join(pkgDir, "package.json"), "utf8");
      const parsed = JSON.parse(raw) as { main?: string };
      if (parsed.main) mainField = parsed.main;
    } catch {
      // No readable package.json — fall back to the workspace convention.
    }
    const resolved = resolveWithExtensions(path.join(pkgDir, mainField));
    packageMainCache.set(pkgName, resolved);
    return resolved;
  }
  return (
    resolveWithExtensions(path.join(pkgDir, "src", subpath)) ??
    resolveWithExtensions(path.join(pkgDir, subpath))
  );
}

/** Resolves an import/export specifier as written in `fromAbsFile` to an
 * absolute workspace source file, or `null` for anything external (bare
 * package specifiers, Node builtins) — external specifiers are trace leaves;
 * this guard never reads into `node_modules`. */
function resolveSpecifier(fromAbsFile: string, spec: string): string | null {
  if (spec.startsWith(".")) {
    return resolveWithExtensions(path.resolve(path.dirname(fromAbsFile), spec));
  }
  if (spec.startsWith("@/")) {
    return resolveWithExtensions(path.join(APPS_WEB_ROOT, spec.slice(2)));
  }
  if (spec.startsWith("@sports/")) {
    const rest = spec.slice("@sports/".length);
    const slash = rest.indexOf("/");
    const pkgName = slash === -1 ? rest : rest.slice(0, slash);
    const subpath = slash === -1 ? "" : rest.slice(slash + 1);
    return resolveWorkspacePackage(pkgName, subpath);
  }
  return null;
}

function isNodeModulesPath(absPath: string): boolean {
  return absPath.includes(`${path.sep}node_modules${path.sep}`);
}

function walkTestFiles(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTestFiles(full, acc);
    } else if (entry.isFile() && (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx"))) {
      acc.push(full);
    }
  }
  return acc;
}

// ---------------------------------------------------------------------------
// AST parsing (cached)
// ---------------------------------------------------------------------------

interface ParsedFile {
  text: string;
  sf: ts.SourceFile;
}

const fileCache = new Map<string, ParsedFile | null>();

function loadFile(absPath: string): ParsedFile | null {
  const cached = fileCache.get(absPath);
  if (cached !== undefined) return cached;
  let text: string;
  try {
    text = fs.readFileSync(absPath, "utf8");
  } catch {
    fileCache.set(absPath, null);
    return null;
  }
  const isTsx = absPath.endsWith(".tsx");
  const sf = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const parsed: ParsedFile = { text, sf };
  fileCache.set(absPath, parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Per-file bindings: what does a local name resolve to, for call-graph
// propagation? (imports, local function/const/class decls, re-exports,
// namespace imports, and local `export { a as b };` aliases)
// ---------------------------------------------------------------------------

interface ImportBinding {
  spec: string;
  importedName: string;
}

interface FileBindings {
  /** local name -> where it was imported from (named imports only; type-only excluded) */
  imports: Map<string, ImportBinding>;
  /** local namespace-import name -> module specifier (`import * as X from "spec"`) */
  namespaces: Map<string, string>;
  /** local export name -> where it re-exports from (`export { a as b } from "spec"`) */
  reexports: Map<string, ImportBinding>;
  /** local export name -> the local name it aliases (`export { helper as Public };`, no `from`) */
  localAliases: Map<string, string>;
  /** every top-level function/const/class declaration by name, exported or not —
   * needed to follow same-file calls during tracing. */
  locals: Map<string, ts.Node>;
}

const bindingsCache = new Map<string, FileBindings>();

function extractBindings(sf: ts.SourceFile): FileBindings {
  const imports = new Map<string, ImportBinding>();
  const namespaces = new Map<string, string>();
  const reexports = new Map<string, ImportBinding>();
  const localAliases = new Map<string, string>();
  const locals = new Map<string, ts.Node>();

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      if (stmt.importClause?.isTypeOnly) continue;
      if (!ts.isStringLiteralLike(stmt.moduleSpecifier)) continue;
      const spec = stmt.moduleSpecifier.text;
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          if (el.isTypeOnly) continue;
          imports.set(el.name.text, { spec, importedName: (el.propertyName ?? el.name).text });
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        namespaces.set(bindings.name.text, spec);
      }
    } else if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const hasSpec = stmt.moduleSpecifier && ts.isStringLiteralLike(stmt.moduleSpecifier);
      const spec = hasSpec ? (stmt.moduleSpecifier as ts.StringLiteralLike).text : null;
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          if (el.isTypeOnly) continue;
          const originalName = (el.propertyName ?? el.name).text;
          if (spec) {
            reexports.set(el.name.text, { spec, importedName: originalName });
          } else {
            localAliases.set(el.name.text, originalName);
          }
        }
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      locals.set(stmt.name.text, stmt);
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      locals.set(stmt.name.text, stmt);
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          locals.set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  return { imports, namespaces, reexports, localAliases, locals };
}

function getFileBindings(absPath: string, parsed: ParsedFile): FileBindings {
  const cached = bindingsCache.get(absPath);
  if (cached) return cached;
  const bindings = extractBindings(parsed.sf);
  bindingsCache.set(absPath, bindings);
  return bindings;
}

// ---------------------------------------------------------------------------
// Call-graph tracing: what does a piece of real code actually read from /
// call into? (see the module doc comment, "WHY CALL-GRAPH TRACING")
// ---------------------------------------------------------------------------

interface TraceWorkItem {
  file: string;
  name: string;
}

interface TraceCtx {
  filePath: string;
  bindings: FileBindings;
  target: TargetModule;
  reached: Set<string>;
  push: (file: string, name: string) => void;
}

function unwrapParens(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

/** True for an Identifier node that is a VALUE REFERENCE — false for one that
 * is itself a declaration site or a property-name/label position, so `{ x }`
 * (object key), `function x()`, and `import { x }` don't get misread as uses
 * of an outer binding named `x`. Not full scope/shadowing analysis — a
 * pragmatic, per-file flat approximation (see module doc comment). */
function isReferencePosition(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isVariableDeclaration(parent) && parent.name === node) return false;
  if (ts.isParameter(parent) && parent.name === node) return false;
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return false;
  if (ts.isFunctionExpression(parent) && parent.name === node) return false;
  if (ts.isClassDeclaration(parent) && parent.name === node) return false;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isBindingElement(parent) && parent.name === node) return false;
  if (ts.isImportSpecifier(parent)) return false;
  if (ts.isExportSpecifier(parent)) return false;
  if (ts.isLabeledStatement(parent) && parent.label === node) return false;
  return true;
}

function resolveCallableLocal(
  name: string,
  bindings: FileBindings,
): { kind: "import"; spec: string; importedName: string } | { kind: "local" } | null {
  const imp = bindings.imports.get(name);
  if (imp) return { kind: "import", spec: imp.spec, importedName: imp.importedName };
  if (bindings.locals.has(name)) return { kind: "local" };
  return null;
}

function traceUsage(node: ts.Node, ctx: TraceCtx): void {
  if (ts.isTypeNode(node)) return; // never chase type-only positions

  if (ts.isIdentifier(node) && isReferencePosition(node)) {
    const binding = resolveCallableLocal(node.text, ctx.bindings);
    if (binding?.kind === "import") {
      const resolved = resolveSpecifier(ctx.filePath, binding.spec);
      if (resolved === ctx.target.realFile) {
        // A bare reference already reads the mocked property — this is the
        // exact operation that throws, called or not (see module doc comment).
        ctx.reached.add(binding.importedName);
      }
    }
  }

  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (ts.isIdentifier(callee)) {
      const binding = resolveCallableLocal(callee.text, ctx.bindings);
      if (binding?.kind === "import") {
        const resolved = resolveSpecifier(ctx.filePath, binding.spec);
        if (resolved && resolved !== ctx.target.realFile && !isNodeModulesPath(resolved)) {
          ctx.push(resolved, binding.importedName);
        }
      } else if (binding?.kind === "local") {
        ctx.push(ctx.filePath, callee.text);
      }
    } else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
      const nsSpec = ctx.bindings.namespaces.get(callee.expression.text);
      if (nsSpec) {
        const resolved = resolveSpecifier(ctx.filePath, nsSpec);
        if (resolved === ctx.target.realFile) {
          ctx.reached.add(callee.name.text);
        } else if (resolved && !isNodeModulesPath(resolved)) {
          ctx.push(resolved, callee.name.text);
        }
      }
    }
  } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
    // Namespace member read without a call (`ns.someExport`, not `ns.someExport()`) —
    // still a property read on the mocked module if `ns` is a namespace import
    // of the target.
    const nsSpec = ctx.bindings.namespaces.get(node.expression.text);
    if (nsSpec) {
      const resolved = resolveSpecifier(ctx.filePath, nsSpec);
      if (resolved === ctx.target.realFile) ctx.reached.add(node.name.text);
    }
  }

  ts.forEachChild(node, (child) => traceUsage(child, ctx));
}

/** Given a local declaration node (function/const-initializer/class), returns
 * the node whose body should actually be traced. */
function getTraceBody(node: ts.Node): ts.Node {
  if (ts.isFunctionDeclaration(node)) return node.body ?? node;
  if (ts.isClassDeclaration(node)) return node;
  if (ts.isExpression(node)) {
    const unwrapped = unwrapParens(node);
    if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
      return unwrapped.body;
    }
    return unwrapped;
  }
  return node;
}

const TRACE_NODE_CAP = 8000;

/** Traces what the given TEST FILE's own executed code (its top-level body,
 * including every `describe`/`it`/`beforeEach` callback — those run) reads
 * from `target`, following calls into sibling internal files transitively. */
function computeReachedExports(testFile: string, target: TargetModule): Set<string> {
  const reached = new Set<string>();
  const visited = new Set<string>();
  const queue: TraceWorkItem[] = [];
  let processed = 0;

  const push = (file: string, name: string): void => {
    queue.push({ file, name });
  };

  const testParsed = loadFile(testFile);
  if (testParsed) {
    const testBindings = getFileBindings(testFile, testParsed);
    traceUsage(testParsed.sf, { filePath: testFile, bindings: testBindings, target, reached, push });
  }

  while (queue.length > 0 && processed < TRACE_NODE_CAP) {
    const item = queue.shift() as TraceWorkItem;
    const key = `${item.file}::${item.name}`;
    if (visited.has(key)) continue;
    visited.add(key);
    processed += 1;

    const parsed = loadFile(item.file);
    if (!parsed) continue;
    const bindings = getFileBindings(item.file, parsed);

    const imp = bindings.imports.get(item.name) ?? bindings.reexports.get(item.name);
    if (imp) {
      const resolved = resolveSpecifier(item.file, imp.spec);
      if (resolved === target.realFile) {
        reached.add(imp.importedName);
      } else if (resolved && !isNodeModulesPath(resolved)) {
        push(resolved, imp.importedName);
      }
      continue;
    }
    const alias = bindings.localAliases.get(item.name);
    if (alias) {
      push(item.file, alias);
      continue;
    }
    const localNode = bindings.locals.get(item.name);
    if (!localNode) continue; // unresolved — see module doc comment on conservatism
    traceUsage(getTraceBody(localNode), { filePath: item.file, bindings, target, reached, push });
  }

  return reached;
}

// ---------------------------------------------------------------------------
// Factory analysis: what does a `vi.mock(target, factory)` call PROVIDE?
// ---------------------------------------------------------------------------

function findMockCalls(sf: ts.SourceFile, targetSpecifier: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "mock" &&
      ts.isIdentifier(node.expression.expression) &&
      (node.expression.expression.text === "vi" || node.expression.expression.text === "vitest")
    ) {
      const [first] = node.arguments;
      if (first && ts.isStringLiteralLike(first) && first.text === targetSpecifier) {
        calls.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return calls;
}

/** The single expression a `vi.mock(target, factory)` factory evaluates to —
 * either the concise arrow body, or the argument of its block's `return`. */
function getFactoryReturnedExpression(factory: ts.Expression | undefined): ts.Expression | null {
  if (!factory) return null;
  if (!ts.isArrowFunction(factory) && !ts.isFunctionExpression(factory)) return null;
  const body = factory.body;
  if (ts.isBlock(body)) {
    for (const stmt of body.statements) {
      if (ts.isReturnStatement(stmt) && stmt.expression) {
        return unwrapParens(stmt.expression);
      }
    }
    return null;
  }
  return unwrapParens(body);
}

function collectVarInitializers(root: ts.Node): Map<string, ts.Expression> {
  const map = new Map<string, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      map.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return map;
}

/** `const X = vi.hoisted(() => ({...}))` or plain `const X = {...}` — either
 * way, resolve to the underlying object literal, or `null` if it is neither
 * shape (e.g. built by a function call this guard does not recognize). */
function resolveObjectLiteral(init: ts.Expression): ts.ObjectLiteralExpression | null {
  const unwrapped = unwrapParens(init);
  if (ts.isObjectLiteralExpression(unwrapped)) return unwrapped;
  if (
    ts.isCallExpression(unwrapped) &&
    ts.isPropertyAccessExpression(unwrapped.expression) &&
    unwrapped.expression.name.text === "hoisted" &&
    ts.isIdentifier(unwrapped.expression.expression) &&
    unwrapped.expression.expression.text === "vi"
  ) {
    const expr = getFactoryReturnedExpression(unwrapped.arguments[0]);
    return expr && ts.isObjectLiteralExpression(expr) ? expr : null;
  }
  return null;
}

interface AnalysisCtx {
  varDecls: Map<string, ts.Expression>;
  authHelperComplete: boolean;
  /** Variable initializers declared INSIDE THIS FACTORY ONLY, as AST nodes.
   * Scoped to the factory (not the file) for the reason the previous
   * source-text version documented: a same-named `const actual = await
   * importOriginal(...)` belonging to a DIFFERENT `vi.mock` call elsewhere in
   * the same file must not be mistaken for this one's. AST rather than text
   * because this file's whole design argument is that a regex over source
   * misses re-exports, aliases and multi-line forms, and because building a
   * `RegExp` from an interpolated identifier is a denial-of-service pattern
   * (an unescaped metacharacter in the name changes or explodes the match). */
  factoryVarDecls: Map<string, ts.Expression>;
}

interface FactoryAnalysis {
  /** true = this factory is provably a superset of the real module (spreads
   * the real module itself, or the verified-complete defaults helper). */
  complete: boolean;
  keys: Set<string>;
  /** Spread expressions this guard could not resolve to a concrete key set —
   * reported, never used to fail (see the module doc comment). */
  unresolvedSpreads: string[];
  /** true only when the top-level factory shape itself could not be read at
   * all (neither an object literal nor a recognized complete-helper call). */
  unresolvable: boolean;
}

function isSpreadOfRealModule(
  localName: string,
  factoryVarDecls: Map<string, ts.Expression>,
): boolean {
  const init = factoryVarDecls.get(localName);
  if (!init || !ts.isAwaitExpression(init)) return false;
  const call = unwrapParens(init.expression);
  if (!ts.isCallExpression(call)) return false;
  const callee = call.expression;
  return (
    ts.isIdentifier(callee) &&
    (callee.text === "importOriginal" || callee.text === "importActual")
  );
}

function analyzeObjectLiteral(obj: ts.ObjectLiteralExpression, ctx: AnalysisCtx): FactoryAnalysis {
  let complete = false;
  const keys = new Set<string>();
  const unresolvedSpreads: string[] = [];

  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.add(name.text);
      else unresolvedSpreads.push("computed property name");
    } else if (ts.isMethodDeclaration(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.add(name.text);
    } else if (ts.isSpreadAssignment(prop)) {
      const expr = prop.expression;
      if (ts.isIdentifier(expr)) {
        const name = expr.text;
        if (isSpreadOfRealModule(name, ctx.factoryVarDecls)) {
          complete = true;
          continue;
        }
        const init = ctx.varDecls.get(name);
        const resolvedObj = init ? resolveObjectLiteral(init) : null;
        if (resolvedObj) {
          const sub = analyzeObjectLiteral(resolvedObj, ctx);
          if (sub.complete) complete = true;
          for (const k of sub.keys) keys.add(k);
          unresolvedSpreads.push(...sub.unresolvedSpreads);
        } else {
          unresolvedSpreads.push(`...${name}`);
        }
      } else if (
        ts.isCallExpression(expr) &&
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === "authModuleMock"
      ) {
        if (ctx.authHelperComplete) complete = true;
        else unresolvedSpreads.push("...authModuleMock(...) — helper completeness unverified");
      } else {
        unresolvedSpreads.push(`...<unresolved spread expression: ${ts.SyntaxKind[expr.kind]}>`);
      }
    }
    // A computed/other property kind neither adds a key nor blocks
    // completeness detection elsewhere in the object — it is simply not a
    // source of provided keys this guard can name.
  }
  return { complete, keys, unresolvedSpreads, unresolvable: false };
}

function analyzeFactory(factory: ts.Expression | undefined, ctx: AnalysisCtx): FactoryAnalysis {
  const expr = getFactoryReturnedExpression(factory);
  if (!expr) return { complete: false, keys: new Set(), unresolvedSpreads: [], unresolvable: true };

  if (ts.isObjectLiteralExpression(expr)) return analyzeObjectLiteral(expr, ctx);
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === "authModuleMock") {
    return {
      complete: ctx.authHelperComplete,
      keys: new Set(),
      unresolvedSpreads: ctx.authHelperComplete ? [] : ["authModuleMock(...) — helper completeness unverified"],
      unresolvable: false,
    };
  }
  return { complete: false, keys: new Set(), unresolvedSpreads: [], unresolvable: true };
}

// ---------------------------------------------------------------------------
// Repo-wide blind-spot check: a bare `export * from "<target>"` anywhere
// would make a name reachable through a path this guard's binding table
// cannot enumerate (see module doc comment). Regex-only and separate from
// the hard-failing scan on purpose — this is a coarse tripwire, not the
// guard's core claim.
// ---------------------------------------------------------------------------

function walkAllSourceFiles(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "dist" ||
      entry.name.startsWith(".")
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAllSourceFiles(full, acc);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      acc.push(full);
    }
  }
  return acc;
}

function findWildcardReexportsOfTargets(): string[] {
  const hits: string[] = [];
  for (const dir of [APPS_WEB_ROOT, PACKAGES_ROOT]) {
    for (const file of walkAllSourceFiles(dir)) {
      const parsed = loadFile(file);
      if (!parsed) continue;
      for (const stmt of parsed.sf.statements) {
        if (!ts.isExportDeclaration(stmt)) continue;
        // Both wildcard forms the previous regex matched: bare `export * from`
        // (no clause) and `export * as NS from` (a NamespaceExport clause). A
        // named re-export `export { a } from` is NOT a wildcard and is skipped.
        const isWildcard =
          stmt.exportClause === undefined || ts.isNamespaceExport(stmt.exportClause);
        if (!isWildcard) continue;
        const spec = stmt.moduleSpecifier;
        if (spec === undefined || !ts.isStringLiteral(spec)) continue;
        const target = TARGETS.find((t) => t.specifier === spec.text);
        if (target) {
          hits.push(`${path.relative(REPO_ROOT, file)} wildcard re-exports ${target.specifier}`);
        }
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

interface SurveyRow {
  target: string;
  fileCount: number;
}

interface DriftFailure {
  file: string;
  target: string;
  missing: string[];
}

interface GuardRunResult {
  survey: SurveyRow[];
  failures: DriftFailure[];
  unresolvableFactories: Array<{ file: string; target: string }>;
  unresolvedSpreadWarnings: Array<{ file: string; target: string; spreads: string[] }>;
  wildcardReexports: string[];
  authRealKeys: string[];
  authHelperKeys: string[];
}

function discoverMockFiles(allTestFiles: readonly string[], target: TargetModule): string[] {
  const matches: string[] = [];
  for (const file of allTestFiles) {
    const parsed = loadFile(file);
    if (!parsed) continue;
    if (findMockCalls(parsed.sf, target.specifier).length > 0) matches.push(file);
  }
  return matches;
}

async function runGuard(): Promise<GuardRunResult> {
  const allTestFiles = walkTestFiles(APPS_WEB_ROOT);

  // Meta-check inputs: is the shared complete-defaults helper actually
  // complete against the live module? Both are REAL imports (this file
  // mocks neither), so this reads the genuine current export surfaces.
  const authRealModule = (await import("@/lib/auth")) as Record<string, unknown>;
  const authRealKeys = Object.keys(authRealModule).sort();
  const authHelperModule = (await import("./helpers/auth-mock")) as {
    authModuleMock: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  };
  const authHelperKeys = Object.keys(authHelperModule.authModuleMock()).sort();
  const authHelperComplete = authRealKeys.every((key) => authHelperKeys.includes(key));

  const survey: SurveyRow[] = [];
  const failures: DriftFailure[] = [];
  const unresolvableFactories: Array<{ file: string; target: string }> = [];
  const unresolvedSpreadWarnings: Array<{ file: string; target: string; spreads: string[] }> = [];

  for (const target of TARGETS) {
    const mockFiles = discoverMockFiles(allTestFiles, target);
    survey.push({ target: target.specifier, fileCount: mockFiles.length });

    for (const absFile of mockFiles) {
      const parsed = loadFile(absFile);
      if (!parsed) continue;
      const relFile = path.relative(REPO_ROOT, absFile);
      const varDecls = collectVarInitializers(parsed.sf);
      const calls = findMockCalls(parsed.sf, target.specifier);

      // A file can call vi.mock(target, ...) more than once (rare); analyze
      // each call, but only pay for the (more expensive) call-graph trace
      // once per file, lazily, the first time it's actually needed.
      let reached: Set<string> | null = null;

      for (const call of calls) {
        const factory = call.arguments[1];
        if (!factory) {
          // `vi.mock(target)` with no second argument at all — nothing to analyze.
          unresolvableFactories.push({ file: relFile, target: target.specifier });
          continue;
        }
        const analysis = analyzeFactory(factory, {
          varDecls,
          authHelperComplete,
          factoryVarDecls: collectVarInitializers(factory),
        });

        if (analysis.unresolvable) {
          unresolvableFactories.push({ file: relFile, target: target.specifier });
          continue;
        }
        if (analysis.complete) continue; // provably a superset of the real module

        if (analysis.unresolvedSpreads.length > 0) {
          unresolvedSpreadWarnings.push({
            file: relFile,
            target: target.specifier,
            spreads: analysis.unresolvedSpreads,
          });
          continue; // cannot prove this one is missing anything — see module doc comment
        }

        if (!reached) reached = computeReachedExports(absFile, target);
        const missing = [...reached].filter((name) => !analysis.keys.has(name)).sort();
        if (missing.length > 0) {
          failures.push({ file: relFile, target: target.specifier, missing });
        }
      }
    }
  }

  return {
    survey,
    failures,
    unresolvableFactories,
    unresolvedSpreadWarnings,
    wildcardReexports: findWildcardReexportsOfTargets(),
    authRealKeys,
    authHelperKeys,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let result: GuardRunResult;

beforeAll(async () => {
  result = await runGuard();
}, 30_000);

describe("partial vi.mock factory survey (@/lib/auth, @sports/prediction-engine)", () => {
  it("finds a nonzero, reported count of mocking files for each target", () => {
    for (const row of result.survey) {
      // eslint-disable-next-line no-console
      console.log(`[mock-factory-export-drift] ${row.target}: ${row.fileCount} files`);
    }
    // A count of zero for either target means our AST matcher stopped
    // recognizing `vi.mock("<target>", ...)` — e.g. after a vitest upgrade
    // changes how the call is written — and this whole guard is silently
    // checking nothing. That is exactly the "(0 test)" failure-reported-as-
    // a-pass class this task warned about, one level up: a guard with
    // nothing to guard is worth less than no guard, because it buys false
    // confidence.
    for (const row of result.survey) {
      expect(row.fileCount).toBeGreaterThan(0);
    }
  });

  it("reports every escape hatch this guard took (today: none, for either target)", () => {
    // These lists are the guard's own honesty channel: any case it could not
    // resolve with certainty is named here, not silently absorbed into a
    // pass. Today's empty lists are a measured fact about the current tree,
    // not a hard invariant this guard enforces — a future file that adds an
    // unresolvable spread shows up here as a visible warning, not a build
    // failure for something this guard cannot actually prove is broken.
    // eslint-disable-next-line no-console
    if (result.unresolvableFactories.length > 0) {
      console.log("[mock-factory-export-drift] unresolvable factory shapes:", result.unresolvableFactories);
    }
    // eslint-disable-next-line no-console
    if (result.unresolvedSpreadWarnings.length > 0) {
      console.log(
        "[mock-factory-export-drift] unresolved spreads (cannot prove complete or incomplete):",
        result.unresolvedSpreadWarnings,
      );
    }
    // eslint-disable-next-line no-console
    if (result.wildcardReexports.length > 0) {
      console.log("[mock-factory-export-drift] wildcard re-exports of a target module:", result.wildcardReexports);
    }
    expect(Array.isArray(result.unresolvableFactories)).toBe(true);
  });
});

describe("authModuleMock() defaults stay in sync with the real @/lib/auth export surface", () => {
  it("covers every real export, so factories that spread it are provably complete", () => {
    const missing = result.authRealKeys.filter((key) => !result.authHelperKeys.includes(key));
    if (missing.length > 0) {
      throw new Error(
        `apps/web/__tests__/helpers/auth-mock.ts's DEFAULTS is missing export(s) ` +
          `[${missing.join(", ")}] that the real apps/web/lib/auth.ts now has. Every ` +
          `vi.mock("@/lib/auth", () => authModuleMock(...)) factory in this workspace is ` +
          `trusted by mock-factory-export-drift.test.ts to be COMPLETE on the strength of ` +
          `this one check — add the missing key(s) to DEFAULTS (with an inert default) to ` +
          `restore that guarantee for every caller at once.`,
      );
    }
    expect(missing).toEqual([]);
  });
});

describe("no vi.mock factory omits an export its own code under test reaches for", () => {
  it("has zero missing-export drift across every @/lib/auth and @sports/prediction-engine mock", () => {
    if (result.failures.length > 0) {
      const lines = result.failures.map(
        (f) =>
          `  - ${f.file}: vi.mock("${f.target}", ...) is missing [${f.missing.join(", ")}] — ` +
          `this test's own traced call path reaches for ${f.missing.length === 1 ? "that export" : "those exports"} ` +
          `from "${f.target}", and the mock factory never defines it. Fix: add the missing ` +
          `key(s) to the factory's returned object (or replace the factory with one that ` +
          `spreads the real module via \`await importOriginal()\`/\`importActual()\`, or — for ` +
          `@/lib/auth — spread \`authModuleMock({...overrides})\` from ./helpers/auth-mock).`,
      );
      throw new Error(`${result.failures.length} mock factory export-drift violation(s):\n${lines.join("\n")}`);
    }
    expect(result.failures).toEqual([]);
  });
});

describe("detection sanity (FIXTURE source text, not a real vi.mock call in this file)", () => {
  it("flags a literal factory that omits a reached export, and clears one that spreads the complete helper", () => {
    // FIXTURE. These two strings are hand-authored source text, parsed the
    // exact same way this guard parses real test files, purely to prove the
    // analysis functions above tell COMPLETE from INCOMPLETE correctly. They
    // are never passed to the real `vi.mock` in this file — doing that would
    // make this guard file itself replace `@/lib/auth`, which would collide
    // with the real scan running in the same suite.
    const FIXTURE_INCOMPLETE_SOURCE = [
      'vi.mock("@/lib/auth", () => ({',
      "  auth: vi.fn(),",
      "  // isAdminEmail deliberately omitted for this fixture",
      "}));",
    ].join("\n");
    const FIXTURE_COMPLETE_SOURCE = ['vi.mock("@/lib/auth", () => authModuleMock({ auth: vi.fn() }));'].join("\n");

    function analyzeFixture(source: string): FactoryAnalysis {
      const sf = ts.createSourceFile("fixture.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const [call] = findMockCalls(sf, "@/lib/auth");
      if (!call) throw new Error("fixture source did not parse a vi.mock call — fixture is broken");
      const factory = call.arguments[1];
      if (!factory) throw new Error("fixture source's vi.mock call had no factory argument — fixture is broken");
      return analyzeFactory(factory, {
        varDecls: collectVarInitializers(sf),
        authHelperComplete: true,
        factoryVarDecls: collectVarInitializers(factory),
      });
    }

    const incomplete = analyzeFixture(FIXTURE_INCOMPLETE_SOURCE);
    expect(incomplete.unresolvable).toBe(false);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.keys.has("auth")).toBe(true);
    expect(incomplete.keys.has("isAdminEmail")).toBe(false);

    // Simulate this guard's own missing-export computation against a
    // reached set that includes the omitted export — this is the exact
    // arithmetic the real scan runs, isolated so the fixture proves it.
    const reachedFixture = new Set(["auth", "isAdminEmail"]);
    const missingFixture = [...reachedFixture].filter((name) => !incomplete.keys.has(name));
    expect(missingFixture).toEqual(["isAdminEmail"]);

    const complete = analyzeFixture(FIXTURE_COMPLETE_SOURCE);
    expect(complete.unresolvable).toBe(false);
    expect(complete.complete).toBe(true); // spreading the complete-defaults helper clears every export
  });
});
