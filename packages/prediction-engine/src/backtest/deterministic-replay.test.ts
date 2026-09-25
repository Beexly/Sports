import { describe, expect, it } from "vitest";
import {
  ReplayEngine,
  seededRng,
  type ReplayEvent,
  type StrategyFn,
} from "./deterministic-replay.js";

function makeEvents(): ReplayEvent[] {
  return [
    { t: 0, eventId: "e1", price: 0.55, volume: 100 },
    { t: 1, eventId: "e1", price: 0.58, volume: 120 },
    { t: 2, eventId: "e2", price: null, volume: 0 }, // missing market
    { t: 3, eventId: "e2", price: 0.42, volume: 80 },
    { t: 4, eventId: "e3", type: "goal", data: {} },
  ];
}

const simpleStrategy: StrategyFn = (_events, rng, _exposure) => {
  const r = rng();
  return {
    decision: r > 0.5 ? "BUY" : "HOLD",
    reason: `rng=${r.toFixed(4)}`,
    stake: r > 0.5 ? 10 : 0,
  };
};

describe("V4: deterministic replay backtester", () => {
  it("same events + seed twice → identical journals", () => {
    const engine1 = new ReplayEngine();
    engine1.configure({ seed: 42, risk: { maxExposure: 1000 } });
    const r1 = engine1.replay(makeEvents(), simpleStrategy);

    const engine2 = new ReplayEngine();
    engine2.configure({ seed: 42, risk: { maxExposure: 1000 } });
    const r2 = engine2.replay(makeEvents(), simpleStrategy);

    expect(r1.journal).toEqual(r2.journal);
    expect(r1.skipped).toBe(r2.skipped);
  });

  it("different seeds → different journals", () => {
    const engine1 = new ReplayEngine();
    engine1.configure({ seed: 42, risk: { maxExposure: 1000 } });
    const r1 = engine1.replay(makeEvents(), simpleStrategy);

    const engine2 = new ReplayEngine();
    engine2.configure({ seed: 43, risk: { maxExposure: 1000 } });
    const r2 = engine2.replay(makeEvents(), simpleStrategy);

    // Very likely different with different seeds
    expect(JSON.stringify(r1.journal)).not.toBe(JSON.stringify(r2.journal));
  });

  it("missing market snapshot → SKIPPED_NO_MARKET, no invented price", () => {
    const engine = new ReplayEngine();
    engine.configure({ seed: 42, risk: { maxExposure: 1000 } });
    const r = engine.replay(makeEvents(), simpleStrategy);
    const skipped = r.journal.filter((d) => d.decision === "SKIPPED_NO_MARKET");
    expect(skipped.length).toBe(1);
    expect(skipped[0].skipped).toBe(true);
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  });

  it("no config → engine stays inactive, zero decisions", () => {
    const engine = new ReplayEngine();
    const r = engine.replay(makeEvents(), simpleStrategy);
    expect(r.state).toBe("INACTIVE_NO_CONFIG");
    expect(r.journal).toHaveLength(0);
    expect(r.pnl).toBe(0);
  });

  it("risk gate breach → killSwitch fires, journal records it", () => {
    const engine = new ReplayEngine();
    let killFired = false;
    engine.configure({
      seed: 42,
      risk: {
        maxExposure: 1000,
        killSwitch: () => {
          if (!killFired) {
            killFired = true;
            return true;
          }
          return false;
        },
      },
    });
    const r = engine.replay(makeEvents(), simpleStrategy);
    expect(r.state).toBe("KILLED");
    const kills = r.journal.filter((d) => d.decision === "KILL");
    expect(kills.length).toBe(1);
  });

  it("exposure limit blocks oversized stakes", () => {
    const engine = new ReplayEngine();
    engine.configure({ seed: 42, risk: { maxExposure: 5 } });
    const bigStakeStrategy: StrategyFn = () => ({
      decision: "BUY",
      reason: "big stake",
      stake: 100,
    });
    const r = engine.replay(makeEvents(), bigStakeStrategy);
    const skipped = r.journal.filter((d) => d.decision === "SKIPPED_EXPOSURE");
    expect(skipped.length).toBeGreaterThan(0);
  });

  it("seededRng produces deterministic sequence", () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("journal records every decision with t, state, decision, reason", () => {
    const engine = new ReplayEngine();
    engine.configure({ seed: 42, risk: { maxExposure: 1000 } });
    const r = engine.replay(makeEvents(), simpleStrategy);
    for (const d of r.journal) {
      expect(typeof d.t).toBe("number");
      expect(typeof d.state).toBe("string");
      expect(typeof d.decision).toBe("string");
      expect(typeof d.reason).toBe("string");
    }
  });
});
