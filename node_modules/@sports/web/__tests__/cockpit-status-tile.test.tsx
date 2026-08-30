import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusTile } from "@/components/cockpit/status-tile";

/**
 * StatusTile — the reusable runnable/linkable cockpit primitive.
 *
 * Pins the two affordances that make it useful as a building block:
 *   1. It always shows its label + value.
 *   2. With an `href` it renders as a runnable link; without one it is a
 *      static readout (no link). The optional caption renders when given.
 */

describe("StatusTile", () => {
  it("renders the label and value", () => {
    render(<StatusTile label="Feed mode" value="LIVE" />);
    expect(screen.getByText("Feed mode")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("renders as a runnable link when href is set", () => {
    render(<StatusTile label="Picks today" value="7" href="/cockpit/history" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/cockpit/history");
    expect(link).toHaveAttribute("data-runnable", "true");
    expect(link.textContent).toContain("Picks today");
    expect(link.textContent).toContain("7");
  });

  it("renders a static tile (no link) when href is not set", () => {
    render(<StatusTile label="Sample" value="42" />);
    expect(screen.queryByRole("link")).toBeNull();
    const tile = screen.getByTestId("status-tile");
    expect(tile).toHaveAttribute("data-runnable", "false");
  });

  it("renders the optional caption when provided", () => {
    render(
      <StatusTile
        label="Posture"
        value="GREEN"
        caption="No borrowed certainty."
      />
    );
    expect(screen.getByText("No borrowed certainty.")).toBeInTheDocument();
  });

  it("treats an empty href as static, not runnable", () => {
    render(<StatusTile label="Edge" value="held" href="" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("status-tile")).toHaveAttribute(
      "data-runnable",
      "false"
    );
  });
});
