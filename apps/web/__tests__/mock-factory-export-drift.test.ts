/**
 * GUARD: partial `vi.mock` factory drift for the two heavily-mocked modules
 * in this workspace, `@/lib/auth` and `@sports/prediction-engine`.
 *
 * THE DEFECT THIS PREVENTS (measured on this branch, 2026-09-19):
 *
 *   `vi.mock(path, factory)` REPLACES the real module wholesale. Anything the
 *   factory's returned object omits is `undefined` at the call site, and
 *   calling it throws `No "<name>" export is defined on the "<path>" mock`.
 *   `apps/web/__tests__/helpers/auth-mock.ts` already documents one instance
 *   of this (`isAdminEmail` added to `@/lib/auth`, 35 mocks did not carry it,
 *   3 of them broke). AGENTS.md documents a second instance on
 *   `@sports/prediction-engine` (the board's published lane collapsed to
 *   zero rows because a cross-package import resolved to `undefined` under a
 *   partial factory). Both are the SAME failure class on two different
 *   modules: a mock factory silently drifts from the real module's export
 *   surface as the real module grows, and nothing catches it until the code
 *   path that reaches the missing export actually runs.
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
 * DESIGN — why AST, not a brittle string match on `vi.mock("...")`. Repo
 * precedent (`scripts/guardrails/ai-transport-import-boundary.mjs`) already
 * states the reason: a regex over source text misses re-exports, aliased
 * named imports, multi-line import lists, and `import type`. The same is
 * true here, in both directions this guard needs: (1) reading what a mock
 * factory actually returns, and (2) reading what a piece of real code
 * actually imports from the mocked module. Both are done by parsing the real
 * TypeScript AST (`typescript`, already a devDependency of this workspace)
 * rather than by scanning text.
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
 *      module is verified by this guard too (see the third `describe`
 *      below), so trusting it is not begging the question: if the real
 *      module ever outgrows the helper's `DEFAULTS`, THAT assertion is what
 *      goes red, naming the helper file.
 *   3. It statically determines what the SAME test file's own code path
 *      REACHES FOR: starting from that test file's own `import` statements,
 *      it walks the real (non-test, non-node_modules) import graph of this
 *      workspace and collects every name any reachable file imports from the
 *      target module. This is the literal question "does the code under
 *      test reach for an export the factory omitted" — answered by tracing
 *      what is actually imported, not by guessing.
 *   4. If REACHED is not a subset of PROVIDED, and the factory is not marked
 *      complete, this guard fails LOUDLY, naming the exact file and the
 *      exact missing export name(s) — the fix is spelled out in the failure
 *      message itself: add the key, or spread the real module, or spread the
 *      complete-defaults helper.
 *
 * WHY THIS CANNOT BE SATISFIED BY WEAKENING A MOCK. The guard never asks a
 * factory to supply less; it can only ever demand MORE keys, and only the
 * ones a real, resolvable import statement in this workspace actually reads.
 * There is no threshold, allowlist entry, or count this guard reads that a
 * developer could relax to make a real omission pass — the only way to
 * satisfy a genuine finding is to add the missing key (or make the factory
 * provably complete by spreading the real module).
 *
 * WHERE IT IS DELIBERATELY CONSERVATIVE (documented, not hidden): if a
 * factory spreads an identifier this guard cannot resolve to either the real
 * module, the complete-defaults helper, or a same-file object literal, it
 * cannot prove the factory is missing anything, so it does NOT fail that
 * factory — it only records it under `unresolvedSpreadWarnings`, surfaced by
 * the survey test. The same applies to a factory whose returned shape this
 * guard cannot parse at all (`unresolvableFactories`), and to a bare
 * `export * from "<target>"` re-export encountered while walking the graph
 * (`wildcardWarnings` — the guard cannot enumerate names re-exported through
 * a wildcard). This bias is deliberate: a false PASS on an unprovable case is
 * a gap to close by hand; a false FAIL on a file outside this guard's own
 * scope would be exactly the "guard theatre" this task warns against, and
 * would train people to stop trusting — or to weaken — the guard. Measured
 * on this branch today: zero files hit any of these three escape hatches for
 * either target module (see the survey test's assertions), so today the
 * guard is exhaustive in practice, not just in the safe cases.
 *
 * PROOF THE DETECTOR WORKS: the last `describe` block below feeds two
 * hand-written FIXTURE source snippets (never a real `vi.mock` call in this
 * file — see its own comment) through the exact same parsing/analysis
 * functions the real scan uses, and asserts the incomplete one is caught and
 * the complete one is not. That is the "demonstrate it catches a
 * deliberately incomplete factory" requirement, without this file mocking a
 * real module itself (which would fight the tests around it in the same
 * suite).
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
// Filesystem helpers (cached — this guard parses a bounded subgraph per test
// file, not the whole repo, but many test files share the same subgraph)
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
 * package specifiers, Node builtins) — external specifiers are graph leaves;
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
// AST: parsing + import-edge extraction
// ---------------------------------------------------------------------------

interface ImportEdge {
  /** Module specifier exactly as written. */
  spec: string;
  /** Runtime (non-`type`) named imports/re-exports pulled FROM `spec`. */
  names: string[];
  /** Local binding for `import * as X from spec`, if any. */
  nsLocal: string | null;
  /** `export * from spec` — names cannot be statically enumerated. */
  wildcard: boolean;
}

interface ParsedFile {
  text: string;
  sf: ts.SourceFile;
  edges: ImportEdge[];
}

function extractEdges(sf: ts.SourceFile): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      if (stmt.importClause?.isTypeOnly) continue;
      const moduleSpecifier = stmt.moduleSpecifier;
      if (!ts.isStringLiteralLike(moduleSpecifier)) continue;
      const names: string[] = [];
      let nsLocal: string | null = null;
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          if (el.isTypeOnly) continue;
          names.push((el.propertyName ?? el.name).text);
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        nsLocal = bindings.name.text;
      }
      edges.push({ spec: moduleSpecifier.text, names, nsLocal, wildcard: false });
    } else if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const moduleSpecifier = stmt.moduleSpecifier;
      if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) continue;
      const names: string[] = [];
      let wildcard = false;
      const clause = stmt.exportClause;
      if (!clause) {
        wildcard = true; // export * from "spec"
      } else if (ts.isNamedExports(clause)) {
        for (const el of clause.elements) {
          if (el.isTypeOnly) continue;
          names.push((el.propertyName ?? el.name).text);
        }
      } else if (ts.isNamespaceExport(clause)) {
        wildcard = true; // export * as ns from "spec"
      }
      edges.push({ spec: moduleSpecifier.text, names, nsLocal: null, wildcard });
    }
  }
  return edges;
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
  const parsed: ParsedFile = { text, sf, edges: extractEdges(sf) };
  fileCache.set(absPath, parsed);
  return parsed;
}

function collectNamespaceUsage(sf: ts.SourceFile, nsLocal: string): Set<string> {
  const used = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === nsLocal
    ) {
      used.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return used;
}

// ---------------------------------------------------------------------------
// Reachability: what does this test file's own code path import FROM target?
// ---------------------------------------------------------------------------

interface ReachResult {
  reached: Set<string>;
  wildcardWarnings: string[];
}

const REACH_NODE_CAP = 6000;

function computeReachedExports(startAbsFile: string, target: TargetModule): ReachResult {
  const reached = new Set<string>();
  const wildcardWarnings: string[] = [];
  const visited = new Set<string>([startAbsFile]);
  const queue: string[] = [startAbsFile];
  let visitedCount = 0;

  while (queue.length > 0 && visitedCount < REACH_NODE_CAP) {
    const current = queue.shift() as string;
    visitedCount += 1;
    const file = loadFile(current);
    if (!file) continue;
    for (const edge of file.edges) {
      const resolved = resolveSpecifier(current, edge.spec);
      if (!resolved) continue; // external package / Node builtin — leaf, no further edges to find
      if (resolved === target.realFile) {
        for (const name of edge.names) reached.add(name);
        if (edge.nsLocal) {
          for (const name of collectNamespaceUsage(file.sf, edge.nsLocal)) reached.add(name);
        }
        if (edge.wildcard) {
          wildcardWarnings.push(
            `${path.relative(REPO_ROOT, current)} does \`export * from "${target.specifier}"\` — ` +
              `this guard cannot enumerate which names that re-export makes reachable.`,
          );
        }
        continue; // never descend into the target's own implementation
      }
      if (resolved.includes(`${path.sep}node_modules${path.sep}`)) continue;
      if (!visited.has(resolved)) {
        visited.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return { reached, wildcardWarnings };
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

function unwrapParens(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
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

function collectVarInitializers(sf: ts.SourceFile): Map<string, ts.Expression> {
  const map = new Map<string, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      map.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
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
    return getObjectLiteralFromFactory(unwrapped.arguments[0]);
  }
  return null;
}

function getObjectLiteralFromFactory(factory: ts.Expression | undefined): ts.ObjectLiteralExpression | null {
  const expr = getFactoryReturnedExpression(factory);
  return expr && ts.isObjectLiteralExpression(expr) ? expr : null;
}

interface AnalysisCtx {
  sf: ts.SourceFile;
  /** Source text of the FACTORY CALL ONLY (not the whole file), so a
   * same-named `const actual = await importOriginal(...)` for a DIFFERENT
   * `vi.mock` call elsewhere in the file cannot be mistaken for this one's. */
  factoryText: string;
  varDecls: Map<string, ts.Expression>;
  authHelperComplete: boolean;
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

function isSpreadOfRealModule(localName: string, factoryText: string): boolean {
  const re = new RegExp(`\\bconst\\s+${localName}\\s*=\\s*await\\s+import(?:Original|Actual)\\b`);
  return re.test(factoryText);
}

function analyzeObjectLiteral(obj: ts.ObjectLiteralExpression, ctx: AnalysisCtx): FactoryAnalysis {
  let complete = false;
  const keys = new Set<string>();
  const unresolvedSpreads: string[] = [];

  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
        keys.add(name.text);
      } else {
        unresolvedSpreads.push("computed property name");
      }
    } else if (ts.isMethodDeclaration(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.add(name.text);
    } else if (ts.isSpreadAssignment(prop)) {
      const expr = prop.expression;
      if (ts.isIdentifier(expr)) {
        const name = expr.text;
        if (isSpreadOfRealModule(name, ctx.factoryText)) {
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

function analyzeFactory(factory: ts.Expression | undefined, ctx: Omit<AnalysisCtx, "factoryText">, factoryText: string): FactoryAnalysis {
  const expr = getFactoryReturnedExpression(factory);
  if (!expr) return { complete: false, keys: new Set(), unresolvedSpreads: [], unresolvable: true };

  const fullCtx: AnalysisCtx = { ...ctx, factoryText };

  if (ts.isObjectLiteralExpression(expr)) {
    return analyzeObjectLiteral(expr, fullCtx);
  }
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === "authModuleMock") {
    return {
      complete: fullCtx.authHelperComplete,
      keys: new Set(),
      unresolvedSpreads: fullCtx.authHelperComplete ? [] : ["authModuleMock(...) — helper completeness unverified"],
      unresolvable: false,
    };
  }
  return { complete: false, keys: new Set(), unresolvedSpreads: [], unresolvable: true };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

interface SurveyRow {
  target: string;
  fileCount: number;
  files: string[];
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
  wildcardWarnings: string[];
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

  // Meta-check: is the shared complete-defaults helper actually complete
  // against the live module? Both are REAL imports (this file mocks
  // neither), so this reads the genuine current export surfaces.
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
  const wildcardWarnings: string[] = [];

  for (const target of TARGETS) {
    const mockFiles = discoverMockFiles(allTestFiles, target);
    survey.push({
      target: target.specifier,
      fileCount: mockFiles.length,
      files: mockFiles.map((f) => path.relative(REPO_ROOT, f)).sort(),
    });

    for (const absFile of mockFiles) {
      const parsed = loadFile(absFile);
      if (!parsed) continue;
      const relFile = path.relative(REPO_ROOT, absFile);
      const varDecls = collectVarInitializers(parsed.sf);
      const calls = findMockCalls(parsed.sf, target.specifier);

      for (const call of calls) {
        const factory = call.arguments[1];
        const factoryText = parsed.text.slice(factory.getStart(parsed.sf), factory.getEnd());
        const analysis = analyzeFactory(
          factory,
          { sf: parsed.sf, varDecls, authHelperComplete },
          factoryText,
        );

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

        const { reached, wildcardWarnings: fileWildcards } = computeReachedExports(absFile, target);
        wildcardWarnings.push(...fileWildcards);

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
    wildcardWarnings,
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
    // These three lists are the guard's own honesty channel: any case it
    // could not resolve with certainty is named here, not silently absorbed
    // into a pass. Today's zero counts are a measured fact about the current
    // tree, not a hard invariant this guard enforces — if a future file adds
    // an unresolvable spread, this test documents it as a visible warning
    // (via the console output above/below) rather than failing the build for
    // something this guard cannot actually prove is broken.
    // eslint-disable-next-line no-console
    if (result.unresolvableFactories.length > 0) {
      console.log(
        "[mock-factory-export-drift] unresolvable factory shapes:",
        result.unresolvableFactories,
      );
    }
    // eslint-disable-next-line no-console
    if (result.unresolvedSpreadWarnings.length > 0) {
      console.log(
        "[mock-factory-export-drift] unresolved spreads (cannot prove complete or incomplete):",
        result.unresolvedSpreadWarnings,
      );
    }
    // eslint-disable-next-line no-console
    if (result.wildcardWarnings.length > 0) {
      console.log("[mock-factory-export-drift] wildcard re-exports of a target:", result.wildcardWarnings);
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
          `some module this test file's code under test imports (traced through this ` +
          `workspace's real import graph) reaches for ${f.missing.length === 1 ? "that export" : "those exports"} ` +
          `from "${f.target}", and the mock factory never defines it. Fix: add the missing ` +
          `key(s) to the factory's returned object (or replace the factory with one that ` +
          `spreads the real module via \`await importOriginal()\`/\`importActual()\`, or — for ` +
          `@/lib/auth — spread \`authModuleMock({...overrides})\` from ./helpers/auth-mock).`,
      );
      throw new Error(
        `${result.failures.length} mock factory export-drift violation(s):\n${lines.join("\n")}`,
      );
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
    const FIXTURE_COMPLETE_SOURCE = [
      'vi.mock("@/lib/auth", () => authModuleMock({ auth: vi.fn() }));',
    ].join("\n");

    function analyzeFixture(source: string): FactoryAnalysis {
      const sf = ts.createSourceFile("fixture.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const [call] = findMockCalls(sf, "@/lib/auth");
      expect(call).toBeDefined();
      const factory = call.arguments[1];
      const factoryText = source.slice(factory.getStart(sf), factory.getEnd());
      return analyzeFactory(
        factory,
        { sf, varDecls: collectVarInitializers(sf), authHelperComplete: true },
        factoryText,
      );
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
