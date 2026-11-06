/**
 * Engine constants — PR #867 (Hermes Lane B).
 *
 * Canonical numeric knobs for independent fair-value paths. Live paths that
 * consume these are MODEL_VERSION-affecting: bumping a constant that feeds a
 * priced path requires a CalibrationProposal IMPLEMENTED artifact and a
 * founder MODEL_VERSION bump (scripts/guardrails/model-freeze.mjs). Agents
 * land the constants; they do not weaken the freeze guard.
 */

/** Margin→probability logistic residual scale used by independent NFL paths (points). */
export const SCALE_CONSTANT = 45.42;

/** Home-field advantage in football points (PowerIndex / FPI units). */
export const HFA_POINTS = 2.1;

/** Minimum games of NFL efficiency history before the EPA path opines. */
export const NFL_EPA_MIN_GAMES = 4;
