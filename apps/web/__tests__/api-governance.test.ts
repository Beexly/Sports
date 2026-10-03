import { describe, it, expect } from "vitest";
import { governApiRequest, type ApiConsumer, type ApiRequest } from "@/lib/b2b/api-governance";

function consumer(overrides: Partial<ApiConsumer> = {}): ApiConsumer {
  return {
    keyId: "k_123",
    allowedDomains: ["partner.com"],
    active: true,
    monthlyQuota: 1000,
    usedThisMonth: 10,
    ...overrides,
  };
}

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return { keyId: "k_123", originDomain: "https://partner.com/embed", payloadClaimSafe: true, ...overrides };
}

describe("b2b/api governance", () => {
  it("allows an active key, allow-listed domain, in-quota, claim-safe request", () => {
    const r = governApiRequest(consumer(), request());
    expect(r.decision).toBe("ALLOW");
    expect(r.remainingQuota).toBe(989); // 1000 - 10 - 1
  });

  it("allows a subdomain of an allow-listed domain", () => {
    expect(governApiRequest(consumer(), request({ originDomain: "app.partner.com" })).decision).toBe("ALLOW");
  });

  it("denies a revoked key immediately", () => {
    const r = governApiRequest(consumer({ active: false }), request());
    expect(r.decision).toBe("DENY");
    expect(r.reasons.join(" ")).toMatch(/revoked|inactive/);
  });

  it("denies an origin not on the allow-list", () => {
    const r = governApiRequest(consumer(), request({ originDomain: "evil.com" }));
    expect(r.decision).toBe("DENY");
    expect(r.reasons.join(" ")).toMatch(/allow-list/);
  });

  it("denies once the monthly quota is exhausted", () => {
    const r = governApiRequest(consumer({ usedThisMonth: 1000 }), request());
    expect(r.decision).toBe("DENY");
    expect(r.reasons.join(" ")).toMatch(/quota/);
  });

  it("denies a payload that is not claim-safe (no overclaiming on a partner site)", () => {
    const r = governApiRequest(consumer(), request({ payloadClaimSafe: false }));
    expect(r.decision).toBe("DENY");
    expect(r.reasons.join(" ")).toMatch(/claim-safe/);
  });

  it("denies a key mismatch", () => {
    expect(governApiRequest(consumer(), request({ keyId: "k_other" })).decision).toBe("DENY");
  });
});
