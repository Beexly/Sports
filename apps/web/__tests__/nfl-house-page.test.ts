import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Galaxy NFL House (/house) — the belonging layer over the intelligence
 * layer (docs/design/NFL_HOUSE_DOCTRINE.md). These tests pin the honesty
 * contract: every door opens onto a surface that actually exists, live
 * community is explicitly staged (never faked), the culture line is present,
 * and the copy obeys trust-safe rules.
 */

const ROOT = join(__dirname, "..");
const src = readFileSync(join(ROOT, "app/house/page.tsx"), "utf8");

describe("NFL House page", () => {
  it("every door points at a route that exists in the app", () => {
    const hrefs = [...src.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]!);
    // ASTRA A-6 collapsed House to FOUR doors — the dead Observatory door and
    // the staged Sunday Couch room are gone, and the page's own header quotes
    // the owner decision ("ONE House, not six rooms"). This asserted >= 6, so
    // it was holding the page to the layout that decision removed. Four is the
    // shipped shape; the loop below is the invariant that actually matters
    // (every door resolves to a real route — no dead links).
    expect(hrefs).toHaveLength(4);
    for (const href of hrefs) {
      const dir = join(ROOT, "app", href.replace(/^\//, ""));
      expect(
        existsSync(join(dir, "page.tsx")),
        `door ${href} has no page.tsx`,
      ).toBe(true);
    }
  });

  it("leads with belonging, carries the culture line and the promise triad", () => {
    // The belonging line is the h1, which FIELD rewrote to "One House. One
    // place to land." It is split across JSX spans in the source, so both
    // fragments are matched rather than one contiguous string.
    expect(src).toContain("One House.");
    expect(src).toContain("place to land.");
    expect(src).toContain("We do not force action. We protect decision quality.");
    expect(src).toContain("Understand the game · Read the market · Find your people");
  });

  it("stages live community honestly — no fake rooms, no fake counts", () => {
    // Was "Live rooms open when we can protect them." — PLURAL. ASTRA A-6 made
    // this singular on purpose ("we need to have ONE SINGLE CHAT... our
    // engagement is nowhere near to where we can have multiple rooms"), so the
    // retired wording asserted the opposite of the shipped decision.
    expect(src).toContain("One room, when we can keep it safe.");
    expect(src).toMatch(/moderation/);
    // No invented member/online counts anywhere on the page.
    expect(src).not.toMatch(/\d+[,.]?\d*\s*(members|fans|bettors|online|users)/i);
  });

  it("obeys trust-safe copy rules", () => {
    const lower = src.toLowerCase();
    for (const banned of [
      "guaranteed",
      "sure thing",
      "risk-free",
      "easy money",
      "can't lose",
      "free money",
      "verified track record",
      "trusted by serious bettors",
    ]) {
      expect(lower).not.toContain(banned);
    }
    // Bare "lock" is gate-scanned repo-wide; the page must not use it at all.
    expect(lower).not.toMatch(/\block\b/);
    // "AI" never appears on public surfaces (owner doctrine 10.5).
    expect(src).not.toMatch(/\bAI\b/);
  });

  it("uses world tokens, never raw palette classes", () => {
    const raw = src.match(
      /(?:text|bg|border|divide)-(?:gray|green|red|yellow|cyan|pink|blue|slate|zinc)-\d+/g,
    );
    expect(raw ?? []).toEqual([]);
  });

  it("is discoverable: canonical metadata and a sitemap entry", () => {
    expect(src).toContain('canonical: "/house"');
    const sitemap = readFileSync(join(ROOT, "app/sitemap.ts"), "utf8");
    expect(sitemap).toContain('"/house"');
  });
});
