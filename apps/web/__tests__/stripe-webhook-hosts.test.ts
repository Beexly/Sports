import { describe, expect, it } from "vitest";
import {
  classifyStripeWebhookHosts,
  hostFromWebhookUrl,
  isGalaxySportsHost,
} from "@/lib/ops/stripe-webhook-hosts";

describe("stripe-webhook-hosts", () => {
  it("parses hosts and recognizes GSE", () => {
    expect(hostFromWebhookUrl("https://www.galaxysportsedge.com/api/webhooks/stripe")).toBe(
      "www.galaxysportsedge.com",
    );
    expect(isGalaxySportsHost("www.galaxysportsedge.com")).toBe(true);
    expect(isGalaxySportsHost("lumeralabel.medusajs.app")).toBe(false);
  });

  it("marks clean GSE + disabled foreign as healthy (no auditRequired)", () => {
    const p = classifyStripeWebhookHosts([
      {
        url: "https://www.galaxysportsedge.com/api/webhooks/stripe",
        status: "enabled",
      },
      {
        url: "https://lumeralabel.medusajs.app/hooks/payment/stripe_stripe",
        status: "disabled",
      },
    ]);
    expect(p.gsePrimaryHealthy).toBe(true);
    expect(p.auditRequired).toBe(false);
    expect(p.disabledForeignHosts).toContain("lumeralabel.medusajs.app");
    expect(p.operatorHint).toMatch(/healthy/i);
  });

  it("requires audit when foreign is enabled", () => {
    const p = classifyStripeWebhookHosts([
      {
        url: "https://www.galaxysportsedge.com/api/webhooks/stripe",
        status: "enabled",
      },
      {
        url: "https://evil.example/hooks",
        status: "enabled",
      },
    ]);
    expect(p.auditRequired).toBe(true);
    expect(p.gsePrimaryHealthy).toBe(false);
    expect(p.enabledForeignHosts).toContain("evil.example");
  });

  it("flags missing GSE enabled endpoint", () => {
    const p = classifyStripeWebhookHosts([
      { url: "https://other.app/hook", status: "disabled" },
    ]);
    expect(p.gsePrimaryHealthy).toBe(false);
    expect(p.auditRequired).toBe(false);
  });
});
