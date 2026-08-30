/**
 * B2B / API Governance — the gate on any embeddable widget or API consumer.
 *
 * If GSE's intelligence is ever exposed to third parties, the same discipline applies
 * outward: a request is allowed only from an ACTIVE key, an allow-listed domain, within
 * quota, and ONLY when the payload it would render is claim-safe (an embedded widget
 * can't overclaim on someone else's site). Revocation is immediate. Pure decision
 * function, no I/O — the route/middleware enforces it.
 */

export interface ApiConsumer {
  readonly keyId: string;
  readonly allowedDomains: readonly string[];
  /** Revoked consumers have active = false. */
  readonly active: boolean;
  readonly monthlyQuota: number;
  readonly usedThisMonth: number;
}

export interface ApiRequest {
  readonly keyId: string;
  readonly originDomain: string;
  /** Did the content this request would render pass the public claim compiler? */
  readonly payloadClaimSafe: boolean;
}

export type ApiDecision = "ALLOW" | "DENY";

export interface ApiRuling {
  readonly decision: ApiDecision;
  readonly reasons: readonly string[];
  readonly remainingQuota: number;
}

function domainAllowed(origin: string, allowed: readonly string[]): boolean {
  const o = origin.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return allowed.some((d) => {
    const dd = d.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return o === dd || o.endsWith(`.${dd}`);
  });
}

/**
 * Govern a single API/widget request. DENY unless every gate holds: matching active
 * key, allow-listed origin, within quota, claim-safe payload. ALLOW decrements quota.
 */
export function governApiRequest(consumer: ApiConsumer, req: ApiRequest): ApiRuling {
  const reasons: string[] = [];
  const remaining = Math.max(0, consumer.monthlyQuota - consumer.usedThisMonth);

  if (consumer.keyId !== req.keyId) reasons.push("key mismatch");
  if (!consumer.active) reasons.push("key revoked or inactive");
  if (!domainAllowed(req.originDomain, consumer.allowedDomains)) reasons.push(`origin "${req.originDomain}" not in domain allow-list`);
  if (consumer.usedThisMonth >= consumer.monthlyQuota) reasons.push("monthly quota exceeded");
  if (!req.payloadClaimSafe) reasons.push("payload is not claim-safe");

  if (reasons.length > 0) {
    return { decision: "DENY", reasons, remainingQuota: remaining };
  }
  return { decision: "ALLOW", reasons: [], remainingQuota: Math.max(0, remaining - 1) };
}
