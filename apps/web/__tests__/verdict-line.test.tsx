import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictLine } from "@/components/performance/verdict-line";

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

  it("labels a straddling band inconclusive and prints the band", () => {
    render(<VerdictLine wins={18} losses={12} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expect(el.textContent).toContain("Inconclusive");
    expect(el.textContent).toContain("contains the");
    expect(el.textContent).toContain("n=30");
  });

  it("labels a decisive record conclusive", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expect(el.textContent).toContain("Conclusive");
    expect(el.textContent).toContain("lies entirely above");
  });

  it("calls a decisively losing record conclusive below the line, not hopeful", () => {
    render(<VerdictLine wins={100} losses={400} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expect(el.textContent).toContain("lies entirely below");
  });

  it("honours the page's own floor as the single source of truth", () => {
    render(<VerdictLine wins={18} losses={12} minSample={50} />);
    expect(screen.getByTestId("verdict-line").textContent).toContain("No verdict");
  });

  it("accepts a custom threshold", () => {
    // 400/500 has a band of roughly [76%, 83%], so an 80% line sits inside it.
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.8} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expect(el.textContent).toContain("80.0%");
  });

  it("calls the same record conclusive when the threshold sits outside the band", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.9} />);
    expect(screen.getByTestId("verdict-line").dataset.verdict).toBe("conclusive");
  });
});