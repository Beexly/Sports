import { describe, it, expect } from "vitest";
import {
  effectsFor,
  environmentScalar,
  EMPTY_CONTEXT,
  explain,
  gameKeyOf,
  ramp,
  readSignals,
  THRESHOLDS,
  type GameEnvironment,
  type SignalContext,
  type SignalSubject,
} from "./spine";
import { WEEK2_2026_CONTEXT, WEEK2_2026_ENVIRONMENTS } from "./week2-2026";

const s = (name: string, pos: SignalSubject["pos"], team: string, opp?: string): SignalSubject => ({ name, pos, team, opp });

/* Specimens from 2026-09-20. */
const JEFFERSON = s("Justin Jefferson", "WR", "MIN", "CHI"); // scored 8.50
const METCALF = s("DK Metcalf", "WR", "PIT", "NE"); // scored 6.70
const SCHULTZ = s("Dalton Schultz", "TE", "HOU", "CIN"); // the right play
const MCLAURIN = s("Terry McLaurin", "WR", "WAS", "DAL"); // clean, 50.5 total
const ANDREWS = s("Mark Andrews", "TE", "BAL", "NO"); // Flowers out, 26.5 implied

describe("bidirectional — the spine both suppresses and boosts", () => {
  it("suppresses Jefferson: wind, precipitation and a backup quarterback", () => {
    const read = readSignals(JEFFERSON, WEEK2_2026_CONTEXT);
    const keys = read.effects.map((e) => e.key);
    expect(keys).toContain("wind");
    expect(keys).toContain("precipitation");
    expect(keys).toContain("backup_qb");
    expect(read.delta).toBeLessThan(0);
    expect(read.multiplier).toBeLessThan(1);
    for (const e of read.effects) expect(e.weight).toBeLessThanOrEqual(0);
  });

  it("BOOSTS Schultz: vacated usage plus a positive airwave consensus", () => {
    const read = readSignals(SCHULTZ, WEEK2_2026_CONTEXT);
    const keys = read.effects.map((e) => e.key);
    expect(keys).toContain("vacated_usage");
    expect(keys).toContain("airwave");
    expect(read.delta).toBeGreaterThan(0);
    expect(read.multiplier).toBeGreaterThan(1);
  });

  it("BOOSTS Andrews off the Flowers absence in a 26.5-point offense", () => {
    const read = readSignals(ANDREWS, WEEK2_2026_CONTEXT);
    expect(read.effects.map((e) => e.key)).toContain("vacated_usage");
    expect(read.delta).toBeGreaterThan(0);
  });

  it("a positive airwave read boosts and a negative one suppresses", () => {
    const london = readSignals(s("Drake London", "WR", "ATL", "CAR"), WEEK2_2026_CONTEXT);
    const air = london.effects.find((e) => e.key === "airwave");
    expect(air).toBeDefined();
    expect(air!.weight).toBeLessThan(0); // 4 independent FADE sources
    const walker = readSignals(s("Kenneth Walker III", "RB", "KC", "IND"), WEEK2_2026_CONTEXT);
    const airW = walker.effects.find((e) => e.key === "airwave");
    expect(airW!.weight).toBeGreaterThan(0); // 2 independent START sources
  });

  it("rewards a top-of-slate scoring environment and punishes a bottom one", () => {
    const sf = readSignals(s("Nobody", "RB", "SF", "MIA"), WEEK2_2026_CONTEXT); // implied 29.0
    expect(sf.effects.map((e) => e.key)).toContain("high_team_total");
    expect(sf.delta).toBeGreaterThan(0);
    const mia = readSignals(s("Nobody2", "WR", "MIA", "SF"), WEEK2_2026_CONTEXT); // implied 15.5
    expect(mia.effects.map((e) => e.key)).toContain("low_team_total");
    expect(mia.delta).toBeLessThan(0);
  });

  it("a big favourite's back gains script and a big underdog's back loses it", () => {
    const favRb = readSignals(s("SF RB", "RB", "SF", "MIA"), WEEK2_2026_CONTEXT);
    const dogRb = readSignals(s("MIA RB", "RB", "MIA", "SF"), WEEK2_2026_CONTEXT);
    expect(favRb.effects.map((e) => e.key)).toContain("blowout_favourite");
    expect(dogRb.effects.map((e) => e.key)).toContain("blowout_dog");
    expect(favRb.delta).toBeGreaterThan(dogRb.delta);
  });
});

/* ------------------------------------------------------------------ *
 * The interaction that is the whole lesson                            *
 * ------------------------------------------------------------------ */

describe("usage is a share of a quantity — boosts scale with the scoring environment", () => {
  it("environmentScalar falls in a bad offense and rises in a good one", () => {
    expect(environmentScalar(WEEK2_2026_ENVIRONMENTS.find((e) => e.gameKey === gameKeyOf("PIT", "NE")), "PIT")).toBeLessThan(0.7);
    expect(environmentScalar(WEEK2_2026_ENVIRONMENTS.find((e) => e.gameKey === gameKeyOf("MIA", "SF")), "SF")).toBeGreaterThan(1.2);
    // unknown is neutral, never a discount
    expect(environmentScalar(undefined, "PIT")).toBe(1);
  });

  it("Metcalf's real role upgrade is scaled DOWN by Pittsburgh's 18.0 implied total", () => {
    const read = readSignals(METCALF, WEEK2_2026_CONTEXT);
    const vac = read.effects.find((e) => e.key === "vacated_usage");
    expect(vac).toBeDefined();
    expect(vac!.reason).toMatch(/Scaled down/);
    // the same absence on a good offense is worth strictly more
    const scaled = vac!.weight;
    const schultzVac = readSignals(SCHULTZ, WEEK2_2026_CONTEXT).effects.find((e) => e.key === "vacated_usage")!;
    expect(schultzVac.weight).toBeGreaterThan(scaled);
  });

  it("the bad environment is still recorded even though good things also happened", () => {
    const read = readSignals(METCALF, WEEK2_2026_CONTEXT);
    const keys = read.effects.map((e) => e.key);
    expect(keys).toContain("low_team_total"); // the fact that governs
    expect(keys).toContain("vacated_usage"); // the fact that does not cancel it
    expect(keys).toContain("coverage_downgrade"); // Carlton Davis out
    expect(read.effects.some((e) => e.weight < 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Absent data is not evidence                                         *
 * ------------------------------------------------------------------ */

describe("absent data is never a measurement", () => {
  it("an empty context moves nobody", () => {
    for (const subj of [JEFFERSON, METCALF, SCHULTZ]) {
      const r = readSignals(subj, EMPTY_CONTEXT);
      expect(r.effects).toHaveLength(0);
      expect(r.delta).toBe(0);
      expect(r.multiplier).toBe(1);
    }
  });

  it("null wind is not calm and a missing implied total is not average", () => {
    const env: GameEnvironment = {
      gameKey: gameKeyOf("MIN", "CHI"),
      roof: "open",
      windMph: null,
      gustMph: null,
      precipChance: null,
      total: null,
      impliedTotals: {},
      spread: null,
      favourite: null,
      backupQbTeams: [],
      source: "test: nothing measured",
    };
    const ctx: SignalContext = { ...EMPTY_CONTEXT, environments: [env] };
    expect(effectsFor(JEFFERSON, ctx)).toHaveLength(0);
  });

  it("a sheltered roof removes weather but keeps the scoring environment", () => {
    const env: GameEnvironment = {
      gameKey: gameKeyOf("MIN", "CHI"),
      roof: "closed",
      windMph: 40,
      gustMph: 60,
      precipChance: 1,
      total: 47.5,
      impliedTotals: { MIN: 14 },
      spread: null,
      favourite: null,
      backupQbTeams: [],
      source: "test: indoor hurricane",
    };
    const ctx: SignalContext = { ...EMPTY_CONTEXT, environments: [env] };
    const keys = effectsFor(JEFFERSON, ctx).map((e) => e.key);
    expect(keys).not.toContain("wind");
    expect(keys).not.toContain("precipitation");
    expect(keys).toContain("low_team_total");
  });

  it("a single airwave voice is an opinion, not a consensus", () => {
    const ctx: SignalContext = {
      ...EMPTY_CONTEXT,
      airwave: [{ player: "Justin Jefferson", verdict: "FADE", tier: "Insider", sources: 1, note: "one show" }],
    };
    expect(effectsFor(JEFFERSON, ctx)).toHaveLength(0);
  });

  it("source tier scales the airwave weight", () => {
    const mk = (tier: "Insider" | "Unconfirmed"): SignalContext => ({
      ...EMPTY_CONTEXT,
      airwave: [{ player: "X", verdict: "FADE", tier, sources: 4, note: "n" }],
    });
    const insider = readSignals(s("X", "WR", "AAA"), mk("Insider")).delta;
    const rumour = readSignals(s("X", "WR", "AAA"), mk("Unconfirmed")).delta;
    expect(Math.abs(insider)).toBeGreaterThan(Math.abs(rumour));
  });
});

/* ------------------------------------------------------------------ *
 * Thin sample shrinks, never reverses                                 *
 * ------------------------------------------------------------------ */

describe("thin sample", () => {
  it("halves the read rather than flipping it, in both directions", () => {
    const thinCtx: SignalContext = { ...WEEK2_2026_CONTEXT, thinSample: ["Dalton Schultz", "Justin Jefferson"] };
    const boostFull = readSignals(SCHULTZ, WEEK2_2026_CONTEXT).delta;
    const boostThin = readSignals(SCHULTZ, thinCtx).delta;
    expect(boostThin).toBeCloseTo(boostFull * 0.5, 6);
    expect(Math.sign(boostThin)).toBe(Math.sign(boostFull));

    const dropFull = readSignals(JEFFERSON, WEEK2_2026_CONTEXT).delta;
    const dropThin = readSignals(JEFFERSON, thinCtx).delta;
    expect(dropThin).toBeCloseTo(dropFull * 0.5, 6);
    expect(Math.sign(dropThin)).toBe(Math.sign(dropFull));
  });
});

describe("ramp + explain", () => {
  it("is clamped and linear between floor and full", () => {
    expect(ramp(10, 15, 25)).toBe(0);
    expect(ramp(25, 15, 25)).toBe(1);
    expect(ramp(20, 15, 25)).toBeCloseTo(0.5, 10);
    expect(ramp(17.5, THRESHOLDS.teamTotalLowFloor, THRESHOLDS.teamTotalLowFull)).toBeCloseTo(0.5, 10);
  });

  it("a 14 mph breeze is below the floor and costs nothing", () => {
    const env: GameEnvironment = {
      gameKey: gameKeyOf("MIN", "CHI"), roof: "open", windMph: 14, gustMph: 20, precipChance: 0,
      total: 47.5, impliedTotals: { MIN: 22 }, spread: null, favourite: null, backupQbTeams: [],
      source: "test: breezy",
    };
    expect(effectsFor(JEFFERSON, { ...EMPTY_CONTEXT, environments: [env] })).toHaveLength(0);
  });

  it("explain ranks by absolute move and every effect carries a reason and source", () => {
    const report = explain([JEFFERSON, METCALF, SCHULTZ, MCLAURIN], WEEK2_2026_CONTEXT);
    expect(report.length).toBeGreaterThan(0);
    const moves = report.map((r) => Math.abs(r.read.delta));
    expect([...moves].sort((a, b) => b - a)).toEqual(moves);
    for (const r of report) {
      for (const e of r.read.effects) {
        expect(e.reason.length).toBeGreaterThan(10);
        expect(e.source.length).toBeGreaterThan(3);
      }
    }
  });

  it("cites the right source per effect — weather does not evidence a QB change", () => {
    const read = readSignals(JEFFERSON, WEEK2_2026_CONTEXT);
    expect(read.effects.find((e) => e.key === "wind")!.source).toMatch(/NWS/);
    expect(read.effects.find((e) => e.key === "backup_qb")!.source).toMatch(/inactives/);
  });
});
