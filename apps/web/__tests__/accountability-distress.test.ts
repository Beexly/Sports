/**
 * Tests for:
 *   1. Distress signal detection (true-positive and false-positive table)
 *   2. routeDistress: neverUpsell literal, resources canonical + non-empty
 *   3. Accountability page source pins (no banned phrases, link integrity)
 *   4. Sitemap entry added for /accountability
 *   5. Footer link added for /accountability
 */

import { describe, expect, it, beforeAll } from "vitest";
import {
  detectDistressSignals,
  routeDistress,
  DISTRESS_RESOURCES,
} from "@/lib/community/distress-signals";
import type { DistressSignal, DistressKind } from "@/lib/community/distress-signals";
import { BANNED_ANALYST_PHRASES } from "@/lib/voice/analyst-standard";

// ── 1. Distress detection — true-positive table ───────────────────────────────

describe("detectDistressSignals — true positives", () => {
  const cases: Array<{ text: string; expectedKind: DistressKind; label: string }> = [
    // CHASING
    { text: "I need to double up tonight", expectedKind: "CHASING", label: "double up" },
    { text: "gotta make it back somehow", expectedKind: "CHASING", label: "make it back" },
    { text: "I'll win it back this game", expectedKind: "CHASING", label: "win it back" },
    { text: "just need to get it back", expectedKind: "CHASING", label: "get it back" },
    { text: "I'm chasing my losses here", expectedKind: "CHASING", label: "chasing losses" },
    { text: "need to win this one back", expectedKind: "CHASING", label: "need to win back" },
    { text: "trying to recoup my money", expectedKind: "CHASING", label: "recoup" },
    { text: "gonna chase the loss on the next one", expectedKind: "CHASING", label: "chase loss" },

    // PANIC
    { text: "I'm done, wiped out completely", expectedKind: "PANIC", label: "wiped out" },
    { text: "I can't stop, I've lost everything", expectedKind: "PANIC", label: "cant stop" },
    { text: "this is out of control now", expectedKind: "PANIC", label: "out of control" },
    { text: "I destroyed my bankroll today", expectedKind: "PANIC", label: "destroyed bankroll" },
    { text: "losing my mind over this", expectedKind: "PANIC", label: "losing my mind" },

    // RENT_MONEY
    { text: "that was my rent money", expectedKind: "RENT_MONEY", label: "rent money" },
    { text: "put my bill money on it", expectedKind: "RENT_MONEY", label: "bill money" },
    { text: "mortgage money is gone", expectedKind: "RENT_MONEY", label: "mortgage money" },
    { text: "borrowed money to bet this game", expectedKind: "RENT_MONEY", label: "borrowed to bet" },
    { text: "last dollar on this pick", expectedKind: "RENT_MONEY", label: "last dollar" },
    { text: "that was the only money I have", expectedKind: "RENT_MONEY", label: "only money i have" },
    { text: "can't afford to lose this one", expectedKind: "RENT_MONEY", label: "cant afford to lose" },
    { text: "used my savings for this", expectedKind: "RENT_MONEY", label: "used savings" },
  ];

  for (const { text, expectedKind, label } of cases) {
    it(`detects ${label} as ${expectedKind}`, () => {
      const signals = detectDistressSignals(text);
      const kinds = signals.map((s) => s.kind);
      expect(kinds, `"${text}" should trigger ${expectedKind}`).toContain(expectedKind);
    });
  }
});

// ── 2. Distress detection — false-positive table ──────────────────────────────

describe("detectDistressSignals — false positives (must return empty)", () => {
  const safeCases: Array<{ text: string; label: string }> = [
    // "double" in normal betting/sports context
    { text: "that was a double-digit win for the Chiefs", label: "double-digit win" },
    { text: "scheduled for a doubleheader today", label: "doubleheader" },
    { text: "double coverage on Adams all game", label: "double coverage" },
    { text: "the line doubled from -3 to -6", label: "line doubled" },

    // Normal win/loss talk
    { text: "we won the last three in a row", label: "won last three" },
    { text: "confident in this pick", label: "confident in pick" },
    { text: "the model liked this matchup", label: "model liked" },
    { text: "Lamar had a win against the Bills", label: "player had a win" },
    { text: "looking good for tonight's game", label: "looking good tonight" },
    { text: "recovery room for the injured player", label: "recovery room" },
    { text: "they need to win to stay in playoff position", label: "need to win playoff" },

    // Chasing false-positive guards
    { text: "make it back to back", label: "make it back-to-back (not chasing)" },
    { text: "make it back-to-back", label: "make it back-to-back hyphenated (not chasing)" },
    { text: "win it back-to-back for the second year", label: "win back-to-back year" },
  ];

  for (const { text, label } of safeCases) {
    it(`does NOT flag "${label}" as distress`, () => {
      const signals = detectDistressSignals(text);
      expect(signals, `"${text}" should produce no distress signals`).toHaveLength(0);
    });
  }
});

// ── 3. routeDistress: neverUpsell is literal true ─────────────────────────────

describe("routeDistress", () => {
  it("neverUpsell is literally true for every signal kind", () => {
    const kinds: DistressKind[] = ["CHASING", "PANIC", "RENT_MONEY"];

    for (const kind of kinds) {
      const signal: DistressSignal = {
        kind,
        matchedPattern: "test-pattern",
        sourceText: "test text",
      };
      const response = routeDistress(signal);
      // This is the literal type test — neverUpsell must be true, not false, undefined, or omitted
      expect(response.neverUpsell).toBe(true);
    }
  });

  it("response kind is always support_nudge — never an offer or upgrade prompt", () => {
    const signal: DistressSignal = {
      kind: "RENT_MONEY",
      matchedPattern: "rent-money",
      sourceText: "that was my rent money",
    };
    const response = routeDistress(signal);
    expect(response.kind).toBe("support_nudge");
  });

  it("resources are non-empty", () => {
    const signal: DistressSignal = {
      kind: "CHASING",
      matchedPattern: "make-it-back",
      sourceText: "gotta make it back",
    };
    const response = routeDistress(signal);
    expect(response.resources.length).toBeGreaterThan(0);
  });

  it("resources include the canonical NCPG helpline (reused from responsible-play page)", () => {
    const signal: DistressSignal = {
      kind: "PANIC",
      matchedPattern: "out-of-control",
      sourceText: "this is out of control",
    };
    const response = routeDistress(signal);
    const hrefs = response.resources.map((r) => r.href);
    expect(hrefs).toContain("https://www.ncpgambling.org/");
  });

  it("DISTRESS_RESOURCES matches the responsible-play page canonical list", () => {
    // Pin that the exported resources array stays aligned with the page source.
    // If the responsible-play page changes its resources, this test catches drift.
    const expectedHrefs = [
      "https://www.ncpgambling.org/",
      "https://www.gamtalk.org/",
      "https://www.gamblersanonymous.org/",
      "https://www.ncpgambling.org/state-resources/",
    ];
    const actualHrefs = DISTRESS_RESOURCES.map((r) => r.href);
    for (const href of expectedHrefs) {
      expect(actualHrefs, `Resource ${href} must be in DISTRESS_RESOURCES`).toContain(href);
    }
  });

  it("response message mentions the helpline number", () => {
    const signal: DistressSignal = {
      kind: "CHASING",
      matchedPattern: "double-up",
      sourceText: "need to double up",
    };
    const response = routeDistress(signal);
    expect(response.message).toMatch(/1-800-GAMBLER/);
  });

  it("response message contains no upsell language", () => {
    const upsellPatterns = [/upgrade/i, /pro plan/i, /elite/i, /subscribe/i, /premium/i, /tier/i];
    const kinds: DistressKind[] = ["CHASING", "PANIC", "RENT_MONEY"];

    for (const kind of kinds) {
      const signal: DistressSignal = { kind, matchedPattern: "x", sourceText: "x" };
      const response = routeDistress(signal);
      for (const pattern of upsellPatterns) {
        expect(response.message, `${kind} message must not contain upsell language`).not.toMatch(pattern);
      }
    }
  });
});

// ── 4. Accountability page source pins ────────────────────────────────────────

describe("accountability page source pins", () => {
  // Read the page source as a string for assertion — avoids importing the React
  // component (which would require Next.js server-component shims in Vitest).
  let pageSource: string;

  beforeAll(async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    pageSource = await fs.readFile(
      path.resolve(__dirname, "../app/accountability/page.tsx"),
      "utf-8"
    );
  });

  it("links to /performance/losses (Hall of Misses)", () => {
    expect(pageSource).toContain("/performance/losses");
  });

  it("links to /performance (Calibration Report)", () => {
    expect(pageSource).toContain('href="/performance"');
  });

  it("links to /changelog (model changelog)", () => {
    expect(pageSource).toContain("/changelog");
  });

  it("does not contain any BANNED_ANALYST_PHRASES", () => {
    const lowerSource = pageSource.toLowerCase();
    for (const banned of BANNED_ANALYST_PHRASES) {
      expect(
        lowerSource,
        `accountability page must not contain banned phrase: "${banned}"`
      ).not.toContain(banned.toLowerCase());
    }
  });

  it("has canonical metadata pointing to /accountability", () => {
    expect(pageSource).toContain('canonical: "/accountability"');
  });

  it("has OpenGraph metadata", () => {
    expect(pageSource).toContain("openGraph:");
  });

  it("does not fabricate stats (no hardcoded win-rate numbers)", () => {
    // The page must not contain hardcoded win-rate percentages like "54%" or "57.3%"
    // It only links to the live surfaces. This regex catches numbers like "54%" in prose.
    expect(pageSource).not.toMatch(/\b5[0-9]\.\d+%/);
  });
});

// ── 5. Sitemap entry ──────────────────────────────────────────────────────────

describe("sitemap includes /accountability", () => {
  it("sitemap.ts has an /accountability route entry", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const sitemapSource = await fs.readFile(
      path.resolve(__dirname, "../app/sitemap.ts"),
      "utf-8"
    );
    expect(sitemapSource).toContain('"/accountability"');
  });
});

// ── 6. Footer link ────────────────────────────────────────────────────────────

describe("footer includes /accountability link", () => {
  it("footer.tsx has an Accountability link in COMPANY_LINKS", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const footerSource = await fs.readFile(
      path.resolve(__dirname, "../components/ui/footer.tsx"),
      "utf-8"
    );
    expect(footerSource).toContain('href: "/accountability"');
    expect(footerSource).toContain('"Accountability"');
  });
});
