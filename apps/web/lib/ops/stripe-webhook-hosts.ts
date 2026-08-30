/**
 * Public-safe Stripe webhook endpoint host posture.
 *
 * Lists endpoint URLs only (no secrets). Classifies Galaxy vs foreign hosts so
 * founderNextSteps can drop "Dashboard audit" once live endpoints are clean.
 * Never invents hosts. Fail-closed: load error → unknown (audit still shown).
 */

export type WebhookEndpointRow = {
  readonly url: string;
  /** Stripe status: "enabled" | "disabled" | other */
  readonly status: string;
};

export interface StripeWebhookHostsPosture {
  readonly probed: boolean;
  readonly enabledCount: number;
  readonly disabledCount: number;
  /** Enabled endpoints whose host is galaxysportsedge.com (www or apex). */
  readonly enabledGalaxyHosts: readonly string[];
  /** Enabled endpoints on foreign hosts — real audit fire. */
  readonly enabledForeignHosts: readonly string[];
  /** Disabled foreign leftovers (safe to delete, not urgent). */
  readonly disabledForeignHosts: readonly string[];
  /** True when ≥1 enabled GSE webhook and zero enabled foreign. */
  readonly gsePrimaryHealthy: boolean;
  /** True when any enabled foreign host exists. */
  readonly auditRequired: boolean;
  readonly operatorHint: string;
}

const GSE_HOSTS = new Set(["galaxysportsedge.com", "www.galaxysportsedge.com"]);

export function hostFromWebhookUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function isGalaxySportsHost(host: string | null): boolean {
  if (!host) return false;
  return GSE_HOSTS.has(host) || host.endsWith(".galaxysportsedge.com");
}

/** Pure classifier — unit-tested, no Stripe network. */
export function classifyStripeWebhookHosts(
  endpoints: readonly WebhookEndpointRow[],
): StripeWebhookHostsPosture {
  const enabledGalaxyHosts: string[] = [];
  const enabledForeignHosts: string[] = [];
  const disabledForeignHosts: string[] = [];
  let enabledCount = 0;
  let disabledCount = 0;

  for (const ep of endpoints) {
    const host = hostFromWebhookUrl(ep.url);
    const enabled = ep.status === "enabled";
    if (enabled) enabledCount += 1;
    else disabledCount += 1;

    if (!host) continue;
    if (isGalaxySportsHost(host)) {
      if (enabled) enabledGalaxyHosts.push(host);
    } else if (enabled) {
      enabledForeignHosts.push(host);
    } else {
      disabledForeignHosts.push(host);
    }
  }

  // Dedupe hosts for display
  const uniq = (xs: string[]) => [...new Set(xs)];
  const enabledGalaxy = uniq(enabledGalaxyHosts);
  const enabledForeign = uniq(enabledForeignHosts);
  const disabledForeign = uniq(disabledForeignHosts);

  const gsePrimaryHealthy = enabledGalaxy.length > 0 && enabledForeign.length === 0;
  const auditRequired = enabledForeign.length > 0;

  let operatorHint: string;
  if (endpoints.length === 0) {
    operatorHint = "No Stripe webhook endpoints listed — create GSE endpoint for entitlements.";
  } else if (auditRequired) {
    operatorHint = `Enabled foreign webhook host(s): ${enabledForeign.join(", ")} — disable/remove; keep only galaxysportsedge.com.`;
  } else if (gsePrimaryHealthy && disabledForeign.length > 0) {
    operatorHint = `GSE webhook healthy. Disabled foreign leftover(s) (${disabledForeign.join(", ")}) safe to delete anytime — not blocking.`;
  } else if (gsePrimaryHealthy) {
    operatorHint = "GSE webhook healthy — only galaxysportsedge.com enabled.";
  } else {
    operatorHint = "No enabled GSE webhook host found — wire https://www.galaxysportsedge.com/api/webhooks/stripe.";
  }

  return {
    probed: true,
    enabledCount,
    disabledCount,
    enabledGalaxyHosts: enabledGalaxy,
    enabledForeignHosts: enabledForeign,
    disabledForeignHosts: disabledForeign,
    gsePrimaryHealthy,
    auditRequired,
    operatorHint,
  };
}

/**
 * Live Stripe list (when secret present). Never throws.
 * Returns null on stub / missing key / network error (caller keeps soft audit).
 */
export async function loadStripeWebhookHostsPosture(): Promise<StripeWebhookHostsPosture | null> {
  const key = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!key) return null;
  try {
    // Lazy import so test stubs without STRIPE don't construct the client at module load.
    const { stripe } = await import("@/lib/stripe");
    const listed = await stripe.webhookEndpoints.list({ limit: 100 });
    const rows: WebhookEndpointRow[] = listed.data.map((ep) => ({
      url: ep.url,
      status: ep.status ?? "unknown",
    }));
    return classifyStripeWebhookHosts(rows);
  } catch {
    return null;
  }
}
