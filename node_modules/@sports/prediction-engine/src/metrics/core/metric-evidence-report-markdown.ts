import { generateAllShadowMetricEvidenceFixtureCards, type ShadowMetricEvidenceFixtureCards } from "./metric-evidence-card-fixtures.js";

export interface ShadowMetricEvidenceMarkdownReport {
  readonly metricId: string;
  readonly fileName: string;
  readonly markdown: string;
  readonly shadowOnly: true;
  readonly publicApiAllowed: false;
  readonly liveRouteCreated: false;
}

export function renderShadowMetricEvidenceReportMarkdown(
  card: ShadowMetricEvidenceFixtureCards,
): ShadowMetricEvidenceMarkdownReport {
  const markdown = [
    `# ${card.metricId} Evidence Report`,
    "",
    "Generated from synthetic/local metric evidence fixtures.",
    "",
    "## Boundary",
    "",
    "- Lifecycle: SHADOW.",
    "- API exposure: INTERNAL.",
    "- Licensing: NOT_READY.",
    "- Public API allowed: false.",
    "- Live route created: false.",
    "- This report does not approve public content, API exposure, licensing, betting use, or production promotion.",
    "",
    "## Model Card",
    "",
    `- Status: ${card.modelCard.status}.`,
    `- Summary: ${card.modelCard.summary}`,
    "- Limitations:",
    ...card.modelCard.limitations.map((limitation) => `  - ${limitation}`),
    "- Evidence refs:",
    ...card.modelCard.evidenceRefs.map((ref) => `  - ${ref}`),
    "",
    "## Drift Card",
    "",
    `- Status: ${card.driftCard.status}.`,
    `- Drift score: ${card.driftCard.driftScore ?? "not supplied"}.`,
    "- Notes:",
    ...card.driftCard.notes.map((note) => `  - ${note}`),
    "- Evidence refs:",
    ...card.driftCard.evidenceRefs.map((ref) => `  - ${ref}`),
    "",
    "## Promotion Locks",
    "",
    "- No lifecycle promotion.",
    "- No public/API exposure.",
    "- No legal-clearance claim.",
    "- No production-readiness claim.",
    "- No probability, expected-value, pick, or betting-advice claim.",
    "",
  ].join("\n");

  return {
    fileName: `${card.metricId}.md`,
    liveRouteCreated: false,
    markdown,
    metricId: card.metricId,
    publicApiAllowed: false,
    shadowOnly: true,
  };
}

export function renderAllShadowMetricEvidenceReportsMarkdown(): readonly ShadowMetricEvidenceMarkdownReport[] {
  return generateAllShadowMetricEvidenceFixtureCards().map(renderShadowMetricEvidenceReportMarkdown);
}

export function renderShadowMetricEvidenceReportIndexMarkdown(): string {
  const reports = renderAllShadowMetricEvidenceReportsMarkdown();
  return [
    "# GSE Shadow Metric Evidence Reports",
    "",
    "Generated from synthetic/local evidence fixtures in `@sports/prediction-engine`.",
    "",
    "These reports are proof of local governance behavior only. They do not approve public content, API exposure, licensing, betting use, production promotion, or legal clearance.",
    "",
    "## Reports",
    "",
    ...reports.map((report) => `- ${report.metricId}: ${report.fileName}`),
    "",
    "## Shared Locks",
    "",
    "- Every report is shadow-only.",
    "- Every report keeps public API exposure disabled.",
    "- Every report keeps live route creation disabled.",
    "- Every report labels evidence as synthetic/local.",
    "",
  ].join("\n");
}
