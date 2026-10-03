import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * email-channel.ts — never hits real network. The `resend` SDK's `Resend`
 * class is mocked at the module boundary. Pins:
 *   - honest no-op ("not_configured") when either Resend env var is missing
 *   - fail-isolation: a thrown/rejected send, or an SDK-reported
 *     `{ error }` response, never propagates
 *   - the happy path actually calls the mocked SDK with the right shape
 */

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mocks.send },
  })),
}));

import { Resend } from "resend";
import { sendAlertEmail, isEmailConfigured } from "./email-channel";

const FULL_ENV = { RESEND_API_KEY: "re_test_key", ALERTS_EMAIL_FROM: "alerts@example.com" };

beforeEach(() => {
  vi.mocked(Resend).mockClear();
  mocks.send.mockReset().mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("isEmailConfigured", () => {
  it("true only when both env vars are set", () => {
    expect(isEmailConfigured(FULL_ENV)).toBe(true);
  });

  it("false when either var is missing", () => {
    expect(isEmailConfigured({ ...FULL_ENV, RESEND_API_KEY: undefined })).toBe(false);
    expect(isEmailConfigured({ ...FULL_ENV, ALERTS_EMAIL_FROM: undefined })).toBe(false);
  });

  it("false when unset entirely", () => {
    expect(isEmailConfigured({})).toBe(false);
  });
});

describe("sendAlertEmail", () => {
  it("no-ops honestly when unconfigured — never constructs the SDK client", async () => {
    const result = await sendAlertEmail("user@example.com", "subj", "body", {});
    expect(result).toEqual({ sent: false, detail: "not_configured", classification: "not_configured" });
    expect(Resend).not.toHaveBeenCalled();
  });

  it("sends via Resend when fully configured", async () => {
    const result = await sendAlertEmail(
      "user@example.com",
      "GalaxySportsEdge — your watchlist pick graded",
      "Chiefs -3.5 graded WIN.",
      FULL_ENV,
    );
    expect(result).toEqual({ sent: true, detail: "sent", classification: "sent" });
    expect(Resend).toHaveBeenCalledWith("re_test_key");
    expect(mocks.send).toHaveBeenCalledWith({
      from: "alerts@example.com",
      to: "user@example.com",
      subject: "GalaxySportsEdge — your watchlist pick graded",
      text: "Chiefs -3.5 graded WIN.",
    });
  });

  it("fail-isolated: an SDK-reported error response is honestly not-sent, never throws", async () => {
    mocks.send.mockResolvedValue({ data: null, error: { message: "invalid from address" } });
    await expect(
      sendAlertEmail("user@example.com", "subj", "body", FULL_ENV),
    ).resolves.toMatchObject({ sent: false, detail: "send_failed" });
  });

  it("fail-isolated: a rejected send() never throws", async () => {
    mocks.send.mockRejectedValue(new Error("network blip"));
    await expect(
      sendAlertEmail("user@example.com", "subj", "body", FULL_ENV),
    ).resolves.toMatchObject({ sent: false, detail: "send_failed" });
  });
});
