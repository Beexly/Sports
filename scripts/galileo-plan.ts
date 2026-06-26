/**
 * Galileo Week — zero-spend `--plan` dry-run CLI (operator-ready).
 *
 *   npm run galileo:plan -- --week 2026-W01 --portfolio market-minimum --budget 150 --format json
 *
 * Spends nothing, makes NO network call, requires NO key for plan mode, and refuses LIVE. The selected
 * `--portfolio` ACTUALLY constrains the candidates priced, the keys required, the fact classes, and the
 * decision states it can catalogue (via the pure `buildAcquisitionPlan`). It checks env-key PRESENCE
 * only (never reads values). Deterministic exit codes: 0 ok, 2 invalid args. Owner approval + keys are
 * required to ever execute live — which this package cannot do.
 */

import {
  runGalileoWeek,
  GALILEO_WEEK_CANDIDATES,
  GALILEO_WEEK_FIXTURE,
} from "@sports/galileo-week";
import { buildAcquisitionPlan } from "@sports/nfl-stat-universe";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith("--") ? v : fallback;
}

const week = arg("week", "Galileo Week 001");
const portfolioName = arg("portfolio", "Market-Calibration Minimum");
const budget = Number(arg("budget", "300"));
const format = arg("format", "text").toLowerCase();

// PURE plan — constrained to the portfolio, validated. Bad budget / unknown portfolio → exit 2.
const plan = buildAcquisitionPlan({ portfolioName, budget, candidates: GALILEO_WEEK_CANDIDATES });
if (!plan.ok) {
  process.stderr.write(`galileo:plan error: ${plan.error}\n`);
  process.exit(plan.exitCode);
}

// Env-key PRESENCE only — values are NEVER read or printed.
const present = (k: string): boolean => Boolean(process.env[k] && String(process.env[k]).length > 0);
const missingRequired = plan.requiredKeys.filter((k) => !present(k));
const missingOptional = plan.optionalKeys.filter((k) => !present(k));

// Atlas preview over fixtures (refuses LIVE inside the package).
const atlas = runGalileoWeek({ mode: "PREVIEW_FIXTURES", week: { ...GALILEO_WEEK_FIXTURE, week } });
const atlasNames = [
  "Source Race", "Market Absorption", "Fantasy Absorption", "Decision Card",
  "Scar", "Intelligence Delta", "Missed Observation", "Over Observation",
];

if (format === "json") {
  const out = {
    mode: "PLAN_ONLY",
    spendUsd: 0,
    week,
    portfolio: { name: plan.portfolio.name, tier: plan.portfolio.tier, ownerGated: plan.portfolio.ownerGated },
    candidateSourceIds: plan.candidateSourceIds,
    keys: {
      required: plan.requiredKeys,
      optional: plan.optionalKeys,
      missingRequired,
      missingOptional,
      // booleans only — no key values are ever emitted.
      presence: Object.fromEntries([...plan.requiredKeys, ...plan.optionalKeys].map((k) => [k, present(k)])),
    },
    budget: {
      monthlyUsd: budget,
      selected: plan.budget.selected.map((s) => ({ sourceId: s.sourceId, costPerMonth: s.costPerMonth })),
      deferred: plan.budget.deferred.map((d) => ({ sourceId: d.sourceId, reason: d.reason })),
      note: plan.budget.note,
    },
    factClassesUnlocked: plan.factClassesUnlocked,
    decisionStatesCatalogued: plan.decisionStatesCatalogued,
    atlases: atlasNames,
    publicMomentPreview: atlas.publicMoment,
    blocked: ["LIVE execution (refused — this package holds no keys and makes no network call)"],
    ownerApprovalsToGoLive: ["supply required keys", "approve monthly spend"],
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(0);
}

const lines: string[] = [];
lines.push("");
lines.push(`╭─ Galileo Week — ${week} ───────────────────────────────`);
lines.push(`│ Mode:   PLAN_ONLY`);
lines.push(`│ Spend:  $0 (no key read, no call made, nothing purchased)`);
lines.push(`│ Portfolio: ${plan.portfolio.name} (${plan.portfolio.tier}, ${plan.portfolio.ownerGated ? "owner-gated" : "free"})`);
lines.push(`│ Candidates in scope: ${plan.candidateSourceIds.join(", ") || "none"}`);
lines.push("│");
lines.push(`│ Required keys: ${plan.requiredKeys.join(", ") || "none"}`);
lines.push(`│ Optional keys: ${plan.optionalKeys.join(", ") || "none"}`);
lines.push(`│ Missing required: ${missingRequired.length ? missingRequired.join(", ") : "none"}`);
lines.push(`│ Missing optional: ${missingOptional.length ? missingOptional.join(", ") : "none"}`);
lines.push("│");
lines.push(`│ Budget preview ($${budget}/mo):`);
for (const s of plan.budget.selected) lines.push(`│   ✓ buy   ${s.sourceId.padEnd(22)} $${s.costPerMonth}/mo`);
for (const d of plan.budget.deferred) lines.push(`│   · defer ${d.sourceId.padEnd(22)} ${d.reason}`);
lines.push(`│   → ${plan.budget.note}`);
lines.push("│");
lines.push(`│ Fact classes unlocked: ${plan.factClassesUnlocked.join(", ") || "none"}`);
lines.push(`│ Decision states catalogue-able (${plan.decisionStatesCatalogued.length}): ${plan.decisionStatesCatalogued.join(", ") || "none"}`);
lines.push("│");
lines.push(`│ Atlases expected (8): ${atlasNames.join(" · ")}`);
lines.push(`│ Public moment (preview): ${atlas.publicMoment}`);
lines.push("│");
lines.push(`│ Owner approvals to go live: keys + spend (after this dry-run).`);
lines.push(`│ Blocked: LIVE execution is refused until owner-approved keys are supplied.`);
lines.push(`╰────────────────────────────────────────────────────────`);
lines.push("");

process.stdout.write(lines.join("\n") + "\n");
process.exit(0);
