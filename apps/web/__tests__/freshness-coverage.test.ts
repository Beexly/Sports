import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Freshness-truth coverage audit (P14-06).
 *
 * Each public surface that displays data-derived numbers must also render a
 * real as-of / freshness signal so readers can judge how fresh the underlying
 * data is. This test asserts the presence of those signals in source - a
 * surface that shows numbers but no freshness signal is a regression.
 *
 * REPOINTS (2026-11-04 board-cluster triage): the sealed-era redesign
 * changed which pages show data-derived numbers.
 *   /board  → NOW the under-construction stub: renders NO data-derived
 *             numbers, so no freshness signal is required or possible.
 *   /picks  → NOW the static sealed Week 8 locked card: its provenance
 *             signal is the seal digest, not a live LineFreshnessBadge
 *             (a live "last refresh" on a static card would be a
 *             fabrication - the exact dishonest-freshness shape this
 *             audit exists to kill).
 *   / (home)→ NOW the static RedlineWorld + responsible close: renders no
 *             board counts and passes no lastRefresh. The freshness stamp
 *             survives inside MethodologySection (rendered on /methodology,
 *             which actually receives lastRefresh), pinned below.
 *   /pricing→ NOW the under-construction static pack catalog with no FAQ
 *             and no cadence claim of any kind.
 * Prohibitions carried over: numbers never appear without provenance;
 * numeric cadence claims stay banned everywhere.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function readWeb(path: string): string {
  return readFileSync(resolve(repoRoot, "apps/web", path), "utf8");
}

describe("freshness-truth coverage audit", () => {
  describe("/board renders a freshness signal", () => {
    it("two-doctrines board delegates provenance to DoctrineBoardView + /record without fake live refresh copy", () => {
      const page = readWeb("app/board/page.tsx");
      expect(page).toContain("loadDoctrineBoard");
      expect(page).toContain("DoctrineBoardView");
      expect(page).toContain('href="/record"');
      expect(page).toContain('href="/board/gate"');
      expect(page).not.toContain("board-freshness");
      expect(page).not.toContain("Last refresh");
      expect(page).not.toContain("StateTile");
    });
  });

  describe("/picks renders a freshness signal", () => {
    it("renders verifiedLedger + DoctrineBoardView provenance instead of fake live refresh badges", () => {
      const page = readWeb("app/picks/page.tsx");
      expect(page).toContain("loadDoctrineBoard");
      expect(page).toContain("DoctrineBoardView");
      expect(page).toContain("verifiedLedger");
      expect(page).toContain('data-testid="verified-record-strip"');
      expect(page).toContain('href="/record"');
      expect(page).not.toContain("LineFreshnessBadge");
      expect(page).not.toContain("data-testid=\"picks-freshness\"");
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
    it("homepage renders no data freshness claim because it fetches no data", () => {
      // The static homepage (RedlineWorld + responsible close) loads no
      // board state and therefore shows no "as-of" stamp - an as-of claim
      // with no underlying fetch would be invented freshness. Its honesty
      // surface is the responsible close.
      const page = readWeb("app/page.tsx");
      expect(page).toContain('data-testid="homepage-responsible-close"');
      expect(page).not.toContain("lastRefresh");
      expect(page).not.toContain("Board data as-of");
      expect(page).not.toContain("loadBoardState");
    });

    it("methodology section keeps the CST-pinned freshness stamp for its real callers", () => {
      // MethodologySection is rendered on /methodology (not the homepage)
      // and still stamps lastRefresh in Central with a CT suffix whenever
      // a caller passes it. That pinned behavior is the surviving
      // freshness-stamp contract for the homepage-era surface.
      const section = readWeb("components/ui/methodology-section.tsx");
      const methodology = readWeb("app/methodology/page.tsx");
      expect(section).toContain("data-testid=\"homepage-freshness\"");
      expect(section).toContain("Board data as-of");
      expect(section).toContain("formatCentralTime");
      expect(methodology).toContain("MethodologySection");
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

    it("/pricing states no cadence or freshness claim of any kind", () => {
      // REPOINT (2026-11-04): /pricing is now the under-construction
      // static pack catalog - the FAQ (and its "refreshed regularly
      // during games" cadence line) no longer exists. A cadence claim on a
      // page with no live ingestion surface would be invented freshness,
      // so the prohibition tightens to: no refresh/cadence language at
      // all, and the numeric-cadence ban stays in force.
      const pricing = readWeb("app/pricing/page.tsx");
      const banned = /30-?minute|every 30 min|every 30 minutes|30 minute/i;
      expect(pricing).not.toMatch(banned);
      expect(pricing).not.toMatch(/refresh/i);
      expect(pricing).not.toContain("refreshed regularly during games");
      expect(pricing).toMatch(/under construction/i);
    });
  });
});
