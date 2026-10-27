/**
 * arXiv:2606.18512 — Causal panel forecasting for mid-week starter exit.
 *
 * Sealed-invariant coverage. This module touches no coach seal state. The
 * invariant under test: a disabled causal module must not emit a numeric
 * counterfactual at all. Returning 0 makes "no estimate" indistinguishable
 * from "measured zero efficiency", which is the exact failure the seal work
 * exists to prevent.
 */
import { describe, it, expect } from "vitest";

import {
  counterfactualEfficiency,
  type UnitObservation,
} from "./2606-18512-causal-panel-forecasting.js";

const obs = (
  team: string,
  week: number,
  efficiency: number,
  starterOut = false,
): UnitObservation => ({ team, week, efficiency, starterOut });

describe("2606-18512 causal panel counterfactual", () => {
  it("refuses to emit a numeric counterfactual while the module is disabled", () => {
    const history = [
      obs("KC", 1, 0.12),
      obs("KC", 2, 0.08),
      obs("KC", 3, 0.1, true),
    ];
    // 0 would read as a real measurement of zero efficiency.
    expect(() => counterfactualEfficiency(history, "KC", 3)).toThrow(
      /not implemented|disabled/i,
    );
  });

  it("does not touch any coach seal parameter", () => {
    // Structural invariant: the module imports nothing from coach-sim and
    // therefore cannot re-estimate tau or a mindset hash. Asserted by the
    // absence of the identifiers in this module's own surface.
    const src = counterfactualEfficiency.toString();
    expect(src).not.toMatch(/coachTau|coachMindsetHash|assertTauSealed|Sinkhorn/);
  });
});
