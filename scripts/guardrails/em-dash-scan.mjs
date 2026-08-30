#!/usr/bin/env node
/**
 * em-dash-scan — brand-voice guardrail.
 *
 * Em-dashes (—) and en-dashes (–) in body copy are a tell that reads as
 * machine-written. The owner-facing copy must use clean punctuation instead
 * (periods, commas, colons, middle-dots for separators). This scans the
 * curated set of user-facing copy sources and fails if either character
 * appears. Title/label separators should use "·", not a dash.
 *
 * Mirrors the trust-gate convention: prints offenders, exits non-zero on a hit.
 * Run from the repo root: `node scripts/guardrails/em-dash-scan.mjs`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Curated user-facing copy. Extend this list as more surfaces are cleaned.
const FILES = [
  "apps/web/lib/fantasy/host.ts",
  "apps/web/lib/fantasy/studio.ts",
  "apps/web/lib/explainers/registry.ts",
  "apps/web/lib/news/wire.ts",
  "apps/web/app/page.tsx",
  "apps/web/app/the-beat/page.tsx",
  "apps/web/app/calibration/page.tsx",
  "apps/web/components/news/galaxy-broadcast.tsx",
  "apps/web/components/news/the-beat.tsx",
];

const root = process.cwd();
const offenders = [];

for (const rel of FILES) {
  let src;
  try {
    src = readFileSync(resolve(root, rel), "utf8");
  } catch {
    continue;
  }
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/[—–]/.test(line)) {
      offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(`[em-dash-scan] FAIL - ${offenders.length} em/en-dash hit(s):`);
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}

console.log(`[em-dash-scan] OK - scanned ${FILES.length} copy file(s); no em/en-dashes.`);
