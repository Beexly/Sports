import { describe, expect, it } from "vitest";
import { boardDedupeKey, dedupeBoardRows } from "@/lib/board/state";
import type { BoardStateRow } from "@/lib/board/state";

/**
 * C-117. Measured on a live slate: 58 board rows covering only 18 distinct
 * fixtures, with one matchup appearing four times as two contradictory
 * variants (FREE confidence 57 against PREMIUM confidence 88). Every value
 * below is a labelled fixture, not product data.
 */
const row = (over: Partial<BoardStateRow> & Pick<BoardStateRow, "id" | "gameId">): BoardStateRow => ({
  matchup: "Fixture Away Birds @ Fixture Home Sox",
  sport: "MLB",
  market: "ALL_MARKETS",
  status: "PUBLISHED_TODAY",
  edgeIndex: 60,
  confidence: 70,
  rankingP: null,
  rankingSource: null,
  gateReason: null,
  updatedAt: "2026-09-07T12:00:00.000Z",
  ...over,
});

/** Key rows the way production does: fixture + UNREDACTED market identity. */
const keyed = (rows: readonly BoardStateRow[], pickTypes?: readonly (string | null)[]) =>
  rows.map((row, i) => ({ key: boardDedupeKey(row.gameId, pickTypes?.[i] ?? null), row }));

describe("dedupeBoardRows — one fixture, one row per market", () => {
  it("collapses repeated evaluations of the same game into one row", () => {
    // GateDecision has no unique constraint and the query takes the latest 100
    // with no per-game collapse, so one game evaluated repeatedly in a day
    // becomes several rows carrying DIFFERENT confidence — the contradiction a
    // subscriber actually sees.
    const out = dedupeBoardRows(keyed([
      row({ id: "d-1", gameId: "game-1", confidence: 57 }),
      row({ id: "d-2", gameId: "game-1", confidence: 88 }),
      row({ id: "d-3", gameId: "game-1", confidence: 61 }),
    ]));

    expect(out).toHaveLength(1);
    expect(out[0]!.confidence).toBe(88);
  });

  it("keeps genuinely different fixtures apart", () => {
    const out = dedupeBoardRows(keyed([
      row({ id: "d-1", gameId: "game-1" }),
      row({ id: "d-2", gameId: "game-2" }),
    ]));
    expect(out).toHaveLength(2);
  });

  it("keeps two markets on one fixture, which are not duplicates", () => {
    const out = dedupeBoardRows(keyed(
      [
        row({ id: "d-1", gameId: "game-1", market: "Fixture Home Sox -1.5" }),
        row({ id: "d-2", gameId: "game-1", market: "OVER 8.5" }),
      ],
      ["SPREAD", "TOTAL"],
    ));
    expect(out).toHaveLength(2);
  });

  it("resolves the scoring/gated cross-lane overlap in favour of the live state", () => {
    // The fallback path's two game queries overlap by construction: a game
    // later today that is SCHEDULED with no published pick satisfies both, and
    // became `scoring-<id>` and `gate-<id>` — same fixture, same market.
    const out = dedupeBoardRows(keyed([
      row({ id: "gate-1", gameId: "game-1", status: "GATED_TODAY", confidence: null, edgeIndex: null }),
      row({ id: "scoring-1", gameId: "game-1", status: "SCORING_NOW", confidence: null, edgeIndex: null }),
    ]));

    expect(out).toHaveLength(1);
    expect(out[0]!.status).toBe("SCORING_NOW");
  });

  it("prefers a published row over both other lanes", () => {
    const out = dedupeBoardRows(keyed([
      row({ id: "scoring-1", gameId: "game-1", status: "SCORING_NOW" }),
      row({ id: "pub-1", gameId: "game-1", status: "PUBLISHED_TODAY" }),
    ]));
    expect(out[0]!.status).toBe("PUBLISHED_TODAY");
  });

  it("prefers the NEWEST evaluation, even when it downgrades confidence", () => {
    // GateDecision rows are repeated evaluations over time and confidence can
    // legitimately FALL as the line moves. Ranking on confidence before the
    // timestamp meant an older, stronger reading beat the newer downgrade, so a
    // subscriber saw a number the model no longer stood behind (Devin Review,
    // #717).
    const out = dedupeBoardRows(keyed([
      row({ id: "old", gameId: "game-1", confidence: 88, updatedAt: "2026-09-07T12:00:00.000Z" }),
      row({ id: "new", gameId: "game-1", confidence: 57, updatedAt: "2026-09-07T15:00:00.000Z" }),
    ]));

    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("new");
    expect(out[0]!.confidence).toBe(57);
  });

  it("still uses confidence as the tie-break when two rows were evaluated at the same instant", () => {
    const out = dedupeBoardRows(keyed([
      row({ id: "a", gameId: "game-1", confidence: 57, updatedAt: "2026-09-07T12:00:00.000Z" }),
      row({ id: "b", gameId: "game-1", confidence: 88, updatedAt: "2026-09-07T12:00:00.000Z" }),
    ]));

    expect(out[0]!.confidence).toBe(88);
  });

  it("is deterministic when rows tie on everything, so the board does not flip between loads", () => {
    const a = row({ id: "aaa", gameId: "game-1" });
    const b = row({ id: "bbb", gameId: "game-1" });
    expect(dedupeBoardRows(keyed([a, b]))[0]!.id).toBe("aaa");
    expect(dedupeBoardRows(keyed([b, a]))[0]!.id).toBe("aaa");
  });

  it("treats a null confidence as weaker than any real one, never as zero-beats-nothing", () => {
    const out = dedupeBoardRows(keyed([
      row({ id: "d-1", gameId: "game-1", confidence: null }),
      row({ id: "d-2", gameId: "game-1", confidence: 0 }),
    ]));
    expect(out[0]!.confidence).toBe(0);
  });

  it("passes an already-unique set through unchanged", () => {
    const rows = [row({ id: "d-1", gameId: "game-1" }), row({ id: "d-2", gameId: "game-2" })];
    const out = dedupeBoardRows(keyed(rows, ["SPREAD", "SPREAD"]));
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual(["d-1", "d-2"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(dedupeBoardRows([])).toEqual([]);
  });

  it("keeps two markets on one fixture for a FREE viewer, whose market label is redacted", () => {
    // Every row a non-premium viewer receives carries the literal
    // "ALL_MARKETS", so keying the collapse on the DISPLAYED market silently
    // merged a game's SPREAD and TOTAL for FREE viewers while PRO viewers kept
    // both — a lost pick for the free tier and a break of the tier-invariant
    // count contract (Devin Review, #717). The key comes from pickType, which
    // redaction never touches.
    const freeRows = [
      row({ id: "d-1", gameId: "game-1", market: "ALL_MARKETS" }),
      row({ id: "d-2", gameId: "game-1", market: "ALL_MARKETS" }),
    ];

    expect(dedupeBoardRows(keyed(freeRows, ["SPREAD", "TOTAL"]))).toHaveLength(2);
    // And the same two underlying rows collapse to the same count for a PRO
    // viewer, whose labels differ.
    const proRows = [
      row({ id: "d-1", gameId: "game-1", market: "Fixture Home Sox -1.5" }),
      row({ id: "d-2", gameId: "game-1", market: "OVER 8.5" }),
    ];
    expect(dedupeBoardRows(keyed(proRows, ["SPREAD", "TOTAL"]))).toHaveLength(2);
  });

  it("still collapses two rows that share a fixture AND a market", () => {
    const out = dedupeBoardRows(
      keyed(
        [
          row({ id: "d-1", gameId: "game-1", market: "ALL_MARKETS", confidence: 57 }),
          row({ id: "d-2", gameId: "game-1", market: "ALL_MARKETS", confidence: 88 }),
        ],
        ["SPREAD", "SPREAD"],
      ),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.confidence).toBe(88);
  });
});
