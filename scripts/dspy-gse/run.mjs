#!/usr/bin/env node
/**
 * Offline DSPy/GEPA readiness for GSE skills (Session 2).
 *
 * 1. Promote goldens -> Examples (train/val) unless --check is passed
 * 2. Score with gse_metric -> Prediction(score, feedback) across .claude & .agents skills
 * 3. Assert gepa_config laws (reflection temp 1.0, task temp 0, auto=light)
 *
 * Source goldens: data/goldens.json (promote -> examples).
 * free path law (since 2026-09-02, path-select.ts): free pass runs primary every cycle.
 * No network. Exit 0 if all examples in both skill roots score 1.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { evaluateExamples } from "./gse_metric.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const checkOnly = process.argv.includes("--check");

if (!checkOnly) {
  const promote = spawnSync(process.execPath, [join(here, "promote.mjs")], {
    encoding: "utf8",
  });
  if (promote.status !== 0) {
    console.error(promote.stderr || promote.stdout);
    process.exit(1);
  }
}

const config = JSON.parse(readFileSync(join(here, "gepa_config.json"), "utf8"));
const examplesDoc = JSON.parse(readFileSync(join(here, "data/examples.json"), "utf8"));

// Config integrity (Session 2 GEPA laws)
const configFails = [];
if (config.reflection_lm?.temperature !== 1.0) {
  configFails.push("reflection_lm.temperature must be 1.0");
}
if (config.task_lm?.temperature !== 0) {
  configFails.push("task_lm.temperature must be 0");
}
if (config.auto !== "light") {
  configFails.push('auto must be "light"');
}
if (config.metric?.name !== "gse_metric") {
  configFails.push("metric.name must be gse_metric");
}
if (!String(config.metric?.return_shape ?? "").includes("Prediction")) {
  configFails.push("metric must return Prediction(score, feedback)");
}

function loadSkills(paths) {
  return paths
    .filter((p) => existsSync(join(root, p)))
    .map((p) => readFileSync(join(root, p), "utf8"))
    .join("\n");
}

function buildDomainMap(prefix) {
  return {
    settlement: loadSkills([
      `${prefix}/settlement-free-path/SKILL.md`,
      `${prefix}/stripe-webhook/SKILL.md`,
      `${prefix}/checkout-attempt/SKILL.md`,
    ]),
    coding: loadSkills([
      `${prefix}/coding-agent/SKILL.md`,
      `${prefix}/polymarket-hold/SKILL.md`,
    ]),
    calibration: loadSkills([`${prefix}/calibration-pipeline/SKILL.md`]),
  };
}

const claudeResult = evaluateExamples(examplesDoc.examples, buildDomainMap(".claude/skills"));
const agentsResult = evaluateExamples(examplesDoc.examples, buildDomainMap(".agents/skills"));

const out = {
  mode: checkOnly ? "check" : "promote+eval",
  optimizer: config.optimizer,
  auto: config.auto,
  reflection_temp: config.reflection_lm.temperature,
  task_temp: config.task_lm.temperature,
  metric: config.metric.name,
  train: examplesDoc.train_count,
  val: examplesDoc.val_count,
  config_ok: configFails.length === 0,
  config_fails: configFails,
  total: claudeResult.total + agentsResult.total,
  passed: claudeResult.passed + agentsResult.passed,
  failed: claudeResult.failed + agentsResult.failed,
  claude_skills: claudeResult,
  agents_skills: agentsResult,
};

console.log(JSON.stringify(out, null, 2));
const failed = out.failed + configFails.length;
process.exit(failed ? 1 : 0);
