import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RoutingLegibility,
  type RoutingRow,
} from "@/app/cockpit/api-costs/routing-legibility";

/**
 * Routing-legibility card — pins that the cockpit API-costs page renders the
 * ACTIVE model routing table (mirror of model-router SURFACE_TIER) with real
 * values only, an honest "not recorded" cache note, and an honest empty state.
 * The page passes already-derived rows; here we exercise the card with the
 * same shapes and assert the rendered strings — no invented numbers.
 */

const FIXTURE_ROWS: readonly RoutingRow[] = [
  {
    surface: "studio",
    activeTier: "sonnet",
    recommendedTier: "sonnet",
    activeModelId: "claude-sonnet-4-6",
    recommendedModelId: "claude-sonnet-4-6",
    activeBlendedUsdPerM: 6,
    recommendedBlendedUsdPerM: 6,
    savingsFraction: 0,
    freeLaneEligible: false,
  },
  {
    surface: "calibration-insight",
    activeTier: "haiku",
    recommendedTier: "haiku",
    activeModelId: "claude-haiku-4-5-20251001",
    recommendedModelId: "claude-haiku-4-5-20251001",
    activeBlendedUsdPerM: 2,
    recommendedBlendedUsdPerM: 2,
    savingsFraction: 0,
    freeLaneEligible: true,
  },
  {
    surface: "model-court",
    activeTier: "sonnet",
    recommendedTier: "opus",
    activeModelId: "claude-sonnet-4-6",
    recommendedModelId: "claude-opus-4-8",
    activeBlendedUsdPerM: 6,
    recommendedBlendedUsdPerM: 12,
    savingsFraction: -1,
    freeLaneEligible: false,
  },
];

describe("RoutingLegibility", () => {
  it("renders every surface with its active lane and model id", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(screen.getByText("studio")).toBeInTheDocument();
    expect(screen.getByText("calibration-insight")).toBeInTheDocument();
    expect(screen.getByText("model-court")).toBeInTheDocument();
    expect(screen.getAllByText("sonnet").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("claude-haiku-4-5-20251001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("claude-opus-4-8").length).toBeGreaterThanOrEqual(1);
  });

  it("formats blended $/Mtok from the passed values", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(screen.getAllByText("$6.00/Mtok").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$2.00/Mtok").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$12.00/Mtok").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the honest cache note instead of an invented cache number", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(
      screen.getByText(/Cache-hit rate: not recorded/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+% cache/)).toBeNull();
  });

  it("marks free-lane-eligible surfaces and leaves others blank", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(screen.getByText("free-lane")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the upgrade cost for a recommended tier that costs more", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(screen.getByText("-100%")).toBeInTheDocument();
  });

  it("renders an honest empty state when no surfaces are configured", () => {
    render(<RoutingLegibility rows={[]} />);
    expect(
      screen.getByText(/No routing surfaces configured/i)
    ).toBeInTheDocument();
  });

  it("is read-only — no links or buttons", () => {
    render(<RoutingLegibility rows={FIXTURE_ROWS} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
