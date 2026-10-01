/**
 * Engine input adapter: film features → the exact input shapes the
 * props / fantasy / pick lanes already accept.
 *
 * COMPOSITION RULE: this module adapts; it never forks the engine.
 * The lanes' input types (RollingRoleFeatures, GScoreInputs, …) are
 * imported from their home modules and returned untouched in shape.
 *
 * Each adapter returns a CONTROL / TREATMENT pair:
 *   control   — the lane's inputs exactly as the engine runs them today.
 *   treatment — the same shape with film-derived overrides applied.
 * The shadow harness runs the engine on both and applies the treatment
 * at weight 0 (see film-priors.blendProbability). Nothing here changes
 * a published number.
 *
 * Original implementation for GSE.
 */

import type {
  PlayerRoleContext,
  RollingRoleFeatures,
} from "../props/anytime-td-mit.js";
import type { GScoreInputs } from "../fantasy/g-score.js";
import type { PlayerFilmFeatures } from "./player-film-features.js";
import type { TeamFilmFeatures } from "./team-film-features.js";
import { passLeanBySituation } from "./team-film-features.js";
import {
  anytimeTdPrior,
  receivingYardsPrior,
  type FilmPropPrior,
} from "./film-priors.js";
import { filmProvenance, type FilmProvenance } from "./film-provenance.js";

/** Control/treatment pair for one lane invocation. */
export interface InputPair<T> {
  readonly control: T;
  readonly treatment: T;
  /** What the film changed, for the audit trail. */
  readonly filmAdjustments: Readonly<Record<string, number | null>>;
  readonly provenance: FilmProvenance;
}

export interface PropsAdapterOutput {
  readonly pair: InputPair<RollingRoleFeatures>;
  /** Film priors for the two wired prop markets (weight 0). */
  readonly priors: readonly FilmPropPrior[];
  readonly featuresUsed: readonly string[];
}

/**
 * Dominant formation target share: the player's biggest share across
 * formation families — a usage proxy the props lane can consume.
 */
function dominantTargetShare(pf: PlayerFilmFeatures): number | null {
  const shares = Object.values(pf.targetShareByFormation);
  if (shares.length === 0) return null;
  return Math.max(...shares);
}

/**
 * Adapt player film features to the props lane's RollingRoleFeatures.
 * Film overrides ONLY the fields it genuinely measures (usage share,
 * red-zone share); box-score fields pass through untouched.
 */
export function toPropsInputs(
  pf: PlayerFilmFeatures | null,
  base: RollingRoleFeatures,
): PropsAdapterOutput {
  const featuresUsed = [
    "position_base_rate",
    "snapShare",
    "redZoneShare",
    "usageShare",
    "oppTdRateAllowed",
    "injuryStatus",
    "isHome",
    "film:targetShareByFormation",
    "film:redZoneRouteShare",
    "film:separation",
  ];

  if (!pf) {
    return {
      pair: {
        control: base,
        treatment: base,
        filmAdjustments: {},
        provenance: filmProvenance(0, 0),
      },
      priors: [],
      featuresUsed,
    };
  }

  const usageShare = dominantTargetShare(pf);
  const redZoneShare = pf.redZoneRouteShare;
  const treatment: RollingRoleFeatures = {
    ...base,
    // Film-measured overrides. Box-score fields (snapShare,
    // teamPlaysPerGame, oppTdRateAllowed) pass through untouched.
    usageShare: usageShare ?? base.usageShare,
    redZoneShare: redZoneShare ?? base.redZoneShare,
  };

  return {
    pair: {
      control: base,
      treatment,
      filmAdjustments: {
        usageShare: treatment.usageShare,
        redZoneShare: treatment.redZoneShare,
      },
      provenance: pf.provenance,
    },
    priors: [receivingYardsPrior(pf), anytimeTdPrior(pf)],
    featuresUsed,
  };
}

/** Film adjustments to G-score fantasy inputs (mu/tau), weight 0. */
export interface FantasyFilmAdjustment {
  /** Additive adjustment to weekly-mean mu. */
  readonly muAdjust: number;
  /** Additive adjustment to week-to-week SD tau. */
  readonly tauAdjust: number;
  readonly rationale: string;
  readonly provenance: FilmProvenance;
}

/**
 * Adapt player film features to fantasy valuation.
 * Separation above the ~2.5yd baseline lifts expected efficiency (mu);
 * a concentrated route mix (few routes, high shares) raises week-to-week
 * variance (tau). Both UNCALIBRATED heuristics.
 */
export function toFantasyInputs(
  pf: PlayerFilmFeatures | null,
): FantasyFilmAdjustment {
  if (!pf) {
    return {
      muAdjust: 0,
      tauAdjust: 0,
      rationale: "no film features; zero adjustment",
      provenance: filmProvenance(0, 0),
    };
  }
  const sep = pf.avgSepAtCatchYd ?? 2.5;
  const mixValues = Object.values(pf.routeMix);
  const concentration =
    mixValues.length > 0 ? Math.max(...mixValues) : 0;

  const muAdjust = Math.round(0.15 * (sep - 2.5) * 100) / 100;
  const tauAdjust = Math.round(0.5 * (concentration - 0.4) * 100) / 100;

  return {
    muAdjust,
    tauAdjust,
    rationale: `sep@catch ${sep}yd vs 2.5 baseline; route concentration ${concentration}`,
    provenance: pf.provenance,
  };
}

/** Apply a fantasy film adjustment to G-score inputs (shadow only). */
export function applyFantasyAdjustment(
  base: GScoreInputs,
  adj: FantasyFilmAdjustment,
): { control: GScoreInputs; treatment: GScoreInputs } {
  return {
    control: base,
    treatment: {
      ...base,
      mu: base.mu + adj.muAdjust,
      tau: Math.max(0.01, base.tau + adj.tauAdjust),
    },
  };
}

/** Team film features adapted for the spread/total pick lanes. */
export interface PickFilmInputs {
  readonly team: string;
  /** P(pass | situation) from film, sparse cells null. */
  readonly passLeanBySituation: Readonly<Record<string, number | null>>;
  /** "personnel|distribution" → share. */
  readonly formationFreq: Readonly<Record<string, number>>;
  readonly playActionRate: number | null;
  readonly hurryUpRate: number | null;
  readonly provenance: FilmProvenance;
}

/** Adapt team film features to the pick lanes. */
export function toPickInputs(tf: TeamFilmFeatures | null): PickFilmInputs | null {
  if (!tf) return null;
  return {
    team: tf.team,
    passLeanBySituation: passLeanBySituation(tf),
    formationFreq: tf.formationFreq,
    playActionRate: tf.playActionRate,
    hurryUpRate: tf.hurryUpRate,
    provenance: tf.provenance,
  };
}

/** Re-export the context type the props lane consumes. */
export type { PlayerRoleContext };
