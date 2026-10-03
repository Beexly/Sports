import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /tools/no-vig-calculator — pins formula visibility, no banned phrases,
 * the proportional-method honesty note, and that the client component
 * wires user input through @/lib/tools/betting-math's noVigFairProbabilities
 * (the same convention as packages/prediction-engine/.../devig.ts).
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));

import NoVigCalculatorPage from "@/app/tools/no-vig-calculator/page";

const TRUST_GATE_BANNED_PHRASES = [
  "guaranteed",
  "sure thing",
  "risk-free",
  "risk free",
  "riskless",
  "easy money",
  "free money",
  "can't lose",
  "cant lose",
  "verified track record",
  "guaranteed profit",
  "guaranteed roi",
  "guaranteed winner",
  "lock of the day",
  "automatic winner",
  "beat the book",
  "insider information",
  "profitable system",
  "no risk",
  "100% chance",
];

describe("/tools/no-vig-calculator", () => {
  it("shows the proportional de-vig formula", async () => {
    render(await NoVigCalculatorPage());
    const plaques = screen.getAllByTestId("formula-plaque");
    expect(plaques.length).toBeGreaterThan(0);
    expect(plaques.some((p) => (p.textContent ?? "").includes("fair_i"))).toBe(true);
  });

  it("never uses trust-gate banned phrases", async () => {
    const { container } = render(await NoVigCalculatorPage());
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(text, `No-vig calculator page must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("mentions the proportional method and that Shin's model is a different convention", async () => {
    const { container } = render(await NoVigCalculatorPage());
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).toContain("proportional");
    expect(text).toContain("shin");
  });

  it("splits a balanced two-way market 50/50 by default (-110/-110)", async () => {
    render(await NoVigCalculatorPage());
    const result = await screen.findByTestId("no-vig-result");
    expect(result.textContent).toContain("50.00%");
  });

  it("shows an honest placeholder instead of a fabricated split on invalid input", async () => {
    render(await NoVigCalculatorPage());
    fireEvent.change(screen.getByLabelText("Outcome 1 price"), { target: { value: "-50" } });
    expect(screen.queryByTestId("no-vig-result")).toBeNull();
    expect(screen.getByText(/Enter a valid price for every outcome/)).toBeTruthy();
  });

  it("supports adding a third outcome for n-way markets", async () => {
    render(await NoVigCalculatorPage());
    fireEvent.click(screen.getByText(/Add another outcome/));
    expect(screen.getByLabelText("Outcome 3 price")).toBeTruthy();
  });
});
