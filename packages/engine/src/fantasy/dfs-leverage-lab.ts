/**
 * FANTASY DISCOVERY LAYER — DFS Leverage Lab (Invention F11).
 *
 * Separates GOOD chalk from fragile chalk, and real leverage from fake leverage. Salary efficiency
 * and a ceiling are necessary but not sufficient — ownership relative to role, duplication risk,
 * late-news risk, and fragility decide whether a play is OVERWEIGHT, a FADE, or cash-only. Pure +
 * deterministic.
 */

export interface DFSInputs {
  readonly ceilingProjection: number; // 0..1
  readonly roleCertainty: number;     // 0..1
  readonly salary: number;            // 0..1 normalized
  readonly projectedPoints: number;   // 0..1 normalized
  readonly projectedOwnership: number;// 0..1
  readonly fairOwnership: number;     // 0..1 (role-implied)
  readonly correlationValue: number;  // 0..1
  readonly contestType: "cash" | "gpp" | "single_entry";
  readonly duplicationRisk: number;   // 0..1
  readonly lateNewsRisk: number;      // 0..1
  readonly fragility: number;         // 0..1
}

export type DFSAction =
  | "OVERWEIGHT" | "UNDERWEIGHT" | "FADE" | "NEUTRAL" | "CASH_ONLY" | "TOURNAMENT_ONLY" | "LATE_SWAP_OPTION";

export interface DFSResult {
  readonly leverage: number;
  readonly salaryEfficiency: number;
  readonly ownershipDiscount: number;
  readonly action: DFSAction;
  readonly note: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Evaluate a DFS play's leverage and recommend an exposure action. */
export function evaluateDFS(i: DFSInputs): DFSResult {
  const salaryEfficiency = clamp01(0.5 + (i.projectedPoints - i.salary));
  const ownershipDiscount = clamp01(0.5 + (i.fairOwnership - i.projectedOwnership));
  const overOwned = i.projectedOwnership - i.fairOwnership;
  const leverage = i.ceilingProjection * i.roleCertainty * salaryEfficiency * ownershipDiscount * (0.6 + 0.4 * i.correlationValue)
    - 0.3 * i.duplicationRisk - 0.3 * i.lateNewsRisk - 0.3 * i.fragility;

  let action: DFSAction;
  if (leverage <= 0 || (overOwned > 0.2 && i.ceilingProjection < 0.6)) action = "FADE"; // fragile chalk
  else if (i.lateNewsRisk > 0.6) action = "LATE_SWAP_OPTION";
  else if (i.contestType === "cash" && i.roleCertainty > 0.7 && i.fragility < 0.3) action = "CASH_ONLY";
  else if (i.ceilingProjection >= 0.6 && ownershipDiscount > 0.55 && leverage >= 0.15) action = i.contestType === "gpp" ? "TOURNAMENT_ONLY" : "OVERWEIGHT";
  else if (leverage >= 0.2 && ownershipDiscount > 0.55) action = "OVERWEIGHT";
  else if (leverage >= 0.1) action = "NEUTRAL";
  else action = "UNDERWEIGHT";

  return {
    leverage: Number(leverage.toFixed(4)),
    salaryEfficiency: Number(salaryEfficiency.toFixed(4)),
    ownershipDiscount: Number(ownershipDiscount.toFixed(4)),
    action,
    note: action === "FADE"
      ? "Fragile/over-owned or net-negative leverage — fade."
      : action === "LATE_SWAP_OPTION"
        ? "High late-news risk — hold a late-swap option."
        : `${action.replace("_", " ")} (leverage ${leverage.toFixed(2)}, ownership discount ${ownershipDiscount.toFixed(2)}).`,
  };
}
