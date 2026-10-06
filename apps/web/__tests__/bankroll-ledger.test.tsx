import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BankrollLedger } from "@/components/tracker/bankroll-ledger";

/**
 * BankrollLedger (Beexly/Sports#797) — the local-first running-total ledger:
 *
 *   - renders the starting-bankroll input and an empty state;
 *   - logging a loss moves the current total down and persists to localStorage;
 *   - logging a win with a return moves the total up and tracks the peak;
 *   - entries survive a remount via localStorage (the persistence contract);
 *   - copy stays honest: no outcome promises, no "win rate" framing.
 */

const ENTRIES_KEY = "gse_bankroll_entries_v1";

beforeEach(() => {
  localStorage.clear();
});

function addResult(stake: string, result: string, returned?: string) {
  fireEvent.change(screen.getByLabelText("Stake (units)"), { target: { value: stake } });
  fireEvent.click(screen.getByRole("button", { name: result }));
  if (returned !== undefined) {
    fireEvent.change(screen.getByLabelText("Returned, including stake (wins)"), {
      target: { value: returned },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: /add result/i }));
}

describe("BankrollLedger", () => {
  it("renders the starting bankroll input and an empty state", () => {
    const { container } = render(<BankrollLedger />);
    expect(screen.getByLabelText("Starting bankroll (units)")).toHaveValue("100");
    expect(container.textContent).toContain("No entries yet");
  });

  it("a logged loss moves the current total down and persists entries", () => {
    const { container } = render(<BankrollLedger />);
    addResult("10", "loss");
    expect(container.textContent).toContain("90u total");
    const raw = localStorage.getItem(ENTRIES_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });

  it("a logged win credits returned-minus-stake and tracks the peak", () => {
    const { container } = render(<BankrollLedger />);
    addResult("10", "win", "19.09");
    // 100 + (19.09 - 10) = 109.09 peak and current
    expect(container.textContent).toContain("109.09u");
  });

  it("entries survive a remount via localStorage", () => {
    const first = render(<BankrollLedger />);
    addResult("10", "loss");
    first.unmount();
    const second = render(<BankrollLedger />);
    expect(second.container.textContent).toContain("90u total");
  });

  it("keeps copy honest: no outcome promises, no win-rate framing", () => {
    const { container } = render(<BankrollLedger />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("win rate");
    expect(text).not.toContain("guarantee");
    expect(text).toContain("betting advice");
  });
});
