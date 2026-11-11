import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/gse/v1/truth/commit/route";

describe("/api/gse/v1/truth/commit", () => {
  it("GET returns Week 10 pre-kickoff Merkle commitment index and reconciled scopes", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.activeWeek).toBe(10);
    expect(body.gamesCount).toBe(14);
    expect(body.merkleRootSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(body.reconciledScopes.week8Staked.record).toBe("36-13-1");
    expect(body.reconciledScopes.week8Base.record).toBe("38-13-1");
    expect(body.reconciledScopes.week8AllIn.record).toBe("47-19-1");
    expect(body.reconciledScopes.weeks8To9Staked.record).toBe("43-17-1");
    expect(body.reconciledScopes.weeks8To9AllIn.record).toBe("54-23-1");
  });

  it("POST seals pre-kickoff prediction with SHA-256 and returns 201", async () => {
    const req = new Request("https://www.galaxysportsedge.com/api/gse/v1/truth/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: "401873052",
        matchup: "WSH @ NYG",
        kickoffUtc: "2026-11-13T01:15:00Z",
        effectiveAtUtc: "2026-11-11T04:00:00Z",
        marketType: "SPREAD",
        selection: "PASS",
        modelProb: 0.512,
        deVigMarketProb: 0.5,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("COMMITTED_PRE_KICKOFF");
    expect(body.commitmentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("POST rejects post-kickoff submission with HTTP 409 WINDOW_LOCKED", async () => {
    const req = new Request("https://www.galaxysportsedge.com/api/gse/v1/truth/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: "401873052",
        matchup: "WSH @ NYG",
        kickoffUtc: "2026-11-13T01:15:00Z",
        effectiveAtUtc: "2026-11-13T01:15:01Z",
        marketType: "SPREAD",
        selection: "NYG -3.0",
        modelProb: 0.55,
        deVigMarketProb: 0.5,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("WINDOW_LOCKED");
  });
});
