/**
 * NGS-11 — Coverage / DB / defensive-back metrics.
 *
 * Target EPA, yards-per-coverage-snap, EPA per target, completion % allowed,
 * and passer rating allowed — computable from nflverse + charting today.
 *
 * Source: NGS implementation playbook 2026-09-21 §11.
 * Coverage responsibility from FTN charting + man/zone splits; the
 * classification model itself is not public — these are the derived
 * metrics GSE can compute without it.
 *
 * COMPOSES WITH: nflverse-cache (play inputs), W5 luck-neutralized-epa.
 */

export interface TargetPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  /** Defensive back / coverage defender under evaluation. */
  readonly defenderId: string;
  readonly defenderPosition: "CB" | "S" | "LB" | "NB" | "OTHER";
  readonly offenseTeam: string;
  readonly defenseTeam: string;
  /** EPA on the play. Null → missing, never imputed. */
  readonly epa: number | null;
  readonly yardsGained: number | null;
  readonly airYards: number | null;
  readonly completed: boolean | null;
  readonly intercepted: boolean | null;
  /** Coverage type when charted. Null → unknown. */
  readonly coverageType: "MAN" | "ZONE" | "OTHER" | null;
  /** Alignment when charted. */
  readonly alignment: "BOUNDARY" | "FIELD" | "SLOT" | "BOX" | "OTHER" | null;
  /** True when the defender was in coverage (not blitzing). */
  readonly inCoverage: boolean;
  /** True when the defender was the primary target in coverage. */
  readonly wasTargeted: boolean;
  /** True when the throw was aimed at this defender's assignment. */
  readonly wasPrimaryCoverage: boolean;
}

export interface DbCoverageMetrics {
  readonly defenderId: string;
  readonly targets: number;
  readonly coverageSnaps: number;
  /** Mean EPA on targeted plays. Null when targets = 0. */
  readonly targetEpa: number | null;
  /** Yards allowed per coverage snap. Null when coverageSnaps = 0. */
  readonly yardsPerCoverageSnap: number | null;
  readonly epaPerTarget: number | null;
  /** Completions allowed / targets. Null when targets = 0. */
  readonly completionPctAllowed: number | null;
  /** NFL passer rating allowed. Null when targets = 0 or data missing. */
  readonly passerRatingAllowed: number | null;
  readonly interceptions: number;
  readonly targetsByAlignment: Readonly<Record<string, number>>;
  readonly targetEpaByCoverage: {
    readonly MAN: number | null;
    readonly ZONE: number | null;
    readonly OTHER: number | null;
  };
}

export interface DbMetricsResult {
  readonly byDefender: readonly DbCoverageMetrics[];
  readonly leagueAverages: {
    readonly targetEpa: number | null;
    readonly yardsPerCoverageSnap: number | null;
    readonly completionPctAllowed: number | null;
    readonly passerRatingAllowed: number | null;
  };
  readonly playsUsed: number;
  readonly playsSkipped: number;
}

/**
 * Compute per-defender coverage metrics. Plays with null EPA on targeted
 * snaps are counted in targets but excluded from EPA means (never imputed).
 */
export function computeDbCoverageMetrics(
  plays: readonly TargetPlay[],
): DbMetricsResult {
  if (!Array.isArray(plays)) {
    throw new Error("computeDbCoverageMetrics: plays must be an array");
  }

  const byId = new Map<
    string,
    {
      targets: number;
      coverageSnaps: number;
      epaSum: number;
      epaN: number;
      yardsSum: number;
      yardsN: number;
      completions: number;
      completionsN: number;
      ints: number;
      // Passer rating components (attempt-level)
      att: number;
      comp: number;
      yds: number;
      td: number;
      int: number;
      alignCounts: Record<string, number>;
      manEpaSum: number;
      manEpaN: number;
      zoneEpaSum: number;
      zoneEpaN: number;
      otherEpaSum: number;
      otherEpaN: number;
    }
  >();

  let playsUsed = 0;
  let playsSkipped = 0;

  for (const p of plays) {
    if (!p.defenderId || p.defenderId.trim().length === 0) {
      playsSkipped += 1;
      continue;
    }
    const e = byId.get(p.defenderId) ?? {
      targets: 0,
      coverageSnaps: 0,
      epaSum: 0,
      epaN: 0,
      yardsSum: 0,
      yardsN: 0,
      completions: 0,
      completionsN: 0,
      ints: 0,
      att: 0,
      comp: 0,
      yds: 0,
      td: 0,
      int: 0,
      alignCounts: {} as Record<string, number>,
      manEpaSum: 0,
      manEpaN: 0,
      zoneEpaSum: 0,
      zoneEpaN: 0,
      otherEpaSum: 0,
      otherEpaN: 0,
    };

    if (p.inCoverage) e.coverageSnaps += 1;

    if (p.wasTargeted) {
      e.targets += 1;
      const align = p.alignment ?? "OTHER";
      e.alignCounts[align] = (e.alignCounts[align] ?? 0) + 1;

      if (p.epa !== null && Number.isFinite(p.epa)) {
        e.epaSum += p.epa;
        e.epaN += 1;
        if (p.coverageType === "MAN") {
          e.manEpaSum += p.epa;
          e.manEpaN += 1;
        } else if (p.coverageType === "ZONE") {
          e.zoneEpaSum += p.epa;
          e.zoneEpaN += 1;
        } else {
          e.otherEpaSum += p.epa;
          e.otherEpaN += 1;
        }
      }
      if (p.yardsGained !== null && Number.isFinite(p.yardsGained)) {
        e.yardsSum += p.yardsGained;
        e.yardsN += 1;
      }
      if (p.completed !== null) {
        e.completionsN += 1;
        if (p.completed) e.completions += 1;
      }
      if (p.intercepted) e.ints += 1;

      // Passer-rating inputs (NFL formula uses attempts to this coverage)
      e.att += 1;
      if (p.completed) {
        e.comp += 1;
        e.yds += p.yardsGained ?? 0;
      }
      if (p.intercepted) e.int += 1;
    }

    byId.set(p.defenderId, e);
    playsUsed += 1;
  }

  const byDefender: DbCoverageMetrics[] = [];
  for (const [defenderId, e] of byId) {
    const targetEpa = e.epaN > 0 ? e.epaSum / e.epaN : null;
    const yardsPerCoverageSnap =
      e.coverageSnaps > 0 && e.yardsN > 0 ? e.yardsSum / e.coverageSnaps : null;
    const epaPerTarget = e.targets > 0 && e.epaN > 0 ? e.epaSum / e.epaN : null;
    const completionPctAllowed =
      e.completionsN > 0 ? e.completions / e.completionsN : null;
    const passerRatingAllowed =
      e.att > 0 ? nflPasserRating(e.att, e.comp, e.yds, e.td, e.int) : null;

    byDefender.push({
      defenderId,
      targets: e.targets,
      coverageSnaps: e.coverageSnaps,
      targetEpa: targetEpa === null ? null : Number(targetEpa.toFixed(4)),
      yardsPerCoverageSnap:
        yardsPerCoverageSnap === null
          ? null
          : Number(yardsPerCoverageSnap.toFixed(4)),
      epaPerTarget: epaPerTarget === null ? null : Number(epaPerTarget.toFixed(4)),
      completionPctAllowed:
        completionPctAllowed === null
          ? null
          : Number(completionPctAllowed.toFixed(4)),
      passerRatingAllowed:
        passerRatingAllowed === null
          ? null
          : Number(passerRatingAllowed.toFixed(2)),
      interceptions: e.ints,
      targetsByAlignment: e.alignCounts,
      targetEpaByCoverage: {
        MAN: e.manEpaN > 0 ? Number((e.manEpaSum / e.manEpaN).toFixed(4)) : null,
        ZONE: e.zoneEpaN > 0 ? Number((e.zoneEpaSum / e.zoneEpaN).toFixed(4)) : null,
        OTHER: e.otherEpaN > 0 ? Number((e.otherEpaSum / e.otherEpaN).toFixed(4)) : null,
      },
    });
  }

  byDefender.sort((a, b) => a.targetEpa ?? 0 - (b.targetEpa ?? 0));

  // League averages across defenders with non-null metrics
  const mean = (sel: (m: DbCoverageMetrics) => number | null): number | null => {
    const vals = byDefender.map(sel).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
  };

  return {
    byDefender,
    leagueAverages: {
      targetEpa: mean((m) => m.targetEpa),
      yardsPerCoverageSnap: mean((m) => m.yardsPerCoverageSnap),
      completionPctAllowed: mean((m) => m.completionPctAllowed),
      passerRatingAllowed: mean((m) => m.passerRatingAllowed),
    },
    playsUsed,
    playsSkipped,
  };
}

/**
 * Standard NFL passer rating. Components are clamped to [0, 2.375]
 * per the official formula. Returns null when attempts = 0.
 */
export function nflPasserRating(
  attempts: number,
  completions: number,
  yards: number,
  touchdowns: number,
  interceptions: number,
): number | null {
  if (!Number.isFinite(attempts) || attempts <= 0) return null;
  const a = Math.min(
    2.375,
    Math.max(0, (completions / attempts - 0.3) * 5),
  );
  const b = Math.min(2.375, Math.max(0, (yards / attempts - 3) * 0.25));
  const c = Math.min(2.375, Math.max(0, (touchdowns / attempts) * 20));
  const d = Math.min(2.375, Math.max(0, 2.375 - (interceptions / attempts) * 25));
  return ((a + b + c + d) / 6) * 100;
}

/**
 * Man vs zone EPA split for a defender. Returns nulls when a side has
 * no data — never imputed.
 */
export function manZoneSplit(
  plays: readonly TargetPlay[],
  defenderId: string,
): {
  readonly manEpa: number | null;
  readonly zoneEpa: number | null;
  readonly manTargets: number;
  readonly zoneTargets: number;
} {
  let manSum = 0;
  let manN = 0;
  let zoneSum = 0;
  let zoneN = 0;

  for (const p of plays) {
    if (p.defenderId !== defenderId || !p.wasTargeted) continue;
    if (p.epa === null || !Number.isFinite(p.epa)) continue;
    if (p.coverageType === "MAN") {
      manSum += p.epa;
      manN += 1;
    } else if (p.coverageType === "ZONE") {
      zoneSum += p.epa;
      zoneN += 1;
    }
  }

  return {
    manEpa: manN > 0 ? Number((manSum / manN).toFixed(4)) : null,
    zoneEpa: zoneN > 0 ? Number((zoneSum / zoneN).toFixed(4)) : null,
    manTargets: manN,
    zoneTargets: zoneN,
  };
}
