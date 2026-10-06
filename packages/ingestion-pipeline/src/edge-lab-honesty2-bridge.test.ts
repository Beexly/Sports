import { describe, expect, it } from "vitest";
import {
  evalBrierSkill,
  evalEdgeLabDebate,
  evalFitGroupedClimatology,
  evalKaunitzScan,
  evalPerformanceClaim,
  evalPropsContextBind,
  evalScoreAgainstClimatology,
  evalSelectiveGate,
  evalTuneTau,
  evalVennAbersInterval,
} from "./edge-lab-honesty2-bridge.js";
import type { GateDecisionRow } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import type { GameRow } from "@sports/prediction-engine/src/edge-lab/game-row.js";
import type { GameWeatherForecast } from "@sports/prediction-engine/src/edge-lab/features/nfl-weather.js";
import type { KaunitzBookQuote } from "@sports/prediction-engine/src/edge-lab/kaunitz-outlier.js";
import type {
  BinaryOutcome,
  ClimTrainRow,
  ScoredCase,
} from "@sports/prediction-engine/src/edge-lab/grouped-climatology.js";

const NFL_STRATUM = "nfl|MONEYLINE";
const MLB_STRATUM = "mlb|TOTAL";

/**
 * A realistic calibration fold: scores spread across the whole range, outcomes
 * drawn deterministically at roughly the rate each score claims. A degenerate
 * set (all wins, all losses) would make the isotonic fit uninformative and any
 * gate assertion on it meaningless.
 */
function calibrationRows(n: number, prefix: string): GateDecisionRow[] {
  const rows: GateDecisionRow[] = [];
  for (let i = 0; i < n; i++) {
    const score = 0.3 + (0.595 * i) / (n - 1);
    const y: BinaryOutcome = i % 10 < Math.round(score * 10) ? 1 : 0;
    rows.push({ rowId: `${prefix}-${i}`, score, q: 0.5, stratum: NFL_STRATUM, y });
  }
  return rows;
}

describe("honest-ceiling claim doctrine", () => {
  it("refuses a blind claim above the 56% ceiling and reports the constants verbatim", () => {
    const r = evalPerformanceClaim({ scope: "blind", claimedRate: 0.62 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.permitted).toBe(false);
    expect(r.data.defects).toHaveLength(1);
    expect(r.data.defects[0]).toContain("exceeds the honest ceiling");
    expect(r.data.gateThrew).toBe(true);
    expect(r.data.gateReasons).toEqual(r.data.defects);
    // Doctrine constants, reported as-is and never blended into a headline rate.
    expect(r.data.breakEven).toBe(0.524);
    expect(r.data.blindCeiling).toBe(0.56);
    expect(r.data.selectiveFloor).toEqual({
      minFiredBets: 200,
      requiresMultiSeasonWalkForward: true,
      requiresPositiveClv: true,
    });
  });

  it("permits a blind claim exactly at the ceiling", () => {
    const r = evalPerformanceClaim({ scope: "blind", claimedRate: 0.56 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.permitted).toBe(true);
    expect(r.data.defects).toEqual([]);
    expect(r.data.gateThrew).toBe(false);
  });

  it("permits a selective claim above the ceiling only with the full proof object", () => {
    const good = evalPerformanceClaim({
      scope: "selective",
      claimedRate: 0.58,
      selectiveProof: {
        firedBets: 240,
        multiSeasonWalkForward: true,
        positiveClv: true,
      },
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.data.permitted).toBe(true);
      expect(good.data.defects).toEqual([]);
    }

    const thin = evalPerformanceClaim({
      scope: "selective",
      claimedRate: 0.58,
      selectiveProof: {
        firedBets: 40,
        multiSeasonWalkForward: true,
        positiveClv: true,
      },
    });
    expect(thin.ok).toBe(true);
    if (thin.ok) {
      expect(thin.data.permitted).toBe(false);
      expect(thin.data.defects[0]).toContain("below the floor of 200");
    }

    const noClv = evalPerformanceClaim({
      scope: "selective",
      claimedRate: 0.58,
      selectiveProof: {
        firedBets: 240,
        multiSeasonWalkForward: true,
        positiveClv: false,
      },
    });
    expect(noClv.ok).toBe(true);
    if (noClv.ok) {
      expect(noClv.data.permitted).toBe(false);
      expect(noClv.data.defects).toEqual(["positiveClv is not true"]);
    }
  });

  it("fail-closes on a rate outside [0, 1], a bad scope, and a malformed proof", () => {
    expect(evalPerformanceClaim({ scope: "blind", claimedRate: 62 }).ok).toBe(false);
    expect(evalPerformanceClaim({ scope: "blind", claimedRate: 1.4 }).ok).toBe(false);
    expect(
      evalPerformanceClaim({ scope: "sideways" as "blind", claimedRate: 0.5 }).ok,
    ).toBe(false);
    expect(
      evalPerformanceClaim({
        scope: "selective",
        claimedRate: 0.58,
        selectiveProof: {
          firedBets: Number.NaN,
          multiSeasonWalkForward: true,
          positiveClv: true,
        },
      }).ok,
    ).toBe(false);
  });
});

describe("selective gate — Venn–Abers interval", () => {
  it("computes the exact inductive interval on a tied-score calibration set", () => {
    // Two observations at p=0.5 (one win, one loss). p0 pools the three
    // outcomes {0,1,0} -> 1/3; p1 pools {0,1,1} -> 2/3. The isotonic model
    // hands out 4-decimal-rounded values, so the comparison is to 3 places.
    const r = evalVennAbersInterval({
      calibration: [
        { p: 0.5, y: 0 },
        { p: 0.5, y: 1 },
      ],
      score: 0.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.p0).toBeCloseTo(1 / 3, 3);
    expect(r.data.p1).toBeCloseTo(2 / 3, 3);
    expect(r.data.lower).toBeCloseTo(1 / 3, 3);
    expect(r.data.upper).toBeCloseTo(2 / 3, 3);
    expect(r.data.width).toBeCloseTo(1 / 3, 3);
    expect(r.data.calibrationRows).toBe(2);
  });

  it("fail-closes on an empty calibration set and out-of-range scores", () => {
    expect(evalVennAbersInterval({ calibration: [], score: 0.5 }).ok).toBe(false);
    expect(
      evalVennAbersInterval({
        calibration: [{ p: 0.5, y: 0 }],
        score: 1.5,
      }).ok,
    ).toBe(false);
    expect(
      evalVennAbersInterval({
        calibration: [{ p: 0.5, y: 2 as BinaryOutcome }],
        score: 0.5,
      }).ok,
    ).toBe(false);
  });
});

describe("selective gate — firing decision", () => {
  const cal = calibrationRows(120, "c");
  const evalRows: GateDecisionRow[] = [
    { rowId: "e1", score: 0.88, q: 0.5, stratum: NFL_STRATUM, y: 0 },
    { rowId: "e2", score: 0.35, q: 0.5, stratum: NFL_STRATUM, y: 0 },
    { rowId: "e3", score: 0.9, q: 0.5, stratum: MLB_STRATUM, y: 1 },
    { rowId: "e4", score: 0.62, q: 0.5, stratum: NFL_STRATUM, y: 1, obtainableDecimalPrice: 2.1 },
  ];

  it("fires on the lower bound only, and keeps an under-evidenced stratum silent", () => {
    const r = evalSelectiveGate({ calibrationRows: cal, evalRows, tau: 0.02 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.eligible).toBe(4);
    expect(r.data.fired).toBe(2);
    expect(r.data.coverage).toBe(0.5);
    expect(r.data.decisions.map((d) => d.rowId).sort()).toEqual(["e1", "e4"]);

    for (const d of r.data.decisions) {
      expect(d.lcbEdge).toBeCloseTo(d.interval.lower - d.q, 12);
      expect(d.lcbEdge).toBeGreaterThan(0.02);
      expect(d.interval.lower).toBeLessThanOrEqual(d.interval.upper);
      expect(d.width).toBeCloseTo(d.interval.upper - d.interval.lower, 12);
    }
    const e4 = r.data.decisions.find((d) => d.rowId === "e4");
    expect(e4?.obtainableDecimalPrice).toBe(2.1);

    // e1 lost, e4 won -> the realized rate over fired rows is 0.5, and the
    // Wilson lower bound sits below it.
    expect(r.data.realizedRate).toBe(0.5);
    expect(r.data.wilsonLcb).not.toBeNull();
    expect(r.data.wilsonLcb ?? 1).toBeLessThan(0.5);
    expect(r.data.wilsonLcb ?? 1).toBeGreaterThan(0);

    // The MLB stratum carried zero calibration rows: that is an absence of
    // evidence, reported as silent, never as a decline.
    expect(r.data.silentStrata).toEqual([{ stratum: MLB_STRATUM, calibrationRows: 0 }]);
    expect(r.data.minStratumCalibration).toBe(100);
    expect(r.data.multiprobSource).toBe("legacy-isotonic");
  });

  it("vetoes a width-clearing row when the interval cap bites, and names the rows", () => {
    const iv = evalVennAbersInterval({
      calibration: cal.map((c) => ({ p: c.score, y: c.y })),
      score: 0.88,
    });
    expect(iv.ok).toBe(true);
    if (!iv.ok) return;
    expect(iv.data.width).toBeGreaterThan(0);

    const r = evalSelectiveGate({
      calibrationRows: cal,
      evalRows,
      tau: 0.02,
      options: { maxWidthForFire: iv.data.width / 2 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fired).toBe(0);
    // Only rows that cleared tau are counted: e2 never reached the cap.
    expect(r.data.widthNoBets).toBe(2);
    expect([...r.data.widthVetoedRowIds].sort()).toEqual(["e1", "e4"]);
    expect(r.data.realizedRate).toBeNull();
  });

  it("fails closed when a calibration row is also an eval row", () => {
    const r = evalSelectiveGate({
      calibrationRows: cal,
      evalRows: [...evalRows, { rowId: "c-7", score: 0.7, q: 0.5, stratum: NFL_STRATUM, y: 1 }],
      tau: 0.02,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("c-7");
  });

  it("fails closed on malformed rows and out-of-range tau", () => {
    expect(evalSelectiveGate({ calibrationRows: [], evalRows, tau: 0.02 }).ok).toBe(false);
    expect(evalSelectiveGate({ calibrationRows: cal, evalRows, tau: 1.5 }).ok).toBe(false);
    expect(
      evalSelectiveGate({
        calibrationRows: cal,
        evalRows: [{ rowId: "x", score: 0.7, q: 0.5, stratum: NFL_STRATUM, y: 3 as BinaryOutcome }],
        tau: 0.02,
      }).ok,
    ).toBe(false);
    expect(
      evalSelectiveGate({
        calibrationRows: cal,
        evalRows: [
          { rowId: "x", score: 0.7, q: 0.5, stratum: NFL_STRATUM, y: 1, obtainableDecimalPrice: 0.9 },
        ],
        tau: 0.02,
      }).ok,
    ).toBe(false);
  });
});

describe("selective gate — tau tuning", () => {
  const cal = calibrationRows(120, "c");
  const tuningRows: GateDecisionRow[] = Array.from({ length: 60 }, (_, i) => ({
    rowId: `t-${i}`,
    score: 0.85,
    q: 0.5,
    stratum: NFL_STRATUM,
    y: i < 45 ? 1 : 0,
  }));

  it("accepts the loosest surviving tau on a clearly profitable fold", () => {
    const r = evalTuneTau({
      calibrationRows: cal,
      tuningRows,
      taus: [0, 0.2, 0.5],
      minFired: 2,
      delta: 0.05,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.curve).toHaveLength(3);
    // The curve is in the caller's tau order, so tau=0 fires everything and
    // tau=0.5 is above the achievable edge and fires nothing at all.
    expect(r.data.curve[0]?.fired).toBe(60);
    expect(r.data.curve[0]?.coverage).toBe(1);
    expect(r.data.curve[0]?.realizedRate).toBe(0.75);
    expect(r.data.curve[0]?.meanBreakeven).toBe(0.5);
    expect(r.data.curve[2]?.fired).toBe(0);
    expect(r.data.curve[2]?.realizedRate).toBeNull();
    expect(r.data.curve[2]?.meanBreakeven).toBeNull();
    expect(r.data.tau).toBe(0);
    expect(r.data.reason).toContain("exact-binomial");
  });

  it("returns tau=null — fire nothing — when no fold clears the bar", () => {
    const breakevenRows: GateDecisionRow[] = Array.from({ length: 60 }, (_, i) => ({
      rowId: `b-${i}`,
      score: 0.85,
      q: 0.5,
      stratum: NFL_STRATUM,
      y: i < 10 ? 1 : 0,
    }));
    const r = evalTuneTau({
      calibrationRows: cal,
      tuningRows: breakevenRows,
      taus: [0, 0.2, 0.5],
      minFired: 2,
      delta: 0.05,
    });
    // null tau is a real, first-class answer, not a failure.
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.tau).toBeNull();
    expect(r.data.reason).toContain("fire nothing");
    expect(r.data.curve[0]?.realizedRate).toBeCloseTo(1 / 6, 12);
    expect(r.data.curve[0]?.fired).toBe(60);
  });

  it("fails closed on a tuning fold that overlaps calibration", () => {
    const r = evalTuneTau({
      calibrationRows: cal,
      tuningRows: [{ ...tuningRows[0]!, rowId: "c-3" }],
      taus: [0, 0.2],
      minFired: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("c-3");
  });

  it("fails closed on an out-of-range FWER budget and a non-integer minFired", () => {
    const r = evalTuneTau({
      calibrationRows: cal,
      tuningRows,
      taus: [0, 0.2],
      minFired: 0,
      delta: 0.05,
    });
    expect(r.ok).toBe(false);
    const d = evalTuneTau({
      calibrationRows: cal,
      tuningRows,
      taus: [0, 0.2],
      minFired: 2,
      delta: 1.5,
    });
    expect(d.ok).toBe(false);
  });
});

describe("edge lab council", () => {
  const features = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`f${i}`, (i + 1) / 100]),
  );

  it("reaches a bet decision when the market gap, calibration, and evidence all clear", async () => {
    const r = await evalEdgeLabDebate({
      slateId: "slate-1",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      marketType: "MONEYLINE",
      features,
      marketImpliedProb: 0.5,
      modelScore: 0.7,
      multiprob: { p0: 0.62, p1: 0.66, width: 0.04 },
      calibrationSampleSize: 250,
      placeboSurvived: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.opinionCount).toBe(7);
    expect(r.data.roundCount).toBe(1);
    expect(r.data.guardianMaxWidth).toBe(0.15);
    expect(r.data.summary.finalDecision).toBe("bet");
    expect(r.data.summary.slateId).toBe("slate-1");
    expect(r.data.summary.honestyFlags).toEqual([]);

    const byRole = new Map(r.data.roles.map((o) => [o.role, o]));
    // gap 0.20 -> confidence min(1, 0.8) = 0.8
    expect(byRole.get("market_microstructure")?.confidence).toBeCloseTo(0.8, 12);
    // 12 features -> min(1, 12/10) = 1
    expect(byRole.get("feature_analyst")?.confidence).toBeCloseTo(1, 12);
    expect(byRole.get("placebo_analyst")?.stance).toBe("support");
    // lcbEdge 0.12 -> min(1, 1.2) = 1
    expect(byRole.get("calibration_analyst")?.confidence).toBeCloseTo(1, 12);
    expect(byRole.get("risk_honesty_guardian")?.noBetSignal).toBe(false);
    // net weight 0.8 + 1.0 + 0.7 + 1.0 = 3.5, clamped to 1
    expect(byRole.get("decision_agent")?.confidence).toBeCloseTo(1, 12);
  });

  it("vetoes to no_bet when the stratum is under-evidenced", async () => {
    const r = await evalEdgeLabDebate({
      slateId: "slate-2",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      features,
      marketImpliedProb: 0.5,
      modelScore: 0.7,
      multiprob: { p0: 0.62, p1: 0.66, width: 0.04 },
      calibrationSampleSize: 12,
      placeboSurvived: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.summary.finalDecision).toBe("no_bet");
    expect(r.data.summary.primaryReason).toContain("calibration row");
    expect(r.data.summary.honestyFlags.join(" ")).toContain("insufficient evidence");
  });

  it("vetoes to no_bet when the signal failed its placebo check", async () => {
    const r = await evalEdgeLabDebate({
      slateId: "slate-3",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      features,
      marketImpliedProb: 0.5,
      modelScore: 0.7,
      multiprob: { p0: 0.62, p1: 0.66, width: 0.04 },
      calibrationSampleSize: 250,
      placeboSurvived: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.summary.finalDecision).toBe("no_bet");
    expect(r.data.summary.primaryReason).toContain("placebo");
  });

  it("honours an operator override that raises a no-bet signal", async () => {
    const r = await evalEdgeLabDebate({
      slateId: "slate-4",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      features,
      marketImpliedProb: 0.5,
      modelScore: 0.7,
      multiprob: { p0: 0.62, p1: 0.66, width: 0.04 },
      calibrationSampleSize: 250,
      placeboSurvived: true,
      overrides: [
        {
          role: "placebo_analyst",
          stance: "oppose",
          confidence: 1,
          rationale: "line moved after the snapshot was taken",
          noBetSignal: true,
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.opinionCount).toBe(8);
    expect(r.data.summary.finalDecision).toBe("no_bet");
    expect(r.data.summary.primaryReason).toContain("prior analyst");
  });

  it("fails closed on an inconsistent interval, a structural role override, and a bad as-of", async () => {
    const inconsistent = await evalEdgeLabDebate({
      slateId: "s",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      multiprob: { p0: 0.62, p1: 0.66, width: 0.5 },
    });
    expect(inconsistent.ok).toBe(false);
    if (!inconsistent.ok) expect(inconsistent.reason).toContain("does not match");

    const structural = await evalEdgeLabDebate({
      slateId: "s",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      overrides: [
        {
          role: "risk_honesty_guardian",
          stance: "support",
          confidence: 1,
          rationale: "trying to author my own veto clearance",
        },
      ],
    });
    expect(structural.ok).toBe(false);
    if (!structural.ok) expect(structural.reason).toContain("not overridable");

    const badAsOf = await evalEdgeLabDebate({
      slateId: "s",
      asOf: "yesterday",
      sport: "nfl",
    });
    expect(badAsOf.ok).toBe(false);

    const badSample = await evalEdgeLabDebate({
      slateId: "s",
      asOf: "2026-09-20T12:00:00.000Z",
      sport: "nfl",
      calibrationSampleSize: 1.5,
    });
    expect(badSample.ok).toBe(false);
  });
});

describe("props context bind", () => {
  const priorGame: GameRow = {
    sport: "nfl",
    gameId: "g-prior",
    season: 2026,
    week: 1,
    startTime: "2026-09-06T18:00:00.000Z",
    homeTeam: "BUF",
    awayTeam: "NYJ",
    homeScore: 24,
    awayScore: 17,
    closing: {
      spreadHome: null,
      total: null,
      moneylineHomeDecimal: null,
      moneylineAwayDecimal: null,
    },
  };

  const outdoor: GameWeatherForecast = {
    forecastIssuedAt: "2026-09-13T12:00:00.000Z",
    isDome: false,
    windMph: 15,
    precipProbPct: 50,
    tempF: 30,
  };

  const base = {
    schedule: [priorGame],
    team: "BUF",
    gameId: "g-target",
    kickoffIso: "2026-09-13T18:00:00.000Z",
    isHome: true,
    opponentTeam: "SEA",
    fields: ["rest_days", "body_clock_shift_h", "wx_total_suppression"] as const,
  };

  it("binds rest, body clock, and weather from schedule + pre-cutoff forecast", () => {
    const r = evalPropsContextBind({
      ...base,
      weather: [{ gameId: "g-target", forecast: outdoor }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.cells).toHaveLength(3);
    expect(r.data.priced).toBe(false);
    expect(r.data.methodTag).toBe("props_context_bind_v1");

    // 2026-09-06T18:00Z + 4h = 22:00Z prior end; kickoff 2026-09-13T18:00Z
    // => 6 days 20 hours = 6.8333... rest days. Never a default 7.
    expect(r.data.restDays).toBeCloseTo(6.8333333, 6);
    // Home game in the team's own zone: no body-clock shift.
    expect(r.data.bodyClockShiftHours).toBe(0);
    // 0.6*(15/25) + 0.25*(50/100) + 0.15*((50-30)/30) = 0.36 + 0.125 + 0.10
    expect(r.data.wxTotalSuppression).toBeCloseTo(0.585, 10);

    for (const cell of r.data.cells) {
      expect(cell.grain).toBe("pregame_for_kickoff");
      expect(cell.layer).toBe("L3");
    }
    const rest = r.data.cells.find((c) => c.field === "rest_days");
    expect(rest?.provenance).toBe("schedule_fact");
    expect(rest?.knownAtIso).toBe("2026-09-06T22:00:00.000Z");
  });

  it("moves the body clock for a road game in another zone", () => {
    const r = evalPropsContextBind({
      ...base,
      team: "BUF",
      isHome: false,
      opponentTeam: "SEA",
      fields: ["body_clock_shift_h"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // venue zone (SEA, -8) minus team zone (BUF, -5) = -3 hours.
    expect(r.data.bodyClockShiftHours).toBe(-3);
    expect(r.data.restDays).toBeNull();
  });

  it("refuses rather than inventing a rest week or a neutral weather value", () => {
    const noPrior = evalPropsContextBind({
      ...base,
      schedule: [],
      fields: ["rest_days"],
    });
    expect(noPrior.ok).toBe(false);
    if (!noPrior.ok) expect(noPrior.reason).toContain("no_prior_game");

    const leaky = evalPropsContextBind({
      ...base,
      weather: [
        {
          gameId: "g-target",
          forecast: { ...outdoor, forecastIssuedAt: "2026-09-13T17:30:00.000Z" },
        },
      ],
    });
    expect(leaky.ok).toBe(false);
    if (!leaky.ok) expect(leaky.reason).toContain("leaky_forecast");

    const missing = evalPropsContextBind({
      ...base,
      weather: [
        {
          gameId: "g-target",
          forecast: { ...outdoor, tempF: null },
        },
      ],
      fields: ["wx_total_suppression"],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain("missing_outdoor_fields");

    const unknownTeam = evalPropsContextBind({
      ...base,
      opponentTeam: "XYZ",
      fields: ["body_clock_shift_h"],
    });
    expect(unknownTeam.ok).toBe(false);
    if (!unknownTeam.ok) expect(unknownTeam.reason).toContain("unknown_team");
  });

  it("fails closed on an unknown field, an empty field list, and a bad kickoff", () => {
    const unknown = evalPropsContextBind({
      ...base,
      fields: ["rest_minutes" as "rest_days"],
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toContain("unknown context field");

    const empty = evalPropsContextBind({ ...base, fields: [] });
    expect(empty.ok).toBe(false);

    const badKickoff = evalPropsContextBind({ ...base, kickoffIso: "not-a-date" });
    expect(badKickoff.ok).toBe(false);
  });
});

describe("kaunitz cross-book outlier scan", () => {
  it("flags the one book whose Shin probability is far below the field median", () => {
    const quotes: KaunitzBookQuote[] = [
      { book: "longshot", homeAmerican: 250, awayAmerican: -110 },
      { book: "sharp-a", homeAmerican: -110, awayAmerican: 110 },
      { book: "sharp-b", homeAmerican: -130, awayAmerican: 110 },
    ];
    const r = evalKaunitzScan({ quotes, tau: 0.03 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.bookCount).toBe(3);
    expect(r.data.priced).toBe(false);
    expect(r.data.flags).toHaveLength(1);
    const flag = r.data.flags[0]!;
    expect(flag.book).toBe("longshot");
    expect(flag.side).toBe("home");
    expect(flag.qBook).toBeLessThan(flag.qConsensus);
    expect(flag.gap).toBeGreaterThan(0.1);
    expect(flag.gap).toBeCloseTo(flag.qConsensus - flag.qBook, 12);

    // Odd book count -> the median is the middle book, and the two medians
    // come from that same book, so they sum to one.
    const middle = r.data.books[1]!;
    expect(r.data.qHomeConsensus).toBeCloseTo(middle.qHome, 12);
    expect(r.data.qAwayConsensus).toBeCloseTo(middle.qAway, 12);
    expect(r.data.qHomeConsensus + r.data.qAwayConsensus).toBeCloseTo(1, 9);
    expect(r.data.qHomeConsensus).toBeGreaterThan(0.5);
    expect(r.data.qHomeConsensus).toBeLessThan(0.55);
    for (const b of r.data.books) {
      expect(b.qHome).toBeGreaterThanOrEqual(0);
      expect(b.qHome).toBeLessThanOrEqual(1);
      expect(Number.isFinite(b.z)).toBe(true);
    }
  });

  it("flags nothing when the books agree", () => {
    const r = evalKaunitzScan({
      quotes: [
        { book: "a", homeAmerican: -110, awayAmerican: 110 },
        { book: "b", homeAmerican: -108, awayAmerican: 112 },
        { book: "c", homeAmerican: -112, awayAmerican: 108 },
      ],
      tau: 0.03,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.flags).toEqual([]);
    expect(r.data.bookCount).toBe(3);
  });

  it("fails closed on a field too thin to have a median, a bad tau, and a blank price", () => {
    const thin = evalKaunitzScan({
      quotes: [
        { book: "a", homeAmerican: -110, awayAmerican: 110 },
        { book: "b", homeAmerican: -115, awayAmerican: 115 },
      ],
    });
    expect(thin.ok).toBe(false);
    if (!thin.ok) expect(thin.reason).toContain("needs a FIELD");

    const badTau = evalKaunitzScan({
      quotes: [
        { book: "a", homeAmerican: -110, awayAmerican: 110 },
        { book: "b", homeAmerican: -115, awayAmerican: 115 },
        { book: "c", homeAmerican: -120, awayAmerican: 120 },
      ],
      tau: 1.5,
    });
    expect(badTau.ok).toBe(false);

    const blank = evalKaunitzScan({
      quotes: [
        { book: "a", homeAmerican: -110, awayAmerican: 110 },
        { book: "b", homeAmerican: -115, awayAmerican: 115 },
        { book: "c", homeAmerican: 50, awayAmerican: 115 },
      ],
    });
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.reason).toContain("magnitude of 100");

    const empty = evalKaunitzScan({ quotes: [] });
    expect(empty.ok).toBe(false);
  });
});

describe("grouped climatology", () => {
  const repeat = (n: number, y: (i: number) => BinaryOutcome) =>
    Array.from({ length: n }, (_, i) => y(i));

  const TRAIN: ClimTrainRow[] = [
    // WR|8: 36/60 = 0.600
    ...repeat(60, (i) => (i % 10 < 6 ? 1 : 0)).map((y) => ({ group: "WR|8", parent: "WR", y })),
    // WR|9: 12/30 = 0.400
    ...repeat(30, (i) => (i % 5 < 2 ? 1 : 0)).map((y) => ({ group: "WR|9", parent: "WR", y })),
    // TE|8: 5/10 = 0.500, below minCellN=20 -> must back off
    ...repeat(10, (i) => (i % 2 === 0 ? 1 : 0)).map((y) => ({ group: "TE|8", parent: "TE", y })),
    // TE|9: 14/20 = 0.700
    ...repeat(20, (i) => (i % 10 < 7 ? 1 : 0)).map((y) => ({ group: "TE|9", parent: "TE", y })),
  ];

  it("fits cell rates and the pooled rate exactly", () => {
    const r = evalFitGroupedClimatology({ train: TRAIN });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.methodTag).toBe("grouped_climatology_v1");
    expect(r.data.minCellN).toBe(20);
    expect(r.data.trainRows).toBe(120);
    // 36 + 12 + 5 + 14 = 67 hits over 120 rows
    expect(r.data.pooled.n).toBe(120);
    expect(r.data.pooled.hits).toBe(67);
    expect(r.data.pooled.rate).toBeCloseTo(67 / 120, 12);

    const cells = new Map(r.data.groups.map((g) => [g.key, g]));
    expect(cells.get("WR|8")?.rate).toBeCloseTo(0.6, 12);
    expect(cells.get("WR|8")?.n).toBe(60);
    expect(cells.get("TE|8")?.rate).toBeCloseTo(0.5, 12);
    const parents = new Map(r.data.parents.map((g) => [g.key, g]));
    // TE parent pools TE|8 (5/10) and TE|9 (14/20) -> 19/30
    expect(parents.get("TE")?.n).toBe(30);
    expect(parents.get("TE")?.rate).toBeCloseTo(19 / 30, 12);
  });

  it("scores a model that merely recovers the cell mean as a grouping loss", () => {
    const cases: ScoredCase[] = [
      ...repeat(5, () => 1).map(() => ({ group: "WR|8", parent: "WR", pModel: 0.6, y: 1 as const })),
      ...repeat(5, () => 0).map(() => ({ group: "WR|9", parent: "WR", pModel: 0.4, y: 0 as const })),
      ...repeat(5, () => 0).map(() => ({
        group: "TE|8",
        parent: "TE",
        pModel: 19 / 30,
        y: 0 as const,
      })),
      ...repeat(5, () => 1).map(() => ({ group: "TE|9", parent: "TE", pModel: 0.7, y: 1 as const })),
    ];
    const r = evalScoreAgainstClimatology({ train: TRAIN, cases });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.score.n).toBe(20);
    // 73/360
    expect(r.data.score.modelBrier).toBeCloseTo(73 / 360, 10);
    // The model IS the grouped climatology on these cells, so its Brier equals
    // the grouped reference exactly: skill over grouped is zero, not positive.
    expect(r.data.score.groupedClimBrier).toBeCloseTo(73 / 360, 10);
    // 3649/14400
    expect(r.data.score.pooledClimBrier).toBeCloseTo(3649 / 14400, 10);
    expect(r.data.score.bssGrouped).toBeCloseTo(0, 12);
    expect(r.data.score.bssPooled).toBeCloseTo(729 / 3649, 10);
    expect(r.data.score.bssPooled ?? 0).toBeGreaterThan(0);
    expect(r.data.score.groupingLoss).toBe(true);

    // Backoff provenance: TE|8 is too thin and resolves through its parent.
    const te8 = r.data.predictions.find((p) => p.group === "TE|8");
    expect(te8?.source).toBe("parent");
    expect(te8?.p).toBeCloseTo(19 / 30, 12);
    expect(r.data.predictions.find((p) => p.group === "WR|8")?.source).toBe("group");
  });

  it("credits a model that beats the grouped cell mean, not just the pooled dummy", () => {
    const cases: ScoredCase[] = [
      ...repeat(14, () => 1).map(() => ({ group: "WR|8", parent: "WR", pModel: 0.7, y: 1 as const })),
      ...repeat(6, () => 0).map(() => ({ group: "WR|8", parent: "WR", pModel: 0.7, y: 0 as const })),
    ];
    const r = evalScoreAgainstClimatology({ train: TRAIN, cases });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.score.modelBrier).toBeCloseTo(0.21, 12);
    expect(r.data.score.groupedClimBrier).toBeCloseTo(0.22, 12);
    expect(r.data.score.pooledClimBrier).toBeCloseTo(0.23006944, 8);
    expect(r.data.score.bssGrouped).toBeCloseTo(1 - 0.21 / 0.22, 10);
    expect(r.data.score.bssGrouped ?? 0).toBeGreaterThan(0);
    expect(r.data.score.groupingLoss).toBe(false);
  });

  it("fails closed on an empty train window and malformed rows", () => {
    expect(
      evalFitGroupedClimatology({
        train: TRAIN,
        minCellN: 0,
      }).ok,
    ).toBe(false);

    expect(
      evalScoreAgainstClimatology({ train: TRAIN, cases: [] }).ok,
    ).toBe(false);

    expect(
      evalScoreAgainstClimatology({
        train: [{ group: "", parent: "WR", y: 1 }],
        cases: [{ group: "WR|8", pModel: 0.5, y: 1 }],
      }).ok,
    ).toBe(false);

    expect(
      evalScoreAgainstClimatology({
        train: TRAIN,
        cases: [{ group: "WR|8", pModel: 1.4, y: 1 }],
      }).ok,
    ).toBe(false);
  });
});

describe("brier skill", () => {
  it("scores a model against a constant reference exactly", () => {
    const r = evalBrierSkill({
      pairs: [
        { p: 0.8, y: 1 },
        { p: 0.2, y: 0 },
      ],
      referenceProb: 0.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.modelBrier).toBeCloseTo(0.04, 12);
    expect(r.data.referenceBrier).toBeCloseTo(0.25, 12);
    expect(r.data.bss).toBeCloseTo(0.84, 12);
  });

  it("returns null rather than an infinite score when the reference is perfect", () => {
    const r = evalBrierSkill({
      pairs: [
        { p: 0.7, y: 1 },
        { p: 0.7, y: 1 },
      ],
      referenceProb: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.referenceBrier).toBe(0);
    expect(r.data.bss).toBeNull();
  });

  it("fails closed on an empty sample and out-of-range probabilities", () => {
    expect(evalBrierSkill({ pairs: [], referenceProb: 0.5 }).ok).toBe(false);
    expect(
      evalBrierSkill({ pairs: [{ p: 1.2, y: 1 }], referenceProb: 0.5 }).ok,
    ).toBe(false);
    expect(
      evalBrierSkill({ pairs: [{ p: 0.5, y: 1 }], referenceProb: 2 }).ok,
    ).toBe(false);
  });
});
