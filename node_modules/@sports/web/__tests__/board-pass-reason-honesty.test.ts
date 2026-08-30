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
import {
  MIN_BOOKMAKER_COVERAGE,
  MIN_DATA_QUALITY_SCORE,
  unevaluatedPassReason,
} from "@/lib/board/pass-reason";

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

describe("both /board lanes tell ONE story about a game", () => {
  /**
   * The Pass List and Gated Today can render the same game on the same request.
   * They used to derive this wording independently and had already drifted:
   * passes.ts checked market depth AND evidence health, state.ts checked only
   * depth. A game with healthy books and poor evidence health therefore got two
   * different public reasons at once.
   *
   * Both now call `unevaluatedPassReason`, so the guarantee is structural. These
   * tests pin the shared function's contract directly — the thing a future edit
   * to either lane would have to go through.
   */
  it("names evidence health when depth is fine but evidence is thin", () => {
    // The exact case the two lanes disagreed on.
    expect(unevaluatedPassReason(8, MIN_DATA_QUALITY_SCORE - 1)).toBe(
      "Evidence health below publish threshold.",
    );
  });

  it("prefers the depth reason when BOTH deficiencies are present", () => {
    // Deterministic precedence: without a fixed order, the same game could be
    // described differently by two callers reading the same row.
    expect(unevaluatedPassReason(MIN_BOOKMAKER_COVERAGE - 1, MIN_DATA_QUALITY_SCORE - 1)).toBe(
      "Market depth below publish threshold.",
    );
  });

  it("falls through to 'not evaluated' only when both inputs are healthy", () => {
    expect(unevaluatedPassReason(MIN_BOOKMAKER_COVERAGE, MIN_DATA_QUALITY_SCORE)).toBe(
      "Not evaluated: no pick was generated for this game today.",
    );
  });

  it("never asserts a judgement in ANY branch", () => {
    // Every reachable output, swept. A future branch that reintroduces
    // threshold-clearing language fails here regardless of which lane added it.
    for (const [depth, quality] of [
      [0, 0],
      [1, 100],
      [8, 10],
      [8, 100],
      [MIN_BOOKMAKER_COVERAGE, MIN_DATA_QUALITY_SCORE],
    ] as const) {
      const reason = unevaluatedPassReason(depth, quality).toLowerCase();
      for (const claim of JUDGEMENT_CLAIMS) {
        expect(reason, `(${depth}, ${quality}) must not assert "${claim}"`).not.toContain(claim);
      }
    }
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
