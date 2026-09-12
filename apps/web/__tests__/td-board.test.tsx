import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TdBoard } from "@/components/fantasy/td-board";

describe("TdBoard", () => {
  it("renders the board with the published formula in the open", () => {
    render(<TdBoard />);
    expect(screen.getByTestId("td-board")).toBeTruthy();
    const formula = screen.getByTestId("td-board-formula");
    expect(formula.textContent).toContain("Season TD rate");
    expect(formula.textContent).toContain("Red-zone volume");
    expect(formula.textContent).toContain("Goal-line volume");
    expect(formula.textContent).toContain("Vegas team total");
    expect(formula.textContent).toContain("40%");
    expect(formula.textContent).toContain("20%");
  });

  it("labels an unlicensed pool as fictional rather than live", () => {
    render(<TdBoard live={false} />);
    expect(screen.getByTestId("td-board-source").textContent).toContain("fictional");
  });

  it("states the proxy basis above the numbers", () => {
    render(<TdBoard />);
    expect(screen.getByTestId("td-board-basis").textContent).toContain("not from a measured");
  });

  it("renders headline cards and ranked rows for the pool", () => {
    render(<TdBoard />);
    const headline = screen.getByTestId("td-board-headline");
    expect(headline.querySelectorAll("article").length).toBe(3);
    expect(screen.getAllByTestId("td-board-row").length).toBeGreaterThan(3);
  });

  it("shows an em-dash edge and a missing-input chip instead of inventing a price", () => {
    render(<TdBoard />);
    const edges = screen.getAllByTestId("td-board-edge");
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) expect(e.textContent).toBe("—");
    // teamTotal is absent on the proxy pool → every row carries the chip.
    expect(screen.getAllByTestId("td-board-missing").length).toBe(edges.length);
  });

  it("never renders a probability at 0% or 100%", () => {
    render(<TdBoard />);
    for (const row of screen.getAllByTestId("td-board-row")) {
      const text = row.textContent ?? "";
      expect(text).not.toContain("0.0%");
      expect(text).not.toContain("100.0%");
    }
  });
});