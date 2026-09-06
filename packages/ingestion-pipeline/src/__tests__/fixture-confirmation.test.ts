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
});

describe("requiresReconfirmation and commenceTimeCorrection", () => {
  const espnAt = new Date("2026-09-05T19:30:00.000Z");
  const oldRow: FixtureProbe = {
    ...LISTED,
    id: "g-cincy-old",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    commenceTime: new Date("2026-09-05T19:00:00.000Z"),
  };

  it("re-confirms only rows older than 30 days with kickoff inside 48 hours", () => {
    expect(requiresReconfirmation(oldRow, NOW)).toBe(true);
    expect(requiresReconfirmation({ ...oldRow, createdAt: new Date("2026-09-01T00:00:00.000Z") }, NOW)).toBe(false);
    expect(requiresReconfirmation({ ...oldRow, commenceTime: new Date("2026-09-09T19:00:00.000Z") }, NOW)).toBe(false);
    expect(requiresReconfirmation({ ...oldRow, createdAt: null }, NOW)).toBe(false);
  });

  it("corrects commenceTime only beyond 15 minutes of drift", () => {
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
    // A fresh row never has its clock rewritten by the guard, whatever the drift.
    expect(commenceTimeCorrection(LISTED, new Date("2026-09-05T21:00:00.000Z"), NOW)).toBeNull();
  });

  it("carries the correction on a confirmed old row and null on a fresh one", () => {
    const board = parseBoard(CFB_BOARD);
    const out = confirmFixturesAgainstScoreboard([oldRow, LISTED], board, NCAAF, NOW);
    expect(out.get(oldRow.id)).toMatchObject({ status: "confirmed", correctedCommenceTime: espnAt });
    expect(out.get(LISTED.id)).toMatchObject({ status: "confirmed", correctedCommenceTime: null });
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

  it("sends groups=50 on a men's college basketball batch spanning two date keys (a range without groups is HTTP 404 live)", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => jsonResponse({ events: [] }));
    const confirmer = new FixtureConfirmer({ fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    const lateTip: FixtureProbe = {
      id: "g-hoops",
      homeTeamName: "Kansas Jayhawks",
      awayTeamName: "Baylor Bears",
      // 02:00Z is the previous Eastern day: two date keys, hence a min-max range.
      commenceTime: new Date("2026-03-08T02:00:00.000Z"),
    };
    const out = await confirmer.confirmBatch("basketball_ncaab", [lateTip]);
    expect(out.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/basketball/mens-college-basketball/scoreboard");
    expect(url).toContain("dates=20260307-20260308");
    expect(url).toContain("groups=50");
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

// Parse through the same free ESPN parser the confirmer uses.
import { parseEspnScoreboardForSeed } from "@sports/data-ingestion";
function parseBoard(body: { events: Record<string, unknown>[] }) {
  return parseEspnScoreboardForSeed("ncaaf", body as Parameters<typeof parseEspnScoreboardForSeed>[1]);
}
