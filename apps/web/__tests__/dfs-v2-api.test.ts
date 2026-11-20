import { describe, it, expect } from "vitest";
import { POST } from "../app/api/fantasy/dfs-v2/route";
import { optimizeDfsV2Portfolio } from "../lib/fantasy/dfs-v2-client";

describe("Institutional DFS v2 API and deterministic client", () => {
  it("generates deterministic Classic 9-player lineups respecting bye filters and no probability", async () => {
    const req1 = new Request("http://localhost/api/fantasy/dfs-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "CLASSIC", numLineups: 3, seed: 20261120 }),
    });
    const req2 = new Request("http://localhost/api/fantasy/dfs-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "CLASSIC", numLineups: 3, seed: 20261120 }),
    });

    const res1 = await POST(req1);
    const res2 = await POST(req2);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1).toEqual(body2);
    expect("probability" in body1).toBe(false);
    expect(body1.lineups.length).toBeGreaterThanOrEqual(1);
    for (const lu of body1.lineups) {
      expect(lu.slots).toHaveLength(9);
      expect(lu.totalSalary).toBeLessThanOrEqual(50_000);
      expect("probability" in lu).toBe(false);
    }
  });

  it("filters out bye teams and named out players", async () => {
    const out = await optimizeDfsV2Portfolio({
      mode: "CLASSIC",
      numLineups: 2,
      byeTeams: ["PHI"],
      outPlayers: ["Dak Prescott"],
      seed: 77,
    });
    expect(out.blockedCount).toBeGreaterThan(0);
    for (const lu of out.lineups) {
      for (const slot of lu.slots) {
        expect(slot.team).not.toBe("PHI");
        expect(slot.opponent).not.toBe("PHI");
        expect(slot.name).not.toBe("Dak Prescott");
      }
    }
  });

  it("rejects malformed JSON with 400", async () => {
    const badReq = new Request("http://localhost/api/fantasy/dfs-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });
});
