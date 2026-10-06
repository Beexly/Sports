#!/usr/bin/env node
// Read-only scanner for safety-check.md check 1 (destructive DB operations in normal flows).
// Prints file:line evidence. Exits 0 always (report tool, not a build gate).
// --selftest proves each rule can fire, so a future zero is a real zero.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// SQL DDL/DML rules are CASE-SENSITIVE on purpose: an earlier revision used /i and matched
// Tailwind's `truncate` utility class 157 times in JSX, burying the real signal. SQL keywords in
// this repo are uppercase; a lowercase variant is handled by the .sql-file-only rule below.
const RULES = [
  // name, regex, scope note
  { name: "prisma-raw-unsafe", re: /\$executeRawUnsafe|\$queryRawUnsafe|\$executeRaw\b/ },
  { name: "ddl-truncate-drop", re: /\bTRUNCATE\b|\bDROP\s+TABLE\b|\bDROP\s+DATABASE\b|\bDELETE\s+FROM\b(?![\s\S]{0,80}\bwhere\b)/ },
  // Same intent, case-insensitive, but ONLY for real SQL files.
  { name: "ddl-sql-file", re: /\btruncate\b|\bdrop\s+(table|database)\b|\bdelete\s+from\b/i, only: (f) => f.endsWith(".sql") },
  { name: "unbounded-deleteMany", re: /\.deleteMany\(\s*\{\s*\}\s*\)/ },
  { name: "unbounded-updateMany", re: /\.updateMany\(\s*\{\s*\}\s*\)/ },
  { name: "unbounded-delete", re: /\.delete\(\s*\{\s*\}\s*\)/ },
  { name: "prisma-reset", re: /prisma\s+migrate\s+reset|--force-reset|db:\s*push[^\n]*--accept-data-loss/ },
];

// Production scope = anything that is not a test file.
const isTest = (p) => /(__tests__|\.test\.|\.spec\.|__mocks__|guardrails\/.*\.test\.)/.test(p);

function scan(files) {
  const hits = [];
  for (const f of files) {
    let src;
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const r of RULES) {
        if (r.only && !r.only(f)) continue;
        r.re.lastIndex = 0;
        if (r.re.test(line)) {
          hits.push({ file: f, line: i + 1, rule: r.name, test: isTest(f), text: line.trim().slice(0, 160) });
        }
      }
    });
  }
  return hits;
}

if (process.argv.includes("--selftest")) {
  const specimen = `await db.$executeRawUnsafe(\`DROP TABLE x\`); await db.deleteMany({}); await db.updateMany({}); await db.delete({}); // prisma migrate reset`;
  const got = new Set(
    RULES.filter((r) => { r.re.lastIndex = 0; return r.re.test(specimen); }).map((r) => r.name)
  );
  const expected = new Set(RULES.map((r) => r.name));
  const missed = [...expected].filter((e) => !got.has(e));
  console.log(missed.length === 0 ? "SELFTEST PASS: all 6 rules fire" : "SELFTEST FAIL: " + missed.join(", "));
  process.exit(missed.length === 0 ? 0 : 1);
}

const files = execSync(
  'git ls-files "*.ts" "*.tsx" "*.js" "*.mjs" "*.sql"',
  { encoding: "utf8", maxBuffer: 1 << 28 }
).split("\n").filter(Boolean);

const hits = scan(files);
const prod = hits.filter((h) => !h.test);
const test = hits.filter((h) => h.test);

console.log(`scanned ${files.length} tracked files`);
console.log(`PRODUCTION hits: ${prod.length}`);
for (const h of prod) console.log(`  ${h.file}:${h.line} [${h.rule}] ${h.text}`);
console.log(`TEST-FILE hits (out of scope for "normal flows"): ${test.length}`);
for (const h of test) console.log(`  ${h.file}:${h.line} [${h.rule}] ${h.text}`);
