import { describe, it, expect } from "vitest";
import {
  computeLineMove,
  labelMovement,
  detectSteamMoves,
  reverseLineMovement,
  keyNumberProximity,
  openingToCurrentMove,
  lineMoveTrend,
  consensusOdds,
  spreadToImpliedProb,
  type OddsSnapshot,
  type LineMove,
} from "@/lib/analytics/line-movement";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_TS = 1_700_000_000_000; // arbitrary base timestamp in ms
const MIN = 60_000;
const HOUR = 3_600_000;

function snap(
  offsetMs: number,
  spread?: number,
  total?: number,
  moneylineHome?: number,
  moneylineAway?: number,
  bookmaker?: string
): OddsSnapshot {
  return {
    timestamp: BASE_TS + offsetMs,
    ...(spread !== undefined && { spread }),
    ...(total !== undefined && { total }),
    ...(moneylineHome !== undefined && { moneylineHome }),
    ...(moneylineAway !== undefined && { moneylineAway }),
    ...(bookmaker !== undefined && { bookmaker }),
  };
}

// ─── computeLineMove ─────────────────────────────────────────────────────────

describe("computeLineMove", () => {
  it("computes spreadMove from -3 to -3.5", () => {
    const from = snap(0, -3);
    const to = snap(15 * MIN, -3.5);
    const move = computeLineMove(from, to);
    expect(move.spreadMove).toBeCloseTo(-0.5);
  });

  it("computes spreadMove from -3.5 to -3 (line moves back)", () => {
    const from = snap(0, -3.5);
    const to = snap(10 * MIN, -3);
    const move = computeLineMove(from, to);
    expect(move.spreadMove).toBeCloseTo(0.5);
  });

  it("computes durationMs correctly", () => {
    const from = snap(0, -3);
    const to = snap(30 * MIN, -4);
    const move = computeLineMove(from, to);
    expect(move.durationMs).toBe(30 * MIN);
  });

  it("returns null spreadMove when from.spread is missing", () => {
    const from = snap(0); // no spread
    const to = snap(10 * MIN, -3.5);
    const move = computeLineMove(from, to);
    expect(move.spreadMove).toBeNull();
  });

  it("returns null spreadMove when to.spread is missing", () => {
    const from = snap(0, -3);
    const to = snap(10 * MIN); // no spread
    const move = computeLineMove(from, to);
    expect(move.spreadMove).toBeNull();
  });

  it("computes totalMove correctly", () => {
    const from = snap(0, undefined, 47.5);
    const to = snap(HOUR, undefined, 48);
    const move = computeLineMove(from, to);
    expect(move.totalMove).toBeCloseTo(0.5);
  });

  it("returns null totalMove when either total is missing", () => {
    const from = snap(0, -3);
    const to = snap(HOUR, -3.5);
    const move = computeLineMove(from, to);
    expect(move.totalMove).toBeNull();
  });

  it("computes spreadMovePerHour for a 30-min move", () => {
    const from = snap(0, -3);
    const to = snap(30 * MIN, -4);
    const move = computeLineMove(from, to);
    // spreadMove = -1, duration = 0.5h → perHour = -2
    expect(move.spreadMovePerHour).toBeCloseTo(-2);
  });

  it("returns null spreadMovePerHour when spreadMove is null", () => {
    const from = snap(0); // no spread
    const to = snap(HOUR, -3.5);
    const move = computeLineMove(from, to);
    expect(move.spreadMovePerHour).toBeNull();
  });

  it("returns null spreadMovePerHour when durationMs is 0", () => {
    const from = snap(0, -3);
    const to = snap(0, -4); // same timestamp
    const move = computeLineMove(from, to);
    expect(move.spreadMovePerHour).toBeNull();
  });

  it("carries from and to snapshots unchanged", () => {
    const from = snap(0, -3, 47, -150, +130, "draftkings");
    const to = snap(HOUR, -3.5, 47.5, -160, +140, "fanduel");
    const move = computeLineMove(from, to);
    expect(move.from).toBe(from);
    expect(move.to).toBe(to);
  });

  it("handles negative durationMs (reversed timestamps)", () => {
    const from = snap(HOUR, -3);
    const to = snap(0, -3.5);
    const move = computeLineMove(from, to);
    expect(move.durationMs).toBe(-HOUR);
  });
});

// ─── labelMovement ────────────────────────────────────────────────────────────

function makeMove(spreadMove: number | null, durationMs: number): LineMove {
  const from = snap(0, spreadMove !== null ? 0 : undefined);
  const to = snap(durationMs, spreadMove !== null ? spreadMove : undefined);
  return {
    from,
    to,
    spreadMove,
    totalMove: null,
    durationMs,
    spreadMovePerHour: spreadMove !== null && durationMs > 0 ? spreadMove / (durationMs / 3_600_000) : null,
  };
}

describe("labelMovement", () => {
  it("labels a 0.5pt move in 15 min as steam", () => {
    const move = makeMove(-0.5, 15 * MIN);
    expect(labelMovement(move)).toBe("steam");
  });

  it("labels a 1.0pt move in 20 min as steam", () => {
    const move = makeMove(-1.0, 20 * MIN);
    expect(labelMovement(move)).toBe("steam");
  });

  it("labels a 1.0pt move in 2 hours as sharp", () => {
    const move = makeMove(-1.0, 2 * HOUR);
    expect(labelMovement(move)).toBe("sharp");
  });

  it("labels a 1.5pt move in 3 hours as sharp", () => {
    const move = makeMove(-1.5, 3 * HOUR);
    expect(labelMovement(move)).toBe("sharp");
  });

  it("labels a 0.5pt move in 4 hours as public", () => {
    const move = makeMove(0.5, 4 * HOUR);
    expect(labelMovement(move)).toBe("public");
  });

  it("labels a 0.5pt move in 6 hours as public", () => {
    const move = makeMove(0.5, 6 * HOUR);
    expect(labelMovement(move)).toBe("public");
  });

  it("labels a tiny 0.1pt move as neutral", () => {
    const move = makeMove(0.1, 30 * MIN);
    expect(labelMovement(move)).toBe("neutral");
  });

  it("labels a null spreadMove as neutral", () => {
    const move = makeMove(null, HOUR);
    expect(labelMovement(move)).toBe("neutral");
  });

  it("labels 0.4pt move in 2h as neutral (not enough size)", () => {
    const move = makeMove(0.4, 2 * HOUR);
    expect(labelMovement(move)).toBe("neutral");
  });

  it("labels 0.5pt move in exactly 29 min as steam", () => {
    const move = makeMove(0.5, 29 * MIN);
    expect(labelMovement(move)).toBe("steam");
  });

  it("prioritizes steam over other labels for fast half-point", () => {
    const move = makeMove(0.5, 5 * MIN);
    expect(labelMovement(move)).toBe("steam");
  });

  it("labels a negative 1.5pt move in 4h as sharp (>=1.0 and >1h)", () => {
    const move = makeMove(-1.5, 4 * HOUR);
    expect(labelMovement(move)).toBe("sharp");
  });
});

// ─── detectSteamMoves ────────────────────────────────────────────────────────

describe("detectSteamMoves", () => {
  it("returns [] for empty array", () => {
    expect(detectSteamMoves([])).toEqual([]);
  });

  it("returns [] for a single snapshot", () => {
    expect(detectSteamMoves([snap(0, -3)])).toEqual([]);
  });

  it("returns one steam event for two snapshots with a fast 0.5 move", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events).toHaveLength(1);
    expect(events[0]!.label).toBe("steam");
  });

  it("steam event has correct timestamp (to.timestamp)", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.timestamp).toBe(BASE_TS + 15 * MIN);
  });

  it("steam confidence = min(1, absMove / 1.0) for 0.5pt move → 0.5", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.confidence).toBeCloseTo(0.5);
  });

  it("steam confidence capped at 1.0 for >= 1pt move", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -4)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.confidence).toBe(1);
  });

  it("sharp event has confidence 0.7", () => {
    const snapshots = [snap(0, -3), snap(2 * HOUR, -4)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.label).toBe("sharp");
    expect(events[0]!.confidence).toBe(0.7);
  });

  it("public event has confidence 0.4", () => {
    const snapshots = [snap(0, -3), snap(5 * HOUR, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.label).toBe("public");
    expect(events[0]!.confidence).toBe(0.4);
  });

  it("excludes neutral events", () => {
    const snapshots = [snap(0, -3), snap(HOUR, -3.1), snap(2 * HOUR, -3.2)];
    const events = detectSteamMoves(snapshots);
    expect(events).toHaveLength(0); // both moves < 0.5
  });

  it("steam event description contains 'Steam:'", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.description).toMatch(/Steam:/);
  });

  it("sharp event description contains 'Sharp:'", () => {
    const snapshots = [snap(0, -3), snap(2 * HOUR, -4)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.description).toMatch(/Sharp:/);
  });

  it("detects multiple events across a sequence", () => {
    const snapshots = [
      snap(0, -3),
      snap(15 * MIN, -3.5),  // steam
      snap(15 * MIN + HOUR, -3.5), // neutral (no change)
      snap(15 * MIN + 3 * HOUR, -4), // sharp (big move over 2h but <1h... hmm)
    ];
    const events = detectSteamMoves(snapshots);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("spreadMove in event matches computed move", () => {
    const snapshots = [snap(0, -3), snap(15 * MIN, -3.5)];
    const events = detectSteamMoves(snapshots);
    expect(events[0]!.spreadMove).toBeCloseTo(-0.5);
  });

  it("returns [] when all snapshots have no spread", () => {
    const snapshots = [snap(0), snap(15 * MIN)];
    const events = detectSteamMoves(snapshots);
    expect(events).toHaveLength(0);
  });
});

// ─── reverseLineMovement ─────────────────────────────────────────────────────

describe("reverseLineMovement", () => {
  it("detects RLM when home gets < 40% tickets and line moves in home's favor", () => {
    // openingSpread=-3, currentSpread=-3.5 → home is bigger favorite → favorable for home
    const rlm = reverseLineMovement("home", 0.35, -3, -3.5);
    expect(rlm.detected).toBe(true);
  });

  it("does NOT detect RLM when home gets > 60% tickets", () => {
    const rlm = reverseLineMovement("home", 0.65, -3, -3.5);
    expect(rlm.detected).toBe(false);
  });

  it("does NOT detect RLM when line moved against home pick", () => {
    // openingSpread=-3, currentSpread=-2.5 → home is smaller favorite → against home
    const rlm = reverseLineMovement("home", 0.35, -3, -2.5);
    expect(rlm.detected).toBe(false);
  });

  it("detects RLM for away pick when spread increases (dog getting better number)", () => {
    // openingSpread=-3, currentSpread=-2.5 → home less favored → away gets better number
    const rlm = reverseLineMovement("away", 0.30, -3, -2.5);
    expect(rlm.detected).toBe(true);
  });

  it("does NOT detect RLM for away pick when spread decreases (away worse number)", () => {
    const rlm = reverseLineMovement("away", 0.30, -3, -3.5);
    expect(rlm.detected).toBe(false);
  });

  it("strength is strong when % < 30 and spread change > 0.5", () => {
    const rlm = reverseLineMovement("home", 0.25, -3, -4);
    expect(rlm.strength).toBe("strong");
  });

  it("strength is moderate when detected but not strong", () => {
    const rlm = reverseLineMovement("home", 0.35, -3, -3.5);
    expect(rlm.strength).toBe("moderate");
  });

  it("strength is weak when not detected", () => {
    const rlm = reverseLineMovement("home", 0.65, -3, -3.5);
    expect(rlm.strength).toBe("weak");
  });

  it("carries pickSide correctly", () => {
    const rlm = reverseLineMovement("away", 0.30, -3, -2.5);
    expect(rlm.pickSide).toBe("away");
  });

  it("carries bettingPercentage correctly", () => {
    const rlm = reverseLineMovement("home", 0.35, -3, -3.5);
    expect(rlm.bettingPercentage).toBe(0.35);
  });

  it("lineMovedAgainst reflects favorable line move", () => {
    const rlm = reverseLineMovement("home", 0.35, -3, -3.5);
    expect(rlm.lineMovedAgainst).toBe(true);
  });

  it("boundary: exactly 40% tickets → not RLM (must be < 0.4)", () => {
    const rlm = reverseLineMovement("home", 0.4, -3, -3.5);
    expect(rlm.detected).toBe(false);
  });

  it("boundary: exactly 30% tickets with large move → strong", () => {
    const rlm = reverseLineMovement("home", 0.29, -3, -4);
    expect(rlm.strength).toBe("strong");
  });
});

// ─── keyNumberProximity ──────────────────────────────────────────────────────

describe("keyNumberProximity", () => {
  it("-3 is exactly on a key number, distance 0", () => {
    const result = keyNumberProximity(-3);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-3);
    expect(result.distanceFromKey).toBe(0);
  });

  it("-3.5 is within 0.5 of -3", () => {
    const result = keyNumberProximity(-3.5);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.distanceFromKey).toBeCloseTo(0.5);
  });

  it("-5 is not near a key number", () => {
    const result = keyNumberProximity(-5);
    expect(result.nearKeyNumber).toBe(false);
  });

  it("-7 is exactly on a key number", () => {
    const result = keyNumberProximity(-7);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-7);
    expect(result.distanceFromKey).toBe(0);
  });

  it("3 (positive) is exactly on a key number", () => {
    const result = keyNumberProximity(3);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(3);
  });

  it("-6.5 is near -7 (distance 0.5)", () => {
    const result = keyNumberProximity(-6.5);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-7);
    expect(result.distanceFromKey).toBeCloseTo(0.5);
  });

  it("-10 is exactly on a key number", () => {
    const result = keyNumberProximity(-10);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-10);
  });

  it("-14 is exactly on a key number", () => {
    const result = keyNumberProximity(-14);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-14);
  });

  it("-17 is exactly on a key number", () => {
    const result = keyNumberProximity(-17);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.keyNumber).toBe(-17);
  });

  it("-8 is not near a key number (distance 1 from -7)", () => {
    const result = keyNumberProximity(-8);
    expect(result.nearKeyNumber).toBe(false);
    expect(result.distanceFromKey).toBeCloseTo(1);
  });

  it("0 is not near a key number", () => {
    const result = keyNumberProximity(0);
    expect(result.nearKeyNumber).toBe(false);
  });

  it("-2.5 is near -3 (distance 0.5)", () => {
    const result = keyNumberProximity(-2.5);
    expect(result.nearKeyNumber).toBe(true);
    expect(result.distanceFromKey).toBeCloseTo(0.5);
  });
});

// ─── openingToCurrentMove ─────────────────────────────────────────────────────

describe("openingToCurrentMove", () => {
  it("spread from -3 to -4: spreadChange=-1, direction=toward_home", () => {
    const opening = snap(0, -3);
    const current = snap(HOUR, -4);
    const result = openingToCurrentMove(opening, current);
    expect(result.spreadChange).toBeCloseTo(-1);
    expect(result.direction).toBe("toward_home");
  });

  it("spread from -3 to -2: spreadChange=+1, direction=toward_away", () => {
    const opening = snap(0, -3);
    const current = snap(HOUR, -2);
    const result = openingToCurrentMove(opening, current);
    expect(result.spreadChange).toBeCloseTo(1);
    expect(result.direction).toBe("toward_away");
  });

  it("no spread change: direction=none", () => {
    const opening = snap(0, -3);
    const current = snap(HOUR, -3);
    const result = openingToCurrentMove(opening, current);
    expect(result.spreadChange).toBeCloseTo(0);
    expect(result.direction).toBe("none");
  });

  it("null spreadChange when spread missing: direction=none", () => {
    const opening = snap(0);
    const current = snap(HOUR, -3);
    const result = openingToCurrentMove(opening, current);
    expect(result.spreadChange).toBeNull();
    expect(result.direction).toBe("none");
  });

  it("total from 47.5 to 48: totalChange=0.5", () => {
    const opening = snap(0, undefined, 47.5);
    const current = snap(HOUR, undefined, 48);
    const result = openingToCurrentMove(opening, current);
    expect(result.totalChange).toBeCloseTo(0.5);
  });

  it("null totalChange when totals missing", () => {
    const opening = snap(0, -3);
    const current = snap(HOUR, -3.5);
    const result = openingToCurrentMove(opening, current);
    expect(result.totalChange).toBeNull();
  });

  it("percentChange from -150 to -160 home moneyline", () => {
    const opening = snap(0, undefined, undefined, -150);
    const current = snap(HOUR, undefined, undefined, -160);
    const result = openingToCurrentMove(opening, current);
    // (-160 - -150) / 150 * 100 = -10/150*100 ≈ -6.67%
    expect(result.percentChange).toBeCloseTo(-6.667, 1);
  });

  it("null percentChange when moneyline missing", () => {
    const opening = snap(0, -3);
    const current = snap(HOUR, -3.5);
    const result = openingToCurrentMove(opening, current);
    expect(result.percentChange).toBeNull();
  });
});

// ─── lineMoveTrend ────────────────────────────────────────────────────────────

describe("lineMoveTrend", () => {
  it("returns stable for fewer than 2 snapshots", () => {
    expect(lineMoveTrend([])).toBe("stable");
    expect(lineMoveTrend([snap(0, -3)])).toBe("stable");
  });

  it("returns stable for 2 snapshots with tiny move", () => {
    const snapshots = [snap(0, -3), snap(HOUR, -3.2)];
    expect(lineMoveTrend(snapshots)).toBe("stable");
  });

  it("sharply_up: total move > 1.0 in < 24h (spread increases)", () => {
    // spread -4.5 → -3: totalMove = +1.5 in 2h → sharply_up
    const snapshots = [snap(0, -4.5), snap(2 * HOUR, -3)];
    expect(lineMoveTrend(snapshots)).toBe("sharply_up");
  });

  it("sharply_down: total move < -1.0 in < 24h", () => {
    const snapshots = [snap(0, -3), snap(2 * HOUR, -4.5 - 3)]; // -3 → -7.5 (total = -4.5)
    // Wait, let me recalculate: snap(-3) to snap(-4.5): totalMove = -4.5 - (-3) = -1.5
    // That's sharply_down already. Let me use a clearer example.
    const snapshots2 = [snap(0, -6), snap(2 * HOUR, -4)]; // -6 → -4, total = +2 (sharply_up)
    expect(lineMoveTrend(snapshots2)).toBe("sharply_up");
    const snapshots3 = [snap(0, -3), snap(2 * HOUR, -5)]; // -3 → -5, total = -2 (sharply_down)
    expect(lineMoveTrend(snapshots3)).toBe("sharply_down");
  });

  it("volatile: large single move but small total", () => {
    const snapshots = [
      snap(0, -3),
      snap(HOUR, -4.5),   // +1.5 move up
      snap(2 * HOUR, -3), // back down (total = 0)
    ];
    expect(lineMoveTrend(snapshots)).toBe("volatile");
  });

  it("drifting_up: total > 0.5 but not sharp", () => {
    // Spread goes from -4 to -3.25 over > 24h: totalMove = +0.75 → drifting_up
    const snapshots = [
      snap(0, -4),
      snap(12 * HOUR, -3.75),
      snap(24 * HOUR + 1, -3.25), // total = +0.75, over 24h → drifting_up
    ];
    expect(lineMoveTrend(snapshots)).toBe("drifting_up");
  });

  it("drifting_down: total < -0.5 but not sharp", () => {
    // Spread goes from -3 to -3.75 over > 24h: totalMove = -0.75 → drifting_down
    const snapshots = [
      snap(0, -3),
      snap(12 * HOUR, -3.25),
      snap(24 * HOUR + 1, -3.75), // total spread drop of -0.75 over > 24h → drifting_down
    ];
    expect(lineMoveTrend(snapshots)).toBe("drifting_down");
  });

  it("stable when total absolute move < 0.5", () => {
    const snapshots = [snap(0, -3), snap(2 * HOUR, -3.3)];
    expect(lineMoveTrend(snapshots)).toBe("stable");
  });

  it("handles snapshots with no spread gracefully (uses only spread-having)", () => {
    const snapshots = [snap(0, -3), snap(HOUR), snap(2 * HOUR, -4.5)];
    // Only first and last have spreads → total = -1.5 in 2h → sharply_down
    expect(lineMoveTrend(snapshots)).toBe("sharply_down");
  });
});

// ─── consensusOdds ───────────────────────────────────────────────────────────

describe("consensusOdds", () => {
  it("returns median spread from odd-count set", () => {
    const snapshots = [snap(0, -3), snap(HOUR, -3.5), snap(2 * HOUR, -4)];
    const result = consensusOdds(snapshots);
    expect(result.spread).toBeCloseTo(-3.5); // median of [-4, -3.5, -3]
  });

  it("returns median spread from even-count set", () => {
    const snapshots = [snap(0, -3), snap(HOUR, -3.5), snap(2 * HOUR, -4), snap(3 * HOUR, -4.5)];
    const result = consensusOdds(snapshots);
    // sorted: [-4.5, -4, -3.5, -3] → median = (-4 + -3.5) / 2 = -3.75
    expect(result.spread).toBeCloseTo(-3.75);
  });

  it("returns null spread when no snapshots have spread", () => {
    const snapshots = [snap(0, undefined, 47), snap(HOUR, undefined, 48)];
    const result = consensusOdds(snapshots);
    expect(result.spread).toBeNull();
  });

  it("returns median total from odd-count set", () => {
    const snapshots = [snap(0, undefined, 47), snap(HOUR, undefined, 47.5), snap(2 * HOUR, undefined, 48)];
    const result = consensusOdds(snapshots);
    expect(result.total).toBeCloseTo(47.5);
  });

  it("returns null total when no snapshots have total", () => {
    const snapshots = [snap(0, -3), snap(HOUR, -3.5)];
    const result = consensusOdds(snapshots);
    expect(result.total).toBeNull();
  });

  it("returns null for both when snapshots are empty", () => {
    const result = consensusOdds([]);
    expect(result.spread).toBeNull();
    expect(result.total).toBeNull();
  });

  it("single snapshot returns that value for spread", () => {
    const result = consensusOdds([snap(0, -3, 47.5)]);
    expect(result.spread).toBeCloseTo(-3);
    expect(result.total).toBeCloseTo(47.5);
  });

  it("mixes bookmakers transparently", () => {
    const snapshots = [
      snap(0, -3, 47, undefined, undefined, "draftkings"),
      snap(HOUR, -3.5, 47.5, undefined, undefined, "fanduel"),
      snap(2 * HOUR, -4, 48, undefined, undefined, "betmgm"),
    ];
    const result = consensusOdds(snapshots);
    expect(result.spread).toBeCloseTo(-3.5);
    expect(result.total).toBeCloseTo(47.5);
  });
});

// ─── spreadToImpliedProb ─────────────────────────────────────────────────────

describe("spreadToImpliedProb", () => {
  it("spread of 0 → exactly 0.5", () => {
    expect(spreadToImpliedProb(0)).toBeCloseTo(0.5);
  });

  it("spread of -3 (home favored by 3) → ~0.556", () => {
    // 0.5 + 3 * 0.0187 = 0.5 + 0.0561 = 0.5561
    expect(spreadToImpliedProb(-3)).toBeCloseTo(0.556, 2);
  });

  it("spread of +3 (home underdog by 3) → ~0.444", () => {
    // 0.5 + (-3) * 0.0187 = 0.5 - 0.0561 = 0.4439
    expect(spreadToImpliedProb(3)).toBeCloseTo(0.444, 2);
  });

  it("spread of -7 → ~0.631", () => {
    // 0.5 + 7 * 0.0187 = 0.5 + 0.1309 = 0.6309
    expect(spreadToImpliedProb(-7)).toBeCloseTo(0.631, 2);
  });

  it("clamps at 0.95 for extreme negative spread", () => {
    // Very heavy favorite (e.g., -30 spread)
    expect(spreadToImpliedProb(-100)).toBe(0.95);
  });

  it("clamps at 0.05 for extreme positive spread", () => {
    expect(spreadToImpliedProb(100)).toBe(0.05);
  });

  it("spread of -14 → ~0.762", () => {
    // 0.5 + 14 * 0.0187 = 0.5 + 0.2618 = 0.7618
    expect(spreadToImpliedProb(-14)).toBeCloseTo(0.762, 2);
  });

  it("positive result for any typical spread", () => {
    expect(spreadToImpliedProb(-3)).toBeGreaterThan(0);
    expect(spreadToImpliedProb(3)).toBeGreaterThan(0);
  });

  it("result is always between 0.05 and 0.95", () => {
    [-50, -14, -7, -3, 0, 3, 7, 14, 50].forEach((s) => {
      const p = spreadToImpliedProb(s);
      expect(p).toBeGreaterThanOrEqual(0.05);
      expect(p).toBeLessThanOrEqual(0.95);
    });
  });
});
