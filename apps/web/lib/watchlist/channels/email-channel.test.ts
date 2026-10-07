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
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "alerts@example.com",
        to: "user@example.com",
        subject: "GalaxySportsEdge — your watchlist pick graded",
      }),
    );
    // The caller's body is preserved verbatim; the opt-out footer is
    // appended by this channel, never substituted for the message.
    const sent = mocks.send.mock.calls[0]?.[0] as { text: string };
    expect(sent.text.startsWith("Chiefs -3.5 graded WIN.")).toBe(true);
  });

  it("carries a List-Unsubscribe header and a footer opt-out link on every send", async () => {
    await sendAlertEmail("user@example.com", "subj", "Chiefs -3.5 graded WIN.", FULL_ENV);
    const sent = mocks.send.mock.calls[0]?.[0] as {
      text: string;
      headers?: Record<string, string>;
    };
    // RFC 2369: a mailbox-provider-honored opt-out route. Without it an
    // Elite member who wants push-only had no way to stop email short of
    // unverifying their address or cancelling, and Gmail/Yahoo bulk-sender
    // guidance treats its absence as a deliverability negative.
    const listUnsubscribe = sent.headers?.["List-Unsubscribe"] ?? "";
    expect(listUnsubscribe).toContain("mailto:");
    expect(listUnsubscribe).toContain("https://");
    // A human-visible route too — a header alone is invisible in most clients.
    expect(sent.text).toMatch(/unsubscribe/i);
  });

  it("does NOT claim RFC 8058 one-click while no preference store can honor it", async () => {
    await sendAlertEmail("user@example.com", "subj", "body", FULL_ENV);
    const sent = mocks.send.mock.calls[0]?.[0] as { headers?: Record<string, string> };
    // The opt-out routes we CAN honor today are advertised...
    expect(sent.headers?.["List-Unsubscribe"]).toBeTruthy();
    // ...but One-Click is not. Advertising RFC 8058 to Gmail and then not
    // actually unsubscribing the recipient is a false promise that HURTS
    // deliverability. The header lands with the per-user preference model
    // (schema change — see the PR write-up).
    expect(sent.headers?.["List-Unsubscribe-Post"]).toBeUndefined();
  });

  it("the opt-out is per-CONTEXT: a waitlist send never claims a team follow it cannot substantiate", async () => {
    // sendAlertEmail is not the alert path's private helper —
    // lib/gse/waitlist-welcome-email.ts routes through it too. A fixed
    // "you follow this team / unfollow at /watchlist" footer would be
    // fabricated copy for a lead who follows nothing and may have no
    // account, pointing at a route that does nothing for them.
    await sendAlertEmail("lead@example.com", "welcome", "Thanks for joining.", FULL_ENV, "waitlist");
    const sent = mocks.send.mock.calls[0]?.[0] as {
      text: string;
      headers?: Record<string, string>;
    };
    expect(sent.text).not.toMatch(/follow this team/i);
    expect(sent.text).not.toContain("/watchlist");
    expect(sent.text).toMatch(/founding waitlist/i);
    // Still never sent with NO opt-out at all — but only the route that is
    // real here (a human honors the mailto); no self-service page is
    // advertised because none exists for founding-list leads.
    const listUnsubscribe = sent.headers?.["List-Unsubscribe"] ?? "";
    expect(listUnsubscribe).toContain("mailto:");
    expect(listUnsubscribe).not.toContain("https://");
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
