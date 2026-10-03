/**
 * Jarvis Audit Log Serializer
 *
 * Pure, deterministic serializer that takes a JarvisAssessment and
 * produces a single-line log entry. Use it when a scheduled job wants
 * to persist daily Jarvis readings to a log file, append-only table, or
 * a search index for later review.
 *
 * The format is intentionally compact and parseable:
 *
 *   2026-05-18T12:00:00.000Z  v1.1  LAUNCH_READY  high  public=GREEN  ingestion=GREEN  ...  closed=[]  safety=0  config_missing=0  actions=2
 *
 * Fields are tab-separated for easy `cut`/`awk` slicing. The full
 * assessment is also emitted as a JSON object on a second optional line
 * when callers want round-trip fidelity.
 */

import type { JarvisAssessment } from "@/lib/cockpit/jarvis";

export interface JarvisAuditEntry {
  /** Tab-separated single-line summary. */
  readonly summaryLine: string;
  /** Newline-separated KV lines for grep-friendly inspection. */
  readonly verboseLines: readonly string[];
  /** Round-trippable JSON. */
  readonly json: string;
}

function safe(s: string): string {
  // Tab chars in a tab-separated line are pathological; replace.
  return s.replace(/\t/g, " ");
}

// Serializes one Jarvis assessment into summary, verbose, and JSON formats.
export function serializeJarvisAudit(assessment: JarvisAssessment): JarvisAuditEntry {
  const sectional = [
    `public=${assessment.publicSurfaceStatus}`,
    `dashboard=${assessment.customerDashboardStatus}`,
    `picks=${assessment.picksStatus}`,
    `perf=${assessment.performanceStatus}`,
    `cockpit=${assessment.cockpitStatus}`,
    `history=${assessment.historicalPickStatus}`,
    `ingest=${assessment.ingestionStatus}`,
    `settle=${assessment.settlementStatus}`,
    `canon=${assessment.canonicalHistoryStatus}`,
    `boot=${assessment.bootstrapStatus}`,
    `signal=${assessment.signalCoverageStatus}`,
  ];

  const gateSummary = `gates=${assessment.readinessGateSummary.openCount}/${assessment.readinessGateSummary.totalCount}`;
  const closed = `closed=[${assessment.readinessGateSummary.closed.join(",")}]`;
  const safety = `safety=${assessment.safetyWarnings.length}`;
  const config = `config_missing=${assessment.externalConfigWarnings.length}`;
  const actions = `actions=${assessment.recommendedNextActions.length}`;

  const summaryLine = [
    assessment.assessedAt,
    assessment.version,
    assessment.launchStatus,
    assessment.confidenceLevel.toLowerCase(),
    ...sectional,
    gateSummary,
    closed,
    safety,
    config,
    actions,
  ]
    .map((p) => safe(String(p)))
    .join("\t");

  const verboseLines: string[] = [
    `assessedAt=${assessment.assessedAt}`,
    `version=${assessment.version}`,
    `launchStatus=${assessment.launchStatus}`,
    `confidence=${assessment.confidenceLevel}`,
    `assessment="${safe(assessment.oneSentenceAssessment)}"`,
    sectional.join(" | "),
    `${gateSummary} ${closed}`,
    ...assessment.safetyWarnings.map((w, i) => `safety[${i}]="${safe(w)}"`),
    ...assessment.missingPhaseWarnings.map((w, i) => `missing[${i}]="${safe(w)}"`),
    ...assessment.externalConfigWarnings.map((w, i) => `config[${i}]=${safe(w)}`),
    ...assessment.recommendedNextActions.map((a, i) => `action[${i}]="${safe(a)}"`),
  ];

  return {
    summaryLine,
    verboseLines,
    json: JSON.stringify(assessment),
  };
}
