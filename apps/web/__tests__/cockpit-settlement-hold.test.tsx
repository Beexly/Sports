import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NeedsAdjudicationCard, type AdjudicationRow } from "@/components/cockpit/needs-adjudication";

/**
 * Needs-adjudication card — pins the read-only worklist renders real derived rows
 * (sport, matchup, commence time, hours overdue, pick type, line) and an honest
 * empty state. No DB, no mutation path. Mirrors the cockpit-api-costs-routing test.
 */

const NOW = "2026-08-13T21:00:00Z";
const HOURS = 60 * 60 * 1000;

function row(overrides: Partial<AdjudicationRow> = {}): AdjudicationRow {
  return {
    id: "pick_1",
    sport: "NBA",
    matchup: "Boston @ New York",
    commenceTime: new Date(Date.parse(NOW) - 8 * HOURS).toISOString(),
    hoursOverdue: 8,
    pickType: "SPREAD",
    selection: "Celtics -3.5",
    line: -3.5,
    ...overrides,
  };
}

describe("NeedsAdjudicationCard", () => {
  it("renders the count and every row's fields", () => {
    const rows = [
      row({ id: "p1", sport: "NBA", matchup: "Boston @ New York", pickType: "SPREAD", selection: "Celtics -3.5", line: -3.5, hoursOverdue: 8 }),
      row({ id: "p2", sport: "NFL", matchup: "Chiefs @ Broncos", pickType: "MONEYLINE", selection: "Chiefs", line: -150, hoursOverdue: 30 }),
    ];
    render(<NeedsAdjudicationCard rows={rows} />);

    expect(screen.getByText("2 overdue")).toBeInTheDocument();
    expect(screen.getByText("Boston @ New York")).toBeInTheDocument();
    expect(screen.getByText("Chiefs @ Broncos")).toBeInTheDocument();
    // pick type + selection + line rendered together
    expect(screen.getByText(/SPREAD · Celtics -3.5 -3\.5/)).toBeInTheDocument();
    expect(screen.getByText(/MONEYLINE · Chiefs -150/)).toBeInTheDocument();
    // hours overdue formatted
    expect(screen.getByText(/overdue 8\.0h/)).toBeInTheDocument();
    expect(screen.getByText(/overdue 30\.0h/)).toBeInTheDocument();
  });

  it("shows an honest empty state when there are no overdue picks", () => {
    render(<NeedsAdjudicationCard rows={[]} />);
    expect(screen.getByText("0 overdue")).toBeInTheDocument();
    expect(screen.getByText(/No overdue picks/)).toBeInTheDocument();
  });

  it("never implies it knows why a pick is held (ADR 006 caption)", () => {
    render(<NeedsAdjudicationCard rows={[row()]} />);
    // The caption must be explicit that the *why* is not yet known. The word is
    // wrapped in <em>, so match on the parent paragraph's full text content.
    expect(
      screen.getByText(
        (content) => content.includes("cannot yet show") && content.includes("held"),
      ),
    ).toBeInTheDocument();
  });
});
