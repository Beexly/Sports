import { describe, expect, it } from "vitest";

import {
  SOLO_SOURCE_STALENESS_MS,
  PRE_KICKOFF_WINDOW_MS,
  isSoloSourceElo,
  isStaleSoloSource,
  stalenessBlockers,
} from "../signal-staleness.js";

/**
 * The staleness gate's tests.
 *
 * The first case is not a hypothetical: it is the Chicago Bears ML row read
 * live out of production at 2026-09-28 19:00 UTC, ~15 minutes before kickoff.
 * It is pinned here as a regression specimen so the exact shape that shipped
 * stays blocked, and so "we added the gate" is a claim with a test behind it
 * rather than a comment in a doc.
 */

const KICKOFF = "2026-09-29T00:15:00.000Z";

/** The real row, verbatim from picks.factorBreakdown. */
const BEARS = {
  agreement: "SOLO",
  sources: ["elo"],
  bookPriced: false,
  generatedAt: "2026-09-28T16:07:11.662Z", // 8h07m48s before kickoff
  commenceTime: KICKOFF,
} as const;

describe("solo-source detection", () => {
  it("treats an elo-only source list as uncorroborated", () => {
    expect(isSoloSourceElo(BEARS)).toBe(true);
  });

  it("is not solo when a second source priced the edge", () => {
    expect(isSoloSourceElo({ ...BEARS, sources: ["elo", "qb_forward"] })).toBe(false);
  });

  it("is not solo when agreement is not SOLO", () => {
    expect(isSoloSourceElo({ ...BEARS, agreement: "MULTI" })).toBe(false);
  });

  it("is not solo when the row is book-priced", () => {
    // A fresh book price is a different observation than a fresh Elo. This gate
    // must not second-guess the book path.
    expect(isSoloSourceElo({ ...BEARS, bookPriced: true })).toBe(false);
  });

  it("ignores rows with no edge read at all", () => {
    // Not this gate's business. A PASS row or an unpriced row must not be
    // blocked here, or the gate becomes a reason good picks cannot ship.
    expect(isSoloSourceElo({ sources: [] })).toBe(false);
    expect(isSoloSourceElo({})).toBe(false);
  });
});

describe("the production row that motivated this gate", () => {
  it("BLOCKS the Bears ML row exactly as it shipped", () => {
    // The whole point. If this ever passes, the gate is not wired or not real.
    expect(isStaleSoloSource(BEARS)).toBe(true);
    expect(stalenessBlockers(BEARS)).toContain("solo_source_stale");
  });

  it("still identifies it as uncorroborated even while stale", () => {
    // The detection is still true; it is simply no longer a block on its own.
    expect(isSoloSourceElo(BEARS)).toBe(true);
  });

  it("measures that read as 8h07m48.338s old at kickoff", () => {
    const age = Date.parse(KICKOFF) - Date.parse("2026-09-28T16:07:11.662Z");
    // Measured, not asserted from memory: 8h 7m 48.338s.
    expect(age).toBe(29_268_338);
    expect(age).toBeGreaterThan(SOLO_SOURCE_STALENESS_MS);
    expect(age).toBeLessThan(PRE_KICKOFF_WINDOW_MS);
  });
});

describe("the boundary", () => {
  // `commenceTime` MUST be present here. Without it the gate measures against
  // the wall clock, which in a test is whenever the suite happens to run — that
  // is how a boundary test silently stops testing its boundary.
  const fresh = {
    agreement: "SOLO",
    sources: ["elo"],
    commenceTime: KICKOFF,
  } as const;

  it("allows a solo-source read generated moments before kickoff", () => {
    // A read this close to kickoff cannot have missed the lineup news window.
    const justBefore = new Date(Date.parse(KICKOFF) - 20 * 60_000).toISOString();
    expect(isStaleSoloSource({ ...fresh, generatedAt: justBefore })).toBe(false);
  });

  it("blocks once the read passes the staleness bound", () => {
    const tooOld = new Date(Date.parse(KICKOFF) - SOLO_SOURCE_STALENESS_MS - 60_000).toISOString();
    expect(isStaleSoloSource({ ...fresh, generatedAt: tooOld })).toBe(true);
  });

  it("ALLOWS a read made days ahead for a fixture weeks out", () => {
    // The regression my first cut shipped. Production 2026-09-28: pending signal
    // picks averaged 1,695 hours before their fixture, because that is how a
    // future board is built. An unconditional age bound vetoed all 158 of them,
    // which is a blackout, not a gate. Planning ahead is not staleness.
    const farFuture = new Date(Date.parse(KICKOFF) + 60 * 24 * 3_600_000).toISOString();
    const plannedAhead = new Date(Date.parse(farFuture) - 48 * 3_600_000).toISOString();
    expect(isStaleSoloSource({ ...fresh, commenceTime: farFuture, generatedAt: plannedAhead })).toBe(false);
  });

  it("blocks a read that is beyond the window entirely", () => {
    // Generated long before any pre-kickoff window exists for this fixture:
    // inside the window (fixture <12h away) AND past the bound.
    const ancient = new Date(Date.parse(KICKOFF) - SOLO_SOURCE_STALENESS_MS - 60 * 60_000).toISOString();
    expect(stalenessBlockers({ ...fresh, generatedAt: ancient })).toEqual(["solo_source_stale"]);
  });
});

describe("fail closed on unknown", () => {
  it("blocks when a solo-source read has no readable timestamp", () => {
    // "We could not measure it" must not read as "it is fine."
    const blockers = stalenessBlockers({ agreement: "SOLO", sources: ["elo"], generatedAt: null });
    expect(blockers).toContain("solo_source_age_unknown");
    expect(isStaleSoloSource({ agreement: "SOLO", sources: ["elo"] })).toBe(true);
  });

  it("blocks on an unparseable timestamp rather than passing it", () => {
    expect(
      isStaleSoloSource({ agreement: "SOLO", sources: ["elo"], generatedAt: "not-a-date" }),
    ).toBe(true);
  });

  it("still blocks when there is no kickoff time, measuring against now", () => {
    // A pick with no commenceTime is a pick we cannot schedule; measuring from
    // the wall clock is the only honest reference, and a 2024 row fails it.
    const blockers = stalenessBlockers({
      agreement: "SOLO",
      sources: ["elo"],
      generatedAt: "2024-09-01T00:00:00.000Z",
      commenceTime: null,
    });
    expect(blockers).toContain("stale_beyond_window");
  });
});

describe("what this gate deliberately does NOT do", () => {
  it("does not block a decision of PASS", () => {
    // PASS is the engine correctly declining to claim an edge. That is a pass
    // outcome, not a stale one. The v5.3.0 "never publish on PASS" rule is a
    // different rule and lives in the caller; merging them here would let an
    // edit satisfy one by breaking the other.
    const blockers = stalenessBlockers({
      agreement: "SOLO",
      sources: ["elo"],
      generatedAt: KICKOFF, // fresh, so nothing else trips either
      commenceTime: KICKOFF,
      decision: "PASS",
    } as never);
    expect(blockers).toEqual([]);
  });

  it("never returns PASS as a staleness blocker", () => {
    // Guards the type union against a future edit adding it.
    const all = stalenessBlockers({
      agreement: "SOLO",
      sources: ["elo"],
      generatedAt: null,
    });
    expect(all).not.toContain("pass" as never);
  });
});
