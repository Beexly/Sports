/**
 * EINSTEIN LAYER — Book DNA Genome 2.0 (Invention 17).
 *
 * Bookmaker DNA fingerprints lead/lag. The genome deepens it: a book is not "sharp" or "soft" —
 * it is an organism whose traits vary by MARKET FAMILY, SHOCK TYPE, TIME-TO-EVENT, LIQUIDITY
 * CONDITION, and SEASON PHASE. A book can be sharp on NFL sides, slow on derivative props,
 * overreactive on public injuries, and copycat-dependent on thin markets. The output is a
 * Book Lag Map by context — because edge is contextual; a stale book is not stale everywhere.
 *
 * Pure + deterministic; built from per-context lead/lag profiles (no hard-coded opinions).
 */

import type { BookLeadLagProfile } from "../market-physics/book-dna.js";

export type TimeToEventBucket = "early_week" | "two_day" | "gameday" | "pre_close";
export type LiquidityCondition = "thin" | "normal" | "deep";
export type SeasonPhase = "early" | "mid" | "late" | "playoffs";

export interface BookContextProfile {
  readonly marketFamily: string;
  readonly shockType?: string;
  readonly timeToEvent: TimeToEventBucket;
  readonly liquidity: LiquidityCondition;
  readonly seasonPhase: SeasonPhase;
  readonly profile: BookLeadLagProfile;
}

export interface BookGenomeTraits {
  readonly refreshLatencyMin: number;
  readonly propSensitivity: number; // 0..1: how responsive on props vs sides
  readonly altLadderSmoothness: number; // placeholder externally supplied
  readonly favoriteLongshotBias: number; // externally supplied
  readonly injuryAbsorptionSpeedMin: number;
  readonly publicTeamShading: number; // externally supplied
  readonly copycatDependency: number; // 0..1: follower rate on thin markets
  readonly correctionHalfLifeMin: number; // externally supplied
  readonly overshootTendency: number; // externally supplied
  readonly underreactionTendency: number; // derived from follow lag
}

export interface BookGenomeFingerprint {
  readonly book: string;
  readonly traits: BookGenomeTraits;
  /** family → shockType → { medianLagMin, missRate } */
  readonly lagMap: Readonly<Record<string, Readonly<Record<string, { medianLagMin: number; missRate: number }>>>>;
  readonly contextsObserved: number;
}

const toMin = (msVal: number) => Math.round((msVal / 60_000) * 100) / 100;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : 0);

/**
 * Assemble a book's genome from its per-context lead/lag profiles. Externally-measured traits
 * (alt smoothness, favorite-longshot, public shading, correction half-life, overshoot) are passed
 * through `external`; everything else is inferred from the profiles.
 */
export function buildBookGenome(
  book: string,
  contexts: readonly BookContextProfile[],
  external: Partial<Pick<BookGenomeTraits, "altLadderSmoothness" | "favoriteLongshotBias" | "publicTeamShading" | "correctionHalfLifeMin" | "overshootTendency">> = {},
): BookGenomeFingerprint {
  const mine = contexts.filter((c) => c.profile.book === book);
  const lagMap: Record<string, Record<string, { medianLagMin: number; missRate: number }>> = {};
  for (const c of mine) {
    const fam = (lagMap[c.marketFamily] ??= {});
    fam[c.shockType ?? "none"] = { medianLagMin: toMin(c.profile.medianLagMs), missRate: c.profile.missRate };
  }
  const sideCtx = mine.filter((c) => /spread|total|moneyline/.test(c.marketFamily));
  const propCtx = mine.filter((c) => /player_|prop|reception|rush_yds|pass_yds/.test(c.marketFamily));
  const injuryCtx = mine.filter((c) => c.shockType === "injury" || c.shockType === "inactive");
  const thinCtx = mine.filter((c) => c.liquidity === "thin");

  const sideLag = median(sideCtx.map((c) => c.profile.medianLagMs));
  const propLag = median(propCtx.map((c) => c.profile.medianLagMs));
  const traits: BookGenomeTraits = {
    refreshLatencyMin: toMin(median(mine.map((c) => c.profile.medianLagMs))),
    propSensitivity: Math.max(0, Math.min(1, 1 - (propLag - sideLag) / (5 * 60_000))),
    altLadderSmoothness: external.altLadderSmoothness ?? 0,
    favoriteLongshotBias: external.favoriteLongshotBias ?? 0,
    injuryAbsorptionSpeedMin: toMin(median(injuryCtx.map((c) => c.profile.medianLagMs))),
    publicTeamShading: external.publicTeamShading ?? 0,
    copycatDependency: thinCtx.length ? median(thinCtx.map((c) => c.profile.followFreq)) : 0,
    correctionHalfLifeMin: external.correctionHalfLifeMin ?? 0,
    overshootTendency: external.overshootTendency ?? 0,
    underreactionTendency: Math.min(1, toMin(propLag) / 10),
  };
  return { book, traits, lagMap, contextsObserved: mine.length };
}
