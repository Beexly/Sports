/**
 * Math & numerical toolkit barrel — namespaced re-exports of every pure library in
 * this directory. Part of the Galaxy Sports Edge cohesive analytics layer.
 *
 * Usage: import { bankroll } from '@/lib/math';
 *
 * 36 modules. Namespaced (export * as) so identically-named helpers
 * across libraries (e.g. dkProjection) never collide.
 */

export * as bankroll from './bankroll';
export * as bayesianBlend from './bayesian-blend';
export * as calculus from './calculus';
export * as clustering from './clustering';
export * as combinatorics from './combinatorics';
export * as complexNumbers from './complex-numbers';
export * as conformal from './conformal';
export * as devig from './devig';
export * as dixonColes from './dixon-coles';
export * as easing from './easing';
export * as eloRating from './elo-rating';
export * as entropy from './entropy';
export * as financialMath from './financial-math';
export * as gameTheory from './game-theory';
export * as geometry from './geometry';
export * as graphUtils from './graph-utils';
export * as informationTheory from './information-theory';
export * as interpolation from './interpolation';
export * as kelly from './kelly';
export * as lineMovementClassify from './line-movement-classify';
export * as linearAlgebra from './linear-algebra';
export * as matrix from './matrix';
export * as numberTheory from './number-theory';
export * as numericalMethods from './numerical-methods';
export * as oddsFormat from './odds-format';
export * as optimization from './optimization';
export * as poissonModel from './poisson-model';
export * as probabilityDistributions from './probability-distributions';
export * as probability from './probability';
export * as regression from './regression';
export * as signalProcessing from './signal-processing';
export * as spring from './spring';
export * as staking from './staking';
export * as statisticsAdvanced from './statistics-advanced';
export * as statistics from './statistics';
export * as timeSeries from './time-series';
