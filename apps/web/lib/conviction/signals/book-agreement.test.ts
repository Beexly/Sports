import { describe, expect, it, vi } from "vitest";

import {
  MIN_BOOKMAKER_COVERAGE,
  MIN_DATA_QUALITY_SCORE,
} from "@/lib/board/pass-reason";
import type { GateCandidate } from "../gate-contract";
import { evaluateGate } from "../gate-contract";
import {
  CLEAR_DISAGREEMENT_PCT,
  DEEP_COVERAGE_BOOKS,
  FULL_COVERAGE_BOOKS,
  MAX_CONFIRMING_DISPERSION,
  STRONG_AGREEMENT_PCT,
  createBookAgreementSignal,
  type BookCoverage,
} from "./book-agreement";

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "game-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: "Seattle Seahawks",
    awayTeamName: "New England Patriots",
    commenceTime: new Date("2026-09-14T17:00:00Z"),
    pickType: "SPREAD",
    selection: "Seattle Seahawks -3.5",
    side: "home",
    line: -3.5,
    ...overrides,
  };
}

function coverage(overrides: Partial<BookCoverage> = {}): BookCoverage {
  return {
    bookmakerCount: 11,
    consensusPct: 0.82,
    dispersion: 0.02,
    dataQualityScore: 88,
    ...overrides,
  };
}

function signalFor(value: BookCoverage | null) {
  return createBookAgreementSignal({ loadCoverage: async () => value });
}

describe("book-agreement signal", () => {
  describe("silence — absent data is never evidence", () => {
    it("returns null when the loader has no coverage row", async () => {
      expect(await signalFor(null)(candidate())).toBeNull();
    });

    it("returns null when the side cannot be determined", async () => {
      const signal = signalFor(coverage());
      expect(await signal(candidate({ side: null }))).toBeNull();
    });

    it("returns null on a model-signal row with zero books", async () => {
      const signal = signalFor(coverage({ bookmakerCount: 0, consensusPct: null }));
      expect(await signal(candidate({ line: null }))).toBeNull();
    });

    it("returns null below MIN_BOOKMAKER_COVERAGE — a thin market is not disagreement", async () => {
      const signal = signalFor(
        coverage({ bookmakerCount: MIN_BOOKMAKER_COVERAGE - 1, consensusPct: 0.0 }),
      );
      expect(await signal(candidate())).toBeNull();
    });

    it("returns null when consensusPct is null even with deep coverage", async () => {
      const signal = signalFor(coverage({ bookmakerCount: 11, consensusPct: null }));
      expect(await signal(candidate())).toBeNull();
    });

    it("returns null when evidence health is below MIN_DATA_QUALITY_SCORE", async () => {
      const signal = signalFor(
        coverage({ dataQualityScore: MIN_DATA_QUALITY_SCORE - 1, consensusPct: 0.05 }),
      );
      expect(await signal(candidate())).toBeNull();
    });

    it("still reads when dataQualityScore is null (unscored is not unhealthy)", async () => {
      const signal = signalFor(coverage({ dataQualityScore: null }));
      const read = await signal(candidate());
      expect(read?.verdict).toBe("CONFIRMS");
    });

    it("a zero-book pick can never reach a verdict, only null", async () => {
      for (const pct of [0, 0.5, 1]) {
        const signal = signalFor(coverage({ bookmakerCount: 0, consensusPct: pct }));
        expect(await signal(candidate())).toBeNull();
      }
    });
  });

  describe("verdicts", () => {
    it("CONFIRMS on deep coverage with strong agreement", async () => {
      const signal = signalFor(
        coverage({ bookmakerCount: 11, consensusPct: 9 / 11, dispersion: 0.01 }),
      );
      const read = await signal(candidate());
      expect(read).not.toBeNull();
      expect(read?.verdict).toBe("CONFIRMS");
      expect(read?.key).toBe("book-agreement");
      expect(read?.reason).toBe("Nine of eleven books price this the way we do.");
    });

    it("CONTRADICTS when a deep book set is on the other side", async () => {
      const signal = signalFor(
        coverage({ bookmakerCount: 11, consensusPct: 3 / 11, dispersion: 0.01 }),
      );
      const read = await signal(candidate());
      expect(read?.verdict).toBe("CONTRADICTS");
      expect(read?.reason).toBe("Eight of eleven books are on the other side.");
    });

    it("NEUTRAL when coverage is adequate but agreement is middling", async () => {
      const signal = signalFor(coverage({ bookmakerCount: 10, consensusPct: 0.5 }));
      const read = await signal(candidate());
      expect(read?.verdict).toBe("NEUTRAL");
    });

    it("NEUTRAL at coverage above the market floor but below the deep band, even at extremes", async () => {
      for (const pct of [0.0, 1.0]) {
        const signal = signalFor(
          coverage({ bookmakerCount: DEEP_COVERAGE_BOOKS - 1, consensusPct: pct }),
        );
        const read = await signal(candidate());
        expect(read?.verdict).toBe("NEUTRAL");
      }
    });

    it("withdraws a confirmation to NEUTRAL when the books price it far apart", async () => {
      const signal = signalFor(
        coverage({ consensusPct: 0.9, dispersion: MAX_CONFIRMING_DISPERSION + 0.01 }),
      );
      const read = await signal(candidate());
      expect(read?.verdict).toBe("NEUTRAL");
    });

    it("dispersion never manufactures a confirmation out of a contradiction", async () => {
      const signal = signalFor(coverage({ consensusPct: 0.1, dispersion: 0.5 }));
      const read = await signal(candidate());
      expect(read?.verdict).toBe("CONTRADICTS");
    });

    it("exact band edges resolve to the stronger verdict", async () => {
      const confirms = signalFor(
        coverage({ bookmakerCount: DEEP_COVERAGE_BOOKS, consensusPct: STRONG_AGREEMENT_PCT }),
      );
      expect((await confirms(candidate()))?.verdict).toBe("CONFIRMS");

      const contradicts = signalFor(
        coverage({ bookmakerCount: DEEP_COVERAGE_BOOKS, consensusPct: CLEAR_DISAGREEMENT_PCT }),
      );
      expect((await contradicts(candidate()))?.verdict).toBe("CONTRADICTS");
    });
  });

  describe("read shape", () => {
    it("completeness scales with book count against full coverage and never exceeds 1", async () => {
      const partial = signalFor(coverage({ bookmakerCount: 6 }));
      expect((await partial(candidate()))?.completeness).toBeCloseTo(
        6 / FULL_COVERAGE_BOOKS,
        10,
      );

      const overfull = signalFor(coverage({ bookmakerCount: FULL_COVERAGE_BOOKS + 4 }));
      expect((await overfull(candidate()))?.completeness).toBe(1);
    });

    it("every read names a real basis and states a reason", async () => {
      for (const pct of [0.05, 0.5, 0.95]) {
        const read = await signalFor(coverage({ consensusPct: pct }))(candidate());
        expect(read?.basis).toContain("bookmakerCount");
        expect(read?.reason.length).toBeGreaterThan(0);
      }
    });

    it("reasons carry no house jargon", async () => {
      const banned = ["gate", "market depth", "publish threshold", "not evaluated"];
      for (const pct of [0.05, 0.5, 0.95]) {
        const read = await signalFor(
          coverage({ consensusPct: pct, dispersion: 0.2 }),
        )(candidate());
        const reason = (read?.reason ?? "").toLowerCase();
        for (const phrase of banned) expect(reason).not.toContain(phrase);
      }
    });

    it("passes the candidate's own gameId and pickType to the loader", async () => {
      const loadCoverage = vi.fn(async () => coverage());
      const signal = createBookAgreementSignal({ loadCoverage });
      await signal(candidate({ gameId: "game-42", pickType: "TOTAL", side: "over" }));
      expect(loadCoverage).toHaveBeenCalledWith("game-42", "TOTAL");
    });
  });

  describe("wired into the gate", () => {
    it("a contradicting book read holds the pick", async () => {
      const verdict = await evaluateGate(candidate(), [
        signalFor(coverage({ consensusPct: 0.1 })),
      ]);
      expect(verdict.publish).toBe(false);
      expect(verdict.contradictions).toBe(1);
    });

    it("a confirming book read publishes at the default minimum", async () => {
      const verdict = await evaluateGate(candidate(), [
        signalFor(coverage({ consensusPct: 0.9 })),
      ]);
      expect(verdict.publish).toBe(true);
    });

    it("a silent book read leaves the default gate a no-op", async () => {
      const verdict = await evaluateGate(candidate(), [signalFor(null)]);
      expect(verdict.publish).toBe(true);
      expect(verdict.reads).toHaveLength(0);
    });

    it("a loader that throws cannot hold the pick", async () => {
      const signal = createBookAgreementSignal({
        loadCoverage: async () => {
          throw new Error("odds table unavailable");
        },
      });
      const verdict = await evaluateGate(candidate(), [signal]);
      expect(verdict.publish).toBe(true);
    });
  });
});
