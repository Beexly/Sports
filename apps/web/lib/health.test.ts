import { describe, expect, it } from "vitest";
import { buildHealthReport } from "./health";

describe("health report", () => {
  it("builds a stable read-only service report", () => {
    expect(
      buildHealthReport(new Date("2026-05-23T00:00:00.000Z"), {
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_SHA: "abc123",
      }),
    ).toEqual({
      ok: true,
      service: "galaxy-sports-edge-web",
      checkedAt: "2026-05-23T00:00:00.000Z",
      environment: "preview",
      gitSha: "abc123",
    });
  });
});
