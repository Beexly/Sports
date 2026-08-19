import { describe, it, expect } from "vitest";
import {
  classifyHealthAlertSnapshot,
  decideHealthAlert,
  HEALTH_ALERT_QUIET_MS,
  decideHealthAlertStateless,
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

describe("decideHealthAlertStateless — bounded alerting without persistence", () => {
  const unhealthy = (ageMinutes: number | null) => ({
    unhealthy: true,
    reason: "ingestion stale",
    ingestionAgeMinutes: ageMinutes,
    settlementUnavailable: false,
  });
  const T0 = Date.parse("2026-08-19T00:00:00Z");
  const TICK = 15 * 60_000;
  // 02:07Z — comfortably inside the 00:00-04:00 block, and not within one tick
  // of either edge, so healthAlertClockRung is identical for now and now-TICK.
  const MID_BLOCK = Date.parse("2026-08-19T02:07:00Z");

  it("never alerts when healthy", () => {
    const d = decideHealthAlertStateless(
      { unhealthy: false, reason: "ok", ingestionAgeMinutes: 3, settlementUnavailable: false },
      T0 + TICK,
    );
    expect(d.shouldAlert).toBe(false);
  });

  it("fires exactly once as ingestion age crosses the 90m threshold", () => {
    // The crossing tick is whichever lands in [90, 105) — one tick wide, so
    // exactly one real tick per outage sees it.
    expect(decideHealthAlertStateless(unhealthy(88), MID_BLOCK).shouldAlert).toBe(false);
    expect(decideHealthAlertStateless(unhealthy(92), MID_BLOCK).shouldAlert).toBe(true);
    expect(decideHealthAlertStateless(unhealthy(104), MID_BLOCK).shouldAlert).toBe(true);
    // Past the window: age-15 is already above the rung, so no re-fire.
    expect(decideHealthAlertStateless(unhealthy(130), MID_BLOCK).shouldAlert).toBe(false);
    expect(decideHealthAlertStateless(unhealthy(300), MID_BLOCK).shouldAlert).toBe(false);
  });

  it("THE REGRESSION: a 24h ingestion outage pages 3 times, not 96", () => {
    // Step a full day in 15-minute ticks with NO state carried between them —
    // exactly what a cold serverless isolate sees. The old module-level `lastState`
    // made every one of these 96 ticks read as a fresh transition.
    let alerts = 0;
    for (let tick = 1; tick <= 96; tick += 1) {
      // Hold the wall clock still mid-block so the clock ladder cannot fire and
      // this test measures the age ladder alone; 4h blocks are covered below.
      if (decideHealthAlertStateless(unhealthy(tick * 15), MID_BLOCK).shouldAlert) {
        alerts += 1;
      }
    }
    expect(alerts).toBe(3); // 90m, 6h, 24h
  });

  it("falls back to 4h wall-clock blocks when no age is observable", () => {
    const noAge = {
      unhealthy: true,
      reason: "checks=[database:down]",
      ingestionAgeMinutes: null,
      settlementUnavailable: false,
    };
    const blockStart = Date.parse("2026-08-19T04:00:00Z");
    expect(decideHealthAlertStateless(noAge, blockStart).shouldAlert).toBe(true);
    expect(decideHealthAlertStateless(noAge, blockStart + TICK).shouldAlert).toBe(false);
    expect(decideHealthAlertStateless(noAge, blockStart + 4 * 60 * 60_000).shouldAlert).toBe(true);
  });

  it("bounds a permanently-broken deployment to <= 9 pages/day", () => {
    const noAge = {
      unhealthy: true,
      reason: "checks=[database:down]",
      ingestionAgeMinutes: null,
      settlementUnavailable: false,
    };
    let alerts = 0;
    for (let tick = 0; tick < 96; tick += 1) {
      if (decideHealthAlertStateless(noAge, T0 + tick * TICK).shouldAlert) alerts += 1;
    }
    expect(alerts).toBe(6); // one per 4h UTC block
  });
});
