
/** False alarm ratio at the threshold: FA / (FA + hits). */
export function falseAlarmRatio(
  forecasts: readonly number[],
  actuals: readonly number[],
  threshold: number,
): number {
  if (forecasts.length !== actuals.length || forecasts.length === 0) {
    throw new Error("inverse-far-blending: aligned non-empty series required");
  }
  let fa = 0;
  let hits = 0;
  for (let i = 0; i < forecasts.length; i++) {
    const f = (forecasts[i] ?? 0) >= threshold;
    const a = (actuals[i] ?? 0) >= threshold;
    if (f && a) hits++;
    else if (f && !a) fa++;
  }
  if (fa + hits === 0) return 0.5; // no alarm events: neutral
  return fa / (fa + hits);
}

/** Blend weights proportional to 1/FAR (smoothed). */
export function inverseFarWeights(fars: readonly number[], smooth = 0.05): number[] {
  if (fars.length === 0) throw new Error("inverse-far-blending: need >= 1 FAR");
  const inv = fars.map((f) => 1 / (Math.min(Math.max(f, 0), 1) + smooth));
  const sum = inv.reduce((s, v) => s + v, 0);
  return inv.map((v) => v / sum);
}

/** Blend model forecasts with the given weights. */
export function blendForecasts(modelForecasts: readonly (readonly number[])[], weights: readonly number[]): number[] {
  if (modelForecasts.length !== weights.length || modelForecasts.length === 0) {
    throw new Error("inverse-far-blending: aligned non-empty inputs required");
  }
  const n = modelForecasts[0]?.length ?? 0;
  return Array.from({ length: n }, (_, i) =>
    modelForecasts.reduce((s, m, k) => s + (weights[k] ?? 0) * (m[i] ?? 0), 0),
  );
}
