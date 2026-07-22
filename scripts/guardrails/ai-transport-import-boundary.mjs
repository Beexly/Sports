#!/usr/bin/env node
/**
 * AI transport import-boundary guardrail (AST-based).
 *
 * SCOPE — what this guard actually is, stated honestly:
 *   This is a STRUCTURAL import boundary. It proves that raw model transport and
 *   raw provider clients are only reachable from an EXACT allowlist of adapter
 *   files. It does NOT prove that a completed economic control plane exists — it
 *   does not read budgets, resolve a cost mode, or account spend. Those layers
 *   (cost policy, atomic budget reservation, invocation/attempt ledgers) are not
 *   yet on `main`. This guard's sole guarantee is: "no code outside the adapter
 *   allowlist can issue raw model transport by import." Nothing more should be
 *   claimed of it.
 *
 * WHAT IT FORBIDS (for any file NOT on the adapter allowlist):
 *   1. importing / re-exporting the raw transport symbol `callClaudeMessages`
 *      (defined in apps/web/lib/claude-api/messages.ts), including aliased and
 *      multi-line named imports
 *   2. whole-module access to the transport module (messages.ts): static
 *      namespace import (`import * as m`), static default import, `export *
 *      from` / `export * as ns from`, dynamic `import()`, and CommonJS
 *      `require()` — each of these exposes `callClaudeMessages` transitively
 *   3. importing / re-exporting from a raw provider client module
 *      (apps/web/lib/claude-api/providers/*), including via RELATIVE specifiers
 *      (`./providers/bedrock`, `../messages`) which are resolved against the
 *      importing file's own repo path before classification
 *   4. importing a known provider/model vendor SDK package directly
 *      (@anthropic-ai/sdk, @aws-sdk/client-bedrock-runtime, openai, groq-sdk, …)
 *   5. a raw inference endpoint URL literal
 *      (api.anthropic.com/v1/messages, bedrock-runtime.*.amazonaws.com, …)
 *   6. statically detectable access to `callClaudeMessages` through a namespace
 *      binding: `ns.callClaudeMessages`, `ns["callClaudeMessages"]` with a
 *      literal key, and `const { callClaudeMessages } = ns` destructuring,
 *      where `ns` came from `import * as ns`, `const ns = require(...)`, or
 *      `const ns = await import(...)`
 *
 * INDIRECT BARREL RE-EXPORTS — how the chain is closed:
 *   A chain like `app file -> barrel -> messages.ts` is prevented WITHOUT
 *   cross-file graph traversal: every file in the tree is scanned, so the
 *   barrel itself is flagged at its own re-export/import site (rules 1–3).
 *   A barrel that re-exports raw transport cannot exist in a green tree, so no
 *   file can reach transport through one. This is still only a per-file
 *   STRUCTURAL claim — the guard does not build a module graph and does not
 *   claim data-flow tracking.
 *
 * STATIC-DETECTABILITY LIMITS (stated so nobody over-claims this guard):
 *   Computed access with a non-literal key (`ns[someVar]`), re-aliased
 *   namespaces (`const y = ns; y.callClaudeMessages`), and `eval`-style access
 *   are NOT detected by rule 6. They are mitigated upstream: obtaining a
 *   namespace over the transport module at all is already a violation (rule 2),
 *   so rule 6 only needs to catch namespaces obtained from OTHER modules that
 *   might surface the symbol. Identifier shadowing of a namespace binding may
 *   produce a false positive; that is an accepted fail-closed trade-off.
 *
 * WHY AST, NOT REGEX: a regex over source text misses re-exports, `import type`
 * (which is a false positive, not a real transport path), dynamic `import()`,
 * CommonJS `require()`, aliased named imports (`import { callClaudeMessages as x }`),
 * and multi-line import lists. This walks the real TypeScript AST so each of
 * those is classified correctly. The behaviour is proven by a committed fixture
 * suite (scripts/guardrails/fixtures/ai-transport-boundary/) exercised by
 * scripts/guardrails/ai-transport-import-boundary.test.mjs, which also mutation-
 * tests each new detection rule (removing a rule's code block must un-catch its
 * fixture — see the MUTATION:BEGIN/END markers below).
 *
 * ALLOWLIST IS EXACT FILES, NOT A DIRECTORY: a whole-directory exemption would
 * let any new file dropped into lib/claude-api/ reach raw transport for free.
 * Only the specific adapter files that legitimately compose transport are
 * exempt; a new file in that directory is scanned like any other.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, posix, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// TypeScript ships CJS; createRequire gives a bulletproof default import.
const ts = require("typescript");

const ROOT = resolve(process.cwd());

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * PERMANENT adapter files: the transport definition plus the exact per-provider
 * clients. These remain allowlisted after the AI control-plane migration
 * (joined then by the sealed control-plane executor, and by adapters generated
 * from the canonical provider registry once E0 exists). aws-sigv4 / google-oauth
 * import NEITHER transport nor providers, so they are intentionally NOT listed
 * (they never trip the rule and must not be granted a standing exemption).
 */
export const PERMANENT_ADAPTER_ALLOWLIST = new Set([
  "apps/web/lib/claude-api/messages.ts",
  "apps/web/lib/claude-api/providers/bedrock.ts",
  "apps/web/lib/claude-api/providers/vertex.ts",
  "apps/web/lib/claude-api/providers/cerebras.ts",
  // The sealed AI control-plane's own EXACT per-provider dispatch adapters
  // (directive §9.3, wave5): one provider route = one adapter = one
  // sanctioned transport module, reachable only through the sealed executor
  // (apps/web/lib/ai-control-plane/internal.ts, §8.2-guarded) — never from
  // arbitrary application code. This is the "sealed control-plane executor"
  // join anticipated by the comment above, now that the control-plane
  // migration (registry-owned task policy, sealed executor, invocation/
  // attempt ledger, atomic budgets) has landed.
  "apps/web/lib/ai-control-plane/dispatch.ts",
]);

/**
 * TRANSITIONAL_ALLOWLIST — legacy dispatch surfaces that may reach raw
 * transport ONLY until the AI control-plane migration completes.
 *
 * FLIP CONDITION (do not flip yet — this constant is preparation only):
 *   When the control-plane migration is complete (registry-owned task policy,
 *   sealed executor, invocation/attempt ledger, and atomic budgets are merged
 *   and active):
 *     - remove BOTH entries below from this set;
 *     - `callClaude` (provider-dispatch.ts) becomes a compatibility wrapper
 *       over `executeAiTask`, not a competing dispatcher, and therefore no
 *       longer needs raw transport access;
 *     - `free-lane.ts` is absorbed into the control plane or deprecated;
 *     - only PERMANENT_ADAPTER_ALLOWLIST files plus the sealed control-plane
 *       executor may reach transport, and new application code may import only
 *       the public control-plane API.
 *   Until then, behavior is identical to the pre-split allowlist: the live
 *   scan exempts the union of both sets.
 */
export const TRANSITIONAL_ALLOWLIST = new Set([
  "apps/web/lib/claude-api/provider-dispatch.ts",
  "apps/web/lib/claude-api/free-lane.ts",
]);

// Effective allowlist for the live scan = permanent ∪ transitional.
const ADAPTER_ALLOWLIST = new Set([
  ...PERMANENT_ADAPTER_ALLOWLIST,
  ...TRANSITIONAL_ALLOWLIST,
]);

const WHITELIST_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "__tests__",
  "tests",
  "test",
  "_speedtest",
]);

// The raw transport function. Importing the ClaudeMessagesError *class* from the
// same module is legitimate — named imports/re-exports key on this exact symbol.
const RAW_TRANSPORT_SYMBOL = "callClaudeMessages";

// The module that DEFINES the raw transport symbol. Whole-module access forms
// (namespace import, default import, export-star, dynamic import, require) are
// flagged because the module object exposes callClaudeMessages transitively;
// named value imports from it are only flagged when they name the transport
// symbol itself, so ClaudeMessagesError stays importable.
const TRANSPORT_MODULE_RX = /(^|\/)claude-api\/messages(\.[cm]?[jt]sx?)?$/;

// Provider client modules (raw per-provider callers).
const PROVIDER_MODULE_RX = /claude-api\/providers\//;

// Known provider/model vendor SDK packages. Matched exactly or as a package
// subpath (`pkg` or `pkg/...`). Adapters may use these; nobody else may.
const PROVIDER_SDK_PACKAGES = new Set([
  "@anthropic-ai/sdk",
  "@anthropic-ai/bedrock-sdk",
  "@anthropic-ai/vertex-sdk",
  "@aws-sdk/client-bedrock-runtime",
  "@aws-sdk/client-bedrock",
  "@google-cloud/vertexai",
  "@google-cloud/aiplatform",
  "@google/generative-ai",
  "openai",
  "groq-sdk",
  "@cerebras/cerebras_cloud_sdk",
  "ollama",
  "cohere-ai",
]);

// Raw inference endpoint literals (bypass transport entirely by calling the
// vendor HTTP API directly). Complements claude-api-usage.mjs, which only
// covers the Anthropic endpoint.
const ENDPOINT_LITERAL_PATTERNS = [
  /api\.anthropic\.com\/v1\/(messages|complete)/,
  /bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com/,
  /generativelanguage\.googleapis\.com/,
  /aiplatform\.googleapis\.com\/.*:(streamGenerateContent|generateContent|rawPredict|predict)/,
  /api\.groq\.com\/openai/,
  /api\.cerebras\.ai/,
];

function isProviderSdk(spec) {
  if (PROVIDER_SDK_PACKAGES.has(spec)) return true;
  for (const pkg of PROVIDER_SDK_PACKAGES) {
    if (spec.startsWith(pkg + "/")) return true;
  }
  return false;
}

function isTransportModule(spec) {
  return TRANSPORT_MODULE_RX.test(spec);
}

/**
 * Resolve a RELATIVE module specifier against the repo-relative path of the
 * importing file, so `./providers/bedrock` written inside lib/claude-api/ is
 * classified exactly like `@/lib/claude-api/providers/bedrock`. Non-relative
 * specifiers (bare packages, path aliases) are returned unchanged. This is what
 * closes the direct barrel case: a sibling file cannot reach an adapter module
 * through a short relative path that a substring pattern would miss.
 */
function resolveSpecifier(spec, fromNormalizedRelPath) {
  // MUTATION:BEGIN relative-specifier-resolution
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(fromNormalizedRelPath), spec));
  }
  // MUTATION:END relative-specifier-resolution
  return spec;
}

function classifySpecifier(spec, resolved) {
  const label = resolved === spec ? spec : `${spec} -> ${resolved}`;
  if (PROVIDER_MODULE_RX.test(resolved)) {
    return {
      id: "raw-provider-import",
      desc: `raw provider client (${label}) imported outside the adapter allowlist — route through callClaude (provider-dispatch)`,
    };
  }
  if (isProviderSdk(resolved)) {
    return {
      id: "provider-sdk-import",
      desc: `provider vendor SDK (${label}) imported outside the adapter allowlist — route through callClaude (provider-dispatch)`,
    };
  }
  return null;
}

/**
 * Analyze one source file's text and return raw violations. This does NOT apply
 * allowlist/exemption logic — that belongs to the caller (so the fixture suite
 * can assert detection regardless of a fixture's on-disk location). `relPath`
 * is used to resolve relative module specifiers, so callers simulating a repo
 * location must pass the simulated repo-relative path.
 *
 * @returns {Array<{line:number, id:string, desc:string, snippet:string}>}
 */
export function analyzeSource(relPath, text) {
  const normalized = relPath.split(sep).join("/");
  const scriptKind = normalized.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : normalized.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;

  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(normalized, text, ts.ScriptTarget.Latest, true, scriptKind);
  } catch {
    return [];
  }

  const violations = [];
  const lineOf = (node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const snippetOf = (node) => {
    const raw = text.slice(node.getStart(sourceFile), node.getEnd());
    return raw.replace(/\s+/g, " ").trim().slice(0, 200);
  };
  const push = (node, id, desc) =>
    violations.push({ line: lineOf(node), id, desc, snippet: snippetOf(node) });

  const resolveSpec = (spec) => resolveSpecifier(spec, normalized);

  const checkModuleSpecifier = (node, spec, resolved) => {
    const hit = classifySpecifier(spec, resolved);
    if (hit) push(node, hit.id, hit.desc);
  };

  // ---------------------------------------------------------------------------
  // Pre-pass: collect identifiers bound to a whole module namespace, so the
  // main pass can flag statically detectable access to the raw transport symbol
  // through them. Sources: `import * as ns`, `const ns = require(...)`,
  // `const ns = await import(...)`. Import bindings are hoisted, so a single
  // top-down pass over accesses could otherwise miss use-before-declaration.
  // ---------------------------------------------------------------------------
  const namespaceBindings = new Set();
  const collectNamespaceBindings = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      node.importClause.isTypeOnly !== true &&
      node.importClause.namedBindings &&
      ts.isNamespaceImport(node.importClause.namedBindings)
    ) {
      namespaceBindings.add(node.importClause.namedBindings.name.text);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let init = node.initializer;
      if (ts.isAwaitExpression(init)) init = init.expression;
      if (ts.isCallExpression(init)) {
        const isDynamicImport = init.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequireCall = ts.isIdentifier(init.expression) && init.expression.text === "require";
        if (isDynamicImport || isRequireCall) namespaceBindings.add(node.name.text);
      }
    }
    ts.forEachChild(node, collectNamespaceBindings);
  };
  collectNamespaceBindings(sourceFile);

  const visit = (node) => {
    // Statically detectable access to the raw transport symbol through a
    // namespace binding (computed/aliased access). Non-literal keys and
    // re-aliased namespaces are out of static reach — see header.
    // MUTATION:BEGIN transport-namespace-access
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      namespaceBindings.has(node.expression.text) &&
      node.name.text === RAW_TRANSPORT_SYMBOL
    ) {
      push(
        node,
        "raw-transport-namespace-access",
        `raw Claude transport (${RAW_TRANSPORT_SYMBOL}) accessed via namespace binding '${node.expression.text}' outside the adapter allowlist`,
      );
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      namespaceBindings.has(node.expression.text) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === RAW_TRANSPORT_SYMBOL
    ) {
      push(
        node,
        "raw-transport-namespace-access",
        `raw Claude transport (${RAW_TRANSPORT_SYMBOL}) accessed via computed key on namespace binding '${node.expression.text}' outside the adapter allowlist`,
      );
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      namespaceBindings.has(node.initializer.text)
    ) {
      for (const el of node.name.elements) {
        const source = el.propertyName ?? el.name;
        const sourceName =
          ts.isIdentifier(source) || ts.isStringLiteralLike(source) ? source.text : undefined;
        if (sourceName === RAW_TRANSPORT_SYMBOL) {
          push(
            el,
            "raw-transport-namespace-access",
            `raw Claude transport (${RAW_TRANSPORT_SYMBOL}) destructured from namespace binding '${node.initializer.text}' outside the adapter allowlist`,
          );
        }
      }
    }
    // MUTATION:END transport-namespace-access

    // Static import declarations.
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      // `import type ...` is a compile-time-only reference; it cannot issue a
      // runtime transport call, so it is never a violation.
      const typeOnlyDecl = clause?.isTypeOnly === true;
      if (!typeOnlyDecl) {
        const resolved = resolveSpec(spec);
        checkModuleSpecifier(node, spec, resolved);
        const named = clause?.namedBindings;
        // MUTATION:BEGIN transport-namespace-import
        if (named && ts.isNamespaceImport(named) && isTransportModule(resolved)) {
          push(
            node,
            "raw-transport-namespace-import",
            `namespace import of the raw transport module (${spec}) outside the adapter allowlist — the namespace object exposes ${RAW_TRANSPORT_SYMBOL}`,
          );
        }
        // MUTATION:END transport-namespace-import
        // MUTATION:BEGIN transport-default-import
        if (clause?.name && isTransportModule(resolved)) {
          push(
            node,
            "raw-transport-default-import",
            `default import of the raw transport module (${spec}) outside the adapter allowlist — under interop the default binding can expose the module object incl. ${RAW_TRANSPORT_SYMBOL}`,
          );
        }
        // MUTATION:END transport-default-import
        if (named && ts.isNamedImports(named)) {
          for (const el of named.elements) {
            if (el.isTypeOnly) continue; // `import { type callClaudeMessages }`
            const importedName = (el.propertyName ?? el.name).text; // handles aliasing
            if (importedName === RAW_TRANSPORT_SYMBOL) {
              push(
                el,
                "raw-transport-import",
                `raw Claude transport (${RAW_TRANSPORT_SYMBOL}) imported outside the adapter allowlist — route through callClaude (provider-dispatch) so cost policy can be enforced`,
              );
            }
          }
        }
      }
    }

    // Re-exports: `export { x } from '...'` / `export * from '...'` /
    // `export * as ns from '...'`.
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (!node.isTypeOnly) {
        const resolved = resolveSpec(spec);
        checkModuleSpecifier(node, spec, resolved);
        // MUTATION:BEGIN transport-export-star
        const isStarExport = !node.exportClause || ts.isNamespaceExport(node.exportClause);
        if (isStarExport && isTransportModule(resolved)) {
          push(
            node,
            "raw-transport-export-star",
            `star re-export of the raw transport module (${spec}) outside the adapter allowlist — this re-exports ${RAW_TRANSPORT_SYMBOL} to every downstream importer`,
          );
        }
        // MUTATION:END transport-export-star
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            if (el.isTypeOnly) continue;
            const exportedName = (el.propertyName ?? el.name).text;
            if (exportedName === RAW_TRANSPORT_SYMBOL) {
              push(
                el,
                "raw-transport-reexport",
                `raw Claude transport (${RAW_TRANSPORT_SYMBOL}) re-exported outside the adapter allowlist`,
              );
            }
          }
        }
      }
    }

    // Raw inference endpoint URL in an actual STRING LITERAL (never a comment —
    // walking the AST means comments and docstrings are structurally invisible,
    // which eliminates the false positives a text/regex scan produces on the
    // example URLs documented in adapter comments).
    else if (ts.isStringLiteralLike(node)) {
      for (const rx of ENDPOINT_LITERAL_PATTERNS) {
        if (rx.test(node.text)) {
          push(
            node,
            "raw-endpoint-literal",
            "raw inference endpoint URL referenced outside the adapter allowlist",
          );
          break;
        }
      }
    }

    // Dynamic import() and CommonJS require().
    else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((isDynamicImport || isRequire) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          const spec = arg.text;
          const resolved = resolveSpec(spec);
          const hit = classifySpecifier(spec, resolved);
          if (hit) push(node, hit.id + (isRequire ? "-require" : "-dynamic"), hit.desc);
          // A dynamic import of the transport module can pull callClaudeMessages
          // off the namespace, so flag the messages module specifically here.
          if (isTransportModule(resolved)) {
            push(
              node,
              isRequire ? "raw-transport-require" : "raw-transport-dynamic",
              `dynamic access to the raw transport module (${spec}) outside the adapter allowlist`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return violations;
}

// Sanctioned operator tooling that legitimately calls a vendor endpoint (key
// rotation, deploy-readiness probe). These are NOT application inference paths;
// they are the same operator scripts claude-api-usage.mjs already whitelists.
const OPERATOR_SCRIPT_ALLOWLIST = new Set([
  "scripts/check-deploy-readiness.mjs",
  "scripts/rotate-anthropic-key.mjs",
]);

/** Files exempt from the LIVE repo scan (not from analyzeSource itself). */
export function isExemptFromLiveScan(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (ADAPTER_ALLOWLIST.has(normalized)) return true;
  if (OPERATOR_SCRIPT_ALLOWLIST.has(normalized)) return true;
  if (normalized.startsWith("scripts/guardrails/fixtures/")) return true; // fixtures assert detection in the test
  if (normalized === "scripts/guardrails/ai-transport-import-boundary.mjs") return true; // this file names the patterns
  if (/\.(test|spec)\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(normalized)) return true;
  return false;
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
      if (WHITELIST_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile() && SCAN_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const hits = [];
  let scanned = 0;

  for (const scanDir of SCAN_DIRS) {
    const abs = resolve(ROOT, scanDir);
    let dirStat;
    try {
      dirStat = await stat(abs);
    } catch {
      continue;
    }
    if (!dirStat.isDirectory()) continue;

    const files = await walk(abs);
    for (const file of files) {
      const relPath = relative(ROOT, file).split(sep).join("/");
      if (isExemptFromLiveScan(relPath)) continue;
      scanned++;
      let textContent;
      try {
        textContent = await readFile(file, "utf8");
      } catch {
        continue;
      }
      for (const v of analyzeSource(relPath, textContent)) {
        hits.push({ file: relPath, ...v });
      }
    }
  }

  if (hits.length === 0) {
    console.log(
      "[ai-transport-import-boundary] OK - scanned " +
        scanned +
        " file(s); no raw transport / provider / SDK / endpoint access outside the adapter allowlist.",
    );
    process.exit(0);
  }

  console.error(
    "[ai-transport-import-boundary] FAIL - " +
      hits.length +
      " import-boundary violation(s) across " +
      scanned +
      " scanned file(s):",
  );
  for (const hit of hits) {
    console.error("  " + hit.file + ":" + hit.line + " [" + hit.id + "]");
    console.error("    " + hit.desc);
    console.error("    -> " + hit.snippet);
  }
  process.exit(1);
}

// Only run the scan when invoked directly, so the test can import analyzeSource.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    console.error("[ai-transport-import-boundary] unexpected error:", error);
    process.exit(2);
  });
}
