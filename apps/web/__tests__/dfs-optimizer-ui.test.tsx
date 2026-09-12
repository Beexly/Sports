import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { DFS_SLATE, SALARY_CAP } from "@/lib/fantasy/dfs-slate";
import type { GenResult } from "@/lib/fantasy/dfs-optimizer";

const real = await vi.importActual<typeof import("@/lib/fantasy/dfs-optimizer")>(
  "@/lib/fantasy/dfs-optimizer",
);

let canned: GenResult | null = null;

vi.mock("@/lib/fantasy/dfs-optimizer", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/lib/fantasy/dfs-optimizer")>();
  return {
    ...orig,
    generateLineups: (..._args: unknown[]) => {
      if (!canned) throw new Error("canned result not set");
      return canned;
    },
  };
});

import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";

function lineupOf(ids: string[]) {
  const byId = new Map(DFS_SLATE.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)!);
}

function fullResult(): GenResult {
  const players = lineupOf([
    "dqb1",
    "drb1",
    "drb2",
    "dwr0",
    "dwr1",
    "dwr2",
    "dte1",
    "dwr3",
    "ddst1",
  ]);
  return {
    lineups: [{ players, metrics: real.metrics(players) }],
    exposure: [],
    requested: 1,
    exposureTarget: 0.6,
    partial: false,
  };
}

function partialResult(): GenResult {
  const full = fullResult();
  return {
    ...full,
    requested: 5,
    partial: true,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  canned = null;
});

function renderWithResult(r: GenResult) {
  canned = r;
  render(<DfsOptimizer />);
  fireEvent.click(screen.getByRole("button", { name: /generate lineups/i }));
  act(() => {
    vi.runAllTimers();
  });
}

describe("DfsOptimizer UI — partial notice + cap meter", () => {
  it("partial: shows returned-vs-requested with stopped language, never exhausted", () => {
    renderWithResult(partialResult());
    expect(screen.getByText(/1 of 5 requested/i)).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/stopped/i);
    expect(text).not.toMatch(/exhausted/i);
  });

  it("cap meter: shows salary used and salary left from the engine metrics", () => {
    renderWithResult(fullResult());
    const m = fullResult().lineups[0]!.metrics;
    const left = SALARY_CAP - m.salary;
    const text = document.body.textContent ?? "";
    expect(text).toContain(`$${m.salary.toLocaleString()}`);
    expect(text).toContain(`$${left.toLocaleString()} left`);
  });

  it("empty: explains no lineup fits and suggests loosening pins/fades", () => {
    renderWithResult({
      lineups: [],
      exposure: [],
      requested: 3,
      exposureTarget: 0.6,
      partial: true,
    });
    expect(screen.getByText(/no lineup fits/i)).toBeTruthy();
  });

  it("initial: invites an explicit Generate press, never auto-shows fictional lineups", () => {
    canned = fullResult();
    render(<DfsOptimizer />);
    expect(screen.queryByText(/Lineup 1/)).toBeNull();
    expect(screen.getByText(/press generate/i)).toBeTruthy();
  });
});
