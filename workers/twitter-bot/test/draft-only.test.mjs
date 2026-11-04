/**
 * Governed Dispatch Gate test for X/Twitter Bot publishing paths.
 *
 * Verifies:
 * 1. The Governed Dispatch Gate allows publishing scripts under scripts/ that require
 *    explicit dry-run checks or MUSE_X_PUBLISH_APPROVED=true.
 * 2. Ungoverned scripts touching the transport without dry-run or environment approval are rejected.
 * 3. Core engine (apps/, packages/) remains strictly forbidden from reaching the transport.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

function evaluateGovernedDispatch(path, text) {
  const reachesTransport =
    text.includes("workers/twitter-bot") ||
    /from\s+["'][^"']*workers\/twitter-bot\//.test(text) ||
    /require\(\s*["'][^"']*workers\/twitter-bot\//.test(text) ||
    /(?:^|["'`/\s])x-client(?:\.js)?["'`]/.test(text) ||
    /require\(\s*["'][^"']*\/[x]-client(?:\.js)?["']/.test(text) ||
    /from\s+["'][^"']*twitter-bot\/sender(\.js)?["']/.test(text) ||
    /require\(\s*["'][^"']*twitter-bot\/sender(\.js)?["']/.test(text);

  if (!reachesTransport) return { allowed: true, reason: "does not reach transport" };

  if (path.startsWith("scripts/")) {
    const isGoverned =
      text.includes("MUSE_X_PUBLISH_APPROVED") ||
      /\b(?:dryRun|dry-run|--dry-run|isDryRun)\b/i.test(text);

    if (isGoverned) {
      return { allowed: true, reason: "governed script" };
    }
    return {
      allowed: false,
      reason: "ungoverned script: missing MUSE_X_PUBLISH_APPROVED or dry-run check",
    };
  }

  return { allowed: false, reason: "forbidden engine/app importer" };
}

test("Governed Dispatch Gate permits scripts with dryRun flag or MUSE_X_PUBLISH_APPROVED", () => {
  const governedWithDryRun = `
    const { TwitterSender } = require("workers/twitter-bot/sender.js");
    const isDryRun = process.argv.includes("--dry-run");
  `;
  assert.equal(evaluateGovernedDispatch("scripts/ops/publish.js", governedWithDryRun).allowed, true);

  const governedWithEnv = `
    import { TwitterSender } from "../../workers/twitter-bot/sender.js";
    if (process.env.MUSE_X_PUBLISH_APPROVED !== "true") process.exit(1);
  `;
  assert.equal(evaluateGovernedDispatch("scripts/ops/publish.js", governedWithEnv).allowed, true);
});

test("Governed Dispatch Gate rejects ungoverned scripts without approval/dry-run checks", () => {
  const ungoverned = `
    const { TwitterSender } = require("workers/twitter-bot/sender.js");
    new TwitterSender().send({ text: "Hello", idempotencyKey: "123" });
  `;
  const evalResult = evaluateGovernedDispatch("scripts/ops/publish.js", ungoverned);
  assert.equal(evalResult.allowed, false);
  assert.ok(evalResult.reason.includes("ungoverned script"));
});

test("Core engine (apps/, packages/) cannot import workers/twitter-bot under any condition", () => {
  const codeInApp = `
    import { XClient } from "workers/twitter-bot/x-client.js";
    const dryRun = true;
  `;
  const evalResult = evaluateGovernedDispatch("apps/web/lib/bad-importer.ts", codeInApp);
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.reason, "forbidden engine/app importer");
});

test("The repository currently has zero ungoverned transport importers", () => {
  const listed = execFileSync("git", ["ls-files", "apps", "packages", "scripts", ".github"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  const violations = [];
  for (const rel of listed.split("\n")) {
    const path = rel.trim();
    if (!path || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) continue;
    if (path.startsWith("workers/twitter-bot/")) continue;
    if (path === "scripts/guardrails/draft-only.mjs") continue;
    if (path === "scripts/guardrails/draft-only.test.mjs") continue;

    let text;
    try {
      text = readFileSync(resolve(ROOT, path), "utf8");
    } catch {
      continue;
    }

    const res = evaluateGovernedDispatch(path, text);
    if (!res.allowed) {
      violations.push(`${path}: ${res.reason}`);
    }
  }

  assert.deepEqual(violations, []);
});
