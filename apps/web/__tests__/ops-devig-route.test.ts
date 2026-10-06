import { describe, expect, it, beforeEach } from "vitest";
import { GET } from "@/app/api/ops/devig/route";

const SECRET = "test-cron-secret";

function req(path: string, auth = true): Request {
  return new Request(`https://example.com${path}`, {
    headers: auth ? { authorization: `Bearer ${SECRET}` } : {},
  });
}

beforeEach(() => {
  process.env["CRON_SECRET"] = SECRET;
});

describe("GET /api/ops/devig", () => {
  it("rejects unauthenticated callers", async () => {
    const res = await GET(req("/api/ops/devig?odds=-110,-110", false));
    expect(res.status).toBe(401);
  });

  it("de-vigs American odds across all seven methods by default", async () => {
    const res = await GET(req("/api/ops/devig?odds=-500,350"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.methods).toHaveLength(7);
    for (const m of body.data.methods) {
      const sum = m.fairProbabilities.reduce((a: number, b: number) => a + b, 0);
      expect(sum).toBeCloseTo(1, 4);
    }
    // Overround of -500/+350: 1/1.2 + 1/4.5 - 1 ≈ 0.0556.
    expect(body.data.methods[0].overround).toBeCloseTo(0.0556, 3);
  });

  it("honours a single requested method", async () => {
    const res = await GET(req("/api/ops/devig?odds=-110,-110&method=shin"));
    const body = await res.json();
    expect(body.data.methods).toHaveLength(1);
    expect(body.data.methods[0].method).toBe("shin");
  });

  it("accepts decimal odds directly", async () => {
    const res = await GET(req("/api/ops/devig?decimal=1.91,1.91"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.input.kind).toBe("decimal");
  });

  it("400s on missing or degenerate input — never a fabricated vector", async () => {
    for (const path of [
      "/api/ops/devig",
      "/api/ops/devig?odds=-110",
      "/api/ops/devig?odds=abc,def",
      "/api/ops/devig?odds=0,-110",
      "/api/ops/devig?decimal=-1.5,2.0",
    ]) {
      const res = await GET(req(path));
      expect(res.status).toBe(400);
    }
  });
});
