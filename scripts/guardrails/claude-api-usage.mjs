#!/usr/bin/env node
/**
 * Claude API usage guardrail.
 *
 * Fails CI if new direct Anthropic message calls appear outside the
 * approved budget-aware generation paths or explicit operator scripts.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const WHITELIST_FILES = new Set([
  "apps/web/lib/claude-api/messages.ts",
  "scripts/check-deploy-readiness.mjs",
  "scripts/rotate-anthropic-key.mjs",
  "scripts/guardrails/claude-api-usage.mjs",
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

const FORBIDDEN_PATTERNS = [
  {
    id: "anthropic-messages-url",
    rx: /api\.anthropic\.com\/v1\/messages/,
    desc: "direct Anthropic messages endpoint",
  },
  {
    id: "anthropic-api-key-header",
    rx: /["']x-api-key["']\s*:/,
    desc: "direct Anthropic x-api-key header",
  },
];

function shouldSkipDir(name) {
  return WHITELIST_DIRS.has(name);
}

function isWhitelistedFile(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (WHITELIST_FILES.has(normalized)) return true;
  if (normalized.endsWith(".test.ts") || normalized.endsWith(".test.tsx")) return true;
  if (normalized.endsWith(".spec.ts") || normalized.endsWith(".spec.tsx")) return true;
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
      if (isWhitelistedFile(relPath)) continue;
      scanned++;

      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }

      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (!pattern.rx.test(line)) continue;
          hits.push({
            file: relPath,
            line: i + 1,
            pattern: pattern.id,
            desc: pattern.desc,
            snippet: line.trim().slice(0, 200),
          });
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log("[claude-api-usage] OK - scanned " + scanned + " file(s); no unapproved direct Claude API calls.");
    process.exit(0);
  }

  console.error(
    "[claude-api-usage] FAIL - " +
      hits.length +
      " unapproved Claude API pattern hit(s) across " +
      scanned +
      " scanned file(s):"
  );
  for (const hit of hits) {
    console.error("  " + hit.file + ":" + hit.line + " [" + hit.pattern + "]");
    console.error("    " + hit.desc);
    console.error("    -> " + hit.snippet);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("[claude-api-usage] unexpected error:", error);
  process.exit(2);
});
