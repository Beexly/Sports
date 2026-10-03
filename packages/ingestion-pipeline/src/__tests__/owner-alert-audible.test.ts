import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyOwner } from "../owner-alert.js";

/**
 * Regression: a CONFIGURED-but-broken owner alert channel must be audible.
 *
 * `notifyOwner` returns `false` on failure and `processSport`'s failure path
 * discards that return value, so before this fix a rotated bot token, a
 * mistyped TELEGRAM_CHAT_ID, a blocked bot, a rate limit or a network timeout
 * were all indistinguishable from a healthy send: the escalation ping the owner
 * relies on simply never arrived, and nothing anywhere recorded that.
 *
 * These tests assert the failure is RECORDED, not merely that the call "doesn't
 * crash" — a `resolves.toBe(false)` assertion passes against the broken code
 * too and proves nothing.
 */

const ENV_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] as const;
const saved: Record<string, string | undefined> = {};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

function loggedText(): string {
  return warnSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
}

describe("notifyOwner surfaces a dead alert channel", () => {
  it("logs the HTTP status when Telegram rejects the send (bad token / chat id)", async () => {
    process.env["TELEGRAM_BOT_TOKEN"] = "rotated_token";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{\"ok\":false}", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(notifyOwner("GSE ingestion FAILED")).resolves.toBe(false);

    expect(warnSpy).toHaveBeenCalled();
    const text = loggedText();
    expect(text).toMatch(/owner-alert/);
    expect(text).toMatch(/401/);
    expect(text).toMatch(/NOT notified/);
  });

  it("logs the exception when the send throws (timeout / network down)", async () => {
    process.env["TELEGRAM_BOT_TOKEN"] = "tok";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("The operation was aborted due to timeout"),
    );

    await expect(notifyOwner("GSE ingestion FAILED")).resolves.toBe(false);

    expect(warnSpy).toHaveBeenCalled();
    const text = loggedText();
    expect(text).toMatch(/owner-alert/);
    expect(text).toMatch(/aborted due to timeout/);
    expect(text).toMatch(/NOT notified/);
  });

  it("never logs the bot token (the request URL embeds it)", async () => {
    process.env["TELEGRAM_BOT_TOKEN"] = "SUPER_SECRET_BOT_TOKEN";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 400, statusText: "Bad Request" }),
    );

    await notifyOwner("GSE ingestion FAILED");

    expect(warnSpy).toHaveBeenCalled();
    expect(loggedText()).not.toContain("SUPER_SECRET_BOT_TOKEN");
    expect(loggedText()).not.toContain("api.telegram.org");
  });

  it("stays silent on a successful send and on the ship-dark unconfigured path", async () => {
    // Unconfigured: documented default, not a fault.
    await expect(notifyOwner("x")).resolves.toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();

    process.env["TELEGRAM_BOT_TOKEN"] = "tok";
    process.env["TELEGRAM_CHAT_ID"] = "42";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(notifyOwner("x")).resolves.toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
