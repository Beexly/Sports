/**
 * DESTROY report runner — full council pass.
 */

import { buildCouncilSeats, severityRank } from "./seats";
import type {
  AuditSurface,
  DestroyFinding,
  DestroyReport,
  Severity,
} from "./types";
import { GSE_PUBLIC_CORPUS } from "./corpus";

export function emptyCounts(): Record<Severity, number> {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
}

export function runDestroyPass(
  surfaces: readonly AuditSurface[] = GSE_PUBLIC_CORPUS,
  opts?: { seats?: ReturnType<typeof buildCouncilSeats> },
): DestroyReport {
  const seats = opts?.seats ?? buildCouncilSeats();
  const findings: DestroyFinding[] = [];
  for (const seat of seats) {
    findings.push(...seat.audit(surfaces));
  }
  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const counts = emptyCounts();
  for (const f of findings) counts[f.severity] += 1;

  const criticalHigh = findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
  );
  const shipBlocked = findings.some((f) => f.shipBlock);

  const runId = `council_${Date.now().toString(36)}`;
  return {
    runId,
    asOf: new Date().toISOString(),
    surfacesAudited: surfaces.length,
    findings,
    counts,
    shipBlocked,
    criticalHigh,
    notes:
      "Default refuse. CRITICAL/HIGH must remediate before public ship. INFO residuals are honesty, not bugs.",
  };
}

export function formatDestroyReport(report: DestroyReport): string {
  const lines: string[] = [
    `# AI COUNCIL DESTROY REPORT ${report.runId}`,
    `asOf=${report.asOf}`,
    `surfaces=${report.surfacesAudited} shipBlocked=${report.shipBlocked}`,
    `CRITICAL=${report.counts.CRITICAL} HIGH=${report.counts.HIGH} MEDIUM=${report.counts.MEDIUM} LOW=${report.counts.LOW} INFO=${report.counts.INFO}`,
    "",
  ];
  for (const f of report.findings) {
    if (f.severity === "INFO") continue;
    lines.push(
      `[${f.seat}] ${f.severity}`,
      `Surface: ${f.surface}`,
      `Claim: ${f.claim}`,
      `Implied: ${f.impliedClaim}`,
      `Missing: ${f.evidenceMissing.join(", ") || "—"}`,
      `Pattern: ${f.regulationPattern}`,
      `Remediation: ${f.remediation}`,
      `Ship block: ${f.shipBlock ? "YES" : "NO"}`,
      "",
    );
  }
  return lines.join("\n");
}

/** Remediation plan: only CRITICAL/HIGH ship-blockers. */
export function remediationPlan(report: DestroyReport): {
  readonly actions: Array<{
    surface: string;
    action: string;
    severity: Severity;
  }>;
} {
  const actions = report.criticalHigh
    .filter((f) => f.shipBlock)
    .map((f) => ({
      surface: f.surface,
      action: f.remediation,
      severity: f.severity,
    }));
  return { actions };
}
