/**
 * usage-meter.ts — R5 platform usage meter aggregation core.
 *
 * Pure aggregation, no I/O. `unitCostProxyUsd` on a `PlatformUsageEvent` is a
 * caller-supplied *proxy* for cost (e.g. a published list price times
 * quantity), not verified billing data pulled from a provider invoice. Do
 * not present `estUsd` downstream (case studies, marketplace materials,
 * internal reporting) as an authoritative invoice figure — always label it
 * as an estimate/proxy.
 */
export type PlatformUsageEvent = {
  at: Date;
  provider: "aws" | "gcp" | "cloudflare" | "neon" | "vercel" | "openai" | "anthropic";
  metric: string;
  quantity: number;
  unitCostProxyUsd?: number;
};

export function usageSummary(events: PlatformUsageEvent[], provider: PlatformUsageEvent["provider"]) {
  const e = events.filter((x) => x.provider === provider);
  return {
    provider,
    quantity: e.reduce((a, x) => a + x.quantity, 0),
    estUsd: e.reduce((a, x) => a + (x.unitCostProxyUsd ?? 0), 0),
  };
}
