import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StackExposurePanel } from "@/components/fantasy/stack-exposure-panel";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

const P = (id: string, pos: DfsPlayer["pos"], team: string, opp: string): DfsPlayer => ({
  id,
  name: id.toUpperCase(),
  pos,
  team,
  opp,
  salary: 5000,
  proj: 10,
  floor: 5,
  ceiling: 20,
  own: 0.1,
});

const stacked: DfsPlayer[] = [
  P("qb", "QB", "KC", "BUF"),
  P("wr1", "WR", "KC", "BUF"),
  P("wr2", "WR", "KC", "BUF"),
  P("te", "TE", "KC", "BUF"),
  P("bufwr", "WR", "BUF", "KC"),
];

describe("StackExposurePanel", () => {
  it("reports stack and bring-back rates for a stacked portfolio", () => {
    render(<StackExposurePanel lineups={[stacked, stacked]} />);
    const stats = screen.getAllByTestId("stack-exposure-stat");
    expect(stats.length).toBe(4);
    expect(stats[0]!.textContent).toContain("QB stack rate");
    expect(stats[0]!.textContent).toContain("100%");
    expect(stats[1]!.textContent).toContain("Bring-back rate");
  });

  it("shows an em-dash rather than 0% when there are no lineups", () => {
    render(<StackExposurePanel lineups={[]} />);
    for (const s of screen.getAllByTestId("stack-exposure-stat")) {
      expect(s.textContent).toContain("—");
      expect(s.textContent).not.toContain("0%");
    }
    expect(screen.getByTestId("stack-exposure").textContent).toContain("undefined, not zero");
  });

  it("flags single-player concentration as a fact about the portfolio", () => {
    render(<StackExposurePanel lineups={[stacked, stacked]} />);
    const flag = screen.getByTestId("stack-exposure-concentration");
    expect(flag.textContent).toContain("one bet, repeated");
  });

  it("carries the denominator note so no rate floats free", () => {
    render(<StackExposurePanel lineups={[stacked]} />);
    expect(screen.getByTestId("stack-exposure").textContent).toContain("Stack/bring-back computed over");
  });

  it("prints per-player counts alongside the percentage", () => {
    render(<StackExposurePanel lineups={[stacked, stacked]} />);
    const text = screen.getByTestId("stack-exposure").textContent ?? "";
    expect(text).toContain("2×");
  });
});