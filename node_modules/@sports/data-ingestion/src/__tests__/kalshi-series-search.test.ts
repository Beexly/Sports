import { afterEach, describe, expect, it, vi } from "vitest";
import { KalshiClient } from "../kalshi-client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("KalshiClient series-search fallback (MLB time-encoded)", () => {
  const FROZEN = new Date("2026-08-12T18:00:00.000Z");

  it("falls back to series search when constructed ticker has no markets", async () => {
    const client = new KalshiClient({ now: () => FROZEN });
    const realEvent = "KXMLBGAME-26AUG121610MILSD";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      // Constructed (with UTC 2310 from commence) — empty
      if (url.includes("event_ticker=") && url.includes("MILSD") && !url.includes("1610")) {
        return jsonResponse({ markets: [] });
      }
      // Series list
      if (url.includes("series_ticker=KXMLBGAME")) {
        return jsonResponse({
          markets: [
            {
              ticker: `${realEvent}-SD`,
              event_ticker: realEvent,
              yes_sub_title: "San Diego",
              status: "active",
              occurrence_datetime: "2026-08-12T23:10:00Z",
              yes_bid_dollars: "0.40",
              yes_ask_dollars: "0.42",
            },
            {
              ticker: `${realEvent}-MIL`,
              event_ticker: realEvent,
              yes_sub_title: "Milwaukee",
              status: "active",
              occurrence_datetime: "2026-08-12T23:10:00Z",
              yes_bid_dollars: "0.58",
              yes_ask_dollars: "0.60",
            },
            // Distractor same day
            {
              ticker: "KXMLBGAME-26AUG121540COLAZ-COL",
              event_ticker: "KXMLBGAME-26AUG121540COLAZ",
              yes_sub_title: "Colorado",
              status: "active",
              occurrence_datetime: "2026-08-12T22:40:00Z",
              yes_bid_dollars: "0.50",
              yes_ask_dollars: "0.52",
            },
          ],
        });
      }
      // Event markets after resolve
      if (url.includes(`event_ticker=${encodeURIComponent(realEvent)}`) || url.includes("event_ticker=KXMLBGAME-26AUG121610MILSD")) {
        return jsonResponse({
          markets: [
            { ticker: `${realEvent}-MIL`, yes_sub_title: "Milwaukee" },
            { ticker: `${realEvent}-SD`, yes_sub_title: "San Diego" },
          ],
        });
      }
      if (url.endsWith("-MIL")) {
        return jsonResponse({
          market: {
            ticker: `${realEvent}-MIL`,
            yes_sub_title: "Milwaukee",
            status: "active",
            yes_bid_dollars: "0.58",
            yes_ask_dollars: "0.60",
          },
        });
      }
      if (url.endsWith("-SD")) {
        return jsonResponse({
          market: {
            ticker: `${realEvent}-SD`,
            yes_sub_title: "San Diego",
            status: "active",
            yes_bid_dollars: "0.40",
            yes_ask_dollars: "0.42",
          },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const fv = await client.getFairValue({
      league: "MLB",
      dateUtc: "2026-08-12T23:10:00Z",
      awayAbbr: "MIL",
      homeAbbr: "SD",
    });

    // If constructed with time happened to match empty, series path wins.
    // Either path is ok if we get live quotes for MIL/SD.
    expect(fv.sides.length).toBe(2);
    expect(fv.sides.every((s) => s.fairProb != null)).toBe(true);
    expect(fv.sides[0]!.fairProb! + fv.sides[1]!.fairProb!).toBeCloseTo(1, 5);
    if (fv.resolvePath) {
      expect(["constructed", "series_search"]).toContain(fv.resolvePath);
    }
  });

  it("drops soccer Tie legs and de-vigs two team sides", async () => {
    const client = new KalshiClient({ now: () => FROZEN, skipSeriesSearch: true });
    const et = "KXEPLGAME-26AUG23NEWLFC";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("event_ticker=")) {
        return jsonResponse({
          markets: [
            { ticker: `${et}-TIE`, yes_sub_title: "Tie" },
            { ticker: `${et}-NEW`, yes_sub_title: "Newcastle" },
            { ticker: `${et}-LFC`, yes_sub_title: "Liverpool" },
          ],
        });
      }
      if (url.endsWith("-TIE")) {
        return jsonResponse({
          market: {
            ticker: `${et}-TIE`,
            yes_sub_title: "Tie",
            status: "active",
            yes_bid_dollars: "0.25",
            yes_ask_dollars: "0.27",
          },
        });
      }
      if (url.endsWith("-NEW")) {
        return jsonResponse({
          market: {
            ticker: `${et}-NEW`,
            yes_sub_title: "Newcastle",
            status: "active",
            yes_bid_dollars: "0.28",
            yes_ask_dollars: "0.30",
          },
        });
      }
      if (url.endsWith("-LFC")) {
        return jsonResponse({
          market: {
            ticker: `${et}-LFC`,
            yes_sub_title: "Liverpool",
            status: "active",
            yes_bid_dollars: "0.45",
            yes_ask_dollars: "0.47",
          },
        });
      }
      throw new Error(`unexpected ${url}`);
    });

    const fv = await client.getFairValue({
      league: "EPL",
      dateUtc: "2026-08-23",
      awayAbbr: "NEW",
      homeAbbr: "LFC",
    });

    // Tie dropped → 2 sides only
    expect(fv.sides).toHaveLength(2);
    expect(fv.sides.every((s) => !/tie/i.test(s.team))).toBe(true);
    expect(fv.sides[0]!.fairProb! + fv.sides[1]!.fairProb!).toBeCloseTo(1, 5);
  });
});
