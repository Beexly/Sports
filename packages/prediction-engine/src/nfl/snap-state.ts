/**
 * What the closing line has already priced, and what it cannot price.
 *
 * Team-week motion, play-action, and EPA were correlated with the closing-spread
 * residual on 672 games, weeks 4+, 2023-2025. Those correlations are about zero.
 * The same events at the snap are not zero. Scoring does not read this module.
 * A pre-game average of these rates is not a side.
 */

export const PREGAME_SPREAD_CORRELATION = {
  games: 672,
  seasons: [2023, 2024, 2025],
  minWeek: 4,
  motionDiff: 0.001,
  playActionDiff: 0.031,
  epaDiff: 0.05,
} as const;

export interface SnapCell {
  n: number;
  epa: number;
}

const SHELL: Record<string, SnapCell> = {
  "0-0-single": { n: 13336, epa: -0.002 },
  "0-0-two": { n: 11878, epa: 0.013 },
  "0-1-single": { n: 2871, epa: 0.091 },
  "0-1-two": { n: 1619, epa: 0.056 },
  "1-0-single": { n: 11295, epa: 0.029 },
  "1-0-two": { n: 8931, epa: 0.007 },
  "1-1-single": { n: 5232, epa: 0.173 },
  "1-1-two": { n: 3044, epa: 0.088 },
};

const PRESSURE: Record<string, SnapCell> = {
  "0-0": { n: 27711, epa: 0.278 },
  "0-1": { n: 11018, epa: -0.137 },
  "1-0": { n: 11523, epa: 0.097 },
  "1-1": { n: 1015, epa: -0.074 },
};

export function snapStateEpa(motion: boolean, playAction: boolean, shell: "single" | "two"): SnapCell {
  const key = `${motion ? 1 : 0}-${playAction ? 1 : 0}-${shell}`;
  return SHELL[key];
}

/** quick is time-to-throw under 2.0 seconds. */
export function pressureStateEpa(quick: boolean, pressure: boolean): SnapCell {
  return PRESSURE[`${quick ? 1 : 0}-${pressure ? 1 : 0}`];
}

/** A feature the close already contains may not move a side. */
export function pregameFeatureIsPriced(name: "motion" | "playAction" | "epa"): boolean {
  const r = {
    motion: PREGAME_SPREAD_CORRELATION.motionDiff,
    playAction: PREGAME_SPREAD_CORRELATION.playActionDiff,
    epa: PREGAME_SPREAD_CORRELATION.epaDiff,
  }[name];
  return Math.abs(r) < 0.1;
}
