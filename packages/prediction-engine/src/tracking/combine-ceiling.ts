/**
 * Combine ceiling versus in-game speed.
 *
 * Prior art: conormalone/BDB27 states the question in its README (10 Hz
 * Combine tracking as a ceiling on NFL max-effort routes). That repo has
 * no licence, so none of its code was copied. This is an original
 * definition. It does not claim Combine athleticism predicts NFL success.
 */

export function combineSpeedCeiling(drillSpeeds: readonly number[]): number | null {
  const finite = drillSpeeds.filter((s) => Number.isFinite(s) && s >= 0);
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

export function exceedanceRate(
  gameSpeeds: readonly number[],
  ceiling: number | null,
): number | null {
  if (ceiling === null || !Number.isFinite(ceiling) || ceiling <= 0) return null;
  const finite = gameSpeeds.filter((s) => Number.isFinite(s) && s >= 0);
  if (finite.length === 0) return null;
  return finite.filter((s) => s > ceiling).length / finite.length;
}

export function ceilingCloseness(
  gamePeak: number,
  ceiling: number | null,
): number | null {
  if (ceiling === null || !Number.isFinite(ceiling) || ceiling <= 0) return null;
  if (!Number.isFinite(gamePeak) || gamePeak < 0) return null;
  return gamePeak / ceiling;
}
