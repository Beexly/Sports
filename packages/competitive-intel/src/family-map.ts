/**
 * Rival data-feature name to GSE SignalFamily.
 *
 * A rival exposes hundreds of named statistics. Each one belongs to exactly one of the eight
 * families, and the mapping is by rule with a fixed precedence, so two runs over the same
 * payload produce the same answer. Precedence matters: "Team PP% - Month" is MARKET-ish by
 * name but EFFICIENCY by mechanism, while "Line" is TRENCHES, not EFFICIENCY.
 */

import type { SignalFamily } from "@sports/types";

type Rule = { readonly family: SignalFamily; readonly test: RegExp };

/**
 * Order is the precedence. First match wins.
 *
 * Rationale per rule, in the order they fire:
 *  - trenches: line, pressure, block, blitz, hit, sack, coverage, gap. Physical line play.
 *  - microclimate: weather, wind, temp, roof, surface, park, altitude, venue.
 *  - market microstructure: ownership, field%, salary, value, leverage, popularity, tickets.
 *  - situational: rest, back-to-back, injury, status, snap, minutes, travel, schedule.
 *  - luck: variance, luck, regression, expected, over/under-performance, pace luck.
 *  - narrative: narrative, story, beat, quote, coach, scheme, momentum.
 *  - efficiency: rate stats that are none of the above (per-game, per-60, %, ratio, pace).
 *  - market: fallback for prices and everything priced.
 */
const RULES: readonly Rule[] = [
  // Five-letter-plus words drop the leading word boundary on purpose: rivals spell compounds
  // in camelCase ("TeamDefPressureRate") and a `\bpressure` never fires there.
  { family: "TRENCHES", test: /\b(line|hits?|gap|pff)\b|(pressure|block|blitz|sacks?|coverage|trench)/i },
  { family: "MICROCLIMATE", test: /\b(weather|wind|temp|temperature|roof|surface|park|altitude|venue|humidity|precip)\b/i },
  { family: "MARKET_MICROSTRUCTURE", test: /(ownership|own%|field%|\bsalary\b|\bvalue\b|leverage|popularity|\btickets?\b|\bhandles?\b|\bmoney\b|consensus)/i },
  { family: "SITUATIONAL", test: /\b(rest|back[- ]to[- ]back|injur|status|snaps?|minutes|travel|schedule|fatigue|probable|questionable)\b/i },
  { family: "LUCK", test: /\b(variance|luck|regression|expected|xga|xgf|overperform|underperform|pdo|babip)\b/i },
  { family: "NARRATIVE", test: /\b(narrative|story|beat|quote|coach|scheme|momentum|tone|intent)\b/i },
  { family: "EFFICIENCY", test: /(pct|%|\bper[- ]?(game|60|40|36|minute)\b|\brate\b|\bratio\b|\bpace\b|\busage\b|\btargets?\b|\bcarry\b|\btouches?\b|\battempts?\b|efficien)/i },
  { family: "MARKET", test: /.*/ },
];

export const DEFAULT_FAMILY: SignalFamily = "MARKET";

/**
 * Map one rival feature name. Pure and deterministic: no clock, no randomness, no I/O.
 * A name that matches no rule returns MARKET, which is the family the pooling code treats as
 * the least informative corroboration.
 */
export function familyForFeature(name: string): SignalFamily {
  const needle = name.trim();
  if (!needle) return DEFAULT_FAMILY;
  for (const rule of RULES) {
    if (rule.test.test(needle)) return rule.family;
  }
  return DEFAULT_FAMILY;
}

/** Warehouse table to a coarse subject, used only for grouping in reports. */
export function subjectForTable(table: string): "player" | "team" | "game" | "other" {
  const t = table.toLowerCase();
  if (t.includes("player")) return "player";
  if (t.includes("team")) return "team";
  if (t.includes("game") || t.includes("slate")) return "game";
  return "other";
}
