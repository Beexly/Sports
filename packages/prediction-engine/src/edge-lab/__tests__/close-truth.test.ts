/**
 * CL4 · close-truth — de-vigged prop close + opener tests.
 *
 * H0 item 7 (doctrine C6.2 CL4): pure functions over ArchiveRow[] that produce
 * de-vigged prop close truths and per-book openers. Fail-closed on missing data.
 *
 * Tests cover:
 *  - priced: false invariant on every output
 *  - layer: "MARKET_PROP" invariant
 *  - Normal close: CLOSE-phase over+under rows paired, Shin devig, qOver extracted
 *  - Fallback: last row INTERIM (no CLOSE) → source "latest_pre_kickoff", truth still produced
 *  - One-sided book: under missing → refuse "one_sided"
 *  - Cycle mismatch: over at T, under at T+45min (tolerance 20min) → refuse "cycle_mismatch"
 *  - Rung mismatch: over line 5.5, under line 6.5 → refuse "rung_mismatch"
 *  - Bad price: price 50 (invalid American) → refuse "bad_price"
 *  - Sub-vig: overround < 1 → refuse "subvig_or_invalid"
 *  - Post-kickoff rows: never selected even when phase says CLOSE
 *  - Opener: ≠ phase OPEN — takes earliest row per book regardless of phase
 *  - American sign trap: -110/-110 → qOver ≈ 0.5, overround ≈ 1.048
 *  - Determinism: same input twice → deep-equal output; input not mutated
 *  - Non-prop market: skipped silently
 *  - No rows → refuse "no_rows"
 */
import { describe, expect, it } from "vitest";

import { americanToDecimal } from "../game-row.js";
import { shinDevig } from "../devig.js";
import {
  closeTruthForGame,
  openerTruthForGame,
  type ArchiveRow,
  type PropQuoteTruth,
  type QuoteRefusal,
} from "../close-truth.js";

const GAME_ID = "00-0030501-2_2024_03";
const COMMENCE = "2024-09-22T17:00:00Z";
const COMMENCE_MS = Date.parse(COMMENCE);

function row(o: Partial<ArchiveRow>): ArchiveRow {
  return {
    gameId: GAME_ID,
    capturedAt: "2024-09-20T12:00:00Z",
    phase: "CLOSE",
    book: "draftkings",
    market: "receptions|justin_jefferson",
    side: "over",
    price: -110,
    line: 6.5,
    source: "the-odds-api",
    ...o,
  };
}

describe("close-truth — priced:false invariant", () => {
  it("every truth carries priced: false", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    for (const t of result.truths) {
      expect(t.priced).toBe(false);
    }
  });

  it("every truth carries layer: MARKET_PROP", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    for (const t of result.truths) {
      expect(t.layer).toBe("MARKET_PROP");
    }
  });
});

describe("close-truth — normal close pairing", () => {
  it("CLOSE-phase over+under rows → truth with qOver and shinZ", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    const t = result.truths[0]!;
    expect(t.qOver).toBeCloseTo(0.5, 2); // -110/-110 → ~0.5
    expect(t.shinZ).toBeGreaterThanOrEqual(0);
    expect(t.shinZ).toBeLessThanOrEqual(1);
    expect(t.line).toBe(6.5);
    expect(t.source).toBe("phase_close");
    expect(t.family).toBe("receptions");
    expect(t.playerSlug).toBe("justin_jefferson");
    expect(t.gameId).toBe(GAME_ID);
    expect(t.market).toBe("receptions|justin_jefferson");
    expect(t.book).toBe("draftkings");
  });

  it("overround for -110/-110 ≈ 1.048", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5 }),
      row({ side: "under", price: -110, line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const dec = 1 + 100 / 110; // 1.9091
    const expectedOverround = 2 / dec;
    expect(result.truths[0]!.overround).toBeCloseTo(expectedOverround, 3);
  });
});

describe("close-truth — fallback to latest pre-kickoff", () => {
  it("last row INTERIM (no CLOSE) → source latest_pre_kickoff, truth still produced", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.source).toBe("latest_pre_kickoff");
  });

  it("prefers CLOSE over INTERIM when both exist", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T10:00:00Z" }),
      row({ side: "over", price: -130, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T10:00:00Z" }),
      row({ side: "under", price: +110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths[0]!.source).toBe("phase_close");
    // Should use the -130/+110 prices, not -110/-110
    const decOver = americanToDecimal(-130);
    const decUnder = americanToDecimal(110);
    const devigged = shinDevig([decOver!, decUnder!]);
    expect(result.truths[0]!.qOver).toBeCloseTo(devigged!.probs[0]!, 6);
  });
});

describe("close-truth — fail closed", () => {
  it("one-sided book (under missing) → refuse one_sided", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("one_sided");
  });

  it("cycle mismatch: over at T, under at T+45min (tolerance 20min) → refuse cycle_mismatch", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:45:00Z" }), // 45 min later
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("cycle_mismatch");
  });

  it("rung mismatch: over line 5.5, under line 6.5 → refuse rung_mismatch", () => {
    const rows = [
      row({ side: "over", price: -110, line: 5.5 }),
      row({ side: "under", price: -110, line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("rung_mismatch");
  });

  it("bad price: price 50 (invalid American) → refuse bad_price", () => {
    const rows = [
      row({ side: "over", price: 50, line: 6.5 }), // |50| < 100 → invalid
      row({ side: "under", price: -110, line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("bad_price");
  });

  it("sub-vig market → refuse subvig_or_invalid", () => {
    // Overround < 1: decimal odds that sum to < 1 imply probability > 1.
    // Use very large favorites: -10000/-10000 → dec = 1.01 each, overround = 2/1.01 ≈ 1.98 (too high).
    // Need overround < 1: need 1/d1 + 1/d2 < 1. E.g. d1=2.5, d2=2.5 → 0.4+0.4=0.8 < 1.
    // American: +150 → 2.5, +150 → 2.5.
    const rows = [
      row({ side: "over", price: +150, line: 6.5 }),
      row({ side: "under", price: +150, line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("subvig_or_invalid");
  });

  it("post-kickoff rows never selected even when phase says CLOSE", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-22T18:00:00Z" }), // after kickoff
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-22T18:00:00Z" }), // after kickoff
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // No pre-kickoff rows → after_kickoff_only
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("after_kickoff_only");
  });

  it("no rows → refuse no_rows", () => {
    const result = closeTruthForGame({ rows: [], gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("no_rows");
  });
});

describe("close-truth — opener ≠ phase OPEN", () => {
  it("opener takes earliest row per book regardless of phase (not OPEN)", () => {
    const rows = [
      // Book A: OPEN at T1, INTERIM at T2, CLOSE at T3 — all same cycle
      row({ book: "draftkings", side: "over", price: -120, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "receptions|justin_jefferson" }),
      row({ book: "draftkings", side: "over", price: -115, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T11:01:00Z", market: "receptions|justin_jefferson" }),
      row({ book: "draftkings", side: "over", price: -118, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T11:02:00Z", market: "receptions|justin_jefferson" }),
      row({ book: "draftkings", side: "under", price: -100, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "receptions|justin_jefferson" }),
      row({ book: "draftkings", side: "under", price: -105, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-20T11:01:00Z", market: "receptions|justin_jefferson" }),
    ];
    const result = openerTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.source).toBe("earliest_row");
    // Over: earliest is OPEN (-120), under: earliest is OPEN (-100)
    expect(result.truths[0]!.qOver).toBeCloseTo(0.5227, 3);
  });

  it("opener on book B whose earliest row is INTERIM (game OPEN is book A)", () => {
    const rows = [
      // Book A: OPEN
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-18T10:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-18T10:00:00Z" }),
      // Book B: earliest is INTERIM (no OPEN row)
      row({ book: "fanduel", side: "over", price: -115, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-19T10:00:00Z" }),
      row({ book: "fanduel", side: "under", price: -105, line: 6.5, phase: "INTERIM", capturedAt: "2024-09-19T10:00:00Z" }),
    ];
    const result = openerTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(2); // one per book
    expect(result.truths[0]!.source).toBe("earliest_row");
    expect(result.truths[1]!.source).toBe("earliest_row");
  });
});

describe("close-truth — non-prop markets skipped", () => {
  it("SPREAD market skipped silently (not a prop, no refuse)", () => {
    const rows = [
      row({ side: "over", price: -110, market: "SPREAD" }),
      row({ side: "under", price: -110, market: "SPREAD" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(0);
    expect(result.refusals).toHaveLength(0);
  });

  it("malformed prop market (multiple pipes) → refuse not_a_prop_market", () => {
    const rows = [
      row({ side: "over", price: -110, market: "receptions|player|extra", line: 6.5 }),
      row({ side: "under", price: -110, market: "receptions|player|extra", line: 6.5 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.refuse).toBe("not_a_prop_market");
  });
});

describe("close-truth — American sign trap", () => {
  it("-110/-110 → qOver ≈ 0.5", () => {
    const rows = [
      row({ side: "over", price: -110 }),
      row({ side: "under", price: -110 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths[0]!.qOver).toBeCloseTo(0.5, 2);
  });

  it("+100/-120 mixed signs handled", () => {
    const rows = [
      row({ side: "over", price: +100 }),
      row({ side: "under", price: -120 }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // Manually compute: dec = [2.0, 1+100/120=1.8333], shin devig, qOver = probs[0]
    const dec = [americanToDecimal(100), americanToDecimal(-120)];
    const devigged = shinDevig([dec[0]!, dec[1]!]);
    expect(result.truths[0]!.qOver).toBeCloseTo(devigged!.probs[0]!, 6);
  });
});

describe("close-truth — determinism / idempotence", () => {
  it("same input twice → deep-equal output", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const r1 = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    const r2 = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(r1).toEqual(r2);
  });

  it("input array not mutated (frozen)", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const frozen = Object.freeze([...rows]);
    closeTruthForGame({ rows: frozen, gameId: GAME_ID, commenceTime: COMMENCE });
    // Input order unchanged
    expect(frozen).toEqual([
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ]);
  });
});

describe("close-truth — batch: one bad row drops, good rows bind", () => {
  it("two markets, one one-sided, one good", () => {
    const rows = [
      // Market 1: complete
      row({ side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", market: "receptions|justin_jefferson" }),
      row({ side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", market: "receptions|justin_jefferson" }),
      // Market 2: one-sided (over only)
      row({ side: "over", price: -120, line: 4.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", market: "rush_yards|travis_kelce" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1); // only market 1
    expect(result.refusals).toHaveLength(1); // market 2 refused
    expect(result.refusals[0]!.market).toBe("rush_yards|travis_kelce");
    expect(result.refusals[0]!.refuse).toBe("one_sided");
  });
});

describe("close-truth — opener/close with special characters", () => {
  it("opener preserves apostrophe + unicode in player slug (o'brien-josé)", () => {
    const rows = [
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "receptions|o'brien-josé" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "receptions|o'brien-josé" }),
    ];
    const result = openerTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.family).toBe("receptions");
    expect(result.truths[0]!.playerSlug).toBe("o'brien-josé");
    expect(result.truths[0]!.market).toBe("receptions|o'brien-josé");
    // -110/-110 devig must be unaffected by the special-char slug.
    expect(result.truths[0]!.qOver).toBeCloseTo(0.5, 2);
  });

  it("close preserves book name with special chars (hyphen, digit, underscore)", () => {
    const rows = [
      row({ book: "draft-kings_2024", side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draft-kings_2024", side: "under", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.book).toBe("draft-kings_2024");
    expect(result.truths[0]!.source).toBe("phase_close");
  });

  it("opener + close carry gameId with special chars (spaces, #, parens, @)", () => {
    const gid = "NFL 2024 #00-0030501 (H@A)";
    const rows = [
      row({ book: "fanduel", side: "over", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", gameId: gid }),
      row({ book: "fanduel", side: "under", price: -100, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", gameId: gid }),
    ];
    const opener = openerTruthForGame({ rows, gameId: gid, commenceTime: COMMENCE });
    expect(opener.ok).toBe(true);
    if (!opener.ok) throw new Error("expected ok");
    expect(opener.truths).toHaveLength(1);
    expect(opener.truths[0]!.gameId).toBe(gid);
    expect(opener.truths[0]!.book).toBe("fanduel");

    // Same rows shifted to CLOSE phase — gameId still threads through to the close truth.
    const closeRows: ArchiveRow[] = [
      row({ book: "fanduel", side: "over", price: -110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", gameId: gid }),
      row({ book: "fanduel", side: "under", price: -100, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", gameId: gid }),
    ];
    const closer = closeTruthForGame({ rows: closeRows, gameId: gid, commenceTime: COMMENCE });
    expect(closer.ok).toBe(true);
    if (!closer.ok) throw new Error("expected ok");
    expect(closer.truths).toHaveLength(1);
    expect(closer.truths[0]!.gameId).toBe(gid);
    expect(closer.truths[0]!.source).toBe("phase_close");
  });

  it("opener decodes family oddsApiKey with special chars (hyphens, underscores, digits)", () => {
    const rows = [
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "pass_yards_2024-qb|ja'marr-chase" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, phase: "OPEN", capturedAt: "2024-09-20T11:00:00Z", market: "pass_yards_2024-qb|ja'marr-chase" }),
    ];
    const result = openerTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.family).toBe("pass_yards_2024-qb");
    expect(result.truths[0]!.playerSlug).toBe("ja'marr-chase");
    expect(result.truths[0]!.market).toBe("pass_yards_2024-qb|ja'marr-chase");
    // -110/-110 devig unaffected by special chars in family/slug.
    expect(result.truths[0]!.qOver).toBeCloseTo(0.5, 2);
  });

  it("close computes correct qOver for special-char market via Shin devig (manual match)", () => {
    const rows = [
      row({ book: "bet365", side: "over", price: -130, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", market: "receptions|jalen_hurts-II" }),
      row({ book: "bet365", side: "under", price: +110, line: 6.5, phase: "CLOSE", capturedAt: "2024-09-20T12:00:00Z", market: "receptions|jalen_hurts-II" }),
    ];
    const result = closeTruthForGame({ rows, gameId: GAME_ID, commenceTime: COMMENCE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.truths).toHaveLength(1);
    expect(result.truths[0]!.playerSlug).toBe("jalen_hurts-II");
    // qOver must equal the manual Shin devig of the (-130, +110) book — special
    // chars in the slug must never perturb the price pipeline.
    const decOver = americanToDecimal(-130);
    const decUnder = americanToDecimal(110);
    const devigged = shinDevig([decOver!, decUnder!]);
    expect(result.truths[0]!.qOver).toBeCloseTo(devigged!.probs[0]!, 6);
    expect(result.truths[0]!.overround).toBeCloseTo(1 / decOver! + 1 / decUnder!, 6);
  });
});
