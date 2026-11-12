/**
 * Stage B — the completeness gate.
 *
 * Required evidence must be present AND fresh. If anything required is absent
 * or stale the run stops here with MISSING_DATA and nothing downstream executes:
 * no simulation, no overlay, no posterior, no seal. That is the whole point —
 * a run on partial inputs produces a number that looks like a forecast and is
 * not one.
 */

import type { Evidence, GameEvidenceBundle } from "./types.js";
import { isPresent } from "./types.js";

export interface FreshnessRule {
  /** Dotted path into the bundle, e.g. "market.spread". */
  readonly field: string;
  /** Maximum age in minutes, measured from `asOf` to the check instant. */
  readonly maxAgeMinutes: number;
  /** When false, absence is reported but does not block the run. */
  readonly required: boolean;
}

/**
 * Defaults. Odds move fastest; injuries are official once a day plus inactives;
 * weather is a forecast; form and charting are weekly artefacts.
 */
export const DEFAULT_FRESHNESS_RULES: readonly FreshnessRule[] = [
  { field: "market.spread", maxAgeMinutes: 30, required: true },
  { field: "market.total", maxAgeMinutes: 30, required: true },
  { field: "market.consensusNoVigHome", maxAgeMinutes: 30, required: true },
  { field: "market.bookmakerCount", maxAgeMinutes: 30, required: true },
  { field: "market.homeMoneyline", maxAgeMinutes: 30, required: false },
  { field: "market.awayMoneyline", maxAgeMinutes: 30, required: false },
  { field: "market.bestHomePrice", maxAgeMinutes: 30, required: false },
  { field: "market.bestAwayPrice", maxAgeMinutes: 30, required: false },
  // The official NFL injury report is published once a day, so a 6-hour rule
  // would fail every morning run. Inactives are a separate, later check.
  { field: "injuries", maxAgeMinutes: 720, required: true },
  { field: "weather", maxAgeMinutes: 180, required: true },
  { field: "rest", maxAgeMinutes: 1440, required: true },
  { field: "homeForm", maxAgeMinutes: 10080, required: true },
  { field: "awayForm", maxAgeMinutes: 10080, required: true },
  { field: "homeCharting", maxAgeMinutes: 10080, required: false },
  { field: "awayCharting", maxAgeMinutes: 10080, required: false },
  { field: "homeCoaching", maxAgeMinutes: 43200, required: true },
  { field: "awayCoaching", maxAgeMinutes: 43200, required: true },
  { field: "corpus", maxAgeMinutes: 1440, required: false },
  { field: "jev", maxAgeMinutes: 360, required: false },
  { field: "identity.venue", maxAgeMinutes: 43200, required: false },
];

export interface CompletenessReport {
  readonly verdict: "READY" | "MISSING_DATA";
  /** Required fields that were absent. */
  readonly missing: readonly string[];
  /** Required fields present but older than their rule allows. */
  readonly stale: readonly string[];
  /** Optional fields that were absent or stale. Never blocks. */
  readonly degraded: readonly string[];
  readonly checkedAt: string;
}

function readPath(bundle: GameEvidenceBundle, path: string): Evidence<unknown> | undefined {
  const parts = path.split(".");
  let cursor: unknown = bundle;
  for (const part of parts) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  if (cursor === null || typeof cursor !== "object") return undefined;
  const candidate = cursor as { status?: unknown };
  if (candidate.status !== "REAL" && candidate.status !== "DERIVED" && candidate.status !== "MISSING") {
    return undefined;
  }
  return cursor as Evidence<unknown>;
}

function ageMinutes(asOf: string, now: Date): number | null {
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 60000;
}

/**
 * Evaluate the bundle against the rules. `now` is injected so the gate is
 * deterministic and testable; production passes `new Date()`.
 */
export function checkCompleteness(
  bundle: GameEvidenceBundle,
  now: Date,
  rules: readonly FreshnessRule[] = DEFAULT_FRESHNESS_RULES,
): CompletenessReport {
  const missing: string[] = [];
  const stale: string[] = [];
  const degraded: string[] = [];

  for (const rule of rules) {
    const evidence = readPath(bundle, rule.field);
    const bucket = rule.required ? null : degraded;

    if (evidence === undefined || !isPresent(evidence)) {
      if (bucket !== null) bucket.push(rule.field);
      else missing.push(rule.field);
      continue;
    }

    const age = ageMinutes(evidence.asOf, now);
    // An unparseable timestamp is not fresh. Treat it as stale, not as zero age.
    if (age === null || age > rule.maxAgeMinutes) {
      if (bucket !== null) bucket.push(rule.field);
      else stale.push(rule.field);
    }
  }

  const verdict = missing.length === 0 && stale.length === 0 ? "READY" : "MISSING_DATA";
  return {
    verdict,
    missing,
    stale,
    degraded,
    checkedAt: now.toISOString(),
  };
}

/** Human-readable one-liner for the run log. */
export function describeCompleteness(report: CompletenessReport): string {
  if (report.verdict === "READY") {
    const tail = report.degraded.length > 0 ? ` (degraded: ${report.degraded.join(", ")})` : "";
    return `READY${tail}`;
  }
  const parts: string[] = [];
  if (report.missing.length > 0) parts.push(`missing: ${report.missing.join(", ")}`);
  if (report.stale.length > 0) parts.push(`stale: ${report.stale.join(", ")}`);
  return `MISSING_DATA — ${parts.join("; ")}`;
}
