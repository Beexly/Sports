import { describe, expect, it } from "vitest";
import {
  shouldRenderCloudflareAnalytics,
  shouldRenderMicrosoftClarity,
} from "@/lib/analytics/provider-gating";

// OP-004 regression: apps/web/app/layout.tsx used to gate BOTH Cloudflare
// Analytics and Microsoft Clarity on the single master flag
// NEXT_PUBLIC_ANALYTICS_ENABLED, interpolating each provider's own token
// directly into the emitted script with no existence check. If the master
// flag was "true" but a provider's own env var was unset, the browser
// requested a literal "https://www.clarity.ms/tag/undefined" (or a
// data-cf-beacon token of the string "undefined") -- a malformed request,
// not a silently-skipped provider. These pure gating functions are what
// layout.tsx now calls; they must fail each provider independently.

describe("analytics provider gating (OP-004)", () => {
  describe("shouldRenderCloudflareAnalytics", () => {
    it("renders when the master flag is on and the beacon token is present", () => {
      expect(shouldRenderCloudflareAnalytics("true", "real-token-123")).toBe(true);
    });

    it("does not render when the master flag is off, even with a valid token", () => {
      expect(shouldRenderCloudflareAnalytics("false", "real-token-123")).toBe(false);
      expect(shouldRenderCloudflareAnalytics(undefined, "real-token-123")).toBe(false);
    });

    it("does not render when the master flag is on but the token is missing", () => {
      expect(shouldRenderCloudflareAnalytics("true", undefined)).toBe(false);
    });

    it("does not render for a blank/whitespace-only token (never fabricates an identifier)", () => {
      expect(shouldRenderCloudflareAnalytics("true", "")).toBe(false);
      expect(shouldRenderCloudflareAnalytics("true", "   ")).toBe(false);
    });
  });

  describe("shouldRenderMicrosoftClarity", () => {
    it("renders when the master flag is on and the project id is present", () => {
      expect(shouldRenderMicrosoftClarity("true", "abc123")).toBe(true);
    });

    it("does not render when the master flag is off, even with a valid project id", () => {
      expect(shouldRenderMicrosoftClarity("false", "abc123")).toBe(false);
      expect(shouldRenderMicrosoftClarity(undefined, "abc123")).toBe(false);
    });

    it("does not render when the master flag is on but the project id is missing -- the exact bug: this must never resolve to emitting a tag literally named 'undefined'", () => {
      expect(shouldRenderMicrosoftClarity("true", undefined)).toBe(false);
    });

    it("does not render for a blank/whitespace-only project id", () => {
      expect(shouldRenderMicrosoftClarity("true", "")).toBe(false);
      expect(shouldRenderMicrosoftClarity("true", "  ")).toBe(false);
    });
  });

  describe("independence: one provider's missing token never affects the other", () => {
    it("Cloudflare renders while Clarity does not, when only the Clarity id is missing", () => {
      expect(shouldRenderCloudflareAnalytics("true", "cf-token")).toBe(true);
      expect(shouldRenderMicrosoftClarity("true", undefined)).toBe(false);
    });

    it("Clarity renders while Cloudflare does not, when only the CF token is missing", () => {
      expect(shouldRenderCloudflareAnalytics("true", undefined)).toBe(false);
      expect(shouldRenderMicrosoftClarity("true", "clarity-id")).toBe(true);
    });
  });
});
