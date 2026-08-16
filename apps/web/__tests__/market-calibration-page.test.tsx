import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * /calibration/market page — the market-calibration baseline surface (P14-01).
 *
 * The page must NEVER fabricate: when there is no data it shows the loaders'
 * honest no-data message, and the test guards that no digit-percent or fake
 * chart appears in that state. When data IS present, the real stats render with
 * their data-testid markers.
 *
 * We mock the two loaders at the module boundary (not the DB) — the page calls
 * `loadMarketCalibrationBacktest` and `loadEloVsMarketBacktest` directly, so
 * those are the seam the tests cross.
 */

const { marketLoader, eloLoader } = vi.hoisted(() => ({
  marketLoader: vi.fn(),
  eloLoader: vi.fn(),
}));

vi.mock("@/lib/calibration/market-backtest", () => ({
  loadMarketCalibrationBacktest: marketLoader,
}));
vi.mock("@/lib/calibration/elo-backtest", () => ({
  loadEloVsMarketBacktest: eloLoader,
}));

// Mock heavy UI shells so the test doesn't need the full nav/footer tree.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/ui/risk-disclosure", () => ({
  RiskDisclosure: (): null => null,
}));

import MarketCalibrationPage from "@/app/calibration/market/page";

const DIGIT_PERCENT = /\d+(\.\d+)?%/;

async function renderPage(): Promise<HTMLElement> {
  return render(await MarketCalibrationPage()).container;
}

async function pageText(): Promise<string> {
  return (await renderPage()).textContent ?? "";
}

beforeEach(() => {
  marketLoader.mockReset();
  eloLoader.mockReset();
});

describe("/calibration/market — empty state (no backfill yet)", () => {
  it("renders the honest no-data note for the market baseline", async () => {
    marketLoader.mockResolvedValue({
      status: "no-data",
      generatedAt: "2026-08-16T20:00:00Z",
      sampleSize: 0,
      seasonsCovered: 0,
      seasonRange: null,
      baseRate: 0,
      brier: 0,
      reliability: 0,
      resolution: 0,
      ece: 0,
      curve: [],
      note: "No settled historical games with closing moneylines yet. Run the historical-games backfill, then re-check.",
    });
    eloLoader.mockResolvedValue({
      status: "no-data",
      generatedAt: "2026-08-16T20:00:00Z",
      comparisonSampleSize: 0,
      seasonRange: null,
      elo: { sampleSize: 0, accuracy: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0, curve: [], teamsRated: 0 },
      market: { sampleSize: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0 },
      betterCalibrated: "tie",
      note: "No historical games with closing moneylines yet. Run the historical-games backfill, then re-check.",
    });

    const text = await pageText();

    // The no-data note from the loader is surfaced verbatim.
    expect(text).toContain("No settled historical games with closing moneylines yet");
    expect(text).toContain("Run the historical-games backfill");

    // No fabricated numbers in the empty state — no stat cards, no chart stats.
    expect(text).not.toMatch(DIGIT_PERCENT);
  });

  it("shows the elo-vs-market empty note when market has data but elo does not", async () => {
    // Market has data, Elo does not — both honest states must co-exist.
    marketLoader.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-08-16T20:00:00Z",
      sampleSize: 100,
      seasonsCovered: 5,
      seasonRange: { from: 2020, to: 2024 },
      baseRate: 0.55,
      brier: 0.24,
      reliability: 0.01,
      resolution: 0.22,
      ece: 0.03,
      curve: [],
      note: "Calibration of the de-vigged CLOSING moneyline.",
    });
    eloLoader.mockResolvedValue({
      status: "no-data",
      generatedAt: "2026-08-16T20:00:00Z",
      comparisonSampleSize: 0,
      seasonRange: null,
      elo: { sampleSize: 0, accuracy: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0, curve: [], teamsRated: 0 },
      market: { sampleSize: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0 },
      betterCalibrated: "tie",
      note: "No historical games with closing moneylines yet.",
    });

    const text = await pageText();

    // Market renders its stats...
    expect(text).toContain("n=100");
    expect(text).toContain("Brier score");
    // ...and the elo empty state also shows its own note.
    expect(text).toContain("No historical games with closing moneylines yet");
  });
});

describe("/calibration/market — populated state", () => {
  it("renders real market metrics and the elo comparison verdict", async () => {
    marketLoader.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-08-16T20:00:00Z",
      sampleSize: 5280,
      seasonsCovered: 26,
      seasonRange: { from: 1999, to: 2024 },
      baseRate: 0.571,
      brier: 0.1832,
      reliability: 0.041,
      resolution: 0.237,
      ece: 0.068,
      curve: [
        { binStart: 0, binEnd: 0.1, count: 12, meanForecast: 0.05, observedRate: 0.08 },
        { binStart: 0.9, binEnd: 1.0, count: 89, meanForecast: 0.95, observedRate: 0.92 },
      ],
      note: "Calibration of the de-vigged CLOSING moneyline (the market's forecast) vs actual home wins.",
    });
    eloLoader.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-08-16T20:00:00Z",
      comparisonSampleSize: 5280,
      seasonRange: { from: 1999, to: 2024 },
      elo: { sampleSize: 5280, accuracy: 0.632, brier: 0.1914, reliability: 0.052, resolution: 0.227, ece: 0.063, baseRate: 0.571, curve: [], teamsRated: 68 },
      market: { sampleSize: 5280, brier: 0.1832, reliability: 0.041, resolution: 0.237, ece: 0.068, baseRate: 0.571 },
      betterCalibrated: "market",
      note: "Elo (results-only) vs the de-vigged closing line on the same 5280 games. Lower Brier = better calibrated; market is the efficient baseline.",
    });

    const container = await renderPage();
    const text = container.textContent ?? "";

    // Market metrics render from real data.
    expect(text).toContain("The market baseline");
    expect(text).toContain("n=5,280");
    expect(text).toContain("1999–2024");
    expect(text).toContain("0.1832"); // Brier score
    expect(text).toContain("6.80"); // ECE as percentage (0.068 * 100 = 6.80%)

    // Elo-vs-market comparison renders with the verdict.
    expect(text).toContain("Elo vs. the market");
    expect(text).toContain("Better calibrated");
    expect(text).toContain("MARKET");
    expect(text).toContain("68"); // teams rated

    // The reliability chart component renders (it has a title caption).
    const marketChart = container.querySelector('[aria-label="Market reliability curve"]');
    expect(marketChart).not.toBeNull();
    const eloChart = container.querySelector('[aria-label="Elo reliability curve"]');
    expect(eloChart).not.toBeNull();
  });

  it("falls back to honest empty state when a loader throws", async () => {
    marketLoader.mockRejectedValue(new Error("DB connection refused"));
    eloLoader.mockResolvedValue({
      status: "no-data",
      generatedAt: "2026-08-16T20:00:00Z",
      comparisonSampleSize: 0,
      seasonRange: null,
      elo: { sampleSize: 0, accuracy: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0, curve: [], teamsRated: 0 },
      market: { sampleSize: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0 },
      betterCalibrated: "tie",
      note: "No historical games with closing moneylines yet.",
    });

    const text = await pageText();

    // The page must not crash — it surfaces the honest fallback note.
    expect(text).toContain("could not be reached");
    // And never fabricates stats.
    expect(text).not.toMatch(DIGIT_PERCENT);
  });
});

describe("/calibration/market — honest non-claims", () => {
  it("states the baseline is the market's own calibration, not a platform claim", async () => {
    marketLoader.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-08-16T20:00:00Z",
      sampleSize: 5000,
      seasonsCovered: 26,
      seasonRange: { from: 1999, to: 2024 },
      baseRate: 0.57,
      brier: 0.19,
      reliability: 0.04,
      resolution: 0.23,
      ece: 0.07,
      curve: [],
      note: "Calibration of the de-vigged CLOSING moneyline (the market's forecast) vs actual home wins.",
    });
    eloLoader.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-08-16T20:00:00Z",
      comparisonSampleSize: 5000,
      seasonRange: { from: 1999, to: 2024 },
      elo: { sampleSize: 5000, accuracy: 0.63, brier: 0.20, reliability: 0.05, resolution: 0.22, ece: 0.06, baseRate: 0.57, curve: [], teamsRated: 68 },
      market: { sampleSize: 5000, brier: 0.19, reliability: 0.04, resolution: 0.23, ece: 0.07, baseRate: 0.57 },
      betterCalibrated: "market",
      note: "Elo (results-only) vs the de-vigged closing line.",
    });

    const text = await pageText();

    // The "what this proves" copy must be present.
    expect(text).toContain("What this surface proves");
    expect(text).toContain("denominator every future GSE claim must beat");
    expect(text).toContain("No picks are published here");
    expect(text).toContain("no fabricated stats are ever shown");

    // Back links must exist.
    const container = await renderPage();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/calibration");
    expect(hrefs).toContain("/methodology");
  });
});
