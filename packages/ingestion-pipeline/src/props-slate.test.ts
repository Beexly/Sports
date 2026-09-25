import { describe, expect, it } from "vitest";
import {
  devigPropBook,
  propKellyStake,
  propMonteCarlo,
  runPropsSlate,
} from "./props-slate.js";
import type { PlayerProp } from "@sports/prediction-engine";

function prop(over: Partial<PlayerProp> = {}): PlayerProp {
  return {
    playerId: "p1",
    playerName: "Test Player",
    propType: "receptions",
    line: 5.5,
    odds: [
      { book: "b1", over: 1.91, under: 1.91 },
      { book: "b2", over: 1.95, under: 1.87 },
    ],
    ...over,
  } as PlayerProp;
}

describe("props-slate", () => {
  it("fail-closes on empty slate", () => {
    const r = runPropsSlate({
      props: [],
      modelProbOver: {},
      lineFreshnessMinutes: 30,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.ok).toBe(false);
    expect(r.note).toContain("fail-closed");
  });

  it("gates props and builds pass list + board", () => {
    const r = runPropsSlate({
      props: [prop()],
      modelProbOver: { "p1:receptions": 0.62 },
      lineFreshnessMinutes: 15,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.propsConsidered).toBe(1);
    expect(r.gateResults.length).toBe(1);
    expect(Array.isArray(r.passList)).toBe(true);
    expect(Array.isArray(r.board)).toBe(true);
  });

  it("records an error when modelProbOver is missing — never imputes", () => {
    const r = runPropsSlate({
      props: [prop()],
      modelProbOver: {},
      lineFreshnessMinutes: 15,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("missing modelProbOver");
  });
});

describe("props-slate helpers", () => {
  it("devigPropBook fail-closes on missing odds", () => {
    expect(devigPropBook(null, 1.9)).toBeNull();
    expect(devigPropBook(1.9, 1.0)).toBeNull();
    const r = devigPropBook(1.91, 1.91);
    expect(r).not.toBeNull();
  });

  it("propKellyStake fail-closes on invalid inputs", () => {
    expect(propKellyStake(null, 0.5, 1000)).toBeNull();
    expect(propKellyStake(0.6, 1.0, 1000)).toBeNull();
    expect(propKellyStake(0.6, 0.45, 1000)).not.toBeNull();
  });

  it("propMonteCarlo fail-closes on invalid sd", () => {
    expect(propMonteCarlo(5, 0, 5.5, true)).toBeNull();
    expect(propMonteCarlo(5, 2, 5.5, true, 500)).not.toBeNull();
  });
});
