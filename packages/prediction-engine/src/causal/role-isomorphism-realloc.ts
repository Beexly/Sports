/**
 * @file role-isomorphism-realloc.ts
 * Role-Isomorphism Target Reallocation Tensor (Component 12).
 *
 * Implements:
 * W_{r_out -> r_j}(t) = [ I_role(v_route(r_out), v_route(r_j)) * exp(eta_trust * T_{q, r_j}(t)) * (1 - BracketHazard_{d, r_j}) ] / Normalizer
 *
 * Abolishes naive flat/depth-chart vacuum assumptions:
 * When Roman Wilson & Michael Pittman Jr. exit, slot/choice-route isomorphismroutes targets
 * to Germie Bernard (high isomorphism, high trust) rather than DK Metcalf (perimeter X, bracketed).
 */

export interface RouteTreeVector {
  readonly slotSnapRate: number; // 0.0 to 1.0
  readonly motionRate: number;
  readonly aDot: number; // average depth of target
  readonly choiceOptionRouteRate: number;
  readonly firstReadQuickGameShare: number;
  readonly contestedCatchRate: number;
}

export interface ReceiverCandidate {
  readonly receiverId: string;
  readonly name: string;
  readonly routeVector: RouteTreeVector;
  readonly dyadicTrustScore: number; // T_{q, r} in [-1, +1]
  readonly bracketHazard: number; // probability of being bracketed by secondary (0.0 to 1.0)
  readonly baselineTargetShare: number;
}

export interface ReallocationTransferResult {
  readonly receiverId: string;
  readonly name: string;
  readonly cosineIsomorphism: number;
  readonly trustWeight: number;
  readonly netTransferFraction: number; // sum to 1.0 across active receivers
  readonly postInjuryTargetShare: number;
}

/**
 * Computes cosine similarity between two 6-dimensional route vectors.
 */
export function computeCosineIsomorphism(a: RouteTreeVector, b: RouteTreeVector): number {
  const vA = [
    a.slotSnapRate,
    a.motionRate,
    a.aDot / 20.0, // normalize aDot ~ 10-15 yards
    a.choiceOptionRouteRate,
    a.firstReadQuickGameShare,
    a.contestedCatchRate,
  ];
  const vB = [
    b.slotSnapRate,
    b.motionRate,
    b.aDot / 20.0,
    b.choiceOptionRouteRate,
    b.firstReadQuickGameShare,
    b.contestedCatchRate,
  ];

  let dot = 0.0;
  let magA = 0.0;
  let magB = 0.0;
  for (let i = 0; i < vA.length; i++) {
    const valA = vA[i] ?? 0.0;
    const valB = vB[i] ?? 0.0;
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  if (magA === 0 || magB === 0) return 0.0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Computes the Role-Isomorphism & Dyadic Trust Target Reallocation Tensor.
 */
export function computeRoleIsomorphismTargetReallocation(
  injuredPlayer: { readonly name: string; readonly routeVector: RouteTreeVector; readonly vacatedTargetShare: number },
  activeReceivers: readonly ReceiverCandidate[],
  etaTrust = 0.8,
): readonly ReallocationTransferResult[] {
  if (activeReceivers.length === 0) return [];

  const rawScores: { receiver: ReceiverCandidate; isomorphism: number; trustMultiplier: number; unnormalized: number }[] = [];

  for (const r of activeReceivers) {
    const isomorphism = Math.max(0.01, computeCosineIsomorphism(injuredPlayer.routeVector, r.routeVector));
    const trustMultiplier = Math.exp(etaTrust * r.dyadicTrustScore);
    const bracketFactor = Math.max(0.05, 1.0 - r.bracketHazard);

    const unnormalized = isomorphism * trustMultiplier * bracketFactor;
    rawScores.push({ receiver: r, isomorphism, trustMultiplier, unnormalized });
  }

  const normalizer = rawScores.reduce((sum, item) => sum + item.unnormalized, 0.0);

  return rawScores.map((item) => {
    const transferFraction = normalizer > 0 ? item.unnormalized / normalizer : 1.0 / activeReceivers.length;
    const gainedShare = transferFraction * injuredPlayer.vacatedTargetShare;

    return {
      receiverId: item.receiver.receiverId,
      name: item.receiver.name,
      cosineIsomorphism: Math.round(item.isomorphism * 1000) / 1000,
      trustWeight: Math.round(item.trustMultiplier * 1000) / 1000,
      netTransferFraction: Math.round(transferFraction * 1000) / 1000,
      postInjuryTargetShare: Math.round((item.receiver.baselineTargetShare + gainedShare) * 1000) / 1000,
    };
  });
}
