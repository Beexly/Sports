import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CockpitSources from "@/app/cockpit/sources/page";

describe("/cockpit/sources control-plane render", () => {
  it("renders the autonomous system, domain coverage, and fallback sections", () => {
    render(<CockpitSources />);

    expect(screen.getByRole("heading", { name: "Source Control Plane" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Autonomous systems" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain coverage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fallback chains" })).toBeInTheDocument();
    expect(screen.getByText("Source Health Monitor")).toBeInTheDocument();
    expect(screen.getAllByText("OFFICIALS").length).toBeGreaterThanOrEqual(1);
  });
});
