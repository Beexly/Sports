#!/usr/bin/env node
/**
 * Draft-only guardrail.
 *
 * Fails CI if any API / page / lib / worker file performs a publish-side
 * write -- i.e. writes `publishedAt`, flips a content row to
 * `status: "PUBLISHED"` inside a Prisma write payload, or wires up a
 * social/email/SMS/webhook send path that the engine could trigger.
 *
 * Read-side filters (e.g. `where: { status: "PUBLISHED" }` to surface
 * already-published rows) are explicitly NOT flagged -- the read side
 * is the legitimate way to render a manually-published row.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

const SCAN_DIRS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "workers",
  "packages",
];

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const WHITELIST_FILES = new Set([
  "packages/db/prisma/schema.prisma",
  "packages/db/prisma/seed.ts",
  "scripts/guardrails/draft-only.mjs",
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

function shouldSkipDir(name) {
  return WHITELIST_DIRS.has(name);
}

function isWhitelistedFile(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (WHITELIST_FILES.has(normalized)) return true;
  if (normalized.includes("__tests__")) return true;
  if (normalized.endsWith(".test.ts") || normalized.endsWith(".test.tsx")) return true;
  if (normalized.endsWith(".spec.ts") || normalized.endsWith(".spec.tsx")) return true;
  if (normalized.endsWith(".prisma")) return true;
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

function annotateContext(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const stack = [];
  let braceDepth = 0;
  let inBlockComment = false;

  for (const line of lines) {
    let stripped = "";
    let code = "";
    let i = 0;
    let inSD = false;
    let inSS = false;
    let inSB = false;
    let lineComment = false;
    while (i < line.length) {
      const c = line[i];
      const c2 = line[i + 1];
      if (lineComment) break;
      if (inBlockComment) {
        if (c === "*" && c2 === "/") {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      if (inSD) {
        if (c === "\\") {
          code += line[i] + (line[i + 1] ?? "");
          stripped += "  ";
          i += 2;
          continue;
        }
        if (c === '"') inSD = false;
        code += c;
        stripped += " ";
        i++;
        continue;
      }
      if (inSS) {
        if (c === "\\") {
          code += line[i] + (line[i + 1] ?? "");
          stripped += "  ";
          i += 2;
          continue;
        }
        if (c === "'") inSS = false;
        code += c;
        stripped += " ";
        i++;
        continue;
      }
      if (inSB) {
        if (c === "\\") {
          code += line[i] + (line[i + 1] ?? "");
          stripped += "  ";
          i += 2;
          continue;
        }
        if (c === "`") inSB = false;
        code += c;
        stripped += " ";
        i++;
        continue;
      }
      if (c === "/" && c2 === "/") { lineComment = true; i += 2; continue; }
      if (c === "/" && c2 === "*") { inBlockComment = true; i += 2; continue; }
      if (c === '"') { inSD = true; code += c; stripped += " "; i++; continue; }
      if (c === "'") { inSS = true; code += c; stripped += " "; i++; continue; }
      if (c === "`") { inSB = true; code += c; stripped += " "; i++; continue; }
      stripped += c;
      code += c;
      i++;
    }

    const opens = [];
    const reWhere = /\bwhere\s*:\s*\{/g;
    const reData = /\bdata\s*:\s*\{/g;
    let m;
    while ((m = reWhere.exec(stripped))) {
      const braceOffset = stripped.slice(m.index).indexOf("{");
      opens.push({ idx: m.index + braceOffset, kind: "where" });
    }
    while ((m = reData.exec(stripped))) {
      const braceOffset = stripped.slice(m.index).indexOf("{");
      opens.push({ idx: m.index + braceOffset, kind: "data" });
    }
    opens.sort((a, b) => a.idx - b.idx);

    let lineHasWhere = stack.some((s) => s.kind === "where");
    let lineHasData = stack.some((s) => s.kind === "data");
    let openIdx = 0;
    for (let j = 0; j < stripped.length; j++) {
      const ch = stripped[j];
      while (openIdx < opens.length && j === opens[openIdx].idx) {
        stack.push({ kind: opens[openIdx].kind, depth: braceDepth });
        if (opens[openIdx].kind === "where") lineHasWhere = true;
        if (opens[openIdx].kind === "data") lineHasData = true;
        openIdx++;
      }
      if (ch === "{") braceDepth++;
      else if (ch === "}") {
        braceDepth--;
        while (stack.length > 0 && stack[stack.length - 1].depth >= braceDepth) {
          stack.pop();
        }
        lineHasWhere = stack.some((s) => s.kind === "where");
        lineHasData = stack.some((s) => s.kind === "data");
      }
    }

    out.push({ line, code, inWhere: lineHasWhere, inData: lineHasData });
  }

  return out;
}

const ALWAYS_FORBIDDEN = [
  { id: "publishedAt-new-date", rx: /publishedAt\s*:\s*new\s+Date\s*\(/, desc: "publishedAt: new Date(...)" },
  { id: "publishedAt-assignment", rx: /publishedAt\s*=\s*new\s+Date\s*\(/, desc: "publishedAt = new Date(...)" },
  { id: "publishedAt-now", rx: /publishedAt\s*:\s*[A-Za-z_$][\w$]*\.now\s*\(/, desc: "publishedAt: X.now()" },
  { id: "set-published", rx: /\b(setPublished|markPublished|publishDraft)\s*\(/, desc: "publish helper invocation" },
  { id: "autopublish-true", rx: /\bautoPublish\s*[:=]\s*true\b/i, desc: "autoPublish: true" },
  { id: "publishnow-call", rx: /\bpublishNow\s*\(/, desc: "publishNow(...)" },
  { id: "sendgrid", rx: /\bsendgrid\b|@sendgrid\/mail/i, desc: "SendGrid integration" },
  { id: "mailgun", rx: /\bmailgun\b/i, desc: "Mailgun integration" },
  { id: "nodemailer", rx: /nodemailer\.createTransport|nodemailer\.createTestAccount/, desc: "Nodemailer transport" },
  { id: "resend", rx: /from\s+["']resend["']|require\(\s*["']resend["']\s*\)/, desc: "Resend SDK import" },
  { id: "twilio", rx: /from\s+["']twilio["']|require\(\s*["']twilio["']\s*\)/, desc: "Twilio SDK import" },
  { id: "discord-webhook", rx: /discord\.com\/api\/webhooks|discordWebhook\(/i, desc: "Discord webhook" },
  { id: "slack-webhook", rx: /hooks\.slack\.com\/services|slackPost\(/i, desc: "Slack webhook" },
  { id: "twitter-api", rx: /api\.twitter\.com|twitterPost\(|\btweet\s*\(/i, desc: "Twitter/X API" },
];

const DATA_ONLY_FORBIDDEN = [
  { id: "data-status-published", rx: /status\s*:\s*["']PUBLISHED["']/, desc: "data block status PUBLISHED" },
  { id: "data-publishedat-set", rx: /publishedAt\s*:\s*(?!null\b)[^,}\s]/, desc: "data block publishedAt non-null" },
];

async function main() {
  const hits = [];
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
      const annotated = annotateContext(text);
      for (let i = 0; i < annotated.length; i++) {
        const { line, code, inWhere, inData } = annotated[i];
        for (const p of ALWAYS_FORBIDDEN) {
          if (!p.rx.test(code)) continue;
          if (inWhere && p.id.startsWith("publishedAt")) continue;
          hits.push({ file: relPath, line: i + 1, pattern: p.id, desc: p.desc, snippet: line.trim().slice(0, 200) });
        }
        if (inData && !inWhere) {
          for (const p of DATA_ONLY_FORBIDDEN) {
            if (!p.rx.test(code)) continue;
            hits.push({ file: relPath, line: i + 1, pattern: p.id, desc: p.desc, snippet: line.trim().slice(0, 200) });
          }
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log("[draft-only] OK - scanned " + scanned + " file(s); no publish/send paths.");
    process.exit(0);
  }

  console.error("[draft-only] FAIL - " + hits.length + " forbidden pattern hit(s) across " + scanned + " scanned file(s):");
  for (const h of hits) {
    console.error("  " + h.file + ":" + h.line + "  [" + h.pattern + "]");
    console.error("    " + h.desc);
    console.error("    -> " + h.snippet);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("[draft-only] unexpected error:", err);
  process.exit(2);
});
