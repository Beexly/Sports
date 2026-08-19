import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Freshness-truth coverage audit (P14-06).
 *
 * Each public surface that displays data-derived numbers must also render a
 * real as-of / freshness signal so readers can judge how fresh the underlying
 * data is. This test asserts the presence of those signals in source — a
 * surface that shows numbers but no freshness signal is a regression.
 *
 * Covered surfaces:
 *   /board  → data-testid="board-freshness" (Last refresh tile)
 *   /picks  → LineFreshnessBadge via data-testid="picks-freshness"
 *   /clv    → data-testid="clv-freshness" (Last graded timestamp)
 *   /proof  → data-testid="proof-freshness-stamp" (Board generated timestamp)
 *   / (home)→ data-testid="homepage-freshness" (Board data as-of)
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function readWeb(path: string): string {
  return readFileSync(resolve(repoRoot, "apps/web", path), "utf8");
}

describe("freshness-truth coverage audit", () => {
  describe("/board renders a freshness signal", () => {
    it("board page has a Last refresh StateTile with freshness data-testid", () => {
      const page = readWeb("app/board/page.tsx");
      expect(page).toContain("board-freshness");
      expect(page).toContain("Last refresh");
    });
  });

  describe("/picks renders a freshness signal", () => {
    it("picks page renders LineFreshnessBadge with a freshness data-testid", () => {
      const page = readWeb("app/picks/page.tsx");
      expect(page).toContain("data-testid=\"picks-freshness\"");
      expect(page).toContain("LineFreshnessBadge");
    });
  });

  describe("/clv renders a freshness signal", () => {
    it("clv page has a Last graded freshness stamp with data-testid", () => {
      const page = readWeb("app/clv/page.tsx");
      expect(page).toContain("data-testid=\"clv-freshness\"");
      expect(page).toContain("latestGradedAt");
    });
  });

  describe("/proof renders a freshness signal", () => {
    it("proof page has a freshness stamp with data-testid", () => {
      const page = readWeb("app/proof/page.tsx");
      expect(page).toContain("data-testid=\"proof-freshness-stamp\"");
      expect(page).toContain("Board generated");
    });
  });

  describe("/ (home) renders a freshness signal", () => {
    it("homepage passes lastRefresh to MethodologySection which renders a freshness stamp", () => {
      const page = readWeb("app/page.tsx");
      const section = readWeb("components/ui/methodology-section.tsx");
      expect(page).toContain("lastRefresh");
      expect(section).toContain("data-testid=\"homepage-freshness\"");
      expect(section).toContain("Board data as-of");
    });
  });

  describe("/about cadence claim audit", () => {
    it("/about page does not state an unenforced numeric cadence", () => {
      const page = readWeb("app/about/page.tsx");
      const banned = /30-?minute|every 30 min|every 30 minutes|30 minute/i;
      expect(page).not.toMatch(banned);
    });

    it("/faq page does not state an unenforced numeric cadence", () => {
      const page = readWeb("app/faq/page.tsx");
      const banned = /30-?minute|every 30 min|every 30 minutes|30 minute/i;
      expect(page).not.toMatch(banned);
    });

    it("/about uses the registry-approved non-numeric wording", () => {
      // The trust-claims registry deliberately refuses to bless a numeric
      // cadence. /about should use wording consistent with the APPROVED
      // methodology.odds-ingestion claim.
      const about = readWeb("app/about/page.tsx");
      expect(about).toContain("on a regular schedule");
      expect(about).not.toMatch(/on a 30-minute cadence|ingested on a 30-minute/i);
    });

    it("/faq uses the registry-approved non-numeric wording", () => {
      const faq = readWeb("app/faq/page.tsx");
      expect(faq).toContain("on a regular schedule");
      expect(faq).not.toMatch(/every 30 minutes|every 30 min|30-?minute refresh/i);
    });

    it("/pricing FAQ does not state an unenforced numeric cadence", () => {
      // P14-06 fixed the false-precision "30-minute refresh loop" cadence claim
      // on /about and /faq but left it on /pricing. The real schedule lives in
      // vercel.json as "*/15 * * * *" (every 15 minutes) and the trust-claims
      // registry (methodology.odds-ingestion) explicitly blesses NO numeric
      // cadence. This pin prevents the same unsupported figure from regressing.
      const pricing = readWeb("app/pricing/page.tsx");
      const banned = /30-?minute|every 30 min|every 30 minutes|30 minute/i;
      expect(pricing).not.toMatch(banned);
      expect(pricing).toContain("refreshed regularly during games");
    });
  });
});
