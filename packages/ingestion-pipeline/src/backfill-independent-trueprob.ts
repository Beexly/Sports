/**
 * Retrospective independent trueProb enrichment for settled picks.
 *
 * LAW:
 * - Never rewrite selection, line, result, settledAt, confidence, or grade.
 * - Only merge independentEdge.trueProb (+ sources/priced) into factorBreakdown
 *   so proven-path bake-off / ranking power can see pIndependent.
 * - Never invent probabilities: empty independents → skip (honest no-opinion).
 * - trueProb is for the **published selection side** at game time (retrospective).
 * - Does not flip PERFORMANCE_STATS / PROVEN / publish policy.
 */

import { db } from "@sports/db";
import { pickSelectionSide } from "./process-sport.js";
import {
  buildIndependentFairValues,
  type EloRatingsCache,
} from "./build-independent-fair-values.js";
import { blendIndependentHomeFair } from "./generate-signal-slate.js";
type FactorBreakdownLike = {
  readonly rankingP?: number | null;
  readonly rankingSource?: string | null;
  readonly fairProbability?: number | null;
  readonly marketFairProb?: number | null;
  readonly independentEdge?: {
    readonly trueProb?: number | null;
    readonly priced?: boolean | null;
    readonly marketFairProb?: number | null;
  } | null;
};

function hasIndependentTrueProb(fb: unknown): boolean {
  if (!fb || typeof fb !== "object") return false;
  const o = fb as FactorBreakdownLike;
  const t = o.independentEdge?.trueProb;
  if (typeof t === "number" && Number.isFinite(t) && t > 0 && t < 1) return true;
  if (o.rankingSource === "independent_trueProb") {
    const r = o.rankingP;
    if (typeof r === "number" && Number.isFinite(r) && r > 0 && r < 1) return true;
  }
  return false;
}

function clamp01(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

function teamMatches(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // last token (nickname) match — "Kansas City Chiefs" vs "Chiefs"
  const ta = na.split(/\s+/).pop() ?? na;
  const tb = nb.split(/\s+/).pop() ?? nb;
  return ta.length >= 3 && ta === tb;
}

export type BackfillIndependentResult = {
  readonly ok: boolean;
  readonly scanned: number;
  readonly alreadyPriced: number;
  readonly updated: number;
  readonly skippedNoOpinion: number;
  readonly skippedNonMl: number;
  readonly errors: readonly string[];
  readonly note: string;
};

export async function backfillIndependentTrueProb(opts?: {
  readonly limit?: number;
  readonly logPrefix?: string;
  readonly dryRun?: boolean;
  /** When true, skip network independents (Kalshi/FPI) — tests / offline. */
  readonly skipNetworkIndependents?: boolean;
}): Promise<BackfillIndependentResult> {
  const logPrefix = opts?.logPrefix ?? "[backfill-indep]";
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 80));
  const dryRun = opts?.dryRun === true;
  const errors: string[] = [];
  let scanned = 0;
  let alreadyPriced = 0;
  let updated = 0;
  let skippedNoOpinion = 0;
  let skippedNonMl = 0;
  const eloCache: EloRatingsCache = new Map();

  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS"] },
      NOT: { modelVersion: "v5.0.0-seed" },
    },
    select: {
      id: true,
      selection: true,
      pickType: true,
      factorBreakdown: true,
      game: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          sport: { select: { key: true } },
        },
      },
    },
    orderBy: { settledAt: "desc" },
    take: limit * 3, // oversample; many may already be priced
  });

  for (const pick of picks) {
    if (scanned >= limit) break;
    scanned += 1;

    if (!pick.game) {
      skippedNoOpinion += 1;
      continue;
    }
    if (hasIndependentTrueProb(pick.factorBreakdown)) {
      alreadyPriced += 1;
      continue;
    }

    const pickType = (pick.pickType ?? "MONEYLINE").toUpperCase();
    // Independent fair values are 2-way win probs (ML-style).
    // MONEYLINE + SPREAD: map published team side → trueProb for that team.
    // TOTAL: no honest independent cover model here → skip (not invent).
    if (pickType === "TOTAL") {
      skippedNonMl += 1;
      continue;
    }
    if (pickType !== "MONEYLINE" && pickType !== "SPREAD") {
      skippedNonMl += 1;
      continue;
    }

    const home = pick.game.homeTeamName;
    const away = pick.game.awayTeamName;
    const sportKey = pick.game.sport?.key ?? "unknown";
    const side = pickSelectionSide(pickType === "SPREAD" ? "SPREAD" : "MONEYLINE", pick.selection);
    const homeChosen = teamMatches(side, home);
    const awayChosen = teamMatches(side, away);
    if (!homeChosen && !awayChosen) {
      errors.push(`${pick.id}: cannot map selection "${side}" to ${home}/${away}`);
      skippedNoOpinion += 1;
      continue;
    }

    let independents;
    try {
      independents = await buildIndependentFairValues(
        {
          sportKey,
          homeTeam: home,
          awayTeam: away,
          commenceTime: pick.game.commenceTime,
          skipNetworkIndependents: opts?.skipNetworkIndependents,
        },
        eloCache,
      );
    } catch (err) {
      errors.push(
        `${pick.id}: independent build failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      skippedNoOpinion += 1;
      continue;
    }

    if (!independents || independents.length === 0) {
      skippedNoOpinion += 1;
      continue;
    }

    const blend = blendIndependentHomeFair(independents);
    if (!blend) {
      skippedNoOpinion += 1;
      continue;
    }

    const trueProb = homeChosen ? blend.homeP : clamp01(1 - blend.homeP);
    if (!(trueProb > 0 && trueProb < 1)) {
      skippedNoOpinion += 1;
      continue;
    }

    const prev =
      pick.factorBreakdown && typeof pick.factorBreakdown === "object"
        ? ({ ...(pick.factorBreakdown as Record<string, unknown>) } as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const prevEdge =
      prev["independentEdge"] && typeof prev["independentEdge"] === "object"
        ? ({ ...(prev["independentEdge"] as Record<string, unknown>) } as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const marketFair =
      typeof prevEdge["marketFairProb"] === "number" && Number.isFinite(prevEdge["marketFairProb"])
        ? (prevEdge["marketFairProb"] as number)
        : typeof prev["marketFairProb"] === "number" && Number.isFinite(prev["marketFairProb"])
          ? (prev["marketFairProb"] as number)
          : 0.5;

    const rawEdge = trueProb - marketFair;
    const sources = blend.sources;
    const independentEdge = {
      ...prevEdge,
      decision: trueProb >= 0.58 ? "LEAN" : "PASS",
      agreement: sources.length >= 2 ? "CONFIRMS" : "SOLO",
      marketFairProb: marketFair,
      trueProb,
      rawEdge,
      shrunkEdge: rawEdge * 0.7,
      expectedClv: typeof prevEdge["expectedClv"] === "number" ? prevEdge["expectedClv"] : 0,
      conviction: Math.min(100, Math.round(trueProb * 100)),
      sources,
      priced: true,
      rationale:
        `Retrospective independent blend (${sources.join(", ")}) prices published team side ` +
        `"${side}" at ${(trueProb * 100).toFixed(1)}% team-win trueProb` +
        (pickType === "SPREAD"
          ? " (not ATS cover p — ranking/discrimination feature only)."
          : ".") +
        ` Calibration enrichment only — does not rewrite published confidence/selection/result.`,
    };

    const next = {
      ...prev,
      independentEdge,
      // Do not overwrite historical rankingSource if already independent; otherwise
      // leave rankingP as published (confidence echo) for audit. pIndependent loads
      // from independentEdge.trueProb alone.
      fairProbability:
        typeof prev["fairProbability"] === "number" ? prev["fairProbability"] : trueProb,
    };

    if (!dryRun) {
      try {
        await db.pick.update({
          where: { id: pick.id },
          data: {
            factorBreakdown: JSON.parse(JSON.stringify(next)),
          },
        });
      } catch (err) {
        errors.push(
          `${pick.id}: update failed — ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
    }
    updated += 1;
  }

  const note =
    `scanned=${scanned} alreadyPriced=${alreadyPriced} updated=${updated} ` +
    `noOpinion=${skippedNoOpinion} nonMl=${skippedNonMl} dryRun=${dryRun}`;
  console.log(`${logPrefix} ${note}`);
  return {
    ok: true,
    scanned,
    alreadyPriced,
    updated,
    skippedNoOpinion,
    skippedNonMl,
    errors: errors.slice(0, 20),
    note,
  };
}
