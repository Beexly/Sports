#!/usr/bin/env node
/**
 * Client-IP boundary — no route may hand-roll forwarding-header parsing.
 *
 * WHY THIS EXISTS
 * ---------------
 * `apps/web/lib/api/rate-limit.ts` resolves the rate-limit key with `clientIp()`:
 * it prefers platform-set headers and, for `x-forwarded-for`, counts from the
 * RIGHT by TRUSTED_PROXY_HOPS, because every proxy APPENDS the address it saw —
 * so the LEFTMOST entry is whatever the caller chose to send. Five routes
 * (waitlist, contests/enter, cipher/verify, human/roster-availability,
 * intelligence/roster-advice) instead did
 *
 *     headers.get("x-forwarded-for").split(",")[0]
 *
 * which let a caller mint a fresh rate-limit bucket per request by rotating
 * their own header. On /api/waitlist that meant unbounded row insertion AND one
 * outbound Resend welcome email per unique address. The fix was to route all
 * five through `clientIp()`; this guard is what stops a sixth from appearing.
 *
 * THE RULE
 * --------
 * Outside the allowlisted modules below, no TypeScript source may mention a
 * client-forwarding header name at all. Not "may not parse it badly" — may not
 * name it. There is exactly one correct way to obtain a client IP in this app
 * (`clientIp()` from @/lib/api/rate-limit), and a module that never names the
 * header cannot get it wrong.
 *
 *   RULE forwarding-header-literal   a string literal naming one of
 *                                    x-forwarded-for / x-vercel-forwarded-for /
 *                                    x-real-ip (any case) outside the allowlist.
 *   RULE parse-failure               a file the compiler could not parse. Fail
 *                                    closed: never infer "clean" from an
 *                                    unreadable file.
 *
 * Comments are not literals, so prose that mentions the header is fine.
 *
 * ALLOWLIST (the only modules permitted to read these headers directly)
 *   - apps/web/lib/api/rate-limit.ts
 *       The shared helper itself.
 *   - apps/web/lib/community/anonymous-report-handler.ts
 *       Deployment-aware source derivation for anonymous moderation reports:
 *       it needs the raw headers to fail CLOSED off-Vercel (no trusted header
 *       declared → no report accepted), which `clientIp()`'s "anon" fallback
 *       deliberately does not do.
 *   - test files (__tests__/, *.test.*, *.spec.*) and guard fixtures, which
 *     must be able to forge these headers to prove the limits hold.
 *
 * Usage:
 *   node scripts/guardrails/client-ip-boundary.mjs             # repo scan
 *   node scripts/guardrails/client-ip-boundary.mjs --scan-root <dir>
 *     # fixture mode for the guard's own tests: scans <dir> only and does NOT
 *     # apply the test-file/fixture allowlist.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const argv = process.argv.slice(2);
const scanRootFlag = argv.indexOf("--scan-root");
const FIXTURE_MODE = scanRootFlag !== -1;
const ROOT = resolve(process.cwd());
const SCAN_ROOTS = FIXTURE_MODE
  ? [resolve(ROOT, argv[scanRootFlag + 1] ?? ".")]
  : ["apps", "packages", "workers", "scripts"].map((d) => resolve(ROOT, d));

const SCAN_EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", ".git", ".turbo"]);

/** Header names a client can set on the wire, in lowercase. */
const FORWARDING_HEADERS = new Set([
  "x-forwarded-for",
  "x-vercel-forwarded-for",
  "x-real-ip",
]);

/** Modules permitted to name a forwarding header in the default repo scan. */
const ALLOWLIST_FILES = new Set([
  "apps/web/lib/api/rate-limit.ts",
  "apps/web/lib/community/anonymous-report-handler.ts",
]);

function norm(p) {
  return p.split(sep).join("/");
}

function isTestPath(relPath) {
  const n = norm(relPath);
  return (
    n.includes("/__tests__/") ||
    /\.test\.[cm]?tsx?$/.test(n) ||
    /\.spec\.[cm]?tsx?$/.test(n) ||
    n.includes("/fixtures/")
  );
}

function isAllowlisted(relPath) {
  if (FIXTURE_MODE) return false;
  const n = norm(relPath);
  return ALLOWLIST_FILES.has(n) || isTestPath(n);
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
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile() && SCAN_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Scans one source file; returns violations [{rule, line, detail}].
 * Never infers clean from a parse failure (fail closed).
 */
export function scanSource(relPath, text) {
  let source;
  try {
    source = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  } catch (err) {
    return [{ rule: "parse-failure", line: 0, detail: String(err) }];
  }
  if (!source) {
    return [{ rule: "parse-failure", line: 0, detail: "compiler returned no SourceFile" }];
  }

  const violations = [];
  const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node) => {
    // Any string literal (or no-substitution template) naming a forwarding
    // header. Casing is irrelevant on the wire, so compare lowercase.
    if (ts.isStringLiteralLike(node)) {
      const value = node.text.trim().toLowerCase();
      if (FORWARDING_HEADERS.has(value)) {
        violations.push({
          rule: "forwarding-header-literal",
          line: lineOf(node),
          detail: `names the client-forwarding header "${node.text}" — use clientIp(req) from @/lib/api/rate-limit`,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return violations;
}

async function main() {
  const hits = [];
  let scanned = 0;

  for (const rootDir of SCAN_ROOTS) {
    const files = await walk(rootDir);
    for (const file of files) {
      const relPath = norm(relative(ROOT, file));
      if (isAllowlisted(relPath)) continue;
      scanned++;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch (err) {
        hits.push({ file: relPath, rule: "parse-failure", line: 0, detail: String(err) });
        continue;
      }
      // Cheap pre-filter: a file that cannot mention any header name cannot
      // violate; the AST confirms the rest (and skips comments/prose).
      const lowered = text.toLowerCase();
      let mightMention = false;
      for (const header of FORWARDING_HEADERS) {
        if (lowered.includes(header)) {
          mightMention = true;
          break;
        }
      }
      if (!mightMention) continue;
      for (const v of scanSource(relPath, text)) {
        hits.push({ file: relPath, ...v });
      }
    }
  }

  if (hits.length > 0) {
    console.error(`[client-ip-boundary] FAIL — ${hits.length} violation(s):`);
    for (const h of hits) {
      console.error(`  ${h.file}:${h.line} [${h.rule}] ${h.detail}`);
    }
    console.error(
      "\nThe leftmost x-forwarded-for entry is CLIENT-CONTROLLED: a caller who " +
        "sends their own header keeps it at position 0 and mints a fresh " +
        "rate-limit bucket per request. Use clientIp(req) from " +
        "@/lib/api/rate-limit — it prefers platform-set headers, counts XFF from " +
        "the right by TRUSTED_PROXY_HOPS, and falls back to one shared \"anon\" " +
        "bucket (fail closed). If a module genuinely needs the raw header, add " +
        "it to ALLOWLIST_FILES in this guard with a comment saying why.",
    );
    process.exit(1);
  }

  console.log(
    `[client-ip-boundary] OK — scanned ${scanned} files, no hand-rolled forwarding-header parsing outside the shared helper.`,
  );
}

// Only run the scan when invoked directly; the guard's own test imports
// scanSource().
if (process.argv[1] && resolve(process.argv[1]).endsWith("client-ip-boundary.mjs")) {
  main().catch((err) => {
    console.error("[client-ip-boundary] ERROR", err);
    process.exit(1);
  });
}
