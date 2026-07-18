/**
 * Core Web Vitals field-measurement bundle — closes PRODUCTION_QUALITY_AUDIT.md
 * P0 item #2 (RUM beacon) and P1 items #6 (global-error/loading) and #9
 * (Lighthouse CI budget).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { resetRateLimits } from "@/lib/api/rate-limit";

const ROOT = path.resolve(__dirname, "..");

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

// Each call gets its own IP by default (via a fresh counter) so tests stay
// isolated against the shared in-memory rate-limit registry; pass `ip` to
// deliberately share an IP across calls (e.g. to exercise the limiter).
let ipCounter = 0;
function req(body: unknown, ip?: string): Request {
  return new Request("http://x/api/vitals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip ?? `10.0.0.${++ipCounter}`,
    },
  });
}

// ─── /api/vitals route ───────────────────────────────────────────────────────

describe("POST /api/vitals", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    resetRateLimits();
  });
  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("204s and logs one structured line for a valid LCP beacon", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const res = await POST(
      req({ name: "LCP", value: 1234.5, rating: "good", path: "/picks" })
    );
    expect(res.status).toBe(204);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0]?.[0]).toContain("[web-vitals] LCP value=1235 rating=good path=/picks");
  });

  it("formats CLS with 4 decimal places (unitless) but other metrics as whole ms", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    await POST(req({ name: "CLS", value: 0.08234567, rating: "good", path: "/" }));
    expect(infoSpy.mock.calls[0]?.[0]).toContain("value=0.0823");
  });

  it("204s silently (no log) for an unrecognized metric name", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const res = await POST(req({ name: "FAKE_METRIC", value: 1, rating: "good" }));
    expect(res.status).toBe(204);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("204s silently when value is missing or non-numeric", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    await POST(req({ name: "LCP", value: "not-a-number" }));
    await POST(req({ name: "LCP" }));
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("204s without throwing on malformed JSON", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const badReq = new Request("http://x/api/vitals", {
      method: "POST",
      body: "{not json",
      headers: { "x-forwarded-for": `10.0.0.${++ipCounter}` },
    });
    const res = await POST(badReq);
    expect(res.status).toBe(204);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("truncates an overlong path to 256 chars rather than rejecting the beacon", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const longPath = "/" + "a".repeat(500);
    await POST(req({ name: "TTFB", value: 200, rating: "good", path: longPath }));
    const logged = infoSpy.mock.calls[0]?.[0] as string;
    const loggedPath = logged.split("path=")[1];
    expect(loggedPath?.length).toBe(256);
  });

  it("defaults rating to 'unknown' when absent", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    await POST(req({ name: "INP", value: 50 }));
    expect(infoSpy.mock.calls[0]?.[0]).toContain("rating=unknown");
  });

  it("rejects a rating outside the real web-vitals enum (good/needs-improvement/poor) rather than trusting caller input", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    await POST(req({ name: "LCP", value: 100, rating: "TOTALLY_MADE_UP" }));
    expect(infoSpy.mock.calls[0]?.[0]).toContain("rating=unknown");
    expect(infoSpy.mock.calls[0]?.[0]).not.toContain("TOTALLY_MADE_UP");
  });

  it("accepts each of the 3 real web-vitals ratings verbatim", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    for (const rating of ["good", "needs-improvement", "poor"]) {
      await POST(req({ name: "LCP", value: 100, rating }));
    }
    expect(infoSpy).toHaveBeenCalledTimes(3);
    expect(infoSpy.mock.calls[0]?.[0]).toContain("rating=good");
    expect(infoSpy.mock.calls[1]?.[0]).toContain("rating=needs-improvement");
    expect(infoSpy.mock.calls[2]?.[0]).toContain("rating=poor");
  });

  it("strips newlines and control characters from an attacker-supplied path, blocking log-line forging", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const forged = "/picks\n[web-vitals] LCP value=0 rating=FAKE path=/admin\r\n";
    await POST(req({ name: "LCP", value: 1, rating: "good", path: forged }));
    const logged = infoSpy.mock.calls[0]?.[0] as string;
    // Exactly one log line was emitted -- a forged line was not injected.
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(logged.includes("\n")).toBe(false);
    expect(logged.includes("\r")).toBe(false);
  });

  it("rate-limits per IP so a scripted client cannot flood the log (matches the /api/waitlist pattern)", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    const floodIp = "203.0.113.9";
    for (let i = 0; i < 120; i++) {
      await POST(req({ name: "LCP", value: 1, rating: "good" }, floodIp));
    }
    expect(infoSpy).toHaveBeenCalledTimes(120);

    // The 121st request from the same IP within the window is dropped, not logged.
    const res = await POST(req({ name: "LCP", value: 1, rating: "good" }, floodIp));
    expect(res.status).toBe(204); // still fails open/silent -- never surfaces to the beacon
    expect(infoSpy).toHaveBeenCalledTimes(120);
  });

  it("does not rate-limit distinct IPs against each other", async () => {
    const { POST } = await import("@/app/api/vitals/route");
    await POST(req({ name: "LCP", value: 1, rating: "good" }, "198.51.100.1"));
    await POST(req({ name: "LCP", value: 1, rating: "good" }, "198.51.100.2"));
    expect(infoSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── WebVitalsReporter — source pins ─────────────────────────────────────────

describe("web-vitals-reporter.tsx — source pins", () => {
  const src = readSource("components/web-vitals-reporter.tsx");

  it("is a client component", () => {
    expect(src).toMatch(/^"use client";/);
  });

  it("imports all 5 Core Web Vitals reporters from web-vitals", () => {
    for (const fn of ["onCLS", "onFCP", "onINP", "onLCP", "onTTFB"]) {
      expect(src).toMatch(new RegExp(fn));
    }
    expect(src).toMatch(/from "web-vitals"/);
  });

  it("posts to the first-party /api/vitals sink, not a third-party endpoint", () => {
    expect(src).toMatch(/\/api\/vitals/);
    expect(src).not.toMatch(/googletagmanager|google-analytics|segment\.io|mixpanel/i);
  });

  it("prefers sendBeacon and falls back to fetch with keepalive", () => {
    expect(src).toMatch(/sendBeacon/);
    expect(src).toMatch(/keepalive:\s*true/);
  });

  it("sends only the pathname, no query string, cookies, or other PII", () => {
    expect(src).toMatch(/window\.location\.pathname/);
    expect(src).not.toMatch(/document\.cookie/);
    expect(src).not.toMatch(/window\.location\.search/);
  });

  it("renders nothing (a pure instrumentation mount)", () => {
    expect(src).toMatch(/return\s+null\s*;/);
  });
});

// ─── global-error.tsx — source pins ──────────────────────────────────────────

describe("global-error.tsx — source pins", () => {
  const src = readSource("app/global-error.tsx");

  it("is a client component defining its own html/body (the Next.js contract for root errors)", () => {
    expect(src).toMatch(/^"use client";/);
    expect(src).toMatch(/<html/);
    expect(src).toMatch(/<body/);
  });

  it("wires the same Sentry capture path as app/error.tsx", () => {
    expect(src).toMatch(/captureError/);
    expect(src).toMatch(/initObservability/);
    expect(src).toMatch(/observability\/sentry/);
  });

  it("calls captureError with the error", () => {
    expect(src).toMatch(/captureError\s*\(\s*error/);
  });

  it("never renders error.message directly in production — digest only", () => {
    // The isProd branch must resolve to a digest-based string, and error.message
    // must only be reachable through the non-prod branch.
    expect(src).toMatch(/isProd\s*\?\s*[\s\S]*?error\.digest[\s\S]*?:\s*error\.message/);
  });

  it("does not import project components (fonts/CSS/component tree may be broken here)", () => {
    expect(src).not.toMatch(/from "@\/components\//);
  });

  it("offers a reset action and a home escape hatch", () => {
    expect(src).toMatch(/reset\(\)/);
    expect(src).toMatch(/href="\/"/);
  });
});

// ─── loading.tsx — source pins ────────────────────────────────────────────────

describe("app/loading.tsx — source pins", () => {
  const src = readSource("app/loading.tsx");

  it("is a server component (no 'use client')", () => {
    expect(src).not.toMatch(/^"use client";/);
  });

  it("announces loading state to assistive tech", () => {
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/aria-label="Loading"/);
    expect(src).toMatch(/sr-only/);
  });

  it("uses only animate-pulse, which the global reduced-motion rule collapses", () => {
    expect(src).toMatch(/animate-pulse/);
    expect(src).not.toMatch(/animate-(spin|bounce|ping)/);
  });
});

// ─── layout.tsx wiring ────────────────────────────────────────────────────────

describe("app/layout.tsx — WebVitalsReporter wiring", () => {
  const src = readSource("app/layout.tsx");

  it("imports and mounts WebVitalsReporter", () => {
    expect(src).toMatch(/import\s*\{\s*WebVitalsReporter\s*\}\s*from\s*"@\/components\/web-vitals-reporter"/);
    expect(src).toMatch(/<WebVitalsReporter\s*\/>/);
  });

  it("mounts it inside body, alongside the existing SentryClientInit instrumentation", () => {
    const bodyIdx = src.indexOf("<body");
    const sentryIdx = src.indexOf("<SentryClientInit", bodyIdx);
    const vitalsIdx = src.indexOf("<WebVitalsReporter", bodyIdx);
    expect(sentryIdx).toBeGreaterThan(bodyIdx);
    expect(vitalsIdx).toBeGreaterThan(sentryIdx);
  });
});

// ─── lighthouserc.json ────────────────────────────────────────────────────────

describe("lighthouserc.json", () => {
  const raw = readSource("lighthouserc.json");
  const config = JSON.parse(raw) as {
    ci: {
      collect: { url: string[]; numberOfRuns: number };
      assert: { assertions: Record<string, unknown> };
    };
  };

  it("is valid JSON with the expected shape", () => {
    expect(config.ci.collect.url.length).toBeGreaterThan(0);
    expect(config.ci.collect.numberOfRuns).toBeGreaterThan(0);
  });

  it("only targets routes that actually exist on this app", () => {
    for (const url of config.ci.collect.url) {
      const routePath = new URL(url).pathname;
      if (routePath === "/") {
        expect(fs.existsSync(path.join(ROOT, "app/page.tsx"))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(ROOT, "app", routePath, "page.tsx"))).toBe(true);
      }
    }
  });

  it("enforces the 2026 tightened LCP (<=2.0s) and CLS (<=0.1) budgets as hard errors", () => {
    const assertions = config.ci.assert.assertions as Record<string, unknown[]>;
    const lcp = assertions["largest-contentful-paint"];
    const cls = assertions["cumulative-layout-shift"];
    expect(lcp?.[0]).toBe("error");
    expect((lcp?.[1] as { maxNumericValue: number }).maxNumericValue).toBeLessThanOrEqual(2000);
    expect(cls?.[0]).toBe("error");
    expect((cls?.[1] as { maxNumericValue: number }).maxNumericValue).toBeLessThanOrEqual(0.1);
  });
});

// ─── package.json ─────────────────────────────────────────────────────────────

describe("package.json — web-vitals dependency", () => {
  it("lists web-vitals in dependencies", () => {
    const pkg = JSON.parse(readSource("package.json")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["web-vitals"]).toBeDefined();
  });
});
