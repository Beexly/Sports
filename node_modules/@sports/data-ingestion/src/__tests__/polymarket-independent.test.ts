import { afterEach, describe, expect, it, vi } from "vitest";
import {
  gammaMarketToIndependent,
  isPolymarketIndependentEnabled,
  PolymarketIndependentClient,
  teamMatchTokens,
} from "../polymarket-independent-client.js";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.INDEPENDENT_POLYMARKET;
});

describe("isPolymarketIndependentEnabled — compliance default OFF", () => {
  it("is off by default", () => {
    delete process.env.INDEPENDENT_POLYMARKET;
    expect(isPolymarketIndependentEnabled({})).toBe(false);
  });

  it("on only for explicit true/1/yes/on", () => {
    expect(isPolymarketIndependentEnabled({ INDEPENDENT_POLYMARKET: "1" })).toBe(true);
    expect(isPolymarketIndependentEnabled({ INDEPENDENT_POLYMARKET: "true" })).toBe(true);
    expect(isPolymarketIndependentEnabled({ INDEPENDENT_POLYMARKET: "yes" })).toBe(true);
    expect(isPolymarketIndependentEnabled({ INDEPENDENT_POLYMARKET: "maybe" })).toBe(false);
  });
});

describe("gammaMarketToIndependent", () => {
  const capturedAt = "2026-08-09T12:00:00.000Z";

  it("maps team-named outcomes and de-vigs", () => {
    const fv = gammaMarketToIndependent(
      {
        question: "Lakers vs Celtics Winner?",
        outcomes: '["Lakers","Celtics"]',
        outcomePrices: '["0.42","0.58"]',
        active: true,
        closed: false,
      },
      "Los Angeles Lakers",
      "Boston Celtics",
      capturedAt,
    );
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("polymarket_gamma_internal");
    expect(fv!.homeFairProb! + fv!.awayFairProb!).toBeCloseTo(1, 4);
  });

  it("rejects closed markets", () => {
    expect(
      gammaMarketToIndependent(
        {
          question: "Lakers vs Celtics",
          outcomes: '["Lakers","Celtics"]',
          outcomePrices: '["0.5","0.5"]',
          closed: true,
        },
        "Lakers",
        "Celtics",
        capturedAt,
      ),
    ).toBeNull();
  });

  it("rejects when only one team matches (no false join)", () => {
    expect(
      gammaMarketToIndependent(
        {
          question: "Will the Lakers win the championship?",
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.3","0.7"]',
          active: true,
        },
        "Los Angeles Lakers",
        "Boston Celtics",
        capturedAt,
      ),
    ).toBeNull();
  });
});

describe("teamMatchTokens", () => {
  it("drops short stopwords", () => {
    const t = teamMatchTokens("Manchester United");
    expect(t).toContain("manchester");
    expect(t).not.toContain("united");
  });
});

describe("PolymarketIndependentClient fixtures", () => {
  it("returns fair value from offline fixtures", async () => {
    const client = new PolymarketIndependentClient({
      now: () => new Date("2026-08-09T12:00:00.000Z"),
      fixtures: [
        {
          question: "Dallas Cowboys vs Philadelphia Eagles Winner?",
          outcomes: '["Cowboys","Eagles"]',
          outcomePrices: '["0.55","0.45"]',
          active: true,
          closed: false,
        },
      ],
    });
    const fv = await client.getFairValue({
      homeTeam: "Dallas Cowboys",
      awayTeam: "Philadelphia Eagles",
    });
    expect(fv?.source).toBe("polymarket_gamma_internal");
    expect(fv?.homeFairProb).toBeCloseTo(0.55, 3);
  });
});
