import { describe, expect, it } from "vitest";
import {
  runPropsSlateShadow,
  propsSlateShadowEnabled,
  PROPS_SLATE_SHADOW_ENABLED_ENV,
  type PropsSlateShadowSource,
} from "./props-slate-shadow.js";
import type { PlayerProp } from "@sports/prediction-engine";

const OFF = {} as NodeJS.ProcessEnv;
const ON = { [PROPS_SLATE_SHADOW_ENABLED_ENV]: "1" } as NodeJS.ProcessEnv;

function prop(over: Partial<PlayerProp> = {}): PlayerProp {
  return {
    playerId: "p1",
    playerName: "Test Player",
    position: "WR",
    team: "KC",
    opponent: "BUF",
    propType: "receptions",
    odds: [
      {
        bookmaker: "Pinnacle",
        overOdds: -110,
        underOdds: -110,
        line: 5.5,
        vigPct: 4.8,
        isSharp: true,
        capturedAt: new Date().toISOString(),
      },
      {
        bookmaker: "DraftKings",
        overOdds: -105,
        underOdds: -115,
        line: 5.5,
        vigPct: 4.5,
        isSharp: false,
        capturedAt: new Date().toISOString(),
      },
    ],
    ...over,
  };
}

/** Two fixture props; only the first carries REAL rate samples. */
const fixtureSource: PropsSlateShadowSource = {
  name: "fixture",
  loadPropLines: async () => [
    {
      prop: prop(),
      rateHistory: {
        playerId: "p1",
        propType: "receptions",
        // Real per-game reception totals (10-game samples with real spread,
        // so the HB group prior is fittable — not degenerate).
        samples: [
          { total: 40, games: 10 },
          { total: 62, games: 10 },
          { total: 51, games: 10 },
          { total: 73, games: 10 },
          { total: 34, games: 10 },
          { total: 66, games: 10 },
          { total: 55, games: 10 },
          { total: 81, games: 10 },
        ],
        line: 5.5,
      },
    },
    {
      // No rateHistory: honest missing probability, never imputed.
      prop: prop({ playerId: "p2", playerName: "No Samples", propType: "receptions" }),
    },
  ],
};

describe("propsSlateShadowEnabled", () => {
  it("defaults OFF", () => {
    expect(propsSlateShadowEnabled(OFF)).toBe(false);
    expect(propsSlateShadowEnabled({ [PROPS_SLATE_SHADOW_ENABLED_ENV]: "" } as NodeJS.ProcessEnv)).toBe(false);
    expect(propsSlateShadowEnabled({ [PROPS_SLATE_SHADOW_ENABLED_ENV]: "0" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("arms only on explicit 1/true/yes/on", () => {
    for (const v of ["1", "true", "yes", "on", "TRUE", " On "]) {
      expect(propsSlateShadowEnabled({ [PROPS_SLATE_SHADOW_ENABLED_ENV]: v } as NodeJS.ProcessEnv)).toBe(true);
    }
  });
});

describe("runPropsSlateShadow", () => {
  it("does NOT invoke runPropsSlate when the gate is off", async () => {
    const r = await runPropsSlateShadow({ env: OFF, source: fixtureSource });
    expect(r.shadow).toBe(true);
    expect(r.weight).toBe(0);
    expect(r.enabled).toBe(false);
    // Null result is the proof: runPropsSlate was never called.
    expect(r.result).toBeNull();
    expect(r.note).toContain("dark by default");
  });

  it("invokes runPropsSlate when the gate is on (call path executes)", async () => {
    const r = await runPropsSlateShadow({
      env: ON,
      source: fixtureSource,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.enabled).toBe(true);
    expect(r.source).toBe("fixture");
    expect(r.result).not.toBeNull();
    // The call path executed: runPropsSlate considered both fixture props.
    expect(r.result!.propsConsidered).toBe(2);
    expect(r.result!.gateResults.length).toBe(1);
  });

  it("sources model P(over) honestly: real samples -> HB probability, no samples -> recorded error", async () => {
    const r = await runPropsSlateShadow({
      env: ON,
      source: fixtureSource,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    const errors = r.result!.errors;
    // p1 had real samples: the HB bridge supplied a probability, so there is
    // NO "missing modelProbOver" error for it.
    expect(errors.filter((e) => e.startsWith("p1:receptions"))).toHaveLength(0);
    // p2 had no samples: recorded as missing, never imputed.
    expect(errors.some((e) => e.includes("p2:receptions") && e.includes("missing modelProbOver"))).toBe(true);
  });

  it("fail-closes honestly when no prop-line source is wired", async () => {
    const r = await runPropsSlateShadow({ env: ON });
    expect(r.enabled).toBe(true);
    expect(r.source).toBe("none");
    expect(r.result).not.toBeNull();
    expect(r.result!.ok).toBe(false);
    expect(r.result!.note).toContain("fail-closed");
    expect(r.note).toContain("No prop-line source is wired");
  });
});
