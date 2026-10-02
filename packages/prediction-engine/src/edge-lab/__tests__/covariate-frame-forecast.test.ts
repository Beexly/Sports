import { describe, expect, it } from "vitest";
import {
  composeFrameForecast,
  FRAME_FORECAST_METHOD_TAG,
  type FrameForecastRequest,
} from "../covariate-frame-forecast.js";
import {
  P_FEATURE_SET,
  pFeatureSetFor,
  knownSlugRoots,
  type PFeatureSetEntry,
} from "../covariate-pfeatures.js";
import { sepForKickoff, nextGameCovariate, type CovariateRow } from "../covariate-bus.js";

// A real HB feature set entry (player_receptions → aDOT×SEP).
const REC: PFeatureSetEntry = P_FEATURE_SET.find((e) => e.slugRoot === "player_receptions")!;

function rx(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: 4.3,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

describe("PFeatureSet coverage", () => {
  it("registers exactly the prop lines the HB modules actually score", () => {
    const roots = knownSlugRoots();
    expect(roots).toContain("player_receptions");
    expect(roots).toContain("player_receiving_yards");
    expect(roots).toContain("player_rush_yards");
    expect(roots).toContain("player_rush_attempts");
    expect(roots).toContain("player_rush_tds");
    expect(roots).toContain("player_pass_yds");
    expect(roots).toContain("player_pass_tds");
    expect(roots).toContain("player_completions");
    expect(roots).toContain("player_interceptions");
    expect(roots).toContain("player_sacks");
    expect(roots).toContain("player_reception_tds");
    expect(roots).toContain("player_air_yards");
  });

  it("every feature is file-anchored to a real module symbol", () => {
    for (const e of P_FEATURE_SET) {
      expect(e.module).toMatch(/^props-hb/);
      expect(e.methodTagSymbol.length).toBeGreaterThan(0);
      for (const f of e.features) {
        expect(f.sourceFile).toMatch(/\.ts$/);
        expect(f.sourceSymbol.length).toBeGreaterThan(0);
        expect(["NGS", "PBP", "BIND", "SNAP"]).toContain(f.source);
        expect(f.schemaModel.length).toBeGreaterThan(0);
      }
    }
  });

  it("aDOT×SEP entry carries the SEP bind as a BIND-sourced feature", () => {
    const e = pFeatureSetFor("player_receptions")!;
    const sep = e.features.find((f) => f.field === "avgSeparation");
    expect(sep).toBeDefined();
    expect(sep!.source).toBe("BIND");
    expect(sep!.sourceFile).toBe("props-hb-adot-sep-bind.ts");
  });

  it("returns null (fail-closed) for an unknown / slug-miss", () => {
    // @ts-expect-error intentional slug that no HB module scores
    expect(pFeatureSetFor("player_fantasy_points")).toBeNull();
    expect(pFeatureSetFor("not_a_slug" as any)).toBeNull();
  });
});

describe("FrameForecast q-compose", () => {
  it("composes firePostedProp, never replaces it; fires through when posted clears", () => {
    // p=0.58 Over vs a -115 / -105 two-way. De-vigged q ≈ 0.53, so edgeOver>0.
    const req: FrameForecastRequest = {
      slugRoot: "player_receptions",
      featureSet: REC,
      pBySide: { over: 0.58, under: 0.42 },
      books: [{ book: "fanduel", american: -115 }],
      quote: { overAmerican: -115, underAmerican: -105 },
    };
    const f = composeFrameForecast(req);
    expect(f.methodTag).toBe(FRAME_FORECAST_METHOD_TAG);
    expect(f.priced).toBe(false);
    expect(f.module).toBe("props-hb-adot-sep.ts");
    // firePostedProp verdict is threaded, not overwritten.
    expect(f.sides[0]!.fire).not.toBeNull();
    expect(f.fire).toBe(true);
  });

  it("does NOT invent the missing side of a one-sided book", () => {
    // Book posts Over only (single OddsLineSnapshot row — prop-line-rows.ts).
    const req: FrameForecastRequest = {
      slugRoot: "player_receptions",
      featureSet: REC,
      pBySide: { over: 0.6 }, // under intentionally absent
      books: [{ book: "posted_over", american: -105 }],
    };
    const f = composeFrameForecast(req);
    const only = f.sides.filter((s) => s.fire !== null);
    expect(only.length).toBe(1); // exactly one posted side, never invented
    expect(f.sides.find((s) => s.side === "under")!.fire).toBeNull();
    // One-sided is honest; it may still fire on the posted side.
    expect(f.refuse).toBe("one_sided_only");
  });

  it("fail-closed: no p on either side → refuse no_p, never fabricates a fire", () => {
    const req: FrameForecastRequest = {
      slugRoot: "player_receptions",
      featureSet: REC,
      pBySide: {},
      books: [{ book: "fanduel", american: -110 }],
    };
    const f = composeFrameForecast(req);
    expect(f.fire).toBe(false);
    expect(f.refuse).toBe("no_p");
    expect(f.sides.every((s) => s.fire === null)).toBe(true);
  });

  it("fail-closed: firePostedProp says no fire → frame does not manufacture one", () => {
    // p=0.55 vs -110: shin edge may exist, but if quote unpriced the gate refuses.
    const req: FrameForecastRequest = {
      slugRoot: "player_receptions",
      featureSet: REC,
      pBySide: { over: 0.55, under: 0.45 },
      books: [{ book: "fanduel", american: -110 }],
      // no quote → shin diagnostic returns shin_unpriced inside firePostedProp
      quote: null,
    };
    const f = composeFrameForecast(req);
    // Whatever firePostedProp decided, the frame honors it. We never flip it.
    const overFire = f.sides.find((s) => s.side === "over")!.fire;
    expect(overFire).not.toBeNull();
    expect(overFire!.fire).toBe(f.fire);
  });
});

describe("bus + feature-set integration (sepForKickoff → feature anchor)", () => {
  it("sepForKickoff feeds the aDOT×SEP feature field end-to-end", () => {
    const rows = [rx({ week: 4, avgSeparation: 3.1 })];
    const cell = sepForKickoff(rows, "00-0030501-2", 2024, 6);
    expect(cell).not.toBeNull();
    // The field the PFeatureSet labels BIND-sourced matches the bus output.
    const e = pFeatureSetFor("player_receptions")!;
    const sepFeat = e.features.find((f) => f.field === "avgSeparation")!;
    expect(sepFeat.source).toBe("BIND");
    expect(cell!.value).toBe(3.1);
  });

  it("nextGameCovariate + PFeatureSet agree on avgSeparation presence", () => {
    const rows = [rx({ week: 3, avgSeparation: 2.2 })];
    const cell = nextGameCovariate(rows, "00-0030501-2", 2024, 5, "receiving", "avgSeparation");
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(2.2);
  });
});
