import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";

/**
 * L1 — DFS customer-data contract.
 * The default slate is fictional (DFS_SLATE) and imported projections/
 * ownership are modeled, so the component must not present either as
 * measured contest facts or tournament promises.
 */
describe("DfsOptimizer customer-data contract", () => {
  it("does not auto-generate fictional lineups on initial render", () => {
    render(<DfsOptimizer />);
    expect(screen.getAllByText(/sample slate/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Lineup 1/)).toBeNull();
    expect(screen.getByText(/press Generate/i)).toBeTruthy();
  });

  it("describes objectives without tournament/median/edge promises", () => {
    render(<DfsOptimizer />);
    expect(screen.queryByText(/safest median/i)).toBeNull();
    expect(screen.queryByText(/win the tournament/i)).toBeNull();
    expect(screen.queryByText(/contrarian.*the edge/i)).toBeNull();
  });
});
