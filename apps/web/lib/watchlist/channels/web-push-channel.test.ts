import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * web-push-channel.ts — never hits real network. `web-push`'s
 * `sendNotification`/`setVapidDetails` are mocked at the module boundary.
 * Pins:
 *   - honest no-op ("not_configured") when any of the three VAPID env vars
 *     is missing, individually
 *   - fail-isolation: a thrown/rejected sendNotification never propagates
 *   - the happy path actually calls the mocked SDK with the right shape
 */

const mocks = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

import { sendWebPushAlert, isWebPushConfigured } from "./web-push-channel";

const FULL_ENV = {
  VAPID_PRIVATE_KEY: "priv",
  VAPID_SUBJECT: "mailto:ops@example.com",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub",
};

const SUBSCRIPTION = { endpoint: "https://push.example.com/abc", p256dh: "key1", auth: "key2" };
const PAYLOAD = { title: "GalaxySportsEdge", body: "Chiefs -3.5 graded WIN." };

beforeEach(() => {
  mocks.setVapidDetails.mockReset();
  mocks.sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
});

describe("isWebPushConfigured", () => {
  it("true only when all three env vars are set", () => {
    expect(isWebPushConfigured(FULL_ENV)).toBe(true);
  });

  it("false when any single var is missing", () => {
    expect(isWebPushConfigured({ ...FULL_ENV, VAPID_PRIVATE_KEY: undefined })).toBe(false);
    expect(isWebPushConfigured({ ...FULL_ENV, VAPID_SUBJECT: undefined })).toBe(false);
    expect(isWebPushConfigured({ ...FULL_ENV, NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined })).toBe(false);
  });

  it("false when unset entirely", () => {
    expect(isWebPushConfigured({})).toBe(false);
  });
});

describe("sendWebPushAlert", () => {
  it("no-ops honestly when unconfigured — never calls the SDK", async () => {
    const result = await sendWebPushAlert(SUBSCRIPTION, PAYLOAD, {});
    expect(result).toEqual({ sent: false, detail: "not_configured", classification: "not_configured" });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("no-ops honestly when partially configured (missing subject)", async () => {
    const result = await sendWebPushAlert(SUBSCRIPTION, PAYLOAD, {
      ...FULL_ENV,
      VAPID_SUBJECT: undefined,
    });
    expect(result).toEqual({ sent: false, detail: "not_configured", classification: "not_configured" });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("sends via web-push when fully configured", async () => {
    const result = await sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV);
    expect(result).toEqual({ sent: true, detail: "sent", classification: "sent" });
    expect(mocks.setVapidDetails).toHaveBeenCalledWith("mailto:ops@example.com", "pub", "priv");
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      { endpoint: SUBSCRIPTION.endpoint, keys: { p256dh: "key1", auth: "key2" } },
      JSON.stringify(PAYLOAD),
    );
  });

  it("fail-isolated: a rejected sendNotification never throws, reports send_failed", async () => {
    mocks.sendNotification.mockRejectedValue(new Error("410 Gone — subscription expired"));
    await expect(sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV)).resolves.toMatchObject({
      sent: false,
      detail: "send_failed",
    });
  });

  it("classifies a 410 statusCode as expired so the caller can remove the subscription (6.9)", async () => {
    const gone = Object.assign(new Error("410 Gone"), { statusCode: 410 });
    mocks.sendNotification.mockRejectedValue(gone);
    await expect(sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV)).resolves.toEqual({
      sent: false,
      detail: "send_failed",
      classification: "expired",
      statusCode: 410,
    });
  });

  it("classifies 5xx as retryable and 403 as permanent (6.9)", async () => {
    mocks.sendNotification.mockRejectedValue(Object.assign(new Error("503"), { statusCode: 503 }));
    await expect(sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV)).resolves.toMatchObject({
      classification: "retryable",
      statusCode: 503,
    });
    mocks.sendNotification.mockRejectedValue(Object.assign(new Error("403"), { statusCode: 403 }));
    await expect(sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV)).resolves.toMatchObject({
      classification: "permanent",
      statusCode: 403,
    });
  });

  it("fail-isolated: a thrown setVapidDetails never throws", async () => {
    mocks.setVapidDetails.mockImplementation(() => {
      throw new Error("bad key");
    });
    await expect(sendWebPushAlert(SUBSCRIPTION, PAYLOAD, FULL_ENV)).resolves.toMatchObject({
      sent: false,
      detail: "send_failed",
      classification: "retryable",
    });
  });
});
