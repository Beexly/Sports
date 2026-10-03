import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /tools/odds-converter — pins formula visibility, no banned phrases, and
 * that the client component wires user input through
 * @/lib/tools/betting-math's American/decimal/implied-probability trio.
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));

import OddsConverterPage from "@/app/tools/odds-converter/page";

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

describe("/tools/odds-converter", () => {
  it("shows all three conversion formulas", async () => {
    render(await OddsConverterPage());
    const plaques = screen.getAllByTestId("formula-plaque");
    expect(plaques.length).toBeGreaterThanOrEqual(3);
    const text = plaques.map((p) => p.textContent ?? "").join(" ");
    expect(text).toContain("decimal = 1 + A/100");
    expect(text).toContain("implied probability = 1 / decimal");
  });

  it("never uses trust-gate banned phrases", async () => {
    const { container } = render(await OddsConverterPage());
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(text, `Odds converter page must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("converts -110 American to decimal and implied probability", async () => {
    render(await OddsConverterPage());
    const result = await screen.findByTestId("odds-converter-result");
    expect(result.textContent).toContain("1.9091");
    expect(result.textContent).toContain("52.38%");
  });

  it("converts a decimal input to American and implied probability", async () => {
    render(await OddsConverterPage());
    fireEvent.click(screen.getByRole("radio", { name: "Decimal" }));
    fireEvent.change(screen.getByLabelText("Price, decimal format"), { target: { value: "2.5" } });
    const result = await screen.findByTestId("odds-converter-result");
    expect(result.textContent).toContain("+150");
    expect(result.textContent).toContain("40.00%");
  });

  it("shows an honest placeholder instead of a fabricated conversion on invalid input", async () => {
    render(await OddsConverterPage());
    fireEvent.change(screen.getByLabelText("Price, american format"), { target: { value: "0" } });
    expect(screen.queryByTestId("odds-converter-result")).toBeNull();
    expect(screen.getByText(/Enter a valid price/)).toBeTruthy();
  });
});
