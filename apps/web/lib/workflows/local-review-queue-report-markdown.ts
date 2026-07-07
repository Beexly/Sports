import type { LocalReviewQueueBlockerGroup, LocalReviewQueueBlockerReport } from "./local-review-queue-report";

function groupRows(groups: readonly LocalReviewQueueBlockerGroup[]): readonly string[] {
  return groups.map(
    (group) =>
      `| ${group.label} | ${group.packetCount} | ${group.blockerCount} | ${group.stalePacketCount} | ${group.nextAction} |`,
  );
}

export function renderLocalReviewQueueBlockerReportMarkdown(report: LocalReviewQueueBlockerReport): string {
  return [
    "# Local Review Queue Blocker Report",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Persistence mode: ${report.persistenceMode}`,
    `- Total packets: ${report.totalPackets}`,
    `- Unresolved packets: ${report.unresolvedPacketCount}`,
    `- Stale unresolved packets: ${report.staleUnresolvedPacketCount}`,
    "- Publish allowed: no",
    "- Route exposure allowed: no",
    "- External send allowed: no",
    "- Live integration allowed: no",
    "- Affiliate activation allowed: no",
    "- Sponsor approval automatic: no",
    "- Database writes allowed: no",
    "",
    "## By Queue Source",
    "",
    "| Source | Packets | Blockers | Stale | Next action |",
    "| --- | ---: | ---: | ---: | --- |",
    ...groupRows(report.byPacketSource),
    "",
    "## By Workflow Surface",
    "",
    "| Surface | Packets | Blockers | Stale | Next action |",
    "| --- | ---: | ---: | ---: | --- |",
    ...groupRows(report.byWorkflowSurface),
    "",
    "## By Source ID",
    "",
    "| Source ID | Packets | Blockers | Stale | Next action |",
    "| --- | ---: | ---: | ---: | --- |",
    ...groupRows(report.bySourceId),
    "",
    "## Priority Queue",
    "",
    "| Packet | Source | Surface | Status | Score | Blockers | Next action |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
    ...report.priorityQueue.map(
      (entry) =>
        `| ${entry.packetId} | ${entry.source} | ${entry.workflowSurface} | ${entry.status} | ${entry.priorityScore} | ${entry.blockerCount} | ${entry.nextAction} |`,
    ),
  ].join("\n");
}
