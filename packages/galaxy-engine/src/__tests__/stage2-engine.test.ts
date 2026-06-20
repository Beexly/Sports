import { describe, it, expect } from "vitest";
import { BASE_RATING, updateRating, ratingTier, ratingTierProgress, expectedScore } from "../rating.js";
import { scoreDuelEntry, resolveDuel } from "../duel.js";
import { evaluateSignalCheck } from "../signal-check.js";
import { seasonProgress, claimableTiers, seasonPointsForXp, SEASON_TIERS } from "../season.js";
import { BOSSES, getBoss, evaluateBossEncounter, buildBossAssetBrief } from "../bosses.js";
import { computeGalaxyScore, galaxyScoreTier, GALAXY_SCORE_MAX, type GalaxyScoreInput } from "../galaxy-score.js";
import { isBrandSafe } from "../language-law.js";

describe("Ranked rating (Stage 2)", () => {
  it("expected score is symmetric around equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it("a win raises rating, a loss lowers it", () => {
    const won = updateRating(BASE_RATING, BASE_RATING, 1);
    const lost = updateRating(BASE_RATING, BASE_RATING, 0);
    expect(won).toBeGreaterThan(BASE_RATING);
    expect(lost).toBeLessThan(BASE_RATING);
  });

  it("beating a higher-rated opponent gains more than beating a lower one", () => {
    const vsStronger = updateRating(1200, 1500, 1) - 1200;
    const vsWeaker = updateRating(1200, 900, 1) - 1200;
    expect(vsStronger).toBeGreaterThan(vsWeaker);
  });

  it("tiers are skill-ordered and progress is bounded", () => {
    expect(ratingTier(1000).id).toBe("rookie");
    expect(ratingTier(1750).id).toBe("legend");
    const p = ratingTierProgress(1200);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(1);
  });
});

describe("Signal Duel (Stage 2)", () => {
  it("a calibrated win beats a lucky low-confidence win on duel score", () => {
    const sharp = evaluateSignalCheck("DUEL", "WIN", 85);
    const timid = evaluateSignalCheck("DUEL", "WIN", 52);
    expect(scoreDuelEntry(sharp).points).toBeGreaterThan(scoreDuelEntry(timid).points);
  });

  it("resolves a clear winner", () => {
    const winner = evaluateSignalCheck("DUEL", "WIN", 80);
    const loser = evaluateSignalCheck("DUEL", "LOSS", 80);
    const r = resolveDuel(winner, loser);
    expect(r.winner).toBe("CREATOR");
    expect(r.margin).toBeGreaterThan(0);
  });

  it("the better-calibrated read wins when both lose (humble doubt beats bravado)", () => {
    const humble = evaluateSignalCheck("DUEL", "LOSS", 51);
    const overconfident = evaluateSignalCheck("DUEL", "LOSS", 95);
    const r = resolveDuel(humble, overconfident);
    expect(r.winner).toBe("CREATOR");
  });

  it("identical reads draw", () => {
    const a = evaluateSignalCheck("DUEL", "WIN", 70);
    const b = evaluateSignalCheck("DUEL", "WIN", 70);
    const r = resolveDuel(a, b);
    expect(r.winner).toBe("TIE");
    expect(r.rationale.toLowerCase()).toContain("draw");
  });
});

describe("Season Program (Stage 2)", () => {
  it("caps season points per check", () => {
    expect(seasonPointsForXp(9999)).toBe(150);
    expect(seasonPointsForXp(20)).toBe(20);
  });

  it("advances tiers with cumulative points", () => {
    expect(seasonProgress(0).tier.tier).toBe(1);
    const top = SEASON_TIERS[SEASON_TIERS.length - 1]!;
    expect(seasonProgress(top.pointsRequired).tier.tier).toBe(top.tier);
  });

  it("claimable tiers exclude already-claimed", () => {
    const points = SEASON_TIERS[2]!.pointsRequired;
    const claimable = claimableTiers(points, 1);
    expect(claimable.every((t) => t.tier > 1)).toBe(true);
    expect(claimableTiers(points, 99)).toEqual([]);
  });
});

describe("The Depths — 5 bosses (Stage 2)", () => {
  it("ships exactly five bad-logic bosses, all brand-safe", () => {
    expect(BOSSES.length).toBe(5);
    for (const b of BOSSES) {
      expect(b.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(isBrandSafe(`${b.name} ${b.blurb} ${b.bias}`)).toBe(true);
      for (const s of b.scenarios) {
        expect(isBrandSafe(`${s.matchup} ${s.trapLabel} ${s.valueLabel} ${s.lesson}`)).toBe(true);
        expect(s.biasPct).toBeGreaterThan(0.5);
      }
    }
  });

  it("ships the canon five bosses", () => {
    expect(BOSSES.map((b) => b.key).sort()).toEqual(
      ["injury_fog", "line_move_mimic", "parlay_hydra", "public_trap", "recency_wraith"].sort(),
    );
  });

  it("clears a boss by resisting the bias, unlocking its merch + clear bonus", () => {
    const boss = getBoss("injury_fog")!;
    const r = evaluateBossEncounter(
      "injury_fog",
      boss.scenarios.map((s) => ({ scenarioId: s.id, chosen: "VALUE" as const, confidence: 70 })),
    );
    expect(r.cleared).toBe(true);
    expect(r.merchUnlockSku).toBe("replacement-value-tee");
    expect(r.clearBonusCredits).toBeGreaterThan(0);
    expect(r.totalCredits).toBeGreaterThan(r.clearBonusCredits); // steps + bonus
    expect(r.gsePrompt.length).toBeGreaterThan(0);
  });

  it("does not clear (no bonus, no merch) when caught by the bias", () => {
    const boss = getBoss("recency_wraith")!;
    const r = evaluateBossEncounter(
      "recency_wraith",
      boss.scenarios.map((s) => ({ scenarioId: s.id, chosen: "TRAP" as const, confidence: 80 })),
    );
    expect(r.cleared).toBe(false);
    expect(r.merchUnlockSku).toBeNull();
    expect(r.clearBonusCredits).toBe(0);
  });

  it("every boss has a compliant asset brief, lesson, and tie-ins", () => {
    for (const b of BOSSES) {
      expect(b.lesson.length).toBeGreaterThan(0);
      expect(b.gsePrompt.length).toBeGreaterThan(0);
      expect(b.cardTieInSlug.length).toBeGreaterThan(0);
      const brief = buildBossAssetBrief(b.key);
      expect(brief.prompt).toContain("no casino");
      expect(brief.generated).toBe(false);
    }
  });

  it("every boss merch SKU is unique", () => {
    const skus = BOSSES.map((b) => b.merchSku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});

describe("Galaxy Score (bible §3)", () => {
  const strong: GalaxyScoreInput = {
    avgSkillLevel: 40,
    avgCalibration: 78,
    rating: 1500,
    bossClears: 4,
    crewContribution: 70,
    factionRank: 2,
    cardCount: 8,
    gradedChecks: 50,
    merchCount: 2,
    seasonTier: 4,
  };

  it("scores 0 for a brand-new profile", () => {
    const fresh: GalaxyScoreInput = {
      avgSkillLevel: 1,
      avgCalibration: null,
      rating: 900,
      bossClears: 0,
      crewContribution: 0,
      factionRank: null,
      cardCount: 0,
      gradedChecks: 0,
      merchCount: 0,
      seasonTier: 1,
    };
    const s = computeGalaxyScore(fresh);
    // Only the season-tier-1 floor contributes a little; total stays low.
    expect(s.total).toBeLessThan(50);
    expect(s.tier).toBe("Rookie");
  });

  it("rewards a well-rounded, calibrated player and breaks down transparently", () => {
    const s = computeGalaxyScore(strong);
    expect(s.total).toBeGreaterThan(400);
    expect(s.max).toBe(GALAXY_SCORE_MAX);
    expect(s.components.reduce((sum, c) => sum + c.points, 0)).toBe(s.total);
    expect(s.components.every((c) => c.points <= c.max)).toBe(true);
  });

  it("calibration outweighs reckless volume", () => {
    const calibrated = computeGalaxyScore({ ...strong, avgCalibration: 90, gradedChecks: 10 });
    const grinder = computeGalaxyScore({ ...strong, avgCalibration: 40, gradedChecks: 500 });
    expect(calibrated.total).toBeGreaterThan(grinder.total);
  });

  it("tiers ascend with score", () => {
    expect(galaxyScoreTier(0)).toBe("Rookie");
    expect(galaxyScoreTier(900)).toBe("Authority");
  });
});
