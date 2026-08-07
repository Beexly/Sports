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
    });
    const ids = steps.map((s) => s.id);
    // Half-finished explicit pick must not silently drop out of the queue.
    expect(ids).toContain("cloud-maps");
    expect(steps.find((s) => s.id === "cloud-maps")?.action).toMatch(/bedrock/i);
  });

  it("asks for cloud maps when auto is on but no cloud configured", () => {
    const steps = buildFounderNextSteps({ ...base, anyCloudConfigured: false });
    expect(steps.map((s) => s.id)).toContain("cloud-maps");
  });

  it("drops the credits ask once auto + a cloud are both live", () => {
    const ids = buildFounderNextSteps(base).map((s) => s.id);
    expect(ids).not.toContain("cloud-maps");
    expect(ids).not.toContain("jynx-auto-or-cloud");
  });

  it("flags redeploy when marker count lags", () => {
    const steps = buildFounderNextSteps({ ...base, markerCount: 10, expectedMarkerFloor: 14 });
    expect(steps.some((s) => s.id === "redeploy-main")).toBe(true);
  });

  it("holds StatKing dark as P2 when off", () => {
    const steps = buildFounderNextSteps(base);
    const sk = steps.find((s) => s.id === "statking-dark-hold");
    expect(sk?.priority).toBe("P2");
  });

  it("never returns more than 8 steps", () => {
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
    });
    expect(steps.length).toBeLessThanOrEqual(8);
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

  it("escalates missing webhook secret when secret is present", () => {
    const steps = buildFounderNextSteps({
      ...base,
      stripeSecretConfigured: true,
      webhookSecretConfigured: false,
    });
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("stripe-webhook-secret-env");
    expect(ids).not.toContain("stripe-webhook-audit");
  });

  it("keeps Dashboard webhook audit when secrets are configured", () => {
    const steps = buildFounderNextSteps({
      ...base,
      stripeSecretConfigured: true,
      webhookSecretConfigured: true,
    });
    expect(steps.map((s) => s.id)).toContain("stripe-webhook-audit");
  });

  it("seeds free-spine when snap absent (I3)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeSpinePresent: false,
    });
    const seed = steps.find((s) => s.id === "free-spine-seed");
    expect(seed?.priority).toBe("P1");
    expect(seed?.domain).toBe("free_lane");
  });

  it("flags free-spine stale past SLA (I8)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeSpinePresent: true,
      freeSpineWithinSla: false,
    });
    expect(steps.map((s) => s.id)).toContain("free-spine-stale");
    expect(steps.map((s) => s.id)).not.toContain("free-spine-seed");
  });

  it("surfaces dual-path critical gaps as P2 free_lane (never invent scores)", () => {
    const steps = buildFounderNextSteps({
      ...base,
      freeSpinePresent: true,
      freeSpineWithinSla: true,
      freeSpineCriticalGaps: 7,
      freeSpineRequireSpend: 2,
    });
    const gap = steps.find((s) => s.id === "free-spine-dual-path-gaps");
    expect(gap?.priority).toBe("P2");
    expect(gap?.action).toMatch(/7 critical/);
    expect(gap?.action).toMatch(/requireSpend/);
    expect(gap?.action).toMatch(/never invent/i);
  });

  it("omits free-spine steps when posture fields are unknown (backward compat)", () => {
    const ids = buildFounderNextSteps(base).map((s) => s.id);
    expect(ids).not.toContain("free-spine-seed");
    expect(ids).not.toContain("free-spine-stale");
    expect(ids).not.toContain("free-spine-dual-path-gaps");
  });

  it("skips dual-path step when criticalGaps is zero", () => {
    const ids = buildFounderNextSteps({
      ...base,
      freeSpinePresent: true,
      freeSpineWithinSla: true,
      freeSpineCriticalGaps: 0,
      freeSpineRequireSpend: 0,
    }).map((s) => s.id);
    expect(ids).not.toContain("free-spine-dual-path-gaps");
    expect(ids).not.toContain("free-spine-seed");
    expect(ids).not.toContain("free-spine-stale");
  });
});
