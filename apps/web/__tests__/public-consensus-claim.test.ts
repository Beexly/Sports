/**
 * T-1 tripwire — consensus claims on public surfaces must carry source count
 * and a freshness timestamp in the same evidence structure, or not render.
 */
import { describe, it, expect } from "vitest";
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  isBookmakerConsensusClaim,
} from "@/lib/claims/public-consensus-claim";

const NOW = new Date("2026-08-06T16:00:00.000Z");

describe("public consensus claim binder (T-1 tripwire)", () => {
  it("detects quantified bookmaker-consensus teasers", () => {
    expect(
      isBookmakerConsensusClaim(
        "100% bookmaker consensus on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    expect(
      isBookmakerConsensusClaim("84% of bookmakers favor OVER 47.5."),
    ).toBe(true);
    expect(
      isBookmakerConsensusClaim("84% of bookmakers align UNDER 47.5."),
    ).toBe(true);
    expect(isBookmakerConsensusClaim("Market and rest edges align.")).toBe(false);
  });

  it("binds claim + book count + freshness together when provider resolved", () => {
    const bound = bindPublicConsensusClaim(
      {
        reasoningShort: "100% bookmaker consensus on Kansas City Chiefs -5.5.",
        consensusPct: 1,
        bookmakerCount: 5,
        dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
        consensusProvider: "therundown",
      },
      NOW,
    );
    expect(bound).not.toBeNull();
    expect(bound!.bookmakerCount).toBe(5);
    expect(bound!.ageHours).toBe(48);
    expect(bound!.claimText).toContain("100% bookmaker consensus");
    expect(consensusEvidenceCaption(bound!)).toMatch(/5 books/);
  });

  it("refuses to bind quantified claim when consensusProvider missing", () => {
    for (const consensusProvider of [undefined, null, "", "   "]) {
      expect(
        bindPublicConsensusClaim(
          {
            reasoningShort: "84% of bookmakers favor OVER 47.5.",
            consensusPct: 0.84,
            bookmakerCount: 4,
            dataFreshnessAt: NOW,
            consensusProvider,
          },
          NOW,
        ),
      ).toBeNull();
    }
  });

  it("binds quantified claim when consensusProvider is a good bookmaker source", () => {
    const bound = bindPublicConsensusClaim(
      {
        reasoningShort: "84% of bookmakers favor OVER 47.5.",
        consensusPct: 0.84,
        bookmakerCount: 3,
        dataFreshnessAt: NOW,
        consensusProvider: "odds_api",
      },
      NOW,
    );
    expect(bound).not.toBeNull();
    expect(bound!.bookmakerCount).toBe(3);
    expect(bound!.consensusPct).toBe(0.84);
  });

  it("refuses to bind without bookmakerCount ≥ 2", () => {
    expect(
      bindPublicConsensusClaim(
        {
          reasoningShort: "84% of bookmakers favor OVER 47.5.",
          consensusPct: 0.84,
          bookmakerCount: 1,
          dataFreshnessAt: NOW,
          consensusProvider: "therundown",
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("refuses to bind without dataFreshnessAt", () => {
    expect(
      bindPublicConsensusClaim(
        {
          reasoningShort: "100% bookmaker consensus on Chiefs -5.5.",
          consensusPct: 1,
          bookmakerCount: 4,
          dataFreshnessAt: null,
          consensusProvider: "therundown",
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("refuses to bind without a consensus teaser pattern", () => {
    expect(
      bindPublicConsensusClaim(
        {
          reasoningShort: "Rest advantage noted.",
          consensusPct: 0.8,
          bookmakerCount: 4,
          dataFreshnessAt: NOW,
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("refuses to bind a consensusPct outside (0,1]", () => {
    expect(
      bindPublicConsensusClaim(
        {
          reasoningShort: "100% bookmaker consensus on Chiefs -5.5.",
          consensusPct: 0,
          bookmakerCount: 4,
          dataFreshnessAt: NOW,
          consensusProvider: "therundown",
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("refuses ESPN-only and thin-fill provider evidence", () => {
    for (const consensusProvider of ["espn_public", "espn_public+therundown-thin"]) {
      expect(
        bindPublicConsensusClaim(
          {
            reasoningShort: "84% of bookmakers favor OVER 47.5.",
            consensusPct: 0.84,
            bookmakerCount: 2,
            dataFreshnessAt: NOW,
            consensusProvider,
          },
          NOW,
        ),
      ).toBeNull();
    }
  });
});

describe("public claim surface contract (T-1)", () => {
  it("all public claim surfaces import the evidence binder and caption", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const paths = [
      "../app/preview/[sport]/[slug]/page.tsx",
      "../app/picks/page.tsx",
      "../components/picks/pick-card.tsx",
      "../app/api/picks/route.ts",
    ];
    for (const path of paths) {
      const src = readFileSync(resolve(__dirname, path), "utf8");
      expect(src).toMatch(/bindPublicConsensusClaim/);
      expect(src).toMatch(/consensusEvidenceCaption/);
    }
  });
});
