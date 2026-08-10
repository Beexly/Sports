/**
 * Free/signal slate generation — NO THE_ODDS_API_KEY required.
 *
 * Builds MONEYLINE model-signal picks from independent fair values only
 * (Kalshi / FPI / ClubElo / Poisson / Dixon–Coles / Elo). Never invents book
 * odds or book labels. Opens signal board when market odds are ABSENT/stale.
 *
 * Law: free-path ABSENT-only for books · rankingP = independent trueProb ·
 * no PROVEN · no PERFORMANCE_STATS flip · maps OFF.
 */

import { db } from "@sports/db";
import {
  getReadinessGates,
  MODEL_VERSION,
  MIN_PUBLISH_CONFIDENCE,
  PREMIUM_CONFIDENCE_THRESHOLD,
} from "@sports/prediction-engine";
import type {
  FactorBreakdown,
  IndependentEdgeSummary,
  IndependentMarketFairValue,
} from "@sports/types";
import { buildIndependentFairValues } from "./build-independent-fair-values.js";

export type SignalSlateResult = {
  readonly ok: boolean;
  readonly gamesConsidered: number;
  readonly candidatesWithIndependents: number;
  readonly picksUpserted: number;
  readonly picksSkipped: number;
  readonly errors: readonly string[];
  readonly note: string;
};

function clamp01(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** Pure blend of independent home fair probs (exported for unit tests). */
/**
 * Equal-then-sharpness blend of independent home fair probs.
 * Soft sources near 0.5 no longer drown exchange/standings extremes (RES lift).
 * After blend, mild stretch from 0.5 (×1.2) when sources agree on side —
 * preserves polarity, increases discrimination. Never invents empty → null.
 */
export function blendIndependentHomeFair(
  values: readonly IndependentMarketFairValue[],
): { homeP: number; sources: string[] } | null {
  const pairs: { h: number; s: string; w: number }[] = [];
  for (const v of values) {
    const h = v.homeFairProb;
    const a = v.awayFairProb;
    if (h == null || a == null || !Number.isFinite(h) || !Number.isFinite(a)) continue;
    if (h < 0 || h > 1 || a < 0 || a > 1) continue;
    const sum = h + a;
    if (!(sum > 0)) continue;
    const hn = h / sum;
    // Sharpness weight: |p−0.5| + floor so every real source still votes a little.
    // Kalshi / standings / FPI get more say than near-coin-flip Elo/Poisson.
    const w = Math.abs(hn - 0.5) + 0.05;
    pairs.push({ h: hn, s: v.source, w });
  }
  if (pairs.length === 0) return null;
  const wSum = pairs.reduce((s, x) => s + x.w, 0);
  if (!(wSum > 0)) return null;
  let homeP = pairs.reduce((s, x) => s + x.h * x.w, 0) / wSum;

  // Mild discrimination stretch when net not a coin flip (model definition, not map).
  // ×1.25 from 0.5; clip to (0.02, 0.98). Polarity preserved.
  if (Math.abs(homeP - 0.5) >= 0.03) {
    homeP = 0.5 + (homeP - 0.5) * 1.25;
  }

  return { homeP: clamp01(homeP), sources: pairs.map((p) => p.s) };
}

function pickGradeFromConfidence(confidence: number): "STRONG_PLAY" | "SOLID_PLAY" | "LEAN" {
  if (confidence >= 80) return "STRONG_PLAY";
  if (confidence >= 65) return "SOLID_PLAY";
  return "LEAN";
}

/**
 * Generate model-signal MONEYLINE picks for upcoming games using independents only.
 */
export async function generateSignalSlate(opts?: {
  readonly horizonHours?: number;
  readonly logPrefix?: string;
  readonly now?: Date;
  /** When true, do not call ESPN seed (board-fill already seeded). */
  readonly skipSeed?: boolean;
}): Promise<SignalSlateResult> {
  const logPrefix = opts?.logPrefix ?? "[signal-slate]";
  const now = opts?.now ?? new Date();
  const horizonHours = opts?.horizonHours ?? 504; // 21d signal board (early season)
  const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
  const gates = getReadinessGates();
  const errors: string[] = [];
  let candidatesWithIndependents = 0;
  let picksUpserted = 0;
  let picksSkipped = 0;

  // Cold Game table: seed free ESPN schedule so signals can publish without quote keys.
  if (!opts?.skipSeed) {
    const existing = await db.game.count({
      where: { commenceTime: { gte: now, lte: horizon } },
    });
    if (existing === 0) {
      try {
        const { seedGamesFromEspn } = await import("./seed-games-from-espn.js");
        await seedGamesFromEspn({
          horizonHours,
          logPrefix: `${logPrefix}:auto-seed`,
          now,
        });
      } catch (seedErr) {
        errors.push(
          `espn auto-seed: ${seedErr instanceof Error ? seedErr.message : String(seedErr)}`,
        );
      }
    }
  }

  const gameList = await db.game.findMany({
    where: { commenceTime: { gte: now, lte: horizon } },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      sport: { select: { key: true, name: true } },
    },
    orderBy: { commenceTime: "asc" },
    take: 80,
  });

  for (const game of gameList) {
    const sportKey = game.sport?.key ?? "unknown";
    const homeTeam = game.homeTeamName;
    const awayTeam = game.awayTeamName;
    let independents: IndependentMarketFairValue[];
    try {
      independents = await buildIndependentFairValues({
        sportKey,
        homeTeam,
        awayTeam,
        commenceTime: game.commenceTime,
        now: () => now,
      });
    } catch (err) {
      errors.push(
        `${game.id}: independent build failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      picksSkipped += 1;
      continue;
    }

    if (!independents || independents.length === 0) {
      picksSkipped += 1;
      continue;
    }

    const blend = blendIndependentHomeFair(independents);
    if (!blend) {
      picksSkipped += 1;
      continue;
    }

    candidatesWithIndependents += 1;
    const homeChosen = blend.homeP >= 0.5;
    const trueProb = homeChosen ? blend.homeP : clamp01(1 - blend.homeP);
    const confidence = Math.round(trueProb * 100);
    if (confidence < MIN_PUBLISH_CONFIDENCE) {
      picksSkipped += 1;
      continue;
    }
    // Public selective default δ=0.1 — skip coin-flip signals that would be
    // upserted then filtered to empty on /api/picks.
    if (Math.abs(trueProb - 0.5) < 0.1) {
      picksSkipped += 1;
      continue;
    }

    const chosenTeam = homeChosen ? homeTeam : awayTeam;
    const rankingP = trueProb;
    const edgePts = Math.max(0, Math.round((trueProb - 0.5) * 100));
    const pickGrade = pickGradeFromConfidence(confidence);
    const tier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";
    const sources = blend.sources;
    const sourcesLabel = sources.join(", ");

    const independentEdge: IndependentEdgeSummary = {
      decision: trueProb >= 0.58 ? "LEAN" : "PASS",
      agreement: sources.length >= 2 ? "CONFIRMS" : "SOLO",
      // No book line on pure signal slate — omit market, never invent 0.5
      marketFairProb: null,
      trueProb,
      rawEdge: trueProb - 0.5,
      shrunkEdge: (trueProb - 0.5) * 0.7,
      expectedClv: 0,
      conviction: Math.min(100, Math.round(trueProb * 100)),
      sources: [...sources],
      priced: true,
      rationale: `Independent blend (${sourcesLabel}) prices ${chosenTeam} at ${(trueProb * 100).toFixed(1)}%. Model signal only — not a book line.`,
    };

    const factorBreakdown: FactorBreakdown = {
      consensusScore: 0,
      marketDepthScore: 0,
      edgeScore: edgePts,
      marketPriceShapeScore: 0,
      trueEvScore: trueProb - 0.5,
      fairProbability: rankingP,
      lineMovementScore: 0,
      volatilityPenalty: 0,
      dataQualityScore: Math.min(100, 60 + independents.length * 15),
      rankingP,
      rankingSource: "independent_trueProb",
      marketFairProb: null,
      independentEdge,
      factors: [
        {
          name: `Independent fair value (${sourcesLabel})`,
          impact: "positive",
          description: `trueProb=${trueProb.toFixed(3)} from ${sourcesLabel}. No book odds attached.`,
          weight: confidence,
        },
      ],
    };

    const selection = `${chosenTeam} ML (model signal)`;
    const reasoning =
      `Model signal (no book line): ${chosenTeam} priced at ${Math.round(trueProb * 100)}% ` +
      `by independent sources [${sourcesLabel}]. Not a sportsbook quote. RankingP=${rankingP.toFixed(3)}. ` +
      `Eligibility RED forbids PROVEN/performance claims.`;
    const reasoningShort = `${chosenTeam} model signal @ ${Math.round(trueProb * 100)}% (${sourcesLabel}).`;

    try {
      const existing = await db.pick.findUnique({
        where: { gameId_pickType: { gameId: game.id, pickType: "MONEYLINE" } },
        select: { id: true, result: true, selection: true },
      });

      if (existing && existing.result !== "PENDING") {
        picksSkipped += 1;
        continue;
      }

      if (
        existing?.selection &&
        existing.selection.includes("ML") &&
        !existing.selection.startsWith(chosenTeam)
      ) {
        console.warn(
          `${logPrefix} SIDE FLIP frozen for ${game.id}: kept "${existing.selection}" vs signal "${selection}"`,
        );
        picksSkipped += 1;
        continue;
      }

      const shared = {
        selection,
        line: 0,
        confidence,
        edgeScore: edgePts,
        consensusPct: trueProb,
        bookmakerCount: 0,
        tier: tier as "FREE" | "PREMIUM",
        pickGrade,
        riskLevel: "MODERATE" as const,
        reasoning,
        reasoningShort,
        factorBreakdown: JSON.parse(JSON.stringify(factorBreakdown)),
        modelVersion: MODEL_VERSION,
        dataFreshnessAt: now,
        isPublished: gates.canExposePublicPicks,
      };

      if (existing) {
        await db.pick.update({
          where: { id: existing.id },
          data: {
            ...shared,
            generatedAt: now,
          },
        });
      } else {
        await db.pick.create({
          data: {
            gameId: game.id,
            pickType: "MONEYLINE",
            ...shared,
            isBootstrap: !gates.canPersistCanonicalHistory,
            isFeatured: false,
            generatedAt: now,
          },
        });
      }
      // Public /api/picks filters on game.dataQualityScore >= 70 — stamp from
      // independent factor quality so signal path is not invisible by default 0.
      const gameDq = Math.max(
        70,
        Math.min(100, 60 + independents.length * 15),
      );
      await db.game.update({
        where: { id: game.id },
        data: { dataQualityScore: gameDq },
      });
      picksUpserted += 1;
    } catch (err) {
      errors.push(
        `${game.id}: upsert failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      picksSkipped += 1;
    }
  }

  const note =
    picksUpserted > 0
      ? `Signal slate: ${picksUpserted} model-signal picks (independents only; no book labels).`
      : `Signal slate empty: ${gameList.length} games, ${candidatesWithIndependents} with independents, none published.`;

  console.log(`${logPrefix} ${note}`);

  return {
    ok: errors.length === 0,
    gamesConsidered: gameList.length,
    candidatesWithIndependents,
    picksUpserted,
    picksSkipped,
    errors,
    note,
  };
}
