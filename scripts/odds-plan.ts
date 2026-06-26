/**
 * The Odds API — zero-spend `odds:plan` dry-run CLI (operator-ready).
 *
 *   npm run odds:plan -- --sports 3 --markets 3 --regions 1 --interval 30 --hours 16 --scores --format json
 *
 * Spends nothing, makes NO network call, and requires NO key for plan mode. It encodes The Odds API's
 * published credit model (markets × regions per odds call; scores = 1; historical = 10×; props per
 * event) and tells the owner the monthly credit burn + the smallest quota tier that fits — BEFORE a
 * single credit is spent. It checks env-key PRESENCE only (never reads or prints the value) and refuses
 * LIVE: actually pulling data requires a key AND owner approval, which this script cannot supply.
 *
 * Deterministic exit codes: 0 ok, 2 invalid args.
 */

import { planOddsApiUsage, type OddsApiPlanInput } from "@sports/data-intelligence";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith("--") ? v : fallback;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function num(name: string, fallback: number): number {
  const v = Number(arg(name, String(fallback)));
  return Number.isFinite(v) ? v : NaN;
}

const mode = arg("mode", "plan").toLowerCase();
if (mode !== "plan") {
  process.stderr.write(`odds:plan error: only --mode plan is supported here (LIVE requires a key + owner approval this script cannot supply).\n`);
  process.exit(2);
}

const input: OddsApiPlanInput = {
  sports: num("sports", 3),
  markets: num("markets", 3),
  regions: num("regions", 1),
  refreshIntervalMinutes: num("interval", 30),
  activeHoursPerDay: num("hours", 16),
  includeScores: flag("scores"),
  playerPropEventsPerDay: num("prop-events", 0),
  playerPropMarkets: num("prop-markets", 0),
  historicalSnapshots: num("historical", 0),
  daysPerMonth: num("days", 30),
};

// Validate: every numeric must be finite and non-negative.
const bad = Object.entries(input).filter(([, v]) => typeof v === "number" && (!Number.isFinite(v) || v < 0));
if (bad.length > 0) {
  process.stderr.write(`odds:plan error: invalid numeric arg(s): ${bad.map(([k]) => k).join(", ")}\n`);
  process.exit(2);
}

const plan = planOddsApiUsage(input);

// Env-key PRESENCE only — the value is NEVER read or printed.
const keyPresent = Boolean(process.env.THE_ODDS_API_KEY && String(process.env.THE_ODDS_API_KEY).length > 0);
const format = arg("format", "text").toLowerCase();

if (format === "json") {
  process.stdout.write(
    JSON.stringify(
      {
        mode: "PLAN_ONLY",
        spendUsd: 0,
        input,
        monthlyCredits: plan.monthlyCredits,
        recommendedTier: plan.recommendedTier,
        tierHeadroomCredits: plan.tierHeadroomCredits,
        lines: plan.lines,
        warnings: plan.warnings,
        capsApplied: plan.capsApplied,
        keyPresent, // boolean only — never the value
        note: "Plan only. No network call, no spend. LIVE pulls require a key AND owner approval.",
      },
      null,
      2,
    ) + "\n",
  );
} else {
  const lines = [
    `The Odds API — PLAN ONLY (spend $0, no network call)`,
    `  coverage: ${input.sports} sport(s) · ${input.markets} market(s) × ${input.regions} region(s) · every ${input.refreshIntervalMinutes}m for ${input.activeHoursPerDay}h/day`,
    ``,
    ...plan.lines.map((l) => `  ${l.label.padEnd(34)} ${l.callsPerMonth.toLocaleString().padStart(9)} calls × ${l.creditsPerCall} = ${l.creditsPerMonth.toLocaleString().padStart(12)} credits/mo`),
    ``,
    `  MONTHLY BURN: ${plan.monthlyCredits.toLocaleString()} credits`,
    `  RECOMMENDED TIER: ${plan.recommendedTier ? `${plan.recommendedTier.label} (${plan.recommendedTier.monthlyCredits.toLocaleString()} credits/mo) — ${plan.recommendedTier.note}` : "none fits — split coverage"}`,
    plan.tierHeadroomCredits != null ? `  HEADROOM: ${plan.tierHeadroomCredits.toLocaleString()} credits` : ``,
    ...plan.capsApplied.map((c) => `  CAP: ${c}`),
    ...plan.warnings.map((w) => `  ⚠ ${w}`),
    ``,
    `  THE_ODDS_API_KEY present: ${keyPresent ? "yes" : "no"} (value never read or printed)`,
    `  LIVE pulls require a key AND owner approval — not available from this script.`,
  ].filter((l) => l !== ``);
  process.stdout.write(lines.join("\n") + "\n");
}

process.exit(0);
