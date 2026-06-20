import { describe, it, expect } from "vitest";
import { BASE_RATING, updateRating, ratingTier, ratingTierProgress, expectedScore } from "../rating.js";
import { scoreDuelEntry, resolveDuel } from "../duel.js";
import { evaluateSignalCheck } from "../signal-check.js";
import { seasonProgress, claimableTiers, seasonPointsForXp, SEASON_TIERS } from "../season.js";
import { BOSSES, getBoss, evaluateBossEncounter } from "../bosses.js";
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

  it("clears a boss by resisting the bias, unlocking its merch", () => {
    const boss = getBoss("overconfidence_king")!;
    const r = evaluateBossEncounter(
      "overconfidence_king",
      boss.scenarios.map((s) => ({ scenarioId: s.id, chosen: "VALUE" as const, confidence: 70 })),
    );
    expect(r.cleared).toBe(true);
    expect(r.merchUnlockSku).toBe("calibrated-cap");
    expect(r.totalCredits).toBeGreaterThan(0);
  });

  it("does not clear when caught by the bias", () => {
    const boss = getBoss("recency_chaser")!;
    const r = evaluateBossEncounter(
      "recency_chaser",
      boss.scenarios.map((s) => ({ scenarioId: s.id, chosen: "TRAP" as const, confidence: 80 })),
    );
    expect(r.cleared).toBe(false);
    expect(r.merchUnlockSku).toBeNull();
  });

  it("every boss merch SKU is unique", () => {
    const skus = BOSSES.map((b) => b.merchSku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});
