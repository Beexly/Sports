import { afterEach, describe, expect, it } from "vitest";

import {
  registerActiveSlate,
  resolveActiveSlate,
  type ActiveSlateProvider,
} from "@/lib/integrations/dfs-active-slate";
import {
  buildEspnKeylessSlate,
  createEspnKeylessSlateProvider,
  type EspnSlateDeps,
} from "@/lib/integrations/espn-dfs-slate-provider";
import { DFS_SLATE, type DfsPlayer } from "@/lib/fantasy/dfs-slate";

/**
 * The active-slate seam contract (wiring surge tranche B).
 *
 * The DFS process artifact's live-feed registration was never done, so slate
 * resolution fell back to the illustrative sample slate — fictional players.
 * This seam's fallback law is the opposite: unregistered means honest-empty,
 * and the sample slate is reachable ONLY behind the explicit developer flag
 * DFS_SAMPLE_SLATE_DEV=1. These tests pin that law plus the ESPN keyless
 * provider's honesty rules (no projection → dropped, never invented; ESPN
 * failure → empty, named).
 */

const SAMPLE_NAMES = new Set(DFS_SLATE.map((p) => p.name));

const realPlayer: DfsPlayer = {
  id: "espn-1", name: "Real Player", pos: "WR", team: "SEA", opp: "DEN",
  salary: 0, proj: 12.5, floor: 6, ceiling: 24, own: 0.5,
};

afterEach(() => registerActiveSlate(null));

describe("seam contract: registration decides, never the sample", () => {
  it("a registered provider is used, and its slate is served verbatim", async () => {
    const provider: ActiveSlateProvider = { name: "test", source: "test", slate: () => [realPlayer] };
    registerActiveSlate(provider);
    const slate = await resolveActiveSlate({});
    expect(slate).toEqual([realPlayer]);
  });

  it("a registered provider that finds nothing returns honest-empty, not the sample", async () => {
    registerActiveSlate({ name: "empty", source: "test", slate: () => [] });
    expect(await resolveActiveSlate({})).toEqual([]);
    // Even with the dev flag set, a registered provider wins over the fixture.
    expect(await resolveActiveSlate({ DFS_SAMPLE_SLATE_DEV: "1" })).toEqual([]);
  });

  it("unregistered resolves to honest-empty in prod mode", async () => {
    registerActiveSlate(null);
    expect(await resolveActiveSlate({})).toEqual([]);
    expect(await resolveActiveSlate({ NODE_ENV: "production" })).toEqual([]);
  });

  it("the sample slate is served ONLY behind the explicit dev flag", async () => {
    registerActiveSlate(null);
    const dev = await resolveActiveSlate({ DFS_SAMPLE_SLATE_DEV: "1" });
    expect(dev).toEqual(DFS_SLATE);
    // Any other value — including a truthy-looking one — is not the flag.
    expect(await resolveActiveSlate({ DFS_SAMPLE_SLATE_DEV: "true" })).toEqual([]);
    expect(await resolveActiveSlate({ DFS_SAMPLE_SLATE_DEV: "0" })).toEqual([]);
  });
});

describe("ESPN keyless provider: real pool, engine numbers, no invention", () => {
  const deps = (overrides: Partial<EspnSlateDeps> = {}): EspnSlateDeps => ({
    fetchScoreboard: async () => ({
      ok: true,
      games: [{ home: { teamId: "26", abbreviation: "SEA" }, away: { teamId: "7", abbreviation: "DEN" } }],
    }),
    fetchRoster: async (teamId: string) => ({
      ok: true,
      players: teamId === "26"
        ? [
            { id: "espn-1", fullName: "Real Player", position: "WR", status: "active" },
            { id: "espn-2", fullName: "No Projection", position: "RB", status: "active" },
            { id: "espn-3", fullName: "Inactive Guy", position: "TE", status: "injured" },
            { id: "espn-4", fullName: "Long Snapper", position: "LS", status: "active" },
          ]
        : [{ id: "espn-9", fullName: "Denver Back", position: "RB", status: "active" }],
    }),
    projectionFor: (id: string) =>
      id === "espn-1" ? { proj: 12.5, floor: 6, ceiling: 24 } : null,
    ...overrides,
  });

  it("maps the real roster through projections; unprojected players are dropped and counted", async () => {
    const report = await buildEspnKeylessSlate(deps());
    expect(report.failure).toBeNull();
    expect(report.games).toBe(1);
    expect(report.teams).toBe(2);
    expect(report.players.map((p) => p.name)).toEqual(["Real Player"]);
    const p = report.players[0]!;
    expect(p.team).toBe("SEA");
    expect(p.opp).toBe("DEN");
    expect(p.proj).toBe(12.5);
    // espn-2 (no projection) + espn-9 (no projection) dropped; espn-3 (inactive)
    // + espn-4 (unmappable position) skipped.
    expect(report.droppedNoProjection).toBe(2);
    expect(report.skipped).toBe(2);
  });

  it("never serves a sample-slate name, and flags the unreal inputs honestly", async () => {
    const report = await buildEspnKeylessSlate(deps());
    for (const p of report.players) expect(SAMPLE_NAMES.has(p.name)).toBe(false);
    expect(report.salaryIsReal).toBe(false);
    expect(report.ownershipIsAssumed).toBe(true);
    for (const p of report.players) {
      expect(p.salary).toBe(0); // no licensed feed — the cap is a no-op, not a fiction
      expect(p.own).toBe(0.5); // neutral, flagged — not a field projection
    }
  });

  it("an ESPN failure yields an empty slate with the reason named — never the sample", async () => {
    const failed = await buildEspnKeylessSlate(deps({ fetchScoreboard: async () => ({ ok: false }) }));
    expect(failed.players).toEqual([]);
    expect(failed.failure).toMatch(/unavailable/);

    const threw = await buildEspnKeylessSlate(deps({
      fetchScoreboard: async () => { throw new Error("boom"); },
    }));
    expect(threw.players).toEqual([]);
    expect(threw.failure).toMatch(/boom/);
  });

  it("the provider object registers into the seam and serves its built slate", async () => {
    const { provider, lastReport } = createEspnKeylessSlateProvider(deps());
    registerActiveSlate(provider);
    const slate = await resolveActiveSlate({});
    expect(slate.map((p) => p.name)).toEqual(["Real Player"]);
    expect(lastReport()?.games).toBe(1);
  });
});
