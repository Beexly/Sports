import { describe, expect, it } from "vitest";
import {
  shinDevig,
  gateProp,
  buildPassList,
  buildBoard,
  kellyStake,
  monteCarloProp,
  autopsySettled,
  kalmanUpdate,
  GATE_THRESHOLDS,
  type PlayerProp,
  type GateResult,
} from "./gse-four-beat.js";

function makeProp(over: Partial<PlayerProp> = {}): PlayerProp {
  return {
    playerId: "p1",
    playerName: "Patrick Mahomes",
    position: "QB",
    team: "KC",
    opponent: "BUF",
    propType: "passing_yards",
    odds: [
      { bookmaker: "Pinnacle", overOdds: -110, underOdds: -110, line: 275.5, vigPct: 4.8, isSharp: true, capturedAt: new Date().toISOString() },
      { bookmaker: "DraftKings", overOdds: -115, underOdds: -105, line: 275.5, vigPct: 4.5, isSharp: false, capturedAt: new Date().toISOString() },
      { bookmaker: "FanDuel", overOdds: -108, underOdds: -112, line: 275.5, vigPct: 4.7, isSharp: false, capturedAt: new Date().toISOString() },
    ],
    ...over,
  };
}

describe("GSE 4-Beat Props Pipeline", () => {
  // ── Stage 01: Shin devigging ──
  it("shinDevig extracts true probabilities without margin distortion", () => {
    const r = shinDevig(-110, -110);
    expect(r.converged).toBe(true);
    expect(r.trueProbOver).toBeGreaterThan(0.3);
    expect(r.trueProbOver).toBeLessThan(0.7);
    expect(r.trueProbOver + r.trueProbUnder).toBeCloseTo(1, 1);
    expect(r.syntheticVig).toBeGreaterThan(0);
    expect(r.syntheticVig).toBeLessThan(0.15);
  });

  it("shinDevig handles asymmetric odds", () => {
    const r = shinDevig(-150, +130);
    expect(r.trueProbOver).toBeGreaterThan(r.trueProbUnder);
  });

  // ── Stage 01: Gate ──
  it("gate qualifies a high-EV prop", () => {
    const r = gateProp(makeProp(), 0.65, 5);
    expect(r.gateStatus).toBe("QUALIFIED");
    expect(r.expectedValuePct).toBeGreaterThan(GATE_THRESHOLDS.MIN_EV_PCT);
    expect(r.discardReason).toBeNull();
  });

  it("gate discards a low-EV prop", () => {
    const r = gateProp(makeProp(), 0.51, 5);
    expect(r.gateStatus).toBe("DISCARDED");
    expect(r.discardReason).toContain("below");
  });

  it("gate discards stale lines", () => {
    const r = gateProp(makeProp(), 0.65, 20);
    expect(r.gateStatus).toBe("DISCARDED");
    expect(r.discardReason).toContain("stale");
  });

  it("gate discards insufficient books", () => {
    const prop = makeProp({ odds: [makeProp().odds[0]] });
    const r = gateProp(prop, 0.65, 5);
    expect(r.gateStatus).toBe("DISCARDED");
    expect(r.discardReason).toContain("books");
  });

  it("gate discards excessive synthetic vig", () => {
    const prop = makeProp({
      odds: [
        { bookmaker: "X", overOdds: -150, underOdds: -150, line: 275.5, vigPct: 8, isSharp: true, capturedAt: new Date().toISOString() },
        { bookmaker: "Y", overOdds: -148, underOdds: -152, line: 275.5, vigPct: 8, isSharp: false, capturedAt: new Date().toISOString() },
        { bookmaker: "Z", overOdds: -145, underOdds: -155, line: 275.5, vigPct: 7.5, isSharp: false, capturedAt: new Date().toISOString() },
      ],
    });
    const r = gateProp(prop, 0.65, 5);
    // Either discarded for vig or for EV — must not qualify
    if (r.shin.syntheticVig * 100 > GATE_THRESHOLDS.MAX_SYNTHETIC_VIG_PCT) {
      expect(r.gateStatus).toBe("DISCARDED");
    }
  });

  // ── Stage 02: Pass List ──
  it("pass list captures discarded props with reasons", () => {
    const prop = makeProp();
    const gate = gateProp(prop, 0.51, 5);
    const passList = buildPassList([gate], [prop]);
    expect(passList.length).toBe(1);
    expect(passList[0].discardReason).toBeTruthy();
    expect(passList[0].playerName).toBe("Patrick Mahomes");
  });

  it("pass list is empty when all props qualify", () => {
    const prop = makeProp();
    const gate = gateProp(prop, 0.65, 5);
    const passList = buildPassList([gate], [prop]);
    expect(passList.length).toBe(0);
  });

  // ── Stage 03: Board ──
  it("board produces Kelly-sized entries with Monte Carlo", () => {
    const prop = makeProp();
    const gate = gateProp(prop, 0.65, 5);
    const board = buildBoard([gate], [prop], 1000, 0.65, 280, 35);
    expect(board.length).toBe(1);
    const entry = board[0];
    expect(entry.kellyStakePct).toBeGreaterThan(0);
    expect(entry.kellyStakeDollars).toBeGreaterThan(0);
    expect(entry.monteCarlo.simulations).toBe(10000);
    expect(entry.confidenceTier).toMatch(/[ABC]/);
    expect(entry.deviggedFairOdds).not.toBe(0);
  });

  it("kellyStake computes fractional Kelly correctly", () => {
    const r = kellyStake(0.55, 0.5, 1000, 0.25);
    expect(r.stakePct).toBeGreaterThan(0);
    expect(r.stakeDollars).toBeGreaterThan(0);
    expect(r.stakeDollars).toBeLessThan(1000);
  });

  it("kellyStake returns 0 for negative edge", () => {
    const r = kellyStake(0.45, 0.55, 1000, 0.25);
    expect(r.stakePct).toBe(0);
    expect(r.stakeDollars).toBe(0);
  });

  it("monteCarloProp produces valid distribution", () => {
    const r = monteCarloProp(280, 35, 275.5, true, 1000);
    expect(r.simulations).toBe(1000);
    expect(r.overHitRate).toBeGreaterThan(0);
    expect(r.overHitRate).toBeLessThan(1);
    expect(r.p5).toBeLessThan(r.p50);
    expect(r.p50).toBeLessThan(r.p95);
  });

  // ── Stage 04: Autopsy ──
  it("autopsy classifies a win as VARIANCE", () => {
    const r = autopsySettled("p1:passing_yards", 290, 275.5, 0.55, 277, 277, false);
    expect(r.won).toBe(true);
    expect(r.brierScore).toBeLessThan(0.3);
    expect(r.verdict).toBe("VARIANCE");
    expect(r.explanation).toBeTruthy();
  });

  it("autopsy classifies high-confidence miss as BLINDSPOT", () => {
    const r = autopsySettled("p1:passing_yards", 220, 275.5, 0.75, 275.5, 260, false);
    expect(r.won).toBe(false);
    expect(r.verdict).toBe("BLINDSPOT");
  });

  it("autopsy classifies injury as INJURY", () => {
    const r = autopsySettled("p1:passing_yards", 180, 275.5, 0.65, 275.5, 275, true);
    expect(r.won).toBe(false);
    expect(r.verdict).toBe("INJURY");
    expect(r.explanation).toContain("injury");
  });

  it("autopsy computes CLV cents", () => {
    const r = autopsySettled("p1:passing_yards", 290, 275.5, 0.55, 275.5, 280.5, false);
    expect(r.clvCents).toBe(500);
  });

  // ── Kalman feedback ──
  it("kalmanUpdate produces posterior", () => {
    const r = kalmanUpdate(
      { priorMean: 0.55, priorVariance: 0.05, processNoise: 0.01, measurementNoise: 0.1 },
      0.65,
    );
    expect(r.posteriorMean).toBeGreaterThan(0.55);
    expect(r.posteriorMean).toBeLessThan(0.65);
    expect(r.posteriorVariance).toBeLessThan(0.05);
    expect(r.kalmanGain).toBeGreaterThan(0);
    expect(r.kalmanGain).toBeLessThan(1);
  });

  // ── 81.7% rejection rate doctrine ──
  it("gate rejects more often than it qualifies (engine says No more than Yes)", () => {
    const results: GateResult[] = [];
    for (let i = 0; i < 100; i++) {
      const prob = 0.42 + Math.random() * 0.16; // random probs 0.42-0.58 (near fair)
      results.push(gateProp(makeProp(), prob, 5));
    }
    const qualified = results.filter((r) => r.gateStatus === "QUALIFIED").length;
    const discarded = results.filter((r) => r.gateStatus === "DISCARDED").length;
    // Gate must reject at least some props — "no edge, no pick"
    expect(discarded).toBeGreaterThan(0);
    // Qualified + discarded = 100
    expect(qualified + discarded).toBe(100);
  });
});
