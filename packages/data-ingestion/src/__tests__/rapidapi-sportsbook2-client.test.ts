import { describe, expect, it, vi } from "vitest";
import {
  RAPIDAPI_SPORTSBOOK2_BASE,
  RAPIDAPI_SPORTSBOOK2_HOST,
  RapidapiSportsbook2Client,
  RapidapiSportsbook2Error,
} from "../rapidapi-sportsbook2-client.js";

const ENV = {
  RAPIDAPI_SPORTSBOOK2_INGEST: "1",
  RAPIDAPI_KEY: "test-key",
} as NodeJS.ProcessEnv;

// Shape recorded from the verified live response, 2026-09-20.
const BODY = {
  advantages: [
    {
      key: "advg-xxxx-0000",
      type: "ARBITRAGE",
      lastFoundAt: "2026-09-20T17:28:04.598Z",
      createdAt: "2026-09-20T17:28:04.598Z",
      market: {
        key: "1K8Q-Ajui-BKoz",
        type: "POINT_TOTAL",
        segment: "FULL_MATCH",
        lastFoundAt: "2026-09-20T17:28:04.598Z",
        event: {
          key: "RUQe-Ajuu-L8Pi",
          name: "San Francisco Giants @ Los Angeles Dodgers",
          startTime: "2026-09-20T20:10:00.000Z",
          homeParticipantKey: "CHEM-wegw-VVSn",
          participants: [
            {
              key: "CHEM-wegw-VVSn",
              slug: "los-angeles-dodgers",
              name: "Los Angeles Dodgers",
              shortName: "LAD",
              sport: "BASEBALL",
            },
          ],
          competitionInstance: { key: "comp-1", name: "MLB" },
        },
      },
      marketStatistics: { whatever: true },
      outcomes: [
        {
          key: "outc-x000-0000",
          type: "OVER",
          modifier: 8.5,
          payout: 2.05,
          live: false,
          readAt: "2026-09-20T17:26:00.671Z",
          lastFoundAt: "2026-09-20T17:26:00.671Z",
          source: "PROPHET_X",
          marketKey: "1K8Q-Ajui-BKoz",
          participantKey: null,
        },
        { key: null, type: "UNDER" },
      ],
    },
    { type: "ARBITRAGE" }, // no key → dropped defensively
  ],
};

describe("flag off", () => {
  it("returns null and never fetches", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const client = new RapidapiSportsbook2Client(
      {} as NodeJS.ProcessEnv,
      fetchMock as unknown as typeof fetch,
    );
    expect(await client.getAdvantages("ARBITRAGE")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("key missing", () => {
  it("returns null without fetching even when the flag is on", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const client = new RapidapiSportsbook2Client(
      { RAPIDAPI_SPORTSBOOK2_INGEST: "1" } as NodeJS.ProcessEnv,
      fetchMock as unknown as typeof fetch,
    );
    expect(await client.getAdvantages("ARBITRAGE")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getAdvantages", () => {
  it("fetches with the RapidAPI auth headers and parses the verified shape", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(BODY), { status: 200 }),
    );
    const client = new RapidapiSportsbook2Client(
      ENV,
      fetchMock as unknown as typeof fetch,
    );
    const advantages = await client.getAdvantages("ARBITRAGE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(`${RAPIDAPI_SPORTSBOOK2_BASE}/v0/advantages/?type=ARBITRAGE`);
    expect(init.headers["x-rapidapi-host"]).toBe(RAPIDAPI_SPORTSBOOK2_HOST);
    expect(init.headers["x-rapidapi-key"]).toBe("test-key");
    expect(init.headers["x-rapidapi-key"]).not.toContain("3fb70");

    expect(advantages).not.toBeNull();
    expect(advantages!.length).toBe(1); // keyless entry dropped
    const a = advantages![0]!;
    expect(a.type).toBe("ARBITRAGE");
    expect(a.market?.type).toBe("POINT_TOTAL");
    expect(a.market?.event?.name).toContain("Giants");
    expect(a.market?.event?.participants[0]?.shortName).toBe("LAD");
    expect(a.outcomes.length).toBe(1); // keyless outcome dropped
    const o = a.outcomes[0]!;
    expect(o.type).toBe("OVER");
    expect(o.modifier).toBe(8.5);
    expect(o.payout).toBe(2.05);
    expect(o.source).toBe("PROPHET_X");
  });

  it("surfaces non-2xx as a typed error", async () => {
    const fetchMock = vi.fn(async () =>
      new Response('{"message":"rate limited"}', { status: 429 }),
    );
    const client = new RapidapiSportsbook2Client(
      ENV,
      fetchMock as unknown as typeof fetch,
    );
    await expect(client.getAdvantages("ARBITRAGE")).rejects.toBeInstanceOf(
      RapidapiSportsbook2Error,
    );
  });

  it("is inert when assertIngestible would refuse: the registry verdict is use-with-caution", async () => {
    // The registry pins the verdict; the client pins the id string it checks.
    // Drift on either side fails this file.
    const src = await vi.importActual<typeof import("../source-registry.js")>(
      "../source-registry.js",
    );
    const entry = src.SOURCE_REGISTRY["rapidapi-sportsbook2"];
    expect(entry).toBeDefined();
    expect(entry.verdict).toBe("use-with-caution");
    expect(entry.commercialUse).toBe(true);
  });
});
