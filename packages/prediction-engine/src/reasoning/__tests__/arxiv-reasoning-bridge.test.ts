import { describe, it, expect } from "vitest";
import { evaluateArxivCorpus, type ArxivContextQuery } from "../arxiv-reasoning-bridge.js";

describe("arxiv-reasoning-bridge", () => {
  it("consults the full 596-paper corpus and returns neutral synthesis when baseline is normal", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Denver Broncos",
      restDaysHome: 7,
      restDaysAway: 7,
      weatherWindMph: 5,
      altitudeFt: 800,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.totalPremisesConsulted).toBe(596);
    expect(res.activePremisesCount).toBe(0);
    expect(res.situationalReasoningSynthesis).toContain("all situational and environmental parameters within neutral baseline");
  });

  it("detects hypoxia and rest compression mismatch based on sports kinematics literature", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Denver Broncos",
      awayTeam: "Seattle Seahawks",
      restDaysHome: 7,
      restDaysAway: 4, // Thursday short rest
      altitudeFt: 5280, // Mile High
      styleMatchup: "PRESSURE_VS_PASS_HEAVY",
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.totalPremisesConsulted).toBe(596);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(3); // Fatigue + Hypoxia + Style
    expect(res.situationalReasoningSynthesis).toContain("Altitude hypoxia threshold exceeded");
    expect(res.situationalReasoningSynthesis).toContain("Rest compression");
    expect(res.situationalReasoningSynthesis).toContain("Higher-order network style mismatch");
  });

  it("triggers profit-bias identity fade under extreme retail ticket concentration", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Dallas Cowboys",
      awayTeam: "Philadelphia Eagles",
      restDaysHome: 7,
      restDaysAway: 7,
      publicTicketPct: 74,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(1);
    expect(res.situationalReasoningSynthesis).toContain("profit-bias identity fade");
  });

  it("triggers total depression under high wind aerodynamics literature", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Buffalo Bills",
      awayTeam: "New England Patriots",
      restDaysHome: 7,
      restDaysAway: 7,
      weatherWindMph: 22,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(1);
    expect(res.situationalReasoningSynthesis).toContain("Sustained surface winds");
    expect(res.situationalReasoningSynthesis).toContain("UNDER");
  });
});
