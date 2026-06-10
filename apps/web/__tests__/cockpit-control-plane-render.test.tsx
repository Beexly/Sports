import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CockpitSources from "@/app/cockpit/sources/page";

describe("/cockpit/sources control-plane render", () => {
  it("renders the source health, domain coverage, fallback chain, and debug trace views", () => {
    render(<CockpitSources />);

    expect(screen.getByRole("heading", { name: "Source Control Plane" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Source Health" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain Coverage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fallback Chain" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Debug Trace" })).toBeInTheDocument();
    expect(screen.getByText("Source Health Monitor")).toBeInTheDocument();
    expect(screen.getAllByText("Weather API primary").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("trace-debug-collector-fixture")).toBeInTheDocument();
    expect(screen.getAllByText("OFFICIALS").length).toBeGreaterThanOrEqual(1);
  });
});
