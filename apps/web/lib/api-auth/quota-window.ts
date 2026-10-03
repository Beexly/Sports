export interface QuotaWindowInput {
  readonly used: number;
  readonly limit: number;
  readonly cost?: number;
}

export interface QuotaWindowDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly nextUsed: number;
  readonly reason: string | null;
}

export function evaluateQuotaWindow(input: QuotaWindowInput): QuotaWindowDecision {
  const cost = Math.max(1, input.cost ?? 1);
  const remaining = Math.max(0, input.limit - input.used);
  if (remaining < cost) {
    return {
      allowed: false,
      nextUsed: input.used,
      reason: "quota_exhausted",
      remaining,
    };
  }
  return {
    allowed: true,
    nextUsed: input.used + cost,
    reason: null,
    remaining: remaining - cost,
  };
}
