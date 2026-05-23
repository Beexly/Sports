import type { AdminRepairTask } from "./admin-repair-tasks";

export type IncidentSignal = {
  key: string;
  severity: "p0" | "p1";
  message: string;
};

export type IncidentEvaluationInput = {
  onboardingFailureRate: number;
  repairTasks: readonly AdminRepairTask[];
};

export function evaluateIncidentSignals(
  input: IncidentEvaluationInput,
): IncidentSignal[] {
  const signals: IncidentSignal[] = [];

  if (input.onboardingFailureRate > 0.05) {
    signals.push({
      key: "onboarding_failure_rate",
      severity: "p0",
      message: `Vault onboarding repair rate is ${(input.onboardingFailureRate * 100).toFixed(1)}%, above the 5.0% incident threshold.`,
    });
  }

  const p0RepairTasks = input.repairTasks.filter(
    (task) => task.severity === "p0",
  );

  if (p0RepairTasks.length > 0) {
    signals.push({
      key: "p0_repair_tasks",
      severity: "p0",
      message: `${p0RepairTasks.length} p0 repair task(s) require operator review.`,
    });
  }

  const staleProofSurfaceTasks = input.repairTasks.filter(
    (task) => task.source === "proof_surface_freshness",
  );

  if (staleProofSurfaceTasks.length > 0) {
    signals.push({
      key: "proof_surface_staleness",
      severity: "p1",
      message: `${staleProofSurfaceTasks.length} proof surface(s) are past the freshness window.`,
    });
  }

  return signals;
}
