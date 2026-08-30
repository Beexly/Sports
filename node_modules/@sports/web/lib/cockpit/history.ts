/**
 * Historical pick eligibility — the rules /cockpit/history applies to every
 * pick before deciding whether it counts toward public performance.
 *
 * Kept I/O-free so the page can pass in raw pick rows and tests can pass in
 * fixtures.
 *
 * Also provides a pure CSV-row builder so the operator can export a
 * filtered ledger view without dragging a CSV library into the page.
 */

import type { PickResult } from "@sports/types";

export interface HistoricalPickEligibility {
  /** True only when the pick would contribute to the public win-rate denominator. */
  readonly publicPerformanceEligible: boolean;
  /** Why the pick is excluded (empty when eligible). */
  readonly exclusionReasons: readonly string[];
  /** True when the pick's snapshot would be considered for outcome-anchored learning. */
  readonly learningEligible: boolean;
}

export interface HistoricalPickRow {
  readonly id: string;
  readonly result: PickResult;
  readonly isBootstrap: boolean;
  readonly isPublished: boolean;
  readonly settledAt: Date | null;
  readonly hasSnapshot: boolean;
  readonly snapshotEligibleForLearning: boolean | null;
}

export interface HistoryEligibilityContext {
  readonly canExposePerformanceStats: boolean;
}

// Computes public-performance and learning eligibility for one pick row.
export function evaluatePickEligibility(
  pick: HistoricalPickRow,
  ctx: HistoryEligibilityContext
): HistoricalPickEligibility {
  const reasons: string[] = [];

  if (!ctx.canExposePerformanceStats) {
    reasons.push("Performance gate is OFF");
  }
  if (pick.isBootstrap) {
    reasons.push("Bootstrap pick — never counts for public performance");
  }
  if (!pick.isPublished) {
    reasons.push("Internal — not published");
  }
  if (pick.result === "PENDING") {
    reasons.push("Pending — no outcome yet");
  } else if (pick.result === "VOID") {
    reasons.push("Void — excluded from win/loss/push counts");
  }
  if (pick.settledAt === null && pick.result !== "PENDING") {
    reasons.push("Missing settledAt — settlement record incomplete");
  }

  const eligible = reasons.length === 0;

  const learningEligible =
    pick.snapshotEligibleForLearning === true &&
    !pick.isBootstrap &&
    (pick.result === "WIN" || pick.result === "LOSS" || pick.result === "PUSH");

  return {
    publicPerformanceEligible: eligible,
    exclusionReasons: reasons,
    learningEligible,
  };
}

// ─── CSV export (pure, no I/O) ────────────────────────────────────────────

/** Minimum row shape required to render a CSV line. */
export interface CsvExportRow {
  readonly id: string;
  readonly generatedAt: Date;
  readonly settledAt: Date | null;
  readonly sport: string;
  readonly matchup: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly pickGrade: string;
  readonly riskLevel: string;
  readonly modelVersion: string;
  readonly bookmakerCount: number;
  readonly edgeScore: number;
  readonly consensusPct: number;
  readonly result: PickResult;
  readonly isBootstrap: boolean;
  readonly isPublished: boolean;
  readonly isFeatured: boolean;
  readonly hasSnapshot: boolean;
  readonly publicPerformanceEligible: boolean;
  readonly learningEligible: boolean;
  readonly exclusionReasons: readonly string[];
}

const CSV_HEADER = [
  "id",
  "generatedAt",
  "settledAt",
  "sport",
  "matchup",
  "pickType",
  "selection",
  "line",
  "confidence",
  "pickGrade",
  "riskLevel",
  "modelVersion",
  "bookmakerCount",
  "edgeScore",
  "consensusPct",
  "result",
  "isBootstrap",
  "isPublished",
  "isFeatured",
  "hasSnapshot",
  "publicPerformanceEligible",
  "learningEligible",
  "exclusionReasons",
].join(",");

/** RFC-4180 minimal-CSV cell escape. */
function csvCell(v: string | number | boolean | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Builds the forensic pick ledger CSV from already-filtered rows.
export function buildHistoryCsv(rows: readonly CsvExportRow[]): string {
  const lines: string[] = [CSV_HEADER];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.id),
        csvCell(r.generatedAt.toISOString()),
        csvCell(r.settledAt ? r.settledAt.toISOString() : null),
        csvCell(r.sport),
        csvCell(r.matchup),
        csvCell(r.pickType),
        csvCell(r.selection),
        csvCell(r.line),
        csvCell(r.confidence),
        csvCell(r.pickGrade),
        csvCell(r.riskLevel),
        csvCell(r.modelVersion),
        csvCell(r.bookmakerCount),
        csvCell(r.edgeScore),
        csvCell(r.consensusPct),
        csvCell(r.result),
        csvCell(r.isBootstrap),
        csvCell(r.isPublished),
        csvCell(r.isFeatured),
        csvCell(r.hasSnapshot),
        csvCell(r.publicPerformanceEligible),
        csvCell(r.learningEligible),
        // Join exclusion reasons with "; " so the cell stays single-line.
        csvCell(r.exclusionReasons.join("; ")),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}
