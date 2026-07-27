import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Pass List must not manufacture a judgement out of an absence.
 *
 * `/board`'s Pass List has TWO sources that render identically:
 *
 *   1. Real `gateDecision` rows — the model evaluated the game and declined.
 *      `decision.reason` is a genuine judgement and is passed through verbatim.
 *   2. A FALLBACK over `picks: { none: ... }` — games listed only because no
 *      published pick exists for them. Nothing evaluated these games.
 *
 * The UI frames both as "passes" ("Pass List", "Gated Today", "Scored,
 * published, and passed"), and a pass reads as a decision. So the fallback's
 * wording is load-bearing: it is the only thing preventing a game the generator
 * never reached from being published as a considered refusal.
 *
 * It previously said "No pick cleared the publish threshold" — asserting a
 * judgement that was never made. That is the collapse /board/gate teaches
 * against and the /integrity contrast claims we prevent. These tests pin the
 * distinction so it cannot regress into a confident-sounding string again.
 */

const gateDecisionFindMany = vi.fn();
const gameFindMany = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: (...a: unknown[]) => gateDecisionFindMany(...a) },
    game: { findMany: (...a: unknown[]) => gameFindMany(...a) },
  },
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ forceNoBetIfStale: false }),
  toEdgeIndex: (v: number | null) => v,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: async () => false,
}));

import { loadBoardPasses } from "@/lib/board/passes";

const NOW = new Date("2026-07-25T18:00:00.000Z");

/** A game with healthy inputs and simply no published pick. */
function game(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "game-1",
    awayTeamName: "Away",
    homeTeamName: "Home",
    sport: { name: "NFL" },
    currentEdgeIndex: 50,
    // Deliberately ABOVE both input floors, so neither named input deficiency
    // applies and the catch-all branch is the one under test.
    bookmakerCoverageMax: 8,
    dataQualityScore: 95,
    updatedAt: NOW,
    ...over,
  };
}

/** Language that asserts the model looked at the game and made a call. */
const JUDGEMENT_CLAIMS = [
  "cleared",
  "did not clear",
  "failed to clear",
  "fell short",
  "declined",
  "rejected",
  "we passed",
];

beforeEach(() => {
  gateDecisionFindMany.mockReset();
  gameFindMany.mockReset();
  // No real gate decisions today -> the fallback path is exercised.
  gateDecisionFindMany.mockResolvedValue([]);
});

describe("Pass List fallback — an absence is never reported as a judgement", () => {
  it("does NOT claim a threshold was missed when inputs were healthy", async () => {
    gameFindMany.mockResolvedValue([game()]);

    const result = await loadBoardPasses(NOW);
    const reason = result.data.passes[0]?.reason ?? "";

    expect(reason).toBeTruthy();
    for (const claim of JUDGEMENT_CLAIMS) {
      expect(
        reason.toLowerCase(),
        `fallback reason must not assert "${claim}": ${reason}`,
      ).not.toContain(claim);
    }
  });

  it("says plainly that the game was not evaluated", async () => {
    gameFindMany.mockResolvedValue([game()]);

    const result = await loadBoardPasses(NOW);
    const reason = result.data.passes[0]?.reason ?? "";

    // The same vocabulary /board/gate uses, deliberately. One distinction, one
    // set of words, across both surfaces.
    expect(reason.toLowerCase()).toContain("not evaluated");
  });

  it("still names a REAL input deficiency when one is observable", async () => {
    // Market depth is readable off the game row, so it is an honest statement
    // about why nothing could be priced — not a judgement about the game.
    gameFindMany.mockResolvedValue([game({ bookmakerCoverageMax: 1 })]);

    const result = await loadBoardPasses(NOW);
    expect(result.data.passes[0]?.reason).toBe("Market depth below publish threshold.");
  });

  it("names thin evidence health when that is the observable deficiency", async () => {
    gameFindMany.mockResolvedValue([game({ dataQualityScore: 12 })]);

    const result = await loadBoardPasses(NOW);
    expect(result.data.passes[0]?.reason).toBe("Evidence health below publish threshold.");
  });
});

describe("Pass List primary path — a real decision is passed through untouched", () => {
  it("uses the gate's own reason verbatim, never a synthesized one", async () => {
    // The distinction cuts both ways: a genuine refusal must NOT be softened
    // into "not evaluated" either. That would discard the product's best
    // evidence — a considered no — and under-claim just as badly.
    gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd-1",
        gameId: "game-1",
        status: "GATED",
        reason: "Consensus below publish threshold.",
        reasonCode: "CONSENSUS_BELOW_FLOOR",
        edgeIndex: 41,
        confidence: 38,
        modelVersion: "v5.1.0",
        evaluatedAt: NOW,
        evidenceRefs: [],
        game: {
          awayTeamName: "Away",
          homeTeamName: "Home",
          sport: { name: "NFL" },
          currentEdgeIndex: 41,
        },
      },
    ]);

    const result = await loadBoardPasses(NOW);
    expect(result.data.passes[0]?.reason).toBe("Consensus below publish threshold.");
    expect(result.data.passes[0]?.reason.toLowerCase()).not.toContain("not evaluated");
    // And the fallback query must not even run when real decisions exist.
    expect(gameFindMany).not.toHaveBeenCalled();
  });
});
