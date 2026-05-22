import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/cockpit/studio/generate/route.ts"),
  "utf8"
);

describe("Studio generation API route", () => {
  it("is admin-gated and Claude-configured", () => {
    expect(route).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(route).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(route).toContain('process.env["ANTHROPIC_API_KEY"]');
  });

  it("returns drafts only and exposes no external publisher", () => {
    expect(route).toContain("generateStudioAssetDraft");
    expect(route).toContain("autoPostEnabled");
    expect(route).not.toMatch(/publishToTwitter|postToSlack|sendgrid|mailchimp/i);
  });

  it("validates the template kind against Studio templates", () => {
    expect(route).toContain("getStudioTemplate");
    expect(route).toContain("invalid-request");
  });
});
