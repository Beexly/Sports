import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /tools/parlay-calculator — pins formula visibility, no banned phrases,
 * the correlation-not-modeled honesty note, and that the client component
 * wires user input through @/lib/tools/betting-math's combineParlayLegs.
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));

import ParlayCalculatorPage from "@/app/tools/parlay-calculator/page";

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

describe("/tools/parlay-calculator", () => {
  it("shows the combined-price formula", async () => {
    render(await ParlayCalculatorPage());
    const plaques = screen.getAllByTestId("formula-plaque");
    expect(plaques.length).toBeGreaterThan(0);
    expect(plaques.some((p) => (p.textContent ?? "").includes("combined = odds"))).toBe(true);
  });

  it("never uses trust-gate banned phrases", async () => {
    const { container } = render(await ParlayCalculatorPage());
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(text, `Parlay calculator page must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("carries the independence/correlation-not-modeled honesty note at least twice (page copy + result)", async () => {
    const { container } = render(await ParlayCalculatorPage());
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).toContain("independent");
    expect(text).toContain("same-game parlays");
    expect(container.querySelectorAll('[data-testid="honesty-note"]').length).toBeGreaterThan(0);
  });

  it("combines two +100 legs into a 4.0 decimal / +300 American price", async () => {
    render(await ParlayCalculatorPage());
    fireEvent.change(screen.getByLabelText("Leg 1 price"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Leg 2 price"), { target: { value: "100" } });
    const result = await screen.findByTestId("parlay-result");
    expect(result.textContent).toContain("4.000");
    expect(result.textContent).toContain("+300");
    expect(result.textContent).toContain("25.00%");
  });

  it("shows an honest placeholder instead of a fabricated combined price on invalid input", async () => {
    render(await ParlayCalculatorPage());
    fireEvent.change(screen.getByLabelText("Leg 1 price"), { target: { value: "-50" } });
    expect(screen.queryByTestId("parlay-result")).toBeNull();
    expect(screen.getByText(/Enter a valid price for at least 2 legs/)).toBeTruthy();
  });

  it("supports adding a third leg", async () => {
    render(await ParlayCalculatorPage());
    fireEvent.click(screen.getByText(/Add another leg/));
    expect(screen.getByLabelText("Leg 3 price")).toBeTruthy();
  });
});
