/**
 * CL5 · line-path-features — decision-time feature vector tests.
 *
 * H0 item 7 (doctrine C6.2 CL5): pure function over ArchiveRow[] that produces
 * a decision-time feature vector. Fail-closed on missing/bad data.
 *
 * Tests cover:
 *  - priced: false invariant on every output
 *  - layer: "MARKET_PROP" invariant
 *  - Normal build: open_line, dec_over_now, drift_line, vel_line_per_hr, steps_n, ttk_hours
 *  - As-of discipline: decisionAt filter — no rows after decisionAt leak in
 *  - decision_after_cutoff: decisionAt > commenceTime - minLeadMs → refuse
 *  - no_decision_snapshot: over side has no rows pre-decision
 *  - bad_price: decision price invalid American → refuse
 *  - not_a_prop_market: market without "|" → refuse; malformed pipe → refuse
 *  - non-prop market (SPREAD) → refuse not_a_prop_market (this function refuses, not skips)
 *  - Cross-book: qover_now from exec book, book_disp_line_now across books, consensus_qover_now
 *  - jump_flag: max_step >= 1.0 → 1
 *  - Determinism: same input twice → deep-equal output; input not mutated
 *  - jump_flag: max_step < 1.0 → 0 (omitted key — but jump_flag only set when maxStep !== null)
 *
 * NOTE: Unlike close-truth.ts, buildDecisionFeatures works on ONE market + ONE book,
 * so non-prop / malformed markets are refused (not silently skipped).
 */
import { describe, expect, it } from "vitest";

import {
  buildDecisionFeatures,
  type ArchiveRow,
  type DecisionFeatures,
  type FeatureRefusal,
  DEFAULT_MIN_LEAD_MS,
} from "../line-path-features.js";

const GAME_ID = "00-0030501-2_2024_03";
const COMMENCE = "2024-09-22T17:00:00Z"; // Sunday 5:00 PM UTC
const COMMENCE_MS = Date.parse(COMMENCE);

// Decision point: 2024-09-21T14:00:00Z — 25h before kickoff, well outside minLead (3h)
const DECISION = "2024-09-21T14:00:00Z";

function row(o: Partial<ArchiveRow>): ArchiveRow {
  return {
    gameId: GAME_ID,
    capturedAt: "2024-09-21T10:00:00Z",
    phase: "OPEN",
    book: "draftkings",
    market: "receptions|justin_jefferson",
    side: "over",
    price: -110,
    line: 6.5,
    source: "the-odds-api",
    ...o,
  };
}

describe("line-path-features — priced:false invariant", () => {
  it("every OK result carries priced: false and layer: MARKET_PROP", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.priced).toBe(false);
    expect(result.layer).toBe("MARKET_PROP");
  });
});

describe("line-path-features — normal feature build", () => {
  it("computes open_line, drift_line, steps_n, ttk_hours from a simple path", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "over", price: -115, line: 7.5, capturedAt: "2024-09-20T18:00:00Z" }),
      row({ side: "over", price: -120, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -105, line: 7.5, capturedAt: "2024-09-20T18:00:00Z" }),
      row({ side: "under", price: -108, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    const f = result.features;
    expect(f.get("open_line")).toBe(6.5); // earliest over line
    expect(f.get("line_now")).toBe(7.5);  // latest at or before decision (10:00 Sep 21)
    expect(f.get("drift_line")).toBe(1.0); // 7.5 - 6.5
    expect(f.get("steps_n")).toBe(3); // 3 over samples at or before decision
    // ttk_hours: (commenceMs - decisionAtMs) / 3_600_000
    const decisionMs = Date.parse(DECISION);
    const expectedTtk = (COMMENCE_MS - decisionMs) / 3_600_000;
    expect(f.get("ttk_hours")).toBeCloseTo(expectedTtk, 6);
    // dec_over_now: price at decision time = -120 → 1 + 100/120 = 1.8333
    expect(f.get("dec_over_now")).toBeCloseTo(1 + 100 / 120, 6);
  });
});

describe("line-path-features — as-of discipline", () => {
  it("rows after decisionAt never leak into features", () => {
    const rows = [
      // Pre-decision: line 6.5
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      // Post-decision: line 8.5 — should be ignored
      row({ side: "over", price: +200, line: 8.5, capturedAt: "2024-09-22T01:00:00Z" }),
      // Under side
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // line_now should be 6.5 (the pre-decision value), not 8.5
    expect(result.features.get("line_now")).toBe(6.5);
    // steps_n should be 1 (only 1 over sample at or before decision)
    expect(result.features.get("steps_n")).toBe(1);
    expect(result.features.get("drift_line")).toBe(0); // 6.5 - 6.5
  });
});

describe("line-path-features — fail closed", () => {
  it("decision_after_cutoff: decisionAt > commenceTime - minLead → refuse", () => {
    // Decision 1 hour before kickoff — less than minLead (3h)
    const lateDecision = "2024-09-22T16:00:00Z";
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: lateDecision,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("decision_after_cutoff");
  });

  it("no_decision_snapshot: no over-side rows at or before decisionAt", () => {
    const rows = [
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("no_decision_snapshot");
  });

  it("bad_price: invalid American price at decision → refuse bad_price", () => {
    // Price 50 is invalid (|50| < 100 for American odds)
    const rows = [
      row({ side: "over", price: 50, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("bad_price");
  });

  it("not_a_prop_market: market without '|' → refuse", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z", market: "SPREAD" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z", market: "SPREAD" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "SPREAD",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("not_a_prop_market");
  });

  it("malformed prop market (multiple pipes) → refuse not_a_prop_market", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z", market: "receptions|player|extra" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z", market: "receptions|player|extra" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|player|extra",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("not_a_prop_market");
  });
});

describe("line-path-features — cross-book features", () => {
  it("qover_now: Shin qOver from exec book's over/under at decision", () => {
    const rows = [
      // Exec book (draftkings): over -110, under -110 at decision time
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      // Earlier price for open_line
      row({ book: "draftkings", side: "over", price: -115, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -105, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    // qover_now from -110/-110 → Shin devig gives exactly 0.5 (symmetric market)
    const qover = result.features.get("qover_now");
    expect(qover).toBeCloseTo(0.5, 3);
  });

  it("book_disp_line_now: range of line_now across 2+ books", () => {
    const rows = [
      // Book A: line 6.5
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      // Book B: line 6.5 (same) — need >= 2 books with different lines to get spread
      // Actually we need different lines to get a non-null result. Let's use different lines:
    ];
    // Second batch with different line
    rows.push(
      row({ book: "fanduel", side: "over", price: -110, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "fanduel", side: "under", price: -110, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
    );
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // book_disp_line_now = rangeSpread([6.5, 7.5]) = 1.0
    expect(result.features.get("book_disp_line_now")).toBe(1.0);
  });

  it("consensus_qover_now: median Shin qOver across books with paired over/under", () => {
    const rows = [
      // Book A: -110/-110 → qOver = 0.5
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      // Book B: -120/-100 → qOver skewed toward over
      row({ book: "fanduel", side: "over", price: -120, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "fanduel", side: "under", price: -100, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // consensus_qover_now = median of [qOver_A, qOver_B]
    // qOver_A = 0.5 (Shin devig of symmetric -110/-110), qOver_B > 0.5 (over is favorite at -120)
    // median of 2 values = (a+b)/2
    expect(result.features.has("consensus_qover_now")).toBe(true);
    const consensus = result.features.get("consensus_qover_now")!;
    expect(consensus).toBeGreaterThan(0.49);
    expect(consensus).toBeLessThan(0.56); // between 0.5055 and the skewed value
  });

  it("books with cycle mismatch (>20min apart) excluded from consensus", () => {
    const rows = [
      // Book A: paired at 10:00
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      // Book B: cycle mismatch — over at 10:00, under at 10:45 (45 min > 20 min tolerance)
      row({ book: "fanduel", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ book: "fanduel", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:45:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    // Only Book A qualifies for consensus → median of [0.5]
    const consensus = result.features.get("consensus_qover_now");
    expect(consensus).toBeCloseTo(0.5, 3);
  });
});

describe("line-path-features — jump_flag", () => {
  it("max_step >= 1.0 → jump_flag = 1", () => {
    const rows = [
      // Line jumps from 6.5 to 8.5 → step = 2.0 >= 1.0
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draftkings", side: "over", price: -110, line: 8.5, capturedAt: "2024-09-21T08:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 8.5, capturedAt: "2024-09-21T08:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.features.get("jump_flag")).toBe(1);
    expect(result.features.get("max_step_line")).toBe(2.0);
  });

  it("max_step < 1.0 → jump_flag = 0", () => {
    const rows = [
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draftkings", side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T08:00:00Z" }), // no line change
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ book: "draftkings", side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T08:00:00Z" }),
    ];
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: DECISION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.features.get("jump_flag")).toBe(0);
    expect(result.features.get("max_step_line")).toBe(0);
  });
});

describe("line-path-features — determinism / idempotence", () => {
  it("same input twice → deep-equal output", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "over", price: -115, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -105, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
    ];
    const r1 = buildDecisionFeatures({
      rows, gameId: GAME_ID, market: "receptions|justin_jefferson",
      book: "draftkings", commenceTime: COMMENCE, decisionAt: DECISION,
    });
    const r2 = buildDecisionFeatures({
      rows, gameId: GAME_ID, market: "receptions|justin_jefferson",
      book: "draftkings", commenceTime: COMMENCE, decisionAt: DECISION,
    });
    expect(r1).toEqual(r2);
  });

  it("input array not mutated (frozen)", () => {
    const rows: ArchiveRow[] = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "over", price: -115, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-20T12:00:00Z" }),
      row({ side: "under", price: -105, line: 7.5, capturedAt: "2024-09-21T10:00:00Z" }),
    ];
    const frozen = Object.freeze([...rows]);
    const snapshot = structuredClone(rows);
    buildDecisionFeatures({
      rows: frozen, gameId: GAME_ID, market: "receptions|justin_jefferson",
      book: "draftkings", commenceTime: COMMENCE, decisionAt: DECISION,
    });
    expect(rows).toEqual(snapshot);
  });
});

describe("line-path-features — minLead override", () => {
  it("minLeadMs=0 allows decision 1s before kickoff", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T16:59:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T16:59:00Z" }),
    ];
    const lateDecision = "2024-09-22T16:59:59Z";
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: lateDecision,
      minLeadMs: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.features.get("line_now")).toBe(6.5);
  });

  it("default minLead (3h) refuses decision 2h before kickoff", () => {
    const rows = [
      row({ side: "over", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
      row({ side: "under", price: -110, line: 6.5, capturedAt: "2024-09-21T10:00:00Z" }),
    ];
    const twoHourBeforeKickoff = "2024-09-22T15:00:00Z";
    const result = buildDecisionFeatures({
      rows,
      gameId: GAME_ID,
      market: "receptions|justin_jefferson",
      book: "draftkings",
      commenceTime: COMMENCE,
      decisionAt: twoHourBeforeKickoff,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refuse");
    expect(result.refuse).toBe("decision_after_cutoff");
  });
});

describe("line-path-features — DEFAULT_MIN_LEAD_MS", () => {
  it("3 hours in ms", () => {
    expect(DEFAULT_MIN_LEAD_MS).toBe(3 * 3600_000);
  });
});
