/**
 * Stripe session tier entitlements — pure, no payment I/O.
 * Wire session tier into /values (not only ?tier= query spoof).
 * Founder activates Stripe; this enforces the gate honestly.
 */

export type StripeTier = "FREE" | "PRO" | "ELITE";

export const TIER_RANK: Record<StripeTier, number> = {
  FREE: 0,
  PRO: 1,
  ELITE: 2,
};

/** Map known price IDs → tier (fill real IDs in monorepo env) */
export const PRICE_TO_TIER: Record<string, StripeTier> = {
  price_gse_pro_monthly: "PRO",
  price_gse_pro_annual: "PRO",
  price_gse_elite_monthly: "ELITE",
  price_gse_elite_annual: "ELITE",
};

export interface SessionClaims {
  /** From Stripe Checkout / Customer portal subscription */
  stripePriceId?: string | null;
  /** Explicit claim after webhook verify — preferred */
  stripeTier?: StripeTier | null;
  /** Query param spoof — never sole authority */
  queryTier?: string | null;
  /** Staff override */
  role?: "user" | "staff" | "service";
}

export function normalizeTier(raw: string | null | undefined): StripeTier | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (u === "FREE" || u === "PRO" || u === "ELITE") return u;
  return null;
}

/**
 * Resolve effective tier. Session/webhook claim beats query.
 * Query alone can only raise display hints — not entitlement —
 * unless allowQueryOnly (dev simulator).
 */
export function resolveSessionTier(
  session: SessionClaims,
  opts: { allowQueryOnly?: boolean } = {},
): { tier: StripeTier; source: string; spoofBlocked: boolean } {
  if (session.role === "staff" || session.role === "service") {
    return { tier: "ELITE", source: "role", spoofBlocked: false };
  }
  if (session.stripeTier) {
    return { tier: session.stripeTier, source: "session.stripeTier", spoofBlocked: false };
  }
  if (session.stripePriceId && PRICE_TO_TIER[session.stripePriceId]) {
    return {
      tier: PRICE_TO_TIER[session.stripePriceId],
      source: "session.stripePriceId",
      spoofBlocked: false,
    };
  }
  const q = normalizeTier(session.queryTier ?? undefined);
  if (q) {
    if (opts.allowQueryOnly) {
      return { tier: q, source: "query_dev", spoofBlocked: false };
    }
    // Query without session → FREE; report spoof attempt
    return { tier: "FREE", source: "query_ignored", spoofBlocked: true };
  }
  return { tier: "FREE", source: "default", spoofBlocked: false };
}

export interface MetricEntitlement {
  metricId: string;
  minTier: StripeTier;
  publicApiEligible: boolean;
}

export type EntitlementResult =
  | { ok: true; tier: StripeTier; source: string }
  | {
      ok: false;
      httpStatus: 403 | 401;
      code: string;
      tier: StripeTier;
      required: StripeTier;
      reason: string;
    };

export function authorizeMetricAccess(
  session: SessionClaims,
  metric: MetricEntitlement,
  opts: { allowQueryOnly?: boolean } = {},
): EntitlementResult {
  if (!metric.publicApiEligible) {
    return {
      ok: false,
      httpStatus: 403,
      code: "not_public",
      tier: resolveSessionTier(session, opts).tier,
      required: metric.minTier,
      reason: "Metric is not public_api_eligible — refuse-default.",
    };
  }
  const resolved = resolveSessionTier(session, opts);
  if (TIER_RANK[resolved.tier] < TIER_RANK[metric.minTier]) {
    return {
      ok: false,
      httpStatus: 403,
      code: "tier_insufficient",
      tier: resolved.tier,
      required: metric.minTier,
      reason: `Requires ${metric.minTier}; session is ${resolved.tier} (${resolved.source}).`,
    };
  }
  return { ok: true, tier: resolved.tier, source: resolved.source };
}

/** Catalog defaults for GSE metric families */
export function defaultMinTier(metricId: string): StripeTier {
  if (metricId.startsWith("own.cal.") || metricId.startsWith("own.kpi.")) return "FREE";
  if (metricId.includes("elite") || metricId.includes("optical")) return "ELITE";
  if (metricId.startsWith("own.model.") || metricId.startsWith("own.edge.")) return "ELITE";
  if (metricId.startsWith("own.stat.")) return "PRO";
  return "FREE";
}
