import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("/cockpit/media", () => {
  const page = read("app/cockpit/media/page.tsx");
  const control = read("lib/media/control-plane.ts");

  it("renders a real media operating board, not a DB-only seed prompt", () => {
    expect(page).toMatch(/Media Operating Room/);
    expect(page).toMatch(/readMediaControlPlane/);
    expect(page).toMatch(/Workflow lanes/);
    expect(page).toMatch(/Template coverage/);
    expect(page).toMatch(/Source mesh/);
    expect(page).not.toMatch(/Seed the cockpit_media_items table to populate a demo state/);
  });

  it("reports DB reachability honestly instead of fabricating media rows", () => {
    expect(page).toMatch(/UNKNOWN \(no DB reachable\)/);
    expect(page).toMatch(/db\.cockpitMediaItem\.count/);
    expect(page).toMatch(/catch/);
    expect(page).toMatch(/not a prompt to seed demo content/);
  });

  it("links Media to the adjacent control surfaces and readiness JSON", () => {
    expect(page).toMatch(/href="\/api\/media\/readiness"/);
    expect(page).toMatch(/href="\/cockpit\/airwave"/);
    expect(page).toMatch(/href="\/cockpit\/studio"/);
    expect(page).toMatch(/href="\/cockpit\/content"/);
  });

  it("keeps the no-publish policy explicit in page and control model", () => {
    expect(page).toMatch(/No auto-publish/);
    expect(page).toMatch(/No social posting/);
    expect(control).toMatch(/autoPublishes: false/);
    expect(control).toMatch(/postsToSocial: false/);
    expect(control).toMatch(/fabricatesReports: false/);
  });
});
