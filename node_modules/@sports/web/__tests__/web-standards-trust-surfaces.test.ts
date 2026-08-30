import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("web standards trust surfaces (outside-the-box)", () => {
  it("ships security.txt route", () => {
    expect(
      existsSync(join(root, "app/.well-known/security.txt/route.ts")),
    ).toBe(true);
    const src = readFileSync(join(root, "app/.well-known/security.txt/route.ts"), "utf8");
    expect(src).toMatch(/hq@galaxysportsedge\.com/);
    expect(src).toMatch(/Expires:/);
  });

  it("ships honest ads.txt (no sellers)", () => {
    const src = readFileSync(join(root, "app/ads.txt/route.ts"), "utf8");
    expect(src.toLowerCase()).toMatch(/does not sell/);
  });

  it("manifest does not claim live odds cadence while board may be dark", () => {
    const manifest = readFileSync(join(root, "public/site.webmanifest"), "utf8");
    expect(manifest.toLowerCase()).not.toMatch(/every 30 minutes/);
    expect(manifest.toLowerCase()).not.toMatch(/live odds/);
  });

  it("layout advertises podcast + journal RSS", () => {
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/podcast\/feed\.xml/);
    expect(layout).toMatch(/journal\/rss\.xml/);
  });

  it("favicon.ico and apple-touch defaults redirect to brand marks", () => {
    expect(existsSync(join(root, "app/favicon.ico/route.ts"))).toBe(true);
    expect(existsSync(join(root, "app/apple-touch-icon.png/route.ts"))).toBe(true);
  });
});
