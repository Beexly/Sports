import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ALLOWED_HEX_ROOTS = [
  "packages/brand/",
  "docs/",
  "brand-kit/",
  "design-system/",
  "apps/web/lib/brand.ts",
  "apps/web/tailwind.config.ts",
  "apps/web/styles/design-tokens.css",
  "apps/web/styles/pickpilot-kit.css",
  "apps/web/app/opengraph-image.tsx",
  "apps/web/app/auth/signin/page.tsx",
  "apps/web/app/layout.tsx",
  "apps/web/app/page.tsx",
  "apps/web/components/motion/signature-grid.tsx",
  "apps/web/__tests__/",
  "packages/db/prisma/seed.ts",
];
const SCAN_ROOTS = ["apps/web", "packages", "workers", ".github"];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
]);

const bannedPhrases = [
  /\bAI-powered picks\b/i,
  /\bAI sports prediction\b/i,
  /\brisk-free\b/i,
  /\bfree money\b/i,
  /\bguaranteed\b/i,
  /\bcan't lose\b/i,
];

const disallowedFonts = [
  /\bMontserrat\b/i,
  /\bPoppins\b/i,
  /\bRoboto\b/i,
  /\bArial Black\b/i,
];

const ALLOWED_BANNED_PHRASE_ROOTS = [
  "packages/brand/src/voice.ts",
  "packages/brand/src/__tests__/",
  "packages/social-formatters/src/__tests__/",
  "packages/db/prisma/seed.ts",
  "apps/web/__tests__/",
  "apps/web/lib/compliance-scanner/",
  "apps/web/lib/content-engine/",
  "apps/web/lib/studio/templates/",
  "apps/web/lib/trust-claims.ts",
  "apps/web/lib/content-generator.ts",
];

const issues = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === "coverage") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const dot = entry.name.lastIndexOf(".");
    const ext = dot === -1 ? "" : entry.name.slice(dot);
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    scanFile(full);
  }
}

function normalize(path) {
  return path.split(sep).join("/");
}

function isHexAllowed(relPath) {
  const normalized = normalize(relPath);
  return ALLOWED_HEX_ROOTS.some((prefix) => normalized.startsWith(prefix));
}

function isBannedPhraseAllowed(relPath) {
  const normalized = normalize(relPath);
  return ALLOWED_BANNED_PHRASE_ROOTS.some((prefix) => normalized.startsWith(prefix));
}

function scanFile(file) {
  const relPath = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    for (const pattern of bannedPhrases) {
      if (!isBannedPhraseAllowed(relPath) && pattern.test(line)) {
        issues.push(`${relPath}:${lineNo} banned brand phrase: ${pattern}`);
      }
    }
    for (const pattern of disallowedFonts) {
      if (pattern.test(line)) {
        issues.push(`${relPath}:${lineNo} disallowed font: ${pattern}`);
      }
    }
    if (!isHexAllowed(relPath) && /#[0-9a-f]{3,8}\b/i.test(line)) {
      issues.push(`${relPath}:${lineNo} hardcoded hex outside @sports/brand`);
    }
  });
}

for (const root of SCAN_ROOTS) {
  const full = join(ROOT, root);
  try {
    if (statSync(full).isDirectory()) walk(full);
  } catch {
    // Optional roots may not exist in every checkout.
  }
}

if (issues.length > 0) {
  console.error(`[brand-lint] ${issues.length} issue(s) found`);
  for (const issue of issues.slice(0, 120)) console.error(`  - ${issue}`);
  if (issues.length > 120) console.error(`  ... ${issues.length - 120} more`);
  process.exit(1);
}

console.log("[brand-lint] OK - brand enforcement passed");
