/**
 * Fractional Kelly from MULTIPROB LOWER endpoint — INTERNAL sizing only.
 * Never expose as public "recommended stake" without founder product decision.
 */

export interface KellyInput {
  pLo: number;
  decimalOdds: number;
  fraction?: number;
  maxFraction?: number;
}

export interface KellyResult {
  edge: number;
  fullKelly: number;
  fractionalKelly: number;
  capped: number;
  actionable: boolean;
  refuseReason?: string;
}

export function kellyFromLowerEndpoint(input: KellyInput): KellyResult {
  const fraction = input.fraction ?? 0.25;
  const maxFraction = input.maxFraction ?? 0.05;
  const p = input.pLo;
  const b = input.decimalOdds - 1;

  if (!(p > 0 && p < 1) || !(input.decimalOdds > 1) || !(b > 0)) {
    return {
      edge: 0,
      fullKelly: 0,
      fractionalKelly: 0,
      capped: 0,
      actionable: false,
      refuseReason: "invalid pLo or odds",
    };
  }

  const q = 1 - p;
  const edge = b * p - q;
  const fullKelly = edge > 0 ? edge / b : 0;
  const fractionalKelly = Math.max(0, fullKelly * fraction);
  const capped = Math.min(fractionalKelly, maxFraction);

  return {
    edge,
    fullKelly,
    fractionalKelly,
    capped,
    actionable: capped > 0,
    refuseReason: capped > 0 ? undefined : "no positive conservative edge",
  };
}
