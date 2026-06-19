import { describe, it, expect, beforeEach } from "vitest";

import {
  checkLabRateLimit,
  clientKey,
  __resetLabRateLimit,
  LAB_RATE_LIMIT,
  LAB_RATE_WINDOW_MS,
} from "@/lib/lab/rate-limit";

function reqWithIp(ip: string | null, header: "x-forwarded-for" | "x-real-ip" = "x-forwarded-for"): Request {
  const headers = new Headers();
  if (ip !== null) headers.set(header, ip);
  return new Request("https://x/api/lab/simulate-game", { method: "POST", headers });
}

describe("clientKey", () => {
  it("reads the first x-forwarded-for hop", () => {
    expect(clientKey(reqWithIp("1.2.3.4, 5.6.7.8"))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip", () => {
    expect(clientKey(reqWithIp("9.9.9.9", "x-real-ip"))).toBe("9.9.9.9");
  });
  it("falls back to anon when no headers", () => {
    expect(clientKey(reqWithIp(null))).toBe("anon");
  });
});

describe("checkLabRateLimit", () => {
  beforeEach(() => __resetLabRateLimit());

  it("allows up to the limit then blocks", () => {
    const ip = "10.0.0.1";
    const now = 1_000_000;
    for (let i = 0; i < LAB_RATE_LIMIT; i++) {
      const r = checkLabRateLimit(reqWithIp(ip), now);
      expect(r.allowed).toBe(true);
    }
    const blocked = checkLabRateLimit(reqWithIp(ip), now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates budgets per client key", () => {
    const now = 2_000_000;
    for (let i = 0; i < LAB_RATE_LIMIT; i++) {
      checkLabRateLimit(reqWithIp("10.0.0.2"), now);
    }
    // a different IP still has full budget
    expect(checkLabRateLimit(reqWithIp("10.0.0.3"), now).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const ip = "10.0.0.4";
    const start = 3_000_000;
    for (let i = 0; i < LAB_RATE_LIMIT; i++) checkLabRateLimit(reqWithIp(ip), start);
    expect(checkLabRateLimit(reqWithIp(ip), start).allowed).toBe(false);
    // after the window, budget is restored
    const later = start + LAB_RATE_WINDOW_MS + 1;
    expect(checkLabRateLimit(reqWithIp(ip), later).allowed).toBe(true);
  });

  it("reports remaining budget", () => {
    const ip = "10.0.0.5";
    const now = 4_000_000;
    const first = checkLabRateLimit(reqWithIp(ip), now);
    expect(first.limit).toBe(LAB_RATE_LIMIT);
    expect(first.remaining).toBe(LAB_RATE_LIMIT - 1);
  });
});
