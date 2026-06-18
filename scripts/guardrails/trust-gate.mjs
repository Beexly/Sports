#!/usr/bin/env node
/**
 * Trust-gate guardrail.
 *
 * Scans the public-facing surface for banned phrases and prohibited
 * claims that the Trust Claim Registry rejects. Fails the process
 * (exit 1) if any are found.
 *
 * It MUST stay in sync with the BANNED entries of
 * apps/web/lib/trust-claims.ts. The list below is a superset of the
 * registry so this script does not need to parse TypeScript.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

const BANNED_PHRASES = [
  { phrase: "lock", wordBoundary: true, claim: "banned.lock" },
  { phrase: "guaranteed", wordBoundary: false, claim: "banned.guaranteed-outcome" },
  { phrase: "sure thing", wordBoundary: false, claim: "banned.sure-thing" },
  { phrase: "risk-free", wordBoundary: false, claim: "banned.risk-free" },
  { phrase: "risk free", wordBoundary: false, claim: "banned.risk-free-2" },
  { phrase: "riskless", wordBoundary: false, claim: "banned.riskless" },
  { phrase: "easy money", wordBoundary: false, claim: "banned.easy-money" },
  { phrase: "free money", wordBoundary: false, claim: "banned.free-money" },
  { phrase: "can't lose", wordBoundary: false, claim: "banned.cant-lose" },
  { phrase: "cant lose", wordBoundary: false, claim: "banned.cant-lose-2" },
  { phrase: "verified track record", wordBoundary: false, claim: "banned.verified-track-record" },
  { phrase: "thousands of bettors", wordBoundary: false, claim: "banned.thousands-of-bettors" },
  { phrase: "trusted by serious bettors", wordBoundary: false, claim: "banned.trusted-by-serious-bettors" },
  { phrase: "guaranteed profit", wordBoundary: false, claim: "banned.guaranteed-profit" },
  { phrase: "guaranteed roi", wordBoundary: false, claim: "banned.guaranteed-roi" },
  { phrase: "guaranteed winner", wordBoundary: false, claim: "banned.guaranteed-winner" },
  { phrase: "lock of the day", wordBoundary: false, claim: "banned.lock-of-the-day" },
  { phrase: "automatic winner", wordBoundary: false, claim: "banned.automatic-winner" },
  { phrase: "beat the book", wordBoundary: false, claim: "banned.beat-the-book" },
  { phrase: "insider information", wordBoundary: false, claim: "banned.insider-information" },
  { phrase: "profitable system", wordBoundary: false, claim: "banned.profitable-system" },
  { phrase: "no risk", wordBoundary: false, claim: "banned.no-risk" },
  { phrase: "100% chance", wordBoundary: false, claim: "banned.100-percent-chance" },
];

const SCAN_DIRS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "packages",
];

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md"]);

const WHITELIST_PATHS = new Set([
  "apps/web/lib/trust-claims.ts",
  "apps/web/lib/content-engine/templates.ts",
  "apps/web/lib/content/workflow.ts",
  "apps/web/lib/promotions/copy-rules.ts",
  "apps/web/lib/content-generator.ts",
  // Enforcement-policy definition: contains the banned phrases as detection
  // patterns (same rationale as trust-claims.ts above).
  "apps/web/lib/pick-explainer/policy.ts",
  // Content-safety lexicon: contains the banned phrases as detection terms.
  "apps/web/lib/safety/content-safety.ts",
  // Compliance risk scorer: declares the supplemental banned phrases as
  // detection patterns (same rationale as trust-claims.ts / content-safety.ts).
  "apps/web/lib/compliance/risk-scorer.ts",
  "packages/db/prisma/seed.ts",
]);

// "lock" is banned ONLY as betting slang for a guaranteed pick (a lock, lock of
// the day). It has a legitimate TEMPORAL sense — the moment a line locks/closes
// ("at lock", "lock time", "lock→close"). Same false-positive handling intent as
// the word-boundary guard that already exempts block/unlock/clock: we blank the
// safe temporal idioms, then a residual standalone "lock" is still a real hit.
const LOCK_SAFE_CONTEXT =
  /\b(?:at|before|by|after|until|since|the)\s+lock\b|\block\s*(?:time\b|→|->|→)/gi;

const WHITELIST_PREFIXES = [
  "apps/web/lib/compliance-scanner/",
  "apps/web/lib/studio/templates/",
];

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

function shouldSkipDir(name) {
  return WHITELIST_DIRS.has(name);
}

function isWhitelistedFile(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (WHITELIST_PATHS.has(normalized)) return true;
  if (WHITELIST_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (relPath.includes("__tests__")) return true;
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return true;
  if (relPath.endsWith(".spec.ts") || relPath.endsWith(".spec.tsx")) return true;
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
    } else if (entry.isFile()) {
      if (SCAN_EXTS.has(extname(entry.name))) {
        files.push(full);
      }
    }
  }
  return files;
}

function buildRegex(entry) {
  const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return entry.wordBoundary
    ? new RegExp("\\b" + escaped + "\\b", "i")
    : new RegExp(escaped, "i");
}

function lineIsCommentOnly(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("*")) return true;
  if (trimmed.startsWith("/*")) return true;
  if (trimmed.startsWith("#")) return true;
  return false;
}

function scanText(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (const entry of BANNED_PHRASES) {
    const re = buildRegex(entry);
    for (let i = 0; i < lines.length; i++) {
      if (lineIsCommentOnly(lines[i])) continue;
      // For the "lock" slang ban, blank the legitimate temporal idioms first;
      // a residual standalone "lock" (e.g. "a lock", "lock of the day") still hits.
      const subject = entry.claim === "banned.lock" ? lines[i].replace(LOCK_SAFE_CONTEXT, " ") : lines[i];
      if (re.test(subject)) {
        hits.push({
          line: i + 1,
          snippet: lines[i].trim().slice(0, 200),
          claim: entry.claim,
          phrase: entry.phrase,
        });
      }
    }
  }
  return hits;
}

async function main() {
  let allHits = [];
  let scanned = 0;

  for (const scanDir of SCAN_DIRS) {
    const abs = resolve(ROOT, scanDir);
    let s;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
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
      const hits = scanText(text);
      for (const hit of hits) {
        allHits.push({ file: relPath, ...hit });
      }
    }
  }

  if (allHits.length === 0) {
    console.log("[trust-gate] OK - scanned " + scanned + " file(s); no banned phrases.");
    process.exit(0);
  }

  console.error("[trust-gate] FAIL - " + allHits.length + " banned phrase hit(s) across " + scanned + " scanned file(s):");
  for (const h of allHits) {
    console.error("  " + h.file + ":" + h.line + "  [" + h.claim + "]  \"" + h.snippet + "\"");
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("[trust-gate] unexpected error:", err);
  process.exit(2);
});
