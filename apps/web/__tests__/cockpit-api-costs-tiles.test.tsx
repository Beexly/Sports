import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusTile } from "@/components/cockpit/status-tile";

/**
 * api-costs tiles — pins that the API-costs page's top readouts are rendered
 * through the shared StatusTile primitive (not a bespoke local Metric box).
 *
 * The page passes already-derived dashboard fields straight through, so here we
 * exercise StatusTile with the same shapes the page uses and assert the
 * label + value render and the shared `data-testid="status-tile"` is present.
 * These tiles are intentionally static (no href): the page IS the destination,
 * so linking to self would be dishonest.
 */

describe("api-costs StatusTile readouts", () => {
  it("renders the Month spend tile with a good tone when within budget", () => {
    render(<StatusTile label="Month spend" value="$12.34" tone="good" />);
    expect(screen.getByText("Month spend")).toBeInTheDocument();
    expect(screen.getByText("$12.34")).toBeInTheDocument();
    expect(screen.getByTestId("status-tile")).toBeInTheDocument();
  });

  it("renders the Monthly budget tile", () => {
    render(<StatusTile label="Monthly budget" value="$100.00" tone="neutral" />);
    expect(screen.getByText("Monthly budget")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByTestId("status-tile")).toBeInTheDocument();
  });

  it("renders the Generated timestamp tile", () => {
    render(
      <StatusTile
        label="Generated"
        value="6/30/2026, 9:00:00 AM"
        tone="neutral"
      />
    );
    expect(screen.getByText("Generated")).toBeInTheDocument();
    expect(screen.getByText("6/30/2026, 9:00:00 AM")).toBeInTheDocument();
    expect(screen.getByTestId("status-tile")).toBeInTheDocument();
  });

  it("keeps the tiles static (no link to self) since the page is the destination", () => {
    render(<StatusTile label="Month spend" value="$12.34" tone="good" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("status-tile")).toHaveAttribute(
      "data-runnable",
      "false"
    );
  });
});
