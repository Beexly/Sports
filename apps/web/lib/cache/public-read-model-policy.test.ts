import { describe, it, expect } from "vitest";
import {
  cachePolicyFor,
  cacheControlHeader,
  cacheControlFor,
  cdnPolicy,
  NEVER_CACHE_PREFIXES,
} from "./public-read-model-policy";

describe("cachePolicyFor — fail-safe by default", () => {
  it("returns no-store for every never-cache prefix (cross-user safety)", () => {
    for (const prefix of NEVER_CACHE_PREFIXES) {
      expect(cachePolicyFor(prefix).mode).toBe("no-store");
      expect(cachePolicyFor(`${prefix}/anything?x=1`).mode).toBe("no-store");
    }
  });

  it("defaults UNCLASSIFIED paths to no-store (never accidentally cache)", () => {
    expect(cachePolicyFor("/api/some/new/route").mode).toBe("no-store");
    expect(cachePolicyFor("/api/subscriptions/checkout").mode).toBe("no-store");
    expect(cachePolicyFor("/api/picks/123/audit").mode).toBe("no-store");
  });
});

describe("cacheControlHeader", () => {
  it("formats no-store", () => {
    expect(cacheControlHeader({ mode: "no-store", reason: "x" })).toBe("no-store, max-age=0");
  });

  it("formats a CDN policy as public s-maxage + stale-while-revalidate", () => {
    expect(cacheControlHeader(cdnPolicy(3600, 86400, "public catalog"))).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  });
});

describe("cacheControlFor", () => {
  it("returns no-store for a sensitive path", () => {
    expect(cacheControlFor("/api/auth/session")).toBe("no-store, max-age=0");
  });
});
