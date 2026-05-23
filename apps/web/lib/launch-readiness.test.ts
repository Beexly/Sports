import { describe, expect, it } from "vitest";
import { getVaultLaunchReadinessReport } from "./launch-readiness";
import type { EnvReadinessReport } from "./env-contract";
import type { ProviderHeartbeat } from "./provider-heartbeats";

const readyEnv: EnvReadinessReport = {
  ok: true,
  missing: [],
  items: [],
};

const healthyProviders: ProviderHeartbeat[] = [
  {
    key: "stripe_webhook",
    label: "Stripe webhook receipt",
    maxStaleMinutes: 60,
    lastOkAt: "2026-05-23T10:00:00.000Z",
    ageMinutes: 1,
    status: "healthy",
  },
];

describe("Vault launch readiness report", () => {
  it("reports ready when all launch signals are green", () => {
    expect(
      getVaultLaunchReadinessReport({
        env: readyEnv,
        providerHeartbeats: healthyProviders,
        openRepairTasks: [],
        docsAuditOk: true,
        productionSmokeOk: true,
      }),
    ).toEqual({
      status: "ready",
      blockers: [],
      warnings: [],
    });
  });

  it("blocks on missing env, failed audit, stale providers, failed smoke, and p0 repair tasks", () => {
    const report = getVaultLaunchReadinessReport({
      env: {
        ok: false,
        missing: [
          {
            name: "DATABASE_URL",
            category: "storage",
            requiredFor: "vault-launch",
            type: "secret",
            example: "set-in-vercel-only",
            purpose: "Durable storage.",
            present: false,
          },
        ],
        items: [],
      },
      providerHeartbeats: [
        {
          key: "discord_bot",
          label: "Discord bot permissions",
          maxStaleMinutes: 60,
          lastOkAt: null,
          ageMinutes: null,
          status: "unconfigured",
        },
      ],
      openRepairTasks: [
        {
          source: "vault_onboarding",
          severity: "p0",
          title: "Repair onboarding",
          entityKey: "cs_test",
          reason: "Missing Discord role.",
        },
      ],
      docsAuditOk: false,
      productionSmokeOk: false,
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers.map((issue) => issue.key)).toEqual([
      "missing_env",
      "docs_audit_failed",
      "production_smoke_failed",
      "provider_discord_bot",
      "p0_repair_tasks",
    ]);
  });

  it("warns when production smoke is not run or p1 tasks are open", () => {
    const report = getVaultLaunchReadinessReport({
      env: readyEnv,
      providerHeartbeats: healthyProviders,
      openRepairTasks: [
        {
          source: "proof_surface_freshness",
          severity: "p1",
          title: "Refresh proof surface",
          entityKey: "loss-room",
          reason: "Stale.",
        },
      ],
      docsAuditOk: true,
      productionSmokeOk: null,
    });

    expect(report.status).toBe("warning");
    expect(report.warnings.map((issue) => issue.key)).toEqual([
      "production_smoke_not_run",
      "p1_repair_tasks",
    ]);
  });
});
