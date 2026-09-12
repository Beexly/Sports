import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShowdownLab } from "@/components/fantasy/showdown-lab";

describe("ShowdownLab — the format is on the surface", () => {
  it("renders the room", () => {
    render(<ShowdownLab />);
    expect(screen.getByTestId("showdown-lab")).toBeInTheDocument();
  });

  it("states the captain multiplier as applying to points and salary", () => {
    render(<ShowdownLab />);
    expect(screen.getByText(/1\.5× points & salary/)).toBeInTheDocument();
  });

  it("states the roster shape and the cap", () => {
    render(<ShowdownLab />);
    expect(screen.getByText(/1 CPT \+ 5 FLEX/)).toBeInTheDocument();
    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("requires both teams on the surface", () => {
    render(<ShowdownLab />);
    expect(screen.getByText("Both required")).toBeInTheDocument();
  });
});

describe("ShowdownLab — lineups", () => {
  it("renders at least one legal lineup", () => {
    render(<ShowdownLab />);
    expect(screen.getAllByTestId("showdown-lineup").length).toBeGreaterThan(0);
  });

  it("marks the captain explicitly", () => {
    render(<ShowdownLab />);
    expect(screen.getAllByText("CPT").length).toBeGreaterThan(0);
  });

  it("shows the multiplied captain salary so the cap can be checked", () => {
    render(<ShowdownLab />);
    expect(screen.getAllByText(/×1\.5 applied/).length).toBeGreaterThan(0);
  });
});

describe("ShowdownLab — honesty surfaces", () => {
  it("labels the slate as fictional", () => {
    render(<ShowdownLab />);
    expect(screen.getByTestId("showdown-source")).toHaveTextContent("fictional");
  });

  it("reports how many combinations were searched", () => {
    render(<ShowdownLab />);
    expect(screen.getByText(/roster combinations evaluated/)).toBeInTheDocument();
  });

  it("says the solve is exact over the pool when nothing was dropped", () => {
    render(<ShowdownLab />);
    expect(screen.getByText(/exact over it/)).toBeInTheDocument();
  });

  it("labels the alternates as re-solves, not a proven top-k", () => {
    render(<ShowdownLab />);
    expect(screen.getByText(/Not a proven top-k/)).toBeInTheDocument();
  });

  it("promises no outcome anywhere in the room", () => {
    const { container } = render(<ShowdownLab />);
    const text = container.textContent ?? "";
    for (const forbidden of ["guaranteed", "lock", "sure thing", "can't lose", "100%"]) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});