import { describe, it, expect } from "vitest";
import { computeMrr, cashOsGreen, type CashSnapshot, type FunnelTargets } from "@/lib/growth/cash-os";

const NOW = new Date("2026-07-23T12:00:00.000Z");

describe("computeMrr", () => {
  it("sums sub_start and sub_renew amounts within the trailing 30 days", () => {
    const events = [
      { kind: "sub_start", amountCents: 2000, at: new Date("2026-07-20T00:00:00.000Z") },
      { kind: "sub_renew", amountCents: 3000, at: new Date("2026-07-10T00:00:00.000Z") },
    ];
    expect(computeMrr(events, NOW)).toBe(5000);
  });

  it("excludes sub_cancel, affiliate, and pilot kinds", () => {
    const events = [
      { kind: "sub_start", amountCents: 1000, at: NOW },
      { kind: "sub_cancel", amountCents: 500, at: NOW },
      { kind: "affiliate_cpa", amountCents: 700, at: NOW },
      { kind: "affiliate_revshare", amountCents: 800, at: NOW },
      { kind: "pilot_invoice", amountCents: 900, at: NOW },
    ];
    expect(computeMrr(events, NOW)).toBe(1000);
  });

  it("excludes events older than 30 days", () => {
    const events = [
      { kind: "sub_start", amountCents: 1000, at: new Date("2026-07-01T00:00:00.000Z") }, // within 30d
      { kind: "sub_renew", amountCents: 2000, at: new Date("2026-06-01T00:00:00.000Z") }, // stale
    ];
    // NOW - 30d = 2026-06-23; 2026-07-01 is within window, 2026-06-01 is not.
    expect(computeMrr(events, NOW)).toBe(1000);
  });

  it("includes an event exactly at the 30-day boundary", () => {
    const boundary = new Date(NOW.getTime() - 30 * 864e5);
    const events = [{ kind: "sub_start", amountCents: 1234, at: boundary }];
    expect(computeMrr(events, NOW)).toBe(1234);
  });

  it("returns 0 for an empty event list", () => {
    expect(computeMrr([], NOW)).toBe(0);
  });

  it("mixes fresh and stale, in-scope and out-of-scope kinds correctly", () => {
    const events = [
      { kind: "sub_start", amountCents: 1000, at: new Date("2026-07-22T00:00:00.000Z") },
      { kind: "sub_renew", amountCents: 500, at: new Date("2026-07-21T00:00:00.000Z") },
      { kind: "sub_cancel", amountCents: 999, at: new Date("2026-07-22T00:00:00.000Z") },
      { kind: "affiliate_cpa", amountCents: 999, at: new Date("2026-07-22T00:00:00.000Z") },
      { kind: "pilot_invoice", amountCents: 999, at: new Date("2026-07-22T00:00:00.000Z") },
      { kind: "sub_renew", amountCents: 999, at: new Date("2026-01-01T00:00:00.000Z") }, // stale
    ];
    expect(computeMrr(events, NOW)).toBe(1500);
  });
});

function baseSnapshot(overrides: Partial<CashSnapshot> = {}): CashSnapshot {
  return {
    mrrCents: 100_000,
    mrrTrend7d: 0,
    activations7d: 50,
    affiliateCents30d: 0,
    pilotCents30d: 0,
    payingUsers: 10,
    ...overrides,
  };
}

const TARGETS: FunnelTargets = { mrrCents: 100_000, weeklyActives: 50 };

describe("cashOsGreen", () => {
  it("is green when exactly at both targets", () => {
    expect(cashOsGreen(baseSnapshot(), TARGETS)).toBe(true);
  });

  it("is green when comfortably above both targets", () => {
    expect(cashOsGreen(baseSnapshot({ mrrCents: 200_000, activations7d: 100 }), TARGETS)).toBe(true);
  });

  it("is not green one cent under the MRR target", () => {
    expect(cashOsGreen(baseSnapshot({ mrrCents: 99_999 }), TARGETS)).toBe(false);
  });

  it("is not green one activation under the weekly-actives target", () => {
    expect(cashOsGreen(baseSnapshot({ activations7d: 49 }), TARGETS)).toBe(false);
  });

  it("is not green when both targets are missed", () => {
    expect(cashOsGreen(baseSnapshot({ mrrCents: 0, activations7d: 0 }), TARGETS)).toBe(false);
  });
});
