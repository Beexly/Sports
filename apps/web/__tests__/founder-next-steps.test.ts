import { describe, expect, it } from "vitest";
import { buildFounderNextSteps } from "@/lib/ops/founder-next-steps";

const base = {
  overduePending: 0,
  settlementHealth: "HEALTHY",
  freeLaneConfigured: true,
  claudeProvider: "auto",
  anyCloudConfigured: true,
  jynxAuto: true,
  statsPublic: false,
  canExposePublicPicks: false,
  podcastEpisodes: 2,
  newsletterIssues: 2,
  markerCount: 14,
  expectedMarkerFloor: 14,
};

describe("buildFounderNextSteps", () => {
  it("surfaces settlement overdue as P0", () => {
    const steps = buildFounderNextSteps({ ...base, overduePending: 12 });
    expect(steps[0]?.id).toBe("settle-overdue");
    expect(steps[0]?.priority).toBe("P0");
  });

  it("asks for free-lane + jynx when cash path", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeLaneConfigured: false,
      claudeProvider: "anthropic",
      jynxAuto: false,
      anyCloudConfigured: false,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    });
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("free-lane-env");
    expect(ids).toContain("jynx-auto-or-cloud");
  });

  it("still asks for cloud maps when an explicit provider is picked but unconfigured", () => {
    const steps = buildFounderNextSteps({
      ...base,
      claudeProvider: "bedrock",
      jynxAuto: false,
      anyCloudConfigured: false,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    });
    expect(steps.map((s) => s.id)).toContain("cloud-maps");
  });

  it("drops the credits ask once auto + a cloud are both live", () => {
    const ids = buildFounderNextSteps({
      ...base,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    }).map((s) => s.id);
    expect(ids).not.toContain("cloud-maps");
    expect(ids).not.toContain("jynx-auto-or-cloud");
  });

  it("flags redeploy when marker count lags", () => {
    const steps = buildFounderNextSteps({ ...base, markerCount: 10, expectedMarkerFloor: 14 });
    expect(steps.some((s) => s.id === "redeploy-main")).toBe(true);
  });

  it("does not nag StatKing dark hold (correct default, not a to-do)", () => {
    const ids = buildFounderNextSteps({
      ...base,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    }).map((s) => s.id);
    expect(ids).not.toContain("statking-dark-hold");
  });

  it("never returns more than 5 steps (low-noise founder queue)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      overduePending: 5,
      freeLaneConfigured: false,
      jynxAuto: false,
      claudeProvider: "anthropic",
      markerCount: 1,
      podcastEpisodes: 0,
      newsletterIssues: 0,
      canExposePublicPicks: true,
      statsPublic: true,
      freeSpinePresent: false,
      freeSpineCriticalGaps: 7,
      freeSpineRequireSpend: 3,
      includeOptionalAnalytics: true,
    });
    expect(steps.length).toBeLessThanOrEqual(5);
  });

  it("escalates missing Stripe secret over Dashboard audit", () => {
    const steps = buildFounderNextSteps({
      ...base,
      stripeSecretConfigured: false,
      webhookSecretConfigured: false,
    });
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("stripe-secret-env");
    expect(ids).not.toContain("stripe-webhook-audit");
  });

  it("suppresses webhook audit when live probe says GSE healthy", () => {
    const ids = buildFounderNextSteps({
      ...base,
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    }).map((s) => s.id);
    expect(ids).not.toContain("stripe-webhook-audit");
    expect(ids).not.toContain("stripe-webhook-gse-missing");
  });

  it("fires audit when enabled foreign hosts present", () => {
    const steps = buildFounderNextSteps({
      ...base,
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: true,
      stripeWebhookGseHealthy: false,
      stripeWebhookForeignHosts: ["lumeralabel.medusajs.app"],
    });
    const audit = steps.find((s) => s.id === "stripe-webhook-audit");
    expect(audit?.priority).toBe("P1");
    expect(audit?.action).toMatch(/medusajs/);
  });

  it("skips dual-path nag when gaps are pure odds paid-single (accepted architecture)", () => {
    const ids = buildFounderNextSteps({
      ...base,
      freeSpinePresent: true,
      freeSpineWithinSla: true,
      freeSpineCriticalGaps: 7,
      freeSpineRequireSpend: 7,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    }).map((s) => s.id);
    expect(ids).not.toContain("free-spine-dual-path-gaps");
  });

  it("surfaces dual-path when gaps are mixed (not pure mustSpend)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeSpinePresent: true,
      freeSpineWithinSla: true,
      freeSpineCriticalGaps: 4,
      freeSpineRequireSpend: 1,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    });
    expect(steps.map((s) => s.id)).toContain("free-spine-dual-path-gaps");
  });

  it("omits optional analytics unless requested", () => {
    const ids = buildFounderNextSteps({
      ...base,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    }).map((s) => s.id);
    expect(ids).not.toContain("analytics-optional");
  });

  it("seeds free-spine when snap absent (I3)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeSpinePresent: false,
      stripeWebhookProbed: true,
      stripeWebhookAuditRequired: false,
      stripeWebhookGseHealthy: true,
    });
    expect(steps.find((s) => s.id === "free-spine-seed")?.priority).toBe("P1");
  });
});
