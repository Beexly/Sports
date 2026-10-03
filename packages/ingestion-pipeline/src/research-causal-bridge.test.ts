import { describe, expect, it } from "vitest";
import {
  evalStepCapital,
  evalRunCapital,
  evalNullSuite,
  evalPlantedComparison,
  evalTimeIndex,
  evalGenerateDmlPanel,
  evalQbOutAtt,
  evalPlaceboAtt,
  evalSensitivityInterval,
  evalDiagnoseQbOut,
  evalLogNbPmf,
  evalRbpfRun,
  evalDrawNb,
  evalGenerateSyntheticGames,
  evalOpponentAdjustedEpa,
  evalCalibrationPolicy,
  DEFAULT_PANEL,
  DEFAULT_DESIGN,
  type DmlGameRow,
  type TeamGameEpaSplit,
  type DmlEstimate,
} from "./research-causal-bridge.js";

/**
 * A DML panel row with real confounding spread. Field names mirror
 * DmlGameRow exactly: treatment is confounded with rest/travel, which is the
 * case the cross-fit has to net out.
 */
function panelRow(
  season: number,
  week: number,
  team: number,
  opponent: number,
  treatment: 0 | 1,
  strength: number,
): DmlGameRow {
  return {
    season,
    week,
    team,
    opponent,
    treatment,
    qbStatus: treatment === 1 ? "out" : "active",
    win: (team + week + season + strength) % 2 === 0 ? 1 : 0,
    restDays: treatment === 1 ? 3 : 7,
    travelKm: (team * 137) % 2800,
    strengthMean: strength,
    strengthVar: 0.05 + ((team + week) % 4) * 0.02,
    opponentStrength: ((opponent * 13) % 7) - 3,
  };
}

function realPanel(): DmlGameRow[] {
  const rows: DmlGameRow[] = [];
  for (let season = 1; season <= 2; season++) {
    for (let week = 1; week <= 10; week++) {
      for (let t = 0; t < 6; t++) {
        // Treatment is confounded with rest (treated teams are always
        // short-rested), which is exactly the bias the cross-fit removes.
        const restDays = 3 + ((t + week) % 5);
        const treatment: 0 | 1 = restDays >= 6 ? 1 : 0;
        rows.push(panelRow(season, week, t, (t + 1) % 6, treatment, (t * 13) % 7 - 3));
      }
    }
  }
  return rows;
}

describe("research bridge — capital growth", () => {
  it("stepCapital compounds a positive edge", () => {
    const r = evalStepCapital({ capital: 100, edge: 0.6, lambda: 0.25 });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      // 100 * (1 - 0.25 + 0.25*0.6) = 100 * 0.90 = 90
      expect(r.data).toBeCloseTo(90, 4);
      expect(r.data).toBeLessThan(100);
    }
  });

  it("stepCapital fails closed on a non-positive bankroll and a bad fraction", () => {
    const a = evalStepCapital({ capital: 0, edge: 0.6, lambda: 0.25 });
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.reason).toContain("not imputed");
    const b = evalStepCapital({ capital: 100, edge: 0.6, lambda: 2 });
    expect(b.ok).toBe(false);
  });

  it("runCapital is deterministic in the seed", () => {
    const a = evalRunCapital({ seed: 42, planted: true });
    const b = evalRunCapital({ seed: 42, planted: true });
    expect(a.ok, a.ok ? "" : `reason=${a.reason}`).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.terminal).toBe(b.data.terminal);
      expect(a.data.maxCapital).toBe(b.data.maxCapital);
      expect(a.data.terminal).toBeGreaterThan(0);
    }
  });

  it("runCapital fails closed on a non-integer seed and a non-boolean planted", () => {
    expect(evalRunCapital({ seed: 1.5, planted: true } as never).ok).toBe(false);
    expect(evalRunCapital({ seed: 1, planted: "yes" } as never).ok).toBe(false);
  });

  it("the null suite runs and reports an honest rate", () => {
    // Small seed count: this is a smoke test of the wiring, not the 200-seed
    // acceptance run (which lives in the engine's own null-acceptance suite).
    const r = evalNullSuite(4);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.data.seeds).toBe(4);
      expect(r.data.rate).toBeGreaterThanOrEqual(0);
      expect(r.data.rate).toBeLessThanOrEqual(1);
      expect(typeof r.data.pass).toBe("boolean");
    }
  });

  it("the null suite fails closed on a zero seed count — it would prove nothing", () => {
    const r = evalNullSuite(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not imputed");
  });

  it("the planted comparison runs and reports both medians", () => {
    const r = evalPlantedComparison(3);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.engineMedianMax)).toBe(true);
      expect(Number.isFinite(r.data.openLoopMedianMax)).toBe(true);
      expect(typeof r.data.beatsOpenLoop).toBe("boolean");
    }
  });
});

describe("research bridge — DML panel and QB-out ATT", () => {
  it("timeIndex keys a row by season and week", () => {
    const r = evalTimeIndex(panelRow(2, 5, 0, 1, 0, 1));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(205);
  });

  it("timeIndex fails closed on a missing row", () => {
    const r = evalTimeIndex(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not imputed");
  });

  it("generateDmlPanel is deterministic and non-empty", () => {
    const design = { ...DEFAULT_PANEL, nSeasons: 2, nWeeks: 6, nTeams: 4 };
    const a = evalGenerateDmlPanel(7, design);
    const b = evalGenerateDmlPanel(7, design);
    expect(a.ok, a.ok ? "" : `reason=${a.reason}`).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.length).toBeGreaterThan(0);
      expect(a.data.length).toBe(b.data.length);
    }
  });

  it("generateDmlPanel fails closed on a degenerate design", () => {
    expect(evalGenerateDmlPanel(1, { ...DEFAULT_PANEL, nTeams: 1 }).ok).toBe(false);
    expect(evalGenerateDmlPanel(1.5).ok).toBe(false);
  });

  it("QbOutAtt estimates an ATT with a standard error on a real panel", () => {
    const r = evalQbOutAtt(realPanel());
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.att)).toBe(true);
      expect(r.data.se).toBeGreaterThanOrEqual(0);
      expect(r.data.ciLow).toBeLessThanOrEqual(r.data.ciHigh);
      expect(r.data.n).toBeGreaterThan(0);
    }
  });

  it("QbOutAtt fails closed on empty rows and a bad treatment flag", () => {
    expect(evalQbOutAtt([]).ok).toBe(false);
    const bad = realPanel();
    bad[0] = { ...(bad[0] as DmlGameRow), treatment: 2 as never };
    expect(evalQbOutAtt(bad).ok).toBe(false);
  });

  it("the placebo arm is reproducible from its seed", () => {
    const rows = realPanel();
    const a = evalPlaceboAtt(rows, 11);
    const b = evalPlaceboAtt(rows, 11);
    expect(a.ok, a.ok ? "" : `reason=${a.reason}`).toBe(true);
    if (a.ok && b.ok) expect(a.data.att).toBe(b.data.att);
  });

  it("sensitivityInterval widens with gamma and fails closed below 1", () => {
    const est: DmlEstimate = {
      att: 0.05,
      se: 0.02,
      ciLow: 0.01,
      ciHigh: 0.09,
      n: 100,
      nTreated: 50,
      nTrimmed: 98,
      meanPropensity: 0.5,
      minPropensity: 0.12,
      maxPropensity: 0.88,
      impliedLogitShift: 0,
      filterGain: 0.02,
      priced: false,
      status: "shadow",
    };
    const narrow = evalSensitivityInterval(est, 1);
    const wide = evalSensitivityInterval(est, 3);
    expect(narrow.ok).toBe(true);
    expect(wide.ok).toBe(true);
    if (narrow.ok && wide.ok) {
      expect(wide.data[1] - wide.data[0]).toBeGreaterThan(narrow.data[1] - narrow.data[0]);
    }
    expect(evalSensitivityInterval(est, 0.5).ok).toBe(false);
    expect(evalSensitivityInterval(null, 1).ok).toBe(false);
  });

  it("diagnoseQbOut returns the estimate, the placebo arm, and the flag", () => {
    const r = evalDiagnoseQbOut(realPanel(), 3);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.estimate.att)).toBe(true);
      expect(Number.isFinite(r.data.placeboAtt)).toBe(true);
      expect(typeof r.data.placeboContainsZero).toBe("boolean");
    }
  });
});

describe("research bridge — negative-binomial surface", () => {
  it("logNbPmf is finite for a legal count", () => {
    const r = evalLogNbPmf(3, 2.5, 4);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) expect(r.data).toBeLessThan(0);
  });

  it("logNbPmf refuses the engine's invalid sentinel rather than passing it through", () => {
    expect(evalLogNbPmf(3, -1, 4).ok).toBe(false);
    expect(evalLogNbPmf(-1, 2, 4).ok).toBe(false);
    expect(evalLogNbPmf(3, 2, 0).ok).toBe(false);
  });

  it("drawNb is deterministic in the seed and returns a real count", () => {
    const a = evalDrawNb(99, 4.5, 6);
    const b = evalDrawNb(99, 4.5, 6);
    expect(a.ok, a.ok ? "" : `reason=${a.reason}`).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data).toBe(b.data);
      expect(a.data).toBeGreaterThanOrEqual(0);
    }
  });

  it("generateSyntheticGames is deterministic and non-empty", () => {
    const design = { ...DEFAULT_DESIGN, nGames: 20 };
    const a = evalGenerateSyntheticGames(5, design);
    const b = evalGenerateSyntheticGames(5, design);
    expect(a.ok, a.ok ? "" : `reason=${a.reason}`).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.length).toBeGreaterThan(0);
      expect(a.data.length).toBe(b.data.length);
    }
  });

  it("the RBPF filter consumes synthetic games and reports a live ESS", () => {
    const design = { ...DEFAULT_DESIGN, nGames: 24 };
    const games = evalGenerateSyntheticGames(3, design);
    expect(games.ok).toBe(true);
    if (!games.ok) return;
    const r = evalRbpfRun({
      options: {
        seed: 3,
        nTeams: design.nTeams,
        nPitchers: design.nPitchers,
        nParks: design.nParks,
        nUmpires: design.nUmpires,
      },
      games: games.data,
    });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.diagnostics.ess)).toBe(true);
      expect(r.diagnostics.ess).toBeGreaterThanOrEqual(0);
      expect(r.diagnostics.nParticles).toBeGreaterThan(0);
    }
  });

  it("the RBPF filter fails closed on empty games and out-of-range units", () => {
    expect(
      evalRbpfRun({ options: { seed: 1, nTeams: 2, nPitchers: 2, nParks: 1, nUmpires: 1 }, games: [] }).ok,
    ).toBe(false);
    expect(
      evalRbpfRun({
        options: { seed: 1, nTeams: 999, nPitchers: 2, nParks: 1, nUmpires: 1 },
        games: [{ home: 0, away: 0, pitcherHome: 0, pitcherAway: 0, park: 0, umpire: 0, y: 1, line: 0 }],
      }).ok,
    ).toBe(false);
  });
});

describe("research bridge — opponent-adjusted EPA", () => {
  const games: TeamGameEpaSplit[] = [
    { team: "A", opponent: "B", offDropbackPlays: 40, offDropbackEpaPerPlay: 0.12, offRushPlays: 30, offRushEpaPerPlay: 0.03, defDropbackPlays: 40, defDropbackEpaPerPlayAllowed: 0.12, defRushPlays: 30, defRushEpaPerPlayAllowed: 0.03 },
    { team: "B", opponent: "A", offDropbackPlays: 38, offDropbackEpaPerPlay: 0.04, offRushPlays: 32, offRushEpaPerPlay: -0.02, defDropbackPlays: 38, defDropbackEpaPerPlayAllowed: 0.04, defRushPlays: 32, defRushEpaPerPlayAllowed: -0.02 },
    { team: "A", opponent: "C", offDropbackPlays: 42, offDropbackEpaPerPlay: 0.09, offRushPlays: 28, offRushEpaPerPlay: 0.01, defDropbackPlays: 42, defDropbackEpaPerPlayAllowed: 0.09, defRushPlays: 28, defRushEpaPerPlayAllowed: 0.01 },
    { team: "C", opponent: "A", offDropbackPlays: 39, offDropbackEpaPerPlay: 0.05, offRushPlays: 31, offRushEpaPerPlay: -0.01, defDropbackPlays: 39, defDropbackEpaPerPlayAllowed: 0.05, defRushPlays: 31, defRushEpaPerPlayAllowed: -0.01 },
    { team: "B", opponent: "C", offDropbackPlays: 41, offDropbackEpaPerPlay: 0.06, offRushPlays: 29, offRushEpaPerPlay: 0.0, defDropbackPlays: 41, defDropbackEpaPerPlayAllowed: 0.06, defRushPlays: 29, defRushEpaPerPlayAllowed: 0.0 },
    { team: "C", opponent: "B", offDropbackPlays: 37, offDropbackEpaPerPlay: 0.07, offRushPlays: 33, offRushEpaPerPlay: 0.02, defDropbackPlays: 37, defDropbackEpaPerPlayAllowed: 0.07, defRushPlays: 33, defRushEpaPerPlayAllowed: 0.02 },
  ];

  it("nets the schedule and returns a rating per team", () => {
    const r = evalOpponentAdjustedEpa(games, { minGames: 1 });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.data.results.length).toBe(3);
      expect(r.data.leagueAverages).not.toBeNull();
      const a = r.data.results.find((x) => x.team === "A");
      expect(a).toBeDefined();
      if (a && a.rating) {
        expect(Number.isFinite(a.rating.adjOffDropbackEpaPerPlay)).toBe(true);
        // Netting against average opposition must land near the raw value.
        expect(Math.abs(a.rating.adjOffDropbackEpaPerPlay - a.rating.rawOffDropbackEpaPerPlay)).toBeLessThan(0.5);
      }
    }
  });

  it("reports a non-converged solve as data rather than pretending", () => {
    const r = evalOpponentAdjustedEpa(games, { minGames: 1, maxIterations: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.iterations).toBeGreaterThanOrEqual(0);
      expect(typeof r.data.converged).toBe("boolean");
    }
  });

  it("fails closed on empty rows, missing names, and negative play counts", () => {
    expect(evalOpponentAdjustedEpa([]).ok).toBe(false);
    expect(evalOpponentAdjustedEpa([{ ...games[0]!, team: "" }]).ok).toBe(false);
    expect(evalOpponentAdjustedEpa([{ ...games[0]!, offDropbackPlays: -1 }]).ok).toBe(false);
  });
});

describe("research bridge — calibration action policy", () => {
  it("a validated calibration opens the cap and needs no hard pass", () => {
    const r = evalCalibrationPolicy("VALIDATED");
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.data.cap).toBe(100);
      expect(r.data.requiresHardPass).toBe(false);
      expect(r.data.severity).toBeLessThan(0.5);
    }
  });

  it("a drifting calibration caps hard and requires a hard pass", () => {
    const r = evalCalibrationPolicy("DRIFTING");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cap).toBeLessThan(100);
      expect(r.data.requiresHardPass).toBe(true);
      expect(r.data.severity).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("an unknown status is a refusal — we never guess a cap", () => {
    const r = evalCalibrationPolicy("SUPER_VALIDATED");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not imputed");
    expect(evalCalibrationPolicy(null).ok).toBe(false);
  });
});
