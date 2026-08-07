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
    });
    expect(steps.length).toBeLessThanOrEqual(8);
  });
});
