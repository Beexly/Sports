import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AgentStatusRail,
  type AgentHealthSummary,
} from "@/components/cockpit/agent-status-rail";

/**
 * AgentStatusRail — honest agent-capacity read via the shared StatusTile.
 *
 * Pins the integrity rules:
 *   1. The real counts render.
 *   2. 'Not wired' is tone `warn` — NEVER good (designed, not capacity).
 *   3. Operational reads `good` ONLY when there's real/partial capacity; a 0
 *      stays neutral (no fake-green).
 *   4. Every tile links to /cockpit/agents so the rail is runnable.
 */

const STUB: AgentHealthSummary = {
  operationalCapacity: 2,
  draftOnly: 3,
  manual: 1,
  notWired: 4,
  externalActionsAllowed: 0,
  total: 10,
};

describe("AgentStatusRail", () => {
  it("renders the honest counts", () => {
    render(<AgentStatusRail summary={STUB} />);
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Draft only")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Not wired")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("links every tile to /cockpit/agents", () => {
    render(<AgentStatusRail summary={STUB} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/cockpit/agents");
    }
  });

  it("renders 'Not wired' with a warn tone, never good", () => {
    render(<AgentStatusRail summary={STUB} />);
    // Locate the Not-wired tile via its label, then walk to the tile root.
    const notWiredLabel = screen.getByText("Not wired");
    const tile = notWiredLabel.closest("[data-testid='status-tile']");
    expect(tile).not.toBeNull();
    // warn tone carries the yellow tint classes; it must NOT carry the
    // good (accent/emerald) tint.
    expect(tile?.className).toContain("yellow");
    expect(tile?.className).not.toContain("accent-400");
  });

  it("does not render fake-green Operational when capacity is 0", () => {
    const zero: AgentHealthSummary = { ...STUB, operationalCapacity: 0 };
    render(<AgentStatusRail summary={zero} />);
    const opLabel = screen.getByText("Operational");
    const tile = opLabel.closest("[data-testid='status-tile']");
    expect(tile).not.toBeNull();
    // neutral tone (titanium), NOT the good (accent) tint.
    expect(tile?.className).not.toContain("accent-400");
  });

  it("reads Operational as good when there is real/partial capacity", () => {
    render(<AgentStatusRail summary={STUB} />);
    const opLabel = screen.getByText("Operational");
    const tile = opLabel.closest("[data-testid='status-tile']");
    expect(tile?.className).toContain("accent-400");
  });
});
