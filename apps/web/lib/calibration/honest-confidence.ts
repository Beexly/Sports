import { confidenceLabel } from "@/lib/utils";

export interface HonestConfidence {
  readonly pct: number;
  readonly label: string;
}

export function committedProbabilityDisplay(
  modelProbability: number | null | undefined,
  canShow: boolean,
): HonestConfidence | null {
  if (
    !canShow ||
    modelProbability == null ||
    !Number.isFinite(modelProbability) ||
    modelProbability < 0 ||
    modelProbability > 1
  ) {
    return null;
  }

  const pct = Math.round(modelProbability * 100);
  return { pct, label: confidenceLabel(pct).label };
}
