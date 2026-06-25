/**
 * Galileo Week — zero-spend `--plan` dry-run CLI.
 *
 *   npx tsx scripts/galileo-plan.ts --week 2026-W01 --portfolio market-minimum --budget 300
 *
 * Spends nothing, makes NO network call, requires NO key for plan mode, and refuses LIVE. It prices the
 * acquisition stack (reusing the mesh's planApiBudget), checks env-key PRESENCE (never reads values),
 * and previews the eight atlases over fixtures. Owner approval + keys are required to ever execute live.
 */

import {
  planGalileoWeek,
  runGalileoWeek,
  GALILEO_WEEK_CANDIDATES,
  GALILEO_WEEK_FIXTURE,
} from "@sports/galileo-week";
import { PROVIDER_PORTFOLIOS, portfolioByName } from "@sports/nfl-stat-universe";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith("--") ? v : fallback;
}

const week = arg("week", "Galileo Week 001");
const portfolioName = arg("portfolio", "Market-Calibration Minimum");
const budget = Number(arg("budget", "300"));

// Required vs optional keys for a live run. We check PRESENCE only — values are never read here.
const REQUIRED_KEYS = ["THE_ODDS_API_KEY", "SPORTSGAMEODDS_KEY"];
const OPTIONAL_KEYS = ["FANTASYDATA_KEY", "SPORTSDATAIO_KEY"];
const present = (k: string): boolean => Boolean(process.env[k] && String(process.env[k]).length > 0);
const missingRequired = REQUIRED_KEYS.filter((k) => !present(k));
const missingOptional = OPTIONAL_KEYS.filter((k) => !present(k));

const portfolio = portfolioByName(portfolioName) ?? PROVIDER_PORTFOLIOS.find((p) => p.name.toLowerCase().includes(portfolioName.toLowerCase().replace(/-/g, " ")));
const plan = planGalileoWeek(GALILEO_WEEK_CANDIDATES, budget);
const atlas = runGalileoWeek({ mode: "PREVIEW_FIXTURES", week: { ...GALILEO_WEEK_FIXTURE, week } });

const lines: string[] = [];
lines.push("");
lines.push(`╭─ Galileo Week — ${week} ───────────────────────────────`);
lines.push(`│ Mode:   PLAN_ONLY`);
lines.push(`│ Spend:  $0 (no key read, no call made, nothing purchased)`);
lines.push(`│ Portfolio: ${portfolio ? portfolio.name : portfolioName}${portfolio ? ` (${portfolio.tier}, ${portfolio.ownerGated ? "owner-gated" : "free"})` : ""}`);
lines.push("│");
lines.push(`│ Required keys: ${REQUIRED_KEYS.join(", ")}`);
lines.push(`│ Optional keys: ${OPTIONAL_KEYS.join(", ")}`);
lines.push(`│ Missing required: ${missingRequired.length ? missingRequired.join(", ") : "none"}`);
lines.push(`│ Missing optional: ${missingOptional.length ? missingOptional.join(", ") : "none"}`);
lines.push("│");
lines.push(`│ Budget preview ($${budget}/mo):`);
for (const s of plan.budget.selected) lines.push(`│   ✓ buy   ${s.sourceId.padEnd(22)} $${s.costPerMonth}/mo`);
for (const d of plan.budget.deferred) lines.push(`│   · defer ${d.sourceId.padEnd(22)} ${d.reason}`);
lines.push(`│   → ${plan.budget.note}`);
lines.push("│");
lines.push(`│ Atlases expected (8):`);
lines.push(`│   1 Source Race        ${atlas.sourceRace.races.length} race(s), fastest: ${atlas.sourceRace.fastestSource ?? "—"}`);
lines.push(`│   2 Market Absorption  ${atlas.marketAbsorption.observerCount} observer(s)`);
lines.push(`│   3 Fantasy Absorption gap ${atlas.fantasyAbsorption.avgAbsorptionGap}`);
lines.push(`│   4 Decision Card      ${atlas.decisionCard.emitted} emitted, ${atlas.decisionCard.suppressed} suppressed`);
lines.push(`│   5 Scar               ${atlas.scar.trapsAvoided.length} trap(s) filed, ${atlas.scar.processHeld.length} held`);
lines.push(`│   6 Intelligence Delta ${atlas.intelligenceDelta.improvingCount}/7 improving (FDR)`);
lines.push(`│   7 Missed Observation ${atlas.missedObservation.toBuy.length} thing(s) to buy`);
lines.push(`│   8 Over Observation   ${atlas.overObservation.toStopBuying.length} thing(s) to stop buying`);
lines.push("│");
lines.push(`│ Owner approvals required to execute live: keys + spend (after this dry-run).`);
lines.push(`│ Blocked: LIVE execution is refused until owner-approved keys are supplied.`);
lines.push(`│ Public moment (preview): ${atlas.publicMoment}`);
lines.push(`╰────────────────────────────────────────────────────────`);
lines.push("");

console.log(lines.join("\n"));
