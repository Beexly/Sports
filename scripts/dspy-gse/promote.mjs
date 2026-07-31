#!/usr/bin/env node
/**
 * Promote agent-eval / goldens fixtures → DSPy-style Examples (train + val).
 * No network. Writes data/examples.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const goldens = JSON.parse(readFileSync(join(here, "data/goldens.json"), "utf8"));
const config = JSON.parse(readFileSync(join(here, "gepa_config.json"), "utf8"));
const valIds = new Set(config.train_val_split.val_ids);

const examples = goldens.map((g) => ({
  id: g.id,
  domain: g.domain,
  // DSPy Example fields
  input: {
    task: g.task,
    trajectory: g.trajectory,
    invariants: g.invariants,
  },
  expected: {
    pass: g.expected_pass,
    failure_modes: g.failure_modes ?? [],
  },
  split: valIds.has(g.id) ? "val" : "train",
}));

const train = examples.filter((e) => e.split === "train");
const val = examples.filter((e) => e.split === "val");
const out = {
  promoted_at: new Date().toISOString().slice(0, 10),
  source: "data/goldens.json",
  train_count: train.length,
  val_count: val.length,
  examples,
};

writeFileSync(join(here, "data/examples.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, train: train.length, val: val.length }, null, 2));
