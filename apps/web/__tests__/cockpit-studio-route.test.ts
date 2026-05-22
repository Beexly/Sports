import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/studio/page.tsx"), "utf8");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/studio/load.ts"), "utf8");
const runtime = fs.readFileSync(path.join(repoRoot, "apps/web/lib/studio/build-assets.ts"), "utf8");
const layout = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/layout.tsx"), "utf8");

describe("Galaxy Studio cockpit surface", () => {
  it("ships the operator route and sidebar entry", () => {
    expect(page).toContain("Galaxy Studio");
    expect(page).toContain("Creator Asset Workspace");
    expect(layout).toContain('href: "/cockpit/studio"');
  });

  it("loads Intelligence Graph nodes and template-backed draft packages", () => {
    expect(loader).toMatch(/buildStudioNode/);
    expect(loader).toMatch(/buildStudioDraftsForNode/);
    expect(runtime).toMatch(/STUDIO_TEMPLATES/);
    expect(runtime).toMatch(/getRulesForTemplate/);
  });

  it("keeps Studio manually exported with no external posting path", () => {
    expect(page).toContain("External publishing is intentionally absent.");
    expect(page).not.toMatch(/publishToTwitter|postToSlack|sendgrid|mailchimp/i);
    expect(runtime).not.toMatch(/publishToTwitter|postToSlack|sendgrid|mailchimp/i);
  });
});
