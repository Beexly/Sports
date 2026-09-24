/**
 * Tests for ./2412-10298v1-viewership (arXiv:2412.10298v1, lane=nlp).
 *
 * ACCEPTANCE GATE: Adopt the feature recipe only if the fixed pipeline beats the team-mean baseline by ≥15% MAE on the 2024 forward test AND held-sport-out R² > 0.5; reject if the signal disappears once the sport one-hot and random split are removed.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2412-10298v1-viewership";

describe("2412.10298v1 hierarchical viewership scaffold", () => {
  it("predicts with sport, team, and social-buzz terms", () => {
    const prediction = mod.forecastViewership(
      { sport: "NFL", team: "BUF", views: 0, socialBuzz: 2 },
      { intercept: 10, socialBuzzCoefficient: 3, sportEffects: { NFL: 1 }, teamEffects: { BUF: 2 } },
    );
    expect(prediction).toBeCloseTo(19, 10);
    expect(mod.forecastViewership({ sport: "NFL", team: "BUF", views: -1, socialBuzz: 1 }, {
      intercept: 0,
      socialBuzzCoefficient: 1,
      sportEffects: {},
      teamEffects: {},
    })).toBeNull();
  });

  it("evaluates the required forward and held-sport-out gate", () => {
    const training = [
      { sport: "NFL", team: "BUF", views: 10, socialBuzz: 0 },
      { sport: "NFL", team: "BUF", views: 10, socialBuzz: 0 },
    ];
    const test = [
      { sport: "NBA", team: "LAL", views: 20, socialBuzz: 0 },
      { sport: "NBA", team: "BOS", views: 40, socialBuzz: 0 },
    ];
    const result = mod.evaluateViewershipForecast(training, test, {
      intercept: 10,
      socialBuzzCoefficient: 0,
      sportEffects: { NBA: 10 },
      teamEffects: { LAL: 5, BOS: 15 },
    });
    expect(result?.n).toBe(2);
    expect(result?.modelMae).toBe(5);
    expect(result?.relativeMaeImprovement).toBeGreaterThan(0.15);
    expect(result?.heldSportOutR2).toBeGreaterThan(0.5);
    expect(result?.gatePassed).toBe(true);
  });

  it("does not silently fit or enable live ingestion", () => {
    expect(mod.ENABLED).toBe(false);
    expect(mod.evaluateViewershipForecast([], [], {
      intercept: 0,
      socialBuzzCoefficient: 0,
      sportEffects: {},
      teamEffects: {},
    })).toBeNull();
  });
});
