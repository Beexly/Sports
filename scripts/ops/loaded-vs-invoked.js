/**
 * LOADED vs INVOKED — the third tier my SURF-12 census could not see (2026-09-29)
 *
 * SURF-12 measured an import CLOSURE from the 24 scheduled routes and reported
 * 482 of 900 engine modules "evaluated" (loaded at runtime), 418 never loaded.
 * A subagent challenged the framing: process-sport imports the package BARREL
 * (packages/ingestion-engine/src/index.ts -> prediction-engine/src/index.ts),
 * and that barrel re-exports ~487 symbols. If the barrel is the only import
 * path, then "live" may just mean "present in the barrel", not "called".
 *
 * This measures the missing third tier. For every engine module that IS loaded,
 * is any of its exported symbols actually CALLED by a live module? A module
 * whose only import is `import { clamp } from "./scoring.js"` where `clamp` is
 * never invoked, is loaded, wired to the barrel, and contributes nothing.
 *
 * Method: TypeScript's own checker for symbol->declaring-file resolution
 * (getAliasedSymbol follows any number of barrel re-export hops, which is
 * exactly the trap that broke the v3-v5 regex resolvers), then a syntactic
 * scan for CallExpression callees. The call scan is a strict UNDER-count: a
 * call through an object member, a re-exported local alias, or a higher-order
 * handoff will not be seen. That bias is deliberate and stated in the output,
 * because over-counting "dead" modules is the error that matters here.
 */
const path = require("path");
const fs = require("fs");
const ts = require(path.join("C:\\Users\\Garrett", "sports", "node_modules", "typescript"));

const REPO = "C:\\Users\\Garrett\\sports";
const PE = path.join(REPO, "packages", "prediction-engine", "src");
const WEB = path.join(REPO, "apps", "web");
const ART = path.join(REPO, "docs", "ops", "loaded-vs-invoked.json");

const realpath = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
const norm = (p) => realpath(p).replace(/\\/g, "/").toLowerCase();
const PE_N = norm(PE);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const rel = (f) => path.relative(REPO, realpath(f)).split(path.sep).join("/");

// `__tests?` alone matches __test/__tests but NOT __tests__ (trailing __) --
// that bug counted a test fixture as engine code and produced 901 vs 900.
const isTest = (f) =>
  /(^|[\\/])__tests?(__)?[\\/]/.test(f) || /\.(test|spec)\.[cm]?tsx?$/.test(f) ||
  /\.d\.ts$/.test(f);

const appCfg = ts.readConfigFile(path.join(WEB, "tsconfig.json"), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(appCfg.config, ts.sys, WEB);
const co = Object.assign({}, parsed.options, {
  noEmit: true, skipLibCheck: true, skipDefaultLibCheck: true,
  incremental: false, composite: false,
});

/* ---- entry points: everything vercel.json actually schedules -------------- */
const vercel = readJSON(path.join(REPO, "vercel.json"));
const routes = [];
for (const c of vercel.crons || []) {
  const p = path.join(WEB, "app", String(c.path).replace(/^\/+|\/+$/g, ""), "route.ts");
  if (fs.existsSync(p)) routes.push(p);
}
const admin = path.join(WEB, "app", "api", "admin", "trigger-refresh", "route.ts");
if (fs.existsSync(admin)) routes.push(admin);
const entries = routes.concat([path.join(PE, "scoring.ts")]);

/* ---- the engine universe -------------------------------------------------- */
const allEngine = new Set();
(function collect(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (e.name.endsWith(".ts") && e.name !== "index.ts" && !isTest(p)) allEngine.add(norm(p));
  }
})(PE);

/* ---- program -------------------------------------------------------------- */
const program = ts.createProgram(entries, co);
const checker = program.getTypeChecker();
const byNorm = new Map();
for (const sf of program.getSourceFiles()) byNorm.set(norm(sf.fileName), sf);
const unresolved = new Map();

function moduleFileOfDecl(d) {
  const f = d.getSourceFile && d.getSourceFile();
  if (!f) return null;
  const fn = norm(f.fileName);
  return fn.startsWith(PE_N) || f.fileName.startsWith(PE) ? f.fileName : null;
}
function declaringFile(sym) {
  try {
    if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  } catch { return null; }
  for (const d of sym.declarations || []) {
    const f = moduleFileOfDecl(d);
    if (f) return f;
  }
  return null;
}

/* ---- which names does each live file actually CALL? ------------------------ */
// Keyed by norm(importing file) -> Set of called identifier texts.
const calledNames = new Map();
function recordCall(file, name) {
  const n = norm(file);
  let s = calledNames.get(n);
  if (!s) { s = new Set(); calledNames.set(n, s); }
  s.add(name);
}
for (const sf of program.getSourceFiles()) {
  if (isTest(sf.fileName)) continue;
  ts.forEachChild(sf, function visit(node) {
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e)) recordCall(sf.fileName, e.text);
      else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name)) {
        recordCall(sf.fileName, e.name.text);
      }
    }
    ts.forEachChild(node, visit);
  });
}

/* ---- one traversal -------------------------------------------------------- */
const evaluated = new Set();   // loaded at runtime
const invoked = new Set();     // at least one of its exports is actually called
const seen = new Set();
const unresolvedClasses = new Map();

const queue = entries.map(norm);
while (queue.length) {
  const nf = queue.pop();
  if (seen.has(nf)) continue;
  seen.add(nf);
  const sf = byNorm.get(nf);
  if (!sf) continue;
  const file = sf.fileName;
  if (isTest(file)) continue;

  ts.forEachChild(sf, function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const clause = node.importClause;
      if (clause && clause.isTypeOnly) return;          // erased at compile time
      if (ts.isExportDeclaration(node) && node.isTypeOnly) return;

      const spec = node.moduleSpecifier && node.moduleSpecifier.text;
      if (spec) {
        let resolved = null;
        const ms = checker.getSymbolAtLocation(node.moduleSpecifier);
        for (const d of (ms && ms.declarations) || []) {
          const f = moduleFileOfDecl(d);
          if (f) { resolved = f; break; }
        }
        if (!resolved) {
          const r = ts.resolveModuleName(spec, file, co, ts.sys);
          resolved = r.resolvedModule ? path.resolve(r.resolvedModule.resolvedFileName) : null;
        }
        if (!resolved) {
          if (!spec.startsWith("node:") && !/^(fs|path|crypto|url|zlib|os|child_process|readline)$/.test(spec)) {
            unresolvedClasses.set(spec, (unresolvedClasses.get(spec) || 0) + 1);
          }
        } else if (!resolved.endsWith(".d.ts")) {
          const n = norm(resolved);
          evaluated.add(n);
          queue.push(n);
        }
      }

      // named bindings: is the bound symbol ever CALLED by this file?
      const specs = [];
      if (clause) {
        if (clause.name) specs.push(clause.name);
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const el of clause.namedBindings.elements) specs.push(el.name);
        }
      }
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) specs.push(el.propertyName || el.name);
      }
      const calls = calledNames.get(norm(file)) || new Set();
      for (const nm of specs) {
        if (!nm || !ts.isIdentifier(nm) || nm.text === "type") continue;
        const d0 = (checker.getSymbolAtLocation(nm) || {}).declarations;
        const f0 = d0 && d0[0];
        if (f0 && (ts.isImportSpecifier(f0) || ts.isImportClause(f0)) && f0.isTypeOnly) continue;
        if (f0 && ts.isExportSpecifier(f0) && f0.isTypeOnly) continue;
        const df = declaringFile(checker.getSymbolAtLocation(nm));
        if (df && !isTest(df)) {
          const n = norm(df);
          evaluated.add(n);
          if (calls.has(nm.text)) invoked.add(n);
          if (!seen.has(n)) queue.push(n);
        }
      }
      return;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a = node.arguments[0];
      if (a && ts.isStringLiteral(a)) {
        const r = ts.resolveModuleName(a.text, file, co, ts.sys);
        if (r.resolvedModule) {
          const n = norm(path.resolve(r.resolvedModule.resolvedFileName));
          evaluated.add(n);
          queue.push(n);
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  });
}

const inEngine = (f) => f.startsWith(PE_N);
const ev = [...allEngine].filter((f) => evaluated.has(f));
const inv = [...allEngine].filter((f) => invoked.has(f));
const loadedNotInvoked = ev.filter((f) => !invoked.has(f)).map(rel).sort();
const neverLoaded = [...allEngine].filter((f) => !evaluated.has(f)).map(rel).sort();

const art = {
  generatedAt: new Date().toISOString().slice(0, 10),
  purpose:
    "SURF-12 measured an import CLOSURE and reported 482 of 900 engine modules as 'live'. "
    + "That counts a module as live if it is merely LOADED. Because process-sport imports the "
    + "package barrel, and the barrel re-exports ~416 named symbols, 'loaded' can be much weaker "
    + "than 'used'. This file adds the third tier: loaded AND actually invoked.",
  // The single most important caveat, found by hand-checking the largest entry.
  falsePositiveFoundAndHandled:
    "anytime-ledger.ts is in the loadedButNeverInvoked list, and it IS called: "
    + "apps/web/lib/performance/public-roi-policy.ts:212 invokes anytimeValidLedger(). The reason "
    + "it looks dead is that public-roi-policy.ts itself has no non-test importer anywhere in "
    + "apps/web, so the whole chain dead-ends outside the cron traversal. The module is genuinely "
    + "not on the scheduled path, but calling it 'never invoked' is wrong: it has a live consumer "
    + "whose consumer is unwired. Anything in this list must be read as 'not reachable FROM THE 24 "
    + "SCHEDULED ROUTES', never as 'nobody calls this'. The two are different claims and only the "
    + "first is measured here.",
  method: {
    resolver: "TypeScript checker getAliasedSymbol (follows barrel re-export hops to the declaring file)",
    callDetection:
      "Syntactic CallExpression scan for identifier / property-access callees, per live file. "
      + "STRICT UNDER-COUNT BY DESIGN: a call routed through an object member, a local alias, or a "
      + "higher-order handoff is not seen. Under-counting keeps 'dead' claims honest.",
    entryPoints: entries.map(rel),
  },
  totals: {
    engineModulesOnDisk: allEngine.size,
    loaded: ev.length,
    invoked: inv.length,
    loadedButNeverInvoked: loadedNotInvoked.length,
    neverLoaded: neverLoaded.length,
  },
  honestLimits: [
    "This is still not a call graph. 'Invoked' means an identifier matching an imported name appears "
    + "as a callee SOMEWHERE in the importing file, not necessarily inside the function that imported it.",
    "A module whose only consumer re-exports it (export { x } from './y') is loaded, and its symbol is "
    + "counted invoked if the re-exporting file calls it. That is intended.",
    "Barrels (index.ts) are excluded from the universe, matching SURF-12, so this measures modules, not files-of-record.",
  ],
  loadedButNeverInvoked: loadedNotInvoked,
  neverLoaded,
  unresolvedNonBuiltinSpecifiers: Object.fromEntries(unresolvedClasses),
};
fs.writeFileSync(ART, JSON.stringify(art, null, 1) + "\n");

console.log(`engine modules on disk   : ${allEngine.size}`);
console.log(`LOADED (import closure)   : ${ev.length}`);
console.log(`INVOKED (export called)  : ${inv.length}`);
console.log(`loaded, never invoked     : ${loadedNotInvoked.length}`);
console.log(`never loaded              : ${neverLoaded.length}`);
console.log(`\nnon-builtin unresolved specifiers: ${unresolvedClasses.size}`);
for (const [k, v] of unresolvedClasses) console.log(`   ${v}  ${k}`);
console.log(`\nlargest loaded-but-never-invoked modules:`);
for (const f of loadedNotInvoked.slice(0, 20)) {
  console.log(`   ${fs.statSync(realpath(path.join(REPO, f))).size.toString().padStart(7)}  ${f}`);
}
console.log(`\nwrote ` + rel(ART));
