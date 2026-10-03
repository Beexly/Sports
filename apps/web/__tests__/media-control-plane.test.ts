import { describe, expect, it } from "vitest";
import { readMediaControlPlane } from "@/lib/media/control-plane";

describe("media control plane", () => {
  it("defaults to a read-only, no-publish operating model", () => {
    const control = readMediaControlPlane({}, new Date("2026-06-05T00:00:00.000Z"));

    expect(control.generatedAt).toBe("2026-06-05T00:00:00.000Z");
    expect(control.summary.publicBlogEnabled).toBe(false);
    expect(control.summary.lanes).toBeGreaterThanOrEqual(6);
    expect(control.policy.autoPublishes).toBe(false);
    expect(control.policy.postsToSocial).toBe(false);
    expect(control.policy.sendsUserComms).toBe(false);
    expect(control.policy.exposesSecretValues).toBe(false);
    expect(control.policy.fabricatesReports).toBe(false);
  });

  it("tracks Airwave, Beat, Content, Studio, Blog, DB, and odds-backed lanes", () => {
    const control = readMediaControlPlane({}, new Date("2026-06-05T00:00:00.000Z"));
    const keys = control.lanes.map((lane) => lane.key);

    expect(keys).toEqual(expect.arrayContaining([
      "airwave-claims",
      "beat-wire",
      "content-drafts",
      "studio-assets",
      "public-blog",
      "legacy-media-queue",
      "odds-backed-briefs",
    ]));
  });

  it("only marks the public blog lane ready when the explicit gate is on", () => {
    const blocked = readMediaControlPlane({}, new Date("2026-06-05T00:00:00.000Z"));
    expect(blocked.lanes.find((lane) => lane.key === "public-blog")?.status).toBe("blocked");

    const open = readMediaControlPlane(
      { PUBLIC_BLOG_ENABLED: "true" },
      new Date("2026-06-05T00:00:00.000Z"),
    );
    expect(open.summary.publicBlogEnabled).toBe(true);
    expect(open.lanes.find((lane) => lane.key === "public-blog")?.status).toBe("ready");
  });

  it("summarizes content templates and source mesh without fabricating live rows", () => {
    const control = readMediaControlPlane({}, new Date("2026-06-05T00:00:00.000Z"));

    expect(control.templateSummary.total).toBeGreaterThan(0);
    expect(control.templateSummary.requiresResponsibleGaming).toBeGreaterThan(0);
    expect(control.sourceSummary.nationalInsidersSeeded).toBeGreaterThan(0);
    expect(control.sourceSummary.teamBeatDesks).toBe(32);
    expect(control.sourceSummary.teamBeatSlots).toBe(96);
  });
});
