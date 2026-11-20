import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { validateRepoSkills } from "./verify-skills-integrity.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

test("live repo .claude/skills and .agents/skills pass skills integrity check", () => {
  const errs = validateRepoSkills(REPO_ROOT);
  assert.deepEqual(errs, []);
});

test("rejects missing disable-model-invocation, Beexly/Sports path corruption, and boilerplate", () => {
  const tmp = mkdtempSync(join(tmpdir(), "gse-skills-guard-"));
  try {
    const cDir = join(tmp, ".claude", "skills", "claude-delegate");
    const aDir = join(tmp, ".agents", "skills", "claude-delegate");
    mkdirSync(cDir, { recursive: true });
    mkdirSync(aDir, { recursive: true });
    const bad = `---
name: claude-delegate
description: Delegate coding tasks.
---

## Use this skill when

- Working on \`claude-delegate\` tasks: Delegate coding tasks.

# Claude Delegate
Run node Beexly/Sports/scripts/guardrails/trust-gate.mjs
`;
    writeFileSync(join(cDir, "SKILL.md"), bad);
    writeFileSync(join(aDir, "SKILL.md"), bad);
    const errs = validateRepoSkills(tmp, { checkParity: false });
    assert.ok(errs.some((e) => e.includes("disable-model-invocation: true")));
    assert.ok(errs.some((e) => e.includes("Beexly/Sports/")));
    assert.ok(errs.some((e) => e.includes("boilerplate")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("rejects obsolete absent-only free-path law and voided ledger citations", () => {
  const tmp = mkdtempSync(join(tmpdir(), "gse-skills-doctrine-"));
  try {
    const cDir = join(tmp, ".claude", "skills", "coding-agent");
    mkdirSync(cDir, { recursive: true });
    mkdirSync(join(tmp, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(cDir, "SKILL.md"),
      `---
name: coding-agent
description: Test coding agent.
---
Free-path gate: free only if THE_ODDS_API_KEY is absent.
Season banner: 62-23-1.
`,
    );
    const errs = validateRepoSkills(tmp, { checkParity: false });
    assert.ok(errs.some((e) => e.includes("pre-2026-09-02")));
    assert.ok(errs.some((e) => e.includes("62-23-1")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
