export type ContractFlag = "surplus" | "overpaid";

export interface ContractProductionInput {
  readonly player: string;
  readonly position: string;
  readonly totalEPA: number;
  readonly capHitM: number;
}

export interface ContractValueRow extends ContractProductionInput {
  readonly valuePerDollar: number;
  readonly percentileVsPosition: number;
  readonly flag: ContractFlag;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

/** Rank production per cap dollar within each position and flag both deciles. */
export function analyzeContractValue(
  inputs: readonly ContractProductionInput[],
): readonly ContractValueRow[] {
  const valid = inputs.filter((row) => row.player.trim() && row.position.trim() && finite(row.totalEPA) && finite(row.capHitM) && row.capHitM > 0);
    const byPosition = new Map<string, ContractProductionInput[]>();
  for (const row of valid) {
    const group = byPosition.get(row.position) ?? [];
    group.push(row);
    byPosition.set(row.position, group);
  }
  const result: ContractValueRow[] = [];
  for (const [position, group] of byPosition) {
    const values = group.map((row) => row.totalEPA / row.capHitM).sort((a, b) => a - b);
    const ranked = [...group].sort((a, b) => (b.totalEPA / b.capHitM) - (a.totalEPA / a.capHitM));
    ranked.forEach((row, index) => {
      const valuePerDollar = row.totalEPA / row.capHitM;
      const lower = values.filter((value) => value < valuePerDollar).length;
      const equal = values.filter((value) => value === valuePerDollar).length;
      const percentile = values.length <= 1 ? 1 : (lower + (equal - 1) / 2) / (values.length - 1);
      result.push({
        ...row,
        valuePerDollar,
        percentileVsPosition: percentile,
        flag: percentile >= 0.9 ? "surplus" : percentile <= 0.1 ? "overpaid" : "surplus",
      });
    });
  }
  return result.sort((a, b) => b.valuePerDollar - a.valuePerDollar || a.player.localeCompare(b.player));
}

export function rankContractValue(
  inputs: readonly ContractProductionInput[],
): readonly ContractValueRow[] {
  return analyzeContractValue(inputs);
}
