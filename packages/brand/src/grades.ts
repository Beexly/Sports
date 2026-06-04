import { colors } from "./tokens";

export const pickGrades = {
  ELITE_PLAY: {
    label: "Elite Play",
    shortLabel: "Elite",
    color: colors.plasmaMagenta,
    minConfidence: 85,
  },
  STRONG_PLAY: {
    label: "Strong Play",
    shortLabel: "Strong",
    color: colors.ionBlue,
    minConfidence: 75,
  },
  SOLID_PLAY: {
    label: "Solid Play",
    shortLabel: "Solid",
    color: colors.ultraviolet,
    minConfidence: 65,
  },
  LEAN: {
    label: "Lean",
    shortLabel: "Lean",
    color: colors.electricBlue,
    minConfidence: 50,
  },
} as const;

export type PickGradeKey = keyof typeof pickGrades;

export function gradeForConfidence(confidence: number): PickGradeKey {
  if (confidence >= pickGrades.ELITE_PLAY.minConfidence) return "ELITE_PLAY";
  if (confidence >= pickGrades.STRONG_PLAY.minConfidence) return "STRONG_PLAY";
  if (confidence >= pickGrades.SOLID_PLAY.minConfidence) return "SOLID_PLAY";
  return "LEAN";
}
