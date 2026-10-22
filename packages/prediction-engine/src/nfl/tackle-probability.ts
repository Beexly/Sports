/**
 * Tackle Probability derivatives from the AWS/NGS video and the two
 * write-ups that sit behind it.
 *
 * Video wqvAiuC7d7U, 1:53, 2024-09-09. The blogs are
 * "Beyond the box score" and "A new take on tackling".
 *
 * Published and used here: 20 features, 11 defenders, 10 Hz, a group
 * tackle is 3 or more, efficiency is successes over attempts, downhill
 * is ahead of the ball carrier along forward progress, upfield is behind,
 * yards saved is expected minus actual, and they aimed the missed-tackle
 * rate at 15-20%.
 *
 * Not published, so not invented: the open-field radius, the chase-down
 * yard minimum, the blocker corridor width, and the metric deltas.
 * Those functions require the missing number as an argument.
 * "Primary tackler" and "forced out of bounds" were not defined beyond
 * the words. They are not implemented.
 */

export const TACKLE_FEATURES_PER_DEFENDER = 20;
export const DEFENDERS_ON_FIELD = 11;
export const TRACKING_HZ = 10;
export const GROUP_TACKLE_MIN = 3;
export const MISSED_TACKLE_RATE_BAND = { low: 0.15, high: 0.2 } as const;

export const TACKLE_DERIVATIVES = [
  "missed-tackles",
  "tackle-efficiency",
  "missed-tackles-forced",
  "group-tackles",
  "players-in-group-tackle",
  "open-field-attempts",
  "tackled-out-of-bounds",
  "primary-tackler",
  "downhill-attempts",
  "upfield-attempts",
  "chase-down-attempts",
  "missed-tackle-yards",
  "tackle-yards-saved",
  "yards-gained-in-group-tackle",
] as const;

export function tacklePlayPoints(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("duration must be finite and non-negative");
  }
  const frames = Math.round(durationSeconds * TRACKING_HZ);
  return frames * DEFENDERS_ON_FIELD * TACKLE_FEATURES_PER_DEFENDER;
}

export function tackleEfficiency(successes: number, attempts: number): number | null {
  if (!Number.isInteger(successes) || !Number.isInteger(attempts) || successes < 0 || attempts < 0) {
    throw new Error("successes and attempts must be non-negative integers");
  }
  if (successes > attempts) throw new Error("successes cannot exceed attempts");
  if (attempts === 0) return null;
  return successes / attempts;
}

export function missedTackleRateBand(rate: number): "below" | "in-band" | "above" {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error("rate must be in [0, 1]");
  if (rate < MISSED_TACKLE_RATE_BAND.low) return "below";
  if (rate > MISSED_TACKLE_RATE_BAND.high) return "above";
  return "in-band";
}

export function isGroupTackle(contributors: number): boolean {
  if (!Number.isInteger(contributors) || contributors < 0) throw new Error("contributors must be a non-negative integer");
  return contributors >= GROUP_TACKLE_MIN;
}

export type TackleApproach = "downhill" | "upfield" | "lateral";

export function tackleApproach(
  carrier: { x: number; y: number },
  defender: { x: number; y: number },
  forward: { x: number; y: number },
): TackleApproach {
  const values = [carrier.x, carrier.y, defender.x, defender.y, forward.x, forward.y];
  if (values.some((v) => !Number.isFinite(v))) throw new Error("positions must be finite");
  if (forward.x === 0 && forward.y === 0) throw new Error("forward progress must be a non-zero vector");
  const along = (defender.x - carrier.x) * forward.x + (defender.y - carrier.y) * forward.y;
  if (along > 0) return "downhill";
  if (along < 0) return "upfield";
  return "lateral";
}

export function isChaseDown(approach: TackleApproach, yardsTraveledUpfield: number, minYards: number): boolean {
  if (!Number.isFinite(yardsTraveledUpfield) || yardsTraveledUpfield < 0) {
    throw new Error("yards traveled must be finite and non-negative");
  }
  if (!Number.isFinite(minYards) || minYards <= 0) throw new Error("min yards must be finite and positive");
  return approach === "upfield" && yardsTraveledUpfield >= minYards;
}

export function isOpenField(otherDefendersWithinRadius: number): boolean {
  if (!Number.isInteger(otherDefendersWithinRadius) || otherDefendersWithinRadius < 0) {
    throw new Error("defender count must be a non-negative integer");
  }
  return otherDefendersWithinRadius === 0;
}

export function blockersBetween(
  defender: { x: number; y: number },
  carrier: { x: number; y: number },
  blockers: readonly { x: number; y: number }[],
  corridorHalfWidth: number,
): number {
  if (!Number.isFinite(corridorHalfWidth) || corridorHalfWidth < 0) {
    throw new Error("corridor half-width must be finite and non-negative");
  }
  const abx = carrier.x - defender.x;
  const aby = carrier.y - defender.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0;
  return blockers.filter((blocker) => {
    const t = ((blocker.x - defender.x) * abx + (blocker.y - defender.y) * aby) / ab2;
    if (t <= 0 || t >= 1) return false;
    const closestX = defender.x + t * abx;
    const closestY = defender.y + t * aby;
    return Math.hypot(blocker.x - closestX, blocker.y - closestY) <= corridorHalfWidth;
  }).length;
}

export function encircleQuadrants(bearingsRadians: readonly number[]): number {
  if (bearingsRadians.some((b) => !Number.isFinite(b))) throw new Error("bearings must be finite");
  const occupied = new Set(
    bearingsRadians.map((b) => {
      const wrapped = ((b % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return Math.min(3, Math.floor(wrapped / (Math.PI / 2)));
    }),
  );
  return occupied.size;
}

export function closingSpeed(
  carrier: { x: number; y: number; sx: number; sy: number },
  defender: { x: number; y: number; sx: number; sy: number },
): number {
  const dx = carrier.x - defender.x;
  const dy = carrier.y - defender.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return 0;
  return ((defender.sx - carrier.sx) * dx + (defender.sy - carrier.sy) * dy) / dist;
}

export function tackleYardsSaved(expectedYards: number, actualYards: number): number {
  if (!Number.isFinite(expectedYards) || !Number.isFinite(actualYards)) throw new Error("yards must be finite");
  return expectedYards - actualYards;
}

export function yardsBetweenTackleAttempts(yardsAtMiss: number, yardsAtNext: number): number {
  if (!Number.isFinite(yardsAtMiss) || !Number.isFinite(yardsAtNext)) throw new Error("yards must be finite");
  return yardsAtNext - yardsAtMiss;
}
