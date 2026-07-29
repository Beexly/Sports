import { describe, expect, it } from "vitest";
import { impliedToDecimal, parseGammaMarketsPayload } from "../providers/gamma-markets.js";
import { runGammaCronDelta } from "../hydration/gamma-cron-delta.js";
import { makeMemoryClosingArchive } from "../archive/closing-archive.js";

describe("gamma free quote plane", () => {
  it("impliedToDecimal refuses edges", () => {
    expect(impliedToDecimal(0)).toBeNull();
    expect(impliedToDecimal(1)).toBeNull();
    expect(impliedToDecimal(0.5)).toBe(2);
  });

  it("parses gamma market payload", () => {
    const quotes = parseGammaMarketsPayload(
      [
        {
          id: "m1",
          question: "Will X win?",
          outcomePrices: '["0.4","0.6"]',
          outcomes: '["Yes","No"]',
        },
      ],
      "2026-07-29T00:00:00.000Z",
    );
    expect(quotes).toHaveLength(2);
    expect(quotes[0]!.side).toBe("Yes");
    expect(quotes[0]!.decimalOdds).toBeCloseTo(2.5, 5);
    expect(quotes[0]!.source).toBe("polymarket_gamma");
  });

  it("cron_delta archives opens without Odds API", async () => {
    const archive = makeMemoryClosingArchive();
    const r = await runGammaCronDelta({
      archive,
      promoteOpen: true,
      now: () => "2026-07-29T12:00:00.000Z",
      http: async () => ({
        status: 200,
        json: [
          {
            id: "evt1",
            outcomePrices: '["0.45","0.55"]',
            outcomes: '["home","away"]',
          },
        ],
      }),
    });
    expect(r.ok).toBe(true);
    expect(r.tick.oddsApiUsed).toBe(false);
    expect(r.archived).toBe(2);
    expect(archive.opens("evt1", "binary", "home")?.role).toBe("open");
  });

  it("refuses empty gamma payload honestly", async () => {
    const archive = makeMemoryClosingArchive();
    const r = await runGammaCronDelta({
      archive,
      http: async () => ({ status: 200, json: [] }),
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("gamma_empty");
  });
});
