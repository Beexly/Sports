#!/usr/bin/env node
/**
 * Offline DSPy/GEPA readiness for GSE skills (Session 2).
 *
 * 1. Promote goldens → Examples (train/val)
 * 2. Score with gse_metric → Prediction(score, feedback)
 * 3. Assert gepa_config laws (reflection temp 1.0, task temp 0, auto=light)
 *
 * Source goldens: data/goldens.json (promote → examples).
 * free path / ABSENT gate encoded in settlement skills.
 * No network. Exit 0 if all examples score 1.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { evaluateExamples } from "./gse_metric.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

// promote
const promote = spawnSync(process.execPath, [join(here, "promote.mjs")], {
  encoding: "utf8",
});
if (promote.status !== 0) {
  console.error(promote.stderr || promote.stdout);
  process.exit(1);
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

const skillByDomain = {
  settlement: loadSkills([
    "docs/agent-skills/settlement-free-path/SKILL.md",
    "docs/agent-skills/stripe-webhook/SKILL.md",
    "docs/agent-skills/checkout-attempt/SKILL.md",
  ]),
  coding: loadSkills([
    "docs/agent-skills/coding-agent/SKILL.md",
    "docs/agent-skills/polymarket-hold/SKILL.md",
  ]),
  calibration: loadSkills(["docs/agent-skills/calibration-pipeline/SKILL.md"]),
};

// Expand examples with calibration domain goldens if present in goldens but not examples
const result = evaluateExamples(examplesDoc.examples, skillByDomain);

const out = {
  optimizer: config.optimizer,
  auto: config.auto,
  reflection_temp: config.reflection_lm.temperature,
  task_temp: config.task_lm.temperature,
  metric: config.metric.name,
  train: examplesDoc.train_count,
  val: examplesDoc.val_count,
  config_ok: configFails.length === 0,
  config_fails: configFails,
  ...result,
};

console.log(JSON.stringify(out, null, 2));
const failed = result.failed + configFails.length;
process.exit(failed ? 1 : 0);
