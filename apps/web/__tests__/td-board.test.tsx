import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TdBoard } from "@/components/fantasy/td-board";

describe("TdBoard", () => {
  it("renders the board with a plain-language basis, not the internal formula", () => {
    // Customer copy pass (owner-approved): the weights breakdown and the
    // logistic are no longer rendered. The math in td-model.ts is unchanged.
    render(<TdBoard />);
    expect(screen.getByTestId("td-board")).toBeTruthy();
    expect(screen.queryByTestId("td-board-formula")).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("logistic");
    expect(text).not.toContain("Vegas team total");
  });

  it("labels an unlicensed pool as a practice slate rather than live", () => {
    render(<TdBoard live={false} />);
    expect(screen.getByTestId("td-board-source").textContent).toMatch(/practice slate/i);
  });

  it("states the basis above the numbers", () => {
    render(<TdBoard />);
    expect(screen.getByTestId("td-board-basis").textContent).toContain("Built from usage");
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