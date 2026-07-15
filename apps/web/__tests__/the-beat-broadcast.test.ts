import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("The Beat — publication truth", () => {
  const page = read("app/the-beat/page.tsx");
  const ledger = read("components/news/the-beat.tsx");
  const studio = read("app/fantasy/studio/page.tsx");
  const nav = read("components/ui/nav.tsx");
  const mobileNav = read("components/ui/mobile-nav.tsx");
  const explainer = read("lib/explainers/registry.ts");
  const home = read("app/page.tsx");
  const deck = read("app/deck/page.tsx");

  it("withholds the illustrative broadcast from the public route", () => {
    expect(page).not.toContain("GalaxyBroadcast");
    expect(page).not.toContain("buildBroadcast");
    expect(page).not.toContain("On air");
    expect(page).not.toContain("live-dot");
  });

  it("routes public feed access through the publication policy boundary", () => {
    expect(page).toContain('NEWS_WIRE_PUBLICATION_APPROVED');
    expect(page).toContain('NEWS_RSS_APPROVED_FEED_IDS');
    expect(page).toContain("loadPublicWire");
    expect(page).not.toContain("NEWS_RSS_FEEDS");
  });

  it("renders an honest unavailable state while preserving the Signal Ledger", () => {
    expect(page).toContain("TheBeat");
    expect(page).toContain("The Signal Ledger");
    expect(ledger).toMatch(/No approved signal feed is published right now/i);
  });

  it("never falls back to the fictional demo wire on the public surface", () => {
    expect(ledger).not.toContain("DEMO_WIRE");
    expect(ledger).not.toMatch(/Sample feed/i);
  });

  it("keeps illustrative broadcast tooling behind an explicit admin gate", () => {
    expect(studio).toContain("buildBroadcast");
    expect(studio).toContain("StudioHost");
    expect(studio).toContain("isAdminSession");
    expect(studio).toContain("redirect");
    expect(nav).not.toContain('"/fantasy/studio"');
    expect(mobileNav).not.toContain('"/fantasy/studio"');
  });

  it("removes cinematic and watch-or-hear claims from public entry points", () => {
    expect(nav).not.toMatch(/cinematic broadcast/i);
    expect(mobileNav).not.toMatch(/cinematic broadcast/i);
    expect(explainer).not.toMatch(/Nova brings|instant it lands/i);
    expect(home).not.toMatch(/Watch The Beat/i);
    expect(deck).not.toMatch(/Hear The Beat/i);
  });
});
