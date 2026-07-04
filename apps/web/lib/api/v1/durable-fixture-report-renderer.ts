import type { ApiV1DurableFixtureReportArchive } from "./durable-fixture-report";

function status(value: boolean): string {
  return value ? "pass" : "fail";
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderApiV1DurableFixtureReportMarkdown(
  archive: ApiV1DurableFixtureReportArchive
): string {
  const checklistRows = archive.checklist
    .map(
      (item) =>
        `| \`${item.id}\` | ${status(item.passed)} | ${item.livePromotionBlocker ? "Yes" : "No"} | ${item.evidence} |`
    )
    .join("\n");

  const caseList = archive.fixture.caseIds.map((caseId) => `- \`${caseId}\``).join("\n");

  return [
    "# API v1 Durable Fixture Report",
    "",
    `Generated at: \`${archive.generatedAt}\``,
    "",
    "## Summary",
    "",
    `- Schema version: \`${archive.schemaVersion}\``,
    `- Status: \`${archive.status}\``,
    `- Live promotion allowed: \`${archive.livePromotionAllowed}\``,
    `- Fixture: \`${archive.fixture.fixtureId}\``,
    `- Fixture passed: \`${archive.fixture.passed}\``,
    `- Fixture operation count: \`${archive.fixture.operationCount}\``,
    `- Conformance adapter: \`${archive.conformance.adapterName}\``,
    `- Conformance passed: \`${archive.conformance.passed}\``,
    `- Conformance case count: \`${archive.conformance.caseCount}\``,
    "",
    "## Boundary",
    "",
    `- Route exposed: \`${archive.fixture.boundary.routeExposed}\``,
    `- Database touched: \`${archive.fixture.boundary.databaseTouched}\``,
    `- Provider called: \`${archive.fixture.boundary.providerCalled}\``,
    `- Executable: \`${archive.fixture.boundary.executable}\``,
    "",
    "## Fixture Cases",
    "",
    caseList,
    "",
    "## Checklist",
    "",
    "| Check | Result | Live blocker | Evidence |",
    "| --- | --- | --- | --- |",
    checklistRows,
    "",
    "## Promotion Blockers",
    "",
    bulletList(archive.promotionBlockers),
    "",
    "## Next Required Proof",
    "",
    bulletList(archive.nextRequiredProof),
    "",
    "This report is tracked shadow evidence only. It is not a live-readiness, legal-clearance, or production-readiness claim.",
    "",
  ].join("\n");
}
