#!/usr/bin/env node
/**
 * AI control-plane import-boundary guardrail.
 *
 * ONE canonical AI control plane. Every Claude/LLM call in the product must pass
 * through the cost-policy-enforcing dispatch layer (`callClaude` in
 * `apps/web/lib/claude-api/provider-dispatch.ts`), which reads the budget policy,
 * resolves the cost mode (LLM_COST_MODE), and accounts spend before any paid
 * provider transport fires.
 *
 * This guard fails CI when a file OUTSIDE the adapter directory
 * (`apps/web/lib/claude-api/`) reaches around that dispatch layer to the raw
 * transport, either by:
 *   1. importing the raw transport function `callClaudeMessages` (defined in
 *      `apps/web/lib/claude-api/messages.ts`), or
 *   2. importing a raw provider client under `apps/web/lib/claude-api/providers/`
 *      (bedrock / vertex / cerebras / aws-sigv4 / google-oauth).
 *
 * Either import path would let a caller issue a paid Anthropic-family call that
 * bypasses cost policy — a direct transport bypass, exactly the invariant the
 * control-plane ADR forbids. Importing the `ClaudeMessagesError` *class* from
 * `messages` is legitimate (it is an error type, not the transport), so this
 * guard keys on the imported SYMBOL `callClaudeMessages`, never on the module
 * path alone.
 *
 * The adapter directory itself is the one place the raw transport is composed
 * (provider-dispatch fans out to the provider clients, which call the transport),
 * so files under `apps/web/lib/claude-api/` are exempt by design.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// The adapter boundary: the ONE directory allowed to touch raw transport /
// provider clients. Anything whose normalized path starts with this prefix is
// the control plane itself and is exempt.
const ADAPTER_PREFIX = "apps/web/lib/claude-api/";

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

const FORBIDDEN_PATTERNS = [
  {
    id: "raw-transport-import",
    // `import { callClaudeMessages } from ...` (with or without other named
    // imports, and regardless of quote style / source module). The symbol is
    // what matters — importing ClaudeMessagesError from the same module is fine.
    // The `s`-less multiline tolerance ([\s\S]) lets the brace list span lines,
    // so a multi-line named import can't slip past the guard.
    rx: /\bimport\b[\s\S]*?\{[\s\S]*?\bcallClaudeMessages\b[\s\S]*?\}[\s\S]*?from\s*["'][^"']+["']/,
    // Anchor used only to report the offending line number.
    anchor: /\bcallClaudeMessages\b/,
    desc: "raw Claude transport (callClaudeMessages) imported outside the claude-api adapter — route through callClaude (provider-dispatch) so cost policy is enforced",
  },
  {
    id: "raw-provider-import",
    // Any import from `.../claude-api/providers/<client>` — the low-level
    // per-provider callers that issue paid transport without cost accounting.
    rx: /\bfrom\s*["'][^"']*claude-api\/providers\/[^"']+["']/,
    anchor: /claude-api\/providers\//,
    desc: "raw provider client (claude-api/providers/*) imported outside the claude-api adapter — route through callClaude (provider-dispatch) so cost policy is enforced",
  },
];

function shouldSkipDir(name) {
  return WHITELIST_DIRS.has(name);
}

function isExemptFile(relPath) {
  const normalized = relPath.split(sep).join("/");
  // The adapter directory owns the raw transport; it is exempt by design.
  if (normalized.startsWith(ADAPTER_PREFIX)) return true;
  // Tests may exercise the transport directly.
  if (normalized.endsWith(".test.ts") || normalized.endsWith(".test.tsx")) return true;
  if (normalized.endsWith(".spec.ts") || normalized.endsWith(".spec.tsx")) return true;
  // This guard describes the forbidden patterns in its own source.
  if (normalized === "scripts/guardrails/ai-control-plane-boundary.mjs") return true;
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
      if (shouldSkipDir(entry.name)) continue;
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
      const relPath = relative(ROOT, file);
      if (isExemptFile(relPath)) continue;
      scanned++;

      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }

      const lines = text.split(/\r?\n/);
      for (const pattern of FORBIDDEN_PATTERNS) {
        // Match against the whole file so a multi-line named import is caught.
        if (!pattern.rx.test(text)) continue;
        // Report the first line carrying the anchor symbol/path for a useful location.
        const anchorLine = lines.findIndex((l) => pattern.anchor.test(l));
        const idx = anchorLine >= 0 ? anchorLine : 0;
        hits.push({
          file: relPath.split(sep).join("/"),
          line: idx + 1,
          pattern: pattern.id,
          desc: pattern.desc,
          snippet: (lines[idx] ?? "").trim().slice(0, 200),
        });
      }
    }
  }

  if (hits.length === 0) {
    console.log(
      "[ai-control-plane-boundary] OK - scanned " +
        scanned +
        " file(s); no raw transport / provider imports outside the claude-api adapter.",
    );
    process.exit(0);
  }

  console.error(
    "[ai-control-plane-boundary] FAIL - " +
      hits.length +
      " import-boundary violation(s) across " +
      scanned +
      " scanned file(s):",
  );
  for (const hit of hits) {
    console.error("  " + hit.file + ":" + hit.line + " [" + hit.pattern + "]");
    console.error("    " + hit.desc);
    console.error("    -> " + hit.snippet);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("[ai-control-plane-boundary] unexpected error:", error);
  process.exit(2);
});
