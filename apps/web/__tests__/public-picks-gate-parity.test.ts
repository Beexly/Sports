import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/picks and /api/picks/daily-slate are both PUBLIC pick surfaces and must
 * agree about whether picks are public.
 *
 * They did not. daily-slate read getReadinessGates() but only consulted
 * forceNoBetIfStale, never canExposePublicPicks. So with PUBLIC_PICKS_ENABLED
 * unset, /api/picks returned 503 while daily-slate returned 200 carrying
 * totalPicks / premiumPickCount / freePickCount / sportBreakdown and a
 * freshly-stamped lastUpdatedAt — the shape of the board, served from the
 * surface the gate was meant to close.
 *
 * This pins the parity itself, not one endpoint's behaviour, so a future gate
 * added to one route and forgotten on the other fails here.
 */
describe("public picks gate parity", () => {
  const saved = {
    picks: process.env["PUBLIC_PICKS_ENABLED"],
    canonical: process.env["CANONICAL_HISTORY_ENABLED"],
    stale: process.env["FORCE_NO_BET_IF_STALE"],
  };

  beforeEach(() => {
    vi.resetModules();
    delete process.env["PUBLIC_PICKS_ENABLED"];
    delete process.env["FORCE_NO_BET_IF_STALE"];
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
  });

  afterEach(() => {
    for (const [k, v] of [
      ["PUBLIC_PICKS_ENABLED", saved.picks],
      ["CANONICAL_HISTORY_ENABLED", saved.canonical],
      ["FORCE_NO_BET_IF_STALE", saved.stale],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function request(path: string): Request {
    return new Request(`http://localhost:3000${path}`, {
      headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250) + 1}` },
    });
  }

  it("BOTH endpoints go dark when PUBLIC_PICKS_ENABLED is off", async () => {
    const picks = await import("@/app/api/picks/route");
    const slate = await import("@/app/api/picks/daily-slate/route");

    const picksRes = await picks.GET(request("/api/picks") as never);
    const slateRes = await slate.GET(request("/api/picks/daily-slate") as never);

    expect(picksRes.status, "/api/picks must be dark").toBe(503);
    // The regression: this used to be 200 with real board counts.
    expect(slateRes.status, "/api/picks/daily-slate must be dark too").toBe(503);
  });

  it("the dark slate response leaks no board shape", async () => {
    const slate = await import("@/app/api/picks/daily-slate/route");
    const res = await slate.GET(request("/api/picks/daily-slate") as never);
    const body = (await res.json()) as Record<string, unknown>;

    // Gate body, not a slate: none of the board-shape fields may appear.
    for (const leaked of [
      "totalPicks",
      "premiumPickCount",
      "freePickCount",
      "totalGames",
      "sportBreakdown",
      "lastUpdatedAt",
    ]) {
      expect(JSON.stringify(body)).not.toContain(leaked);
    }
    expect(body.reason).toBeDefined();
  });

  it("both stay uncacheable while dark, so the gate can reopen", async () => {
    const picks = await import("@/app/api/picks/route");
    const slate = await import("@/app/api/picks/daily-slate/route");

    const picksRes = await picks.GET(request("/api/picks") as never);
    const slateRes = await slate.GET(request("/api/picks/daily-slate") as never);

    expect(picksRes.headers.get("Cache-Control")).toContain("no-store");
    expect(slateRes.headers.get("Cache-Control")).toContain("no-store");
  });
});
