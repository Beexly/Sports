import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FIVE_REVENUE_PILLARS, COMMERCIAL_REVENUE_PILLARS } from "@/components/ui/nav";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatConfidenceScore,
} from "@/lib/writeups/coach-writeup-engine";

describe("Five-Pillar Storefront & Honest PASS Gate Architecture", () => {
  it("exposes exact 5 commercial pillars centered on GALAXY PICKS (PAID) and DFS with zero Telegram", () => {
    expect(FIVE_REVENUE_PILLARS).toEqual([
      { label: "GALAXY PICKS (PAID)", href: "/packages", desc: "This Week's Football Betting Packs" },
      { label: "Panthers @ Packers Pack", href: "/packages#tnf-all-in-pack", desc: "Carolina @ Green Bay Sunday Pack" },
      { label: "Sunday NFL Pack", href: "/packages#sunday-nfl-5pct-slate", desc: "Sunday Best Bets Pack" },
      { label: "DFS", href: "/fantasy/dfs", desc: "Daily Fantasy Lineup Optimizer" },
      { label: "All-Access Pass", href: "/packages#week8-all-access", desc: "Full Weekly All-Access Pass" },
    ]);
    expect(COMMERCIAL_REVENUE_PILLARS).toEqual(FIVE_REVENUE_PILLARS);
  });

  it("enforces zero third-party brand names or Telegram across catalog.ts, nav.tsx, mobile-nav.tsx, and footer.tsx", () => {
    const webRoot = resolve(__dirname, "..");
    const files = [
      "lib/packages/catalog.ts",
      "components/ui/nav.tsx",
      "components/ui/mobile-nav.tsx",
      "components/ui/footer.tsx",
    ];
    const forbiddenBrands = /\b(WagerTalk|OnlyFans|FTN|Circa|Pinnacle)\b/i;

    for (const relPath of files) {
      const content = readFileSync(resolve(webRoot, relPath), "utf8");
      expect(content, `${relPath} must not contain third-party brand names`).not.toMatch(
        forbiddenBrands,
      );
    }
    expect(JSON.stringify(LIVE_PACKAGE_CATALOG)).not.toMatch(forbiddenBrands);
  });

  it("enforces XX/100 confidence formatting and honest PLAY | PASS decisions across Week 8 writeups", () => {
    expect(formatConfidenceScore(69)).toBe("69/100");
    expect(formatConfidenceScore("78/100")).toBe("78/100");
    expect(() => formatConfidenceScore("78%")).toThrow(/Percent '%' is forbidden/);

    expect(LIVE_SLATE_COACH_WRITEUPS.length).toBe(14);

    let passCount = 0;
    let playCount = 0;
    let naSgpCount = 0;

    for (const w of LIVE_SLATE_COACH_WRITEUPS) {
      expect(w.sideTotalCall.sideConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(w.sideTotalCall.totalConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.sideDecision);
      expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.totalDecision);

      if (w.sideTotalCall.sideDecision === "PLAY") {
        expect(w.sideTotalCall.sideExpectedClv).toBeGreaterThan(0);
        playCount++;
      } else {
        passCount++;
      }

      if (w.sideTotalCall.totalDecision === "PLAY") {
        expect(w.sideTotalCall.totalExpectedClv).toBeGreaterThan(0);
        playCount++;
      } else {
        passCount++;
      }

      for (const prop of w.topProps) {
        expect(prop.confidence).toMatch(/^\d{1,3}\/100$/);
        expect(["PLAY", "PASS"]).toContain(prop.decision);
        if (prop.decision === "PLAY") {
          expect(prop.expectedClv).toBeGreaterThan(0);
          playCount++;
        } else {
          expect(prop.expectedClv).toBeLessThanOrEqual(0.025);
          passCount++;
        }
      }

      if (w.correlatedSgpTicket.correlationRationale.startsWith("PASS")) {
        expect(w.correlatedSgpTicket.fairOdds).toBe("n/a");
        expect(w.correlatedSgpTicket.marketOdds).toBe("n/a");
        naSgpCount++;
      }
    }

    expect(playCount).toBeGreaterThan(0);
    expect(passCount).toBeGreaterThan(0);
    expect(naSgpCount).toBeGreaterThan(0);
  });
});
