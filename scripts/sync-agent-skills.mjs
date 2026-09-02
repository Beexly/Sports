#!/usr/bin/env node
/**
 * Sync docs/agent-skills/<name>/SKILL.md -> .claude/skills/<name>/SKILL.md.
 *
 * Claude Code only loads skills from .claude/skills/<name>/SKILL.md, but our
 * canonical runbooks live in docs/agent-skills/ (other scripts, docs, and the
 * agent-eval fixtures reference that path, so it stays put). The founder works
 * on Windows, so we ship plain-copy mirrors here instead of symlinks, and this
 * script is the drift check that keeps the two trees identical.
 *
 * Skips any .claude/skills/<name> that has no docs/agent-skills/<name> source
 * (e.g. vendored skills like claude-delegate, grok-delegate) — those are not
 * managed by this script and must not be touched.
 *
 * Usage:
 *   node scripts/sync-agent-skills.mjs            # copy sources into .claude/skills
 *   node scripts/sync-agent-skills.mjs --check     # verify, no writes; exit 1 on drift
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "docs", "agent-skills");
const destRoot = join(root, ".claude", "skills");

const check = process.argv.includes("--check");

function listSkillDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() && existsSync(join(p, "SKILL.md"));
  });
}

const managedSkills = listSkillDirs(sourceRoot).sort();

if (check) {
  const problems = [];
  for (const name of managedSkills) {
    const srcPath = join(sourceRoot, name, "SKILL.md");
    const destPath = join(destRoot, name, "SKILL.md");
    if (!existsSync(destPath)) {
      problems.push(`${name}: missing in .claude/skills`);
      continue;
    }
    const src = readFileSync(srcPath);
    const dest = readFileSync(destPath);
    if (!src.equals(dest)) {
      problems.push(`${name}: .claude/skills copy differs from docs/agent-skills source`);
    }
  }
  if (problems.length > 0) {
    console.error("agent skills out of sync:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`OK: ${managedSkills.length} agent skills in sync`);
  process.exit(0);
}

for (const name of managedSkills) {
  const srcPath = join(sourceRoot, name, "SKILL.md");
  const destDir = join(destRoot, name);
  const destPath = join(destDir, "SKILL.md");
  mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, readFileSync(srcPath));
}

console.log(`synced ${managedSkills.length} skills`);
