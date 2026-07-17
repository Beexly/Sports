import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /tools/ev-calculator — pins formula visibility, no banned phrases, and
 * that the client component actually wires user input through
 * @/lib/tools/betting-math (not a hardcoded example).
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));

import EvCalculatorPage from "@/app/tools/ev-calculator/page";

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

describe("/tools/ev-calculator", () => {
  it("shows at least one formula plaque with the EV formula", async () => {
    render(await EvCalculatorPage());
    const plaques = screen.getAllByTestId("formula-plaque");
    expect(plaques.length).toBeGreaterThan(0);
    expect(plaques.some((p) => (p.textContent ?? "").includes("EV = p"))).toBe(true);
  });

  it("never uses trust-gate banned phrases", async () => {
    const { container } = render(await EvCalculatorPage());
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(text, `EV calculator page must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("computes a positive EV for a favorable probability/price pair", async () => {
    render(await EvCalculatorPage());
    fireEvent.change(screen.getByLabelText("Your win probability, in percent"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Price offered, american format"), { target: { value: "100" } });
    // p=0.6, decimal=2.0 -> EV = 0.6*2 - 1 = 0.2 -> "+$0.200"
    expect(await screen.findByTestId("ev-result")).toHaveTextContent("+$0.200");
  });

  it("computes zero EV exactly at the price's own implied probability", async () => {
    render(await EvCalculatorPage());
    fireEvent.change(screen.getByLabelText("Your win probability, in percent"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Price offered, american format"), { target: { value: "100" } });
    expect(await screen.findByTestId("ev-result")).toHaveTextContent("$0.000");
  });

  it("shows an honest placeholder instead of a fabricated number on invalid input", async () => {
    render(await EvCalculatorPage());
    fireEvent.change(screen.getByLabelText("Price offered, american format"), { target: { value: "-50" } });
    expect(screen.queryByTestId("ev-result")).toBeNull();
    expect(screen.getByText(/Enter a win probability/)).toBeTruthy();
  });
});
