/**
 * Characterization pins for the signal spine (G-04) — gate-wiring batch 2.
 *
 * These pin CURRENT behavior of spine.ts exactly as it stands, including
 * the defect flagged inline (severity escaping its documented 0..1 range).
 * A red pin after a future edit means behavior moved and must be reviewed,
 * not silently re-pinned. Sibling suite: spine.test.ts (19 tests).
 */
import { describe, expect, it } from "vitest";
import {
  EMPTY_CONTEXT,
  NEUTRAL_READ,
  THRESHOLDS,
  effectsFor,
  environmentScalar,
  gameKeyOf,
  multiplierOf,
  ramp,
  readSignals,
  type GameEnvironment,
  type SignalContext,
  type SignalSubject,
} from "./spine";

const subj = (name: string, pos: SignalSubject["pos"], team: string, opp?: string): SignalSubject => ({
  name,
  pos,
  team,
  opp,
});

const mkEnv = (overrides: Partial<GameEnvironment> = {}): GameEnvironment => ({
  gameKey: gameKeyOf("AAA", "BBB"),
  roof: "open",
  windMph: null,
  gustMph: null,
  precipChance: null,
  total: null,
  impliedTotals: {},
  spread: null,
  favourite: null,
  backupQbTeams: [],
  source: "characterization",
  ...overrides,
});

const ctxWith = (overrides: Partial<SignalContext>): SignalContext => ({ ...EMPTY_CONTEXT, ...overrides });

describe("spine characterization — pure helpers", () => {
  it("gameKeyOf is order-independent and joins sorted team codes", () => {
    expect(gameKeyOf("BBB", "AAA")).toBe("AAA@BBB");
    expect(gameKeyOf("AAA", "BBB")).toBe(gameKeyOf("BBB", "AAA"));
  });

  it("environmentScalar hits its exact breakpoints and clamps at both ends", () => {
    const at = (implied: number) => environmentScalar(mkEnv({ impliedTotals: { AAA: implied } }), "AAA");
    expect(at(15)).toBeCloseTo(0.35, 10); // documented floor
    expect(at(22)).toBeCloseTo(1.0, 10); // league-average pivot
    expect(at(30)).toBeCloseTo(1.3, 10); // documented cap
    expect(at(18.5)).toBeCloseTo(0.675, 10); // midpoint of the low branch
    expect(at(10)).toBeCloseTo(0.35, 10); // below the floor clamps, never discounts further
    expect(at(40)).toBeCloseTo(1.3, 10); // above the cap clamps
    expect(environmentScalar(undefined, "AAA")).toBe(1); // absent data is neutral
    expect(environmentScalar(mkEnv(), "ZZZ")).toBe(1); // team not in the map is neutral
  });

  it("multiplierOf clamps to [0.55, 1.45] around the default base of 14", () => {
    expect(multiplierOf(0)).toBe(1);
    expect(multiplierOf(100)).toBe(1.45);
    expect(multiplierOf(-100)).toBe(0.55);
    expect(multiplierOf(1.4)).toBeCloseTo(1.1, 10);
  });

  it("ramp with floor === full is a step at the value", () => {
    expect(ramp(9.99, 10, 10)).toBe(0);
    expect(ramp(10, 10, 10)).toBe(1);
  });

  it("readSignals returns the NEUTRAL_READ object itself when nothing is measured", () => {
    expect(readSignals(subj("P", "WR", "AAA", "BBB"), EMPTY_CONTEXT)).toBe(NEUTRAL_READ);
  });

  it("a thin-sample-only read has delta 0, multiplier 1, confidence 0.5, and one zero-weight effect", () => {
    const read = readSignals(subj("P", "WR", "AAA", "BBB"), ctxWith({ thinSample: ["P"] }));
    expect(read.effects).toHaveLength(1);
    expect(read.effects[0]!.key).toBe("thin_sample");
    expect(read.effects[0]!.weight).toBe(0);
    expect(read.delta).toBe(0);
    expect(read.multiplier).toBe(1);
    expect(read.confidence).toBe(0.5);
  });
});

describe("spine characterization — effect arithmetic", () => {
  it("DEFECT (pinned, not fixed): vacated-usage severity escapes its documented 0..1 range in a top offense", () => {
    // SignalEffect.severity is documented "0..1. How much of the nominal
    // weight this instance earns." The usage path multiplies by
    // environmentScalar AFTER the Math.min(1, ...) clamp, so at an implied
    // total of 30 (scalar 1.3) a full-share first beneficiary records
    // severity 1.3 and a weight of 5.5 * 1.3 = 7.15 for a WR.
    const env = mkEnv({ impliedTotals: { AAA: 30 } });
    const ctx = ctxWith({
      environments: [env],
      vacated: [{ team: "AAA", absent: "Out", share: 0.5, beneficiaries: ["P"], source: "characterization" }],
    });
    const vac = effectsFor(subj("P", "WR", "AAA", "BBB"), ctx).find((e) => e.key === "vacated_usage");
    expect(vac).toBeDefined();
    expect(vac!.severity).toBeCloseTo(1.3, 10);
    expect(vac!.severity).toBeGreaterThan(1);
    expect(vac!.weight).toBeCloseTo(7.15, 10);
  });

  it("coverage_downgrade severity is exactly environmentScalar (same >1 escape in a top offense)", () => {
    const env = mkEnv({ impliedTotals: { AAA: 30 } });
    const ctx = ctxWith({
      environments: [env],
      coverage: [{ team: "AAA", absentDefender: "CB1", benefits: ["WR"], source: "characterization" }],
    });
    const cov = effectsFor(subj("P", "WR", "AAA", "BBB"), ctx).find((e) => e.key === "coverage_downgrade");
    expect(cov).toBeDefined();
    expect(cov!.severity).toBeCloseTo(1.3, 10);
    expect(cov!.weight).toBeCloseTo(2.2 * 1.3, 10);
  });

  it("vacated-usage beneficiary cuts decay by half per depth step", () => {
    const ctx = ctxWith({
      vacated: [{ team: "AAA", absent: "Out", share: 0.4, beneficiaries: ["First", "Second", "Third"], source: "characterization" }],
    });
    const second = effectsFor(subj("Second", "WR", "AAA"), ctx).find((e) => e.key === "vacated_usage");
    const third = effectsFor(subj("Third", "WR", "AAA"), ctx).find((e) => e.key === "vacated_usage");
    // No environment: usageScalar is 1. cut(idx1) = 1/2 -> sev min(1, 0.4*0.5*2) = 0.4
    expect(second!.severity).toBeCloseTo(0.4, 10);
    expect(second!.weight).toBeCloseTo(5.5 * 0.4, 10);
    // cut(idx2) = 1/4 -> sev min(1, 0.4*0.25*2) = 0.2
    expect(third!.severity).toBeCloseTo(0.2, 10);
    expect(third!.weight).toBeCloseTo(5.5 * 0.2, 10);
  });

  it("a QB beneficiary earns no vacated-usage effect (nominal weight is 0 for QB)", () => {
    const ctx = ctxWith({
      vacated: [{ team: "AAA", absent: "Out", share: 0.5, beneficiaries: ["P"], source: "characterization" }],
    });
    expect(effectsFor(subj("P", "QB", "AAA"), ctx).some((e) => e.key === "vacated_usage")).toBe(false);
  });

  it("wind severity is the max of the sustained and gust ramps", () => {
    const env = mkEnv({ windMph: 20, gustMph: 35 });
    const wind = effectsFor(subj("Q", "QB", "AAA", "BBB"), ctxWith({ environments: [env] })).find((e) => e.key === "wind");
    expect(wind).toBeDefined();
    expect(wind!.severity).toBe(1); // gust ramp saturates: (35-25)/(35-25)
    expect(wind!.weight).toBeCloseTo(-4.5, 10);
    expect(THRESHOLDS.windSustainedFloor).toBe(15);
  });

  it("backup_qb fires at fixed severity 1 for pass-catchers and not at all for DST", () => {
    const env = mkEnv({ backupQbTeams: ["AAA"] });
    const ctx = ctxWith({ environments: [env] });
    const wr = effectsFor(subj("P", "WR", "AAA", "BBB"), ctx).find((e) => e.key === "backup_qb");
    expect(wr).toBeDefined();
    expect(wr!.severity).toBe(1);
    expect(wr!.weight).toBeCloseTo(-2.0, 10);
    expect(effectsFor(subj("D", "DST", "AAA", "BBB"), ctx).some((e) => e.key === "backup_qb")).toBe(false);
  });

  it("airwave weight is breadth x tier weight x direction, exactly", () => {
    const start = ctxWith({
      airwave: [{ player: "P", verdict: "START", tier: "Insider", sources: 4, note: "n" }],
    });
    const a = effectsFor(subj("P", "WR", "AAA"), start).find((e) => e.key === "airwave");
    expect(a!.severity).toBeCloseTo(1, 10); // min(1, 4/4) * TIER_WEIGHT.Insider (1.0)
    expect(a!.weight).toBeCloseTo(2.0, 10);

    const fade = ctxWith({
      airwave: [{ player: "P", verdict: "FADE", tier: "Beat", sources: 2, note: "n" }],
    });
    const b = effectsFor(subj("P", "WR", "AAA"), fade).find((e) => e.key === "airwave");
    expect(b!.severity).toBeCloseTo(0.5 * 0.85, 10); // breadth 2/4 x TIER_WEIGHT.Beat
    expect(b!.weight).toBeCloseTo(-2.0 * 0.425, 10);
  });
});

describe("spine characterization — sign-convention audit pins", () => {
  it("spread is consumed as an unsigned magnitude: a negative spread produces no blowout effect", () => {
    // GameEnvironment.spread carries no sign convention in-module; direction
    // comes from `favourite`. ramp() of a negative magnitude is 0 and the
    // push() severity<=0 guard drops the effect entirely (fail-quiet).
    const env = mkEnv({ spread: -12, favourite: "AAA" });
    const keys = effectsFor(subj("P", "RB", "BBB", "AAA"), ctxWith({ environments: [env] })).map((e) => e.key);
    expect(keys).not.toContain("blowout_dog");
    expect(keys).not.toContain("blowout_favourite");
  });

  it("no blowout effect fires when favourite is null, even with a large spread", () => {
    const env = mkEnv({ spread: 14, favourite: null });
    const keys = effectsFor(subj("P", "RB", "AAA", "BBB"), ctxWith({ environments: [env] })).map((e) => e.key);
    expect(keys).not.toContain("blowout_dog");
    expect(keys).not.toContain("blowout_favourite");
  });
});
