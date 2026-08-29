import { describe, expect, test } from "vitest";
import {
  computeSitrepVetoes,
  type SitrepVetoInput,
  type SitrepVetoResult,
  REST_DEFICIT_DAYS,
  HIGH_WIND_MPH,
  REVERSE_LINE_MOVE_MIN_PTS,
  SITREP_V1_FLAGS,
} from "../src/sitrep-vetoes";

// ────────────────────────────────────────────────────────────
// Base "all-OK" input — none of the v1 flags should fire.
// Used as the spread in table-driven tests below.
// ────────────────────────────────────────────────────────────

const BASE: SitrepVetoInput = {
  market: "SPREAD",
  pickedSide: "HOME",
  restDaysPicked: 7,
  restDaysOpponent: 7,
  startingQbOut: null,
  windMph: 5,
  openingLine: -3,
  latestLine: -3,
};

// ────────────────────────────────────────────────────────────
// REST_DEFICIT
// ────────────────────────────────────────────────────────────

describe("computeSitrepVetoes — REST_DEFICIT", () => {
  test("does NOT fire at the boundary of -1 day (above the threshold)", () => {
    const r = computeSitrepVetoes({ ...BASE, restDaysPicked: 6, restDaysOpponent: 7 });
    expect(r.flags).not.toContain("REST_DEFICIT");
  });

  test("fires at the boundary of -2 days (inclusive of threshold)", () => {
    const r = computeSitrepVetoes({ ...BASE, restDaysPicked: 5, restDaysOpponent: 7 });
    expect(r.flags).toContain("REST_DEFICIT");
    expect(r.provenance[0]).toMatch(/diff=-2d/);
  });

  test("fires at -7 days (extreme)", () => {
    const r = computeSitrepVetoes({ ...BASE, restDaysPicked: 0, restDaysOpponent: 7 });
    expect(r.flags).toContain("REST_DEFICIT");
    expect(r.provenance[0]).toMatch(/diff=-7d/);
  });

  test("does NOT fire when picked team has MORE rest (positive diff)", () => {
    const r = computeSitrepVetoes({ ...BASE, restDaysPicked: 10, restDaysOpponent: 7 });
    expect(r.flags).not.toContain("REST_DEFICIT");
  });

  test("absent rest data on either side = honest miss, no flag", () => {
    const r1 = computeSitrepVetoes({ ...BASE, restDaysPicked: null });
    const r2 = computeSitrepVetoes({ ...BASE, restDaysOpponent: null });
    const r3 = computeSitrepVetoes({ ...BASE, restDaysPicked: null, restDaysOpponent: null });
    expect(r1.flags).not.toContain("REST_DEFICIT");
    expect(r2.flags).not.toContain("REST_DEFICIT");
    expect(r3.flags).not.toContain("REST_DEFICIT");
  });

  test("NaN / negative rest days = honest miss (defensive, not a flag)", () => {
    const r1 = computeSitrepVetoes({ ...BASE, restDaysPicked: Number.NaN, restDaysOpponent: 7 });
    const r2 = computeSitrepVetoes({ ...BASE, restDaysPicked: -1, restDaysOpponent: 7 });
    expect(r1.flags).not.toContain("REST_DEFICIT");
    expect(r2.flags).not.toContain("REST_DEFICIT");
  });
});

// ────────────────────────────────────────────────────────────
// QB_OUT
// ────────────────────────────────────────────────────────────

describe("computeSitrepVetoes — QB_OUT", () => {
  test("fires when startingQbOut is true", () => {
    const r = computeSitrepVetoes({ ...BASE, startingQbOut: true });
    expect(r.flags).toContain("QB_OUT");
    expect(r.provenance[0]).toMatch(/starting QB listed out or doubtful/);
  });

  test("does NOT fire when startingQbOut is false (starter confirmed)", () => {
    const r = computeSitrepVetoes({ ...BASE, startingQbOut: false });
    expect(r.flags).not.toContain("QB_OUT");
  });

  test("does NOT fire when startingQbOut is null (data not joined)", () => {
    // null is the common case until the injuries feed wires to pre-game reads.
    const r = computeSitrepVetoes({ ...BASE, startingQbOut: null });
    expect(r.flags).not.toContain("QB_OUT");
  });
});

// ────────────────────────────────────────────────────────────
// HIGH_WIND_TOTAL
// ────────────────────────────────────────────────────────────

describe("computeSitrepVetoes — HIGH_WIND_TOTAL", () => {
  test("fires on TOTAL pick with wind 21mph (just over)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", windMph: 21 });
    expect(r.flags).toContain("HIGH_WIND_TOTAL");
    expect(r.provenance[0]).toMatch(/wind=21mph > 20mph on TOTAL pick/);
  });

  test("fires on TOTAL pick with wind 35mph (extreme)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "UNDER", windMph: 35 });
    expect(r.flags).toContain("HIGH_WIND_TOTAL");
  });

  test("does NOT fire on TOTAL pick with wind EXACTLY 20mph (strict greater)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", windMph: 20 });
    expect(r.flags).not.toContain("HIGH_WIND_TOTAL");
  });

  test("does NOT fire on SPREAD pick with wind 25mph (market-scope guard)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "SPREAD", pickedSide: "HOME", windMph: 25 });
    expect(r.flags).not.toContain("HIGH_WIND_TOTAL");
  });

  test("does NOT fire on MONEYLINE pick with wind 25mph (market-scope guard)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "MONEYLINE", pickedSide: "HOME", windMph: 25 });
    expect(r.flags).not.toContain("HIGH_WIND_TOTAL");
  });

  test("absent wind = honest miss, no flag", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", windMph: null });
    expect(r.flags).not.toContain("HIGH_WIND_TOTAL");
  });

  test("NaN / negative wind = honest miss (defensive)", () => {
    const r1 = computeSitrepVetoes({ ...BASE, market: "TOTAL", windMph: Number.NaN });
    const r2 = computeSitrepVetoes({ ...BASE, market: "TOTAL", windMph: -1 });
    expect(r1.flags).not.toContain("HIGH_WIND_TOTAL");
    expect(r2.flags).not.toContain("HIGH_WIND_TOTAL");
  });
});

// ────────────────────────────────────────────────────────────
// REVERSE_LINE_MOVE
// ────────────────────────────────────────────────────────────

describe("computeSitrepVetoes — REVERSE_LINE_MOVE", () => {
  test("fires on TOTAL OVER when total steamed up (move > 0)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", openingLine: 44, latestLine: 45.5 });
    expect(r.flags).toContain("REVERSE_LINE_MOVE");
  });

  test("fires on TOTAL UNDER when total steamed down (move < 0)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "UNDER", openingLine: 48, latestLine: 46 });
    expect(r.flags).toContain("REVERSE_LINE_MOVE");
  });

  test("does NOT fire on TOTAL OVER when total steamed DOWN (same direction)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", openingLine: 48, latestLine: 46 });
    expect(r.flags).not.toContain("REVERSE_LINE_MOVE");
  });

  test("fires on SPREAD HOME when home became LESS of a favorite (line moved up = less negative)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "SPREAD", pickedSide: "HOME", openingLine: -7, latestLine: -3 });
    expect(r.flags).toContain("REVERSE_LINE_MOVE");
  });

  test("does NOT fire on SPREAD HOME when home became MORE of a favorite (line moved down = more negative)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "SPREAD", pickedSide: "HOME", openingLine: -3, latestLine: -7 });
    expect(r.flags).not.toContain("REVERSE_LINE_MOVE");
  });

  test("does NOT fire below the min-move threshold (0.5pt) — sub-half-point noise is the market every minute", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", openingLine: 44, latestLine: 44.3 });
    expect(r.flags).not.toContain("REVERSE_LINE_MOVE");
  });

  test("does NOT fire when only one snapshot exists (no opening OR no latest)", () => {
    const r1 = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", openingLine: null, latestLine: 45 });
    const r2 = computeSitrepVetoes({ ...BASE, market: "TOTAL", pickedSide: "OVER", openingLine: 44, latestLine: null });
    expect(r1.flags).not.toContain("REVERSE_LINE_MOVE");
    expect(r2.flags).not.toContain("REVERSE_LINE_MOVE");
  });

  test("does NOT fire on MONEYLINE in v1 (dispatch was market-unscoped; v1 scopes to SPREAD+TOTAL)", () => {
    const r = computeSitrepVetoes({ ...BASE, market: "MONEYLINE", pickedSide: "HOME", openingLine: -150, latestLine: -110 });
    expect(r.flags).not.toContain("REVERSE_LINE_MOVE");
  });
});

// ────────────────────────────────────────────────────────────
// Output shape (closed set; provenance order; purity)
// ────────────────────────────────────────────────────────────

describe("computeSitrepVetoes — output shape", () => {
  test("flags contains only v1 closed-set entries", () => {
    const r = computeSitrepVetoes({
      ...BASE,
      restDaysPicked: 0,
      restDaysOpponent: 7,
      startingQbOut: true,
      market: "TOTAL",
      windMph: 30,
      openingLine: 44,
      latestLine: 50,
    });
    for (const f of r.flags) {
      expect(SITREP_V1_FLAGS).toContain(f);
    }
  });

  test("provenance order matches flags order (parallel arrays)", () => {
    const r = computeSitrepVetoes({
      ...BASE,
      restDaysPicked: 0,
      restDaysOpponent: 7,
      startingQbOut: true,
      market: "TOTAL",
      windMph: 30,
      openingLine: 44,
      latestLine: 50,
    });
    expect(r.provenance.length).toBe(r.flags.length);
  });

  test("purity: same input produces same output (no shared mutable state)", () => {
    const input: SitrepVetoInput = { ...BASE, restDaysPicked: 0, restDaysOpponent: 7 };
    const a: SitrepVetoResult = computeSitrepVetoes(input);
    const b: SitrepVetoResult = computeSitrepVetoes(input);
    expect(a).toEqual(b);
  });

  test("no flag fires on a clean BASE input (negative control)", () => {
    const r = computeSitrepVetoes(BASE);
    expect(r.flags).toEqual([]);
    expect(r.provenance).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
// Constants exported for the read-side (GB-3) and the public
// renderer (GB-5) to read; tests prove they are reachable.
// ────────────────────────────────────────────────────────────

describe("SITREP v1 constants", () => {
  test("REST_DEFICIT_DAYS = 2 (per dispatch)", () => {
    expect(REST_DEFICIT_DAYS).toBe(2);
  });
  test("HIGH_WIND_MPH = 20 (per dispatch)", () => {
    expect(HIGH_WIND_MPH).toBe(20);
  });
  test("REVERSE_LINE_MOVE_MIN_PTS = 0.5 (sub-half-point is market noise)", () => {
    expect(REVERSE_LINE_MOVE_MIN_PTS).toBe(0.5);
  });
  test("SITREP_V1_FLAGS is the closed set, exactly 4 entries", () => {
    expect(SITREP_V1_FLAGS).toEqual([
      "REST_DEFICIT",
      "QB_OUT",
      "HIGH_WIND_TOTAL",
      "REVERSE_LINE_MOVE",
    ]);
  });
});
