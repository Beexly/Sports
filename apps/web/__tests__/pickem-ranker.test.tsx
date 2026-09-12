import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PickemRanker } from "@/components/fantasy/pickem-ranker";
import type { Prop } from "@/lib/fantasy/props";

const bigEdge: Prop = {
  id: "b1",
  player: "Big Edge",
  team: "KC",
  market: "Rec Yds",
  line: 50,
  mean: 70,
  sigma: 10,
  alts: [{ line: 60, mult: 1.5 }],
  overAmerican: -110,
  underAmerican: -110,
};

const smallEdge: Prop = {
  id: "s1",
  player: "Small Edge",
  team: "KC",
  market: "Rec Yds",
  line: 50,
  mean: 55,
  sigma: 10,
  alts: [],
  overAmerican: -110,
  underAmerican: -110,
};

const unpriced: Prop = {
  id: "u1",
  player: "Unpriced Uli",
  team: "KC",
  market: "Rec Yds",
  line: 50,
  mean: 60,
  sigma: 20,
  alts: [],
};

describe("PickemRanker (Beexly/Sports#799)", () => {
  it("ranks rows by edge desc — player, market, side, edge pts", () => {
    render(<PickemRanker lines={[smallEdge, unpriced, bigEdge]} live={false} />);
    const rows = screen.getAllByTestId(/pickem-ranker-row-/);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("data-testid", "pickem-ranker-row-b1");
    expect(within(rows[0]).getByText("Big Edge")).toBeTruthy();
    expect(within(rows[0]).getByText("Rec Yds")).toBeTruthy();
    expect(within(rows[0]).getByText("over")).toBeTruthy();
    expect(rows[0].textContent).toMatch(/pts/);
    // unpriced conviction ranks last
    expect(rows[2]).toHaveAttribute("data-testid", "pickem-ranker-row-u1");
  });

  it("shows priced / unpriced badges", () => {
    render(<PickemRanker lines={[bigEdge, unpriced]} live={false} />);
    const pricedRow = screen.getByTestId("pickem-ranker-row-b1");
    const unpricedRow = screen.getByTestId("pickem-ranker-row-u1");
    expect(within(pricedRow).getByText("Priced")).toBeTruthy();
    expect(within(unpricedRow).getByText("Unpriced")).toBeTruthy();
    expect(unpricedRow.textContent).toContain("—");
  });

  it("shows best-alt EV for the recommended side", () => {
    render(<PickemRanker lines={[bigEdge]} live={false} />);
    const row = screen.getByTestId("pickem-ranker-row-b1");
    // p(over 60 | mean 70, sd 10) ≈ 0.84 × 1.5 − 1 ≈ +0.26
    expect(row.textContent).toMatch(/\+0\.26/);
  });

  it("labels the source fictional vs live via isLivePickem", () => {
    const { rerender } = render(<PickemRanker lines={[bigEdge]} live={false} />);
    expect(screen.getByTestId("pickem-ranker-source").textContent).toMatch(
      /fictional/i,
    );
    rerender(<PickemRanker lines={[bigEdge]} live />);
    expect(screen.getByTestId("pickem-ranker-source").textContent).toMatch(
      /live/i,
    );
  });
});
