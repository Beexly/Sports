import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDfsSalaries, resetDfsSalariesCacheForTests } from "@/lib/dfs/salaries";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function dkSlate(players: Array<{ name: string; pos: string; salary: number; team: string }>) {
  return [
    {
      Operator: "DraftKings",
      DfsSlatePlayers: players.map((p) => ({
        OperatorPlayerName: p.name,
        OperatorPosition: p.pos,
        OperatorSalary: p.salary,
        Team: p.team,
      })),
    },
    // a non-DK slate that must always be ignored
    { Operator: "FanDuel", DfsSlatePlayers: [{ OperatorPlayerName: "Ignore Me", OperatorSalary: 9999, Team: "ZZZ" }] },
  ];
}

describe("dfs salaries (multi-source, reconciled)", () => {
  afterEach(() => {
    resetDfsSalariesCacheForTests();
  });

  it("is gated and refuses DK scraping when no provider key is configured", async () => {
    const dfs = await loadDfsSalaries({ keys: {}, fetcher: vi.fn(), cacheTtlMs: 0 });
    expect(dfs.status).toBe("gated");
    expect(dfs.connectedProviders).toBe(0);
    expect(dfs.gate.requiredEnv).toEqual(expect.arrayContaining(["SPORTSDATAIO_API_KEY", "FANTASYDATA_API_KEY"]));
    expect(dfs.gate.refusedNote.toLowerCase()).toMatch(/draftkings|terms|automated/);
    expect(dfs.providers.every((p) => p.status === "not-configured")).toBe(true);
    expect(dfs.canPublishPicks).toBe(false);
  });

  it("cross-checks two providers and marks agreement", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("sportsdata.io")) return json(dkSlate([{ name: "Tyreek Hill", pos: "WR", salary: 8200, team: "MIA" }]));
      if (url.includes("fantasydata.net")) return json(dkSlate([{ name: "Tyreek Hill", pos: "WR", salary: 8250, team: "MIA" }]));
      return new Response("missing", { status: 404 });
    });
    const dfs = await loadDfsSalaries({
      keys: { sportsdataio: "A", fantasydata: "B" },
      date: "2025-SEP-07",
      fetcher,
      cacheTtlMs: 0,
    });

    expect(dfs.status).toBe("live");
    expect(dfs.connectedProviders).toBe(2);
    expect(dfs.providers.filter((p) => p.status === "live")).toHaveLength(2);
    const hill = dfs.rows[0]!;
    expect(hill.name).toBe("Tyreek Hill");
    expect(hill.providerCount).toBe(2);
    expect(hill.agreement).toBe("agree"); // 8200 vs 8250 within 2%
    expect(hill.salariesByProvider).toMatchObject({ sportsdataio: 8200, fantasydata: 8250 });
    expect(dfs.discrepancies).toBe(0);
  });

  it("flags a disagreement when providers materially differ", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("sportsdata.io")) return json(dkSlate([{ name: "Bijan Robinson", pos: "RB", salary: 7000, team: "ATL" }]));
      if (url.includes("fantasydata.net")) return json(dkSlate([{ name: "Bijan Robinson", pos: "RB", salary: 9000, team: "ATL" }]));
      return new Response("missing", { status: 404 });
    });
    const dfs = await loadDfsSalaries({ keys: { sportsdataio: "A", fantasydata: "B" }, fetcher, cacheTtlMs: 0 });
    expect(dfs.rows[0]?.agreement).toBe("disagree");
    expect(dfs.discrepancies).toBe(1);
  });

  it("fails over: if one provider is down, the other still delivers data", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("sportsdata.io")) return new Response("down", { status: 503 });
      if (url.includes("fantasydata.net")) return json(dkSlate([{ name: "CeeDee Lamb", pos: "WR", salary: 8800, team: "DAL" }]));
      return new Response("missing", { status: 404 });
    });
    const dfs = await loadDfsSalaries({ keys: { sportsdataio: "A", fantasydata: "B" }, fetcher, cacheTtlMs: 0 });
    expect(dfs.status).toBe("live"); // still live on the surviving provider
    expect(dfs.rows[0]?.name).toBe("CeeDee Lamb");
    const sdi = dfs.providers.find((p) => p.id === "sportsdataio");
    const fd = dfs.providers.find((p) => p.id === "fantasydata");
    expect(sdi?.status).toBe("error");
    expect(fd?.status).toBe("live");
  });

  it("serves the dfs salaries API", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/dfs/salaries/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    expect((body["data"] as Record<string, unknown>)["canPublishPicks"]).toBe(false);
  });
});
