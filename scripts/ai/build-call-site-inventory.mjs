#!/usr/bin/env node
/**
 * E2 -- Deterministic AI call-site inventory (DORMANT tooling).
 *
 * STATUS: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED. This script changes no
 * production code path; it READS the tree and writes a report artifact.
 *
 * WHAT IT DOES:
 *   AST-scan (TypeScript compiler API, loaded via createRequire from the
 *   repo's own `typescript` -- the same pattern as
 *   scripts/guardrails/ai-transport-import-boundary.mjs on the PR #158
 *   branch) of apps/, packages/,
 *   workers/ and scripts/ for every call site that reaches AI transport:
 *     - imports from the adapter/dispatch modules
 *       (claude-api/messages, provider-dispatch, free-lane, internal-llm,
 *       claude-api/providers/*) and from the control-plane executor
 *       (ai-control-plane -> executeAiTask);
 *     - call expressions of the AI entrypoint symbols
 *       (callClaude, callClaudeMessages, generateContentMessages,
 *       callInternalLlm, executeAiTask), including aliased imports and
 *       statically detectable namespace access.
 *
 *   Each call site is mapped to: file, exported caller, task-class guess,
 *   user-facing vs internal audience, input source, validation presence,
 *   retention notes, and a migration-risk grade. EVERY mapping is a stated,
 *   deterministic heuristic (the exact rules live in the constants below and
 *   are reproduced verbatim in the generated report). Volume and cost are
 *   reported as UNKNOWN_STATIC: they are runtime facts this static scan
 *   cannot know, and this tool does not fabricate them.
 *
 * DETERMINISM CONTRACT:
 *   - stable file ordering, stable row ordering (file, line, symbol);
 *   - no timestamps inside the hashed payload;
 *   - contentHash = sha256 over the canonical (sorted-key) JSON of the
 *     hashed payload; the same tree always produces byte-identical reports;
 *   - fail closed: a source file that fails to parse is NEVER silently
 *     skipped. It lands in `unparsedFiles` (inside the hashed payload, with a
 *     best-effort raw-text AI-pattern check as secondary evidence), the
 *     report is marked `complete: false`, and the process exits non-zero.
 *     The inventory never claims completeness it does not have.
 *
 * OUTPUTS:
 *   reports/ai/call-site-inventory.json
 *   reports/ai/call-site-inventory.md
 *
 * USAGE:
 *   node scripts/ai/build-call-site-inventory.mjs           # write reports
 *   node scripts/ai/build-call-site-inventory.mjs --check   # verify committed
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, posix, relative, resolve, sep } from "node:path";

const require = createRequire(import.meta.url);
// TypeScript ships CJS; createRequire gives a bulletproof default import.
const ts = require("typescript");

export const TOOL_NAME = "ai-call-site-inventory";
export const TOOL_VERSION = "1.0.0";

const ROOT = resolve(process.cwd());
const REPORT_JSON = "reports/ai/call-site-inventory.json";
const REPORT_MD = "reports/ai/call-site-inventory.md";

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "__tests__",
  "tests",
  "test",
  "_speedtest",
  "fixtures",
]);

/**
 * The transport/adapter layer itself is EXCLUDED from the inventory: those
 * files ARE the transport, not call sites reaching it. This mirrors the
 * allowlist of scripts/guardrails/ai-transport-import-boundary.mjs (PR #158
 * branch).
 */
export const ADAPTER_LAYER_FILES = new Set([
  "apps/web/lib/claude-api/messages.ts",
  "apps/web/lib/claude-api/provider-dispatch.ts",
  "apps/web/lib/claude-api/free-lane.ts",
  "apps/web/lib/claude-api/internal-llm.ts",
]);
const ADAPTER_LAYER_PREFIX = "apps/web/lib/claude-api/providers/";

/**
 * AI surface modules: import specifiers (after relative-path resolution)
 * matching one of these reach AI transport. `entrySymbols` are the callable
 * entrypoints; `errorOnlySymbols` are types/error classes whose import alone
 * does NOT constitute transport reach.
 */
export const AI_SURFACE_MODULES = [
  {
    moduleId: "raw-transport(messages)",
    rx: /(^|\/)claude-api\/messages(\.[cm]?[jt]sx?)?$/,
    entrySymbols: ["callClaudeMessages"],
    errorOnlySymbols: ["ClaudeMessagesError"],
  },
  {
    moduleId: "provider-dispatch",
    rx: /(^|\/)claude-api\/provider-dispatch(\.[cm]?[jt]sx?)?$/,
    entrySymbols: ["callClaude"],
    errorOnlySymbols: ["resolveAnthropicModelId"],
  },
  {
    moduleId: "free-lane",
    rx: /(^|\/)claude-api\/free-lane(\.[cm]?[jt]sx?)?$/,
    entrySymbols: ["generateContentMessages"],
    errorOnlySymbols: ["shouldUseFreeLane", "isFreeLaneEnabled", "FREE_LANE_SURFACES"],
  },
  {
    moduleId: "internal-llm",
    rx: /(^|\/)claude-api\/internal-llm(\.[cm]?[jt]sx?)?$/,
    entrySymbols: ["callInternalLlm"],
    errorOnlySymbols: ["internalLlmConfig", "isInternalLlmConfigured", "InternalLlmError"],
  },
  {
    moduleId: "raw-provider",
    rx: /(^|\/)claude-api\/providers\//,
    entrySymbols: ["callBedrockClaudeMessages", "callVertexClaudeMessages", "callCerebrasMessages"],
    errorOnlySymbols: [],
    wholeModuleIsTransport: true,
  },
  {
    moduleId: "control-plane-executor",
    rx: /(^|\/)ai-control-plane(\/(index|execute|executor)(\.[cm]?[jt]sx?)?)?$/,
    entrySymbols: ["executeAiTask"],
    errorOnlySymbols: [],
  },
];

const ALL_ENTRY_SYMBOLS = new Set(AI_SURFACE_MODULES.flatMap((m) => m.entrySymbols));

/* ------------------------------------------------------------------ */
/* Stated heuristics (reproduced verbatim in the generated report)     */
/* ------------------------------------------------------------------ */

export const AUDIENCE_RULES = [
  'path starts with "apps/web/app/" => "user-facing" (Next.js app-router surface)',
  'path starts with "apps/web/lib/" => "internal-lib" (may back user-facing routes; import-graph attribution is out of scope for this static pass)',
  'path starts with "workers/" => "internal-worker"',
  'path starts with "scripts/" => "internal-script"',
  'anything else => "internal-other"',
];

export function classifyAudience(relPath) {
  if (relPath.startsWith("apps/web/app/")) return "user-facing";
  if (relPath.startsWith("apps/web/lib/")) return "internal-lib";
  if (relPath.startsWith("workers/")) return "internal-worker";
  if (relPath.startsWith("scripts/")) return "internal-script";
  return "internal-other";
}

export const TASK_CLASS_RULES = [
  'a statically visible `surface: "<literal>"` property in the call arguments wins (basis "surface-literal")',
  'otherwise the first matching path segment maps: studio=>studio, journal=>journal, calibration-training=>calibration-insight, model-court=>model-court, content-generator|content-engine|content=>content, brief=>brief, pick-explainer=>pick-explainer, loss-autopsy=>loss-autopsy (basis "module-path")',
  'otherwise "unknown" (basis "none") -- never guessed',
];

const TASK_CLASS_PATH_MAP = [
  ["studio", "studio"],
  ["journal", "journal"],
  ["calibration-training", "calibration-insight"],
  ["model-court", "model-court"],
  ["content-generator", "content"],
  ["content-engine", "content"],
  ["content", "content"],
  ["brief", "brief"],
  ["pick-explainer", "pick-explainer"],
  ["loss-autopsy", "loss-autopsy"],
];

export function classifyTaskClass(relPath, surfaceLiteral) {
  if (surfaceLiteral) return { value: surfaceLiteral, basis: "surface-literal" };
  const haystack = relPath.toLowerCase();
  for (const [needle, value] of TASK_CLASS_PATH_MAP) {
    if (haystack.includes(needle)) return { value, basis: "module-path" };
  }
  return { value: "unknown", basis: "none" };
}

export const INPUT_SOURCE_RULES = [
  'path under "apps/web/app/api/" => "http-request-derived" (route handler input)',
  'file imports a db module (@sports/db, @prisma/client, or a specifier containing "/db" or "prisma") => "db-derived+caller-arguments"',
  'otherwise "caller-arguments" (the enclosing function\'s parameters)',
];

export function classifyInputSource(relPath, fileFacts) {
  if (relPath.startsWith("apps/web/app/api/")) return "http-request-derived";
  if (fileFacts.dbImports.length > 0) return "db-derived+caller-arguments";
  return "caller-arguments";
}

export const VALIDATION_RULES = [
  'file imports "zod" => validation present (evidence: zod import)',
  'file imports a module whose specifier contains "schema" => validation present (evidence: schema-module import)',
  "otherwise validation is recorded ABSENT for this file; the heuristic does not inspect callee modules",
];

export function classifyValidation(fileFacts) {
  if (fileFacts.importsZod) return { present: true, evidence: "zod import" };
  if (fileFacts.schemaModuleImports.length > 0) {
    return { present: true, evidence: `schema-module import (${fileFacts.schemaModuleImports.join(", ")})` };
  }
  return { present: false, evidence: "no zod/schema-module import in file" };
}

export const RETENTION_RULES = [
  'file imports claude-api/usage-store => "usage-ledger write available in-file"',
  'file imports claude-api/cost-monitor => adds "budget/cost evaluation in-file"',
  "otherwise: no in-file usage-ledger/budget reference (the call may still be recorded by a caller; cross-file attribution is out of scope)",
];

export function classifyRetention(fileFacts) {
  const notes = [];
  if (fileFacts.usageLedgerImports.length > 0) notes.push("usage-ledger write available in-file");
  if (fileFacts.costMonitorImports.length > 0) notes.push("budget/cost evaluation in-file");
  if (notes.length === 0) notes.push("no in-file usage-ledger/budget reference");
  return notes.join("; ");
}

/**
 * Migration-risk rules, ordered; the FIRST matching rule assigns the level.
 * These grade how risky it is to migrate the call site onto the sealed
 * control plane (E4), not how risky the call site is in production today.
 */
export const MIGRATION_RISK_RULES = [
  {
    ruleId: "raw-transport-reach",
    level: "HIGH",
    description:
      "the file imports the raw transport symbol (callClaudeMessages), a raw provider module, or takes whole-module access to the messages module: it bypasses the sanctioned dispatcher and must be rewired first",
    test: (row) => row.rawTransportReach,
  },
  {
    ruleId: "user-facing-unvalidated",
    level: "HIGH",
    description: "user-facing audience AND no validation evidence in file",
    test: (row) => row.audience === "user-facing" && !row.validation.present,
  },
  {
    ruleId: "user-facing",
    level: "MED",
    description: "user-facing audience (output quality is directly user-visible)",
    test: (row) => row.audience === "user-facing",
  },
  {
    ruleId: "unvalidated-internal",
    level: "MED",
    description: "internal audience with no validation evidence in file",
    test: (row) => !row.validation.present,
  },
  {
    ruleId: "validated-internal",
    level: "LOW",
    description: "internal audience with validation evidence in file",
    test: () => true,
  },
];

export function classifyMigrationRisk(row) {
  for (const rule of MIGRATION_RISK_RULES) {
    if (rule.test(row)) return { level: rule.level, ruleId: rule.ruleId };
  }
  // Unreachable: the last rule always matches. Fail closed anyway.
  throw new Error("migration-risk rules did not classify a row");
}

/* ------------------------------------------------------------------ */
/* AST analysis                                                        */
/* ------------------------------------------------------------------ */

function resolveSpecifier(spec, fromNormalizedRelPath) {
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(fromNormalizedRelPath), spec));
  }
  return spec;
}

function matchSurfaceModule(resolvedSpec) {
  for (const mod of AI_SURFACE_MODULES) {
    if (mod.rx.test(resolvedSpec)) return mod;
  }
  return null;
}

/**
 * Analyze one source file. Pure: takes the (possibly simulated) repo-relative
 * path plus the source text, returns imports/calls/file facts. Throws
 * CallSiteParseError when the file does not parse -- callers must fail closed.
 */
export class CallSiteParseError extends Error {
  constructor(relPath, detail) {
    super(`Failed to parse ${relPath}: ${detail}`);
    this.name = "CallSiteParseError";
    this.relPath = relPath;
  }
}

export function analyzeFile(relPath, text) {
  const normalized = relPath.split(sep).join("/");
  const scriptKind = normalized.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : normalized.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;

  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(normalized, text, ts.ScriptTarget.Latest, true, scriptKind);
  } catch (error) {
    throw new CallSiteParseError(normalized, error instanceof Error ? error.message : String(error));
  }
  const parseDiagnostics = sourceFile.parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    const first = parseDiagnostics[0];
    const message = ts.flattenDiagnosticMessageText(first.messageText, " ");
    throw new CallSiteParseError(normalized, message);
  }

  const lineOf = (node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const imports = [];
  /** local identifier -> canonical entry symbol */
  const entryAliases = new Map();
  /** namespace identifier -> surface module (from import *, require, await import) */
  const namespaceBindings = new Map();

  const fileFacts = {
    importsZod: false,
    schemaModuleImports: [],
    usageLedgerImports: [],
    costMonitorImports: [],
    dbImports: [],
  };

  const recordFileFacts = (spec, resolved) => {
    if (spec === "zod" || spec.startsWith("zod/")) fileFacts.importsZod = true;
    if (/schema/i.test(spec)) fileFacts.schemaModuleImports.push(spec);
    if (/(^|\/)claude-api\/usage-store$/.test(resolved)) fileFacts.usageLedgerImports.push(spec);
    if (/(^|\/)claude-api\/cost-monitor$/.test(resolved)) fileFacts.costMonitorImports.push(spec);
    if (
      spec === "@sports/db" ||
      spec.startsWith("@sports/db/") ||
      spec === "@prisma/client" ||
      /(^|\/)db$/.test(resolved) ||
      /prisma/i.test(spec)
    ) {
      fileFacts.dbImports.push(spec);
    }
  };

  const recordSurfaceImport = ({ node, spec, resolved, mod, kind, symbols, wholeModule }) => {
    const namedEntrySymbols = symbols.filter((s) => mod.entrySymbols.includes(s.imported) && !s.typeOnly);
    const namedValueSymbols = symbols.filter((s) => !s.typeOnly);
    const errorOnly =
      !wholeModule &&
      namedEntrySymbols.length === 0 &&
      (namedValueSymbols.length === 0 ||
        namedValueSymbols.every((s) => mod.errorOnlySymbols.includes(s.imported)));
    const transportReaching =
      !errorOnly && (wholeModule || namedEntrySymbols.length > 0 || namedValueSymbols.length > 0 || mod.wholeModuleIsTransport === true);
    imports.push({
      line: lineOf(node),
      specifier: spec,
      resolvedSpecifier: resolved,
      moduleId: mod.moduleId,
      importKind: kind,
      symbols: symbols.map((s) => ({ imported: s.imported, local: s.local, typeOnly: s.typeOnly })),
      wholeModule,
      errorOnly,
      transportReaching,
    });
    for (const s of namedEntrySymbols) entryAliases.set(s.local, s.imported);
  };

  // Pre-pass: collect namespace bindings over surface modules, so calls via
  // `ns.callClaude(...)` are attributable even before the main visit.
  const collectBindings = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      if (clause && clause.isTypeOnly !== true && clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        const resolved = resolveSpecifier(node.moduleSpecifier.text, normalized);
        const mod = matchSurfaceModule(resolved);
        if (mod) namespaceBindings.set(clause.namedBindings.name.text, mod);
      }
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let init = node.initializer;
      if (ts.isAwaitExpression(init)) init = init.expression;
      if (ts.isCallExpression(init) && init.arguments.length > 0) {
        const isDynamicImport = init.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequireCall = ts.isIdentifier(init.expression) && init.expression.text === "require";
        const arg = init.arguments[0];
        if ((isDynamicImport || isRequireCall) && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
          const resolved = resolveSpecifier(arg.text, normalized);
          const mod = matchSurfaceModule(resolved);
          if (mod) namespaceBindings.set(node.name.text, mod);
        }
      }
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(sourceFile);

  /** Find the closest enclosing named function and whether it is exported. */
  const enclosingCaller = (node) => {
    let current = node;
    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        const exported = (current.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        return { name: current.name.text, exported };
      }
      if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
        return { name: current.name.text, exported: false };
      }
      if (
        (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
        current.parent &&
        ts.isVariableDeclaration(current.parent) &&
        ts.isIdentifier(current.parent.name)
      ) {
        const name = current.parent.name.text;
        let stmt = current.parent.parent;
        while (stmt && !ts.isVariableStatement(stmt)) stmt = stmt.parent;
        const exported = Boolean(
          stmt && (stmt.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
        );
        return { name, exported };
      }
      current = current.parent;
    }
    return { name: "(module scope)", exported: false };
  };

  /** Statically visible `surface: "<literal>"` in the call's argument objects. */
  const surfaceLiteralOf = (callNode) => {
    for (const arg of callNode.arguments) {
      if (!ts.isObjectLiteralExpression(arg)) continue;
      for (const prop of arg.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          ((ts.isIdentifier(prop.name) && prop.name.text === "surface") ||
            (ts.isStringLiteralLike(prop.name) && prop.name.text === "surface")) &&
          ts.isStringLiteralLike(prop.initializer)
        ) {
          return prop.initializer.text;
        }
      }
    }
    return null;
  };

  const calls = [];

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnlyDecl = clause?.isTypeOnly === true;
      const spec = node.moduleSpecifier.text;
      const resolved = resolveSpecifier(spec, normalized);
      recordFileFacts(spec, resolved);
      const mod = matchSurfaceModule(resolved);
      if (mod && !typeOnlyDecl) {
        const symbols = [];
        let wholeModule = false;
        const named = clause?.namedBindings;
        if (named && ts.isNamespaceImport(named)) wholeModule = true;
        if (clause?.name) wholeModule = true; // default import of a surface module
        if (named && ts.isNamedImports(named)) {
          for (const el of named.elements) {
            symbols.push({
              imported: (el.propertyName ?? el.name).text,
              local: el.name.text,
              typeOnly: el.isTypeOnly === true,
            });
          }
        }
        recordSurfaceImport({ node, spec, resolved, mod, kind: "static", symbols, wholeModule });
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const resolved = resolveSpecifier(spec, normalized);
      recordFileFacts(spec, resolved);
      const mod = matchSurfaceModule(resolved);
      if (mod && !node.isTypeOnly) {
        const symbols = [];
        let wholeModule = false;
        if (!node.exportClause || ts.isNamespaceExport(node.exportClause)) wholeModule = true;
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            symbols.push({
              imported: (el.propertyName ?? el.name).text,
              local: el.name.text,
              typeOnly: el.isTypeOnly === true,
            });
          }
        }
        recordSurfaceImport({ node, spec, resolved, mod, kind: "export-from", symbols, wholeModule });
      }
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((isDynamicImport || isRequire) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          const spec = arg.text;
          const resolved = resolveSpecifier(spec, normalized);
          recordFileFacts(spec, resolved);
          const mod = matchSurfaceModule(resolved);
          if (mod) {
            recordSurfaceImport({
              node,
              spec,
              resolved,
              mod,
              kind: isRequire ? "require" : "dynamic-import",
              symbols: [],
              wholeModule: true,
            });
          }
        }
      }

      // Direct/aliased entrypoint call: invoke(...) where invoke aliases an entry symbol.
      if (ts.isIdentifier(node.expression) && entryAliases.has(node.expression.text)) {
        const canonical = entryAliases.get(node.expression.text);
        const caller = enclosingCaller(node);
        calls.push({
          line: lineOf(node),
          symbol: canonical,
          localName: node.expression.text,
          via: "named-import",
          enclosingCaller: caller.name,
          callerExported: caller.exported,
          surfaceLiteral: surfaceLiteralOf(node),
        });
      }

      // Namespace access call: ns.callClaude(...) where ns binds a surface module.
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        namespaceBindings.has(node.expression.expression.text) &&
        ALL_ENTRY_SYMBOLS.has(node.expression.name.text)
      ) {
        const caller = enclosingCaller(node);
        calls.push({
          line: lineOf(node),
          symbol: node.expression.name.text,
          localName: `${node.expression.expression.text}.${node.expression.name.text}`,
          via: "namespace-access",
          enclosingCaller: caller.name,
          callerExported: caller.exported,
          surfaceLiteral: surfaceLiteralOf(node),
        });
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { file: normalized, imports, calls, fileFacts };
}

/* ------------------------------------------------------------------ */
/* Inventory assembly                                                  */
/* ------------------------------------------------------------------ */

export function isExcludedFromScan(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (ADAPTER_LAYER_FILES.has(normalized)) return true;
  if (normalized.startsWith(ADAPTER_LAYER_PREFIX)) return true;
  if (/\.(test|spec)\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(normalized)) return true;
  if (normalized.includes("/fixtures/")) return true;
  return false;
}

/**
 * Deterministic raw-text check used ONLY as secondary evidence for files the
 * AST could not parse. A hit does not prove transport reach and a miss does
 * not prove absence; the file stays an incompleteness fact either way.
 */
export const UNPARSED_TEXT_PROBE = /claude-api|ai-control-plane|callClaude|executeAiTask|callInternalLlm/;

/**
 * Build the inventory from pre-analyzed files. Pure and deterministic:
 * `analyzedFiles` is an array of analyzeFile() results; `unparsedFiles` is
 * the fail-closed list of files the AST scan could not cover.
 */
export function buildInventory(analyzedFiles, unparsedFiles = []) {
  const callSites = [];
  const transportImports = [];

  const sorted = [...analyzedFiles].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  for (const analysis of sorted) {
    const { file, imports, calls, fileFacts } = analysis;
    const rawTransportReach = imports.some(
      (imp) =>
        imp.transportReaching &&
        (imp.moduleId === "raw-transport(messages)" || imp.moduleId === "raw-provider"),
    );
    const audience = classifyAudience(file);
    const validation = classifyValidation(fileFacts);
    const retention = classifyRetention(fileFacts);
    const inputSource = classifyInputSource(file, fileFacts);

    for (const imp of imports) {
      transportImports.push({
        file,
        line: imp.line,
        moduleId: imp.moduleId,
        specifier: imp.specifier,
        importKind: imp.importKind,
        symbols: imp.symbols,
        wholeModule: imp.wholeModule,
        errorOnly: imp.errorOnly,
        transportReaching: imp.transportReaching,
      });
    }

    for (const call of calls) {
      const taskClass = classifyTaskClass(file, call.surfaceLiteral);
      const baseRow = { audience, validation, rawTransportReach };
      const risk = classifyMigrationRisk(baseRow);
      callSites.push({
        file,
        line: call.line,
        symbol: call.symbol,
        localName: call.localName,
        via: call.via,
        exportedCaller: call.enclosingCaller,
        callerExported: call.callerExported,
        taskClass,
        audience,
        inputSource,
        validation,
        retentionNotes: retention,
        volume: "UNKNOWN_STATIC",
        cost: "UNKNOWN_STATIC",
        migrationRisk: risk,
      });
    }
  }

  callSites.sort((a, b) =>
    a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line !== b.line ? a.line - b.line : a.symbol < b.symbol ? -1 : 1,
  );
  transportImports.sort((a, b) =>
    a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line !== b.line ? a.line - b.line : a.specifier < b.specifier ? -1 : 1,
  );

  const riskCounts = { HIGH: 0, MED: 0, LOW: 0 };
  for (const site of callSites) riskCounts[site.migrationRisk.level] += 1;

  const taskClassCounts = {};
  for (const site of callSites) {
    taskClassCounts[site.taskClass.value] = (taskClassCounts[site.taskClass.value] ?? 0) + 1;
  }

  const sortedUnparsed = [...unparsedFiles].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  return {
    tool: { name: TOOL_NAME, version: TOOL_VERSION, typescriptVersion: ts.version },
    draftState: "IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED",
    /** FAIL-CLOSED completeness claim: false whenever any file went unparsed. */
    complete: sortedUnparsed.length === 0,
    ruleset: {
      audience: AUDIENCE_RULES,
      taskClass: TASK_CLASS_RULES,
      inputSource: INPUT_SOURCE_RULES,
      validation: VALIDATION_RULES,
      retention: RETENTION_RULES,
      migrationRisk: MIGRATION_RISK_RULES.map((r) => ({
        ruleId: r.ruleId,
        level: r.level,
        description: r.description,
      })),
      volumeAndCost:
        "UNKNOWN_STATIC by design: volume and cost are runtime-ledger facts; this static scan does not fabricate them",
    },
    scan: {
      scanDirs: SCAN_DIRS,
      excludedAdapterLayer: [...ADAPTER_LAYER_FILES, `${ADAPTER_LAYER_PREFIX}*`],
      exclusionRules: [
        "adapter/transport layer files (they ARE the transport, not call sites)",
        "test/spec files",
        "fixtures directories",
        `skipped directories: ${[...SKIP_DIRS].join(", ")}`,
      ],
    },
    summary: {
      filesWithFindings: new Set([...callSites.map((c) => c.file), ...transportImports.map((i) => i.file)]).size,
      callSiteCount: callSites.length,
      transportImportCount: transportImports.length,
      riskCounts,
      taskClassCounts,
    },
    findings: { callSites, transportImports },
    unparsedFiles: sortedUnparsed,
  };
}

/* ------------------------------------------------------------------ */
/* Canonical JSON + hashing                                            */
/* ------------------------------------------------------------------ */

export function stableStringify(value, indent = 0) {
  const seen = new Set();
  const encode = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) throw new Error("circular structure in report payload");
    seen.add(v);
    if (Array.isArray(v)) {
      const out = v.map(encode);
      seen.delete(v);
      return out;
    }
    const out = {};
    for (const key of Object.keys(v).sort()) {
      out[key] = encode(v[key]);
    }
    seen.delete(v);
    return out;
  };
  return JSON.stringify(encode(value), null, indent > 0 ? indent : undefined);
}

export function contentHashOf(inventory) {
  return createHash("sha256").update(stableStringify(inventory), "utf8").digest("hex");
}

/* ------------------------------------------------------------------ */
/* Markdown rendering                                                  */
/* ------------------------------------------------------------------ */

function mdEscape(text) {
  return String(text).replace(/\|/g, "\\|");
}

export function renderMarkdown(inventory, contentHash) {
  const lines = [];
  lines.push("# AI Call-Site Inventory (deterministic)");
  lines.push("");
  lines.push(`Draft state: ${inventory.draftState}`);
  lines.push("");
  lines.push(
    `Generated by \`${inventory.tool.name}\` v${inventory.tool.version} (TypeScript ${inventory.tool.typescriptVersion}) via \`npm run ai:call-sites\`.`,
  );
  lines.push("");
  lines.push(`Content hash (sha256 of the canonical JSON payload): \`${contentHash}\``);
  lines.push("");
  lines.push(
    "This report is produced by an AST scan, not by model judgment. Every mapping below is a stated deterministic heuristic; the exact rules are listed at the end. Volume and cost columns are UNKNOWN_STATIC by design: they are runtime-ledger facts and are not fabricated here.",
  );
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(
    `- Completeness: ${inventory.complete ? "COMPLETE (every scanned file parsed)" : "INCOMPLETE -- see Unparsed files; the counts below are a lower bound, not a total"}`,
  );
  lines.push(`- Call sites: ${inventory.summary.callSiteCount}`);
  lines.push(`- Transport-surface imports: ${inventory.summary.transportImportCount}`);
  lines.push(`- Files with findings: ${inventory.summary.filesWithFindings}`);
  lines.push(
    `- Migration risk: HIGH ${inventory.summary.riskCounts.HIGH} / MED ${inventory.summary.riskCounts.MED} / LOW ${inventory.summary.riskCounts.LOW}`,
  );
  lines.push("");

  lines.push("## Call sites");
  lines.push("");
  lines.push(
    "| File | Line | Symbol | Exported caller | Task class (basis) | Audience | Input source | Validation | Retention | Risk (rule) |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const site of inventory.findings.callSites) {
    lines.push(
      `| ${mdEscape(site.file)} | ${site.line} | \`${site.symbol}\` | \`${mdEscape(site.exportedCaller)}\`${site.callerExported ? " (exported)" : ""} | ${mdEscape(site.taskClass.value)} (${site.taskClass.basis}) | ${site.audience} | ${site.inputSource} | ${site.validation.present ? "present" : "absent"}: ${mdEscape(site.validation.evidence)} | ${mdEscape(site.retentionNotes)} | ${site.migrationRisk.level} (${site.migrationRisk.ruleId}) |`,
    );
  }
  lines.push("");

  lines.push("## Transport-surface imports");
  lines.push("");
  lines.push("| File | Line | Module | Specifier | Kind | Whole module | Error-only | Transport-reaching |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const imp of inventory.findings.transportImports) {
    lines.push(
      `| ${mdEscape(imp.file)} | ${imp.line} | ${imp.moduleId} | \`${mdEscape(imp.specifier)}\` | ${imp.importKind} | ${imp.wholeModule ? "yes" : "no"} | ${imp.errorOnly ? "yes" : "no"} | ${imp.transportReaching ? "yes" : "no"} |`,
    );
  }
  lines.push("");

  lines.push("## Stated heuristics (verbatim from the scanner constants)");
  lines.push("");
  const section = (title, rules) => {
    lines.push(`### ${title}`);
    lines.push("");
    for (const rule of rules) lines.push(`- ${rule}`);
    lines.push("");
  };
  section("Audience", inventory.ruleset.audience);
  section("Task class", inventory.ruleset.taskClass);
  section("Input source", inventory.ruleset.inputSource);
  section("Validation", inventory.ruleset.validation);
  section("Retention", inventory.ruleset.retention);
  lines.push("### Migration risk (ordered; first match wins)");
  lines.push("");
  for (const rule of inventory.ruleset.migrationRisk) {
    lines.push(`- ${rule.level} \`${rule.ruleId}\`: ${rule.description}`);
  }
  lines.push("");
  lines.push(`### Volume and cost`);
  lines.push("");
  lines.push(`- ${inventory.ruleset.volumeAndCost}`);
  lines.push("");

  lines.push("## Unparsed files (fail-closed incompleteness record)");
  lines.push("");
  if (inventory.unparsedFiles.length === 0) {
    lines.push("None: every scanned file parsed, so the inventory is complete over the stated scan scope.");
  } else {
    lines.push(
      "The AST scan could not parse the files below, so this inventory is INCOMPLETE and the tool exits non-zero. The raw-text probe column is best-effort secondary evidence only; it proves nothing either way.",
    );
    lines.push("");
    lines.push("| File | Reason | Raw-text AI-pattern probe |");
    lines.push("| --- | --- | --- |");
    for (const u of inventory.unparsedFiles) {
      lines.push(`| ${mdEscape(u.file)} | ${mdEscape(u.reason)} | ${mdEscape(u.textProbe)} |`);
    }
  }
  lines.push("");

  lines.push("## Scan scope");
  lines.push("");
  lines.push(`- Scanned directories: ${inventory.scan.scanDirs.join(", ")}`);
  for (const rule of inventory.scan.exclusionRules) lines.push(`- Excluded: ${rule}`);
  lines.push(`- Adapter/transport layer (excluded by design): ${inventory.scan.excludedAdapterLayer.join(", ")}`);
  lines.push("");
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Repo scan driver                                                    */
/* ------------------------------------------------------------------ */

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

export async function scanRepository(rootDir = ROOT) {
  const analyzed = [];
  const unparsed = [];
  let scannedCount = 0;

  for (const scanDir of SCAN_DIRS) {
    const abs = resolve(rootDir, scanDir);
    let dirStat;
    try {
      dirStat = await stat(abs);
    } catch {
      continue;
    }
    if (!dirStat.isDirectory()) continue;

    const files = (await walk(abs)).sort();
    for (const file of files) {
      const relPath = relative(rootDir, file).split(sep).join("/");
      if (isExcludedFromScan(relPath)) continue;
      scannedCount++;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch (error) {
        unparsed.push({
          file: relPath,
          reason: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
          textProbe: "file unreadable; no probe possible",
        });
        continue;
      }
      try {
        const analysis = analyzeFile(relPath, text);
        if (analysis.imports.length > 0 || analysis.calls.length > 0) analyzed.push(analysis);
      } catch (error) {
        if (error instanceof CallSiteParseError) {
          unparsed.push({
            file: relPath,
            reason: error.message,
            textProbe: UNPARSED_TEXT_PROBE.test(text)
              ? "raw text MATCHES an AI surface pattern (manual review required)"
              : "raw text matches no AI surface pattern (best-effort, not proof)",
          });
        } else {
          throw error;
        }
      }
    }
  }

  return { analyzed, unparsed, scannedCount };
}

async function main() {
  const checkMode = process.argv.includes("--check");
  const { analyzed, unparsed, scannedCount } = await scanRepository();

  const inventory = buildInventory(analyzed, unparsed);
  const contentHash = contentHashOf(inventory);
  const jsonBody = stableStringify({ ...inventory, contentHash }, 2) + "\n";
  const mdBody = renderMarkdown(inventory, contentHash);

  // FAIL CLOSED: unparsed files make the inventory a lower bound, never a
  // total. The report still gets written/verified (it RECORDS the gap in the
  // hashed payload), but the process exits non-zero so nothing downstream can
  // treat an incomplete inventory as green.
  const failClosed = () => {
    if (unparsed.length === 0) return;
    console.error(`[${TOOL_NAME}] FAIL-CLOSED - ${unparsed.length} file(s) could not be parsed; inventory is marked complete:false:`);
    for (const u of unparsed) console.error(`  ${u.file}: ${u.reason} [${u.textProbe}]`);
    process.exit(2);
  };

  if (checkMode) {
    let committedJson = null;
    let committedMd = null;
    try {
      committedJson = await readFile(resolve(ROOT, REPORT_JSON), "utf8");
      committedMd = await readFile(resolve(ROOT, REPORT_MD), "utf8");
    } catch {
      console.error(`[${TOOL_NAME}] FAIL - committed reports missing; run: npm run ai:call-sites`);
      process.exit(1);
    }
    if (committedJson !== jsonBody || committedMd !== mdBody) {
      console.error(`[${TOOL_NAME}] FAIL - committed reports are stale; run: npm run ai:call-sites`);
      process.exit(1);
    }
    console.log(`[${TOOL_NAME}] committed reports match the tree (scanned ${scannedCount} file(s); hash ${contentHash.slice(0, 16)}...).`);
    failClosed();
    console.log(`[${TOOL_NAME}] OK - inventory is complete.`);
    return;
  }

  await mkdir(resolve(ROOT, "reports/ai"), { recursive: true });
  await writeFile(resolve(ROOT, REPORT_JSON), jsonBody, "utf8");
  await writeFile(resolve(ROOT, REPORT_MD), mdBody, "utf8");
  console.log(
    `[${TOOL_NAME}] scanned ${scannedCount} file(s); ${inventory.summary.callSiteCount} call site(s), ${inventory.summary.transportImportCount} transport import(s); hash ${contentHash.slice(0, 16)}...`,
  );
  console.log(`[${TOOL_NAME}] wrote ${REPORT_JSON} and ${REPORT_MD}`);
  failClosed();
  console.log(`[${TOOL_NAME}] OK - inventory is complete.`);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[${TOOL_NAME}] unexpected error:`, error);
    process.exit(3);
  });
}
