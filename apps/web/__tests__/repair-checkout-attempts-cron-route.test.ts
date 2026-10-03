import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Checkout-attempt repair cron (/api/cron/repair-checkout-attempts):
 * CRON_SECRET auth, report pass-through, `ok` semantics (unresolved/errored
 * attempts mean an operator should look), and the durable-store 503. The
 * repair job itself is covered by checkout-attempt-repair.test.ts; here it is
 * mocked so the route contract runs in isolation.
 */

const mocks = vi.hoisted(() => ({
  runCheckoutAttemptRepair: vi.fn<() => Promise<Record<string, number>>>(),
}));

vi.mock("@/lib/stripe", () => ({
  runCheckoutAttemptRepair: mocks.runCheckoutAttemptRepair,
}));

import { GET } from "@/app/api/cron/repair-checkout-attempts/route";
import { DurableWriteStoreUnavailableError } from "@sports/db";

const CLEAN_REPORT = {
  scanned: 3,
  completed: 1,
  rebound: 1,
  expired: 1,
  provenAbsent: 0,
  openPastTtl: 0,
  raced: 0,
  unresolved: 0,
  errors: 0,
};

function req(auth?: string): Request {
  return new Request(
    "http://localhost/api/cron/repair-checkout-attempts",
    auth ? { headers: { authorization: auth } } : undefined,
  );
}

describe("GET /api/cron/repair-checkout-attempts", () => {
  beforeEach(() => {
    mocks.runCheckoutAttemptRepair.mockReset();
    process.env["CRON_SECRET"] = "s3cret";
  });
  afterEach(() => {
    delete process.env["CRON_SECRET"];
  });

  it("rejects a missing/wrong bearer token with 401 and never runs the job", async () => {
    for (const request of [req(), req("Bearer wrong")]) {
      const res = await GET(request);
      expect(res.status).toBe(401);
    }
    expect(mocks.runCheckoutAttemptRepair).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is unset (never an open cron)", async () => {
    delete process.env["CRON_SECRET"];
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(mocks.runCheckoutAttemptRepair).not.toHaveBeenCalled();
  });

  it("runs the repair job and returns the full report with ok=true on a clean pass", async () => {
    mocks.runCheckoutAttemptRepair.mockResolvedValue({ ...CLEAN_REPORT });
    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, ...CLEAN_REPORT });
  });

  it("ok=false when attempts stay unresolved or errored — the operator should look", async () => {
    mocks.runCheckoutAttemptRepair.mockResolvedValue({
      ...CLEAN_REPORT,
      unresolved: 2,
    });
    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.unresolved).toBe(2);
  });

  it("maps a durable-write-guard refusal to a typed 503 (fail closed)", async () => {
    mocks.runCheckoutAttemptRepair.mockRejectedValue(
      new DurableWriteStoreUnavailableError("stripe-checkout", "stub_client_active", "stub"),
    );
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(503);
  });
});
