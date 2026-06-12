/**
 * Pattern recognition — Layer D of Executive Intelligence v2.
 *
 * Jarvis compares OwnerSummary snapshots over time and notices what is
 * different — recurring blockers, decision backlogs, calibration
 * trends. Patterns derive only from real snapshots; with fewer than two
 * snapshots, nothing is claimed. A surfaced pattern is never surfaced
 * twice in one session.
 */

import type { OwnerSummary } from "@/lib/cockpit/owner-summary";
import { nextScribeId, type ScribeEntry } from "./scribe-types";

export type PatternType =
  | "RECURRING_BLOCKER"
  | "DATA_DRIFT"
  | "DECISION_BACKLOG"
  | "CALIBRATION_TREND"
  | "CONTENT_VELOCITY"
  | "REVENUE_SIGNAL";

export type PatternSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ObservedPattern {
  readonly id: string;
  readonly type: PatternType;
  readonly description: string;
  readonly firstObservedAt: string;
  readonly lastObservedAt: string;
  readonly occurrenceCount: number;
  readonly severity: PatternSeverity;
  readonly recommendation: string;
  readonly autoProposedImprovement: boolean;
  readonly requiresOwnerAwareness: boolean;
}

let patternSeq = 0;

function makePattern(
  p: Omit<ObservedPattern, "id">
): ObservedPattern {
  patternSeq += 1;
  return { ...p, id: `pattern-${patternSeq}` };
}

/**
 * Detect patterns across historical snapshots (oldest → newest).
 * Honest floor: under 2 snapshots there is no "pattern", only a state.
 */
export function detectPatterns(
  history: readonly OwnerSummary[]
): readonly ObservedPattern[] {
  if (history.length < 2) return [];
  const patterns: ObservedPattern[] = [];
  const first = history[0]!;
  const last = history[history.length - 1]!;

  // RECURRING_BLOCKER — same critical warning across ≥2 snapshots.
  const warningCounts = new Map<string, { n: number; first: string; last: string }>();
  for (const snap of history) {
    for (const w of snap.criticalWarnings) {
      const cur = warningCounts.get(w);
      if (cur) {
        cur.n += 1;
        cur.last = snap.assessedAt;
      } else {
        warningCounts.set(w, { n: 1, first: snap.assessedAt, last: snap.assessedAt });
      }
    }
  }
  for (const [warning, stat] of warningCounts) {
    if (stat.n >= 2) {
      patterns.push(
        makePattern({
          type: "RECURRING_BLOCKER",
          description: `Blocker recurred ${stat.n}× across snapshots: ${warning}`,
          firstObservedAt: stat.first,
          lastObservedAt: stat.last,
          occurrenceCount: stat.n,
          severity: stat.n >= 3 ? "CRITICAL" : "HIGH",
          recommendation: "Stop re-triaging — assign a permanent fix and track it to closure.",
          autoProposedImprovement: true,
          requiresOwnerAwareness: true,
        })
      );
    }
  }

  // DECISION_BACKLOG — pending decisions growing monotonically.
  const counts = history.map((s) => s.decisions.length);
  const growing = counts.every((c, i) => i === 0 || c >= counts[i - 1]!);
  if (growing && (counts[counts.length - 1] ?? 0) > (counts[0] ?? 0)) {
    patterns.push(
      makePattern({
        type: "DECISION_BACKLOG",
        description: `Owner decision queue grew ${counts[0]} → ${counts[counts.length - 1]} without resolution.`,
        firstObservedAt: first.assessedAt,
        lastObservedAt: last.assessedAt,
        occurrenceCount: history.length,
        severity: (counts[counts.length - 1] ?? 0) >= 5 ? "HIGH" : "MEDIUM",
        recommendation: "Batch the queue into one decision session — most items are one-word approvals.",
        autoProposedImprovement: false,
        requiresOwnerAwareness: true,
      })
    );
  }

  // CALIBRATION_TREND — displayed win rate trending across ≥3 snapshots.
  const rates = history
    .map((s) => s.performance.actualWinRate)
    .filter((r): r is number => r !== null);
  if (rates.length >= 3) {
    const firstRate = rates[0]!;
    const lastRate = rates[rates.length - 1]!;
    const delta = lastRate - firstRate;
    if (Math.abs(delta) >= 3) {
      patterns.push(
        makePattern({
          type: "CALIBRATION_TREND",
          description: `Win rate moved ${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp across ${rates.length} snapshots (${firstRate.toFixed(1)}% → ${lastRate.toFixed(1)}%).`,
          firstObservedAt: first.assessedAt,
          lastObservedAt: last.assessedAt,
          occurrenceCount: rates.length,
          severity: delta < 0 ? "HIGH" : "LOW",
          recommendation:
            delta < 0
              ? "Open a calibration proposal — review which factor drifted before adjusting anything."
              : "Positive drift — keep the model frozen and let the sample grow.",
          autoProposedImprovement: delta < 0,
          requiresOwnerAwareness: delta < 0,
        })
      );
    }
  }

  // DATA_DRIFT — picks flowing into the system slowing down.
  const totals = history.map((s) => s.picks.totalInSystem);
  if (totals.length >= 3) {
    const recent = totals[totals.length - 1]! - totals[totals.length - 2]!;
    const prior = totals[totals.length - 2]! - totals[totals.length - 3]!;
    if (prior > 0 && recent < prior / 2) {
      patterns.push(
        makePattern({
          type: "DATA_DRIFT",
          description: `Pick inflow halved: +${prior} then +${recent} between snapshots.`,
          firstObservedAt: history[history.length - 3]!.assessedAt,
          lastObservedAt: last.assessedAt,
          occurrenceCount: 2,
          severity: recent === 0 ? "HIGH" : "MEDIUM",
          recommendation: "Check ingestion freshness and The Odds API quota before it shows up on the board.",
          autoProposedImprovement: true,
          requiresOwnerAwareness: recent === 0,
        })
      );
    }
  }

  return patterns;
}

const SEVERITY_RANK: Readonly<Record<PatternSeverity, number>> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

export function rankPatternsByUrgency(
  patterns: readonly ObservedPattern[]
): readonly ObservedPattern[] {
  return [...patterns].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      b.occurrenceCount - a.occurrenceCount
  );
}

export function summarizePatternsForOwner(
  patterns: readonly ObservedPattern[]
): string {
  if (patterns.length === 0) return "No patterns worth your attention — nothing recurring, nothing drifting.";
  const ranked = rankPatternsByUrgency(patterns);
  return ranked
    .slice(0, 3)
    .map((p, i) => `${i + 1}. [${p.severity}] ${p.description} → ${p.recommendation}`)
    .join("\n");
}

export function shouldSurfacePattern(
  pattern: ObservedPattern,
  alreadySurfaced: readonly string[]
): boolean {
  // Same type + description = same pattern; never surface twice a session.
  const key = `${pattern.type}:${pattern.description}`;
  return !alreadySurfaced.includes(key) && !alreadySurfaced.includes(pattern.id);
}

export function buildPatternMemory(
  patterns: readonly ObservedPattern[],
  nowIso: string = new Date().toISOString()
): ScribeEntry {
  return {
    id: nextScribeId("PATTERN", nowIso),
    type: "PATTERN",
    title: `Pattern observations — ${nowIso.slice(0, 10)}`,
    body:
      patterns.length === 0
        ? "No patterns detected this cycle."
        : patterns
            .map(
              (p) =>
                `- [${p.severity}] ${p.type}: ${p.description} (seen ${p.occurrenceCount}×, ${p.firstObservedAt.slice(0, 10)} → ${p.lastObservedAt.slice(0, 10)})`
            )
            .join("\n"),
    vaultPath: `06-memory/${nowIso.slice(0, 10)}-patterns.md`,
    createdAt: nowIso,
    tags: ["patterns", "institutional-memory"],
  };
}
