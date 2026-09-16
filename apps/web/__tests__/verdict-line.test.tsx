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
    expect(el.textContent).not.toMatch(/\d+\.\d%/);
  });

  it("withholds the verdict WORD on a straddling band but still prints the interval (D22)", () => {
    render(<VerdictLine wins={18} losses={12} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expect(el.textContent).not.toMatch(/^\s*Conclusive/i);
    expect(el.textContent).not.toMatch(/^\s*Inconclusive/i);
    expect(el.textContent).toContain("contains the");
    expect(el.textContent).toContain("n=30");
  });

  it("labels a decisive record conclusive only when the lower bound clears the threshold", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expect(el.textContent).toContain("Conclusive");
    expect(el.textContent).toContain("lies entirely above");
  });

  it("does NOT print a verdict word for a decisively losing record (D22)", () => {
    render(<VerdictLine wins={100} losses={400} minSample={30} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expect(el.textContent).not.toMatch(/^\s*Conclusive/i);
    expect(el.textContent).toContain("lies entirely below");
  });

  it("honours the page's own floor as the single source of truth", () => {
    render(<VerdictLine wins={18} losses={12} minSample={50} />);
    expect(screen.getByTestId("verdict-line").textContent).toContain("No verdict");
  });

  it("accepts a custom threshold", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.8} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("inconclusive");
    expect(el.dataset.threshold).toBe("0.8");
    expect(el.textContent).toContain("80.0%");
  });

  it("withholds the word when the band sits entirely below a high threshold", () => {
    render(<VerdictLine wins={400} losses={100} minSample={30} threshold={0.9} />);
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.verdict).toBe("conclusive");
    expect(el.textContent).not.toMatch(/^\s*Conclusive/i);
    expect(el.textContent).toContain("lies entirely below");
  });

  it("passes the 52.4% bar: a 48.95% book-priced record does not get a Conclusive badge", () => {
    render(
      <VerdictLine wins={745} losses={777} minSample={100} threshold={0.524} />,
    );
    const el = screen.getByTestId("verdict-line");
    expect(el.dataset.threshold).toBe("0.524");
    expect(el.textContent).not.toMatch(/^\s*Conclusive/i);
    expect(el.textContent).toContain("52.4%");
  });
});