/**
 * methodTag honesty — aggregate all-tagged rule + archive continuous CLV.
 */
import { describe, expect, it } from "vitest";
import { aggregateLines, uniformMethodTags } from "../aggregate";
import {
  ClosingArchive,
  seedDemoClosingArchive,
} from "../archive/closing-archive";
import type { QuoteLine } from "../types";
import { createKalshiTradeProvider } from "../providers/kalshi-trade-api";
import { createMemoryDemoProvider } from "../providers/memory-demo";
import { oddsApiEventsToLines } from "../providers/odds-api-optional";
import { gammaMarketToLines } from "../providers/polymarket-gamma";

function line(
  partial: Partial<QuoteLine> &
    Pick<QuoteLine, "eventId" | "selection" | "q" | "sourceId" | "sourceKind">,
): QuoteLine {
  return {
    sport: "NFL",
    market: "h2h",
    quoteAsOf: "2026-09-10T12:00:00Z",
    rights: "public_market",
    ...partial,
  };
}

describe("uniformMethodTags (aggregate)", () => {
  it("propagates only when every source is tagged and agrees", () => {
    const pool = [
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.55,
        sourceId: "a",
        sourceKind: "prediction_market",
        methodTag: "prediction_market_raw_v1",
        modelVersion: "quote.gamma.v1",
      }),
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.56,
        sourceId: "b",
        sourceKind: "prediction_market",
        methodTag: "prediction_market_raw_v1",
        modelVersion: "quote.gamma.v1",
      }),
    ];
    expect(uniformMethodTags(pool)).toEqual({
      methodTag: "prediction_market_raw_v1",
      modelVersion: "quote.gamma.v1",
    });
  });

  it("refuses when one source lacks methodTag (partial tags)", () => {
    const pool = [
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.55,
        sourceId: "gamma",
        sourceKind: "prediction_market",
        methodTag: "prediction_market_raw_v1",
        modelVersion: "quote.gamma.v1",
      }),
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.54,
        sourceId: "untagged",
        sourceKind: "prediction_market",
        // no methodTag — must not mint gamma's tag onto mixed median
      }),
    ];
    expect(uniformMethodTags(pool)).toEqual({});
    const agg = aggregateLines(pool);
    expect(agg[0]!.methodTag).toBeUndefined();
    expect(agg[0]!.modelVersion).toBeUndefined();
  });

  it("refuses when tags disagree", () => {
    const pool = [
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.55,
        sourceId: "a",
        sourceKind: "prediction_market",
        methodTag: "prediction_market_raw_v1",
        modelVersion: "quote.gamma.v1",
      }),
      line({
        eventId: "e1",
        selection: "KC",
        q: 0.56,
        sourceId: "b",
        sourceKind: "model_prior",
        methodTag: "model_prior_v1",
        modelVersion: "quote.model_prior.v1",
      }),
    ];
    expect(uniformMethodTags(pool).methodTag).toBeUndefined();
  });
});

describe("provider methodTag stamps", () => {
  it("gamma stamps prediction_market_raw_v1", () => {
    const lines = gammaMarketToLines({
      id: "pm1",
      outcomePrices: [0.6, 0.4],
      outcomes: ["Yes", "No"],
    });
    expect(lines[0]!.methodTag).toBe("prediction_market_raw_v1");
    expect(lines[0]!.modelVersion).toBe("quote.gamma.v1");
  });

  it("kalshi stamps prediction_market_raw_v1", async () => {
    const p = createKalshiTradeProvider({
      fixtures: { T: { yes: [[0.55, 10]], no: [[0.44, 10]] } },
    });
    const lines = await p.fetchQuotes({ sport: "NFL", eventId: "T" });
    expect(lines[0]!.methodTag).toBe("prediction_market_raw_v1");
    expect(lines[0]!.modelVersion).toBe("quote.kalshi.v1");
  });

  it("odds api two-way stamps two_way_devig_v1", () => {
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
    expect(lines.every((l) => l.methodTag === "two_way_devig_v1")).toBe(true);
  });

  it("demo stamps two_way_devig_v1", async () => {
    const lines = await createMemoryDemoProvider().fetchQuotes({ sport: "NFL" });
    expect(lines.every((l) => l.methodTag === "two_way_devig_v1")).toBe(true);
  });
});

describe("closing archive continuous CLV", () => {
  it("persists tags and continuous CLV succeeds on seed demo", () => {
    const arch = new ClosingArchive(() => new Date("2026-09-10T18:00:00Z"));
    seedDemoClosingArchive(arch, new Date("2026-09-10T18:00:00Z"));
    const open = arch.openLine("nfl-kc-buf", "KC");
    expect(open?.methodTag).toBe("prediction_market_raw_v1");
    const clv = arch.computeClv("nfl-kc-buf", "KC");
    expect(clv).not.toBeNull();
    expect(clv!.continuous).toBe(true);
    expect(clv!.methodTag).toBe("prediction_market_raw_v1");
    const cont = arch.computeContinuousClvObservation("nfl-kc-buf", "KC");
    expect(cont.ok).toBe(true);
  });

  it("refuses continuous CLV when tags missing", () => {
    const arch = new ClosingArchive();
    const t0 = "2026-09-01T00:00:00Z";
    const t1 = "2026-09-10T00:00:00Z";
    arch.ingestLines([
      line({
        eventId: "e-untagged",
        selection: "KC",
        q: 0.5,
        sourceId: "x",
        sourceKind: "prediction_market",
        quoteAsOf: t0,
      }),
      line({
        eventId: "e-untagged",
        selection: "KC",
        q: 0.55,
        sourceId: "x",
        sourceKind: "prediction_market",
        quoteAsOf: t1,
      }),
    ]);
    const clv = arch.computeClv("e-untagged", "KC");
    expect(clv!.continuous).toBe(false);
    expect(clv!.continuityCode).toBe("missing_method_tag");
    const cont = arch.computeContinuousClvObservation("e-untagged", "KC");
    expect(cont.ok).toBe(false);
    if (!cont.ok) expect(cont.code).toBe("missing_method_tag");
  });

  it("asClosingProvider re-emits method tags", async () => {
    const arch = new ClosingArchive();
    seedDemoClosingArchive(arch);
    const lines = await arch.asClosingProvider().fetchQuotes({ sport: "NFL" });
    expect(lines.some((l) => l.methodTag === "prediction_market_raw_v1")).toBe(
      true,
    );
  });
});
