import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * The flag policy: `LIVE_BOARD_GATE_SLATE` must never be switched on in the repo.
 *
 * WHY A TEST AND NOT A CONVENTION. Phase D makes /board/gate capable of reading
 * the live slate. From that moment, a single committed line — an `.env` file, a
 * Dockerfile `ENV`, a CI `env:` block, a `vercel.json` — silently publishes an
 * unverified join on the product's honesty page. Nobody would notice in review,
 * because the line would look like configuration rather than a decision.
 *
 * The flip is a founder action taken in a deploy environment, after real staging
 * counts exist. It is deliberately not expressible in version control, and this
 * test is what makes that true rather than merely intended.
 *
 * WHAT IS ALLOWED. The reader function, its comments and docs, and tests that
 * pass the variable as data. Those are how the flag is implemented and
 * described; none of them turns it on for a deployment. The rule is therefore
 * about ASSIGNMENT in deployable configuration, not about the string appearing.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const FLAG = "LIVE_BOARD_GATE_SLATE";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  ".turbo",
  "build",
  "generated",
]);

/**
 * File kinds where a value assignment would actually reach a deployment. Source
 * and markdown are excluded on purpose — that is where the reader and its
 * documentation live, and banning the string there would force the flag to be
 * undocumented, which is worse.
 */
const CONFIG_EXTS = new Set([".yml", ".yaml", ".json", ".toml", ".sh", ".bash"]);
const CONFIG_BASENAMES = new Set(["Dockerfile", "dockerfile", "Procfile", "Makefile"]);

function isConfigFile(name: string): boolean {
  if (CONFIG_BASENAMES.has(name)) return true;
  if (name.startsWith(".env")) return true;
  const dot = name.lastIndexOf(".");
  return dot > 0 && CONFIG_EXTS.has(name.slice(dot));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue; // broken symlink — nothing deployable there
    }
    if (s.isDirectory()) walk(full, out);
    else if (isConfigFile(entry)) out.push(full);
  }
  return out;
}

/**
 * An assignment that TURNS THE FLAG ON. Matches `=1`, `: "1"`, `=true`, and the
 * quoted variants, in any of the config syntaxes above.
 *
 * Deliberately also matches `=true`: `isLiveGateSlateEnabled` accepts only the
 * exact string `"1"`, so `=true` would NOT actually enable the flag today. It is
 * still banned, because committing it signals intent to enable and would become
 * live the moment someone "fixes" the reader to be more permissive.
 */
const ENABLED_ASSIGNMENT = new RegExp(
  `${FLAG}\\s*[=:]\\s*["']?(1|true|yes|on)["']?`,
  "i",
);

describe("LIVE_BOARD_GATE_SLATE is off by construction", () => {
  const configFiles = walk(REPO_ROOT);

  it("finds config files to scan — the walk itself is not silently empty", () => {
    // A scan that matches nothing because it looked nowhere is the classic
    // false-green. This asserts the walk has teeth before trusting its result.
    expect(configFiles.length).toBeGreaterThan(20);
  });

  it("is never assigned an enabling value in any deployable config", () => {
    const offenders: string[] = [];
    for (const file of configFiles) {
      const text = readFileSync(file, "utf8");
      if (!text.includes(FLAG)) continue;
      for (const [i, line] of text.split("\n").entries()) {
        if (ENABLED_ASSIGNMENT.test(line)) {
          offenders.push(`${relative(REPO_ROOT, file)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(
      offenders,
      `${FLAG} must not be enabled in version control — it is a founder action ` +
        `taken in a deploy environment after real staging counts exist:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("catches an enabling assignment when one exists — the matcher has teeth", () => {
    // Proves the regex above would actually fire. Without this, a broken
    // pattern makes the previous test pass for the wrong reason forever.
    for (const line of [
      `${FLAG}=1`,
      `${FLAG}: "1"`,
      `  ${FLAG}: 'true'`,
      `ENV ${FLAG}=1`,
      `export ${FLAG}=true`,
    ]) {
      expect(ENABLED_ASSIGNMENT.test(line), line).toBe(true);
    }
  });

  it("does not flag a disabling or absent assignment", () => {
    for (const line of [`${FLAG}=0`, `${FLAG}="false"`, `${FLAG}=`, `# ${FLAG} is unset`]) {
      expect(ENABLED_ASSIGNMENT.test(line), line).toBe(false);
    }
  });

  it("excludes source and prose by FILE TYPE, which is where the reader lives", () => {
    // The pattern deliberately matches `FLAG=1` in any text — including the
    // reader's own docstring, which contains that exact string as an
    // instruction. Prose is protected by the file filter, not by the regex, so
    // that is the property to pin. Getting this backwards would either ban the
    // flag from being documented or quietly stop scanning real config.
    for (const name of [
      "load-gate-slate.ts",
      "board-gate-slate.test.ts",
      "PRODUCT_CASCADE_MAP.md",
      "page.tsx",
    ]) {
      expect(isConfigFile(name), `${name} must not be scanned`).toBe(false);
    }
    for (const name of [
      ".env",
      ".env.local",
      ".env.production",
      "ci.yml",
      "vercel.json",
      "Dockerfile",
      "deploy.sh",
    ]) {
      expect(isConfigFile(name), `${name} must be scanned`).toBe(true);
    }
  });

  it("is absent from the committed env examples entirely", () => {
    // A commented-out `# LIVE_BOARD_GATE_SLATE=1` in `.env.example` is the most
    // likely way this gets enabled: someone uncomments the whole block. The
    // honest place to document the flag is the reader and the ops runbook.
    for (const name of [".env.example", ".env.production.example"]) {
      const path = join(REPO_ROOT, name);
      let text: string;
      try {
        text = readFileSync(path, "utf8");
      } catch {
        continue; // not present in this checkout; nothing to assert
      }
      expect(text, `${name} must not mention ${FLAG}`).not.toContain(FLAG);
    }
  });
});
