/**
 * C-420 / F-32 — OPS_READ_SECRET authorises read-only ops surfaces.
 *
 * Three cases this file pins:
 *   1. OPS_READ_SECRET set  → Bearer OPS_READ_SECRET authorises reads
 *      (public-surface-truth detailed view, daily-truth, settlement-rca,
 *      ranking-pause-apply GET).
 *   2. OPS_READ_SECRET unset → read surfaces fall back to CRON_SECRET so
 *      nothing changes until the founder sets the new secret (§0.2 item 3).
 *   3. Mutation crons never accept OPS_READ_SECRET. A leaked read credential
 *      must not fire settle-picks / ranking-pause-apply POST / any cronAuthError
 *      route.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cronAuthError,
  cronAuthErrorBearerOnly,
  hasOpsReadAuth,
  opsReadAuthError,
} from "@/lib/cron/authorize";
import { hasOpsAuth } from "@/lib/ops/ops-auth";

const CRON = "mutation-cron-secret";
const OPS_READ = "read-only-ops-secret";

function req(auth: string | null, path = "/api/ops/public-surface-truth"): Request {
  const headers = new Headers();
  if (auth) headers.set("authorization", auth);
  return new Request(`http://localhost${path}`, { headers });
}

describe("C-420 OPS_READ_SECRET for read-only ops surfaces", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env["CRON_SECRET"] = CRON;
    delete process.env["OPS_READ_SECRET"];
    delete process.env["CRON_SECRET_PREVIOUS"];
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  // ── Case 1: OPS_READ_SECRET authorises reads when set ─────────────────────
  describe("OPS_READ_SECRET set", () => {
    beforeEach(() => {
      process.env["OPS_READ_SECRET"] = OPS_READ;
    });

    it("opsReadAuthError accepts Bearer OPS_READ_SECRET", () => {
      expect(opsReadAuthError(req(`Bearer ${OPS_READ}`))).toBeNull();
      expect(hasOpsReadAuth(req(`Bearer ${OPS_READ}`))).toBe(true);
      expect(hasOpsAuth(req(`Bearer ${OPS_READ}`))).toBe(true);
    });

    it("still accepts CRON_SECRET for reads (transition / convenience)", () => {
      expect(opsReadAuthError(req(`Bearer ${CRON}`))).toBeNull();
      expect(hasOpsAuth(req(`Bearer ${CRON}`))).toBe(true);
    });

    it("rejects a wrong bearer on the read surface", () => {
      const r = opsReadAuthError(req("Bearer not-a-secret"));
      expect(r).not.toBeNull();
      expect(r!.status).toBe(401);
      expect(hasOpsAuth(req("Bearer not-a-secret"))).toBe(false);
    });

    it("ranking-pause-apply GET accepts OPS_READ_SECRET", async () => {
      const { GET } = await import("@/app/api/ops/ranking-pause-apply/route");
      const res = await GET(req(`Bearer ${OPS_READ}`, "/api/ops/ranking-pause-apply"));
      // 200 when the durable store answers; never 401 — the read secret passed.
      expect(res.status).not.toBe(401);
    });
  });

  // ── Case 2: OPS_READ_SECRET unset → fall back to CRON_SECRET ──────────────
  describe("OPS_READ_SECRET unset (fallback to CRON_SECRET)", () => {
    beforeEach(() => {
      delete process.env["OPS_READ_SECRET"];
    });

    it("opsReadAuthError accepts Bearer CRON_SECRET", () => {
      expect(opsReadAuthError(req(`Bearer ${CRON}`))).toBeNull();
      expect(hasOpsReadAuth(req(`Bearer ${CRON}`))).toBe(true);
      expect(hasOpsAuth(req(`Bearer ${CRON}`))).toBe(true);
    });

    it("rejects a would-be OPS_READ_SECRET value when the env is unset", () => {
      // The founder has not set OPS_READ_SECRET yet — a random bearer that
      // happens to look like a "read secret" must not authorise.
      const r = opsReadAuthError(req(`Bearer ${OPS_READ}`));
      expect(r).not.toBeNull();
      expect(r!.status).toBe(401);
      expect(hasOpsAuth(req(`Bearer ${OPS_READ}`))).toBe(false);
    });

    it("fails closed (500) when neither secret is configured", () => {
      delete process.env["CRON_SECRET"];
      const r = opsReadAuthError(req(`Bearer ${OPS_READ}`));
      expect(r).not.toBeNull();
      expect(r!.status).toBe(500);
      expect(hasOpsAuth(req(`Bearer ${OPS_READ}`))).toBe(false);
    });
  });

  // ── Case 3: mutation crons never accept OPS_READ_SECRET ───────────────────
  describe("mutation crons reject OPS_READ_SECRET", () => {
    beforeEach(() => {
      process.env["OPS_READ_SECRET"] = OPS_READ;
      process.env["CRON_SECRET"] = CRON;
    });

    it("cronAuthError returns 401 for Bearer OPS_READ_SECRET", () => {
      const r = cronAuthError(
        req(`Bearer ${OPS_READ}`, "/api/cron/settle-picks"),
      );
      expect(r).not.toBeNull();
      expect(r!.status).toBe(401);
    });

    it("cronAuthErrorBearerOnly returns 401 for Bearer OPS_READ_SECRET", () => {
      const r = cronAuthErrorBearerOnly(
        req(`Bearer ${OPS_READ}`, "/api/cron/autonomy-cycle"),
      );
      expect(r).not.toBeNull();
      expect(r!.status).toBe(401);
    });

    it("cronAuthError still accepts Bearer CRON_SECRET", () => {
      expect(cronAuthError(req(`Bearer ${CRON}`, "/api/cron/settle-picks"))).toBeNull();
    });

    it("ranking-pause-apply POST rejects OPS_READ_SECRET (mutation half)", async () => {
      // Mock the durable layers so a successful auth would proceed past 401.
      vi.doMock("@sports/db", () => ({
        isStubMode: () => true,
        db: {
          jarvisMemoryEvent: {
            create: vi.fn(),
            findFirst: vi.fn().mockResolvedValue(null),
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
      }));
      const { POST } = await import("@/app/api/ops/ranking-pause-apply/route");
      const res = await POST(
        new Request("http://localhost/api/ops/ranking-pause-apply", {
          method: "POST",
          headers: {
            authorization: `Bearer ${OPS_READ}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ enabled: false }),
        }),
      );
      expect(res.status).toBe(401);
      vi.doUnmock("@sports/db");
    });
  });
});
