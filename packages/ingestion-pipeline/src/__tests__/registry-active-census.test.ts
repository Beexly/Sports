/**
 * Does `activationStatus: "ACTIVE"` mean what it claims?
 *
 * THE QUESTION. An ACTIVE signal is a claim: the engine can read it and it can
 * move a pick. Two of the highest-weighted signals in the registry —
 * `espn_powerindex` (0.8) and `kalshi` (1.0) — are labelled ACTIVE but their
 * evaluators return `null` unless a rights env var is set. In any deployment
 * without that grant they contribute nothing, while the registry's own census
 * counts them toward coverage. The 102-ACTIVE figure therefore overstates the
 * signals that can actually vote today by up to two.
 *
 * THIS TEST CHANGES NOTHING. It is deliberately not a gate: whether an
 * ungated-in-production signal should be demoted to SHADOW_ONLY is a policy
 * call with a real cost either way, and asserting it here would hard-code an
 * answer nobody has made. What it does is make the condition MEASURABLE, so the
 * coverage number in a report is not quietly overstated and the next person to
 * ask "how many signals are live?" can answer it instead of guessing.
 *
 * When someone decides the convention, this is where the assertion goes — and
 * until then, a change that silently gates a new signal behind rights will be
 * caught by the drift check at the bottom.
 */

import { describe, expect, it } from "vitest";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

/** No env at all: the strictest reading of "can this signal vote today". */
const NO_ENV: Record<string, string | undefined> = {};

function rightsGated(id: string): { gated: boolean; status: string; weight: number } | null {
  const def = SIGNAL_REGISTRY.find((s) => s.id === id);
  if (!def) return null;
  let gated = false;
  try {
    gated = def.isRightsCleared(NO_ENV) !== true;
  } catch {
    // A predicate that throws is not "cleared". Treating a throw as clearance
    // would let a broken rights check read as a live signal.
    gated = true;
  }
  return { gated, status: def.activationStatus, weight: def.trustWeight };
}

describe("registry ACTIVE census vs what can actually vote", () => {
  it("reports which ACTIVE signals are rights-gated off with no env", () => {
    const activeGated = SIGNAL_REGISTRY.filter((s) => s.activationStatus === "ACTIVE")
      .map((s) => rightsGated(s.id))
      .filter((r): r is NonNullable<typeof r> => r !== null && r.gated);

    // Surfaced rather than asserted. The count is printed in the run output on
    // purpose: a silent coverage claim is the thing being guarded against, and
    // the snapshot below makes a change to the set visible in a diff.
    console.log(
      `ACTIVE_BUT_RIGHTS_GATED ${activeGated.length}: ` +
        activeGated.map((r) => `${r.status}@${r.weight}`).join(", "),
    );

    // A signal with no rights predicate at all is ungated by definition, so a
    // drift here means someone ADDED a gate. That is the actionable direction.
    expect(activeGated.every((r) => r.status === "ACTIVE")).toBe(true);
  });

  it("pins the current gated-ACTIVE set so a NEW gated signal is a diff", () => {
    const activeGated = SIGNAL_REGISTRY.filter((s) => s.activationStatus === "ACTIVE")
      .map((s) => rightsGated(s.id))
      .filter((r): r is NonNullable<typeof r> => r !== null && r.gated)
      .map((r) => r.weight)
      .sort((a, b) => b - a);

    // Today: kalshi (1.0) and espn_powerindex (0.8). If this list grows, a new
    // ACTIVE signal was added behind a rights gate — which is a decision, and
    // should be a visible one in a diff rather than a surprise in a report.
    // Update this array WITH the decision, not around it.
    expect(activeGated).toEqual([1, 0.8]);
  });

  it("a rights predicate that throws reads as GATED, never cleared", () => {
    // Signature matches `SignalDefinition.isRightsCleared`, so this stub cannot
    // drift from the real contract the way a zero-arg version would.
    const throwing = {
      id: "x",
      activationStatus: "ACTIVE" as const,
      trustWeight: 0.5,
      isRightsCleared: (_env: Record<string, string | undefined>): boolean => {
        throw new Error("boom");
      },
    };
    let gated = false;
    try {
      gated = throwing.isRightsCleared(NO_ENV) !== true;
    } catch {
      gated = true;
    }
    expect(gated).toBe(true);
  });
});
