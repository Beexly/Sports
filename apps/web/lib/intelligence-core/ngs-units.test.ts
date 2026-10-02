/**
 * NGS unit regression.
 *
 * `next_gen_stats.pctShareIntendedAirYards` is stored in PERCENTAGE POINTS.
 * Measured on prod (read-only, hermes_ro, 2026-09-30), 2,856 non-null rows:
 *
 *   min -3.95   max 94.47   mean 29.02   rows > 1.0: 1,493
 *
 * The adapter passed that raw value to clamp01(), which clamps to [0, 1], so
 * 99% of rows saturated at 1.0 and the term became a near-constant +0.298 lean
 * on every NGS row — carrying no information while looking like signal. The
 * prose then rendered "aDOT share 9447%" in customer-facing `why` strings.
 *
 * This went unnoticed until #975 populated homeNgs/awayNgs for the first time;
 * the bug predates that merge.
 *
 * The counter-test matters as much as the test: `targetShare` on the
 * player-stat surface LOOKS like the same field but is a true 0-1 fraction
 * (prod max 0.667, zero rows above 1). A blanket "divide everything by 100"
 * would break it, so these values are pinned from measurement rather than
 * assumed.
 */

import { describe, it, expect } from "vitest";
import { ngsObservations, type NgsRow } from "./signal-adapters";

function row(over: Partial<NgsRow>): NgsRow {
  return {
    playerName: "Test Player",
    position: "WR",
    team: "BUF",
    opponent: "NYJ",
    week: 3,
    season: 2026,
    statType: "receiving",
    fetchedAt: new Date("2026-09-30T12:00:00Z"),
    ...over,
  } as NgsRow;
}

const NOW = new Date("2026-09-30T12:00:00Z");

describe("NGS aDOT share units", () => {
  it("treats pctShareIntendedAirYards as percentage points, not a 0-1 fraction", () => {
    // 29.02 is the prod mean. As a fraction it clamped to 1.0 -> lean 0.300.
    // Correctly read as 29.02% it is 0.2902 -> lean 0.08706.
    const [obs] = ngsObservations([row({ pctShareIntendedAirYards: 29.02 })], "home", NOW);
    expect(obs.lean).toBeCloseTo(0.2902 * 0.3, 5);
    expect(obs.lean!).toBeLessThan(0.1);
  });

  it("renders the percentage in prose without multiplying by 100", () => {
    const [obs] = ngsObservations([row({ pctShareIntendedAirYards: 68.12 })], "home", NOW);
    expect(obs.fact).toContain("aDOT share 68.1%");
    expect(obs.fact).not.toContain("6812%");
  });

  it("saturates only at a genuine 100%, not at 1.0", () => {
    // The bug's signature: a 1.49% share (a real low value) and a 149% share
    // both produced lean 0.300. They must now differ.
    const [low] = ngsObservations([row({ pctShareIntendedAirYards: 1.49 })], "home", NOW);
    const [high] = ngsObservations([row({ pctShareIntendedAirYards: 94.47 })], "home", NOW);
    expect(low.lean).not.toBeCloseTo(high.lean!, 3);
    expect(high.lean).toBeCloseTo(0.9447 * 0.3, 5);
  });

  it("clamps the prod maximum at 94.47% without exceeding the cap", () => {
    const [obs] = ngsObservations([row({ pctShareIntendedAirYards: 94.47 })], "home", NOW);
    expect(obs.lean!).toBeLessThanOrEqual(0.3);
  });

  it("still negates for the away side (sign convention preserved)", () => {
    const [home] = ngsObservations([row({ pctShareIntendedAirYards: 40 })], "home", NOW);
    const [away] = ngsObservations([row({ pctShareIntendedAirYards: 40 })], "away", NOW);
    expect(home.lean).toBeCloseTo(-away.lean!, 10);
  });

  it("handles a negative prod value without producing an inverted lean", () => {
    // Prod min is -3.95. clamp01 must floor it at 0, not return a negative lean.
    const [obs] = ngsObservations([row({ pctShareIntendedAirYards: -3.95 })], "home", NOW);
    expect(obs.lean).toBeCloseTo(0, 10);
  });
});

describe("targetShare is NOT rescaled — it is already a fraction", () => {
  it("renders targetShare as a percentage from its true 0-1 value", async () => {
    // Prod max is 0.667 with zero rows above 1. Dividing this by 100 would
    // render "0%" for every player.
    const { playerStatObservations } = await import("./signal-adapters");
    const [obs] = playerStatObservations(
      [
        {
          playerId: "p1",
          playerName: "Test Player",
          position: "WR",
          team: "BUF",
          season: 2026,
          week: 3,
          targetShare: 0.6667,
          fantasyPointsPpr: null,
          passingEpa: null,
          rushingEpa: null,
          receivingEpa: null,
          fetchedAt: new Date("2026-09-30T12:00:00Z"),
        } as never,
      ],
      "home",
      NOW,
    );
    expect(obs.fact).toContain("67%");
    expect(obs.fact).not.toContain("0.7%");
    expect(obs.fact).not.toContain("0%");
  });
});