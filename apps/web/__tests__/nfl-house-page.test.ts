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
    // This asserted ">= 6" against a page that deliberately ships FOUR. House
    // was collapsed to four doors on purpose (ASTRA A-6, owner 2026-09-14: no
    // Observatory, no Sunday Couch), so the floor was pinning an IA the owner
    // had already retired, and it failed on the shipped page.
    //
    // Replaced with the exact set rather than a smaller number. A count floor
    // only catches doors going missing; the set also catches a door being
    // added quietly or repointed, so this is a stronger contract than the one
    // it replaces, not a relaxed one. Changing the IA means changing this
    // line, which is the point.
    expect(hrefs).toEqual(["/board", "/fantasy", "/performance", "/the-beat"]);
    for (const href of hrefs) {
      const dir = join(ROOT, "app", href.replace(/^\//, ""));
      expect(
        existsSync(join(dir, "page.tsx")),
        `door ${href} has no page.tsx`,
      ).toBe(true);
    }
  });

  it("leads with belonging, carries the culture line and the promise triad", () => {
    // The belonging line was rewritten with the rest of the page ("One House.
    // One place to land." plus the clarity promise); the retired sentence this
    // used to grep for has not shipped in some time. The CONTRACT is that the
    // hero sells belonging before odds and that the two doctrine lines are
    // present verbatim, so assert that against the copy that ships.
    // The h1 is split by a styled span ("One House. <span>One</span> place to
    // land."), so the headline is asserted as its two contiguous fragments.
    expect(src).toContain("One House.");
    expect(src).toContain("place to land.");
    expect(src).toContain("Come for clarity.");
    expect(src).toContain("We do not force action. We protect decision quality.");
    expect(src).toContain("Understand the game · Read the market · Find your people");
  });

  it("stages live community honestly — no fake rooms, no fake counts", () => {
    // Same rewrite: the room is staged as "one room, when we can keep it
    // safe", which is the same promise in the shipped words. What must not
    // drift is that the page says the room is NOT open yet and names the
    // safeguards it is waiting on, so pin those two facts.
    expect(src).toContain("One room, when we can keep it safe.");
    expect(src).toContain("A real game-day chat is not open yet.");
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
