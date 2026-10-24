/**
 * Sinkhorn-Knopp target reallocation for the Coach-First simulator.
 * Pure Class A. No OddsInput, no market tokens.
 *
 * Cost matrix C_ij integrates:
 * - FTN CB shadow rates (L2a)
 * - Nickel CB slot resistance
 * - ILB spine voids funneling targets to TE/RB seams
 * - Contract milestone force-feed multipliers
 */

export interface EligibleTarget {
  playerId: string;
  role: "WR1" | "WR2" | "SLOT" | "TE" | "RB";
  baseShare: number;
  shadowRate?: number; // 0-1, higher = more covered
  contractMultiplier?: number; // >1 if near bonus threshold
}

export interface TargetAllocation {
  playerId: string;
  share: number;
  cost: number;
}

export function allocateTargets(
  targets: EligibleTarget[],
  epsilon = 0.05,
): TargetAllocation[] {
  if (targets.length === 0) return [];

  const costs = targets.map((t) => {
    const shadowPenalty = (t.shadowRate ?? 0) * 2.0;
    const contractBoost = (t.contractMultiplier ?? 1.0) - 1.0;
    const roleBase = t.role === "WR1" ? 0.8 : t.role === "SLOT" ? 1.1 : 1.0;
    return roleBase + shadowPenalty - contractBoost;
  });

  // Softmax-style allocation (Sinkhorn approximation for single-step)
  const weights = costs.map((c) => Math.exp(-c / epsilon));
  const total = weights.reduce((s, w) => s + w, 0);

  return targets.map((t, i) => ({
    playerId: t.playerId,
    share: weights[i]! / total,
    cost: costs[i]!,
  }));
}

export function applyShadowHaircut(
  allocation: TargetAllocation[],
  shadows: Array<{ wr: string; shadowRate: number }>,
): TargetAllocation[] {
  return allocation.map((a) => {
    const shadow = shadows.find((s) => s.wr === a.playerId);
    if (!shadow || shadow.shadowRate < 0.55) return a;
    return { ...a, share: a.share * (1 - shadow.shadowRate * 0.3) };
  });
}
