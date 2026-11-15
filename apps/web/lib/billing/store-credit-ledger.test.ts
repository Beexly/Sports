// @vitest-environment node
/**
 * Store-credit ledger — pure rule engine tests (logic-only, no DB, no DOM).
 */
import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  playNetUnits,
  packNetUnits,
  settlePack,
  mintStoreCredit,
  InMemoryStoreCreditStore,
  UPGRADE_CREDIT_CENTS,
  type PackPlayOutcome,
} from "./store-credit-ledger";

const win = (pickId: string, americanPrice: number): PackPlayOutcome => ({
  pickId,
  result: "WIN",
  americanPrice,
});
const loss = (pickId: string): PackPlayOutcome => ({
  pickId,
  result: "LOSS",
  americanPrice: -110,
});
const push = (pickId: string): PackPlayOutcome => ({
  pickId,
  result: "PUSH",
  americanPrice: -110,
});

describe("americanToDecimal", () => {
  it("converts negative American prices (profit per 100 risked)", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1 + 100 / 110, 10);
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 10);
    expect(americanToDecimal(-100)).toBeCloseTo(2, 10);
  });

  it("converts positive American prices (profit per 100 staked)", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 10);
    expect(americanToDecimal(100)).toBeCloseTo(2, 10);
    expect(americanToDecimal(300)).toBeCloseTo(4, 10);
  });

  it("rejects invalid prices", () => {
    for (const bad of [0, 99, -99, 50, -50, 1.5, NaN, Infinity]) {
      expect(() => americanToDecimal(bad)).toThrow();
    }
  });
});

describe("playNetUnits / packNetUnits (flat 1u stake)", () => {
  it("WIN nets decimal-1 at the locked American price", () => {
    expect(playNetUnits(win("p1", -110))).toBeCloseTo(100 / 110, 10);
    expect(playNetUnits(win("p2", 150))).toBeCloseTo(1.5, 10);
  });

  it("LOSS nets -1u; PUSH and VOID net 0u", () => {
    expect(playNetUnits(loss("p1"))).toBe(-1);
    expect(playNetUnits(push("p1"))).toBe(0);
    expect(playNetUnits({ pickId: "p1", result: "VOID", americanPrice: -110 })).toBe(0);
  });

  it("sums a mixed pack correctly", () => {
    // WIN -110 (+0.9091u) + LOSS (-1u) = -0.0909u
    expect(packNetUnits([win("p1", -110), loss("p2")])).toBeCloseTo(-0.0909, 4);
    // WIN +150 (+1.5u) + LOSS (-1u) = +0.5u
    expect(packNetUnits([win("p1", 150), loss("p2")])).toBeCloseTo(0.5, 10);
    // PUSH + VOID = 0u
    expect(packNetUnits([push("p1"), { pickId: "p2", result: "VOID", americanPrice: 120 }])).toBe(0);
    expect(packNetUnits([])).toBe(0);
  });
});

describe("settlePack — credit minting rules", () => {
  const baseInput = {
    purchaseId: "pur_1",
    slateKey: "primetime-showdown",
    packPriceCents: 2900,
    tier: "credit-back" as const,
    plays: [win("p1", -110), loss("p2")], // net -0.0909u
  };

  it("mints 100% of pack price when net <= 0 on the credit-back tier", async () => {
    const store = new InMemoryStoreCreditStore();
    const res = await settlePack(baseInput, store);
    expect(res.minted).toBe(true);
    expect(res.duplicate).toBe(false);
    expect(res.reason).toBe("minted");
    expect(res.netUnits).toBeCloseTo(-0.0909, 4);
    expect(res.record).not.toBeNull();
    expect(res.record!.creditBackCents).toBe(2900);
    expect(res.record!.upgradeCreditCents).toBe(UPGRADE_CREDIT_CENTS);
    expect(res.record!.choice).toBe("store-credit");
    expect(res.record!.grantedCents).toBe(2900);
    expect(store.size()).toBe(1);
  });

  it("mints at exactly 0.00u (boundary is at-or-below)", async () => {
    const store = new InMemoryStoreCreditStore();
    const res = await settlePack({ ...baseInput, plays: [push("p1")] }, store);
    expect(res.netUnits).toBe(0);
    expect(res.minted).toBe(true);
    expect(res.record!.creditBackCents).toBe(2900);
  });

  it("does NOT mint when net > 0", async () => {
    const store = new InMemoryStoreCreditStore();
    const res = await settlePack(
      { ...baseInput, plays: [win("p1", 150), loss("p2")] }, // +0.5u
      store,
    );
    expect(res.minted).toBe(false);
    expect(res.reason).toBe("net-positive");
    expect(res.record).toBeNull();
    expect(store.size()).toBe(0);
  });

  it("does NOT mint on the standard tier even at net <= 0", async () => {
    const store = new InMemoryStoreCreditStore();
    const res = await settlePack(
      { ...baseInput, tier: "standard", packPriceCents: 1900 },
      store,
    );
    expect(res.minted).toBe(false);
    expect(res.reason).toBe("standard-tier");
    expect(store.size()).toBe(0);
  });

  it("is idempotent per (purchaseId, slateKey) — never double-mints", async () => {
    const store = new InMemoryStoreCreditStore();
    const first = await settlePack(baseInput, store);
    const second = await settlePack(baseInput, store);
    expect(first.minted).toBe(true);
    expect(second.minted).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.reason).toBe("already-minted");
    expect(second.record).toEqual(first.record);
    expect(store.size()).toBe(1);

    // Even a later call with different plays/choice cannot re-mint or alter it.
    const third = await settlePack(
      { ...baseInput, plays: [win("p1", 150)], choice: "upgrade-credit" },
      store,
    );
    expect(third.duplicate).toBe(true);
    expect(third.record).toEqual(first.record);
    expect(store.size()).toBe(1);
  });

  it("treats different slates under one purchase as separate mints", async () => {
    const store = new InMemoryStoreCreditStore();
    await settlePack(baseInput, store);
    const other = await settlePack({ ...baseInput, slateKey: "sunday-full-slate" }, store);
    expect(other.minted).toBe(true);
    expect(store.size()).toBe(2);
  });

  it("records the flat $35 upgrade-credit election exactly", async () => {
    const store = new InMemoryStoreCreditStore();
    const res = await settlePack({ ...baseInput, choice: "upgrade-credit" }, store);
    expect(res.minted).toBe(true);
    expect(res.record!.choice).toBe("upgrade-credit");
    expect(res.record!.creditBackCents).toBe(2900); // full-price option still recorded
    expect(res.record!.upgradeCreditCents).toBe(3500);
    expect(res.record!.grantedCents).toBe(3500);
  });

  it("rejects malformed input", async () => {
    const store = new InMemoryStoreCreditStore();
    await expect(settlePack({ ...baseInput, purchaseId: "" }, store)).rejects.toThrow();
    await expect(settlePack({ ...baseInput, slateKey: "" }, store)).rejects.toThrow();
    await expect(settlePack({ ...baseInput, packPriceCents: -1 }, store)).rejects.toThrow();
    await expect(settlePack({ ...baseInput, packPriceCents: 19.5 }, store)).rejects.toThrow();
  });

  it("exposes mintStoreCredit as the same engine", () => {
    expect(mintStoreCredit).toBe(settlePack);
  });
});