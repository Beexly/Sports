import { describe, it, expect } from "vitest";
import {
  twoWayDevig,
  americanToImplied,
  multiWayDevig,
  medianConsensus,
} from "../devig/american";
import { createMemoryDemoProvider } from "../providers/memory-demo";
import { createModelPriorProvider } from "../providers/model-prior";
import {
  createPolymarketGammaProvider,
  gammaMarketToLines,
} from "../providers/polymarket-gamma";
import {
  createOddsApiOptionalProvider,
  oddsApiEventsToLines,
} from "../providers/odds-api-optional";
import {
  aggregateLines,
  getIndependentQuotes,
  oddsApiIndependenceReport,
} from "../aggregate";

describe("devig", () => {
  it("two-way fair sums to 1", () => {
    const { pA, pB, overround } = twoWayDevig(-110, -110);
    expect(pA + pB).toBeCloseTo(1, 9);
    expect(overround).toBeGreaterThan(0);
  });
  it("american implied for favorite > 0.5", () => {
    expect(americanToImplied(-150)).toBeGreaterThan(0.5);
  });
  it("multi-way works", () => {
    const { fair } = multiWayDevig([2.1, 3.5, 4.0]);
    expect(fair.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
  it("median consensus", () => {
    expect(medianConsensus([0.4, 0.5, 0.6])).toBeCloseTo(0.5);
  });
});

describe("providers without Odds API key", () => {
  it("demo provider works offline", async () => {
    const p = createMemoryDemoProvider(() => new Date("2026-07-01T00:00:00Z"));
    const lines = await p.fetchQuotes({ sport: "NFL" });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.q > 0 && l.q < 1)).toBe(true);
  });

  it("model prior is honest fallback", async () => {
    const p = createModelPriorProvider([
      {
        eventId: "e1",
        sport: "NFL",
        selection: "KC",
        p: 0.58,
      },
    ]);
    const lines = await p.fetchQuotes({ sport: "NFL" });
    expect(lines[0]?.sourceKind).toBe("model_prior");
    expect(lines[0]?.q).toBeCloseTo(0.58);
  });

  it("Odds API without key returns empty (not fake)", async () => {
    const p = createOddsApiOptionalProvider({ apiKey: null });
    const lines = await p.fetchQuotes({ sport: "americanfootball_nfl" });
    expect(lines).toEqual([]);
  });

  it("Odds API fixtures parse", () => {
    const lines = oddsApiEventsToLines([
      {
        id: "x1",
        sport_key: "americanfootball_nfl",
        home_team: "KC",
        away_team: "BUF",
        commence_time: "2026-09-01T00:00:00Z",
        bookmakers: [
          {
            key: "draftkings",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "KC", price: -130 },
                  { name: "BUF", price: 110 },
                ],
              },
            ],
          },
        ],
      },
    ]);
    expect(lines.length).toBe(2);
    expect(lines[0]!.q + lines[1]!.q).toBeCloseTo(1, 6);
  });

  it("Polymarket gamma fixtures", () => {
    const lines = gammaMarketToLines({
      id: "pm1",
      question: "Will KC win?",
      outcomePrices: '["0.62","0.38"]',
      outcomes: '["Yes","No"]',
      updatedAt: "2026-07-01T00:00:00Z",
    });
    expect(lines[0]!.q).toBeCloseTo(0.62);
    expect(lines[0]!.sourceKind).toBe("prediction_market");
  });

  it("Polymarket provider uses fixtures offline", async () => {
    const p = createPolymarketGammaProvider({
      fixtures: [
        {
          id: "pm2",
          outcomePrices: [0.55, 0.45],
          outcomes: ["Yes", "No"],
        },
      ],
    });
    const lines = await p.fetchQuotes({ sport: "NFL" });
    expect(lines.length).toBe(2);
  });
});

describe("independence aggregate", () => {
  it("produces q without Odds API", async () => {
    const providers = [
      createMemoryDemoProvider(() => new Date("2026-07-01T00:00:00Z")),
      createPolymarketGammaProvider({
        fixtures: [
          {
            id: "nfl-demo-1",
            outcomePrices: [0.57, 0.43],
            outcomes: ["KC", "BUF"],
          },
        ],
      }),
      createModelPriorProvider([
        { eventId: "nfl-demo-1", sport: "NFL", selection: "KC", p: 0.56 },
      ]),
      createOddsApiOptionalProvider({ apiKey: null }),
    ];
    const report = oddsApiIndependenceReport(providers);
    expect(report.oddsApiRequired).toBe(false);
    expect(report.readyForProdWithoutOddsApi).toBe(true);

    const agg = await getIndependentQuotes(
      providers,
      { sport: "NFL" },
      { allowDemo: true, preferNonBook: true, allowModelFallback: true },
    );
    expect(agg.length).toBeGreaterThan(0);
    expect(agg.every((a) => a.independence.oddsApiRequired === false)).toBe(
      true,
    );
  });

  it("prefers prediction market over demo when preferNonBook", () => {
    const lines = [
      {
        eventId: "e",
        sport: "NFL",
        market: "h2h" as const,
        selection: "KC",
        q: 0.5,
        quoteAsOf: "2026-01-01T00:00:00Z",
        sourceId: "demo",
        sourceKind: "synthetic_demo" as const,
        rights: "internal_synthetic" as const,
      },
      {
        eventId: "e",
        sport: "NFL",
        market: "h2h" as const,
        selection: "KC",
        q: 0.6,
        quoteAsOf: "2026-01-01T00:00:00Z",
        sourceId: "pm",
        sourceKind: "prediction_market" as const,
        rights: "public_market" as const,
      },
    ];
    const agg = aggregateLines(lines, { preferNonBook: true });
    expect(agg[0]!.q).toBeCloseTo(0.6);
    expect(agg[0]!.independence.predictionMarketsUsed).toBe(1);
  });
});
