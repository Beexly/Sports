/**
 * @file dyadic-trust-engine.ts
 * Dyadic Trust Modeling, Longitudinal Psychological Archetype Matrix & Roster Continuity Gate (Component 11).
 *
 * Implements:
 * 1. Live 2026 Roster-Continuity Gate (REFUSED_L0_STALE_ENTITY_BINDING):
 *    Rejects optimization fixtures that use stale cross-season entity bindings (e.g. DK Metcalf on SEA).
 * 2. Longitudinal Career-Archetype Priors:
 *    Maintains quarterback psychological archetype vectors (e.g. Aaron Rodgers' 99th-percentile
 *    DropPunishmentRate and TrustConcentrationGini).
 * 3. Dyadic Continuous Trust State T_{q,r}(t) in [-1, +1] updated via Hawkes point process:
 *    T_{q,r}(t) = T_{prior} + sum Psi_{onfield}(e_k) * exp(-beta * (t - t_k)) + sum Omega_{discourse}(w_m) * exp(-gamma * (t - t_m)).
 */

export interface PlayerRosterBinding {
  readonly playerId: string;
  readonly playerName: string;
  readonly season: number;
  readonly currentTeam: string;
  readonly activeQuarterbackId: string;
  readonly isRosterActive: boolean;
  readonly depthChartTier: number;
}

export interface QbBehavioralArchetype {
  readonly qbId: string;
  readonly qbName: string;
  readonly trustGini3rd4th: number; // high concentration on #1 trusted option
  readonly rookiePenalty: number;
  readonly dropPunishmentRate: number; // doghouse hazard multiplier
  readonly sightAdjustmentRate: number;
  readonly scrambledTargetConcentration: number;
  readonly unspokenFamiliarityFloorVeterans: readonly string[]; // veteran receiver keys with familiarity
}

export interface DyadicPlayImpulse {
  readonly timestampUtc: string;
  readonly playType: "3RD_4TH_CONVERSION" | "SIGHT_ADJUST_AUDIBLE" | "CHARTED_DROP" | "WRONG_ROUTE_STEM" | "NORMAL_PLAY";
  readonly targetId: string;
  readonly leverageWeight: number; // high leverage: 3rd & 4-8 yds, 2-minute drill
}

export interface MultimodalDiscourseImpulse {
  readonly timestampUtc: string;
  readonly source: "SIDELINE_LIP_READ" | "PRESS_CONFERENCE_UNPROMPTED" | "PRESS_CONFERENCE_COACHSPEAK" | "BEAT_REPORTER";
  readonly targetId: string;
  readonly polarity: number; // [-1.0, +1.0]
  readonly verbatimQuote?: string;
}

export interface DyadicTrustState {
  readonly qbId: string;
  readonly receiverId: string;
  readonly trustScore: number; // [-1.0, +1.0]
  readonly inDoghouse: boolean;
  readonly highLeverageTargetModifier: number; // multiplicative factor on targets
}

/**
 * 2026 Known Canonical Active NFL Roster Bindings.
 */
export const CANONICAL_2026_ROSTER_BINDINGS: ReadonlyMap<string, PlayerRosterBinding> = new Map([
  [
    "dk-metcalf",
    {
      playerId: "dk-metcalf",
      playerName: "DK Metcalf",
      season: 2026,
      currentTeam: "PIT",
      activeQuarterbackId: "aaron-rodgers",
      isRosterActive: true,
      depthChartTier: 1,
    },
  ],
  [
    "germie-bernard",
    {
      playerId: "germie-bernard",
      playerName: "Germie Bernard",
      season: 2026,
      currentTeam: "PIT",
      activeQuarterbackId: "aaron-rodgers",
      isRosterActive: true,
      depthChartTier: 2,
    },
  ],
  [
    "roman-wilson",
    {
      playerId: "roman-wilson",
      playerName: "Roman Wilson",
      season: 2026,
      currentTeam: "PIT",
      activeQuarterbackId: "aaron-rodgers",
      isRosterActive: false, // on IR
      depthChartTier: 2,
    },
  ],
  [
    "michael-pittman",
    {
      playerId: "michael-pittman",
      playerName: "Michael Pittman Jr.",
      season: 2026,
      currentTeam: "PIT",
      activeQuarterbackId: "aaron-rodgers",
      isRosterActive: false, // on IR
      depthChartTier: 1,
    },
  ],
  [
    "marquez-valdes-scantling",
    {
      playerId: "marquez-valdes-scantling",
      playerName: "Marquez Valdes-Scantling",
      season: 2026,
      currentTeam: "PIT",
      activeQuarterbackId: "aaron-rodgers",
      isRosterActive: true,
      depthChartTier: 3,
    },
  ],
  [
    "geno-smith",
    {
      playerId: "geno-smith",
      playerName: "Geno Smith",
      season: 2026,
      currentTeam: "SEA",
      activeQuarterbackId: "geno-smith",
      isRosterActive: true,
      depthChartTier: 1,
    },
  ],
]);

/**
 * Historical QB Psychological Archetypes.
 */
export const ARCHETYPE_AARON_RODGERS: QbBehavioralArchetype = {
  qbId: "aaron-rodgers",
  qbName: "Aaron Rodgers",
  trustGini3rd4th: 0.88, // 99th percentile concentration on trusted technician
  rookiePenalty: 0.45, // rookies must earn unspoken trust in film room
  dropPunishmentRate: 0.78, // severe immediate target reduction following drops
  sightAdjustmentRate: 0.94,
  scrambledTargetConcentration: 0.82,
  unspokenFamiliarityFloorVeterans: [
    "marquez-valdes-scantling",
    "allen-lazard",
    "randall-cobb",
    "davante-adams",
  ],
};

/**
 * Validates Point-in-Time Roster Continuity against live 2026 data.
 * Throws or returns error if a stale cross-season entity binding is detected.
 */
export function verifyRosterContinuityGate(
  playerId: string,
  claimedTeam: string,
  claimedQbId?: string,
): { valid: boolean; reason?: string } {
  const canonical = CANONICAL_2026_ROSTER_BINDINGS.get(playerId);
  if (!canonical) {
    return { valid: true }; // unknown player passes through
  }

  if (canonical.currentTeam !== claimedTeam) {
    return {
      valid: false,
      reason: `REFUSED_L0_STALE_ENTITY_BINDING: Player '${canonical.playerName}' (${playerId}) belongs to 2026 team '${canonical.currentTeam}', but was claimed on stale team '${claimedTeam}'.`,
    };
  }

  if (claimedQbId && canonical.activeQuarterbackId !== claimedQbId) {
    return {
      valid: false,
      reason: `REFUSED_L0_STALE_ENTITY_BINDING: Player '${canonical.playerName}' (${playerId}) is paired with 2026 active QB '${canonical.activeQuarterbackId}', but was stacked with '${claimedQbId}'.`,
    };
  }

  return { valid: true };
}

/**
 * Computes Hawkes Point-Process Dyadic Trust State T_{q,r}(t).
 */
export function computeDyadicTrustState(
  archetype: QbBehavioralArchetype,
  receiverId: string,
  onFieldPlays: readonly DyadicPlayImpulse[],
  discourseEvents: readonly MultimodalDiscourseImpulse[],
  currentTimeUtc: string,
): DyadicTrustState {
  // 1. Initial Prior
  let prior = 0.0;
  if (archetype.unspokenFamiliarityFloorVeterans.includes(receiverId)) {
    prior = 0.40; // automatic familiarity floor for Rodgers' trusted veterans
  }

  // 2. On-Field Impulses
  const nowMs = new Date(currentTimeUtc).getTime();
  const decayPlayDays = 7.0; // half-life ~ 7 days
  const lambdaPlay = Math.log(2) / (decayPlayDays * 86400000);

  let onFieldShock = 0.0;
  let dropsCount = 0;

  for (const play of onFieldPlays) {
    if (play.targetId !== receiverId) continue;

    const dtMs = Math.max(0, nowMs - new Date(play.timestampUtc).getTime());
    const weight = Math.exp(-lambdaPlay * dtMs) * play.leverageWeight;

    if (play.playType === "CHARTED_DROP") {
      dropsCount++;
      // Punished heavily by QB's specific drop punishment rate
      onFieldShock -= 0.35 * archetype.dropPunishmentRate * weight;
    } else if (play.playType === "WRONG_ROUTE_STEM") {
      onFieldShock -= 0.45 * weight;
    } else if (play.playType === "3RD_4TH_CONVERSION" || play.playType === "SIGHT_ADJUST_AUDIBLE") {
      onFieldShock += 0.25 * weight;
    }
  }

  // 3. Discourse Impulses (Lip-reading, press conferences)
  let discourseShock = 0.0;
  for (const disc of discourseEvents) {
    if (disc.targetId !== receiverId) continue;

    const dtMs = Math.max(0, nowMs - new Date(disc.timestampUtc).getTime());
    const weight = Math.exp(-lambdaPlay * dtMs);

    if (disc.source === "SIDELINE_LIP_READ") {
      // Direct raw emotion (e.g. "sucks ass" lip-read) gets 4.5x multiplier
      discourseShock += disc.polarity * 0.45 * weight;
    } else if (disc.source === "PRESS_CONFERENCE_UNPROMPTED") {
      // Genuine unprompted praise ("lot of trust in Roman")
      discourseShock += disc.polarity * 0.30 * weight;
    } else if (disc.source === "PRESS_CONFERENCE_COACHSPEAK") {
      // Defensive PR damage-control discounted to 0.1x
      discourseShock += disc.polarity * 0.03 * weight;
    }
  }

  const rawScore = prior + onFieldShock + discourseShock;
  const clampedScore = Math.max(-1.0, Math.min(1.0, rawScore));
  const inDoghouse = clampedScore < -0.25 || dropsCount >= 3;

  // Compute high-leverage target modifier: exponential mapping
  const modifier = inDoghouse ? 0.45 : Math.exp(0.5 * clampedScore);

  return {
    qbId: archetype.qbId,
    receiverId,
    trustScore: Math.round(clampedScore * 1000) / 1000,
    inDoghouse,
    highLeverageTargetModifier: Math.round(modifier * 1000) / 1000,
  };
}
