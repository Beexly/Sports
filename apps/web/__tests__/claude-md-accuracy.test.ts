/**
 * CLAUDE.md accuracy pins.
 *
 * CLAUDE.md is the spec every agent reads first. A false claim there does not
 * mislead once — the next agent builds on it. These tests pin the two classes of
 * claim that have actually rotted in practice:
 *
 *  1. Tech-stack claims naming an npm package that is not a dependency
 *     (historically "Queue: BullMQ + Redis" and "Testing: ... + Supertest";
 *     neither package has ever been installed).
 *  2. Env vars that fail the app closed but go undocumented (CRON_SECRET: when
 *     unset, every /api/cron/* route answers HTTP 500).
 *
 * Deliberately narrow. These assert facts derivable from the repo, not prose
 * style, so they stay green while CLAUDE.md is edited normally.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CLAUDE_MD = readFileSync(resolve(REPO_ROOT, "CLAUDE.md"), "utf8");

/** Every package.json in the repo (workspaces included), excluding node_modules. */
function collectPackageJsons(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === ".next" || entry === "dist") {
      continue;
    }
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue; // dangling symlink
    }
    if (s.isDirectory()) collectPackageJsons(full, found);
    else if (entry === "package.json") found.push(full);
  }
  return found;
}

const DEPENDENCY_NAMES: ReadonlySet<string> = (() => {
  const names = new Set<string>();
  for (const file of collectPackageJsons(REPO_ROOT)) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      const block = pkg[field];
      if (block && typeof block === "object") {
        for (const name of Object.keys(block as Record<string, string>)) names.add(name);
      }
    }
  }
  return names;
})();

/** The "## Tech Stack" section, up to the next "## " heading. */
const TECH_STACK_SECTION: string = (() => {
  const start = CLAUDE_MD.indexOf("## Tech Stack");
  if (start < 0) throw new Error("CLAUDE.md has no '## Tech Stack' section");
  const rest = CLAUDE_MD.slice(start + "## Tech Stack".length);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
})();

/**
 * Each top-level bullet of the Tech Stack section, continuation lines included
 * (so a wrapped bullet is judged as one unit rather than line by line).
 */
const TECH_STACK_BULLETS: readonly string[] = TECH_STACK_SECTION.split(/^-[ \t]+/m).slice(1);

/**
 * Prose that explicitly DISCLAIMS a package. CLAUDE.md must stay free to say
 * "bullmq is a dependency of no package.json" — that is the correction, not a
 * claim — so a bullet carrying a disclaimer is never read as asserting the
 * package is part of the stack.
 */
const DISCLAIMER =
  /\bno\b[^.\n]*\b(?:job queue|dependency)\b|\bis a dependency of no\b|\bnot a dependency\b|\bnot installed\b|\bis not used\b|\bappears in no\b/i;

/** True when a Tech Stack bullet asserts `pkg` is part of the stack. */
function stackAsserts(pkg: string): boolean {
  const mention = new RegExp(`\\b${pkg}\\b`, "i");
  return TECH_STACK_BULLETS.some((b) => mention.test(b) && !DISCLAIMER.test(b));
}

/**
 * Packages whose presence in the Tech Stack list is only honest if they are
 * actually installed. `vitest` is the positive control: it IS installed and IS
 * claimed, so it proves the detector can see a real assertion (without it, a
 * detector that silently matched nothing would look green).
 */
const CHECKED_PACKAGES: readonly string[] = ["bullmq", "supertest", "vitest"];

describe("CLAUDE.md tech-stack claims trace to real dependencies", () => {
  for (const pkg of CHECKED_PACKAGES) {
    it(`does not list "${pkg}" in the Tech Stack unless it is installed`, () => {
      const asserted = stackAsserts(pkg);
      const installed = DEPENDENCY_NAMES.has(pkg);
      if (asserted && !installed) {
        throw new Error(
          `CLAUDE.md's Tech Stack lists "${pkg}", but it is not a dependency of any ` +
            `package.json in the repo. Either install it or correct CLAUDE.md.`,
        );
      }
      expect(asserted && !installed).toBe(false);
    });
  }

  it("the Tech Stack detector actually detects an assertion (positive control)", () => {
    // vitest is installed AND listed; if this is false the detector is broken and
    // the bullmq/supertest assertions above would be vacuously green.
    expect(stackAsserts("vitest")).toBe(true);
    expect(TECH_STACK_BULLETS.length).toBeGreaterThan(3);
  });

  it("the dependency scan actually works (guards against a vacuously-green test)", () => {
    // If this set were empty, every claim above would pass for the wrong reason.
    expect(DEPENDENCY_NAMES.size).toBeGreaterThan(20);
    expect(DEPENDENCY_NAMES.has("vitest")).toBe(true);
    expect(DEPENDENCY_NAMES.has("bullmq")).toBe(false);
    expect(DEPENDENCY_NAMES.has("supertest")).toBe(false);
  });
});

describe("CLAUDE.md documents env vars that fail the app closed", () => {
  it("documents CRON_SECRET", () => {
    // apps/web/lib/cron/authorize.ts: unset CRON_SECRET (and CRON_SECRET_PREVIOUS)
    // => HTTP 500 "CRON_SECRET not configured" on every /api/cron/* route.
    const authorize = readFileSync(
      resolve(REPO_ROOT, "apps/web/lib/cron/authorize.ts"),
      "utf8",
    );
    expect(authorize).toContain("CRON_SECRET not configured");
    expect(authorize).toContain('process.env["CRON_SECRET"]');

    expect(
      CLAUDE_MD.includes("CRON_SECRET"),
      "CLAUDE.md must document CRON_SECRET: without it every /api/cron/* route returns HTTP 500.",
    ).toBe(true);
  });
});
