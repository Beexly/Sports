#!/usr/bin/env node
/**
 * UserPromptSubmit hook: append one line to .claude/command-usage.log when the
 * prompt invokes a slash command (`/name ...`). This is the evidence source for
 * the Phase 1 unit 4 "which commands are actually used" decision in
 * docs/ai/MASTER-PLAN-SONNET-2026-07-21.md — there is no usage telemetry today,
 * so a parking decision made without it would be a guess dressed up as data.
 *
 * Never blocks or fails the session: any error here is swallowed and the hook
 * exits 0, since a broken usage-logger must not break prompt submission.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".claude", "command-usage.log");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

async function main() {
  try {
    const raw = await readStdin();
    const payload = JSON.parse(raw);
    const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
    const match = prompt.trim().match(/^\/([a-zA-Z0-9_-]+)/);
    if (!match) return;
    const command = match[1];
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${new Date().toISOString()}\t${command}\n`, "utf8");
  } catch {
    // Swallow all errors — logging must never block a prompt submission.
  }
}

main();
