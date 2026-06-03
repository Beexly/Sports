import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { TrendCard } from "@/components/trends/trend-card";
import type { FormRecord, GameTrend } from "@/lib/trends/load-trends";

/**
 * Trends page — source wiring + card render behavior.
 *
 * The discipline under test: a trend only renders when enough settled games
 * back it; otherwise the card shows an honest "not enough history" state
 * instead of an invented streak.
 */

const repoRoot = resolve(__dirname, "..");
function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

const form: FormRecord = {
  wins: 9,
  losses: 5,
  pushes: 1,
  sampleSize: 15,
  coverPct: 64,
};

function makeGame(overrides: Partial<GameTrend> = {}): GameTrend {
  return {
    gameId: "g1",
    sport: "NBA",
    matchup: "Celtics @ Lakers",
    commenceTime: new Date("2026-06-10T23:00:00Z").toISOString(),
    home: { team: "Lakers", form, venueForm: form, restDays: 2, backToBack: false },
    away: { team: "Celtics", form, venueForm: null, restDays: 1, backToBack: true },
    headToHead: { wins: 6, losses: 4, pushes: 0, sampleSize: 10, coverPct: 60 },
    lineMovementSpread: -1.5,
    hasSignal: true,
    ...overrides,
  };
}

describe("Trends page wiring (source-level)", () => {
  const page = read("app/trends/page.tsx");

  it("is dynamic and renders the trend board from the loader", () => {
    expect(page).toMatch(/export const dynamic = "force-dynamic"/);
    expect(page).toMatch(/loadTrendBoard/);
    expect(page).toMatch(/<TrendCard/);
  });

  it("is discoverable from the nav and sitemap", () => {
    expect(read("components/ui/nav.tsx")).toMatch(/href: "\/trends"/);
    expect(read("app/sitemap.ts")).toMatch(/path: "\/trends"/);
  });
});

describe("TrendCard (render-level)", () => {
  it("renders ATS form, cover rate, head-to-head and line movement", () => {
    render(<TrendCard game={makeGame()} />);
    expect(screen.getByText("Celtics @ Lakers")).toBeInTheDocument();
    expect(screen.getAllByText(/64% cover/).length).toBeGreaterThan(0);
    expect(screen.getByText(/H2H: Lakers 6–4 ATS/)).toBeInTheDocument();
    expect(screen.getByText(/Line move: -1\.5/)).toBeInTheDocument();
    expect(screen.getByText(/Back-to-back/)).toBeInTheDocument();
  });

  it("shows an honest empty state for an under-sampled trend", () => {
    render(<TrendCard game={makeGame({ away: { team: "Celtics", form: null, venueForm: null, restDays: null, backToBack: false } })} />);
    // The away column's null form renders the thin-sample message.
    expect(
      screen.getAllByText(/Not enough settled games yet/).length,
    ).toBeGreaterThan(0);
  });

  it("renders the no-signal card when no trend is trustworthy", () => {
    render(<TrendCard game={makeGame({ hasSignal: false })} />);
    expect(screen.getByTestId("trend-card-empty")).toBeInTheDocument();
  });
});
