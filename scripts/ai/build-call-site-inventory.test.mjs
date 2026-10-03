/**
 * Fixture suite for the deterministic AI call-site inventory scanner.
 * Run: node --test scripts/ai/build-call-site-inventory.test.mjs
 * (npm alias: test:ai-call-sites)
 *
 * Fixtures live in scripts/ai/fixtures/call-site-inventory/ and are analyzed
 * under SIMULATED repo-relative paths (analyzeFile takes the path as a
 * parameter), so audience/task-class heuristics can be exercised for app,
 * lib, and worker locations from a single fixture directory. The raw
 * transport fixtures are inline template strings here: committed .ts files
 * importing the raw transport symbol would trip the transport-boundary guard
 * in a merged tree, and this suite must never weaken that guard.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ADAPTER_LAYER_FILES,
  CallSiteParseError,
  analyzeFile,
  buildInventory,
  classifyMigrationRisk,
  contentHashOf,
  isExcludedFromScan,
  renderMarkdown,
  stableStringify,
} from "./build-call-site-inventory.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "fixtures", "call-site-inventory");

function fixture(name) {
  return readFileSync(join(fixturesRoot, name), "utf8");
}

/* ------------------------------------------------------------------ */
/* Detection: imports and calls                                        */
/* ------------------------------------------------------------------ */

test("dispatch call with surface literal is detected and fully mapped", () => {
  const analysis = analyzeFile("apps/web/lib/journal/claude.ts", fixture("dispatch-call.ts"));
  assert.equal(analysis.calls.length, 1);
  const call = analysis.calls[0];
  assert.equal(call.symbol, "callClaude");
  assert.equal(call.via, "named-import");
  assert.equal(call.enclosingCaller, "draftJournalEntry");
  assert.equal(call.callerExported, true);
  assert.equal(call.surfaceLiteral, "journal");

  const inventory = buildInventory([analysis]);
  const row = inventory.findings.callSites[0];
  assert.equal(row.taskClass.value, "journal");
  assert.equal(row.taskClass.basis, "surface-literal");
  assert.equal(row.audience, "internal-lib");
  assert.equal(row.inputSource, "caller-arguments");
  assert.equal(row.validation.present, false);
  assert.equal(row.migrationRisk.level, "MED");
  assert.equal(row.migrationRisk.ruleId, "unvalidated-internal");
  assert.equal(row.volume, "UNKNOWN_STATIC");
  assert.equal(row.cost, "UNKNOWN_STATIC");
});

test("aliased import maps the call back to the canonical symbol", () => {
  const analysis = analyzeFile("apps/web/lib/tools/alias.ts", fixture("alias-call.ts"));
  assert.equal(analysis.calls.length, 1);
  assert.equal(analysis.calls[0].symbol, "callClaude");
  assert.equal(analysis.calls[0].localName, "invoke");
  assert.equal(analysis.calls[0].enclosingCaller, "runAliasedCall");
  assert.equal(analysis.calls[0].callerExported, true);
});

test("zod import flips the validation heuristic and lowers migration risk", () => {
  const analysis = analyzeFile("apps/web/lib/tools/validated.ts", fixture("zod-validated.ts"));
  const inventory = buildInventory([analysis]);
  const row = inventory.findings.callSites[0];
  assert.equal(row.validation.present, true);
  assert.match(row.validation.evidence, /zod/);
  assert.equal(row.migrationRisk.level, "LOW");
  assert.equal(row.migrationRisk.ruleId, "validated-internal");
});

test("error-class-only import from messages is recorded but NOT transport-reaching", () => {
  const analysis = analyzeFile("apps/web/lib/tools/errors.ts", fixture("error-only.ts"));
  assert.equal(analysis.calls.length, 0);
  assert.equal(analysis.imports.length, 1);
  const imp = analysis.imports[0];
  assert.equal(imp.moduleId, "raw-transport(messages)");
  assert.equal(imp.errorOnly, true);
  assert.equal(imp.transportReaching, false);
});

test("executeAiTask (control-plane executor) usage is inventoried", () => {
  const analysis = analyzeFile("apps/web/lib/tools/governed.ts", fixture("control-plane-call.ts"));
  assert.equal(analysis.calls.length, 1);
  assert.equal(analysis.calls[0].symbol, "executeAiTask");
  assert.equal(analysis.imports[0].moduleId, "control-plane-executor");
});

test("dynamic import + namespace access call is detected", () => {
  const analysis = analyzeFile("apps/web/lib/tools/lazy.ts", fixture("dynamic-dispatch.ts"));
  assert.equal(analysis.imports.length, 1);
  assert.equal(analysis.imports[0].importKind, "dynamic-import");
  assert.equal(analysis.imports[0].wholeModule, true);
  assert.equal(analysis.calls.length, 1);
  assert.equal(analysis.calls[0].symbol, "callClaude");
  assert.equal(analysis.calls[0].via, "namespace-access");
});

test("free-lane and internal-llm entrypoints are detected", () => {
  const freeLane = analyzeFile("apps/web/lib/brief/free.ts", fixture("free-lane-call.ts"));
  assert.equal(freeLane.calls[0].symbol, "generateContentMessages");
  assert.equal(freeLane.calls[0].surfaceLiteral, "brief");

  const internal = analyzeFile("workers/data-refresh/normalize.ts", fixture("internal-llm-call.ts"));
  assert.equal(internal.calls[0].symbol, "callInternalLlm");
  const inventory = buildInventory([internal]);
  assert.equal(inventory.findings.callSites[0].audience, "internal-worker");
});

/* ------------------------------------------------------------------ */
/* Raw transport (inline sources: committed .ts offenders would trip   */
/* the transport-boundary guard in a merged tree)                      */
/* ------------------------------------------------------------------ */

const RAW_NAMED_IMPORT_SRC = [
  'import { callClaudeMessages } from "@/lib/claude-api/messages";',
  "export async function direct(apiKey: string): Promise<string> {",
  '  const r = await callClaudeMessages({ apiKey, system: "s", user: "u", maxTokens: 8 });',
  "  return r.text;",
  "}",
].join("\n");

test("raw transport named import + call is detected and graded HIGH", () => {
  const analysis = analyzeFile("apps/web/lib/rogue/direct.ts", RAW_NAMED_IMPORT_SRC);
  assert.equal(analysis.imports[0].moduleId, "raw-transport(messages)");
  assert.equal(analysis.imports[0].transportReaching, true);
  assert.equal(analysis.calls[0].symbol, "callClaudeMessages");

  const inventory = buildInventory([analysis]);
  const row = inventory.findings.callSites[0];
  assert.equal(row.migrationRisk.level, "HIGH");
  assert.equal(row.migrationRisk.ruleId, "raw-transport-reach");
});

const RAW_NAMESPACE_IMPORT_SRC = [
  'import * as transport from "@/lib/claude-api/messages";',
  "export async function viaNamespace(apiKey: string): Promise<string> {",
  '  const r = await transport.callClaudeMessages({ apiKey, system: "s", user: "u", maxTokens: 8 });',
  "  return r.text;",
  "}",
].join("\n");

test("namespace import of the messages module is whole-module transport reach", () => {
  const analysis = analyzeFile("apps/web/lib/rogue/ns.ts", RAW_NAMESPACE_IMPORT_SRC);
  assert.equal(analysis.imports[0].wholeModule, true);
  assert.equal(analysis.imports[0].transportReaching, true);
  assert.equal(analysis.calls.length, 1);
  assert.equal(analysis.calls[0].via, "namespace-access");
});

const RAW_PROVIDER_IMPORT_SRC = [
  'import { callBedrockClaudeMessages } from "@/lib/claude-api/providers/bedrock";',
  "export async function rogueProvider(): Promise<void> {",
  '  await callBedrockClaudeMessages({ anthropicModelId: "m", system: "s", user: "u", maxTokens: 8 }, {});',
  "}",
].join("\n");

test("raw provider module import is detected and graded HIGH", () => {
  const analysis = analyzeFile("apps/web/lib/rogue/provider.ts", RAW_PROVIDER_IMPORT_SRC);
  assert.equal(analysis.imports[0].moduleId, "raw-provider");
  assert.equal(analysis.imports[0].transportReaching, true);
  const inventory = buildInventory([analysis]);
  assert.equal(inventory.findings.callSites[0].migrationRisk.ruleId, "raw-transport-reach");
});

test("type-only import of the transport symbol is not transport-reaching", () => {
  const src = 'import type { ClaudeMessagesRequest } from "@/lib/claude-api/messages";\nexport type X = ClaudeMessagesRequest;';
  const analysis = analyzeFile("apps/web/lib/tools/types.ts", src);
  assert.equal(analysis.imports.length, 0);
  assert.equal(analysis.calls.length, 0);
});

/* ------------------------------------------------------------------ */
/* Heuristic classification edges                                      */
/* ------------------------------------------------------------------ */

test("user-facing app-router path without validation grades HIGH", () => {
  const analysis = analyzeFile("apps/web/app/api/demo/route.ts", fixture("dispatch-call.ts"));
  const inventory = buildInventory([analysis]);
  const row = inventory.findings.callSites[0];
  assert.equal(row.audience, "user-facing");
  assert.equal(row.inputSource, "http-request-derived");
  assert.equal(row.migrationRisk.level, "HIGH");
  assert.equal(row.migrationRisk.ruleId, "user-facing-unvalidated");
});

test("user-facing app-router path WITH validation grades MED", () => {
  const analysis = analyzeFile("apps/web/app/api/demo/route.ts", fixture("zod-validated.ts"));
  const inventory = buildInventory([analysis]);
  const row = inventory.findings.callSites[0];
  assert.equal(row.migrationRisk.level, "MED");
  assert.equal(row.migrationRisk.ruleId, "user-facing");
});

test("task class falls back to module-path mapping, then to unknown", () => {
  const fromPath = buildInventory([analyzeFile("apps/web/lib/studio/gen.ts", fixture("alias-call.ts"))]);
  assert.equal(fromPath.findings.callSites[0].taskClass.value, "studio");
  assert.equal(fromPath.findings.callSites[0].taskClass.basis, "module-path");

  const unknown = buildInventory([analyzeFile("apps/web/lib/misc/helper.ts", fixture("alias-call.ts"))]);
  assert.equal(unknown.findings.callSites[0].taskClass.value, "unknown");
  assert.equal(unknown.findings.callSites[0].taskClass.basis, "none");
});

test("migration-risk rules are total (every row classifies)", () => {
  for (const audience of ["user-facing", "internal-lib", "internal-worker", "internal-script", "internal-other"]) {
    for (const present of [true, false]) {
      for (const raw of [true, false]) {
        const { level, ruleId } = classifyMigrationRisk({
          audience,
          validation: { present },
          rawTransportReach: raw,
        });
        assert.ok(["HIGH", "MED", "LOW"].includes(level), `${audience}/${present}/${raw} -> ${level}`);
        assert.ok(ruleId.length > 0);
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* Determinism + fail-closed                                           */
/* ------------------------------------------------------------------ */

test("inventory output is byte-deterministic across runs and input order", () => {
  const analyses = [
    analyzeFile("apps/web/lib/journal/claude.ts", fixture("dispatch-call.ts")),
    analyzeFile("apps/web/lib/tools/validated.ts", fixture("zod-validated.ts")),
    analyzeFile("workers/data-refresh/normalize.ts", fixture("internal-llm-call.ts")),
  ];
  const a = buildInventory(analyses);
  const b = buildInventory([...analyses].reverse());
  assert.equal(stableStringify(a, 2), stableStringify(b, 2));
  assert.equal(contentHashOf(a), contentHashOf(b));
  const md1 = renderMarkdown(a, contentHashOf(a));
  const md2 = renderMarkdown(b, contentHashOf(b));
  assert.equal(md1, md2);
});

test("content hash changes when a finding changes", () => {
  const base = buildInventory([analyzeFile("apps/web/lib/journal/claude.ts", fixture("dispatch-call.ts"))]);
  const other = buildInventory([analyzeFile("apps/web/lib/studio/claude.ts", fixture("dispatch-call.ts"))]);
  assert.notEqual(contentHashOf(base), contentHashOf(other));
});

test("unparseable source fails closed with CallSiteParseError", () => {
  assert.throws(
    () => analyzeFile("apps/web/lib/broken.ts", "const = = ) {"),
    (error) => error instanceof CallSiteParseError,
  );
});

test("unparsed files land in the hashed payload and flip complete:false", () => {
  const analysis = analyzeFile("apps/web/lib/journal/claude.ts", fixture("dispatch-call.ts"));
  const completeInv = buildInventory([analysis]);
  assert.equal(completeInv.complete, true);
  assert.deepEqual(completeInv.unparsedFiles, []);

  const unparsed = [{ file: "packages/broken.ts", reason: "Expression expected.", textProbe: "raw text matches no AI surface pattern (best-effort, not proof)" }];
  const incompleteInv = buildInventory([analysis], unparsed);
  assert.equal(incompleteInv.complete, false);
  assert.equal(incompleteInv.unparsedFiles.length, 1);
  // The gap is part of the hashed payload: hashes must differ.
  assert.notEqual(contentHashOf(completeInv), contentHashOf(incompleteInv));
  const md = renderMarkdown(incompleteInv, contentHashOf(incompleteInv));
  assert.ok(md.includes("INCOMPLETE"));
  assert.ok(md.includes("packages/broken.ts"));
});

test("markdown report embeds the content hash and the stated heuristics", () => {
  const inventory = buildInventory([analyzeFile("apps/web/lib/journal/claude.ts", fixture("dispatch-call.ts"))]);
  const hash = contentHashOf(inventory);
  const md = renderMarkdown(inventory, hash);
  assert.ok(md.includes(hash));
  assert.ok(md.includes("IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED"));
  assert.ok(md.includes("first match wins"));
  assert.ok(md.includes("UNKNOWN_STATIC"));
});

/* ------------------------------------------------------------------ */
/* Scan-scope discipline                                               */
/* ------------------------------------------------------------------ */

test("adapter layer, tests, and fixtures are excluded from the live scan", () => {
  for (const adapterFile of ADAPTER_LAYER_FILES) {
    assert.equal(isExcludedFromScan(adapterFile), true, adapterFile);
  }
  assert.equal(isExcludedFromScan("apps/web/lib/claude-api/providers/bedrock.ts"), true);
  assert.equal(isExcludedFromScan("apps/web/__tests__/foo.test.ts"), true);
  assert.equal(isExcludedFromScan("scripts/ai/fixtures/call-site-inventory/dispatch-call.ts"), true);
  assert.equal(isExcludedFromScan("apps/web/lib/journal/claude.ts"), false);
  assert.equal(isExcludedFromScan("apps/web/app/api/demo/route.ts"), false);
});
