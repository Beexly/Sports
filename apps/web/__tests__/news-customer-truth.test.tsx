import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TheBeat } from "@/components/news/the-beat";

/**
 * L2 — news customer-truth contract.
 * A failed fetch is "unavailable", never the fictional sample; an empty live
 * wire is "no reports", never an error; tier weights are heuristics, never
 * measured reliability percentages.
 */
describe("TheBeat customer truth", () => {
  it("shows unavailable — not the sample — when the feed fails", () => {
    render(<TheBeat liveWire={null} unavailable />);
    expect(screen.getByText(/feed unavailable/i)).toBeTruthy();
    expect(screen.queryByText(/sample feed/i)).toBeNull();
  });

  it("shows an empty honest state for a fresh empty live wire", () => {
    render(<TheBeat liveWire={[]} />);
    expect(screen.getByText(/no fresh reports/i)).toBeTruthy();
    expect(screen.queryByText(/sample feed/i)).toBeNull();
  });

  it("never renders tier weights as measured reliability percentages", () => {
    const { container } = render(<TheBeat liveWire={[]} />);
    expect(container.innerHTML).not.toMatch(/reliability \d+%/i);
  });
});
