/**
 * T-1 tripwire — consensus claims on public surfaces must carry source count
 * and a freshness timestamp in the same evidence structure, or not render.
 */
import { describe, it, expect } from "vitest";
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  gateConsensusClaim,
  gateConsensusClaimText,
  isBookmakerConsensusClaim,
} from "@/lib/claims/public-consensus-claim";

const NOW = new Date("2026-08-06T16:00:00.000Z");

describe("public consensus claim binder (T-1 tripwire)", () => {
  it("detects bookmaker-consensus teasers", () => {
    expect(
      isBookmakerConsensusClaim(
        "100% bookmaker consensus on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    expect(isBookmakerConsensusClaim("Market and rest edges align.")).toBe(false);
  });

  it("ALSO detects the corrected spread wording, so the fix cannot un-gate the claim", () => {
    // The spread copy was corrected on 2026-09-13: consensusPct measures
    // agreement about WHICH TEAM IS FAVOURED, not about the line, and it is
    // pinned at 1.0 in practice. The new wording still asserts a fact about how
    // many books did something, so it must still carry evidence. If this arm is
    // ever dropped, every teaser minted from that day forward renders ungated.
    expect(
      isBookmakerConsensusClaim(
        "Every book pricing this game has Kansas City Chiefs favoured. We are on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    expect(
      isBookmakerConsensusClaim(
        "Most books pricing this game have Kansas City Chiefs favoured, though they are split. We are on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    // The withdrawn "N of M" form stays covered: reasoning is frozen
    // write-once, so any pick minted while that draft was live keeps it
    // forever and must still be gated.
    expect(
      isBookmakerConsensusClaim(
        "7 of 11 books pricing this game have Kansas City Chiefs favoured. We are on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    // Still not a consensus claim, so still not gated into the binder.
    expect(isBookmakerConsensusClaim("Market and rest edges align.")).toBe(false);
    expect(isBookmakerConsensusClaim("We are on Kansas City Chiefs -5.5.")).toBe(false);
  });

  it("binds the corrected wording to the same evidence the legacy wording needed", () => {
    const bound = bindPublicConsensusClaim(
      {
        reasoningShort:
          "Every book pricing this game has Kansas City Chiefs favoured. We are on Kansas City Chiefs -5.5.",
        consensusPct: 1,
        bookmakerCount: 11,
        dataFreshnessAt: new Date("2026-08-06T12:00:00.000Z"),
      },
      NOW,
    );
    expect(bound).not.toBeNull();
    expect(bound!.bookmakerCount).toBe(11);
    expect(consensusEvidenceCaption(bound!)).toMatch(/11 books/);
    // The teaser is never rewritten by the binder — it carries the claim as minted.
    expect(bound!.claimText).toContain("favoured");
    expect(bound!.claimText).not.toContain("bookmaker consensus");
  });

  it("binds claim + book count + freshness together", () => {
    const bound = bindPublicConsensusClaim(
      {
        reasoningShort: "100% bookmaker consensus on Kansas City Chiefs -5.5.",
        consensusPct: 1,
        bookmakerCount: 5,
        dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
      },
      NOW,
    );
    expect(bound).not.toBeNull();
    expect(bound!.bookmakerCount).toBe(5);
    expect(bound!.ageHours).toBe(48);
    expect(bound!.claimText).toContain("100% bookmaker consensus");
    expect(consensusEvidenceCaption(bound!)).toMatch(/5 books/);
  });

  it("refuses to bind without bookmakerCount ≥ 2", () => {
    expect(
      bindPublicConsensusClaim(
        {
          reasoningShort: "100% bookmaker consensus on Chiefs -5.5.",
          consensusPct: 1,
          bookmakerCount: 1,
          dataFreshnessAt: NOW,
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
        },
        NOW,
      ),
    ).toBeNull();
  });
});

describe("preview page contract (T-1)", () => {
  it("preview route imports the evidence binder (claim cannot render unbound)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(__dirname, "../app/preview/[sport]/[slug]/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/bindPublicConsensusClaim/);
    expect(src).toMatch(/consensusEvidenceCaption/);
  });
});

describe("gateConsensusClaimText — /api/picks server-side suppression (Devin, #819)", () => {
  // PickCard renders `reasoningShort` (and `reasoning`, which carries the same
  // lead clause for SPREAD picks) with no binder call at all. PublicPick also
  // does not carry consensusPct/bookmakerCount for a client-side check, so the
  // gate has to run in the API serializer against the Prisma row's own columns
  // before the string ever reaches the DTO.
  it("suppresses a consensus claim to '' when its evidence does not bind", () => {
    const claim =
      "Every book pricing this game has Kansas City Chiefs favoured. We are on Kansas City Chiefs -5.5.";
    expect(
      gateConsensusClaimText(claim, {
        consensusPct: 1,
        bookmakerCount: 1, // below MIN_BOOKMAKERS
        dataFreshnessAt: NOW,
      }, NOW),
    ).toBe("");
    expect(
      gateConsensusClaimText(claim, {
        consensusPct: 1,
        bookmakerCount: 5,
        dataFreshnessAt: null, // no freshness stamp
      }, NOW),
    ).toBe("");
  });

  it("renders a consensus claim verbatim, never rewritten, when it binds", () => {
    const claim =
      "100% bookmaker consensus on Kansas City Chiefs -5.5. Fair value: 61%.";
    expect(
      gateConsensusClaimText(claim, {
        consensusPct: 1,
        bookmakerCount: 5,
        dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
      }, NOW),
    ).toBe(claim);
  });

  it("negative control: an ordinary non-consensus teaser still renders as stored", () => {
    const teaser = "Rest advantage noted. We are on Kansas City Chiefs -5.5.";
    expect(
      gateConsensusClaimText(teaser, {
        consensusPct: 1,
        bookmakerCount: 0, // would fail the binder if this text were gated
        dataFreshnessAt: null,
      }, NOW),
    ).toBe(teaser);
  });

  it("/api/picks route wires the gate into both reasoning and reasoningShort", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "../app/api/picks/route.ts"), "utf8");
    // The viewer's DISPLAYED field (reasoning or reasoningShort, mirrored from
    // the entitlement branch below) is gated through gateConsensusClaim so its
    // evidence caption is available; reasoningShort is ALSO independently
    // gated on its own, since the API always returns it regardless of which
    // branch the viewer actually sees.
    expect(src).toMatch(/gatedDisplayedText\s*=\s*gateConsensusClaim\(/);
    expect(src).toMatch(/reasoning:\s*entitlements\.canSeeFactorBreakdown[\s\S]{0,40}gatedDisplayedText\.text/);
    expect(src).toMatch(/reasoningShort:\s*teaserForViewer\(\s*gateConsensusClaimText\(pick\.reasoningShort/);
    expect(src).toMatch(/consensusEvidenceCaption:\s*gatedDisplayedText\.evidenceCaption/);
  });
});

describe("gateConsensusClaim — returns the evidence caption a bound claim must render beside it (Devin Review, #819)", () => {
  it("returns the caption only when the claim binds", () => {
    const claim = "100% bookmaker consensus on Kansas City Chiefs -5.5.";
    const bound = gateConsensusClaim(claim, {
      consensusPct: 1,
      bookmakerCount: 5,
      dataFreshnessAt: new Date("2026-08-06T14:00:00.000Z"), // 2h before NOW
    }, NOW);
    expect(bound.text).toBe(claim);
    expect(bound.evidenceCaption).toBe("5 books · scored 2h ago");
  });

  it("suppresses both the text AND the caption when the claim cannot bind", () => {
    const claim = "100% bookmaker consensus on Kansas City Chiefs -5.5.";
    const unbound = gateConsensusClaim(claim, {
      consensusPct: 1,
      bookmakerCount: 1, // below MIN_BOOKMAKERS
      dataFreshnessAt: NOW,
    }, NOW);
    expect(unbound.text).toBe("");
    expect(unbound.evidenceCaption).toBeNull();
  });

  it("negative control: an ordinary non-consensus teaser has no caption", () => {
    const teaser = "Rest advantage noted. We are on Kansas City Chiefs -5.5.";
    const gated = gateConsensusClaim(teaser, {
      consensusPct: 1,
      bookmakerCount: 0,
      dataFreshnessAt: null,
    }, NOW);
    expect(gated.text).toBe(teaser);
    expect(gated.evidenceCaption).toBeNull();
  });

  it("gateConsensusClaimText is a thin wrapper — text always agrees with gateConsensusClaim", () => {
    const cases: Array<[string, { consensusPct: number; bookmakerCount: number; dataFreshnessAt: Date | null }]> = [
      ["100% bookmaker consensus on Chiefs -5.5.", { consensusPct: 1, bookmakerCount: 5, dataFreshnessAt: NOW }],
      ["100% bookmaker consensus on Chiefs -5.5.", { consensusPct: 1, bookmakerCount: 1, dataFreshnessAt: NOW }],
      ["Rest advantage noted.", { consensusPct: 1, bookmakerCount: 0, dataFreshnessAt: null }],
    ];
    for (const [text, evidence] of cases) {
      expect(gateConsensusClaimText(text, evidence, NOW)).toBe(gateConsensusClaim(text, evidence, NOW).text);
    }
  });
});

describe("PickCard renders the evidence caption beside a bound claim (Devin Review, #819)", () => {
  it("pick-card.tsx renders pick.consensusEvidenceCaption next to the reasoning text", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "../components/picks/pick-card.tsx"), "utf8");
    expect(src).toMatch(/pick\.consensusEvidenceCaption/);
  });
});
