import { describe, expect, it, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { POST as hydrationPlanPost } from "@/app/api/gse/v1/hydration/plan/route";

/**
 * GSE-SEC-037 — POST /api/gse/v1/hydration/plan now validates its body with a
 * zod schema (refuse-default) instead of `await req.json() as typeof body`.
 *
 * These tests prove the schema gate fires BEFORE the downstream handler:
 *   - a well-formed body is accepted (200), proving the gate doesn't false-reject;
 *   - metricIds missing / empty / non-array → 422 with a typed code;
 *   - entityIds non-array → 422;
 *   - asOf unparseable → 422.
 *
 * The downstream handler (handleHydrationPlan) already refuses missing metrics,
 * so a valid body with metricIds=["m1"] succeeds at the schema layer and returns
 * 200 — that's the "positive control" that the schema is real, not vacuously
 * passing everything.
 */
function reqAs(body: unknown, ip = "198.51.100.42"): Request {
  const r = new Request("http://localhost/api/gse/v1/hydration/plan", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r as unknown as Request;
}

beforeEach(() => {
  resetRateLimits();
});

describe("POST /api/gse/v1/hydration/plan — body schema (GSE-SEC-037)", () => {
  it("accepts a well-formed body (200)", async () => {
    const res = await hydrationPlanPost(reqAs({ metricIds: ["m1"] }) as never);
    expect(res.status).toBe(200);
  });

  it("rejects missing metricIds with 422", async () => {
    const res = await hydrationPlanPost(reqAs({}) as never);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("bad_request");
    expect(json.issues).toBeTruthy();
  });

  it("rejects empty metricIds with 422", async () => {
    const res = await hydrationPlanPost(reqAs({ metricIds: [] }) as never);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("bad_request");
  });

  it("rejects non-array metricIds with 422", async () => {
    const res = await hydrationPlanPost(reqAs({ metricIds: "not-an-array" }) as never);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("bad_request");
  });

  it("rejects non-array entityIds with 422", async () => {
    const res = await hydrationPlanPost(
      reqAs({ metricIds: ["m1"], entityIds: "oops" }) as never,
    );
    expect(res.status).toBe(422);
  });

  it("rejects an unparseable asOf with 422", async () => {
    const res = await hydrationPlanPost(
      reqAs({ metricIds: ["m1"], asOf: "definitely-not-a-date" }) as never,
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("bad_request");
  });

  it("rejects invalid JSON with 400", async () => {
    const r = new Request("http://localhost/api/gse/v1/hydration/plan", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.42", "content-type": "application/json" },
      body: "{ not json",
    });
    const res = await hydrationPlanPost(r as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("bad_json");
  });
});
