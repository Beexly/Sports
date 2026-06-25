/**
 * EINSTEIN LAYER — Conservation Law Engine (Invention 15).
 *
 * Moneyline, spread, total, team total, player props, alt ladders, DFS and fantasy all describe
 * the SAME game universe. They cannot all imply mutually impossible worlds. This validates
 * conservation across surfaces and emits ConservationViolationResiduals — a higher-order signal
 * than line-shopping, because it asks whether the entire implied world is internally coherent.
 *
 * Laws implemented (each with a falsification note — a violation is a hypothesis, not proof):
 *   1. usage-share conservation (carry/target shares of a team sum to ~1)
 *   2. alt-tail vs median (the ladder's 50% point must match the main line)
 *   3. TD-price vs yardage/red-zone role (anytime TD prob must fit the role)
 *   4. movement-without-causal-parent (a market moved with no shock to justify it)
 *
 * Pure + deterministic; inputs are explicit numbers so the laws are unit-testable in isolation.
 */

export interface ConservationViolationResidual {
  readonly law: "usage_share" | "alt_tail_vs_median" | "td_vs_role" | "movement_without_parent";
  readonly surfaces: readonly string[];
  readonly severity: "info" | "warn" | "violation";
  readonly expected: number | string;
  readonly observed: number | string;
  readonly magnitude: number;
  readonly falsificationNote: string;
}

/** 1. The priced usage shares of a single team's players cannot exceed 100% (+tolerance). */
export function checkUsageShareConservation(
  shares: ReadonlyArray<{ player: string; share: number }>,
  kind: "carry" | "target",
  tolerance = 0.05,
): ConservationViolationResidual[] {
  const total = shares.reduce((s, x) => s + x.share, 0);
  if (total <= 1 + tolerance) return [];
  return [{
    law: "usage_share",
    surfaces: shares.map((s) => `${kind}_share:${s.player}`),
    severity: total > 1 + tolerance * 3 ? "violation" : "warn",
    expected: 1,
    observed: Number(total.toFixed(3)),
    magnitude: total - 1,
    falsificationNote: `Priced ${kind} shares sum to ${total.toFixed(2)} > 1 — either a prop is stale, or the implied roles double-count. Could also be modeling slack if shares are approximate.`,
  }];
}

/** Linear-interpolate the alt ladder's implied median (the point where P(over)=0.5). */
function ladderMedian(rungs: ReadonlyArray<{ point: number; overImplied: number }>): number | null {
  const s = [...rungs].sort((a, b) => a.point - b.point);
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!, b = s[i]!;
    if ((a.overImplied - 0.5) * (b.overImplied - 0.5) <= 0 && a.overImplied !== b.overImplied) {
      const t = (a.overImplied - 0.5) / (a.overImplied - b.overImplied);
      return a.point + t * (b.point - a.point);
    }
  }
  return null;
}

/** 2. The alt ladder's 50% point must match the main line (within tolerance). */
export function checkAltTailVsMedian(
  mainLine: number,
  rungs: ReadonlyArray<{ point: number; overImplied: number }>,
  tolerance = 3,
): ConservationViolationResidual[] {
  const med = ladderMedian(rungs);
  if (med == null) return [];
  const diff = med - mainLine;
  if (Math.abs(diff) <= tolerance) return [];
  return [{
    law: "alt_tail_vs_median",
    surfaces: ["main_line", "alt_ladder"],
    severity: Math.abs(diff) > tolerance * 2 ? "violation" : "warn",
    expected: mainLine,
    observed: Number(med.toFixed(1)),
    magnitude: Math.abs(diff),
    falsificationNote: `Alt ladder implies a median of ${med.toFixed(1)} vs main line ${mainLine} — the median market may be stale while the tail corrected (or the ladder is low-liquidity).`,
  }];
}

/** 3. Anytime-TD implied prob must fit the player's red-zone/yardage role. */
export function checkTdVsRole(
  anytimeTdProb: number,
  redZoneShare: number,
  yardageRoleNorm: number,
  tolerance = 0.12,
): ConservationViolationResidual[] {
  // A simple role→TD expectation: red-zone role dominates, yardage role contributes.
  const expected = Math.min(0.7, 0.55 * redZoneShare + 0.25 * yardageRoleNorm);
  const diff = anytimeTdProb - expected;
  if (Math.abs(diff) <= tolerance) return [];
  return [{
    law: "td_vs_role",
    surfaces: ["anytime_td", "red_zone_role", "yardage_role"],
    severity: Math.abs(diff) > tolerance * 2 ? "violation" : "warn",
    expected: Number(expected.toFixed(3)),
    observed: Number(anytimeTdProb.toFixed(3)),
    magnitude: Math.abs(diff),
    falsificationNote: diff > 0
      ? "TD price implies more scoring than the role supports — public TD-chasing or hidden red-zone role."
      : "TD price implies less than the role supports — possible stale TD market or matchup suppression.",
  }];
}

/** 4. A market that moved with no shock to justify it has no causal parent. */
export function checkMovementWithoutParent(
  movedMarkets: readonly string[],
  justifiedMarkets: ReadonlySet<string>,
): ConservationViolationResidual[] {
  return movedMarkets
    .filter((m) => !justifiedMarkets.has(m))
    .map((m) => ({
      law: "movement_without_parent" as const,
      surfaces: [m],
      severity: "warn" as const,
      expected: "no move (no causal parent)",
      observed: "moved",
      magnitude: 1,
      falsificationNote: `${m} moved with no shock in the causal set — attention/steam-contaminated candidate, OR a parent shock we failed to observe.`,
    }));
}
