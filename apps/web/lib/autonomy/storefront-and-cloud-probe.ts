/**
 * Pure read-only storefront, AI gateway, cloud budget, and filing deadline probe.
 * Feeds owner-gated advisories into planAutonomyCycle(); never executes actions.
 */

export interface StorefrontAndCloudObservation {
  readonly whopApiKeyPresent: boolean;
  readonly whopPaidCheckoutGapCount: number;
  readonly aiGatewayKeyPresent: boolean;
  readonly nousFreePromoExpiringOrExpired: boolean;
  readonly cloudOrCronDriftDetected: boolean;
  readonly cloudDriftDetail: string | null;
  readonly imminentFilingDeadlines: readonly string[];
}

const TRACKED_DEADLINES: ReadonlyArray<{ readonly id: string; readonly isoDate: string }> = [
  { id: "Mozilla-Human-Scale-AI-2026-11-20", isoDate: "2026-11-21T07:59:00Z" },
  { id: "TX-SOS-GSI-Cure-15043440630001-2026-12-10", isoDate: "2026-12-10T23:59:00Z" },
  { id: "DOE-SBIR-2026-12-16", isoDate: "2026-12-16T23:59:00Z" },
];

const NOUS_FREE_PROMO_CUTOFF_MS = Date.parse("2026-11-23T15:00:00Z");

export function probeStorefrontAndCloudHealth(params: {
  readonly now?: Date;
  readonly env?: Record<string, string | undefined>;
} = {}): StorefrontAndCloudObservation {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const env = params.env ?? process.env;

  const whopApiKeyPresent = Boolean((env["WHOP_API_KEY"] ?? "").trim());
  const whopEnvKeys = [
    "WHOP_CHECKOUT_PRIMETIME_STANDARD",
    "WHOP_CHECKOUT_SUNDAY_STANDARD",
    "WHOP_CHECKOUT_MEMBERSHIP_FOUNDING",
  ];
  const missingWhopUrls = whopEnvKeys.filter((k) => !(env[k] ?? "").trim()).length;

  const aiGatewayKeyPresent = Boolean(
    (env["AI_GATEWAY_API_KEY"] ?? env["VERCEL_AI_GATEWAY_API_KEY"] ?? "").trim(),
  );

  // Warn 96 hours (4 days) before Nous qwen4-max:free expires or after expiry without AI Gateway
  const nousFreePromoExpiringOrExpired =
    nowMs >= NOUS_FREE_PROMO_CUTOFF_MS - 96 * 3600 * 1000 && !aiGatewayKeyPresent;

  const cloudOrCronDriftDetected = env["GSE_CLOUD_CRON_DRIFT"]?.trim().toLowerCase() === "true";
  const cloudDriftDetail = cloudOrCronDriftDetected
    ? env["GSE_CLOUD_CRON_DRIFT_DETAIL"] ?? "Cloud or Hermes cron drift reported by env probe."
    : null;

  const imminentFilingDeadlines: string[] = [];
  for (const d of TRACKED_DEADLINES) {
    const msLeft = Date.parse(d.isoDate) - nowMs;
    if (msLeft > -6 * 3600 * 1000 && msLeft <= 10 * 24 * 3600 * 1000) {
      imminentFilingDeadlines.push(d.id);
    }
  }

  return {
    whopApiKeyPresent,
    whopPaidCheckoutGapCount: missingWhopUrls,
    aiGatewayKeyPresent,
    nousFreePromoExpiringOrExpired,
    cloudOrCronDriftDetected,
    cloudDriftDetail,
    imminentFilingDeadlines,
  };
}
