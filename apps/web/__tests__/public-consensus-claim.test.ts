/** T-1 tripwire: quantified bookmaker claims need exact, auditable evidence. */
import { describe, it, expect } from "vitest";
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  isBookmakerConsensusClaim,
  stableBookSetId,
} from "@/lib/claims/public-consensus-claim";

const NOW = new Date("2026-08-06T16:00:00.000Z");
const BOOKS = ["draftkings", "fanduel", "betmgm", "bovada", "pointsbet"];
const BOOK_SET = {
  books: BOOKS,
  sourceId: "snapshot-1",
  provider: "odds_api",
  capturedAt: "2026-08-04T16:00:00.000Z",
};

function claim(overrides: Partial<Parameters<typeof bindPublicConsensusClaim>[0]> = {}) {
  return bindPublicConsensusClaim(
    {
      reasoningShort: "100% bookmaker consensus on Kansas City Chiefs -5.5.",
      consensusPct: 1,
      bookmakerCount: BOOKS.length,
      dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
      consensusProvider: "odds_api",
      consensusSourceId: "snapshot-1",
      consensusBookSet: BOOK_SET,
      ...overrides,
    },
    NOW,
  );
}

describe("public consensus claim binder (T-1 tripwire)", () => {
  it("detects short and full quantified bookmaker wording", () => {
    for (const text of [
      "100% bookmaker consensus on Kansas City Chiefs -5.5.",
      "84% of bookmakers favor OVER 47.5.",
      "84% of bookmakers align UNDER 47.5.",
      "OVER 47.5 backed by 84% of 5 bookmakers.",
      "10/12 books in set books-v1-abcd favor OVER 47.5.",
      "All books in source set abcd12 align with UNDER 47.5.",
    ]) expect(isBookmakerConsensusClaim(text)).toBe(true);
    for (const text of ["Market and rest edges align.", "A model signal at 70%."]) {
      expect(isBookmakerConsensusClaim(text)).toBe(false);
    }
  });

  it("binds exact books, source, set id, and as-of time", () => {
    const bound = claim();
    expect(bound).not.toBeNull();
    expect(bound!.consensusProvider).toBe("odds_api");
    expect(bound!.consensusSourceId).toBe("snapshot-1");
    expect(bound!.consensusBooks).toEqual([...BOOKS].sort());
    expect(bound!.consensusBookSetId).toBe(stableBookSetId("odds_api", BOOKS));
    expect(bound!.consensusCapturedAt).toBe("2026-08-04T16:00:00.000Z");
    expect(consensusEvidenceCaption(bound!)).toContain("5 books");
    expect(consensusEvidenceCaption(bound!)).toContain("source odds_api (snapshot-1)");
    expect(consensusEvidenceCaption(bound!)).toContain("set books-v1-");
  });

  it("fails closed without provider, source id, or exact book set", () => {
    expect(claim({ consensusProvider: null })).toBeNull();
    expect(claim({ consensusSourceId: null })).toBeNull();
    expect(claim({ consensusBookSet: undefined, consensusBooks: null })).toBeNull();
    expect(claim({ consensusBookSet: { ...BOOK_SET, books: BOOKS.slice(0, 2) } })).toBeNull();
    expect(claim({ consensusBookSet: { ...BOOK_SET, sourceId: "" } })).toBeNull();
    expect(claim({ consensusBookSet: { ...BOOK_SET, provider: "other" } })).toBeNull();
  });

  it("refuses a count mismatch and a mismatched stable set id", () => {
    expect(claim({ bookmakerCount: 3 })).toBeNull();
    expect(claim({ consensusBookSetId: "books-v1-wrong" })).toBeNull();
  });

  it("refuses 100% unless the stored percentage is exactly 1", () => {
    expect(claim({ consensusPct: 0.5 })).toBeNull();
    expect(claim({ consensusPct: 1 })).not.toBeNull();
  });

  it("refuses ESPN-only, thin-fill, and non-book keys", () => {
    for (const consensusProvider of ["espn_public", "espn_public+therundown-thin", "the-odds-api+therundown-thin"]) {
      expect(claim({ consensusProvider, consensusBookSet: { ...BOOK_SET, provider: consensusProvider } })).toBeNull();
    }
    expect(claim({ consensusBookSet: { ...BOOK_SET, books: [...BOOKS.slice(0, 4), "rundown_default"] } })).toBeNull();
  });

  it("keeps the existing count, freshness, and percentage guards", () => {
    expect(claim({ bookmakerCount: 1 })).toBeNull();
    expect(claim({ dataFreshnessAt: null })).toBeNull();
    expect(claim({ consensusPct: 0 })).toBeNull();
    expect(claim({ consensusPct: 1.1 })).toBeNull();
  });
});

describe("public claim surface contract (T-1)", () => {
  it("all core public claim surfaces import the evidence binder and caption", async () => {
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
