/**
 * Single Source of Truth for the active storefront NFL slate metadata.
 *
 * Keeps /packages, RedlineWorld, and storefront metadata synchronized with the
 * active Week 11 slate without hardcoding retired Week 9 / Week 10 labels.
 */

import { WEEK8_GAME_DAY_CATALOG_METADATA } from "@/lib/packages/catalog";
import { WEEK11_VERIFIED_SLATE, type PackWindowSlot } from "@/lib/packages/two-door-offers";

export interface ActiveSlateMeta {
  readonly season: number;
  readonly week: number;
  readonly slateLabel: string;
  readonly headerLabel: string;
  readonly deskEyebrow: string;
  readonly tnfMatchup: string;
  readonly tnfKickoffIso: string;
  readonly sundayMainDateLabel: string;
  readonly mnfMatchup: string;
  readonly slateWindowLabel: string;
  readonly matchupsSummary: string;
}

/**
 * Week 11 Sunday main-window date label. Verified 2026 schedule: TNF Thu Nov 19
 * (IND @ HOU) -> Sunday Nov 22 -> MNF Mon Nov 23 (CIN @ WSH). Matches the
 * SUN_* cutoffs in isPackWindowOpen below.
 */
const SUNDAY_MAIN_DATE_LABEL = "Sun Nov 22";

/**
 * MNF matchup is DERIVED from the verified slate's games array — never a second
 * hardcoded matchup literal that can drift from the schedule (the waves-1-4
 * rewrite referenced a phantom WEEK11_VERIFIED_SLATE.mnfMatchup field).
 */
const MNF_GAME = WEEK11_VERIFIED_SLATE.games.find((g) => g.window === "MNF");

export const ACTIVE_SLATE_META: ActiveSlateMeta = {
  season: WEEK11_VERIFIED_SLATE.season,
  week: WEEK11_VERIFIED_SLATE.week,
  slateLabel: `Week ${WEEK11_VERIFIED_SLATE.week}`,
  headerLabel: `Galaxy Sports Edge - Week ${WEEK11_VERIFIED_SLATE.week} - Storefront`,
  deskEyebrow: `REDZONE · WEEK ${WEEK11_VERIFIED_SLATE.week} NFL DESK`,
  tnfMatchup: WEEK11_VERIFIED_SLATE.tnfMatchup,
  tnfKickoffIso: "2026-11-20T01:15:00Z",
  sundayMainDateLabel: SUNDAY_MAIN_DATE_LABEL,
  mnfMatchup: MNF_GAME?.matchup ?? "TBD",
  slateWindowLabel: WEEK8_GAME_DAY_CATALOG_METADATA.slateWindowLabel,
  matchupsSummary: "IND @ HOU · TEN @ DAL · TB @ DET · PIT @ PHI · MIN @ SF · CIN @ WSH",
};

/**
 * Computes whether a package window slot is still open for kickoff at `now`.
 * Keeps weekly and weekend passes open through the Monday Night Football window.
 */
export function isPackWindowOpen(windowSlot: PackWindowSlot | string, now: Date = new Date()): boolean {
  const cutoffsMs: Record<string, number> = {
    TNF: Date.parse("2026-11-20T01:20:00Z"),
    SUN_EARLY: Date.parse("2026-11-22T18:00:00Z"),
    SUN_MAIN: Date.parse("2026-11-22T18:00:00Z"),
    SUN_LATE: Date.parse("2026-11-22T21:25:00Z"),
    SNF: Date.parse("2026-11-23T01:20:00Z"),
    MNF: Date.parse("2026-11-24T01:15:00Z"),
    WEEKEND_PASS: Date.parse("2026-11-24T01:15:00Z"),
    WEEKLY_PASS: Date.parse("2026-11-24T01:15:00Z"),
    THANKSGIVING_SLATE: Date.parse("2026-11-27T01:20:00Z"),
  };
  const cutoff = cutoffsMs[windowSlot];
  if (!cutoff || !Number.isFinite(cutoff)) return true;
  return now.getTime() < cutoff;
}
