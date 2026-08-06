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
  it("detects bookmaker-consensus teasers", () => {
    expect(
      isBookmakerConsensusClaim(
        "100% bookmaker consensus on Kansas City Chiefs -5.5.",
      ),
    ).toBe(true);
    expect(isBookmakerConsensusClaim("Market and rest edges align.")).toBe(false);
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
