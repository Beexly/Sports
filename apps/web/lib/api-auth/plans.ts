export type ApiPlanId = "shadow_free" | "shadow_partner" | "shadow_enterprise";

export interface ApiPlan {
  readonly id: ApiPlanId;
  readonly monthlyQuota: number;
  readonly burstPerMinute: number;
  readonly allowedScopes: readonly string[];
  readonly liveBillingEnabled: false;
}

export const API_AUTH_PLANS: readonly ApiPlan[] = [
  { allowedScopes: ["evidence:read"], burstPerMinute: 30, id: "shadow_free", liveBillingEnabled: false, monthlyQuota: 250 },
  { allowedScopes: ["evidence:read", "signals:read", "metrics:read"], burstPerMinute: 120, id: "shadow_partner", liveBillingEnabled: false, monthlyQuota: 5000 },
  { allowedScopes: ["evidence:read", "signals:read", "metrics:read", "revenue:read"], burstPerMinute: 300, id: "shadow_enterprise", liveBillingEnabled: false, monthlyQuota: 25000 },
] as const;

export function apiPlan(id: ApiPlanId): ApiPlan {
  return API_AUTH_PLANS.find((plan) => plan.id === id) ?? API_AUTH_PLANS[0]!;
}
