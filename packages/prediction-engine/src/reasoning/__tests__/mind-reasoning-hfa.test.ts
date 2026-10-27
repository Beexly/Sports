/**
 * TDD regression guard for the mind-reasoning situational citation fix.
 *
 * Defect: generateFantasyDfsAdvice cited "Navier-Stokes Aerodynamic Drag
 * (arXiv:2401.16392)" and "Thermal Friction Loss" for adverse weather. That
 * citation is a hallucination — arXiv:2401.16392 is a survey of home-field
 * advantage in American football, not a fluid-dynamics paper. The real
 * primitives the engine should use are:
 *   1. The modern HFA prior (~1.5–1.8 points).
 *   2. The post-2011 rest-differential decay (arXiv:2408.10867v1), whose
 *      abstract reports a +2.2 pt/game bye edge before the 2011 CBA that is
 *      mitigated afterward.
 *
 * This suite fails on the old text and passes only when the hallucinated
 * citation is gone and both real primitives are wired.
 */
import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import { generateFantasyDfsAdvice, generateSameGameParlay } from "../mind-reasoning.js";
import type { MindPrincipleMatch } from "../mind-reasoning.js";
import type { GameContext } from "../situational-engine.js";

const coldWindyCtx: GameContext = {
  homeTeam: "DEN",
  awayTeam: "SEA",
  venue: "Empower Field at Mile High, Denver",
  restDaysHome: 4,
  restDaysAway: 4,
  weather: "Clear, 28F, wind 18mph",
  marketLine: -1.5,
  marketImpliedProbability: 0.525,
  outcome: "DEN",
  decisionTimestamp: "2026-10-15T23:00:00.000Z",
  decisionWindowMs: 86400000,
  altitudeFt: 5280,
  windSpeedMph: 18,
  temperatureF: 28,
  crowdDecibels: 98,
  publicTicketPct: 72,
  publicHandlePct: 51,
  timeZoneShiftHours: 1,
  olContinuityDelta: 0.25,
  coachAggressivenessDelta: 0.4,
  turnoverMarginDelta: -3,
};

const dummyMatches: MindPrincipleMatch[] = [
  {
    item_id: "test-trench-1",
    source: "test",
    title: "Trench Interaction Beta",
    principle_or_feature: "Trench continuity",
    evidence_quote: "trench continuity",
    matchedContext: "trench_warfare",
    how_it_influences_reasoning: "trench",
    numericDelta: 0.1,
    confidenceWeight: 0.9,
  },
  {
    item_id: "test-kinematic-2",
    source: "test",
    title: "Kinematic Separation",
    principle_or_feature: "route running",
    evidence_quote: "separation",
    matchedContext: "kinematics_route_running",
    how_it_influences_reasoning: "separation",
    numericDelta: 0.1,
    confidenceWeight: 0.9,
  },
  {
    item_id: "test-acwr-3",
    source: "test",
    title: "ACWR Workload Hazard",
    principle_or_feature: "workload",
    evidence_quote: "workload",
    matchedContext: "acwr_workload_hazard",
    how_it_influences_reasoning: "workload",
    numericDelta: 0.1,
    confidenceWeight: 0.9,
  },
];

describe("mind-reasoning adverse-weather citation fix", () => {
  const advice = generateFantasyDfsAdvice(coldWindyCtx, dummyMatches);
  const allText = [
    ...advice.targets.map((t) => `${t.reasoning} ${t.citedPrinciples.join(" ")}`),
    advice.cashGameStrategy,
    advice.tournamentGppStrategy,
    advice.rationale,
  ].join("\n");

  it("removes the hallucinated Navier-Stokes citation (arXiv:2401.16392)", () => {
    assert.equal(allText.includes("2401.16392"), false, "arXiv:2401.16392 must not be cited");
    assert.equal(allText.includes("Navier-Stokes"), false, "Navier-Stokes must not be cited");
    assert.equal(allText.includes("Thermal Friction Loss"), false, "Thermal Friction Loss must not be cited");
  });

  it("wires the modern HFA prior (~1.5–1.8 points)", () => {
    assert.ok(
      /Home-Field Advantage Prior|HFA prior/i.test(allText),
      "must cite the modern home-field advantage prior",
    );
    assert.ok(
      allText.includes("1.5") && allText.includes("1.8"),
      "must state the ~1.5–1.8 point HFA band",
    );
  });

  it("wires the post-2011 rest-differential decay (arXiv:2408.10867v1)", () => {
    assert.ok(
      allText.includes("2408.10867"),
      "must cite arXiv:2408.10867v1",
    );
    assert.ok(
      /2011/.test(allText),
      "must reference the 2011 CBA break that mitigated the bye edge",
    );
  });

  it("fades the deep perimeter threat in cold/wind without a fluid-dynamics claim", () => {
    const fade = advice.targets.find((t) => t.action === "FADE_AVOID");
    assert.ok(fade, "must emit a FADE_AVOID target for adverse weather");
    assert.ok(
      !/aerodynamic|drag|trajectory completion/i.test(fade!.reasoning),
      "reasoning must not make a fluid-dynamics drag claim",
    );
  });
});

describe("mind-reasoning SGP: no Navier-Stokes drag term; HFA prior + rest decay in the math", () => {
  const sgp = generateSameGameParlay(coldWindyCtx, dummyMatches);
  const allText = [
    sgp.rationale,
    ...sgp.legs.map((l) => l.correlationRationale),
  ].join("\n");

  it("removes the hallucinated aerodynamic drag claim from the SGP total leg", () => {
    assert.equal(allText.includes("Aerodynamic drag"), false, "SGP must not cite aerodynamic drag");
    assert.equal(/Navier-Stokes/i.test(allText), false, "SGP must not cite Navier-Stokes");
    const totalLeg = sgp.legs.find((l) => l.marketType === "TOTAL");
    assert.ok(totalLeg, "must emit a TOTAL leg");
    assert.ok(
      !/aerodynamic|drag|trajectory completion/i.test(totalLeg!.correlationRationale),
      "total-leg rationale must not make a fluid-dynamics drag claim",
    );
  });

  it("wires the modern HFA prior (~1.5–1.8 pts) into the SGP math and rationale", () => {
    assert.ok(
      /HFA prior|Home-Field Advantage Prior/i.test(allText),
      "must cite the modern HFA prior",
    );
    assert.ok(
      allText.includes("1.5") && allText.includes("1.8"),
      "must state the ~1.5–1.8 point HFA band",
    );
    // A neutral home moneyline at 0.51 with a real HFA prior must clear 0.51.
    const neutralHome: GameContext = {
      ...coldWindyCtx,
      marketImpliedProbability: 0.51,
      altitudeFt: 0,
      olContinuityDelta: 0,
    };
    const neutralSgp = generateSameGameParlay(neutralHome, dummyMatches);
    const neutralMl = neutralSgp.legs.find((l) => l.marketType === "SPREAD");
    assert.ok(neutralMl, "must emit a SPREAD leg");
    assert.ok(
      neutralMl!.probability > 0.51,
      "HFA prior must raise the neutral home moneyline above 0.51",
    );
  });

  it("wires the post-2011 rest-differential decay (arXiv:2408.10867v1)", () => {
    assert.ok(allText.includes("2408.10867"), "must cite arXiv:2408.10867v1");
    assert.ok(/2011/.test(allText), "must reference the 2011 CBA break");
    // An away team on short rest relative to home must be penalised vs equal rest.
    const equalRest = generateSameGameParlay(
      { ...coldWindyCtx, restDaysHome: 7, restDaysAway: 7, marketImpliedProbability: 0.51, altitudeFt: 0, olContinuityDelta: 0 },
      dummyMatches,
    );
    const shortAway = generateSameGameParlay(
      { ...coldWindyCtx, restDaysHome: 7, restDaysAway: 3, marketImpliedProbability: 0.51, altitudeFt: 0, olContinuityDelta: 0 },
      dummyMatches,
    );
    const equalMl = equalRest.legs.find((l) => l.marketType === "SPREAD");
    const shortMl = shortAway.legs.find((l) => l.marketType === "SPREAD");
    assert.ok(equalMl && shortMl, "both must emit SPREAD legs");
    assert.ok(
      shortMl!.probability >= equalMl!.probability,
      "short away rest must not lower the home moneyline vs equal rest",
    );
  });
});
