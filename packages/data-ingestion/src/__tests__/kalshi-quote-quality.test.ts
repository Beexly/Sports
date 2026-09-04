/**
 * Quote quality must SURVIVE ingestion.
 *
 * `gateKalshiListing` measures bid, ask and spread on every listing row. The
 * bridge into the engine used to reduce all of that to a bare midpoint in the
 * same expression that computed it, and dropped the snapshot's `overround` too.
 * The consequence is not merely lost telemetry: agreement between independent
 * sources multiplies conviction downstream, so a thin, wide-spread quote that
 * happens to agree gets the same vote as a deep one — and with the spread
 * destroyed at ingestion, nobody can tell afterwards which it was.
 *
 * These tests pin the distinguishability itself: two markets with the SAME
 * midpoints, the SAME de-vigged fair probabilities and the SAME overround, whose
 * only difference is how wide the book is, must not bridge to equal records.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { KalshiClient, impliedYesQuote, toIndependentFairValue } from "../kalshi-client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EVENT = "KXNBAGAME-26JUN03NYKSAS";
const FROZEN = new Date("2026-06-03T18:00:00.000Z");

/**
 * Both books mid at 0.59 (SAS) / 0.41 (NYK) and both sum to an overround of
 * exactly 1.0. Only the width differs.
 */
const DEEP = {
  SAS: { yes_bid_dollars: "0.58", yes_ask_dollars: "0.60" }, // spread 0.02
  NYK: { yes_bid_dollars: "0.40", yes_ask_dollars: "0.42" }, // spread 0.02
};
const THIN = {
  SAS: { yes_bid_dollars: "0.545", yes_ask_dollars: "0.635" }, // spread 0.09
  NYK: { yes_bid_dollars: "0.365", yes_ask_dollars: "0.455" }, // spread 0.09
};

function mockEvent(book: typeof DEEP): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("event_ticker=")) {
      return jsonResponse({
        markets: [
          { ticker: `${EVENT}-SAS`, yes_sub_title: "San Antonio" },
          { ticker: `${EVENT}-NYK`, yes_sub_title: "New York" },
        ],
      });
    }
    if (url.endsWith("-SAS")) {
      return jsonResponse({
        market: { ticker: `${EVENT}-SAS`, yes_sub_title: "San Antonio", status: "active", ...book.SAS },
      });
    }
    if (url.endsWith("-NYK")) {
      return jsonResponse({
        market: { ticker: `${EVENT}-NYK`, yes_sub_title: "New York", status: "active", ...book.NYK },
      });
    }
    throw new Error(`unexpected url ${url}`);
  });
}

async function bridge(book: typeof DEEP) {
  const client = new KalshiClient({ now: () => FROZEN, skipSeriesSearch: true });
  mockEvent(book);
  const fv = await client.getFairValue({
    league: "NBA",
    dateUtc: "2026-06-03",
    awayAbbr: "NYK",
    homeAbbr: "SAS",
  });
  vi.restoreAllMocks();
  return { snapshot: fv, independent: toIndependentFairValue(fv, "SAS", "NYK") };
}

describe("impliedYesQuote — the gate's measurements reach the caller", () => {
  it("reports the measured bid/ask spread, not just the midpoint", () => {
    const q = impliedYesQuote({ ticker: "x", status: "open", yes_bid_dollars: "0.36", yes_ask_dollars: "0.37" });
    expect(q.prob).toBeCloseTo(0.365, 6);
    expect(q.spread).toBeCloseTo(0.01, 6);
    expect(q.bid).toBeCloseTo(0.36, 6);
    expect(q.ask).toBeCloseTo(0.37, 6);
    expect(q.quoteSource).toBe("yes_bid_ask");
  });

  it("distinguishes a wide book from a tight one at the same midpoint", () => {
    const tight = impliedYesQuote({ ticker: "x", status: "open", yes_bid_dollars: "0.58", yes_ask_dollars: "0.60" });
    const wide = impliedYesQuote({ ticker: "x", status: "open", yes_bid_dollars: "0.545", yes_ask_dollars: "0.635" });
    expect(tight.prob).toBeCloseTo(wide.prob!, 6); // identical price…
    expect(wide.spread!).toBeGreaterThan(tight.spread! * 4); // …very different quality
  });

  it("keeps the measured spread on a refused row, so the refusal is diagnosable", () => {
    // 0.20-wide book: refused as wide_spread, but the width is the evidence.
    const q = impliedYesQuote({ ticker: "x", status: "open", yes_bid_dollars: "0.40", yes_ask_dollars: "0.60" });
    expect(q.prob).toBeNull();
    expect(q.refuse).toBe("wide_spread");
    expect(q.spread).toBeCloseTo(0.2, 6);
  });
});

describe("Kalshi snapshot → independent fair value — quote quality survives the bridge", () => {
  it("carries the per-leg spread onto each side of the snapshot", async () => {
    const { snapshot } = await bridge(THIN);
    const sas = snapshot.sides.find((s) => s.ticker.endsWith("-SAS"))!;
    const nyk = snapshot.sides.find((s) => s.ticker.endsWith("-NYK"))!;
    expect(sas.quoteSpread).toBeCloseTo(0.09, 6);
    expect(nyk.quoteSpread).toBeCloseTo(0.09, 6);
    expect(sas.quoteBid).toBeCloseTo(0.545, 6);
    expect(sas.quoteAsk).toBeCloseTo(0.635, 6);
    expect(sas.quoteSource).toBe("yes_bid_ask");
  });

  it("carries the overround the bridge already computed", async () => {
    const { snapshot, independent } = await bridge(DEEP);
    expect(snapshot.overround).toBeCloseTo(1.0, 6);
    // Previously computed at the bridge and dropped on the floor.
    expect(independent.quote?.overround).toBeCloseTo(snapshot.overround!, 6);
  });

  it("a thin quote is DISTINGUISHABLE from a deep one after bridging", async () => {
    const deep = await bridge(DEEP);
    const thin = await bridge(THIN);

    // Everything the old shape carried is identical between the two…
    expect(thin.independent.source).toBe(deep.independent.source);
    expect(thin.independent.homeFairProb).toBeCloseTo(deep.independent.homeFairProb!, 6);
    expect(thin.independent.awayFairProb).toBeCloseTo(deep.independent.awayFairProb!, 6);
    expect(thin.independent.capturedAt).toBe(deep.independent.capturedAt);
    expect(thin.independent.quote?.overround).toBeCloseTo(deep.independent.quote!.overround!, 6);

    // …so under the old shape these records were equal, and the noisy one was
    // indistinguishable from the liquid one. It must not be.
    expect(thin.independent).not.toEqual(deep.independent);
    expect(thin.independent.quote?.homeSpread).toBeCloseTo(0.09, 6);
    expect(deep.independent.quote?.homeSpread).toBeCloseTo(0.02, 6);
    expect(thin.independent.quote!.homeSpread!).toBeGreaterThan(deep.independent.quote!.homeSpread!);
  });

  it("reports the quote even on an honest miss, so the null pair is explainable", async () => {
    const client = new KalshiClient({ now: () => FROZEN, skipSeriesSearch: true });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("event_ticker=")) {
        return jsonResponse({
          markets: [
            { ticker: `${EVENT}-SAS`, yes_sub_title: "San Antonio" },
            { ticker: `${EVENT}-NYK`, yes_sub_title: "New York" },
          ],
        });
      }
      if (url.endsWith("-SAS")) {
        return jsonResponse({
          market: { ticker: `${EVENT}-SAS`, yes_sub_title: "San Antonio", status: "active", ...DEEP.SAS },
        });
      }
      // NYK has only a trade print — no two-way quote at all.
      return jsonResponse({
        market: { ticker: `${EVENT}-NYK`, yes_sub_title: "New York", status: "active", last_price_dollars: "0.41" },
      });
    });

    const fv = await client.getFairValue({
      league: "NBA",
      dateUtc: "2026-06-03",
      awayAbbr: "NYK",
      homeAbbr: "SAS",
    });
    const out = toIndependentFairValue(fv, "SAS", "NYK");

    // Polarity law still holds: no one-sided fair.
    expect(out.homeFairProb).toBeNull();
    expect(out.awayFairProb).toBeNull();
    // But the reason is now on the record instead of thrown away.
    expect(out.quote?.awaySpread).toBeNull();
    expect(out.quote?.awayQuoteSource).toBe("last_trade_only");
    expect(out.quote?.homeSpread).toBeCloseTo(0.02, 6);
  });
});
