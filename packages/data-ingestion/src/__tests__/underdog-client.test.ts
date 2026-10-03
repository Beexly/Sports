import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UnderdogClient,
  UnderdogError,
  isUnderdogIngestEnabled,
  UNDERDOG_BASE,
  UNDERDOG_ATTRIBUTION,
} from "../underdog-client.js";
import { assertIngestible, getSource } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const fetchJson = (fixture: unknown) =>
  (async (_url: unknown) => new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

const ENV = { UNDERDOG_INGEST: "1" };

/** Real verified fixture shapes (2026-09-18). */
const sportsFixture = {
  sports: [
    { id: "NFL", name: "Football", game_type: "regular", draft_status: "active" },
    { id: "CFB", name: "College Football", game_type: null, draft_status: null },
  ],
};

const scoringTypesFixture = [
  { id: "std", sport_id: "NFL", title: "Standard" },
  { id: "ppr", sport_id: "NFL", title: "Half PPR" },
];

const slatesFixture = {
  slates: [
    {
      id: "dcd3a8d7-53e3-485f-a8be-bf5e0e413676",
      title: "Sun Main Slate",
      sport_id: "NFL",
      game_count: 13,
      start_at: "2026-09-20T17:00:00Z",
      cutoff_at: "2026-09-20T16:45:00Z",
      show_salaries: true,
    },
  ],
};

const appearancesFixture = {
  appearances: [
    {
      player_id: "p-1",
      position_id: "RB",
      team_id: "DET",
      match_id: "m-1",
      projected_points: 22.5,
      adp: 1.1,
      salary: 97,
      position_rank: "RB1",
      avg_weekly_points: 21.3,
      lineup_status_id: "active",
    },
  ],
};

describe("Underdog registry linkage", () => {
  it("is use-with-caution and ingestible with the live base", () => {
    expect(getSource("underdog-stats")?.verdict).toBe("use-with-caution");
    expect(getSource("underdog-projections")?.verdict).toBe("use-with-caution");
    expect(assertIngestible("underdog-stats").baseUrl).toBe(UNDERDOG_BASE);
    expect(UNDERDOG_ATTRIBUTION).toBe("Slate data via Underdog Fantasy.");
  });
});

describe("Underdog fail-closed", () => {
  it("is off by default and never fetches", async () => {
    expect(isUnderdogIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new UnderdogClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.listSports()).toBeNull();
    expect(await client.listScoringTypes()).toBeNull();
    expect(await client.listNflSlates()).toBeNull();
    expect(await client.getSlateProjections("slate", "scoring")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Underdog fixtures", () => {
  it("parses sports", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(sportsFixture), { status: 200 }));
    const client = new UnderdogClient(ENV, fetchImpl as unknown as typeof fetch);
    const sports = await client.listSports();
    expect(sports).toHaveLength(2);
    expect(sports?.[0]?.id).toBe("NFL");
    expect(sports?.[0]?.gameType).toBe("regular");
    expect(sports?.[1]?.draftStatus).toBeNull();
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toBe(`${UNDERDOG_BASE}/v2/sports`);
  });

  it("parses scoring types", async () => {
    const client = new UnderdogClient(ENV, fetchJson(scoringTypesFixture));
    const types = await client.listScoringTypes();
    expect(types).toHaveLength(2);
    expect(types?.[0]).toMatchObject({ id: "std", sportId: "NFL", title: "Standard" });
  });

  it("parses the NFL slate fixture to exact values", async () => {
    const client = new UnderdogClient(ENV, fetchJson(slatesFixture));
    const slates = await client.listNflSlates();
    expect(slates).toHaveLength(1);
    const slate = slates?.[0];
    expect(slate?.id).toBe("dcd3a8d7-53e3-485f-a8be-bf5e0e413676");
    expect(slate?.title).toBe("Sun Main Slate");
    expect(slate?.sportId).toBe("NFL");
    expect(slate?.gameCount).toBe(13);
    expect(slate?.startAt).toBe("2026-09-20T17:00:00Z");
    expect(slate?.cutoffAt).toBe("2026-09-20T16:45:00Z");
    expect(slate?.showSalaries).toBe(true);
  });

  it("parses slate projections to exact values and hits the appearances path", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(appearancesFixture), { status: 200 }));
    const client = new UnderdogClient(ENV, fetchImpl as unknown as typeof fetch);
    const appearances = await client.getSlateProjections("dcd3a8d7-53e3-485f-a8be-bf5e0e413676", "std");
    expect(appearances).toHaveLength(1);
    const a = appearances?.[0];
    expect(a?.projectedPoints).toBe(22.5);
    expect(a?.adp).toBe(1.1);
    expect(a?.salary).toBe(97);
    expect(a?.positionRank).toBe("RB1");
    expect(a?.playerId).toBe("p-1");
    expect(a?.avgWeeklyPoints).toBe(21.3);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/v1/slates/dcd3a8d7-53e3-485f-a8be-bf5e0e413676/scoring_types/std/appearances");
  });
});

describe("Underdog malformed payloads", () => {
  it("returns empty arrays without throwing", async () => {
    const client = new UnderdogClient(ENV, fetchJson({ sports: "nope" }));
    expect(await client.listSports()).toEqual([]);

    const client2 = new UnderdogClient(ENV, fetchJson({ slates: [null, 42, {}] }));
    expect(await client2.listNflSlates()).toEqual([]);

    const client3 = new UnderdogClient(ENV, fetchJson({ appearances: [{ player_id: 7 }] }));
    expect(await client3.getSlateProjections("a", "b")).toEqual([]);

    const client4 = new UnderdogClient(ENV, fetchJson("a string, not an object"));
    expect(await client4.listScoringTypes()).toEqual([]);
  });
});

describe("Underdog HTTP errors", () => {
  it("throws UnderdogError carrying the status", async () => {
    const fetchImpl = (async (_url: unknown) =>
      new Response("upstream gone", { status: 503 })) as unknown as typeof fetch;
    const client = new UnderdogClient(ENV, fetchImpl);
    const err = await client.listNflSlates().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnderdogError);
    expect((err as UnderdogError).status).toBe(503);
    expect(String((err as Error).message)).toContain("503");
  });
});
