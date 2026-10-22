import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";

/**
 * L1 — DFS customer-data contract.
 * The fixture slate is fictional (DFS_SLATE) and imported projections/
 * ownership are modeled, so the component must not present either as
 * measured contest facts or tournament promises.
 *
 * The component's DFS_SLATE default fallback was deliberately removed
 * (the pool is passed in by the page), so this suite passes the fictional
 * slate explicitly with its Sample Slate label.
 */
describe("DfsOptimizer customer-data contract", () => {
  it("does not auto-generate fictional lineups on initial render", () => {
    render(<DfsOptimizer slate={DFS_SLATE} salaryIsReal={false} slateLabel="Sample Slate" />);
    expect(screen.getAllByText(/sample slate/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Lineup 1/)).toBeNull();
    expect(screen.getByText(/press Generate/i)).toBeTruthy();
  });

  it("describes objectives without tournament/median/edge promises", () => {
    render(<DfsOptimizer slate={DFS_SLATE} salaryIsReal={false} slateLabel="Sample Slate" />);
    expect(screen.queryByText(/safest median/i)).toBeNull();
    expect(screen.queryByText(/win the tournament/i)).toBeNull();
    expect(screen.queryByText(/contrarian.*the edge/i)).toBeNull();
  });
});
