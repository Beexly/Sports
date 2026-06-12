/**
 * Matchup difficulty engine — Fantasy Points Allowed (FPA) by position.
 *
 * Every team defense is rated 1–5 (1=easiest, 5=hardest) against each fantasy
 * position. Ratings are derived from our team-environment model: pass-funnel
 * offenses give up more points to RBs, stacked-box fronts give up more to WRs,
 * etc. Without a live schedule, ratings are stable per team-position pair and
 * used as relative difficulty signals — not absolute FPA numbers.
 *
 * When a live data provider comes online, swap `DEFENSE_TIERS` for the real
 * league-wide FPA table and the rest of the logic stays identical.
 *
 * Pure; no external deps.
 */

import type { Pos } from "./players";

export type DefenseTier = 1 | 2 | 3 | 4 | 5;

export type MatchupGrade = {
  readonly opponent: string;
  /** 1 = easiest matchup (worst defense), 5 = hardest (best defense) */
  readonly tier: DefenseTier;
  readonly label: "Cream puff" | "Favorable" | "Neutral" | "Tough" | "Brick wall";
  /** Points this defense allowed per game to this position last season (synthetic estimate) */
  readonly ptaPerGame: number;
};

// ── Synthetic defense tiers ───────────────────────────────────────────────────
// Each team has a per-position tier. Derived from team archetype:
// pass-heavy offenses → run defense is porous (RB tier=1), pass defense is
// strong (WR/TE/QB tier=4-5). Run-first → opposite.
//
// Key: [team code] → [QB, RB, WR, TE] tiers

const RAW: Record<string, [DefenseTier, DefenseTier, DefenseTier, DefenseTier]> = {
  ARI: [3, 2, 3, 2],
  ATL: [3, 4, 3, 3],
  BAL: [4, 2, 4, 4],
  BUF: [3, 4, 3, 3],
  CAR: [2, 3, 2, 2],
  CHI: [3, 3, 3, 3],
  CIN: [3, 3, 3, 3],
  CLE: [4, 2, 4, 4],
  DAL: [3, 4, 3, 3],
  DEN: [4, 3, 4, 4],
  DET: [2, 3, 2, 2],
  GB:  [3, 3, 3, 3],
  HOU: [3, 2, 3, 2],
  IND: [3, 3, 3, 3],
  JAX: [2, 3, 2, 2],
  KC:  [4, 3, 4, 4],
  LAC: [3, 3, 3, 3],
  LAR: [4, 2, 4, 3],
  LV:  [2, 3, 2, 2],
  MIA: [3, 2, 3, 3],
  MIN: [3, 3, 3, 3],
  NE:  [4, 3, 4, 4],
  NO:  [3, 3, 3, 3],
  NYG: [2, 3, 2, 2],
  NYJ: [4, 2, 4, 4],
  PHI: [4, 3, 4, 4],
  PIT: [4, 3, 4, 4],
  SEA: [3, 2, 3, 3],
  SF:  [4, 3, 4, 4],
  TB:  [3, 3, 3, 3],
  TEN: [3, 3, 3, 3],
  WAS: [2, 3, 2, 2],
};

const POS_INDEX: Record<Pos, 0 | 1 | 2 | 3> = { QB: 0, RB: 1, WR: 2, TE: 3 };

// Base points allowed per game by tier (synthetic; calibrated to PPR scoring)
const BASE_PTA: Record<Pos, Record<DefenseTier, number>> = {
  QB:  { 1: 26.2, 2: 22.4, 3: 19.8, 4: 17.1, 5: 14.5 },
  RB:  { 1: 28.6, 2: 24.1, 3: 21.0, 4: 17.8, 5: 14.2 },
  WR:  { 1: 42.8, 2: 37.2, 3: 33.1, 4: 28.6, 5: 24.0 },
  TE:  { 1: 16.4, 2: 13.8, 3: 11.9, 4: 10.0, 5: 8.3  },
};

const LABELS: Record<DefenseTier, MatchupGrade["label"]> = {
  1: "Cream puff",
  2: "Favorable",
  3: "Neutral",
  4: "Tough",
  5: "Brick wall",
};

/** Grade a matchup for a single player. Returns null when team code is unknown. */
export function matchupGrade(teamCode: string, pos: Pos, opponent: string): MatchupGrade | null {
  const tiers = RAW[opponent.toUpperCase()];
  if (!tiers) return null;
  const idx = POS_INDEX[pos];
  const tier = tiers[idx];
  return {
    opponent: opponent.toUpperCase(),
    tier,
    label: LABELS[tier],
    ptaPerGame: BASE_PTA[pos][tier],
  };
}

/**
 * Rank all known opponents by difficulty for a given position.
 * 1 (easiest) first. Used for schedule-outlook tables in the waiver board.
 */
export function rankOpponents(pos: Pos): { team: string; tier: DefenseTier; label: MatchupGrade["label"]; ptaPerGame: number }[] {
  return Object.entries(RAW)
    .map(([team, tiers]) => {
      const idx = POS_INDEX[pos];
      const tier = tiers[idx];
      return { team, tier, label: LABELS[tier], ptaPerGame: BASE_PTA[pos][tier] };
    })
    .sort((a, b) => a.tier - b.tier); // easiest first
}

/** The easiest opponents (tier 1-2) for a position — the cream-puff matchup list. */
export function softMatchups(pos: Pos): string[] {
  return rankOpponents(pos).filter((x) => x.tier <= 2).map((x) => x.team);
}
