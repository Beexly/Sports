import { describe, it, expect } from "vitest";
import {
  classifyHealthAlertSnapshot,
  decideHealthAlert,
  HEALTH_ALERT_QUIET_MS,
} from "@/lib/ops/health-alert-decision";

describe("classifyHealthAlertSnapshot", () => {
  it("is healthy when checks ok and settlement fine", () => {
    const snap = classifyHealthAlertSnapshot({
      checks: {
        database: { status: "ok" },
        ingestion: { status: "ok", ageMinutes: 30 },
      },
      capabilities: [{ capabilityId: "settlement", status: "healthy" }],
    });
    expect(snap.unhealthy).toBe(false);
  });

  it("is unhealthy when ingestion age > 90", () => {
    const snap = classifyHealthAlertSnapshot({
      checks: {
        database: { status: "ok" },
        ingestion: { status: "error", ageMinutes: 120, detail: "stale" },
      },
      capabilities: [],
    });
    expect(snap.unhealthy).toBe(true);
    expect(snap.ingestionAgeMinutes).toBe(120);
  });

  it("is unhealthy when settlement critically behind", () => {
    const snap = classifyHealthAlertSnapshot({
      checks: {
        database: { status: "ok" },
        ingestion: { status: "ok", ageMinutes: 10 },
      },
      capabilities: [
        {
          capabilityId: "settlement",
          status: "unavailable",
          reason: "settlement is critically behind on commenced picks",
        },
      ],
    });
    expect(snap.unhealthy).toBe(true);
    expect(snap.settlementUnavailable).toBe(true);
  });
});

describe("decideHealthAlert", () => {
  const unhealthy = {
    unhealthy: true,
    reason: "ingestion stale",
    ingestionAgeMinutes: 200,
    settlementUnavailable: false,
  };

  it("alerts on transition to unhealthy", () => {
    const d = decideHealthAlert(unhealthy, {
      lastAlertAt: null,
      lastUnhealthy: false,
      lastReason: null,
    });
    expect(d.shouldAlert).toBe(true);
    expect(d.reason).toMatch(/transition/);
  });

  it("stays quiet inside the 4h window", () => {
    const now = Date.now();
    const d = decideHealthAlert(
      unhealthy,
      {
        lastAlertAt: new Date(now - 60_000).toISOString(),
        lastUnhealthy: true,
        lastReason: "ingestion stale",
      },
      now,
    );
    expect(d.shouldAlert).toBe(false);
    expect(d.reason).toMatch(/quiet-window/);
  });

  it("re-alerts after quiet window", () => {
    const now = Date.now();
    const d = decideHealthAlert(
      unhealthy,
      {
        lastAlertAt: new Date(now - HEALTH_ALERT_QUIET_MS - 1).toISOString(),
        lastUnhealthy: true,
        lastReason: "ingestion stale",
      },
      now,
    );
    expect(d.shouldAlert).toBe(true);
    expect(d.reason).toMatch(/still-unhealthy/);
  });

  it("does not alert when healthy", () => {
    const d = decideHealthAlert(
      {
        unhealthy: false,
        reason: "ok",
        ingestionAgeMinutes: 10,
        settlementUnavailable: false,
      },
      { lastAlertAt: null, lastUnhealthy: false, lastReason: null },
    );
    expect(d.shouldAlert).toBe(false);
  });
});
