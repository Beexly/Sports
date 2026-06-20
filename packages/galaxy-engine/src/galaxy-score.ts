/**
 * Galaxy Score (bible §3 "Galaxy Score") — one universal identity metric.
 *
 * Combines a player's whole sports life into a single transparent number out of
 * 1000, with a per-component breakdown (users optimize what's visible, so we make
 * the RIGHT things visible). Deliberately rewards accuracy-with-calibration,
 * discipline, contribution, and consistency — NOT reckless volume (activity is
 * capped with diminishing returns). Pure; the app computes the input.
 */

export interface GalaxyScoreInput {
  /** Average Sports IQ skill level across tracked sports (1–99). */
  readonly avgSkillLevel: number;
  /** Average per-attempt calibration score (0–100), or null if no graded reps. */
  readonly avgCalibration: number | null;
  /** Ladder rating (Elo-on-calibration). */
  readonly rating: number;
  /** Distinct PvM bosses cleared. */
  readonly bossClears: number;
  /** Crew contribution proxy (0–100); 0 if crew-less. */
  readonly crewContribution: number;
  /** 1 = top faction … 8 = last; null if unknown. */
  readonly factionRank: number | null;
  /** Cards collected. */
  readonly cardCount: number;
  /** Total graded Signal Checks (activity — capped, diminishing). */
  readonly gradedChecks: number;
  /** Merch entitlements earned. */
  readonly merchCount: number;
  /** Season Cup tier (1–6). */
  readonly seasonTier: number;
}

export interface GalaxyScoreComponent {
  readonly key: string;
  readonly label: string;
  readonly points: number;
  readonly max: number;
  readonly detail: string;
}

export interface GalaxyScore {
  readonly total: number;
  readonly max: number;
  readonly tier: string;
  readonly components: readonly GalaxyScoreComponent[];
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export const GALAXY_SCORE_MAX = 1000;

/** Galaxy Score tier from total. Galaxy language; status, not power. */
export function galaxyScoreTier(total: number): string {
  if (total >= 850) return "Authority";
  if (total >= 650) return "Legend";
  if (total >= 450) return "Sharp";
  if (total >= 250) return "Riser";
  if (total >= 100) return "Prospect";
  return "Rookie";
}

export function computeGalaxyScore(input: GalaxyScoreInput): GalaxyScore {
  const components: GalaxyScoreComponent[] = [];

  // Calibration quality — the honest core (max 250).
  {
    const max = 250;
    const q = input.avgCalibration == null ? 0 : clamp01(input.avgCalibration / 100);
    const points = Math.round(q * max);
    components.push({
      key: "calibration",
      label: "Calibration",
      points,
      max,
      detail: input.avgCalibration == null ? "No graded reps yet" : `Avg calibration ${Math.round(input.avgCalibration)}/100`,
    });
  }

  // Sports IQ — earned skill (max 150).
  {
    const max = 150;
    const points = Math.round(clamp01((input.avgSkillLevel - 1) / 98) * max);
    components.push({ key: "sportsIq", label: "Sports IQ", points, max, detail: `Avg skill level ${Math.round(input.avgSkillLevel)}` });
  }

  // PvP rating — normalized 900..1900 (max 150).
  {
    const max = 150;
    const points = Math.round(clamp01((input.rating - 900) / 1000) * max);
    components.push({ key: "pvp", label: "PvP Rating", points, max, detail: `Ladder rating ${input.rating}` });
  }

  // PvM clears — cap at 5 bosses (max 100).
  {
    const max = 100;
    const points = Math.round(clamp01(input.bossClears / 5) * max);
    components.push({ key: "pvm", label: "PvM Mastery", points, max, detail: `${input.bossClears} boss${input.bossClears === 1 ? "" : "es"} cleared` });
  }

  // Season progress — tier/6 (max 100).
  {
    const max = 100;
    const points = Math.round(clamp01(input.seasonTier / 6) * max);
    components.push({ key: "season", label: "Season Progress", points, max, detail: `Season Tier ${input.seasonTier}` });
  }

  // Crew contribution (max 80).
  {
    const max = 80;
    const points = Math.round(clamp01(input.crewContribution / 100) * max);
    components.push({ key: "crew", label: "Crew Contribution", points, max, detail: input.crewContribution > 0 ? `Contribution ${Math.round(input.crewContribution)}/100` : "No crew yet" });
  }

  // Card collection — diminishing (sqrt), cap at 12 (max 60).
  {
    const max = 60;
    const points = Math.round(clamp01(Math.sqrt(input.cardCount) / Math.sqrt(12)) * max);
    components.push({ key: "cards", label: "Collection", points, max, detail: `${input.cardCount} card${input.cardCount === 1 ? "" : "s"}` });
  }

  // Consistency — graded reps, diminishing (sqrt), cap at 60 reps (max 60).
  // Activity is rewarded gently and capped so it never beats accuracy.
  {
    const max = 60;
    const points = Math.round(clamp01(Math.sqrt(input.gradedChecks) / Math.sqrt(60)) * max);
    components.push({ key: "consistency", label: "Consistency", points, max, detail: `${input.gradedChecks} graded reps` });
  }

  // Merch achievements (max 30).
  {
    const max = 30;
    const points = Math.round(clamp01(input.merchCount / 3) * max);
    components.push({ key: "merch", label: "Achievements", points, max, detail: `${input.merchCount} unlock${input.merchCount === 1 ? "" : "s"}` });
  }

  // Faction status — small bonus for a top-3 faction (max 20).
  {
    const max = 20;
    const rank = input.factionRank;
    const points = rank == null ? 0 : rank <= 3 ? Math.round(((4 - rank) / 3) * max) : 0;
    components.push({ key: "faction", label: "Faction Status", points, max, detail: rank == null ? "—" : `Faction rank #${rank}` });
  }

  const total = components.reduce((s, c) => s + c.points, 0);
  return { total, max: GALAXY_SCORE_MAX, tier: galaxyScoreTier(total), components };
}
