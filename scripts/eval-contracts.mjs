#!/usr/bin/env node
/**
 * Validates the markdown eval contracts in docs/ops/evals.
 *
 * This does not execute LLM calls. It makes the append-only eval library
 * enforceable in CI by checking frontmatter, required sections, and pass
 * criteria structure before the full model-output runner exists.
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EVAL_DIR = join(ROOT, "docs", "ops", "evals");
const REQUIRED_FRONTMATTER = ["surface", "scenario", "created", "created_by", "status"];
const REQUIRED_SECTIONS = ["# Input", "# Expected behavior", "# Forbidden behavior", "# Pass criteria"];
const VALID_STATUS = new Set(["pending-runner", "active", "retired"]);
const REQUIRED_SURFACE_TEMPLATE_COVERAGE = {
  "calibration-training": [
    "WEEKLY_INSIGHT",
  ],
  "galaxy-studio": [
    "FAN_EXPLAINER",
    "FANTASY_ANGLE",
    "BETTING_EDUCATION",
    "X_THREAD",
    "TIKTOK_REELS_SCRIPT",
    "NEWSLETTER_BLOCK",
    "SPONSOR_SAFE_BLURB",
    "YOUTUBE_TITLE_IDEAS",
  ],
};
const REQUIRED_SURFACE_SCENARIO_COVERAGE = {
  "calibration-training": [
    "happy-path",
    "policy-block",
    "thin-week-fallback",
  ],
};

const files = (await readdir(EVAL_DIR))
  .filter((fileName) => fileName.endsWith(".md") && fileName.toLowerCase() !== "readme.md")
  .sort();

const failures = [];
const contracts = [];

for (const fileName of files) {
  const filePath = join(EVAL_DIR, fileName);
  const text = await readFile(filePath, "utf8");
  const frontmatter = parseFrontmatter(text);

  if (!frontmatter) {
    failures.push(`${fileName}: missing YAML-style frontmatter`);
    continue;
  }

  contracts.push({ fileName, values: frontmatter.values });

  for (const key of REQUIRED_FRONTMATTER) {
    if (!frontmatter.values[key]) {
      failures.push(`${fileName}: missing frontmatter key "${key}"`);
    }
  }

  if (frontmatter.values.status && !VALID_STATUS.has(frontmatter.values.status)) {
    failures.push(`${fileName}: invalid status "${frontmatter.values.status}"`);
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) {
      failures.push(`${fileName}: missing section "${section}"`);
    }
  }

  const passCriteria = sectionBody(text, "# Pass criteria");
  const criteriaCount = passCriteria.split(/\r?\n/).filter((line) => /^\d+\.\s+/.test(line)).length;
  if (criteriaCount < 3) {
    failures.push(`${fileName}: expected at least 3 numbered pass criteria`);
  }
}

for (const [surface, requiredTemplates] of Object.entries(REQUIRED_SURFACE_TEMPLATE_COVERAGE)) {
  const activeTemplates = new Set(
    contracts
      .filter((contract) => contract.values.surface === surface && contract.values.status !== "retired")
      .map((contract) => contract.values.template)
      .filter(Boolean),
  );

  for (const template of requiredTemplates) {
    if (!activeTemplates.has(template)) {
      failures.push(`${surface}: missing eval coverage for template "${template}"`);
    }
  }
}

for (const [surface, requiredScenarios] of Object.entries(REQUIRED_SURFACE_SCENARIO_COVERAGE)) {
  const activeScenarios = new Set(
    contracts
      .filter((contract) => contract.values.surface === surface && contract.values.status !== "retired")
      .map((contract) => contract.values.scenario)
      .filter(Boolean),
  );

  for (const scenario of requiredScenarios) {
    if (!activeScenarios.has(scenario)) {
      failures.push(`${surface}: missing eval coverage for scenario "${scenario}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(`[eval-contracts] FAIL - ${failures.length} issue(s) across ${files.length} eval(s)`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[eval-contracts] OK - validated ${files.length} eval contract(s)`);

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const keyValue = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!keyValue) continue;
    values[keyValue[1]] = keyValue[2].replace(/^["']|["']$/g, "").trim();
  }
  return { values };
}

function sectionBody(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return "";
  const next = text.slice(start + heading.length).search(/\r?\n# /);
  return next === -1
    ? text.slice(start + heading.length)
    : text.slice(start + heading.length, start + heading.length + next);
}
