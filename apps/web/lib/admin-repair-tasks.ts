import type { ProviderHeartbeat } from "./provider-heartbeats";
import type { ProofSurfaceFreshness } from "./proof-freshness";
import type { VaultLifecycleEmailDeliveryDecision } from "./vault/emails";
import type { VaultOnboardingHealth } from "./vault/onboarding-health";

export type AdminRepairTaskSource =
  | "vault_onboarding"
  | "provider_heartbeat"
  | "proof_surface_freshness"
  | "vault_lifecycle_email";

export type AdminRepairTask = {
  source: AdminRepairTaskSource;
  severity: "p0" | "p1" | "p2";
  title: string;
  entityKey: string;
  reason: string;
};

export function getOnboardingRepairTasks(
  health: VaultOnboardingHealth,
): AdminRepairTask[] {
  if (health.status !== "repair_required") {
    return [];
  }

  return health.missing
    .filter((step) => step.severity === "repair")
    .map((step) => ({
      source: "vault_onboarding",
      severity: "p0",
      title: `Repair Vault onboarding: ${step.step}`,
      entityKey: health.checkoutSessionId,
      reason: `${health.email} is missing ${step.step} ${health.ageMinutes} minutes after payment.`,
    }));
}

export function getProviderRepairTasks(
  heartbeats: readonly ProviderHeartbeat[],
): AdminRepairTask[] {
  return heartbeats
    .filter((heartbeat) => heartbeat.status !== "healthy")
    .map((heartbeat) => ({
      source: "provider_heartbeat",
      severity: heartbeat.status === "stale" ? "p0" : "p1",
      title: `Check provider: ${heartbeat.label}`,
      entityKey: heartbeat.key,
      reason:
        heartbeat.status === "stale"
          ? `${heartbeat.label} heartbeat is ${heartbeat.ageMinutes} minutes old.`
          : `${heartbeat.label} heartbeat is not configured.`,
    }));
}

export function getProofSurfaceRepairTasks(
  surfaces: readonly ProofSurfaceFreshness[],
): AdminRepairTask[] {
  return surfaces
    .filter((surface) => surface.status === "stale")
    .map((surface) => ({
      source: "proof_surface_freshness",
      severity: "p1",
      title: `Refresh proof surface: ${surface.label}`,
      entityKey: surface.surface,
      reason: `${surface.label} is ${surface.ageDays} days old; max stale window is ${surface.maxStaleDays} days.`,
    }));
}

export function getLifecycleEmailRepairTasks(
  decisions: readonly VaultLifecycleEmailDeliveryDecision[],
): AdminRepairTask[] {
  return decisions
    .filter((decision) => decision.status === "hold")
    .map((decision) => ({
      source: "vault_lifecycle_email",
      severity:
        decision.reason === "max_attempts_reached" ||
        decision.reason === "invalid_schedule" ||
        decision.reason === "unknown_template"
          ? "p1"
          : "p2",
      title: `Repair Vault lifecycle email: ${decision.templateId}`,
      entityKey: decision.lifecycleEmailId,
      reason: `Lifecycle email ${decision.lifecycleEmailId} is held because ${decision.reason}.`,
    }));
}
