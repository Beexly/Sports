/**
 * Pattern Recognition — Layer D
 *
 * Jarvis notices patterns across historical snapshots. He does not re-derive
 * what he already knows. He notices when something is different from last time.
 *
 * Trust rules:
 *   - detectPatterns requires at least 2 OwnerSummary snapshots to identify
 *     a recurring pattern — a single snapshot cannot show a trend.
 *   - shouldSurfacePattern prevents the same pattern from surfacing twice
 *     in a session.
 *   - buildPatternMemory produces a compact ScribeEntry — not a data dump.
 *   - Severity is derived from actual state, never inflated for drama.
 */

import type { OwnerSummary } from "../cockpit/owner-summary";
import type { ScribeEntry } from "./scribe-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatternType =
  | "RECURRING_BLOCKER"    // same blocker appears repeatedly
  | "DATA_DRIFT"           // ingestion latency worsening over time
  | "DECISION_BACKLOG"     // owner decisions piling up without resolution
  | "CALIBRATION_TREND"    // pick accuracy trending up or down
  | "CONTENT_VELOCITY"     // content production rate changing
  | "REVENUE_SIGNAL";      // conversion or churn pattern

export interface ObservedPattern {
  readonly id: string;
  readonly type: PatternType;
  readonly description: string;
  readonly firstObservedAt: string;
  readonly lastObservedAt: string;
  readonly occurrenceCount: number;
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly recommendation: string;
  readonly autoProposedImprovement: boolean;
  readonly requiresOwnerAwareness: boolean;
}

// ─── Pattern detectors ────────────────────────────────────────────────────────

function detectRecurringBlockers(
  history: readonly OwnerSummary[],
): readonly ObservedPattern[] {
  if (history.length < 2) return [];

  const patterns: ObservedPattern[] = [];

  // Check if picks gate has been closed across multiple snapshots
  const gateClosedSnapshots = history.filter((s) => !s.picks.isPublicGateOpen);
  if (gateClosedSnapshots.length >= 2) {
    patterns.push({
      id: `blocker_picks_gate_${gateClosedSnapshots.length}`,
      type: "RECURRING_BLOCKER",
      description: `Public picks gate has been closed in ${gateClosedSnapshots.length} consecutive assessments.`,
      firstObservedAt: gateClosedSnapshots[0]?.assessedAt ?? history[0]!.assessedAt,
      lastObservedAt: gateClosedSnapshots[gateClosedSnapshots.length - 1]?.assessedAt ?? history[history.length - 1]!.assessedAt,
      occurrenceCount: gateClosedSnapshots.length,
      severity: gateClosedSnapshots.length >= 5 ? "HIGH" : "MEDIUM",
      recommendation: "Review PUBLIC_PICKS_ENABLED gate — it has been closed across multiple sessions.",
      autoProposedImprovement: false,
      requiresOwnerAwareness: true,
    });
  }

  // Check for persistent critical warnings
  const criticalSnapshots = history.filter((s) => s.criticalWarnings.length > 0);
  if (criticalSnapshots.length >= 2) {
    patterns.push({
      id: `blocker_critical_warnings_${criticalSnapshots.length}`,
      type: "RECURRING_BLOCKER",
      description: `Critical warnings have been active in ${criticalSnapshots.length} consecutive assessments.`,
      firstObservedAt: criticalSnapshots[0]?.assessedAt ?? history[0]!.assessedAt,
      lastObservedAt: criticalSnapshots[criticalSnapshots.length - 1]?.assessedAt ?? history[history.length - 1]!.assessedAt,
      occurrenceCount: criticalSnapshots.length,
      severity: criticalSnapshots.length >= 3 ? "CRITICAL" : "HIGH",
      recommendation: "Critical warnings are persistent — owner review required to clear them.",
      autoProposedImprovement: false,
      requiresOwnerAwareness: true,
    });
  }

  return patterns;
}

function detectDecisionBacklog(
  history: readonly OwnerSummary[],
): readonly ObservedPattern[] {
  if (history.length < 2) return [];

  const patterns: ObservedPattern[] = [];

  // Count snapshots with growing decision queues
  const decisionsOverTime = history.map((s) => s.decisions.length);
  const isGrowing =
    decisionsOverTime.length >= 2 &&
    decisionsOverTime[decisionsOverTime.length - 1]! >
      decisionsOverTime[0]!;

  if (isGrowing) {
    const current = decisionsOverTime[decisionsOverTime.length - 1] ?? 0;
    patterns.push({
      id: `decision_backlog_${current}`,
      type: "DECISION_BACKLOG",
      description: `Decision queue has grown from ${decisionsOverTime[0]} to ${current} items across ${history.length} snapshots.`,
      firstObservedAt: history[0]!.assessedAt,
      lastObservedAt: history[history.length - 1]!.assessedAt,
      occurrenceCount: history.length,
      severity: current >= 5 ? "HIGH" : current >= 3 ? "MEDIUM" : "LOW",
      recommendation: `Clear the ${current}-item decision queue — backlog is growing.`,
      autoProposedImprovement: false,
      requiresOwnerAwareness: current >= 3,
    });
  }

  return patterns;
}

function detectCalibrationTrend(
  history: readonly OwnerSummary[],
): readonly ObservedPattern[] {
  if (history.length < 2) return [];

  const patterns: ObservedPattern[] = [];

  // Track performance.canonicalSampleSize growth
  const sampleSizes = history.map((s) => s.performance.canonicalSampleSize);
  const isStagnant =
    sampleSizes.length >= 3 &&
    sampleSizes[sampleSizes.length - 1] === sampleSizes[0];

  if (isStagnant && (sampleSizes[0] ?? 0) === 0) {
    patterns.push({
      id: "calibration_no_settled_picks",
      type: "CALIBRATION_TREND",
      description: `No canonical picks have settled across ${history.length} snapshots.`,
      firstObservedAt: history[0]!.assessedAt,
      lastObservedAt: history[history.length - 1]!.assessedAt,
      occurrenceCount: history.length,
      severity: "MEDIUM",
      recommendation: "Settlement worker has not run — no canonical picks are settling.",
      autoProposedImprovement: false,
      requiresOwnerAwareness: true,
    });
  }

  // Check for gate remaining closed when approaching threshold
  const approachingThreshold = history.filter(
    (s) =>
      s.performance.remainingToThreshold > 0 &&
      s.performance.remainingToThreshold <= 10,
  );
  if (approachingThreshold.length >= 2) {
    patterns.push({
      id: "calibration_near_threshold",
      type: "CALIBRATION_TREND",
      description: `Platform has been within 10 picks of display threshold for ${approachingThreshold.length} snapshots.`,
      firstObservedAt: approachingThreshold[0]?.assessedAt ?? history[0]!.assessedAt,
      lastObservedAt: approachingThreshold[approachingThreshold.length - 1]?.assessedAt ?? history[history.length - 1]!.assessedAt,
      occurrenceCount: approachingThreshold.length,
      severity: "LOW",
      recommendation: "Near performance display threshold — prioritize settling pending picks.",
      autoProposedImprovement: false,
      requiresOwnerAwareness: false,
    });
  }

  return patterns;
}

// ─── Main functions ───────────────────────────────────────────────────────────

/**
 * Detect patterns across a history of OwnerSummary snapshots.
 *
 * Requires at least 2 snapshots to identify any pattern (a single snapshot
 * cannot show a trend). Returns empty array for single-snapshot history.
 */
export function detectPatterns(
  history: readonly OwnerSummary[],
): readonly ObservedPattern[] {
  if (history.length < 2) return [];

  const all = [
    ...detectRecurringBlockers(history),
    ...detectDecisionBacklog(history),
    ...detectCalibrationTrend(history),
  ];

  return all;
}

/** Sort patterns by urgency: CRITICAL → HIGH → MEDIUM → LOW. */
export function rankPatternsByUrgency(
  patterns: readonly ObservedPattern[],
): readonly ObservedPattern[] {
  const rank = (s: ObservedPattern["severity"]): number =>
    s === "CRITICAL" ? 0 : s === "HIGH" ? 1 : s === "MEDIUM" ? 2 : 3;
  return [...patterns].sort((a, b) => rank(a.severity) - rank(b.severity));
}

/** Produce a concise owner-facing pattern summary. */
export function summarizePatternsForOwner(
  patterns: readonly ObservedPattern[],
): string {
  if (patterns.length === 0) return "No recurring patterns detected across available history.";

  const ranked = rankPatternsByUrgency(patterns);
  const lines: string[] = [
    `${patterns.length} pattern${patterns.length === 1 ? "" : "s"} detected:`,
  ];

  ranked.slice(0, 3).forEach((p, i) => {
    lines.push(`  ${i + 1}. [${p.severity}] ${p.description} → ${p.recommendation}`);
  });

  return lines.join("\n");
}

/**
 * Returns true if this pattern should be surfaced now.
 *
 * A pattern that has already been surfaced in this session is suppressed
 * to avoid repeating the same observation.
 */
export function shouldSurfacePattern(
  pattern: ObservedPattern,
  alreadySurfaced: readonly string[],
): boolean {
  return !alreadySurfaced.includes(pattern.id);
}

/** Build a ScribeEntry for institutional memory from observed patterns. */
export function buildPatternMemory(
  patterns: readonly ObservedPattern[],
): ScribeEntry {
  const ranked = rankPatternsByUrgency(patterns);
  const today = new Date().toISOString().slice(0, 10);

  const body =
    patterns.length === 0
      ? "No recurring patterns detected in this session."
      : ranked
          .map(
            (p) =>
              `[${p.severity}] ${p.type}: ${p.description}\n` +
              `  Recommendation: ${p.recommendation}\n` +
              `  Occurrences: ${p.occurrenceCount} · First: ${p.firstObservedAt.slice(0, 10)} · Last: ${p.lastObservedAt.slice(0, 10)}`,
          )
          .join("\n\n");

  return {
    id: `patterns_${Date.now()}`,
    type: "PATTERN",
    title: `Pattern observation — ${today} (${patterns.length} patterns)`,
    body,
    createdAt: new Date().toISOString(),
    tags: [
      "patterns",
      today,
      ...patterns.map((p) => p.type.toLowerCase().replace(/_/g, "-")),
    ],
    vaultPath: `06-memory/patterns-${today}.md`,
  };
}
