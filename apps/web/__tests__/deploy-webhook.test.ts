import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/webhooks/deploy/route";
import { loadRecentDeploys } from "../../../scripts/compliance/run-ccm";
import { db } from "@sports/db";

vi.mock("@sports/db", () => ({
  db: {
    deployWebhookLog: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

type DeployLogRow = {
  id: string;
  env: string;
  prNumber: number | null;
  requiredChecksOk: boolean;
  deployedAt: Date | null;
  payload: unknown;
  createdAt: Date;
};

describe("Deploy Webhook & CCM Deploy Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/webhooks/deploy", () => {
    it("returns 400 when body is invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/webhooks/deploy", {
        method: "POST",
        body: "invalid-json{",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON body");
    });

    it("returns 400 when delivery ID is missing", async () => {
      const req = new NextRequest("http://localhost/api/webhooks/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: "production", prNumber: 12 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing delivery ID (id field or x-delivery-id header)");
    });

    it("accepts delivery ID from body id field", async () => {
      const mockLogRow: DeployLogRow = {
        id: "deliv-101",
        env: "production",
        prNumber: 42,
        requiredChecksOk: true,
        deployedAt: new Date("2026-10-06T10:00:00.000Z"),
        payload: { id: "deliv-101" },
        createdAt: new Date("2026-10-06T10:01:00.000Z"),
      };

      vi.mocked(db.deployWebhookLog.upsert).mockResolvedValueOnce(
        mockLogRow as unknown as Awaited<ReturnType<typeof db.deployWebhookLog.upsert>>
      );

      const req = new NextRequest("http://localhost/api/webhooks/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "deliv-101",
          env: "production",
          prNumber: 42,
          requiredChecksOk: true,
          deployedAt: "2026-10-06T10:00:00.000Z",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.received).toBe(true);
      expect(data.event).toEqual({
        id: "deliv-101",
        env: "production",
        prNumber: 42,
        requiredChecksOk: true,
        deployedAt: "2026-10-06T10:00:00.000Z",
      });

      expect(db.deployWebhookLog.upsert).toHaveBeenCalledWith({
        where: { id: "deliv-101" },
        create: {
          id: "deliv-101",
          env: "production",
          prNumber: 42,
          requiredChecksOk: true,
          deployedAt: new Date("2026-10-06T10:00:00.000Z"),
          payload: {
            id: "deliv-101",
            env: "production",
            prNumber: 42,
            requiredChecksOk: true,
            deployedAt: "2026-10-06T10:00:00.000Z",
          },
        },
        update: {
          env: "production",
          prNumber: 42,
          requiredChecksOk: true,
          deployedAt: new Date("2026-10-06T10:00:00.000Z"),
          payload: {
            id: "deliv-101",
            env: "production",
            prNumber: 42,
            requiredChecksOk: true,
            deployedAt: "2026-10-06T10:00:00.000Z",
          },
        },
      });
    });

    it("accepts delivery ID from header x-delivery-id (idempotent redelivery)", async () => {
      const mockLogRow: DeployLogRow = {
        id: "header-deliv-200",
        env: "staging",
        prNumber: null,
        requiredChecksOk: false,
        deployedAt: null,
        payload: { env: "staging" },
        createdAt: new Date("2026-10-06T12:00:00.000Z"),
      };

      vi.mocked(db.deployWebhookLog.upsert).mockResolvedValue(
        mockLogRow as unknown as Awaited<ReturnType<typeof db.deployWebhookLog.upsert>>
      );

      const req = new NextRequest("http://localhost/api/webhooks/deploy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-delivery-id": "header-deliv-200",
        },
        body: JSON.stringify({ env: "staging" }),
      });

      const res1 = await POST(req);
      expect(res1.status).toBe(200);

      // Redelivery
      const req2 = new NextRequest("http://localhost/api/webhooks/deploy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-delivery-id": "header-deliv-200",
        },
        body: JSON.stringify({ env: "staging" }),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(200);

      expect(db.deployWebhookLog.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("loadRecentDeploys", () => {
    it("fetches recent deploy logs and maps them 1:1 to DeployEvent", async () => {
      const mockRows: DeployLogRow[] = [
        {
          id: "d1",
          env: "production",
          prNumber: 99,
          requiredChecksOk: true,
          deployedAt: new Date("2026-10-06T08:00:00.000Z"),
          payload: {},
          createdAt: new Date("2026-10-06T08:00:01.000Z"),
        },
        {
          id: "d2",
          env: "staging",
          prNumber: null,
          requiredChecksOk: false,
          deployedAt: null,
          payload: {},
          createdAt: new Date("2026-10-06T09:00:00.000Z"),
        },
      ];

      vi.mocked(db.deployWebhookLog.findMany).mockResolvedValueOnce(
        mockRows as unknown as Awaited<ReturnType<typeof db.deployWebhookLog.findMany>>
      );

      const events = await loadRecentDeploys();

      expect(events).toEqual([
        {
          id: "d1",
          env: "production",
          prNumber: 99,
          requiredChecksOk: true,
          deployedAt: "2026-10-06T08:00:00.000Z",
        },
        {
          id: "d2",
          env: "staging",
          prNumber: undefined,
          requiredChecksOk: false,
          deployedAt: "2026-10-06T09:00:00.000Z",
        },
      ]);

      expect(db.deployWebhookLog.findMany).toHaveBeenCalledWith({
        where: { createdAt: { gte: expect.any(Date) } },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
