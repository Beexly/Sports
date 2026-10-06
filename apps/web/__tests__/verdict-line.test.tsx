import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictLine } from "@/components/performance/verdict-line";

const WITHHELD =
  "not rendered. Coverage, a lower bound, CLV, and walk-forward lineage are required.";

function expectWithheld(el: HTMLElement) {
  expect(el.textContent).toContain("No verdict");
  expect(el.textContent).toContain(WITHHELD);
  expect(el.textContent).not.toMatch(/\d+\.\d%/);
  expect(el.textContent).not.toContain("lies entirely");
  expect(el.textContent).not.toContain("Conclusive");
  expect(el.textContent).not.toContain("Inconclusive");
}

describe("VerdictLine — the interval gets a vote on the public report", () => {
  it("withholds a verdict entirely below the sample floor", () => {
    render(<VerdictLine wins={7} losses={3} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expect(el.textContent).toContain("No verdict");
    expect(el.textContent).toContain("minimum 30");
    // Never a fabricated rate on a thin sample.
    expect(el.textContent).not.toMatch(/\d+\.\d%/);
  });

  it("withholds a straddling band until coverage, a bound, CLV, and lineage exist", () => {
    render(<VerdictLine wins={18} losses={12} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expectWithheld(el);
  });

  it("withholds a decisive record until coverage, a bound, CLV, and lineage exist", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expectWithheld(el);
  });

  it("withholds a losing record until coverage, a bound, CLV, and lineage exist", () => {
    render(<VerdictLine wins={100} losses={400} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expectWithheld(el);
  });

  it("honours the page's own floor as the single source of truth", () => {
    render(<VerdictLine wins={18} losses={12} minSample={50} />);
    expect(screen.getByTestId("verdict-line").textContent).toContain("No verdict");
  });

  it("does not print a custom threshold when the rate is withheld", () => {
    // 400/500 has a band of roughly [76%, 83%], so an 80% line sits inside it.
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.8} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expectWithheld(el);
  });

  it("keeps the interval on the attribute when the threshold sits outside the band", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.9} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expectWithheld(el);
  });
});
