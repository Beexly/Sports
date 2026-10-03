import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyOwner, ownerAlertsConfigured } from "../owner-alert.js";

/**
 * Owner alerting must be dark-by-default (no env vars -> no network call, ever)
 * and fail-safe (a broken Telegram must never break the ingestion pipeline).
 */

const ENV_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("owner alerting", () => {
  it("is a complete no-op without both env vars (no fetch fired)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(ownerAlertsConfigured()).toBe(false);
    expect(await notifyOwner("test")).toBe(false);
    process.env["TELEGRAM_BOT_TOKEN"] = "t";
    expect(await notifyOwner("test")).toBe(false); // chat id still missing
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends when configured and reports success on 200", async () => {
    process.env["TELEGRAM_BOT_TOKEN"] = "tok123";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    expect(ownerAlertsConfigured()).toBe(true);
    expect(await notifyOwner("GSE ingestion FAILED")).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain("api.telegram.org/bottok123/sendMessage");
    const body = JSON.parse(String(init?.body));
    expect(body.chat_id).toBe("42");
    expect(body.text).toContain("GSE ingestion FAILED");
  });

  it("never throws when the network fails (pipeline stays alive)", async () => {
    process.env["TELEGRAM_BOT_TOKEN"] = "tok";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    await expect(notifyOwner("x")).resolves.toBe(false);
  });
});
