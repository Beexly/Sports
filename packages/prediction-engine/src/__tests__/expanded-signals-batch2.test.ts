import { describe, it, expect } from "vitest";
import { evaluateLinearWindPassImpact } from "../signals/environmental/linear-wind-pass-impact";
import { evaluateLopezSecondAndTenTendency } from "../signals/situational/lopez-second-and-ten-tendency";
import { evaluateNegativeBinomialRedzoneTd } from "../signals/props/negative-binomial-redzone-td";
import { evaluateQbReceiverContinuity } from "../signals/chemistry/qb-receiver-continuity";
import { evaluateManZoneReceiverArchetype } from "../signals/efficiency/man-zone-receiver-archetype";
import { evaluateAgeConditionedRest } from "../signals/situational/age-conditioned-rest";

describe("Expanded Elite Research Signals Batch 2", () => {
  describe("Linear Wind Pass Impact (GROK-1 Linear Rule)", () => {
    it("returns zero decay for enclosed dome stadiums", () => {
      const res = evaluateLinearWindPassImpact({
        windSpeedMph: 24,
        isEnclosedOrDome: true,
        baselinePassingYards: 250,
      });
      expect(res.windCategory).toBe("CALM");
      expect(res.passingYardageAdjustment).toBe(0);
      expect(res.projectedPassingYards).toBe(250);
    });

    it("evaluates -3.007 yds/mph linear drop above 7.5 mph threshold", () => {
      const res = evaluateLinearWindPassImpact({
        windSpeedMph: 15,
        isEnclosedOrDome: false,
        baselinePassingYards: 240,
      });
      expect(res.windCategory).toBe("HEAVY_WIND");
      expect(res.effectiveWindDecayMph).toBe(7.5);
      // 7.5 * -3.007 = -22.55 -> -22.6
      expect(res.passingYardageAdjustment).toBe(-22.6);
      expect(res.projectedPassingYards).toBe(217.4);
      expect(res.deepPassRateCompression).toBeLessThan(1.0);
    });
  });

  describe("Lopez 2nd-and-10 Play-Calling Elasticity (GROK-1 Rule)", () => {
    it("matches empirical +10.36 pp pass probability split after 1st down pass vs run", () => {
      const afterPass = evaluateLopezSecondAndTenTendency({
        priorFirstDownPlayType: "PASS",
        scoreDifferential: 0,
        quarter: 1,
        timeRemainingSeconds: 850,
      });
      const afterRun = evaluateLopezSecondAndTenTendency({
        priorFirstDownPlayType: "RUSH",
        scoreDifferential: 0,
        quarter: 1,
        timeRemainingSeconds: 850,
      });

      expect(afterPass.expectedPassProbability).toBe(0.3773);
      expect(afterRun.expectedPassProbability).toBe(0.2737);
      const gap = afterPass.expectedPassProbability - afterRun.expectedPassProbability;
      expect(Number(gap.toFixed(4))).toBe(0.1036);
    });
  });

  describe("Negative Binomial Red Zone Touchdowns (GROK-1 Overdispersion Rule)", () => {
    it("computes overdispersed NB touchdown probabilities where Poisson overprices anytime TD", () => {
      const res = evaluateNegativeBinomialRedzoneTd({
        playerName: "Travis Kelce",
        position: "TE",
        expectedTouchdownsMean: 0.55,
        targetType: "RECEIVING_TD",
      });

      expect(res.varianceToMeanRatio).toBe(1.82);
      expect(res.variance).toBeGreaterThan(res.mean);
      // Because of overdispersion, anytime TD prob is LOWER than naive Poisson (edgeOverPoisson is negative)
      expect(res.edgeOverPoissonAnytimeTd).toBeLessThan(0);
      expect(res.anytimeTdProbability).toBeLessThan(res.naivePoissonAnytimeTdProbability);
      // Multi-TD tail is preserved
      expect(res.twoPlusTdsProbability).toBeGreaterThan(0.04);
      expect(res.fairAmericanOddsAnytimeTd).toBeDefined();
    });
  });

  describe("QB-Receiver Continuity (Factor A17)", () => {
    it("identifies novel chemistry deficit vs telepathic veteran synchrony", () => {
      const novel = evaluateQbReceiverContinuity({
        qbName: "Rookie QB",
        receiverName: "New WR",
        position: "WR1",
        regularSeasonGamesPlayedTogether: 2,
        targetShareBaseline: 0.22,
        offensiveSchemeTenureSeasonsWithCoordinator: 0,
      });
      const telepathic = evaluateQbReceiverContinuity({
        qbName: "Patrick Mahomes",
        receiverName: "Travis Kelce",
        position: "TE",
        regularSeasonGamesPlayedTogether: 65,
        targetShareBaseline: 0.22,
        offensiveSchemeTenureSeasonsWithCoordinator: 5,
      });

      expect(novel.continuityTier).toBe("NOVEL");
      expect(novel.epaPerTargetBonus).toBeLessThan(0);
      expect(novel.trustIndex).toBeLessThan(1.0);

      expect(telepathic.continuityTier).toBe("TELEPATHIC");
      expect(telepathic.epaPerTargetBonus).toBeGreaterThan(0.05);
      expect(telepathic.highLeverageTargetConcentrationMultiplier).toBeGreaterThan(1.2);
    });
  });

  describe("Man/Zone Receiver Archetype Interaction (Factor A26)", () => {
    it("awards SMASH_SPOT to elite separator vs heavy man coverage", () => {
      const smash = evaluateManZoneReceiverArchetype({
        opponentManCoverageRate: 0.42,
        opponentTwoHighShellRate: 0.45,
        receiverArchetype: "ELITE_SEPARATOR",
        baselineTargetShare: 0.25,
        baselineAdot: 10.5,
      });
      expect(smash.matchupAdvantageTier).toBe("SMASH_SPOT");
      expect(smash.targetShareMultiplier).toBe(1.22);
      expect(smash.adjustedTargetShare).toBe(0.305);
    });

    it("suppresses deep burner facing high two-high shell rates", () => {
      const capped = evaluateManZoneReceiverArchetype({
        opponentManCoverageRate: 0.20,
        opponentTwoHighShellRate: 0.65,
        receiverArchetype: "DEEP_BURNER",
        baselineTargetShare: 0.18,
        baselineAdot: 15.0,
      });
      expect(capped.matchupAdvantageTier).toBe("SHUTDOWN_RISK");
      expect(capped.targetShareMultiplier).toBe(0.84);
      expect(capped.adjustedAdot).toBeLessThan(15.0);
    });
  });

  describe("Age-Conditioned Rest Days (Factor A24)", () => {
    it("rewards veteran rosters off full bye and penalizes them on TNF short rest", () => {
      const veteranBye = evaluateAgeConditionedRest({
        teamName: "Veteran Contender",
        daysOfRest: 14,
        snapWeightedRosterAge: 28.4,
        startingQbAge: 36,
        offensiveLineAvgAge: 29.5,
      });
      const veteranTnf = evaluateAgeConditionedRest({
        teamName: "Veteran Contender",
        daysOfRest: 4,
        snapWeightedRosterAge: 28.4,
        startingQbAge: 36,
        offensiveLineAvgAge: 29.5,
      });

      expect(veteranBye.expectedMarginAdjustment).toBeGreaterThan(2.5); // 2.45 + 0.45 OL bonus
      expect(veteranBye.injuryRiskMultiplier).toBeLessThan(0.8);

      expect(veteranTnf.expectedMarginAdjustment).toBeLessThan(-2.5);
      expect(veteranTnf.fourthQuarterFatigueFactor).toBeGreaterThan(1.25);
    });
  });
});
