import { describe, it, expect } from "vitest";
import type { DfsPlayer } from "./dfs-slate";
import { leverage } from "./dfs-slate";
import {
  adviseMode,
  buildPenalty,
  EMPTY_CONTEXT,
  explainSlate,
  gameKeyOf,
  pointPenalty,
  ramp,
  suppressorsFor,
  THRESHOLDS,
  worstSeverity,
  type GameEnvironment,
  type SignalContext,
} from "./dfs-signals";
import { WEEK2_2026_CONTEXT, WEEK2_2026_CONTEST } from "./dfs-signals-week2-2026";

const mk = (
  name: string,
  pos: DfsPlayer["pos"],
  team: string,
  opp: string,
  salary: number,
  proj: number,
  own: number,
): DfsPlayer => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  pos,
  team,
  opp,
  salary,
  proj,
  floor: proj * 0.55,
  ceiling: proj * 1.6,
  own,
});

/* ------------------------------------------------------------------ *
 * The two specimens. These are why this module exists.                *
 * ------------------------------------------------------------------ */

// Real Week 2 2026 DK pricing, real LineStar ownership, real outcome.
const JEFFERSON = mk("Justin Jefferson", "WR", "MIN", "CHI", 7800, 18.6, 0.018); // scored 8.50
const METCALF = mk("DK Metcalf", "WR", "PIT", "NE", 5200, 14.8, 0.013); // scored 6.70
// Control: same slate, clean environment, comparable role and price.
const MCLAURIN = mk("Terry McLaurin", "WR", "WAS", "DAL", 5200, 14.0, 0.051);
const SCHULTZ = mk("Dalton Schultz", "TE", "HOU", "CIN", 3200, 11.5, 0.156);

describe("Week 2 2026 regression specimens — the lineup that lost", () => {
  it("L-1: suppresses Justin Jefferson for the wind, despite 1.8% ownership", () => {
    const sups = suppressorsFor(JEFFERSON, WEEK2_2026_CONTEXT);
    const keys = sups.map((s) => s.key);
    expect(keys).toContain("wind");
    expect(keys).toContain("precipitation");
    // 30 mph gusts is halfway between the 25 floor and the 35 full-effect mark.
    const wind = sups.find((s) => s.key === "wind")!;
    expect(wind.severity).toBeCloseTo(0.5, 5);
    expect(wind.reason).toMatch(/gusts to 30 mph/);
    expect(wind.source).toMatch(/NWS/);
  });

  it("L-2: suppresses DK Metcalf for an 18.0 implied team total, despite 1.3% ownership", () => {
    const sups = suppressorsFor(METCALF, WEEK2_2026_CONTEXT);
    const low = sups.find((s) => s.key === "low_team_total");
    expect(low).toBeDefined();
    // implied 18.0 between the 20 floor and the 15 full-effect mark => 0.4
    expect(low!.severity).toBeCloseTo(0.4, 5);
    expect(low!.reason).toMatch(/implied for only 18 points/);
  });

  it("THE ASYMMETRY RULE: low ownership earns no leverage credit under a suppressor", () => {
    const pen = buildPenalty(WEEK2_2026_CONTEXT, "leverage");
    // Both specimens are extremely low-owned, so `leverage` credits them heavily.
    const jeffCredit = leverage(JEFFERSON) * 6;
    const metCredit = leverage(METCALF) * 6;
    expect(jeffCredit).toBeGreaterThan(0);
    expect(metCredit).toBeGreaterThan(0);
    // The penalty must claw back at least the suppressed share of that credit.
    const jeffSev = worstSeverity(suppressorsFor(JEFFERSON, WEEK2_2026_CONTEXT));
    const metSev = worstSeverity(suppressorsFor(METCALF, WEEK2_2026_CONTEXT));
    expect(pen(JEFFERSON)).toBeGreaterThanOrEqual(jeffCredit * jeffSev);
    expect(pen(METCALF)).toBeGreaterThanOrEqual(metCredit * metSev);
  });

  it("a clean-environment player at comparable price keeps his full value", () => {
    const pen = buildPenalty(WEEK2_2026_CONTEXT, "leverage");
    expect(suppressorsFor(MCLAURIN, WEEK2_2026_CONTEXT)).toHaveLength(0);
    expect(pen(MCLAURIN)).toBe(0);
    // Same salary as Metcalf, clean game: the signal layer must prefer him.
    expect(pen(METCALF)).toBeGreaterThan(pen(MCLAURIN));
  });

  it("ranks Jefferson and Metcalf as suppressed on the slate explain surface", () => {
    const slate = [JEFFERSON, METCALF, MCLAURIN, SCHULTZ];
    const report = explainSlate(slate, WEEK2_2026_CONTEXT, "leverage");
    const names = report.map((r) => r.player);
    expect(names).toContain("Justin Jefferson");
    expect(names).toContain("DK Metcalf");
    expect(names).not.toContain("Terry McLaurin");
    // every suppressed row can say why, with a source
    for (const r of report) {
      expect(r.suppressors.length).toBeGreaterThan(0);
      for (const s of r.suppressors) {
        expect(s.reason.length).toBeGreaterThan(10);
        expect(s.source.length).toBeGreaterThan(3);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * The safety property: subtract only, never add                       *
 * ------------------------------------------------------------------ */

describe("asymmetry — this module may only withhold", () => {
  const slate = [JEFFERSON, METCALF, MCLAURIN, SCHULTZ, mk("Aaron Jones Sr.", "RB", "MIN", "CHI", 5100, 14.7, 0.284)];

  it("never returns a negative penalty in any mode", () => {
    for (const mode of ["cash", "gpp", "leverage"] as const) {
      const pen = buildPenalty(WEEK2_2026_CONTEXT, mode);
      for (const p of slate) expect(pen(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not reward running backs for bad weather — it only penalises passers", () => {
    const jones = slate[4]!; // RB in the wind game
    const sups = suppressorsFor(jones, WEEK2_2026_CONTEXT);
    expect(sups.map((s) => s.key)).toContain("wind");
    // wind is recorded against him, but costs an RB nothing
    expect(pointPenalty(jones, sups.filter((s) => s.key === "wind"))).toBe(0);
    // and the passer in the same game is penalised
    expect(pointPenalty(JEFFERSON, suppressorsFor(JEFFERSON, WEEK2_2026_CONTEXT))).toBeGreaterThan(0);
  });

  it("a START airwave read carries no weight", () => {
    // Schultz has 4 independent START sources and must still receive zero credit.
    expect(suppressorsFor(SCHULTZ, WEEK2_2026_CONTEXT)).toHaveLength(0);
    expect(buildPenalty(WEEK2_2026_CONTEXT, "leverage")(SCHULTZ)).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Absent data is not evidence                                         *
 * ------------------------------------------------------------------ */

describe("absent data is never treated as a measurement", () => {
  it("an empty context produces no penalty for anyone", () => {
    const pen = buildPenalty(EMPTY_CONTEXT, "leverage");
    for (const p of [JEFFERSON, METCALF, MCLAURIN]) {
      expect(suppressorsFor(p, EMPTY_CONTEXT)).toHaveLength(0);
      expect(pen(p)).toBe(0);
    }
  });

  it("null wind is not calm, and null implied total is not average", () => {
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
    const ctx: SignalContext = { environments: [env], airwave: [], thinSamplePlayers: [] };
    expect(suppressorsFor(JEFFERSON, ctx)).toHaveLength(0);
  });

  it("a sheltered roof removes weather entirely but keeps scoring-environment signals", () => {
    const sheltered: GameEnvironment = {
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
    const ctx: SignalContext = { environments: [sheltered], airwave: [], thinSamplePlayers: [] };
    const keys = suppressorsFor(JEFFERSON, ctx).map((s) => s.key);
    expect(keys).not.toContain("wind");
    expect(keys).not.toContain("precipitation");
    expect(keys).toContain("low_team_total");
  });

  it("a single airwave source is an opinion, not a consensus", () => {
    const ctx: SignalContext = {
      environments: [],
      airwave: [{ player: "Justin Jefferson", verdict: "FADE", sources: 1, note: "one show" }],
      thinSamplePlayers: [],
    };
    expect(suppressorsFor(JEFFERSON, ctx)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * Thresholds and ramps                                                *
 * ------------------------------------------------------------------ */

describe("ramp", () => {
  it("is 0 at or below the floor and 1 at or above full", () => {
    expect(ramp(10, 15, 25)).toBe(0);
    expect(ramp(15, 15, 25)).toBe(0);
    expect(ramp(25, 15, 25)).toBe(1);
    expect(ramp(99, 15, 25)).toBe(1);
    expect(ramp(20, 15, 25)).toBeCloseTo(0.5, 10);
  });

  it("handles a descending ramp, used for implied totals", () => {
    expect(ramp(22, THRESHOLDS.teamTotalFloor, THRESHOLDS.teamTotalFull)).toBe(0);
    expect(ramp(15, THRESHOLDS.teamTotalFloor, THRESHOLDS.teamTotalFull)).toBe(1);
    expect(ramp(17.5, THRESHOLDS.teamTotalFloor, THRESHOLDS.teamTotalFull)).toBeCloseTo(0.5, 10);
  });

  it("a 14 mph breeze is below the wind floor and costs nothing", () => {
    const env: GameEnvironment = {
      gameKey: gameKeyOf("MIN", "CHI"),
      roof: "open",
      windMph: 14,
      gustMph: 20,
      precipChance: 0,
      total: 47.5,
      impliedTotals: { MIN: 24 },
      spread: null,
      favourite: null,
      backupQbTeams: [],
      source: "test: breezy",
    };
    const ctx: SignalContext = { environments: [env], airwave: [], thinSamplePlayers: [] };
    expect(suppressorsFor(JEFFERSON, ctx)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * L-3: contest shape decides the objective                            *
 * ------------------------------------------------------------------ */

describe("adviseMode — L-3, the objective mismatch that cost half the win equity", () => {
  it("flags cash mode as wrong for a 75-entry winner-take-all", () => {
    const advice = adviseMode(WEEK2_2026_CONTEST, "cash");
    expect(advice.mismatch).toBe(true);
    expect(advice.recommended).toBe("gpp");
    expect(advice.reason).toMatch(/right tail/);
  });

  it("recommends gpp, not leverage, for a small top-heavy field", () => {
    expect(adviseMode(WEEK2_2026_CONTEST, "gpp").mismatch).toBe(false);
    expect(adviseMode(WEEK2_2026_CONTEST, "leverage").mismatch).toBe(true);
  });

  it("recommends leverage only when the field is genuinely large", () => {
    const milly = { fieldSize: 200000, placesPaid: 50000, singleEntry: false };
    // 25% paid is not top-heavy — that is a cash-shaped payout
    expect(adviseMode(milly, "cash").recommended).toBe("cash");
    const topHeavyBig = { fieldSize: 200000, placesPaid: 1000, singleEntry: false };
    expect(adviseMode(topHeavyBig, "leverage").recommended).toBe("leverage");
  });

  it("recommends cash when most of the field is paid", () => {
    const fifty50 = { fieldSize: 100, placesPaid: 50, singleEntry: true };
    const advice = adviseMode(fifty50, "leverage");
    expect(advice.recommended).toBe("cash");
    expect(advice.mismatch).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Other suppressors                                                   *
 * ------------------------------------------------------------------ */

describe("script and roster suppressors", () => {
  it("penalises a big underdog's running back but not his receivers", () => {
    const achaneRb = mk("De'Von Achane", "RB", "MIA", "SF", 6700, 17.3, 0.07);
    const miaWr = mk("Malik Washington", "WR", "MIA", "SF", 4000, 9.2, 0.03);
    const rbKeys = suppressorsFor(achaneRb, WEEK2_2026_CONTEXT).map((s) => s.key);
    const wrKeys = suppressorsFor(miaWr, WEEK2_2026_CONTEXT).map((s) => s.key);
    expect(rbKeys).toContain("blowout_dog");
    expect(wrKeys).not.toContain("blowout_dog");
    // and both feel Miami's 15.5 implied total
    expect(rbKeys).toContain("low_team_total");
    expect(wrKeys).toContain("low_team_total");
  });

  it("penalises pass catchers when a backup quarterback is starting", () => {
    const atlWr = mk("Drake London", "WR", "ATL", "CAR", 6000, 11.0, 0.018);
    const keys = suppressorsFor(atlWr, WEEK2_2026_CONTEXT).map((s) => s.key);
    expect(keys).toContain("backup_qb"); // Cooper Rush
    expect(keys).toContain("airwave_fade"); // 4 independent shows
  });

  it("records a thin-sample flag that costs no points but cancels leverage credit", () => {
    const ctx: SignalContext = {
      environments: [],
      airwave: [],
      thinSamplePlayers: ["Terry McLaurin"],
    };
    const sups = suppressorsFor(MCLAURIN, ctx);
    expect(sups.map((s) => s.key)).toEqual(["thin_sample"]);
    // no direct point cost
    expect(pointPenalty(MCLAURIN, sups)).toBe(0);
    // but in leverage mode the contrarian credit is gone
    expect(buildPenalty(ctx, "leverage")(MCLAURIN)).toBeCloseTo(leverage(MCLAURIN) * 6, 10);
    // and in cash mode it is inert
    expect(buildPenalty(ctx, "cash")(MCLAURIN)).toBe(0);
  });
});
