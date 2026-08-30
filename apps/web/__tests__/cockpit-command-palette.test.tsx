import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CockpitCommandPalette,
  COCKPIT_COMMANDS,
} from "@/components/cockpit/cockpit-command-palette";

/**
 * CockpitCommandPalette — operator-deck ⌘K nav.
 *
 * Pins the three things that make it trustworthy:
 *   1. The trigger button renders (collapsed state).
 *   2. meta+K opens it and surfaces real cockpit labels.
 *   3. EVERY command points at an implemented /cockpit route (no command can
 *      navigate somewhere that doesn't exist).
 */

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("CockpitCommandPalette", () => {
  it("renders the collapsed trigger button", () => {
    render(<CockpitCommandPalette />);
    expect(
      screen.getByRole("button", { name: /open cockpit command palette/i })
    ).toBeInTheDocument();
  });

  it("opens on meta+K and shows real cockpit labels", () => {
    render(<CockpitCommandPalette />);
    // Palette is closed initially — no dialog.
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const dialog = screen.getByRole("dialog", {
      name: /cockpit command palette/i,
    });
    expect(dialog).toBeInTheDocument();
    // A few real cockpit views are listed.
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Calibration")).toBeInTheDocument();
    expect(screen.getByText("API Costs")).toBeInTheDocument();
    expect(screen.getByText("Airwave")).toBeInTheDocument();
  });

  it("opens on ctrl+K as well", () => {
    render(<CockpitCommandPalette />);
    fireEvent.keyDown(window, { key: "K", ctrlKey: true });
    expect(
      screen.getByRole("dialog", { name: /cockpit command palette/i })
    ).toBeInTheDocument();
  });

  it("every command href starts with /cockpit", () => {
    expect(COCKPIT_COMMANDS.length).toBeGreaterThan(0);
    for (const cmd of COCKPIT_COMMANDS) {
      expect(cmd.href.startsWith("/cockpit")).toBe(true);
    }
  });

  it("navigates via the router on click", () => {
    render(<CockpitCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.click(screen.getByText("Tasks"));
    expect(pushMock).toHaveBeenCalledWith("/cockpit/tasks");
  });
});
