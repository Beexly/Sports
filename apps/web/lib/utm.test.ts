import { describe, expect, it } from "vitest";
import { buildVaultSourceHref, parseShortFormUtmParams } from "./utm";

describe("Vault source links", () => {
  it("builds a contextual Vault href with source attribution", () => {
    expect(buildVaultSourceHref("loss-room")).toBe("/vault?source=loss-room");
  });

  it("URL-encodes source values", () => {
    expect(buildVaultSourceHref("model journal")).toBe(
      "/vault?source=model+journal",
    );
  });
});

describe("short-form UTM parsing", () => {
  it("accepts allowed short-form attribution params", () => {
    const result = parseShortFormUtmParams({
      utm_source: "youtube",
      utm_medium: "short_form",
      utm_campaign: "loss_room_30",
      utm_content: "SFC-001",
    });

    expect(result).toEqual({
      ok: true,
      params: {
        utmSource: "youtube",
        utmMedium: "short_form",
        utmCampaign: "loss_room_30",
        utmContent: "SFC-001",
      },
    });
  });

  it("rejects disallowed short-form attribution params", () => {
    const result = parseShortFormUtmParams(
      new URLSearchParams({
        utm_source: "paid-network",
        utm_medium: "ad",
        utm_campaign: "checkout_push",
        utm_content: "bad",
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        "utm_source is not allowed.",
        "utm_medium must be short_form.",
        "utm_campaign is not allowed.",
        "utm_content must use an SFC-000 draft id.",
      ]);
    }
  });
});
