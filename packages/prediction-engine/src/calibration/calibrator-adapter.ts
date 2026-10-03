/**
 * Connects a FITTED isotonic map to the `calibrator` seam in `edge-engine.ts`.
 *
 * WHY A SEPARATE ADAPTER
 * ----------------------
 * Two independently built pieces have to meet here:
 *
 *   - `isotonic-calibration.ts` fits a monotone map from settled picks and
 *     applies it through `applyIsotonicMap(map, published)`.
 *   - `edge-engine.ts` accepts an optional `calibrator: { predict(p): number }`
 *     and applies it to the blended probability BEFORE any edge is derived.
 *
 * Neither imports the other, so nothing in the repo proves they compose. This
 * module is the one place that asserts they do, and it is the only sanctioned
 * way to hand a fitted map to the engine.
 *
 * THE LAW: ABSENT MEANS UNCHANGED
 * -------------------------------
 * `calibratorFromIsotonicMap` accepts `null` and returns `null`. The engine
 * already treats an absent calibrator as "publish the raw blend", so a caller
 * with no fitted map behaves byte-identically to a caller on an older build.
 * There is no default map, no fallback map, and no identity map smuggled in
 * under a different name: an identity calibrator would be indistinguishable
 * from "no calibration" while looking like calibration was applied, which is
 * the dishonest direction.
 *
 * WHY NOT JUST PASS `applyIsotonicMap` DIRECTLY
 * ---------------------------------------------
 * Because `applyIsotonicMap(map, p)` takes the map as its first argument, while
 * the seam wants a single-argument `predict(p)`. Handing the engine a
 * two-argument function and relying on a partial application would type-check
 * as a compatible shape while silently passing the probability in the map slot.
 * The binding is made explicitly here so a signature change becomes a compile
 * error instead of a runtime miscalibration.
 */
import { applyIsotonicMap, type IsotonicMap } from "./isotonic-calibration.js";

/**
 * The exact shape `edge-engine.ts` and `scoring.ts` accept. Declared locally
 * rather than imported so this module has no dependency on the engine and can
 * be tested on its own. The engine's parameter is structurally compatible.
 */
export interface Recalibrator {
  readonly predict: (p: number) => number;
}

/**
 * Bind a fitted map to the engine's calibrator contract.
 *
 * Returns `null` for a null map so the caller can pass the result straight
 * through: a caller with no map gets `null` and the engine publishes the raw
 * blend, which is the conservative direction and the pre-seam behaviour.
 *
 * The returned function re-throws on a lookup that leaves the fitted range,
 * because `edge-engine.ts` already treats a throwing calibrator as a REFUSAL
 * and falls back to the uncalibrated value. Swallowing the error here would
 * turn "the map cannot speak for this probability" into a silent wrong number.
 */
export function calibratorFromIsotonicMap(map: IsotonicMap | null): Recalibrator | null {
  if (map === null) return null;
  return {
    predict: (p: number) => applyIsotonicMap(map, p),
  };
}
