import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

/**
 * The optimizer's slate-state contract (2026-10-12, real-slate wiring).
 *
 * The component is prop-driven: the page hands it the measured pool, an
 * explicit empty state, or (standalone/dev only) the sample fixture. These
 * render tests pin the disclosure for each state:
 *   - real  → provenance banner naming what is measured and what is not
 *             (salaries absent, ownership assumed, missing positions);
 *             NO sample language anywhere.
 *   - empty → an explicit empty state; no pool, no sample substitution.
 *   - sample (default, standalone) → the SAMPLE banner (also pinned by
 *             dfs-customer-data-contract.test.tsx).
 */

const REAL_POOL: readonly DfsPlayer[] = [
  { id: "r1", name: "Josh Allen", pos: "QB", team: "BUF", opp: "LAR", salary: 0, proj: 24.5, floor: 15, ceiling: 33, own: 0.5 },
  { id: "r2", name: "James Cook", pos: "RB", team: "BUF", opp: "LAR", salary: 0, proj: 16.2, floor: 9, ceiling: 25, own: 0.5 },
  { id: "r3", name: "Puka Nacua", pos: "WR", team: "LAR", opp: "BUF", salary: 0, proj: 18.9, floor: 10, ceiling: 28, own: 0.5 },
];

afterEach(() => cleanup());

describe("DfsOptimizer slate states", () => {
  it("real: banners the measured provenance and the not-real fields, never 'sample'", () => {
    render(
      <DfsOptimizer
        slate={REAL_POOL}
        slateState="real"
        salaryIsReal={false}
        ownershipIsAssumed
        missingPositions={["DST"]}
      />,
    );
    const text = document.body.textContent ?? "";
    expect(screen.getByText(/real slate/i)).toBeTruthy();
    expect(text).toMatch(/measured projections/i);
    expect(text).toMatch(/salaries are not connected/i);
    expect(text).toMatch(/neutral 50% placeholder/i);
    expect(text).toMatch(/no DST yet/i);
    expect(text).not.toMatch(/sample slate/i);
    expect(text).not.toMatch(/fictional players/i);
    // The pool itself is the real one, sortable by projection.
    expect(text).toContain("Josh Allen");
    expect(text).toContain("Puka Nacua");
  });

  it("real with licensed salaries: the salary-absence disclosure disappears", () => {
    render(<DfsOptimizer slate={REAL_POOL} slateState="real" salaryIsReal ownershipIsAssumed={false} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/real slate/i);
    expect(text).not.toMatch(/salaries are not connected/i);
    expect(text).not.toMatch(/neutral 50% placeholder/i);
  });

  it("empty: explicit empty state — no pool, no sample substitution, import stays open", () => {
    render(<DfsOptimizer slate={[]} slateState="empty" />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/real player pool is empty/i);
    expect(text).toMatch(/rather than filling with sample players/i);
    expect(text).not.toMatch(/sample slate/i);
    expect(text).not.toContain("Josh Allen");
    // The tool is not a dead end: the DK CSV import path still renders.
    expect(text).toMatch(/import/i);
  });
});
