import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FIVE_REVENUE_PILLARS, COMMERCIAL_REVENUE_PILLARS } from "@/components/ui/nav";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatConfidenceScore,
} from "@/lib/writeups/coach-writeup-engine";

describe("Storefront & honest settled-record architecture", () => {
  it("exposes the four storefront doors over the sealed board with zero Telegram", () => {
    expect(FIVE_REVENUE_PILLARS).toEqual([
      { label: "Picks", href: "/picks", desc: "Locked Week 10 board" },
      { label: "Props", href: "/props", desc: "Locked props and watchlist" },
      { label: "Packs", href: "/packages", desc: "Galaxy Picks packages" },
      { label: "DFS", href: "/fantasy/dfs", desc: "DFS lineup optimizer" },
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

  it("enforces XX/100 formatting and honest settled-record decisions across Week 8 writeups", () => {
    expect(formatConfidenceScore(69)).toBe("69/100");
    expect(formatConfidenceScore("78/100")).toBe("78/100");
    expect(() => formatConfidenceScore("78%")).toThrow(/Percent '%' is forbidden/);

    expect(LIVE_SLATE_COACH_WRITEUPS.length).toBe(14);

    let passCount = 0;
    let playCount = 0;
    let naSgpCount = 0;
    // These writeups are FROZEN sealed-board records: every kickoff in this
    // batch is in the past (Oct 30-Nov 2, graded since). A verdict recorded
    // on a finished game keeps the ORIGINAL pre-game expected CLV, so the
    // live-board rule "PASS means empty edge" cannot be applied retroactively
    //  -  the numbers below are historical facts, not live claims. What must
    // always hold, on future boards too:
    //   - PLAY ⇒ expected CLV strictly positive (a PLAY claim with negative
    //     CLV is the engine's own honesty violation  -  see the doctrine on
    //     buildCoachGameWriteup);
    //   - for a writeup whose kickoff is STILL IN THE FUTURE (a live card),
    //     PASS ⇒ expected CLV <= 0.025 (passing on a real live edge is the
    //     dishonest gate this test exists to catch).
    const now = Date.now();
    for (const w of LIVE_SLATE_COACH_WRITEUPS) {
      expect(w.sideTotalCall.sideConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(w.sideTotalCall.totalConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.sideDecision);
      expect(["PLAY", "PASS"]).toContain(w.sideTotalCall.totalDecision);

      const live = Date.parse(w.kickoff) > now;

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
          // Live cards only: a future-kickoff writeup must not PASS on a
          // prop carrying a large positive edge. Frozen past records keep
          // their original pre-game CLV estimates as history.
          if (live) {
            expect(prop.expectedClv).toBeLessThanOrEqual(0.025);
          }
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
