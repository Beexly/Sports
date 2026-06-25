/**
 * GALILEO ENGINE — Role State Engine for Player Props (Phase 5).
 *
 * Props are not generic over/under buckets — they price a PLAYER'S ROLE. When a starter is
 * limited, a backfield changes, an OL is banged up, or game script flips, the player's role
 * moves immediately but the prop line can stay anchored to the old assumption for hours.
 * This models the role explicitly and GENERATES CANDIDATES where the priced role looks stale.
 *
 * It makes NO claim of edge — only candidate generation with an explicit structural reason.
 * Every candidate must then run the full evidence gauntlet through the edge ledger. Pure.
 */

export type PlayerPosition = "QB" | "RB" | "WR" | "TE";

export type InjuryStatus = "healthy" | "questionable" | "limited" | "doubtful" | "out" | "ir";

export interface PlayerRoleState {
  readonly player: string;
  readonly team: string;
  readonly position: PlayerPosition;
  readonly isBackup: boolean;
  /** Shares in [0,1]. "projected" = the role the market likely priced; "recent" = observed now. */
  readonly projectedSnapShare: number;
  readonly recentSnapShare: number;
  readonly routeShare: number;
  readonly targetShare: number;
  readonly carryShare: number;
  readonly redZoneShare: number;
  readonly thirdDownRole: number;
  readonly twoMinuteRole: number;
  /** Is a backup available to absorb work (depth exists)? */
  readonly backupAvailable: boolean;
  /** Injury status of the positional STARTER ahead of this player (for backups). */
  readonly starterInjuryStatus: InjuryStatus;
  /** 0 (OL healthy) → 1 (OL decimated) — pass-protection context. */
  readonly olInjuryContext: number;
  /** 0 (tough matchup) → 1 (soft matchup) — opposing front. */
  readonly defenseMatchupContext: number;
  /** Change in the player's team spread since the prop was likely set (+ = became more of a dog). */
  readonly spreadShift: number;
  /** The team's implied total (points). */
  readonly teamTotalContext: number;
  /** Is the team's WR1 out (elevates WR2/slot/TE)? */
  readonly teammateWr1Out: boolean;
  /** 0 (calm) → 1 (severe) adverse weather. */
  readonly weatherContext: number;
}

/** How much the role has moved vs. the priced assumption — high = market may be anchored. */
export function roleShiftScore(s: PlayerRoleState): number {
  const snap = Math.abs(s.recentSnapShare - s.projectedSnapShare);
  return Math.min(1, snap + 0.5 * (s.teammateWr1Out ? s.targetShare : 0) + 0.25 * Math.min(1, Math.abs(s.spreadShift) / 7));
}

/** Composite volatility: backups, role shifts, severe weather, and big script swings. */
export function roleVolatility(s: PlayerRoleState): number {
  return Math.min(
    1,
    0.4 * roleShiftScore(s) +
      0.2 * (s.isBackup ? 1 : 0) +
      0.2 * s.weatherContext +
      0.2 * Math.min(1, Math.abs(s.spreadShift) / 10),
  );
}

export interface RoleCandidate {
  readonly player: string;
  readonly team: string;
  readonly market: string;
  readonly side: "OVER" | "UNDER";
  readonly hypothesis: string;
  readonly structuralReason: string;
  readonly triggers: readonly string[];
  readonly volatility: number;
}

const injured = (s: InjuryStatus): boolean => s === "limited" || s === "doubtful" || s === "out" || s === "ir";

/**
 * Generate role-anchoring candidates from a player's role state. Each candidate names the
 * market, the side, the hypothesis, and the STRUCTURAL reason the line may be stale. No edge
 * is claimed — these are inputs to the ledger (WATCHLIST/SHADOW), not picks.
 */
export function generateRoleCandidates(s: PlayerRoleState): RoleCandidate[] {
  const out: RoleCandidate[] = [];
  const vol = roleVolatility(s);
  const push = (market: string, side: "OVER" | "UNDER", hypothesis: string, structuralReason: string, triggers: string[]) =>
    out.push({ player: s.player, team: s.team, market, side, hypothesis, structuralReason, triggers, volatility: vol });

  // 1. Backup RB receiving work after a starter limitation.
  if (s.position === "RB" && s.isBackup && injured(s.starterInjuryStatus) && s.recentSnapShare > s.projectedSnapShare + 0.1) {
    push("player_reception_yds", "OVER", "Backup RB absorbs passing-down work after starter limitation", "Starter limited/out → backup inherits third-down + two-minute role; line may anchor to the backup's old low usage.", ["starter_injured", "snap_share_up"]);
    push("player_receptions", "OVER", "Backup RB receptions rise after starter limitation", "Same role inheritance; receptions market is often the slowest to re-price.", ["starter_injured", "third_down_role"]);
  }

  // 2/3. WR2/slot/TE receptions after WR1 injury.
  if ((s.position === "WR" || s.position === "TE") && s.teammateWr1Out && s.targetShare > 0.15) {
    push("player_receptions", "OVER", `${s.position} target share rises with WR1 out`, "WR1 absence reallocates targets to WR2/slot/TE; reception line can lag the vacated volume.", ["wr1_out", "target_share_up"]);
  }

  // 4. RB unders when favorite status disappears (game-script carry suppression).
  if (s.position === "RB" && s.spreadShift > 2.5) {
    push("player_rush_yds", "UNDER", "RB rush UNDER after the team loses favorite status", "Trailing script suppresses carries; rush line set as a favorite may not have followed the spread move.", ["spread_shift_to_dog", "carry_suppression"]);
  }

  // 5. QB rushing overs after OL pass-protection injuries.
  if (s.position === "QB" && s.olInjuryContext >= 0.5) {
    push("player_rush_yds", "OVER", "QB rush OVER behind a compromised OL", "Pressure forces scrambles → designed/ scramble rush yards rise; QB rush line is thin and slow to adjust.", ["ol_injury_cluster", "pressure_scrambles"]);
  }

  // 6. Backup/rookie conservative-prior uncertainty → watch (no side conviction yet).
  if (s.isBackup && vol >= 0.5) {
    push("player_rush_yds", "OVER", "Conservative book prior on an uncertain backup role", "Books price unknown roles conservatively; large role volatility makes either tail mispriceable — shadow only.", ["backup_uncertainty", "high_volatility"]);
  }

  return out;
}
