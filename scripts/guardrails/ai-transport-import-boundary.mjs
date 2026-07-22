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
 *      (defined in apps/web/lib/claude-api/messages.ts)
 *   2. importing / re-exporting from a raw provider client module
 *      (apps/web/lib/claude-api/providers/*)
 *   3. importing a known provider/model vendor SDK package directly
 *      (@anthropic-ai/sdk, @aws-sdk/client-bedrock-runtime, openai, groq-sdk, …)
 *   4. a raw inference endpoint URL literal
 *      (api.anthropic.com/v1/messages, bedrock-runtime.*.amazonaws.com, …)
 *
 * WHY AST, NOT REGEX: a regex over source text misses re-exports, `import type`
 * (which is a false positive, not a real transport path), dynamic `import()`,
 * CommonJS `require()`, aliased named imports (`import { callClaudeMessages as x }`),
 * and multi-line import lists. This walks the real TypeScript AST so each of
 * those is classified correctly. The behaviour is proven by a committed fixture
 * suite (scripts/guardrails/fixtures/ai-transport-boundary/) exercised by
 * scripts/guardrails/ai-transport-import-boundary.test.mjs.
 *
 * ALLOWLIST IS EXACT FILES, NOT A DIRECTORY: a whole-directory exemption would
 * let any new file dropped into lib/claude-api/ reach raw transport for free.
 * Only the specific adapter files that legitimately compose transport are
 * exempt; a new file in that directory is scanned like any other.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// TypeScript ships CJS; createRequire gives a bulletproof default import.
const ts = require("typescript");

const ROOT = resolve(process.cwd());

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// EXACT adapter files permitted to import raw transport / provider clients.
// These are the only files that legitimately compose the transport layer:
// messages.ts defines it; provider-dispatch and free-lane fan out to providers;
// the three provider clients call the transport. aws-sigv4 / google-oauth import
// NEITHER transport nor providers, so they are intentionally NOT listed (they
// never trip the rule and must not be granted a standing exemption).
const ADAPTER_ALLOWLIST = new Set([
  "apps/web/lib/claude-api/messages.ts",
  "apps/web/lib/claude-api/provider-dispatch.ts",
  "apps/web/lib/claude-api/free-lane.ts",
  "apps/web/lib/claude-api/providers/bedrock.ts",
  "apps/web/lib/claude-api/providers/vertex.ts",
  "apps/web/lib/claude-api/providers/cerebras.ts",
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
// same module is legitimate — we key on this exact symbol, never the module path.
const RAW_TRANSPORT_SYMBOL = "callClaudeMessages";

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

function classifySpecifier(spec) {
  if (PROVIDER_MODULE_RX.test(spec)) {
    return {
      id: "raw-provider-import",
      desc: `raw provider client (${spec}) imported outside the adapter allowlist — route through callClaude (provider-dispatch)`,
    };
  }
  if (isProviderSdk(spec)) {
    return {
      id: "provider-sdk-import",
      desc: `provider vendor SDK (${spec}) imported outside the adapter allowlist — route through callClaude (provider-dispatch)`,
    };
  }
  return null;
}

/**
 * Analyze one source file's text and return raw violations. This does NOT apply
 * allowlist/exemption logic — that belongs to the caller (so the fixture suite
 * can assert detection regardless of a fixture's on-disk location).
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

  const checkModuleSpecifier = (node, spec) => {
    const hit = classifySpecifier(spec);
    if (hit) push(node, hit.id, hit.desc);
  };

  const visit = (node) => {
    // Static import declarations.
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      // `import type ...` is a compile-time-only reference; it cannot issue a
      // runtime transport call, so it is never a violation.
      const typeOnlyDecl = clause?.isTypeOnly === true;
      if (!typeOnlyDecl) {
        checkModuleSpecifier(node, spec);
        const named = clause?.namedBindings;
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

    // Re-exports: `export { x } from '...'` / `export * from '...'`.
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (!node.isTypeOnly) {
        checkModuleSpecifier(node, spec);
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
          const hit = classifySpecifier(spec);
          if (hit) push(node, hit.id + (isRequire ? "-require" : "-dynamic"), hit.desc);
          // A dynamic import of the transport module can pull callClaudeMessages
          // off the namespace, so flag the messages module specifically here.
          if (/claude-api\/messages(\.js|\.ts)?$/.test(spec)) {
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
