/**
 * @sports/verifier — frozen-holdout harness (LAST_PLAN §4.2).
 *
 * Core modules: holdout, scorecard, duel, joint, factgraph.
 * Loaders (C-395) share the package. No database access.
 */

export * from "./types";
export * from "./stats";
export * from "./holdout";
export * from "./scorecard";
export * from "./duel";
export * from "./joint";
export * from "./factgraph";
export * from "./loaders/nflverse-releases";
