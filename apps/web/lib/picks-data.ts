/**
 * Shared picks data-loading layer.
 *
 * Before this existed, /picks (page) and / (home) did a server-to-server
 * `fetch(/api/picks)` to load picks. That fetch does NOT forward the user's
 * session cookie — so the `auth()` call inside the API route returned null,
 * entitlements collapsed to FREE, and paying users only ever saw 1 pick.
 *
 * This module is the single source of truth for loading the public picks
 * list. Both server components and API routes call `loadPicks(...)` directly
 * with the already-resolved entitlements, so the auth context is preserved.
 */

import { db } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";
import type {
  PublicPick,
  PickResult,
  PickGrade,
  RiskLevel,
  FactorBreakdown,
  Entitlements,
} from "@sports/types";

export type LoadPicksOptions = {
  entitlements: Entitlements;
  /** Sport key filter (e.g. "nfl"). Max 32 chars, case-insensitive contains match. */
  sport: string | null;
  /** Target date in YYYY-MM-DD. If null, uses today (UTC midnight boundary). */
  date: string | null;
  /** Pick grade filter; only applied for PRO+ users. */
  grade: PickGrade | null;
  /** Optional hard limit. If unset, uses entitlements.dailyPickLimit ?? 200. */
  limit?: number | null;
};

export type LoadPicksResult = {
  picks: PublicPick[];
  /** Resolved target date in YYYY-MM-DD form (echo of `date` or today). */
  date: string;
};

const VALID_PICK_GRADES: ReadonlySet<PickGrade> = new Set([
  "ELITE_PLAY",
  "STRONG_PLAY",
  "SOLID_PLAY",
  "LEAN",
]);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a YYYY-MM-DD param. Returns a Date or a structured error.
 * Throws on programmer misuse; the caller should wrap as needed.
 */
export function parsePickDateParam(raw: string | null): Date | { error: string } {
  if (!raw) return new Date();
  if (!DATE_REGEX.test(raw)) {
    return { error: "Invalid date — expected YYYY-MM-DD" };
  }
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    return { error: "Invalid date — expected YYYY-MM-DD" };
  }
  return d;
}

export function validatePickGrade(raw: string | null): PickGrade | null | { error: string } {
  if (!raw) return null;
  if (!VALID_PICK_GRADES.has(raw as PickGrade)) {
    return {
      error:
        "Invalid grade — must be ELITE_PLAY | STRONG_PLAY | SOLID_PLAY | LEAN",
    };
  }
  return raw as PickGrade;
}

export async function loadPicks(opts: LoadPicksOptions): Promise<LoadPicksResult> {
  const { entitlements, sport, date, grade, limit } = opts;

  const parsed = parsePickDateParam(date);
  if (!(parsed instanceof Date)) {
    // Programmer bug if callers don't validate first — but fall back to today.
    return { picks: [], date: date ?? new Date().toISOString().split("T")[0]! };
  }
  const targetDate = parsed;

  const sportFilter = sport?.slice(0, 32) ?? null;

  const resolvedLimit =
    typeof limit === "number" && limit > 0
      ? Math.min(limit, 200)
      : entitlements.dailyPickLimit ?? 200;

  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false, // never expose bootstrap-era picks publicly
      generatedAt: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
      ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
      ...(grade && entitlements.canSeePremiumPicks ? { pickGrade: grade } : {}),
      ...(sportFilter
        ? {
            game: {
              sport: {
                key: { contains: sportFilter, mode: "insensitive" as const },
              },
            },
          }
        : {}),
    },
    include: {
      game: {
        include: {
          sport: { select: { name: true, key: true } },
        },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { confidence: "desc" },
      { generatedAt: "desc" },
    ],
    take: resolvedLimit,
  });

  const publicPicks: PublicPick[] = picks.map((pick) => {
    let factorBreakdown: FactorBreakdown | null = null;
    if (entitlements.canSeeFactorBreakdown && pick.factorBreakdown) {
      factorBreakdown = pick.factorBreakdown as unknown as FactorBreakdown;
    }

    let storedDqScore: number | null = null;
    if (pick.factorBreakdown) {
      const fb = pick.factorBreakdown as Record<string, unknown>;
      if (typeof fb["dataQualityScore"] === "number") {
        storedDqScore = fb["dataQualityScore"];
      }
    }
    const dataQualityScore = storedDqScore ?? Math.round(pick.game.dataQualityScore);

    return {
      id: pick.id,
      game: {
        homeTeam: pick.game.homeTeamName,
        awayTeam: pick.game.awayTeamName,
        commenceTime: pick.game.commenceTime.toISOString(),
        sport: pick.game.sport.name,
      },
      pickType: pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
      selection: pick.selection,
      line: pick.line,
      confidence: entitlements.canSeeConfidence ? pick.confidence : null,
      edgeScore: entitlements.canSeeEdgeScore ? pick.edgeScore : null,
      factorBreakdown,
      dataQualityScore,
      tier: pick.tier as "FREE" | "PREMIUM",
      pickGrade: (pick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (pick.riskLevel ?? "MODERATE") as RiskLevel,
      reasoning: entitlements.canSeeConfidence
        ? pick.reasoning
        : pick.reasoningShort || pick.reasoning.split(".")[0] + ".",
      reasoningShort: pick.reasoningShort,
      isFeatured: pick.isFeatured,
      generatedAt: pick.generatedAt.toISOString(),
      dataFreshnessAt: pick.dataFreshnessAt?.toISOString() ?? null,
      result: pick.result as PickResult,
    };
  });

  return {
    picks: publicPicks,
    date: targetDate.toISOString().split("T")[0]!,
  };
}
