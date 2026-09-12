import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioSim } from "@/components/fantasy/portfolio-sim";
import { PostLockPanel } from "@/components/fantasy/postlock-panel";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";
import { simulateFieldScores, simulatePortfolio, flatPayoutTable } from "@/lib/fantasy/payout-sim";
import { postLockReadout } from "@/lib/fantasy/postlock";

const lineupA = DFS_SLATE.slice(0, 9);
const lineupB = DFS_SLATE.slice(9, 18);

describe("portfolio-sim + postlock-panel smoke", () => {
  it("simulatePortfolio ground truth: flat table ROI math holds", () => {
    const scores = [lineupA, lineupB].map((lu) => lu.reduce((s, p) => s + p.proj, 0));
    const field = simulateFieldScores(100, 145, 18, 42);
    const r = simulatePortfolio(scores, field, flatPayoutTable(20, 2), 10);
    expect(r.perLineup).toHaveLength(2);
    expect(r.invested).toBe(20);
    expect(r.itmRate).toBeGreaterThanOrEqual(0);
    expect(r.itmRate).toBeLessThanOrEqual(1);
  });

  it("renders PortfolioSim with ROI stats, toggle, and sample label", () => {
    render(<PortfolioSim lineups={[lineupA, lineupB]} />);
    expect(screen.getByLabelText("Portfolio simulation")).toBeInTheDocument();
    expect(screen.getByText(/sample projections/i)).toBeInTheDocument();
    expect(screen.getByText("ROI (mean)")).toBeInTheDocument();
    expect(screen.getByText("ITM rate")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /top-heavy/i }));
    expect(screen.getByRole("button", { name: /top-heavy/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders empty-state when no lineups", () => {
    render(<PortfolioSim lineups={[]} />);
    expect(screen.getByText(/generate kbest lineups first/i)).toBeInTheDocument();
  });

  it("postLockReadout ground truth: identical lineups keep locks, zero deltas", () => {
    const locked = new Set([lineupA[0]!.id]);
    const r = postLockReadout(lineupA, lineupA, locked);
    expect(r.lockedKept).toBe(true);
    expect(r.projDelta).toBe(0);
    expect(r.swappedOut).toHaveLength(0);
  });

  it("renders PostLockPanel with deltas and swap lists", () => {
    render(<PostLockPanel pre={lineupA} post={lineupB} lockedIds={new Set()} />);
    expect(screen.getByLabelText("Post-lock readout")).toBeInTheDocument();
    expect(screen.getByText(/swapped out/i)).toBeInTheDocument();
    expect(screen.getByText(/swapped in/i)).toBeInTheDocument();
  });
});
