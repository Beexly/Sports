import { describe, expect, it, vi } from "vitest";

/**
 * Fixture confirmation guard (ledger C-111). Pure helpers plus the per-run
 * confirmer with an injected fetch. The scoreboard fixture below is a TEST
 * FIXTURE shaped like ESPN's public scoreboard JSON; its rows mirror what the
 * public board listed when the phantom picks were diagnosed (2026-09-06):
 * the three May-listed NCAAF rows dated 2026-09-05 are absent that day, while
 * Louisville at Ole Miss and Washington State at Washington appear on 09-06.
 */

import {
  FixtureConfirmer,
  commenceTimeCorrection,
  confirmFixturesAgainstScoreboard,
  espnShortForSportKey,
  findListedFixture,
  fixtureDateKeys,
  requiresReconfirmation,
  scoreboardDateKeys,
  scoreboardDatesParam,
  type FixtureProbe,
} from "../fixture-confirmation.js";

const NOW = new Date("2026-09-05T15:00:00.000Z");
const NCAAF = "americanfootball_ncaaf";

function espnEvent(
  id: string,
  date: string,
  home: string,
  away: string,
): Record<string, unknown> {
  return {
    id,
    date,
    status: { type: { state: "pre", completed: false } },
    competitions: [
      {
        competitors: [
          { homeAway: "home", team: { displayName: home } },
          { homeAway: "away", team: { displayName: away } },
        ],
      },
    ],
  };
}

/** Test fixture: ESPN-shaped board for 2026-09-05..07 (subset). */
const CFB_BOARD = {
  events: [
    espnEvent("401", "2026-09-05T20:15Z", "Iowa Hawkeyes", "Northern Illinois Huskies"),
    espnEvent("402", "2026-09-05T19:30Z", "Cincinnati Bearcats", "Boston College Eagles"),
    espnEvent("403", "2026-09-06T20:00Z", "Washington Huskies", "Washington State Cougars"),
    espnEvent("404", "2026-09-06T23:30Z", "Ole Miss Rebels", "Louisville Cardinals"),
  ],
};

/** The three phantom rows from the ledger (dated 2026-09-05, created in May). */
const PHANTOMS: FixtureProbe[] = [
  {
    id: "g-olemiss",
    homeTeamName: "Ole Miss Rebels",
    awayTeamName: "Louisville Cardinals",
    commenceTime: new Date("2026-09-05T16:00:00.000Z"),
    createdAt: new Date("2026-05-22T10:00:00.000Z"),
  },
  {
    id: "g-illinois",
    homeTeamName: "Illinois Fighting Illini",
    awayTeamName: "UAB Blazers",
    commenceTime: new Date("2026-09-05T16:00:00.000Z"),
    createdAt: new Date("2026-05-22T10:00:00.000Z"),
  },
  {
    id: "g-washington",
    homeTeamName: "Washington Huskies",
    awayTeamName: "Washington State Cougars",
    commenceTime: new Date("2026-09-05T19:00:00.000Z"),
    createdAt: new Date("2026-05-23T10:00:00.000Z"),
  },
];

const LISTED: FixtureProbe = {
  id: "g-cincy",
  homeTeamName: "Cincinnati Bearcats",
  awayTeamName: "Boston College Eagles",
  commenceTime: new Date("2026-09-05T19:30:00.000Z"),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fixtureDateKeys", () => {
  it("returns one key for a daytime kickoff and two for a late UTC kickoff (Eastern previous day)", () => {
    expect(fixtureDateKeys(new Date("2026-09-05T16:00:00.000Z"))).toEqual(["20260905"]);
    expect(fixtureDateKeys(new Date("2026-09-06T02:00:00.000Z"))).toEqual(["20260906", "20260905"]);
  });
});

describe("scoreboardDateKeys", () => {
  it("returns the sorted unique day keys a batch needs, one ESPN request each", () => {
    expect(scoreboardDateKeys([LISTED])).toEqual(["20260905"]);
    expect(
      scoreboardDateKeys([
        // 01:00Z on 09-07 is the Eastern evening of 09-06: two keys.
        { ...LISTED, id: "x", commenceTime: new Date("2026-09-07T01:00:00.000Z") },
        LISTED,
        { ...LISTED, id: "y", commenceTime: new Date("2026-09-05T21:00:00.000Z") },
      ]),
    ).toEqual(["20260905", "20260906", "20260907"]);
    expect(scoreboardDateKeys([])).toEqual([]);
  });
});

describe("scoreboardDatesParam", () => {
  it("collapses to one day or a min-max range", () => {
    expect(scoreboardDatesParam([LISTED])).toBe("20260905");
    expect(
      scoreboardDatesParam([
        LISTED,
        { ...LISTED, id: "x", commenceTime: new Date("2026-09-07T01:00:00.000Z") },
      ]),
    ).toBe("20260905-20260907");
    expect(scoreboardDatesParam([])).toBeNull();
  });
});

describe("espnShortForSportKey", () => {
  it("maps Sport.key to the free ESPN short key and fails closed on unknown keys", () => {
    expect(espnShortForSportKey(NCAAF)).toBe("ncaaf");
    expect(espnShortForSportKey("baseball_mlb")).toBe("mlb");
    expect(espnShortForSportKey("cricket_ipl")).toBeNull();
  });
});

describe("findListedFixture", () => {
  it("does not confirm the three phantom rows: same teams a day later are not the day's fixture", () => {
    const events = confirmFixturesAgainstScoreboard(PHANTOMS, parseBoard(CFB_BOARD), NCAAF, NOW);
    for (const p of PHANTOMS) {
      expect(events.get(p.id)).toEqual({ status: "not_listed" });
    }
  });

  it("confirms a listed fixture, in either home/away orientation", () => {
    const board = parseBoard(CFB_BOARD);
    expect(findListedFixture(LISTED, board, NCAAF)?.externalId).toBe("espn:ncaaf:402");
    const flipped: FixtureProbe = {
      ...LISTED,
      homeTeamName: LISTED.awayTeamName,
      awayTeamName: LISTED.homeTeamName,
    };
    expect(findListedFixture(flipped, board, NCAAF)?.externalId).toBe("espn:ncaaf:402");
  });

  it("keeps college matching exact: Washington never confirms Washington State", () => {
    const board = parseBoard({
      events: [espnEvent("9", "2026-09-05T19:00Z", "Washington State Cougars", "Idaho Vandals")],
    });
    const probe: FixtureProbe = {
      id: "g",
      homeTeamName: "Washington",
      awayTeamName: "Idaho Vandals",
      commenceTime: new Date("2026-09-05T19:00:00.000Z"),
    };
    expect(findListedFixture(probe, board, NCAAF)).toBeNull();
  });

  it("matches a late-night UTC kickoff to its Eastern-day listing", () => {
    const board = parseBoard({
      events: [espnEvent("10", "2026-09-06T02:30Z", "Hawaii Rainbow Warriors", "Stanford Cardinal")],
    });
    const probe: FixtureProbe = {
      id: "g",
      homeTeamName: "Hawaii Rainbow Warriors",
      awayTeamName: "Stanford Cardinal",
      commenceTime: new Date("2026-09-05T23:00:00.000Z"),
    };
    expect(findListedFixture(probe, board, NCAAF)?.externalId).toBe("espn:ncaaf:10");
  });

  it("rejects a same-teams candidate on a shared date key more than 12 hours from our clock", () => {
    // 01:00Z on 09-05 (Eastern 09-04) shares the 20260905 key with a 23:30Z
    // listing that day, but 22.5 hours apart is a different contest.
    const board = parseBoard({
      events: [espnEvent("11", "2026-09-05T23:30Z", "Ole Miss Rebels", "Louisville Cardinals")],
    });
    const probe: FixtureProbe = {
      id: "g",
      homeTeamName: "Ole Miss Rebels",
      awayTeamName: "Louisville Cardinals",
      commenceTime: new Date("2026-09-05T01:00:00.000Z"),
    };
    expect(findListedFixture(probe, board, NCAAF)).toBeNull();
    // Inside the bound (the listing 3.5 hours later, same day) still confirms.
    expect(
      findListedFixture(
        { ...probe, commenceTime: new Date("2026-09-05T20:00:00.000Z") },
        board,
        NCAAF,
      )?.externalId,
    ).toBe("espn:ncaaf:11");
  });
});

describe("requiresReconfirmation and commenceTimeCorrection", () => {
  const espnAt = new Date("2026-09-05T19:30:00.000Z");
  const oldRow: FixtureProbe = {
    ...LISTED,
    id: "g-cincy-old",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    commenceTime: new Date("2026-09-05T19:00:00.000Z"),
  };

  it("re-confirms only rows older than 30 days with a kickoff still ahead and inside 48 hours", () => {
    expect(requiresReconfirmation(oldRow, NOW)).toBe(true);
    expect(requiresReconfirmation({ ...oldRow, createdAt: new Date("2026-09-01T00:00:00.000Z") }, NOW)).toBe(false);
    expect(requiresReconfirmation({ ...oldRow, commenceTime: new Date("2026-09-09T19:00:00.000Z") }, NOW)).toBe(false);
    expect(requiresReconfirmation({ ...oldRow, createdAt: null }, NOW)).toBe(false);
    // A kickoff already behind now is a historical game: never re-confirmed.
    expect(requiresReconfirmation({ ...oldRow, commenceTime: new Date("2026-09-05T14:00:00.000Z") }, NOW)).toBe(false);
    expect(requiresReconfirmation({ ...oldRow, commenceTime: NOW }, NOW)).toBe(false);
  });

  it("corrects commenceTime beyond 15 minutes of drift on any row whose kickoff is still ahead", () => {
    // 30 minutes of drift: corrected to ESPN's clock.
    expect(commenceTimeCorrection(oldRow, espnAt, NOW)).toEqual(espnAt);
    // Exactly 15 minutes: left alone.
    expect(
      commenceTimeCorrection(oldRow, new Date("2026-09-05T19:15:00.000Z"), NOW),
    ).toBeNull();
    // 10 minutes: left alone.
    expect(
      commenceTimeCorrection(oldRow, new Date("2026-09-05T19:10:00.000Z"), NOW),
    ).toBeNull();
    // A fresh row is corrected too: the same contest listed at a materially
    // different clock would otherwise be priced and settled at the stale time.
    expect(commenceTimeCorrection(LISTED, new Date("2026-09-05T21:00:00.000Z"), NOW)).toEqual(
      new Date("2026-09-05T21:00:00.000Z"),
    );
    // A kickoff already behind now is never rewritten, whatever the drift.
    const passed: FixtureProbe = { ...LISTED, commenceTime: new Date("2026-09-05T13:00:00.000Z") };
    expect(commenceTimeCorrection(passed, new Date("2026-09-05T14:30:00.000Z"), NOW)).toBeNull();
    expect(
      commenceTimeCorrection({ ...oldRow, commenceTime: new Date("2026-09-05T13:00:00.000Z") }, espnAt, NOW),
    ).toBeNull();
  });

  it("carries the correction on a confirmed row with drift (old or fresh) and null when the clocks agree", () => {
    const board = parseBoard(CFB_BOARD);
    const freshDrift: FixtureProbe = {
      ...LISTED,
      id: "g-cincy-fresh",
      commenceTime: new Date("2026-09-05T18:45:00.000Z"),
    };
    const out = confirmFixturesAgainstScoreboard([oldRow, LISTED, freshDrift], board, NCAAF, NOW);
    expect(out.get(oldRow.id)).toMatchObject({ status: "confirmed", correctedCommenceTime: espnAt });
    expect(out.get(freshDrift.id)).toMatchObject({ status: "confirmed", correctedCommenceTime: espnAt });
    expect(out.get(LISTED.id)).toMatchObject({ status: "confirmed", correctedCommenceTime: null });
  });

  it("never confirms a matched event whose ESPN kickoff is not after now, and never returns its past clock as a correction", () => {
    // Stored kickoff still ahead (19:30Z, now 15:00Z); ESPN lists the same
    // pair 2h in the past (13:00Z, same day, inside the 12h clock bound).
    const startedAt = new Date("2026-09-05T13:00:00.000Z");
    const board = parseBoard({
      events: [espnEvent("21", startedAt.toISOString(), "Cincinnati Bearcats", "Boston College Eagles")],
    });
    expect(findListedFixture(LISTED, board, NCAAF)?.externalId).toBe("espn:ncaaf:21");
    expect(commenceTimeCorrection(LISTED, startedAt, NOW)).toBeNull();
    const out = confirmFixturesAgainstScoreboard([LISTED], board, NCAAF, NOW);
    expect(out.get(LISTED.id)).toMatchObject({
      status: "event_already_started",
      event: { externalId: "espn:ncaaf:21" },
    });
    expect(out.get(LISTED.id)).not.toHaveProperty("correctedCommenceTime");
    // Exactly now is not after now either.
    const atNow = parseBoard({
      events: [espnEvent("22", NOW.toISOString(), "Cincinnati Bearcats", "Boston College Eagles")],
    });
    expect(confirmFixturesAgainstScoreboard([LISTED], atNow, NCAAF, NOW).get(LISTED.id)).toMatchObject({
      status: "event_already_started",
    });

    // The same pair 2h ahead (17:00Z) against a stored 16:30Z row: 30 minutes
    // of drift on a contest still ahead is corrected to ESPN's clock.
    const aheadAt = new Date("2026-09-05T17:00:00.000Z");
    const ahead = parseBoard({
      events: [espnEvent("23", aheadAt.toISOString(), "Cincinnati Bearcats", "Boston College Eagles")],
    });
    const soon: FixtureProbe = { ...LISTED, id: "g-soon", commenceTime: new Date("2026-09-05T16:30:00.000Z") };
    expect(commenceTimeCorrection(soon, aheadAt, NOW)).toEqual(aheadAt);
    expect(confirmFixturesAgainstScoreboard([soon], ahead, NCAAF, NOW).get(soon.id)).toEqual({
      status: "confirmed",
      event: ahead[0],
      correctedCommenceTime: aheadAt,
    });
  });
});

describe("FixtureConfirmer", () => {
  it("fetches once per ESPN group per sport per run (CFB: 80 and 81) and confirms from the cached board", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse(CFB_BOARD));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });

    const first = await confirmer.confirmBatch(NCAAF, [LISTED, ...PHANTOMS]);
    const second = await confirmer.confirmBatch(NCAAF, [LISTED]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    for (const url of urls) {
      expect(url).toContain("/football/college-football/scoreboard");
      expect(url).toContain("dates=20260905");
      expect(url).toContain("limit=300");
    }
    expect(urls.filter((u) => u.includes("groups=80"))).toHaveLength(1);
    expect(urls.filter((u) => u.includes("groups=81"))).toHaveLength(1);
    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status === "ok") {
      expect(first.byGameId.get("g-cincy")?.status).toBe("confirmed");
      expect(first.byGameId.get("g-olemiss")?.status).toBe("not_listed");
      expect(first.byGameId.get("g-illinois")?.status).toBe("not_listed");
      expect(first.byGameId.get("g-washington")?.status).toBe("not_listed");
    }
  });

  it("reports fetch_failed on HTTP errors and thrown fetches (fail-closed for the caller)", async () => {
    const http = new FixtureConfirmer({
      fetchImpl: (async () => jsonResponse({ events: [] }, 503)) as unknown as typeof fetch,
      now: NOW,
    });
    expect(await http.confirmBatch(NCAAF, [LISTED])).toMatchObject({
      status: "fetch_failed",
      error: expect.stringContaining("HTTP 503"),
    });

    const thrown = new FixtureConfirmer({
      fetchImpl: (async () => {
        throw new Error("socket hang up");
      }) as unknown as typeof fetch,
      now: NOW,
    });
    expect(await thrown.confirmBatch(NCAAF, [LISTED])).toMatchObject({
      status: "fetch_failed",
      error: expect.stringContaining("socket hang up"),
    });
  });

  it("fetches one day at a time (never a min-max range) and caches each day per group", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse(CFB_BOARD));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const sunday: FixtureProbe = {
      id: "g-sunday",
      homeTeamName: "Ole Miss Rebels",
      awayTeamName: "Louisville Cardinals",
      commenceTime: new Date("2026-09-06T23:30:00.000Z"),
    };

    const first = await confirmer.confirmBatch(NCAAF, [LISTED, sunday]);
    // Two days x two groups; no request spans a range.
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    for (const url of urls) expect(url).not.toMatch(/dates=\d+-\d+/);
    expect(urls.filter((u) => u.includes("dates=20260905"))).toHaveLength(2);
    expect(urls.filter((u) => u.includes("dates=20260906"))).toHaveLength(2);
    expect(first.status).toBe("ok");
    if (first.status === "ok") {
      expect(first.byGameId.get("g-cincy")?.status).toBe("confirmed");
      expect(first.byGameId.get("g-sunday")?.status).toBe("confirmed");
    }

    // A later batch on a day already fetched adds no request; a new day adds
    // one per group.
    await confirmer.confirmBatch(NCAAF, [sunday]);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    await confirmer.confirmBatch(NCAAF, [
      { ...sunday, id: "g-monday", commenceTime: new Date("2026-09-07T23:30:00.000Z") },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("treats a full page (events at the ESPN limit) as not confirmable: fetch_failed, never not_listed", async () => {
    const full = {
      events: Array.from({ length: ESPN_SCOREBOARD_LIMIT }, (_, i) =>
        espnEvent(String(1000 + i), "2026-09-05T20:00Z", `Home Side ${i}`, `Away Side ${i}`),
      ),
    };
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse(full));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const out = await confirmer.confirmBatch(NCAAF, [LISTED, ...PHANTOMS]);
    expect(out).toMatchObject({
      status: "fetch_failed",
      error: expect.stringContaining(
        `truncated: ${ESPN_SCOREBOARD_LIMIT} events at limit=${ESPN_SCOREBOARD_LIMIT}`,
      ),
    });
    // The first group's page was full; the day fails before the second group is spent.
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // One below the cap is a complete board and reads normally.
    const nearlyFull = { events: full.events.slice(0, ESPN_SCOREBOARD_LIMIT - 1) };
    const okFetch = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse(nearlyFull));
    const okConfirmer = new FixtureConfirmer({ fetchImpl: okFetch as unknown as typeof fetch, now: NOW });
    expect((await okConfirmer.confirmBatch(NCAAF, [LISTED])).status).toBe("ok");
  });

  it("sends groups=50 on every men's college basketball request, one per date key of a late tip", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse({ events: [] }));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const lateTip: FixtureProbe = {
      id: "g-hoops",
      homeTeamName: "Kansas Jayhawks",
      awayTeamName: "Baylor Bears",
      // 02:00Z is the previous Eastern day: two date keys, hence two requests.
      commenceTime: new Date("2026-03-08T02:00:00.000Z"),
    };
    const out = await confirmer.confirmBatch("basketball_ncaab", [lateTip]);
    expect(out.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    for (const url of urls) {
      expect(url).toContain("/basketball/mens-college-basketball/scoreboard");
      expect(url).toContain("groups=50");
      expect(url).not.toMatch(/dates=\d+-\d+/);
    }
    expect(urls.filter((u) => u.includes("dates=20260307"))).toHaveLength(1);
    expect(urls.filter((u) => u.includes("dates=20260308"))).toHaveLength(1);
  });

  it("confirms a CFB fixture listed only on the FCS (groups=81) board", async () => {
    const fcsOnly = {
      events: [espnEvent("777", "2026-09-05T18:00Z", "Montana Grizzlies", "Idaho Vandals")],
    };
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      jsonResponse(url.includes("groups=81") ? fcsOnly : CFB_BOARD),
    );
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const fcsProbe: FixtureProbe = {
      id: "g-fcs",
      homeTeamName: "Montana Grizzlies",
      awayTeamName: "Idaho Vandals",
      commenceTime: new Date("2026-09-05T18:00:00.000Z"),
    };
    const out = await confirmer.confirmBatch(NCAAF, [fcsProbe, LISTED]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.byGameId.get("g-fcs")).toMatchObject({
        status: "confirmed",
        event: { externalId: "espn:ncaaf:777" },
      });
      expect(out.byGameId.get("g-cincy")?.status).toBe("confirmed");
      // Merged board: four FBS events plus one FCS event, none duplicated.
      expect(out.eventsOnBoard).toBe(5);
    }
  });

  it("fails closed when any group request fails: a missing FCS board is fetch_failed, never not_listed", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      url.includes("groups=81") ? jsonResponse({ events: [] }, 503) : jsonResponse(CFB_BOARD),
    );
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const out = await confirmer.confirmBatch(NCAAF, [LISTED, ...PHANTOMS]);
    expect(out).toMatchObject({
      status: "fetch_failed",
      error: expect.stringContaining("groups=81 HTTP 503"),
    });
  });

  it("reports event_already_started through confirmBatch when the run's clock is past the listed kickoff", async () => {
    // Same board, a run at 21:00Z: the 19:30Z Cincinnati listing has started.
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse(CFB_BOARD));
    const confirmer = new FixtureConfirmer({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: new Date("2026-09-05T21:00:00.000Z"),
    });
    const stale: FixtureProbe = { ...LISTED, id: "g-cincy-stale", commenceTime: new Date("2026-09-05T22:00:00.000Z") };
    const out = await confirmer.confirmBatch(NCAAF, [stale]);
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.byGameId.get("g-cincy-stale")).toMatchObject({
        status: "event_already_started",
        event: { externalId: "espn:ncaaf:402" },
      });
    }
  });

  it("returns unsupported_sport without fetching when ESPN has no board for the key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(CFB_BOARD));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    expect(await confirmer.confirmBatch("cricket_ipl", [LISTED])).toEqual({ status: "unsupported_sport" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not fetch for an empty batch", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(CFB_BOARD));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const out = await confirmer.confirmBatch(NCAAF, []);
    expect(out.status).toBe("ok");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// Parse through the same free ESPN parser (and page limit) the confirmer uses.
import { ESPN_SCOREBOARD_LIMIT, parseEspnScoreboardForSeed } from "@sports/data-ingestion";
function parseBoard(body: { events: Record<string, unknown>[] }) {
  return parseEspnScoreboardForSeed("ncaaf", body as Parameters<typeof parseEspnScoreboardForSeed>[1]);
}
