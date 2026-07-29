/**
 * Hydrate-force order — monorepo wiring checklist as executable policy.
 */

export type HydrateStep = {
  order: number;
  id: string;
  action: string;
  plane: "cold_p" | "hot_q" | "entitlement" | "online_store" | "gate";
  oddsApiRequired: boolean;
  liveBoardRequired: boolean;
  status: "CODE_READY" | "FOUNDER_WIRE" | "MULTI_INSTANCE";
};

export const HYDRATE_FORCE_STEPS: readonly HydrateStep[] = [
  {
    order: 1,
    id: "pgs_write_through",
    action: "PlayerGameStat → memory write_through via /api/cron/hydrate-cold-plane (feeds p cold plane)",
    plane: "cold_p",
    oddsApiRequired: false,
    liveBoardRequired: false,
    status: "CODE_READY",
  },
  {
    order: 2,
    id: "gamma_cron_delta",
    action: "refresh-gamma → cron_delta (feeds q hot plane; Odds API optional)",
    plane: "hot_q",
    oddsApiRequired: false,
    liveBoardRequired: false,
    status: "CODE_READY",
  },
  {
    order: 3,
    id: "stripe_tier_values",
    action: "Session Stripe tier on /values (not only ?tier=) — wired resolveStatsBillingTier",
    plane: "entitlement",
    oddsApiRequired: false,
    liveBoardRequired: false,
    status: "CODE_READY",
  },
  {
    order: 4,
    id: "redis_online",
    action: "Redis online store when multi-instance (memory is single-process)",
    plane: "online_store",
    oddsApiRequired: false,
    liveBoardRequired: false,
    status: "MULTI_INSTANCE",
  },
  {
    order: 5,
    id: "gate_ready",
    action:
      "Selective gate ← evaluateFireAuthority (publicFire) + dual-asOf before public fire",
    plane: "gate",
    oddsApiRequired: false,
    liveBoardRequired: false,
    status: "CODE_READY",
  },
] as const;

export function nextHydrateAction(
  completedIds: readonly string[],
): HydrateStep | null {
  for (const s of HYDRATE_FORCE_STEPS) {
    if (!completedIds.includes(s.id)) return s;
  }
  return null;
}

export function hydrateReadiness(completedIds: readonly string[]) {
  const done = HYDRATE_FORCE_STEPS.filter((s) =>
    completedIds.includes(s.id),
  ).length;
  return {
    done,
    total: HYDRATE_FORCE_STEPS.length,
    pct: Math.round((100 * done) / HYDRATE_FORCE_STEPS.length),
    next: nextHydrateAction(completedIds),
    oddsStillOptional: true as const,
  };
}
