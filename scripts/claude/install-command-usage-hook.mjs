#!/usr/bin/env node
/**
 * One-time, per-machine, opt-in installer for command-usage telemetry.
 *
 * This repo deliberately never commits .claude/settings.json (see .gitignore:
 * ".claude/* / !.claude/commands/") — settings are local-only by convention.
 * So the UserPromptSubmit hook that logs slash-command usage (log-command-usage.mjs)
 * can't just ship pre-wired in a committed settings.json; each machine that wants
 * the data opts in by running this once:
 *
 *   node scripts/claude/install-command-usage-hook.mjs
 *
 * It merges the hook into the local .claude/settings.json (creating the file if
 * absent) without touching any other keys already there. Safe to re-run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SETTINGS_PATH = join(REPO_ROOT, ".claude", "settings.json");
const HOOK_COMMAND = "node scripts/claude/log-command-usage.mjs";

function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    throw new Error(
      `${SETTINGS_PATH} exists but is not valid JSON — fix or remove it before running this installer.`,
    );
  }
}

function hookAlreadyInstalled(settings) {
  const entries = settings?.hooks?.UserPromptSubmit;
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) =>
    Array.isArray(entry?.hooks) && entry.hooks.some((h) => h?.command === HOOK_COMMAND),
  );
}

function main() {
  const settings = loadSettings();
  if (hookAlreadyInstalled(settings)) {
    console.log(`Already installed in ${SETTINGS_PATH} — nothing to do.`);
    return;
  }

  settings.hooks ??= {};
  settings.hooks.UserPromptSubmit ??= [];
  settings.hooks.UserPromptSubmit.push({
    hooks: [{ type: "command", command: HOOK_COMMAND }],
  });

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n", "utf8");
  console.log(`Installed command-usage hook into ${SETTINGS_PATH} (local-only, never committed).`);
  console.log("Usage will be logged to .claude/command-usage.log — also local-only, gitignored.");
}

main();
