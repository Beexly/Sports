import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const BANNED = [
  { id: "BS-SCAN-01", re: /\bguaranteed\b/i },
  { id: "BS-SCAN-02", re: /100%\s+win/i },
  { id: "BS-SCAN-03", re: /\bnever\s+lose\b/i },
  { id: "BS-SCAN-04", re: /\balways\s+profitable\b/i },
  { id: "BS-SCAN-05", re: /\bcertified\s+accurate\b/i },
  { id: "BS-SCAN-06", re: /\bproven\s+picks\b/i },
  { id: "BS-SCAN-07", re: /\bour\s+picks\s+win\b/i },
  { id: "BS-SCAN-08", re: /\block\s+of\s+the\s+(week|day|night)/i },
  { id: "BS-SCAN-09", re: /\bsure\s+thing\b/i },
  { id: "BS-SCAN-10", re: /\bcan't\s+lose\b/i },
  { id: "BS-SCAN-11", re: /\bfree\s+money\b/i },
  { id: "BS-SCAN-12", re: /\beat\s+the\s+book\b/i },
];

/**
 * Attempt to load extra patterns from docs/brand-safety-rules-v2.md.
 * Extracts table rows matching `| BS-00\d | ...Pattern... |`.
 * Never throws — returns [] on any failure.
 *
 * @param {string} rootDir
 * @returns {Promise<Array<{id: string, re: RegExp}>>}
 */
async function loadDocPatterns(rootDir) {
  try {
    const docPath = path.join(rootDir, "docs", "brand-safety-rules-v2.md");
    const content = await fs.readFile(docPath, "utf8");
    const results = [];
    // Match table rows like: | BS-001 | `pattern` | ...
    const rowRe = /^\|\s*(BS-00\d)\s*\|\s*`([^`]+)`\s*\|/gm;
    let m;
    while ((m = rowRe.exec(content)) !== null) {
      const id = m[1];
      const patternStr = m[2];
      try {
        results.push({ id, re: new RegExp(patternStr, "i") });
      } catch {
        // Invalid regex — skip this row
      }
    }
    return results;
  } catch {
    return [];
  }
}

const SKIP_PATTERNS = ["__tests__/", ".test.ts", ".test.tsx", ".next/", "node_modules/"];

const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts", ".mdx"]);

/**
 * Recursively walk a directory, yielding file paths.
 *
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

/**
 * Scan the public surface of the web app for brand voice violations.
 *
 * @param {string} rootDir
 * @returns {Promise<Array<{file: string, line: number, match: string, ruleId: string}>>}
 */
export async function scanPublicSurface(rootDir) {
  const docPatterns = await loadDocPatterns(rootDir);
  const allPatterns = [...BANNED, ...docPatterns];

  const scanDirs = [
    path.join(rootDir, "apps", "web", "app"),
    path.join(rootDir, "apps", "web", "components"),
  ];

  /** @type {Array<{file: string, line: number, match: string, ruleId: string}>} */
  const violations = [];

  for (const scanDir of scanDirs) {
    for await (const filePath of walk(scanDir)) {
      const ext = path.extname(filePath);
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      // Check skip patterns against the full path (using forward slashes for consistency)
      const normalizedPath = filePath.replace(/\\/g, "/");
      const shouldSkip = SKIP_PATTERNS.some((pattern) =>
        normalizedPath.includes(pattern)
      );
      if (shouldSkip) continue;

      let content;
      try {
        content = await fs.readFile(filePath, "utf8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        for (const { id, re } of allPatterns) {
          const matched = lineText.match(re);
          if (matched) {
            violations.push({
              file: filePath,
              line: i + 1,
              match: matched[0],
              ruleId: id,
            });
          }
        }
      }
    }
  }

  return violations;
}

// Run as main module
const currentFile = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] === currentFile ||
  path.resolve(process.argv[1]) === path.resolve(currentFile);

if (isMain) {
  const rootDir = path.resolve(path.dirname(currentFile), "..", "..");
  const violations = await scanPublicSurface(rootDir);

  if (violations.length === 0) {
    console.log("No brand voice violations found.");
    process.exit(0);
  }

  for (const v of violations) {
    const relFile = path.relative(rootDir, v.file);
    console.log(`VIOLATION [${v.ruleId}]: ${relFile}:${v.line} — "${v.match}"`);
  }
  process.exit(1);
}
