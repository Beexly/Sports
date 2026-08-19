import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KillLedgerPage from "@/app/kill-ledger/page";

vi.mock("@/components/ui/nav", () => ({
  Nav: () => null,
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: () => null,
}));

vi.mock("@/components/ui/risk-disclosure", () => ({
  RiskDisclosure: () => null,
}));

const BANNED_CLAIMS = [
  "exploitable",
  "fade",
  "guaranteed",
  "beat the book",
];

const THRESHOLD_LABELS = [
  "r ≥ 0.15",
  "r < 0.10",
  "|t| > 2",
  "≥150 bets",
  "ρ₁(A,B) > 0.1",
];

describe("/kill-ledger", () => {
  it("renders the four entries", () => {
    render(<KillLedgerPage />);

    const entries = screen.getAllByTestId(/kill-ledger-entry-/);
    expect(entries).toHaveLength(4);
  });

  it("carries no banned claim words", () => {
    render(<KillLedgerPage />);
    const body = document.body.textContent ?? "";

    for (const claim of BANNED_CLAIMS) {
      expect(body.toLowerCase()).not.toContain(claim.toLowerCase());
    }
  });

  it("names the pre-registered threshold in each entry", () => {
    render(<KillLedgerPage />);

    const entries = screen.getAllByTestId(/kill-ledger-entry-/);
    expect(entries).toHaveLength(4);

    for (const entry of entries) {
      const text = (entry as HTMLElement).textContent ?? "";
      const hasThreshold = THRESHOLD_LABELS.some((threshold) =>
        text.includes(threshold)
      );
      expect(hasThreshold).toBe(true);
    }
  });
});
