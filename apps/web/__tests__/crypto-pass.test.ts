import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CRYPTO_PASS_DAYS,
  cryptoPassPeriod,
  cryptoPassPriceUsd,
  cryptoPaymentsEnabled,
  grantFromCommerceEvent,
  isCryptoPassTier,
  verifyCommerceSignature,
} from "@/lib/billing/crypto-pass";

/**
 * Crypto passes touch real money. The hard rules under test:
 * dark-by-default (three env vars or nothing), grant ONLY on
 * charge:confirmed with complete metadata, HMAC verification that fails
 * closed, prices from the live pricing phase (never a second list).
 */

const ENV_KEYS = [
  "CRYPTO_PAYMENTS_ENABLED",
  "COINBASE_COMMERCE_API_KEY",
  "COINBASE_COMMERCE_WEBHOOK_SECRET",
] as const;
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
});

describe("cryptoPaymentsEnabled (dark by default)", () => {
  it("requires the flag AND both secrets", () => {
    expect(cryptoPaymentsEnabled()).toBe(false);
    process.env["CRYPTO_PAYMENTS_ENABLED"] = "true";
    expect(cryptoPaymentsEnabled()).toBe(false); // secrets missing
    process.env["COINBASE_COMMERCE_API_KEY"] = "k";
    expect(cryptoPaymentsEnabled()).toBe(false); // webhook secret missing
    process.env["COINBASE_COMMERCE_WEBHOOK_SECRET"] = "s";
    expect(cryptoPaymentsEnabled()).toBe(true);
  });
});

describe("pass pricing + period", () => {
  it("prices come from the live pricing phase (single source of truth)", () => {
    // FOUNDING phase ladder: Pro $99/yr, Elite $179/yr.
    expect(cryptoPassPriceUsd("PRO")).toBe(99);
    expect(cryptoPassPriceUsd("ELITE")).toBe(179);
  });

  it("period is exactly the pass length", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    const { start, end } = cryptoPassPeriod(now);
    expect(start).toEqual(now);
    expect((end.getTime() - now.getTime()) / 86_400_000).toBe(CRYPTO_PASS_DAYS);
  });

  it("tier guard admits only PRO/ELITE", () => {
    expect(isCryptoPassTier("PRO")).toBe(true);
    expect(isCryptoPassTier("ELITE")).toBe(true);
    expect(isCryptoPassTier("FREE")).toBe(false);
    expect(isCryptoPassTier("FANTASY")).toBe(false);
    expect(isCryptoPassTier(undefined)).toBe(false);
  });
});

describe("verifyCommerceSignature (fails closed)", () => {
  const secret = "shared-secret";
  const body = JSON.stringify({ event: { type: "charge:confirmed" } });
  const goodSig = createHmac("sha256", secret).update(body, "utf8").digest("hex");

  it("accepts the correct HMAC and rejects everything else", () => {
    expect(verifyCommerceSignature(body, goodSig, secret)).toBe(true);
    expect(verifyCommerceSignature(body, goodSig.replace(/^./, "0"), secret)).toBe(false);
    expect(verifyCommerceSignature(body + " ", goodSig, secret)).toBe(false); // body altered
    expect(verifyCommerceSignature(body, null, secret)).toBe(false);
    expect(verifyCommerceSignature(body, "not-hex-at-all", secret)).toBe(false);
    expect(verifyCommerceSignature(body, goodSig, "")).toBe(false);
  });
});

describe("grantFromCommerceEvent (grant on confirmed ONLY)", () => {
  const confirmed = {
    type: "charge:confirmed",
    data: { code: "CHARGE1", metadata: { userId: "user_1", tier: "PRO" } },
  };

  it("extracts the grant from a confirmed charge with full metadata", () => {
    expect(grantFromCommerceEvent(confirmed)).toEqual({
      chargeCode: "CHARGE1",
      userId: "user_1",
      tier: "PRO",
    });
  });

  it("refuses pending/failed/created events regardless of metadata", () => {
    for (const type of ["charge:created", "charge:pending", "charge:failed", "charge:delayed"]) {
      expect(grantFromCommerceEvent({ ...confirmed, type })).toBeNull();
    }
  });

  it("refuses incomplete or invalid metadata (no guessing on money)", () => {
    expect(grantFromCommerceEvent({ type: "charge:confirmed", data: { code: "C" } })).toBeNull();
    expect(
      grantFromCommerceEvent({
        type: "charge:confirmed",
        data: { code: "C", metadata: { userId: "u", tier: "FREE" } },
      }),
    ).toBeNull();
    expect(
      grantFromCommerceEvent({
        type: "charge:confirmed",
        data: { code: "", metadata: { userId: "u", tier: "PRO" } },
      }),
    ).toBeNull();
    expect(grantFromCommerceEvent(null)).toBeNull();
    expect(grantFromCommerceEvent("string")).toBeNull();
  });
});
