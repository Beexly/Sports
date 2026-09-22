/**
 * Beep-style multivariate pattern mining for NFL drives — arXiv 2307.11780v2
 * ("Beep: Balancing Effectiveness and Efficiency when Finding Multivariate
 * Patterns in Racket Sports").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Not wired into any matchup-model path (wiring changes model inputs and
 * is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: adapt hit->NFL play, rally->drive. Attributes = {down,
 * distance-bucket, personnel, formation, play-type (run/pass + direction/
 * gap or route concept), result-bucket (EPA bin), quarter,
 * score-differential bucket}; continuous values discretized into quantile
 * bins. Run per (team x phase) over 2023-2026 play-by-play (e.g. opponent
 * defensive play-calling when leading/trailing), outputting a pattern set
 * per opponent for the weekly scout report. Supervised-MDL variant: score
 * candidate patterns not only by description-length reduction but by
 * outcome association — bonus term lambda*|E[EPA | pattern] - E[EPA]| —
 * turning unsupervised tendency mining into a weakly-supervised edge
 * detector for matchup modeling.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT-accept iff on 2025 held-out
 * drives Beep achieves Delta-L% >= 15% vs singleton baseline AND |P| <= 60
 * patterns per team-season with runtime <= 30 min per team-season.
 */

export interface Drive {
  readonly driveId: string;
  /** Discretized attributes (down, personnel, formation, ...). */
  readonly attributes: Readonly<Record<string, string>>;
  readonly epa: number;
}

export interface Pattern {
  /** Attribute constraints, e.g. { personnel: "11", down: "2" }. */
  readonly constraints: Readonly<Record<string, string>>;
  readonly support: number; // drives matching
  readonly descriptionLength: number; // bits
}

/**
 * Discretize continuous values into k quantile bins: returns bin indices
 * 0..k-1 aligned with the input order.
 */
export function quantileBins(values: readonly number[], k: number): number[] {
  const n = values.length;
  if (n === 0 || k <= 0) return [];
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(n);
  for (let r = 0; r < n; r++) {
    out[order[r]!.i] = Math.min(k - 1, Math.floor((r * k) / n));
  }
  return out;
}

/** Does a drive satisfy a pattern's constraints? */
export function matchesPattern(drive: Drive, pattern: Pick<Pattern, "constraints">): boolean {
  return Object.entries(pattern.constraints).every(
    ([attr, val]) => drive.attributes[attr] === val,
  );
}

/** Support count of a pattern over drives. */
export function patternSupport(
  pattern: Pick<Pattern, "constraints">,
  drives: ReadonlyArray<Drive>,
): number {
  return drives.filter((d) => matchesPattern(d, pattern)).length;
}

/**
 * Delta-L% vs the singleton baseline: 1 - DL(patterns)/DL(singleton).
 * The gate requires >= 15%.
 */
export function descriptionLengthGain(patternDL: number, singletonDL: number): number {
  if (!(singletonDL > 0)) return 0;
  return 1 - patternDL / singletonDL;
}

/** Mean EPA over a set of drives. */
export function meanEpa(drives: ReadonlyArray<Drive>): number {
  if (drives.length === 0) return 0;
  return drives.reduce((a, d) => a + d.epa, 0) / drives.length;
}

/**
 * Supervised-MDL score: description-length gain plus the outcome
 * association bonus lambda*|E[EPA|pattern] - E[EPA]|. Higher is better.
 */
export function supervisedMdlScore(
  dlGain: number,
  meanEpaPattern: number,
  meanEpaOverall: number,
  lambda: number,
): number {
  return dlGain + lambda * Math.abs(meanEpaPattern - meanEpaOverall);
}

/**
 * Rank pre-enumerated candidate patterns by supervised-MDL score,
 * keeping the top `maxPatterns` (analyst-manageable: gate |P| <= 60).
 */
export function topPatternsByScore(
  candidates: ReadonlyArray<Pattern>,
  drives: ReadonlyArray<Drive>,
  singletonDL: number,
  lambda: number,
  maxPatterns = 60,
): Array<Pattern & { readonly score: number }> {
  const overall = meanEpa(drives);
  const totalDL = candidates.reduce((a, p) => a + p.descriptionLength, 0);
  const dlGain = descriptionLengthGain(totalDL, singletonDL);
  return candidates
    .map((p) => {
      const matched = drives.filter((d) => matchesPattern(d, p));
      return {
        ...p,
        score: supervisedMdlScore(dlGain, meanEpa(matched), overall, lambda),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPatterns);
}
