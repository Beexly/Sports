import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  computeMarginalizedScenarioIntegration,
  evaluateEarlyWeekLockRule,
  evaluateSurveillanceDelta,
  lockEarlyWeekBoardPrice,
  BoundaryScenario,
  EarlyWeekBoardEntry,
  SurveillanceTriggerEvent,
} from "../rolling-horizon-lifecycle.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Proactive Early-Week 'Horizon-Zero' Slate & Surveillance Engine", () => {
  describe("Marginalized Interventional Scenario Integration", () => {
    it("throws if scenarios do not sum to 1.0", () => {
      const invalidScenarios: BoundaryScenario[] = [
        {
          scenarioId: "S1",
          stateAssignments: { active: true },
          transitionProbability: 0.4,
          interventionalMean: 0.6,
          scenarioVariance: 0.04,
        },
        {
          scenarioId: "S2",
          stateAssignments: { active: false },
          transitionProbability: 0.4, // sums to 0.8, not 1.0
          interventionalMean: 0.45,
          scenarioVariance: 0.05,
        },
      ];

      expect(() => computeMarginalizedScenarioIntegration(invalidScenarios)).toThrow(
        "transition probabilities must sum to 1.0",
      );
    });

    it("accurately decomposes variance into intrinsic and horizon epistemic components", () => {
      // Scenario 1: Cornerback ACTIVE (P = 0.70, E[Y] = 0.58, Var = 0.02)
      // Scenario 2: Cornerback INACTIVE (P = 0.30, E[Y] = 0.68, Var = 0.02)
      const scenarios: BoundaryScenario[] = [
        {
          scenarioId: "CB_ACTIVE",
          stateAssignments: { "CB_Surtain": true },
          transitionProbability: 0.7,
          interventionalMean: 0.58,
          scenarioVariance: 0.02,
        },
        {
          scenarioId: "CB_INACTIVE",
          stateAssignments: { "CB_Surtain": false },
          transitionProbability: 0.3,
          interventionalMean: 0.68,
          scenarioVariance: 0.02,
        },
      ];

      const res = computeMarginalizedScenarioIntegration(scenarios);
      // E[E[Y]] = 0.7 * 0.58 + 0.3 * 0.68 = 0.406 + 0.204 = 0.61
      expect(res.marginalizedInterventionalProb).toBeCloseTo(0.61, 4);
      // Intrinsic Var = 0.7 * 0.02 + 0.3 * 0.02 = 0.02
      expect(res.intrinsicVariance).toBeCloseTo(0.02, 4);
      // Horizon Var = 0.7 * (0.58 - 0.61)^2 + 0.3 * (0.68 - 0.61)^2 = 0.7 * 0.0009 + 0.3 * 0.0049 = 0.00063 + 0.00147 = 0.0021
      expect(res.horizonEpistemicVariance).toBeCloseTo(0.0021, 4);
      expect(res.totalPredictiveVariance).toBeCloseTo(0.0221, 4);
      expect(res.dominantScenarioPassed).toBe(true);
    });
  });

  describe("Early-Week Lock vs. Watch Decision Rule", () => {
    it("locks immediately on Wednesday when dominant scenario invariance holds", () => {
      const scenarios: BoundaryScenario[] = [
        {
          scenarioId: "S_CLEAR",
          stateAssignments: { wind: 8 },
          transitionProbability: 0.8,
          interventionalMean: 0.62,
          scenarioVariance: 0.015,
        },
        {
          scenarioId: "S_BREEZE",
          stateAssignments: { wind: 14 },
          transitionProbability: 0.2,
          interventionalMean: 0.57,
          scenarioVariance: 0.018,
        },
      ];

      const decision = evaluateEarlyWeekLockRule({
        wednesdayVigFreeProb: 0.51,
        conformalLowerBound: 0.54, // 0.54 - 0.51 = +0.03 edge > 0.015
        scenarios,
        lineMoveSkillVector: [0.15, 0.70, 0.15],
      });

      expect(decision.action).toBe("LOCK_IMMEDIATELY_WEDNESDAY");
      expect(decision.reasoning).toContain("Dominant scenario invariance holds");
    });

    it("stages surveillance watch when horizon epistemic variance is elevated and edge is narrow", () => {
      const scenarios: BoundaryScenario[] = [
        {
          scenarioId: "S_STARTER_PLAYS",
          stateAssignments: { qb: "STARTER" },
          transitionProbability: 0.5,
          interventionalMean: 0.55,
          scenarioVariance: 0.02,
        },
        {
          scenarioId: "S_BACKUP_PLAYS",
          stateAssignments: { qb: "BACKUP" },
          transitionProbability: 0.5,
          interventionalMean: 0.42, // Drops below 0.50
          scenarioVariance: 0.03,
        },
      ];

      const decision = evaluateEarlyWeekLockRule({
        wednesdayVigFreeProb: 0.51,
        conformalLowerBound: 0.48, // Doesn't clear
        scenarios,
        lineMoveSkillVector: [0.33, 0.34, 0.33],
      });

      expect(decision.action).toBe("STAGE_SURVEILLANCE_WATCH");
      expect(decision.reasoning).toContain("Horizon epistemic variance");
    });
  });

  describe("Continuous Delta-Surveillance State Machine", () => {
    const baseEntry: EarlyWeekBoardEntry = {
      entry_id: "ENT-2026-07-TNF",
      game_id: "2026_07_SEA_DEN",
      market_type: "PLAYER_PROP",
      emitted_stage: "H2_WED_FULL_BOARD",
      emitted_at_utc: "2026-10-14T19:00:00Z",
      hours_before_kickoff: 28,
      locked_market_line: 42.5,
      locked_market_odds_american: -110,
      locked_vig_free_prob: 0.5238,
      model_true_prob_wednesday: 0.59,
      conformal_lower_bound: 0.54,
      intrinsic_sd: 0.14,
      horizon_epistemic_sd: 0.045,
      expected_clv_capture: 0.02,
      line_move_skill_vector: [0.2, 0.6, 0.2],
      watch_commitments: [
        {
          rule_id: "CC-2026-06-SEA-DEN-001",
          target_entry_id: "ENT-2026-07-TNF",
          watched_node: "P-SEA-DEN-015",
          trigger_condition: "STATUS_UPGRADED_QUESTIONABLE_TO_ACTIVE",
          delta_prob: 0.06,
          stake_adjustment: 0.015,
          deadline_utc: "2026-10-15T22:45:00Z",
          status: "PENDING",
        },
        {
          rule_id: "CC-2026-06-SEA-DEN-002",
          target_entry_id: "ENT-2026-07-TNF",
          watched_node: "PLAYER_CB_SURTAIN",
          trigger_condition: "DECLARED_INACTIVE",
          delta_prob: 0.05,
          stake_adjustment: 0.01,
          deadline_utc: "2026-10-15T22:45:00Z",
          status: "PENDING",
        },
      ],
      surveillance_status: "LOCKED_ACTIVE",
    };

    it("triggers conditional commitment when watched event fires at H3/H4", () => {
      const events: SurveillanceTriggerEvent[] = [
        {
          watchedNode: "P-SEA-DEN-015",
          eventType: "STATUS_UPGRADED_QUESTIONABLE_TO_ACTIVE",
          eventTimestampUtc: "2026-10-15T21:00:00Z",
        },
      ];

      const updated = evaluateSurveillanceDelta(baseEntry, events);

      expect(updated.surveillance_status).toBe("UPGRADED_ON_DELTA");
      // 0.59 + 0.06 = 0.65
      expect(updated.model_true_prob_wednesday).toBeCloseTo(0.65, 4);

      const triggeredRule = updated.watch_commitments.find((r) => r.rule_id === "CC-2026-06-SEA-DEN-001");
      expect(triggeredRule?.status).toBe("TRIGGERED");

      const untouchedRule = updated.watch_commitments.find((r) => r.rule_id === "CC-2026-06-SEA-DEN-002");
      expect(untouchedRule?.status).toBe("PENDING");
    });
  });

  describe("Decision-Time Price Archive Locking", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "gse-price-archive-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("locks Wednesday early-week price into disk archive without throwing", async () => {
      const entry: EarlyWeekBoardEntry = {
        entry_id: "E1",
        game_id: "2026_07_KC_LAC",
        market_type: "SPREAD",
        emitted_stage: "H2_WED_FULL_BOARD",
        emitted_at_utc: "2026-10-21T18:00:00Z",
        hours_before_kickoff: 92,
        locked_market_line: -3.5,
        locked_market_odds_american: -110,
        locked_vig_free_prob: 0.5238,
        model_true_prob_wednesday: 0.58,
        conformal_lower_bound: 0.54,
        intrinsic_sd: 0.12,
        horizon_epistemic_sd: 0.03,
        expected_clv_capture: 0.015,
        line_move_skill_vector: [0.1, 0.8, 0.1],
        watch_commitments: [],
        surveillance_status: "LOCKED_ACTIVE",
      };

      const locked = await lockEarlyWeekBoardPrice(entry, { baseDir: tempDir });
      expect(locked).toBe(true);
    });
  });
});
