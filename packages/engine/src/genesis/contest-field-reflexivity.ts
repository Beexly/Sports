/**
 * GENESIS LAYER — Contest Field Reflexivity (Invention 62).
 *
 * For DFS / best ball: predicts how the field crowds after a narrative forms — ownership crowding,
 * duplication risk, salary-relief chalk, public stack behavior, leverage decay, and late-swap
 * sensitivity. Separates fragile chalk (over-owned + cheap, collapses) from sturdy chalk and from
 * real leverage (under-owned vs role). Pure + deterministic.
 */

export interface ContestFieldInput {
  readonly projectedOwnership: number; // 0..1
  readonly fairOwnership: number;      // 0..1 (role-implied)
  readonly salaryRelief: number;       // 0..1 (cheap value → chalk magnet)
  readonly publicStackTendency: number;// 0..1
  readonly fieldSize: number;          // entries
  readonly lateNewsRisk: number;       // 0..1
}

export type ChalkType = "fragile_chalk" | "sturdy_chalk" | "leverage" | "neutral";

export interface ContestFieldResult {
  readonly crowdingPressure: number;
  readonly duplicationRisk: number;
  readonly leverageDecay: number;
  readonly chalkType: ChalkType;
  readonly lateSwapSensitive: boolean;
  readonly note: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Assess how the contest field will crowd a play and classify the chalk. */
export function assessContestField(i: ContestFieldInput): ContestFieldResult {
  const overOwned = i.projectedOwnership - i.fairOwnership;
  const crowdingPressure = clamp01(i.projectedOwnership + 0.5 * i.salaryRelief + 0.3 * i.publicStackTendency - i.fairOwnership);
  const fieldNorm = Math.min(1, i.fieldSize / 100_000);
  const duplicationRisk = clamp01(i.projectedOwnership * (0.5 + 0.5 * fieldNorm) + 0.3 * i.publicStackTendency);
  const leverageDecay = Number(Math.max(0, overOwned).toFixed(4));

  let chalkType: ChalkType;
  if (overOwned > 0.15 && i.salaryRelief >= 0.5) chalkType = "fragile_chalk";
  else if (overOwned > 0.15) chalkType = "sturdy_chalk";
  else if (overOwned < -0.1) chalkType = "leverage";
  else chalkType = "neutral";

  return {
    crowdingPressure: Number(crowdingPressure.toFixed(4)),
    duplicationRisk: Number(duplicationRisk.toFixed(4)),
    leverageDecay,
    chalkType,
    lateSwapSensitive: i.lateNewsRisk > 0.5,
    note: chalkType === "fragile_chalk"
      ? "Over-owned cheap chalk — high duplication, collapses if it busts; fade for leverage."
      : chalkType === "leverage"
        ? "Under-owned vs its role — real leverage."
        : chalkType === "sturdy_chalk"
          ? "Owned up but role-justified — sturdy chalk."
          : "Field roughly fair — neutral.",
  };
}
