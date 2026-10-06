/**
 * NGS-12 — Adjacent metric families.
 *
 * Kicker makes-over-expected, scramble EPA, motion-at-snap rate,
 * run stops / run stuffs, air yards per target, on/off-field EPA splits.
 * All computable from nflverse play-level data today.
 *
 * Source: NGS implementation playbook 2026-09-21 §12.
 *
 * COMPOSES WITH: nflverse-cache (play inputs), W5 luck-neutralized-epa.
 */

// ── Kicker makes over expected ──────────────────────────────────────────────

export interface FieldGoalAttempt {
  readonly playId: string;
  readonly gameId: string;
  readonly playerId: string;
  /** Distance in yards. Null → missing, never imputed. */
  readonly distance: number | null;
  readonly made: boolean | null;
  /** 1 = outdoor, 0 = dome. Null → unknown. */
  readonly isOutdoor: boolean | null;
  /** Wind mph at attempt. Null → unknown. */
  readonly windMph: number | null;
}

export interface KickerMoEResult {
  readonly playerId: string;
  readonly attempts: number;
  readonly makes: number;
  /** Sum of (made − p_make). Positive = outperforming expectation. */
  readonly makesOverExpected: number;
  readonly makeRate: number | null;
  readonly expectedMakeRate: number | null;
}

/**
 * Logistic make-probability model for FG attempts.
 * Coefficients are fit-to-scale placeholders with the correct shape:
 * make probability falls with distance and wind, rises outdoors with low wind.
 * Callers who have a fitted model should inject it via `pMake` override.
 */
export function fgMakeProbability(
  distance: number | null,
  windMph: number | null,
  isOutdoor: boolean | null,
): number | null {
  if (distance === null || !Number.isFinite(distance) || distance < 15 || distance > 70) {
    return null;
  }
  // Log-odds: intercept tuned so ~40yd ≈ 0.75, 50yd ≈ 0.55, 60yd ≈ 0.25
  const z = 2.55 - 0.055 * distance;
  const windPenalty =
    windMph === null || !Number.isFinite(windMph) || !isOutdoor
      ? 0
      : -0.02 * Math.max(0, windMph - 8);
  const p = 1 / (1 + Math.exp(-(z + windPenalty)));
  return Number(p.toFixed(4));
}

export function computeKickerMoE(
  attempts: readonly FieldGoalAttempt[],
  pMakeOverride?: (a: FieldGoalAttempt) => number | null,
): readonly KickerMoEResult[] {
  const byPlayer = new Map<
    string,
    { attempts: number; makes: number; moeSum: number; pSum: number; pN: number }
  >();

  for (const a of attempts) {
    if (!a.playerId || a.playerId.trim().length === 0) continue;
    const p = pMakeOverride
      ? pMakeOverride(a)
      : fgMakeProbability(a.distance, a.windMph, a.isOutdoor);
    const e = byPlayer.get(a.playerId) ?? {
      attempts: 0,
      makes: 0,
      moeSum: 0,
      pSum: 0,
      pN: 0,
    };
    e.attempts += 1;
    if (a.made) e.makes += 1;
    if (p !== null && Number.isFinite(p)) {
      e.moeSum += (a.made ? 1 : 0) - p;
      e.pSum += p;
      e.pN += 1;
    }
    byPlayer.set(a.playerId, e);
  }

  return [...byPlayer.entries()].map(([playerId, e]) => ({
    playerId,
    attempts: e.attempts,
    makes: e.makes,
    makesOverExpected: Number(e.moeSum.toFixed(4)),
    makeRate: e.attempts > 0 ? Number((e.makes / e.attempts).toFixed(4)) : null,
    expectedMakeRate: e.pN > 0 ? Number((e.pSum / e.pN).toFixed(4)) : null,
  }));
}

// ── Scramble EPA ────────────────────────────────────────────────────────────

export interface ScramblePlay {
  readonly playId: string;
  readonly gameId: string;
  readonly playerId: string;
  readonly isScramble: boolean;
  readonly epa: number | null;
  readonly yardsGained: number | null;
  readonly season: number;
}

export interface ScrambleEpaResult {
  readonly playerId: string;
  readonly scrambles: number;
  readonly scrambleEpa: number;
  readonly scrambleEpaPerPlay: number | null;
  readonly scrambleYards: number;
  readonly playsMissingEpa: number;
}

export function computeScrambleEpa(
  plays: readonly ScramblePlay[],
): readonly ScrambleEpaResult[] {
  const byPlayer = new Map<
    string,
    {
      scrambles: number;
      epaSum: number;
      yardsSum: number;
      missingEpa: number;
    }
  >();

  for (const p of plays) {
    if (!p.isScramble || !p.playerId) continue;
    const e = byPlayer.get(p.playerId) ?? {
      scrambles: 0,
      epaSum: 0,
      yardsSum: 0,
      missingEpa: 0,
    };
    e.scrambles += 1;
    if (p.epa === null || !Number.isFinite(p.epa)) {
      e.missingEpa += 1;
    } else {
      e.epaSum += p.epa;
    }
    if (p.yardsGained !== null && Number.isFinite(p.yardsGained)) {
      e.yardsSum += p.yardsGained;
    }
    byPlayer.set(p.playerId, e);
  }

  return [...byPlayer.entries()].map(([playerId, e]) => ({
    playerId,
    scrambles: e.scrambles,
    scrambleEpa: Number(e.epaSum.toFixed(4)),
    scrambleEpaPerPlay:
      e.scrambles - e.missingEpa > 0
        ? Number((e.epaSum / (e.scrambles - e.missingEpa)).toFixed(4))
        : null,
    scrambleYards: e.yardsSum,
    playsMissingEpa: e.missingEpa,
  }));
}

// ── Motion at snap rate ─────────────────────────────────────────────────────

export interface MotionPlay {
  readonly playId: string;
  readonly playerId: string;
  /** True when the player was in motion at the snap. Null → unknown. */
  readonly motionAtSnap: boolean | null;
  /** True when the player had any pre-snap motion. */
  readonly anyMotion: boolean | null;
}

export interface MotionRateResult {
  readonly playerId: string;
  readonly snaps: number;
  readonly snapsWithKnownMotion: number;
  readonly motionAtSnapRate: number | null;
  readonly anyMotionRate: number | null;
}

/**
 * Motion-at-snap rate. Snaps with null motion are excluded from the
 * denominator — never imputed as false.
 */
export function computeMotionRate(
  plays: readonly MotionPlay[],
): readonly MotionRateResult[] {
  const byPlayer = new Map<
    string,
    {
      snaps: number;
      known: number;
      atSnap: number;
      any: number;
      anyKnown: number;
    }
  >();

  for (const p of plays) {
    if (!p.playerId) continue;
    const e = byPlayer.get(p.playerId) ?? {
      snaps: 0,
      known: 0,
      atSnap: 0,
      any: 0,
      anyKnown: 0,
    };
    e.snaps += 1;
    if (p.motionAtSnap !== null) {
      e.known += 1;
      if (p.motionAtSnap) e.atSnap += 1;
    }
    if (p.anyMotion !== null) {
      e.anyKnown += 1;
      if (p.anyMotion) e.any += 1;
    }
    byPlayer.set(p.playerId, e);
  }

  return [...byPlayer.entries()].map(([playerId, e]) => ({
    playerId,
    snaps: e.snaps,
    snapsWithKnownMotion: e.known,
    motionAtSnapRate: e.known > 0 ? Number((e.atSnap / e.known).toFixed(4)) : null,
    anyMotionRate: e.anyKnown > 0 ? Number((e.any / e.anyKnown).toFixed(4)) : null,
  }));
}

// ── Run stops / run stuffs ──────────────────────────────────────────────────

export interface RunStopPlay {
  readonly playId: string;
  readonly defenderId: string;
  readonly isRush: boolean;
  readonly yardsGained: number | null;
  readonly isTackleForLoss: boolean;
  readonly success: boolean | null;
}

export interface RunStopResult {
  readonly defenderId: string;
  readonly runStops: number;
  readonly runStuffs: number;
  readonly runStopRate: number | null;
}

/**
 * Run stop = tackle on a rush that resulted in an unsuccessful play.
 * Run stuff = tackle for loss or no gain on a rush.
 */
export function computeRunStops(plays: readonly RunStopPlay[]): readonly RunStopResult[] {
  const byPlayer = new Map<
    string,
    { rushSnaps: number; stops: number; stuffs: number }
  >();

  for (const p of plays) {
    if (!p.isRush || !p.defenderId) continue;
    const e = byPlayer.get(p.defenderId) ?? {
      rushSnaps: 0,
      stops: 0,
      stuffs: 0,
    };
    e.rushSnaps += 1;
    const unsuccessful = p.success === false;
    if (unsuccessful) e.stops += 1;
    if (p.isTackleForLoss || (p.yardsGained !== null && p.yardsGained <= 0)) {
      e.stuffs += 1;
    }
    byPlayer.set(p.defenderId, e);
  }

  return [...byPlayer.entries()].map(([defenderId, e]) => ({
    defenderId,
    runStops: e.stops,
    runStuffs: e.stuffs,
    runStopRate: e.rushSnaps > 0 ? Number((e.stops / e.rushSnaps).toFixed(4)) : null,
  }));
}

// ── Air yards per target ────────────────────────────────────────────────────

export interface AirYardsTarget {
  readonly playerId: string;
  readonly airYards: number | null;
  readonly completed: boolean | null;
  readonly isTouchdown: boolean;
}

export interface AirYardsResult {
  readonly playerId: string;
  readonly targets: number;
  readonly targetsWithAirYards: number;
  readonly airYardsPerTarget: number | null;
  readonly avgAirYardsOnTd: number | null;
  readonly tdReceptions: number;
}

export function computeAirYards(
  targets: readonly AirYardsTarget[],
): readonly AirYardsResult[] {
  const byPlayer = new Map<
    string,
    {
      targets: number;
      airSum: number;
      airN: number;
      tdAirSum: number;
      tdN: number;
    }
  >();

  for (const t of targets) {
    if (!t.playerId) continue;
    const e = byPlayer.get(t.playerId) ?? {
      targets: 0,
      airSum: 0,
      airN: 0,
      tdAirSum: 0,
      tdN: 0,
    };
    e.targets += 1;
    if (t.airYards !== null && Number.isFinite(t.airYards)) {
      e.airSum += t.airYards;
      e.airN += 1;
      if (t.isTouchdown && t.completed) {
        e.tdAirSum += t.airYards;
        e.tdN += 1;
      }
    }
    byPlayer.set(t.playerId, e);
  }

  return [...byPlayer.entries()].map(([playerId, e]) => ({
    playerId,
    targets: e.targets,
    targetsWithAirYards: e.airN,
    airYardsPerTarget: e.airN > 0 ? Number((e.airSum / e.airN).toFixed(4)) : null,
    avgAirYardsOnTd: e.tdN > 0 ? Number((e.tdAirSum / e.tdN).toFixed(4)) : null,
    tdReceptions: e.tdN,
  }));
}

// ── On/off-field EPA splits ─────────────────────────────────────────────────

export interface OnOffPlay {
  readonly teamId: string;
  readonly playerId: string | null;
  readonly onField: boolean;
  readonly epa: number | null;
}

export interface OnOffEpaResult {
  readonly playerId: string;
  readonly teamId: string;
  readonly epaOnField: number | null;
  readonly epaOffField: number | null;
  readonly playsOnField: number;
  readonly playsOffField: number;
  readonly split: number | null;
}

/**
 * On/off-field EPA per play split. Plays with null EPA excluded from means —
 * never imputed as zero.
 */
export function computeOnOffEpa(plays: readonly OnOffPlay[]): readonly OnOffEpaResult[] {
  const byPlayer = new Map<
    string,
    {
      teamId: string;
      onSum: number;
      onN: number;
      offSum: number;
      offN: number;
    }
  >();

  for (const p of plays) {
    if (!p.playerId) continue;
    const e = byPlayer.get(p.playerId) ?? {
      teamId: p.teamId,
      onSum: 0,
      onN: 0,
      offSum: 0,
      offN: 0,
    };
    if (p.epa === null || !Number.isFinite(p.epa)) continue;
    if (p.onField) {
      e.onSum += p.epa;
      e.onN += 1;
    } else {
      e.offSum += p.epa;
      e.offN += 1;
    }
    byPlayer.set(p.playerId, e);
  }

  return [...byPlayer.entries()].map(([playerId, e]) => {
    const on = e.onN > 0 ? e.onSum / e.onN : null;
    const off = e.offN > 0 ? e.offSum / e.offN : null;
    return {
      playerId,
      teamId: e.teamId,
      epaOnField: on === null ? null : Number(on.toFixed(4)),
      epaOffField: off === null ? null : Number(off.toFixed(4)),
      playsOnField: e.onN,
      playsOffField: e.offN,
      split: on !== null && off !== null ? Number((on - off).toFixed(4)) : null,
    };
  });
}
