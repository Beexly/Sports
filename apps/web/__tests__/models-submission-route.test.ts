import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/ops/ops-auth", () => ({
  hasOpsAuth: (request: Request) =>
    request.headers.get("authorization") === "Bearer ops-secret",
}));

import { GET, POST } from "@/app/api/models/submission/route";

function req(
  init: {
    auth?: string;
    body?: unknown;
    url?: string;
  } = {},
): Request {
  return new Request(init.url ?? "http://x/api/models/submission", {
    method: init.body === undefined ? "GET" : "POST",
    headers: {
      ...(init.auth ? { authorization: init.auth } : {}),
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const validPackage = {
  rows: [
    {
      event_id: "ev1",
      market: "MONEYLINE",
      selection: "BUF",
      probability: 0.62,
      fair_price: 1.61,
      model_id: "m1",
      generated_at: "2026-09-25T12:00:00Z",
    },
  ],
  thesis: {
    thesis: "test thesis",
    features_used: ["edgeScore"],
    training_window: "2025-01-01/2026-09-01",
    known_limitations: "none for this test",
  },
  eventStarts: { ev1: "2026-09-25T18:00:00Z" },
};

describe("GET /api/models/submission", () => {
  it("returns the V5 contract snapshot without auth", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; contract: string };
    expect(body.ok).toBe(true);
    expect(body.contract).toBe("v5-model-submission");
  });
});

describe("POST /api/models/submission", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "ops-secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("401s without ops auth", async () => {
    const res = await POST(req({ body: validPackage }));
    expect(res.status).toBe(401);
  });

  it("validates a well-formed package", async () => {
    const res = await POST(
      req({ auth: "Bearer ops-secret", body: validPackage }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; rowCount: number };
    expect(body.ok).toBe(true);
    expect(body.rowCount).toBe(1);
  });

  it("fail-closes on probability out of range", async () => {
    const bad = {
      ...validPackage,
      rows: [{ ...validPackage.rows[0], probability: 1.4 }],
    };
    const res = await POST(req({ auth: "Bearer ops-secret", body: bad }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      ok: boolean;
      failures: { code: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.failures.some((f) => f.code === "PROBABILITY_OUT_OF_RANGE")).toBe(
      true,
    );
  });

  it("fail-closes on generated_at after event start", async () => {
    const bad = {
      ...validPackage,
      eventStarts: { ev1: "2026-09-25T10:00:00Z" },
    };
    const res = await POST(req({ auth: "Bearer ops-secret", body: bad }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      ok: boolean;
      failures: { code: string }[];
    };
    expect(
      body.failures.some((f) => f.code === "GENERATED_AT_AFTER_EVENT_START"),
    ).toBe(true);
  });

  it("emits CSV when format=csv", async () => {
    const res = await POST(
      req({
        auth: "Bearer ops-secret",
        body: validPackage,
        url: "http://x/api/models/submission?format=csv",
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("event_id");
    expect(text).toContain("ev1");
  });

  it("rejects invalid JSON body without inventing rows", async () => {
    const res = await POST(
      new Request("http://x/api/models/submission", {
        method: "POST",
        headers: {
          authorization: "Bearer ops-secret",
          "content-type": "application/json",
        },
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });
});
