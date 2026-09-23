import { describe, it, expect } from "vitest";
import type { QuoteLine } from "../types";
import {
  FREE_QUOTE_PRECEDENCE,
  citeAllowed,
  certifiableForLiveGate,
  earlierWins,
  isTierBOnly,
  tierIndex,
} from "../precedence";
import {
  buildSituationSnapshotFromQuotes,
  type FreeQuoteContribution,
} from "../situation-snapshot";

function line(
  partial: Partial<QuoteLine> &
    Pick<QuoteLine, "selection" | "q" | "sourceId" | "bookId">,
): QuoteLine {
  return {
    eventId: "evt-1",
    sport: "NFL",
    market: "h2h",
    quoteAsOf: "2026-09-23T18:00:00.000Z",
    sourceKind: "sportsbook_aggregator",
    rights: "api_tos",
    ...partial,
  };
}

function contrib(
  freeTier: FreeQuoteContribution["freeTier"],
  partial: Partial<QuoteLine> &
    Pick<QuoteLine, "selection" | "q" | "sourceId" | "bookId">,
): FreeQuoteContribution {
  return { freeTier, line: line(partial) };
}

describe("FREE_QUOTE_PRECEDENCE helpers", () => {
  it("ladder order is Rundown → … → Apify", () => {
    expect([...FREE_QUOTE_PRECEDENCE]).toEqual([
      "rundown",
      "sharp_x3",
      "odds_free",
      "parlay",
      "oddspapi",
      "apify",
    ]);
    expect(tierIndex("rundown")).toBeLessThan(tierIndex("apify"));
    expect(earlierWins("rundown", "apify")).toBe(true);
  });

  it("Apify is Tier-B only and never citeAllowed", () => {
    expect(isTierBOnly("apify")).toBe(true);
    expect(citeAllowed("apify")).toBe(false);
    expect(certifiableForLiveGate("apify")).toBe(false);
  });

  it("OddsPapi is not certifiableForLiveGate", () => {
    expect(citeAllowed("oddspapi")).toBe(true);
    expect(certifiableForLiveGate("oddspapi")).toBe(false);
  });
});

describe("buildSituationSnapshotFromQuotes — conflict", () => {
  it("Rundown vs Apify disagree → Rundown wins", () => {
    const snap = buildSituationSnapshotFromQuotes({
      eventId: "evt-1",
      sport: "NFL",
      contributions: [
        contrib("apify", {
          selection: "KC",
          q: 0.61,
          rawAmerican: -156,
          sourceId: "apify",
          bookId: "draftkings",
          quoteAsOf: "2026-09-23T18:00:00.000Z",
        }),
        contrib("rundown", {
          selection: "KC",
          q: 0.55,
          rawAmerican: -122,
          sourceId: "rundown",
          bookId: "draftkings",
          quoteAsOf: "2026-09-23T18:00:00.000Z",
        }),
      ],
    });

    expect(snap.tierBOnly).toBe(false);
    expect(snap.primaryTier).toBe("rundown");
    expect(snap.books).toHaveLength(1);
    expect(snap.books[0]!.bookId).toBe("draftkings");
    expect(snap.books[0]!.suppliedByTier).toBe("rundown");
    expect(snap.books[0]!.lines[0]!.q).toBeCloseTo(0.55);
    expect(snap.books[0]!.lines[0]!.sourceId).toBe("rundown");
    expect(snap.sourcesUsed).toContain("rundown");
    expect(snap.sourcesUsed).toContain("apify");
    expect(snap.citeEligibleSources).toContain("rundown");
    expect(snap.citeEligibleSources).not.toContain("apify");
    expect(
      snap.divergenceFlags?.some((f) => f.includes("conflict_earlier_wins")),
    ).toBe(true);
  });

  it("Apify-only → tierBOnly=true and citeEligibleSources=[]", () => {
    const snap = buildSituationSnapshotFromQuotes({
      eventId: "evt-1",
      sport: "NFL",
      contributions: [
        contrib("apify", {
          selection: "KC",
          q: 0.6,
          sourceId: "apify",
          bookId: "fanduel",
        }),
      ],
    });

    expect(snap.tierBOnly).toBe(true);
    expect(snap.primaryTier).toBeNull();
    expect(snap.citeEligibleSources).toEqual([]);
    expect(snap.sourcesUsed).toEqual(["apify"]);
    expect(snap.books[0]!.suppliedByTier).toBe("apify");
  });
});

describe("buildSituationSnapshotFromQuotes — gap fill", () => {
  it("missing book from higher tier filled by lower without overwrite", () => {
    const snap = buildSituationSnapshotFromQuotes({
      eventId: "evt-1",
      sport: "NFL",
      contributions: [
        contrib("rundown", {
          selection: "KC",
          q: 0.54,
          sourceId: "rundown",
          bookId: "draftkings",
        }),
        contrib("odds_free", {
          selection: "KC",
          q: 0.53,
          sourceId: "odds_free",
          bookId: "draftkings", // same book — must NOT overwrite Rundown
        }),
        contrib("odds_free", {
          selection: "KC",
          q: 0.52,
          sourceId: "odds_free",
          bookId: "betmgm", // gap — fill
        }),
      ],
    });

    const byId = Object.fromEntries(snap.books.map((b) => [b.bookId, b]));
    expect(byId.draftkings!.suppliedByTier).toBe("rundown");
    expect(byId.draftkings!.lines[0]!.q).toBeCloseTo(0.54);
    expect(byId.betmgm!.suppliedByTier).toBe("odds_free");
    expect(byId.betmgm!.lines[0]!.q).toBeCloseTo(0.52);
    expect(snap.primaryTier).toBe("rundown");
    expect(snap.tierBOnly).toBe(false);
  });
});

describe("buildSituationSnapshotFromQuotes — OddsPapi cite / live-gate", () => {
  it("OddsPapi never in citeEligibleSources for live-gate cert", () => {
    const snap = buildSituationSnapshotFromQuotes({
      eventId: "evt-1",
      sport: "NFL",
      contributions: [
        contrib("oddspapi", {
          selection: "KC",
          q: 0.57,
          sourceId: "oddspapi",
          bookId: "pinnacle",
        }),
        contrib("parlay", {
          selection: "BUF",
          q: 0.44,
          sourceId: "parlay",
          bookId: "draftkings",
        }),
      ],
    });

    expect(snap.sourcesUsed).toContain("oddspapi");
    expect(snap.citeEligibleSources).not.toContain("oddspapi");
    expect(certifiableForLiveGate("oddspapi")).toBe(false);
    // parlay is cite-eligible and live-gate certifiable on the free ladder
    expect(snap.citeEligibleSources).toContain("parlay");
  });

  it("never lets Apify alone set headline consensus when mixed with gaps", () => {
    const snap = buildSituationSnapshotFromQuotes({
      eventId: "evt-1",
      sport: "NFL",
      contributions: [
        contrib("sharp_x3", {
          selection: "KC",
          q: 0.56,
          sourceId: "sharp_x3",
          bookId: "pinnacle",
        }),
        contrib("apify", {
          selection: "KC",
          q: 0.7,
          sourceId: "apify",
          bookId: "pinnacle",
        }),
        contrib("apify", {
          selection: "KC",
          q: 0.5,
          sourceId: "apify",
          bookId: "caesars",
        }),
      ],
    });

    expect(snap.primaryTier).toBe("sharp_x3");
    expect(snap.tierBOnly).toBe(false);
    const pin = snap.books.find((b) => b.bookId === "pinnacle")!;
    expect(pin.lines[0]!.q).toBeCloseTo(0.56);
    expect(pin.suppliedByTier).toBe("sharp_x3");
    const caesars = snap.books.find((b) => b.bookId === "caesars")!;
    expect(caesars.suppliedByTier).toBe("apify");
    expect(snap.citeEligibleSources).not.toContain("apify");
  });
});
