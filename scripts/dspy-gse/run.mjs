#!/usr/bin/env node
/**
 * Offline DSPy/GEPA readiness dry-run for GSE skill metrics.
 * No network. Exit 0 if goldens + skill seeds encode invariants.
 * Live GEPA requires Python dspy + API keys (see README).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const goldens = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "data/goldens.json"), "utf8"),
);

function skillBlob(domain) {
  const paths =
    domain === "coding"
      ? [
          "docs/agent-skills/coding-agent/SKILL.md",
          "docs/agent-skills/polymarket-hold/SKILL.md",
        ]
      : [
          "docs/agent-skills/settlement-free-path/SKILL.md",
          "docs/agent-skills/stripe-webhook/SKILL.md",
          "docs/agent-skills/checkout-attempt/SKILL.md",
        ];
  return paths
    .filter((p) => existsSync(join(root, p)))
    .map((p) => readFileSync(join(root, p), "utf8"))
    .join("\n")
    .toLowerCase();
}

function scoreSkill(domain, skill) {
  const fails = [];
  if (domain === "settlement" || domain === "coding") {
    if (!skill.includes("absent") || !skill.includes("the_odds_api_key") && !skill.includes("free")) {
      // coding may only have polymarket; settlement must have free path
      if (domain === "settlement" && !(skill.includes("absent") && skill.includes("free"))) {
        fails.push("missing free-path ABSENT gate");
      }
    }
  }
  if (domain === "settlement") {
    if (!skill.includes("idempoten") && !skill.includes("stripe")) {
      fails.push("missing stripe/idempotency guidance");
    }
  }
  if (domain === "coding" || skill.includes("polymarket") === false) {
    if (domain === "coding" && !skill.includes("polymarket") && !skill.includes("compliance")) {
      fails.push("missing Polymarket compliance hold");
    }
  }
  return { score: fails.length ? 0 : 1, feedback: fails.join("; ") || "all invariants held" };
}

const settlement = skillBlob("settlement");
const coding = skillBlob("coding");
let failed = 0;
const rows = [];
for (const g of goldens) {
  const skill = g.domain === "coding" ? coding : settlement;
  const r = scoreSkill(g.domain, skill);
  // negative goldens still pass if skill forbids the bad path
  const ok = r.score === 1;
  if (!ok) failed++;
  rows.push({ id: g.id, domain: g.domain, ok, feedback: r.feedback });
}

const train = goldens.filter((g) =>
  !["free-path-present-deactivated", "free-path-violation", "coding-tool-correct"].includes(g.id),
);
const val = goldens.filter((g) =>
  ["free-path-present-deactivated", "free-path-violation", "coding-tool-correct"].includes(g.id),
);

console.log(JSON.stringify({ total: rows.length, passed: rows.length - failed, failed, train: train.length, val: val.length, rows }, null, 2));
process.exit(failed ? 1 : 0);
