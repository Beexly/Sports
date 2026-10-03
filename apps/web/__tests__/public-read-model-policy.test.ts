import { describe, it, expect } from "vitest";
import {
  CACHE_POLICIES,
  cachePolicyFor,
  cacheControlHeader,
  type SensitiveSurface,
  type PublicSurface,
} from "@/lib/cache/public-read-model-policy";

const SENSITIVE: SensitiveSurface[] = ["admin", "auth", "checkout", "webhooks", "cron"];
const PUBLIC: PublicSurface[] = [
  "picks-board",
  "performance",
  "clv",
  "calibration",
  "loss-autopsies",
  "journal",
  "proof",
  "source-status",
  "marketing",
];

describe("public read-model cache policy", () => {
  it("forces no-store on admin/auth/checkout/webhooks/cron", () => {
    for (const s of SENSITIVE) {
      const p = cachePolicyFor(s);
      expect(p.noStore).toBe(true);
      expect(p.cdnSafe).toBe(false);
      expect(p.ttlSeconds).toBe(0);
      expect(p.cacheTag).toBeNull();
      expect(cacheControlHeader(p)).toBe("no-store");
    }
  });

  it("gives every public proof surface an explicit TTL + cache tag + SWR", () => {
    for (const s of PUBLIC) {
      const p = cachePolicyFor(s);
      expect(p.noStore).toBe(false);
      expect(p.cdnSafe).toBe(true);
      expect(p.ttlSeconds).toBeGreaterThan(0);
      expect(p.cacheTag).toBeTruthy();
      expect(p.staleWhileRevalidateSeconds).toBeGreaterThan(0);
      expect(p.invalidationTrigger.length).toBeGreaterThan(0);
      expect(cacheControlHeader(p)).toMatch(/^public, s-maxage=\d+, stale-while-revalidate=\d+$/);
    }
  });

  it("documents an invalidation trigger for every surface", () => {
    for (const p of Object.values(CACHE_POLICIES)) {
      expect(p.invalidationTrigger.length).toBeGreaterThan(0);
    }
  });
});
