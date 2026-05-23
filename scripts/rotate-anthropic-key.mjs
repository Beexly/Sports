#!/usr/bin/env node
/**
 * Anthropic key rotation helper.
 *
 * The Admin API does NOT publicly expose key creation — new keys must be
 * minted in the Console. What this script CAN do:
 *   1. Verify a new key works by pinging /v1/messages with a 1-token message.
 *   2. Write the verified key to .env.production.local (overwriting the
 *      existing ANTHROPIC_API_KEY line, never duplicating).
 *   3. Optionally disable the old key by ID via the Admin API.
 *
 * Usage:
 *   1. Go to https://console.anthropic.com → API keys → Create key.
 *      Copy the new sk-ant-... value (shown ONCE).
 *
 *   2. Run with env vars set in your shell (NOT in chat):
 *
 *      Windows (cmd):
 *        set NEW_ANTHROPIC_API_KEY=sk-ant-...
 *        node scripts/rotate-anthropic-key.mjs
 *
 *      PowerShell:
 *        $env:NEW_ANTHROPIC_API_KEY = "sk-ant-..."
 *        node scripts/rotate-anthropic-key.mjs
 *
 *   3. Optionally, to also disable the old key in one shot:
 *        set ANTHROPIC_ADMIN_API_KEY=sk-ant-admin01-...
 *        set OLD_ANTHROPIC_API_KEY_ID=apikey_...
 *        node scripts/rotate-anthropic-key.mjs
 *
 *      (Find OLD_ANTHROPIC_API_KEY_ID via GET /v1/organizations/api_keys —
 *       this script will list them for you if ANTHROPIC_ADMIN_API_KEY is
 *       set and OLD_ANTHROPIC_API_KEY_ID is not.)
 *
 *   4. After it succeeds, push to Vercel:
 *        vercel.cmd env rm ANTHROPIC_API_KEY production
 *        vercel.cmd env add ANTHROPIC_API_KEY production
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envFile = join(repoRoot, ".env.production.local");

const COLOR = process.stdout.isTTY
  ? { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m" }
  : { reset: "", red: "", green: "", yellow: "", cyan: "", dim: "" };

const ok = (m) => console.log(`  ${COLOR.green}✓${COLOR.reset} ${m}`);
const bad = (m) => console.log(`  ${COLOR.red}✗${COLOR.reset} ${m}`);
const warn = (m) => console.log(`  ${COLOR.yellow}!${COLOR.reset} ${m}`);
const head = (m) => console.log(`\n${COLOR.cyan}${m}${COLOR.reset}`);

const NEW_KEY = process.env.NEW_ANTHROPIC_API_KEY;
const ADMIN_KEY = process.env.ANTHROPIC_ADMIN_API_KEY;
const OLD_ID = process.env.OLD_ANTHROPIC_API_KEY_ID;

if (!NEW_KEY) {
  console.error(
    `${COLOR.red}Error:${COLOR.reset} NEW_ANTHROPIC_API_KEY env var not set.\n` +
    `Mint a new key at https://console.anthropic.com and set it before running.`
  );
  process.exit(2);
}

if (!NEW_KEY.startsWith("sk-ant-")) {
  console.error(`${COLOR.red}Error:${COLOR.reset} NEW_ANTHROPIC_API_KEY does not look like an Anthropic API key (must start with sk-ant-).`);
  process.exit(2);
}

// ── 1. Verify new key works ────────────────────────────────────────────
head("Verifying new Anthropic API key");

async function verifyKey(key) {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key, maxRetries: 3 });
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, status: 200, body: "ok" };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && typeof err.status === "number") {
      const message = "message" in err && typeof err.message === "string" ? err.message : "(no message)";
      return { ok: false, status: err.status, body: message };
    }
    return { ok: false, status: 0, body: err && err.message ? err.message : String(err) };
  }
}

const verify = await verifyKey(NEW_KEY);
if (!verify.ok) {
  bad(`New key failed verification: HTTP ${verify.status}`);
  console.error(verify.body.slice(0, 500));
  process.exit(1);
}
ok(`New key verified (HTTP ${verify.status})`);

// ── 2. Write to .env.production.local ──────────────────────────────────
head("Updating .env.production.local");

let envText = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
const lines = envText.split(/\r?\n/);
let replaced = false;
const next = lines.map((line) => {
  if (line.startsWith("ANTHROPIC_API_KEY=")) {
    replaced = true;
    return `ANTHROPIC_API_KEY=${NEW_KEY}`;
  }
  return line;
});
if (!replaced) next.push(`ANTHROPIC_API_KEY=${NEW_KEY}`);
writeFileSync(envFile, next.join("\n"), { encoding: "utf8" });
ok(`${replaced ? "Replaced" : "Appended"} ANTHROPIC_API_KEY in .env.production.local`);

// ── 3. (Optional) Disable old key via Admin API ────────────────────────
if (ADMIN_KEY) {
  head("Admin API — old key cleanup");

  let oldId = OLD_ID;
  if (!oldId) {
    // List keys so the operator can identify the failing one
    try {
      const listRes = await fetch("https://api.anthropic.com/v1/organizations/api_keys", {
        headers: {
          "x-api-key": ADMIN_KEY,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!listRes.ok) {
        bad(`Admin list failed: HTTP ${listRes.status}`);
      } else {
        const body = await listRes.json();
        warn("OLD_ANTHROPIC_API_KEY_ID not set; here are the keys this admin token can see:");
        for (const k of body.data ?? []) {
          console.log(`    ${k.id}  ${k.status.padEnd(8)}  ${k.partial_key_hint ?? "?"}  ${k.name ?? ""}`);
        }
        console.log(
          `\n  Set ${COLOR.cyan}OLD_ANTHROPIC_API_KEY_ID${COLOR.reset} to the apikey_... id of the failing key and re-run.`
        );
      }
    } catch (err) {
      bad(`Admin list error: ${err.message}`);
    }
  } else {
    try {
      const disableRes = await fetch(
        `https://api.anthropic.com/v1/organizations/api_keys/${oldId}`,
        {
          method: "POST",
          headers: {
            "x-api-key": ADMIN_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({ status: "inactive" }),
        }
      );
      if (disableRes.ok) {
        ok(`Old key ${oldId} marked inactive`);
      } else {
        bad(`Admin disable failed: HTTP ${disableRes.status} — ${await disableRes.text()}`);
      }
    } catch (err) {
      bad(`Admin disable error: ${err.message}`);
    }
  }
} else {
  warn("Skipping Admin API cleanup (ANTHROPIC_ADMIN_API_KEY not set). You can disable the old key in the Console.");
}

// ── 4. Next steps ──────────────────────────────────────────────────────
head("Next steps");
console.log(`  Push the new key to Vercel Production:\n`);
console.log(`    vercel.cmd env rm ANTHROPIC_API_KEY production`);
console.log(`    vercel.cmd env add ANTHROPIC_API_KEY production\n`);
console.log(`  Then re-run: ${COLOR.cyan}npm.cmd run deploy:ready${COLOR.reset}`);
