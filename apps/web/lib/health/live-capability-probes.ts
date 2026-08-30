/**
 * Shared leaf-capability probes for /api/health and the epistemic-twin
 * consumer guard (`capability-graph.ts`'s `fetchLiveCapabilityGraph`).
 *
 * Extracted verbatim from the health route so both callers share one probe
 * implementation instead of two that could silently drift apart. This module
 * performs only read-only Prisma queries the health route already ran; it
 * adds no new persistence (no Prisma `CapabilityObservation` table).
 *
 * Money-path leaf (checkout / revenue): env-only — never calls Stripe network
 * from the public health surface (no secrets leaked, no side effects).
 */

import { db } from "@sports/db";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";
import {
  loadSettlementHealth,
  type SettlementHealthBand,
} from "@/lib/performance/settlement-health";
import { nflverseTableCacheStats, probeNflverseSourceCurrency } from "@sports/data-ingestion";
import {
  fromHealthCheck,
  fromSettlementBand,
  unknownCapability,
  type CapabilityState,
} from "./capability-state";
import { loadBillingMoneyPosture } from "@/lib/ops/billing-money-posture";

export type HealthCheck = {
  status: "ok" | "error";
  detail?: string;
  lastSuccessAt?: string;
  ageMinutes?: number;
};

export interface LiveCapabilityProbeResult {
  readonly checks: Record<string, HealthCheck>;
  readonly capabilities: CapabilityState[];
}

/** Env-only money-path leaf — maps to route:/checkout + revenue:checkout. */
export function probeCheckoutMoneyPath(
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): { checkout: CapabilityState; revenue: CapabilityState } {
  const money = loadBillingMoneyPosture(env);
  const observedAt = now.toISOString();

  let checkout: CapabilityState;
  if (!money.stripeSecretConfigured) {
    checkout = {
      capabilityId: "checkout",
      status: "unavailable",
      reason: "STRIPE_SECRET_KEY not configured — checkout cannot create sessions",
      observedAt,
      evidence: "probe",
    };
  } else if (money.envPriceSlotsConfigured === 0) {
    checkout = {
      capabilityId: "checkout",
      status: "degraded",
      reason:
        "Stripe secret present; no STRIPE_*_PRICE_ID envs — checkout depends on lookup_key resolution",
      observedAt,
      evidence: "probe",
    };
  } else {
    checkout = {
      capabilityId: "checkout",
      status: "healthy",
      reason: `Stripe secret + ${money.envPriceSlotsConfigured}/6 env price slots configured`,
      observedAt,
      evidence: "probe",
    };
  }

  let revenue: CapabilityState;
  if (!money.stripeSecretConfigured) {
    revenue = {
      capabilityId: "revenue-checkout",
      status: "unavailable",
      reason: "Stripe secret missing — revenue path cannot charge or entitle",
      observedAt,
      evidence: "probe",
    };
  } else if (!money.webhookSecretConfigured) {
    revenue = {
      capabilityId: "revenue-checkout",
      status: "degraded",
      reason:
        "Stripe secret present but webhook secret missing — sessions may create without entitlements",
      observedAt,
      evidence: "probe",
    };
  } else {
    revenue = {
      capabilityId: "revenue-checkout",
      status: "healthy",
      reason: "Stripe secret + webhook secret configured for entitlement handoff",
      observedAt,
      evidence: "probe",
    };
  }

  return { checkout, revenue };
}

export async function computeLiveCapabilityProbes(): Promise<LiveCapabilityProbeResult> {
  const checks: Record<string, HealthCheck> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks["database"] = { status: "ok" };
  } catch {
    // Do not serialize the raw DB error to this public, unauthenticated response —
    // its message discloses the internal database host/port. Static detail only;
    // the real error stays in server logs.
    checks["database"] = { status: "error", detail: "database unreachable" };
  }

  // Last ingestion run check — must be a SUCCESS run, not any run.
  // A FAILED run that started recently should not report healthy.
  try {
    const lastSuccessRun = await db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    if (!lastSuccessRun || !lastSuccessRun.completedAt) {
      checks["ingestion"] = { status: "error", detail: "No successful runs recorded" };
    } else {
      const ageMs = Date.now() - lastSuccessRun.completedAt.getTime();
      const ageMinutes = Math.round(ageMs / (1000 * 60));
      // Use the shared Refresh SLA instead of a hard-coded 2h. The old 2h
      // magic number caused false 503s (the deployed fallback cron is daily,
      // schedulers jitter) and disagreed with Jarvis. See refresh-sla.ts.
      checks["ingestion"] = {
        status: ageMinutes > REFRESH_STALE_AFTER_MINUTES ? "error" : "ok",
        detail: `Last success: ${lastSuccessRun.completedAt.toISOString()} (${ageMinutes}m ago)`,
        lastSuccessAt: lastSuccessRun.completedAt.toISOString(),
        ageMinutes,
      };
    }
  } catch {
    checks["ingestion"] = { status: "error", detail: "Failed to query" };
  }

  let settlementBand: SettlementHealthBand | null = null;
  try {
    // Same loader as ops/cron/jarvis — one grace + count definition (no drift).
    settlementBand = (await loadSettlementHealth(db, {})).health;
  } catch {
    // No evidence either way — do not guess a band.
    settlementBand = null;
  }

  // Prefer process-local OP-002 cache counters when this runtime has already
  // touched nflverse. On cold serverless isolates those counters are zero —
  // fall through to a lightweight catalog HEAD probe (completed REG floor)
  // so source:nflverse is never a static "unknown" with no evidence.
  const nflverseStats = nflverseTableCacheStats();
  let nflverseCapability: CapabilityState;
  if (nflverseStats.entries === 0 && nflverseStats.misses === 0 && nflverseStats.failures === 0) {
    try {
      const currency = await probeNflverseSourceCurrency({ timeoutMs: 4000 });
      nflverseCapability = {
        capabilityId: "nflverse-reports",
        status: currency.ok ? "healthy" : "unavailable",
        reason: currency.reason,
        observedAt: currency.probedAt,
        evidence: "probe",
      };
    } catch (err) {
      nflverseCapability = unknownCapability(
        "nflverse-reports",
        `currency probe threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else if (nflverseStats.failures > 0 && nflverseStats.entries === 0) {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "unavailable",
      reason: "nflverse table fetches have failed in this runtime with no cached data",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  } else if (nflverseStats.failures > 0 && nflverseStats.entries > 0) {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "degraded",
      reason: "some nflverse table fetches have failed in this runtime alongside cached data",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  } else {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "healthy",
      reason: "nflverse table fetches have succeeded in this runtime",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  }

  const money = probeCheckoutMoneyPath();

  const capabilities: CapabilityState[] = [
    fromHealthCheck(
      "database",
      checks["database"]?.status ?? "error",
      checks["database"]?.status === "ok" ? "database ping succeeded" : "database ping failed"
    ),
    fromHealthCheck(
      "ingestion",
      checks["ingestion"]?.status ?? "error",
      checks["ingestion"]?.status === "ok"
        ? "last successful ingestion run is within the freshness SLA"
        : "last successful ingestion run is missing or stale"
    ),
    settlementBand !== null
      ? fromSettlementBand(settlementBand)
      : unknownCapability("settlement", "settlement health could not be determined"),
    nflverseCapability,
    money.checkout,
    money.revenue,
  ];

  return { checks, capabilities };
}
