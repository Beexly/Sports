import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * C-242. The DFS optimizer's exposure bound rounds UP: `capFor` is
 * `max(1, ceil(maxExposure * n))`, so a 0.6 target over 3 lineups permits 2
 * appearances - 67%, above the number the caller typed. That was argued to
 * `floor` twice in review and rejected twice on measured evidence: on a
 * position-scarce pool `floor` collapses generation and hands a caller who
 * asked for four lineups one (the reasoning is recorded at `capFor` in
 * `lib/fantasy/dfs-optimizer.ts`).
 *
 * The rounding residual is inherent to whole lineups - no integer bound
 * expresses 60% of 3 - so the design's answer is DISCLOSURE: `GenResult`
 * carries `exposureCap`, the appearance bound the returned set was actually
 * built under, and its docstring instructs callers to "report THIS integer to
 * a user and never restate `maxExposure` as the realized share".
 *
 * The only consumer never reported it. The panel drew a 67% bar with nothing
 * to read it against, while the sibling `partial` field WAS surfaced - the
 * asymmetry is what made this a real gap rather than a rounding preference.
 * These tests hold the disclosure in place and, more importantly, hold it
 * TRUE: a stated bound that the returned set violates would be worse than no
 * bound at all.
 */

import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { generateLineups } from "@/lib/fantasy/dfs-optimizer";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";

// The component's initial build, replicated exactly (see its mount effect).
const initial = generateLineups(
  { mode: "gpp", stack: true, locks: new Set<string>(), excludes: new Set<string>() },
  3,
  0.6,
  DFS_SLATE,
);

describe("the DFS optimizer states the exposure bound it actually built under", () => {
  it("renders the bound as whole lineups, matching the returned set", async () => {
    render(<DfsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText(/Exposure across/)).toBeTruthy();
    });

    const bound = screen.getByText(/Bound: no unpinned player in more than/);
    expect(bound.textContent).toContain(`${initial.exposureCap} of ${initial.lineups.length}`);
  });

  it("states a bound the returned lineups honour", async () => {
    // The claim has to be true, not merely present. Nothing is pinned on the
    // initial build, so the bound applies to every player without exception.
    const usage = new Map<string, number>();
    for (const l of initial.lineups) {
      for (const p of l.players) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
    }
    expect(usage.size).toBeGreaterThan(0);
    for (const [id, count] of usage) {
      expect(count, `${id} appears in more lineups than the stated bound`).toBeLessThanOrEqual(
        initial.exposureCap,
      );
    }
  });

  it("discloses the bound precisely when a rendered share exceeds the configured target", async () => {
    // This is the defect in one assertion: at 0.6 over 3 lineups the panel
    // shows 67%, higher than the 0.6 the optimizer was asked for. A reader
    // cannot tell that from the bar alone, so whenever any share is over the
    // target the whole-lineup bound must be on screen next to it.
    const overTarget = initial.exposure.some((e) => e.pct > 60);
    expect(overTarget, "fixture no longer reproduces the rounding residual").toBe(true);

    render(<DfsOptimizer />);
    await waitFor(() => {
      expect(screen.getByText(/Bound: no unpinned player in more than/)).toBeTruthy();
    });
  });

  it("reports the bound in lineups rather than restating the target as a percentage", async () => {
    render(<DfsOptimizer />);
    const bound = await waitFor(() => screen.getByText(/Bound: no unpinned player in more than/));
    // "2 of 3", never "60%" - the point of C-217 is that the percentage is the
    // thing the arithmetic cannot honour.
    expect(bound.textContent).toMatch(/\d+ of \d+/);
    expect(bound.textContent).not.toContain("%");
  });
});
