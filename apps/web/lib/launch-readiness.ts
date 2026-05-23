import type { AdminRepairTask } from "./admin-repair-tasks";
import type { EnvReadinessReport } from "./env-contract";
import type { ProviderHeartbeat } from "./provider-heartbeats";

export type LaunchReadinessIssue = {
  key: string;
  severity: "blocker" | "warning";
  message: string;
};

export type LaunchReadinessReport = {
  status: "ready" | "warning" | "blocked";
  blockers: LaunchReadinessIssue[];
  warnings: LaunchReadinessIssue[];
};

export type LaunchReadinessInput = {
  env: EnvReadinessReport;
  providerHeartbeats: readonly ProviderHeartbeat[];
  openRepairTasks: readonly AdminRepairTask[];
  docsAuditOk: boolean;
  productionSmokeOk?: boolean | null;
};

export function getVaultLaunchReadinessReport(
  input: LaunchReadinessInput,
): LaunchReadinessReport {
  const blockers: LaunchReadinessIssue[] = [];
  const warnings: LaunchReadinessIssue[] = [];

  if (!input.env.ok) {
    blockers.push({
      key: "missing_env",
      severity: "blocker",
      message: `${input.env.missing.length} launch environment variable(s) missing.`,
    });
  }

  if (!input.docsAuditOk) {
    blockers.push({
      key: "docs_audit_failed",
      severity: "blocker",
      message: "Launch audit script is not green.",
    });
  }

  if (input.productionSmokeOk === false) {
    blockers.push({
      key: "production_smoke_failed",
      severity: "blocker",
      message: "Production smoke failed.",
    });
  }

  if (input.productionSmokeOk === null || input.productionSmokeOk === undefined) {
    warnings.push({
      key: "production_smoke_not_run",
      severity: "warning",
      message: "Production smoke has not run against a confirmed hostname.",
    });
  }

  for (const heartbeat of input.providerHeartbeats) {
    if (heartbeat.status === "healthy") {
      continue;
    }

    blockers.push({
      key: `provider_${heartbeat.key}`,
      severity: "blocker",
      message:
        heartbeat.status === "stale"
          ? `${heartbeat.label} heartbeat is stale.`
          : `${heartbeat.label} heartbeat is unconfigured.`,
    });
  }

  const p0Tasks = input.openRepairTasks.filter((task) => task.severity === "p0");
  if (p0Tasks.length > 0) {
    blockers.push({
      key: "p0_repair_tasks",
      severity: "blocker",
      message: `${p0Tasks.length} p0 repair task(s) are open.`,
    });
  }

  const p1Tasks = input.openRepairTasks.filter((task) => task.severity === "p1");
  if (p1Tasks.length > 0) {
    warnings.push({
      key: "p1_repair_tasks",
      severity: "warning",
      message: `${p1Tasks.length} p1 repair task(s) are open.`,
    });
  }

  return {
    status:
      blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockers,
    warnings,
  };
}
