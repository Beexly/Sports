/**
 * YoY EPA Persistence — a deterministic SHADOW metric.
 *
 * Computes for each team, current-season EPA/play against prior-season EPA/play,
 * with a shrunk estimate pulling the current figure toward the prior-season figure.
 * The defensive EPA-allowed mirror is included (not negated).
 *
 * Point-in-time validity: the prior season is complete before the target season starts,
 * so a full prior season is point-in-time valid at any target in the target season.
 */

import { mean } from "./numeric.js";
import {
  computeFeatureSchemaHash,
  type ExpectedMetricProvenance,
} from "./types.js";

/** One scrimmage play for YoY persistence tracking. */
export interface YoyPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly playType: "pass" | "run";
  /** OWN EPA (null if unratable or not yet attached). */
  readonly epa: number | null;
}

export const YOY_PERSISTENCE_SHRINKAGE_K = 200;

export interface YoyTeamSidePersistence {
  readonly teamId: string;
  readonly currentEpaPerPlay: number | null;
  readonly priorEpaPerPlay: number | null;
  readonly deltaEpaPerPlay: number | null;
  readonly currentPlays: number;
  readonly priorPlays: number;
  readonly shrunkEpaPerPlay: number | null;
}

export interface YoyPersistenceResult {
  readonly offense: readonly YoyTeamSidePersistence[];
  readonly defense: readonly YoyTeamSidePersistence[];
  readonly provenance: ExpectedMetricProvenance & {
    readonly excludedEpaNullPlays: number;
  };
}

export function computeYoyEpaPersistence(
  plays: readonly YoyPlay[],
  targetSeason: number,
  targetWeek: number,
): YoyPersistenceResult {
  let excludedEpaNullPlays = 0;

  const currentOffenseEpas = new Map<string, number[]>();
  const priorOffenseEpas = new Map<string, number[]>();
  const currentDefenseEpas = new Map<string, number[]>();
  const priorDefenseEpas = new Map<string, number[]>();
  const teams = new Set<string>();

  for (const p of plays) {
    if (p.epa === null) {
      excludedEpaNullPlays++;
      continue;
    }

    teams.add(p.posteam);
    teams.add(p.defteam);

    if (p.season === targetSeason && p.week < targetWeek) {
      let co = currentOffenseEpas.get(p.posteam);
      if (!co) {
        co = [];
        currentOffenseEpas.set(p.posteam, co);
      }
      co.push(p.epa);

      let cd = currentDefenseEpas.get(p.defteam);
      if (!cd) {
        cd = [];
        currentDefenseEpas.set(p.defteam, cd);
      }
      cd.push(p.epa);
    } else if (p.season === targetSeason - 1) {
      let po = priorOffenseEpas.get(p.posteam);
      if (!po) {
        po = [];
        priorOffenseEpas.set(p.posteam, po);
      }
      po.push(p.epa);

      let pd = priorDefenseEpas.get(p.defteam);
      if (!pd) {
        pd = [];
        priorDefenseEpas.set(p.defteam, pd);
      }
      pd.push(p.epa);
    }
  }

  const K = YOY_PERSISTENCE_SHRINKAGE_K;

  const offense: YoyTeamSidePersistence[] = [];
  const defense: YoyTeamSidePersistence[] = [];

  for (const team of Array.from(teams).sort()) {
    const co = currentOffenseEpas.get(team) || [];
    const po = priorOffenseEpas.get(team) || [];
    const cd = currentDefenseEpas.get(team) || [];
    const pd = priorDefenseEpas.get(team) || [];

    const coPlays = co.length;
    const poPlays = po.length;
    const cdPlays = cd.length;
    const pdPlays = pd.length;

    let oCurrent: number | null = null;
    let oPrior: number | null = null;
    let oDelta: number | null = null;
    let oShrunk: number | null = null;

    if (coPlays >= K && poPlays >= K) {
      oCurrent = mean(co);
      oPrior = mean(po);
      oDelta = oCurrent - oPrior;
      oShrunk = (coPlays * oCurrent + K * oPrior) / (coPlays + K);
    }

    offense.push({
      teamId: team,
      currentEpaPerPlay: oCurrent,
      priorEpaPerPlay: oPrior,
      deltaEpaPerPlay: oDelta,
      currentPlays: coPlays,
      priorPlays: poPlays,
      shrunkEpaPerPlay: oShrunk,
    });

    let dCurrent: number | null = null;
    let dPrior: number | null = null;
    let dDelta: number | null = null;
    let dShrunk: number | null = null;

    if (cdPlays >= K && pdPlays >= K) {
      dCurrent = mean(cd);
      dPrior = mean(pd);
      dDelta = dCurrent - dPrior;
      dShrunk = (cdPlays * dCurrent + K * dPrior) / (cdPlays + K);
    }

    defense.push({
      teamId: team,
      currentEpaPerPlay: dCurrent,
      priorEpaPerPlay: dPrior,
      deltaEpaPerPlay: dDelta,
      currentPlays: cdPlays,
      priorPlays: pdPlays,
      shrunkEpaPerPlay: dShrunk,
    });
  }

  const featureKeys = ["season", "week", "posteam", "defteam", "epa"];
  return {
    offense,
    defense,
    provenance: {
      modelVersion: "gse-yoy-persistence-v1",
      method: "deterministic-rule",
      featureKeys,
      featureSchemaHash: computeFeatureSchemaHash(featureKeys),
      sampleSize: plays.length - excludedEpaNullPlays,
      excludedEpaNullPlays,
    },
  };
}
