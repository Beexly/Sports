import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * /cockpit/sources — R-13 Odds API quota burn-down tile.
 *
 * Pinned contracts:
 *   - the loader's pure shaping (buildOddsQuotaView / quotaWarnThreshold):
 *     env-tunable threshold with a default of 50, low-quota flag only when
 *     remaining is known and below threshold, and an honest empty view when
 *     no run carried quota headers (stub mode / pre-migration rows);
 *   - the tile renders the LOW QUOTA warning below threshold;
 *   - the tile renders the honest "no quota data yet" empty state.
 *
 * The page is rendered with the loader mocked at the module seam (actual
 * pure helpers kept real via importOriginal) so the DB boundary stays out
 * of the render test.
 */

const quotaMocks = vi.hoisted(() => ({
  loadOddsQuotaView: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("@/lib/cockpit/odds-quota", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cockpit/odds-quota")>();
  return { ...actual, loadOddsQuotaView: quotaMocks.loadOddsQuotaView };
});

import CockpitSources from "@/app/cockpit/sources/page";
import {
  DEFAULT_QUOTA_WARN_THRESHOLD,
  buildOddsQuotaView,
  quotaWarnThreshold,
} from "@/lib/cockpit/odds-quota";

function makeRun(overrides: Partial<{
  sport: string | null;
  startedAt: Date;
  remainingRequests: number | null;
  usedRequests: number | null;
}> = {}) {
  return {
    sport: "basketball_nba",
    startedAt: new Date("2026-06-10T12:00:00.000Z"),
    remainingRequests: 412,
    usedRequests: 88,
    ...overrides,
  };
}

describe("quotaWarnThreshold", () => {
  it("defaults to 50 when unset, blank, unparseable, or negative", () => {
    expect(DEFAULT_QUOTA_WARN_THRESHOLD).toBe(50);
    expect(quotaWarnThreshold(undefined)).toBe(50);
    expect(quotaWarnThreshold("")).toBe(50);
    expect(quotaWarnThreshold("not-a-number")).toBe(50);
    expect(quotaWarnThreshold("-5")).toBe(50);
  });

  it("honors a tuned env value", () => {
    expect(quotaWarnThreshold("200")).toBe(200);
    expect(quotaWarnThreshold("0")).toBe(0);
  });
});

describe("buildOddsQuotaView", () => {
  it("flags low quota only when remaining is below the threshold", () => {
    expect(buildOddsQuotaView(makeRun({ remainingRequests: 30 }), 50).isLow).toBe(true);
    expect(buildOddsQuotaView(makeRun({ remainingRequests: 50 }), 50).isLow).toBe(false);
    expect(buildOddsQuotaView(makeRun({ remainingRequests: 412 }), 50).isLow).toBe(false);
  });

  it("returns the honest empty view when no run carried quota headers", () => {
    expect(buildOddsQuotaView(null, 50)).toMatchObject({
      hasData: false,
      remainingRequests: null,
      usedRequests: null,
      isLow: false,
    });
    // A row predating the quota columns (both NULL) is also "no data".
    expect(
      buildOddsQuotaView(makeRun({ remainingRequests: null, usedRequests: null }), 50).hasData
    ).toBe(false);
  });

  it("carries the run provenance (sport + recordedAt) onto the view", () => {
    const view = buildOddsQuotaView(makeRun(), 50);
    expect(view).toMatchObject({
      hasData: true,
      remainingRequests: 412,
      usedRequests: 88,
      sport: "basketball_nba",
      recordedAt: "2026-06-10T12:00:00.000Z",
      warnThreshold: 50,
    });
  });
});

describe("/cockpit/sources quota tile render", () => {
  beforeEach(() => {
    quotaMocks.loadOddsQuotaView.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the LOW QUOTA warning when remaining is below the threshold", async () => {
    quotaMocks.loadOddsQuotaView.mockResolvedValue(
      buildOddsQuotaView(makeRun({ remainingRequests: 12, usedRequests: 488 }), 50)
    );

    render(await CockpitSources());

    expect(screen.getByRole("heading", { name: "Odds API Quota" })).toBeInTheDocument();
    expect(screen.getByText("LOW QUOTA")).toBeInTheDocument();
    expect(screen.getByText("Requests remaining")).toBeInTheDocument();
    expect(
      screen.getByText(/Remaining requests are below the warning threshold \(50\)/)
    ).toBeInTheDocument();
  });

  it("renders QUOTA OK (no warning) when remaining is at or above the threshold", async () => {
    quotaMocks.loadOddsQuotaView.mockResolvedValue(buildOddsQuotaView(makeRun(), 50));

    render(await CockpitSources());

    expect(screen.getByText("QUOTA OK")).toBeInTheDocument();
    expect(screen.queryByText(/Remaining requests are below the warning threshold/)).toBeNull();
  });

  it("renders the honest empty state when no quota data exists yet", async () => {
    quotaMocks.loadOddsQuotaView.mockResolvedValue(buildOddsQuotaView(null, 50));

    render(await CockpitSources());

    expect(screen.getByRole("heading", { name: "Odds API Quota" })).toBeInTheDocument();
    expect(screen.getByText(/No quota data yet/)).toBeInTheDocument();
    expect(screen.queryByText("LOW QUOTA")).toBeNull();
    expect(screen.queryByText("QUOTA OK")).toBeNull();
  });
});
