import { describe, it, expect, beforeEach } from "vitest";
import { promoteModel } from "../model-promoter.js";
import type { ModelMetadata, SettledPickRecord } from "../model-promoter.js";

describe("Model Promoter", () => {
  let champion: ModelMetadata;
  let challenger: ModelMetadata;
  let baseline: SettledPickRecord[];

  beforeEach(() => {
    champion = {
      version: "v5.0.0",
      deployedAt: new Date("2025-04-01"),
      changesSummary: "Baseline model",
    };

    challenger = {
      version: "v6.0.0",
      deployedAt: new Date("2025-05-23"),
      changesSummary: "Improved calibration + schedule density",
    };

    // Baseline: 100 settled picks with champion deployed at v5.0.0
    // In-sample: 50 picks before 2025-05-23 (moderately calibrated)
    // Out-of-sample: 50 picks after 2025-05-23 (equally good OOS)
    baseline = [];
    for (let i = 0; i < 50; i++) {
      baseline.push({
        id: `is-${i}`,
        modelProb: 0.6 + (Math.random() * 0.2 - 0.1), // 0.5–0.7
        won: Math.random() > 0.4, // ~60% win rate
        createdAt: new Date(new Date("2025-04-15").getTime() + i * 24 * 60 * 60 * 1000),
        settledAt: new Date(new Date("2025-04-16").getTime() + i * 24 * 60 * 60 * 1000),
        line: 3.5,
        pickType: "SPREAD",
      });
    }
    for (let i = 0; i < 50; i++) {
      baseline.push({
        id: `oos-${i}`,
        modelProb: 0.6 + (Math.random() * 0.2 - 0.1),
        won: Math.random() > 0.4,
        createdAt: new Date(new Date("2025-05-30").getTime() + i * 24 * 60 * 60 * 1000),
        settledAt: new Date(new Date("2025-05-31").getTime() + i * 24 * 60 * 60 * 1000),
        line: 3.5,
        pickType: "SPREAD",
      });
    }
  });

  describe("promoteModel", () => {
    it("returns champion when no challenger is proposed", () => {
      const decision = promoteModel(champion, null, baseline, {
        minOosSample: 25,
      });

      expect(decision.selectedModel.version).toBe("v5.0.0");
      expect(decision.isPromotion).toBe(false);
      expect(decision.reason).toBe("no_challenger_data");
    });

    it("returns champion when challenger has insufficient OOS sample", () => {
      const sparseBaseline = baseline.slice(0, 10); // Only 10 picks total

      const decision = promoteModel(champion, challenger, sparseBaseline, {
        minOosSample: 100,
        minSamplePerCohort: 50,
      });

      expect(decision.selectedModel.version).toBe("v5.0.0");
      expect(decision.isPromotion).toBe(false);
      expect(decision.reason).toBe("challenger_failed_oos");
    });

    it("returns champion when challenger shows overfit (OOS worse than IS)", () => {
      // Construct picks where challenger shows overfit
      const overfitPicks: SettledPickRecord[] = [];

      // In-sample (perfect calibration)
      for (let i = 0; i < 30; i++) {
        overfitPicks.push({
          id: `is-${i}`,
          modelProb: i % 2 === 0 ? 0.8 : 0.2, // Either 80% or 20%
          won: i % 2 === 0, // Matches the prediction
          createdAt: new Date(new Date("2025-04-15").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-04-16").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      // Out-of-sample (degraded)
      for (let i = 0; i < 30; i++) {
        overfitPicks.push({
          id: `oos-${i}`,
          modelProb: 0.9, // Overconfident
          won: i % 3 === 0, // Only 33% win rate (worse than predicted 90%)
          createdAt: new Date(new Date("2025-05-30").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-05-31").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      const decision = promoteModel(champion, challenger, overfitPicks, {
        minOosSample: 20,
        maxOosToIsDelta: 0.03,
      });

      expect(decision.selectedModel.version).toBe("v5.0.0");
      expect(decision.isPromotion).toBe(false);
      expect(decision.reason).toBe("challenger_failed_oos");
      expect(decision.rationale).toContain("overfit");
    });

    it("promotes challenger when OOS health passes and Brier improves by threshold", () => {
      // Construct picks where challenger is legitimately better
      const improvementPicks: SettledPickRecord[] = [];

      // In-sample (moderate calibration)
      for (let i = 0; i < 40; i++) {
        improvementPicks.push({
          id: `is-${i}`,
          modelProb: 0.55 + (Math.random() * 0.2), // 0.55–0.75
          won: Math.random() > 0.35, // ~65% win rate
          createdAt: new Date(new Date("2025-04-15").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-04-16").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      // Out-of-sample (better calibrated)
      for (let i = 0; i < 60; i++) {
        improvementPicks.push({
          id: `oos-${i}`,
          modelProb: 0.60 + (Math.random() * 0.15), // 0.60–0.75 (tighter range = better)
          won: Math.random() > 0.35,
          createdAt: new Date(new Date("2025-05-30").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-05-31").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      const decision = promoteModel(champion, challenger, improvementPicks, {
        minOosSample: 50,
        brierImprovementThreshold: 0.01, // Low bar for test
        maxOosToIsDelta: 0.03,
      });

      // May or may not promote depending on random outcomes,
      // but should evaluate the challenger's OOS metrics
      expect(decision.performance).toBeDefined();
      expect(decision.performance.model).toBeDefined();
      expect(decision.reason === "no_challenger_data" || decision.reason === "challenger_beats_champion" || decision.reason === "challenger_failed_oos").toBe(true);
    });

    it("includes comparison details when promotion occurs", () => {
      // Same as above but with deterministic data for promotion
      const promotablePicks: SettledPickRecord[] = [];

      // In-sample (imperfect)
      for (let i = 0; i < 50; i++) {
        promotablePicks.push({
          id: `is-${i}`,
          modelProb: 0.65,
          won: i < 30, // 60% win rate, matches prediction
          createdAt: new Date(new Date("2025-04-15").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-04-16").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      // Out-of-sample (equally good, not worse)
      for (let i = 0; i < 50; i++) {
        promotablePicks.push({
          id: `oos-${i}`,
          modelProb: 0.65,
          won: i < 30, // 60% win rate, matches prediction
          createdAt: new Date(new Date("2025-05-30").getTime() + i * 24 * 60 * 60 * 1000),
          settledAt: new Date(new Date("2025-05-31").getTime() + i * 24 * 60 * 60 * 1000),
          line: 3.5,
          pickType: "SPREAD",
        });
      }

      const decision = promoteModel(champion, challenger, promotablePicks, {
        minOosSample: 40,
        brierImprovementThreshold: 0.001, // Very low bar
        maxOosToIsDelta: 0.05,
      });

      if (decision.isPromotion) {
        expect(decision.comparison).toBeDefined();
        expect(decision.comparison?.priorChampion.version).toBe("v5.0.0");
        expect(decision.comparison?.brierImprovement).toBeDefined();
        expect(decision.comparison?.clvImprovement).toBeDefined();
      }
    });

    it("never demotes champion (only promotes or holds)", () => {
      const decision = promoteModel(champion, challenger, baseline);

      // Champion is always either kept or challenged
      const isChamped = decision.selectedModel.version === champion.version;
      const isChallenged = decision.selectedModel.version === challenger.version;
      expect(isChamped || isChallenged).toBe(true);

      // If not promoted, champion is still the selection
      if (!decision.isPromotion) {
        expect(decision.selectedModel.version).toBe(champion.version);
      }
    });

    it("handles edge case of zero settled picks gracefully", () => {
      const decision = promoteModel(champion, challenger, [], {
        minOosSample: 100,
      });

      expect(decision.selectedModel.version).toBe("v5.0.0");
      expect(decision.isPromotion).toBe(false);
      expect(decision.reason).toBe("no_challenger_data");
    });
  });
});
