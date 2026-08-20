/**
 * Mandatory ECE interpretation on public proof surfaces (H-F1 / C-28).
 *
 * The live ECE number is loaded from the durable calibration artifact.
 * This sentence is the only allowed framing. Do not invent a skill claim
 * around the number; do not hardcode a historic ECE literal.
 */
export const ECE_MARKET_ECHO_CAVEAT =
  "This ECE largely measures the market's calibration through our confidence echo. It is not evidence of independent skill.";

/** Brier Skill Score vs the base-rate (climatology) forecast. BSS = 1 − BS / UNC. */
export function brierSkillScoreVsBaseRate(
  brier: number,
  uncertainty: number,
): number | null {
  if (!Number.isFinite(brier) || !Number.isFinite(uncertainty) || uncertainty <= 0) {
    return null;
  }
  return 1 - brier / uncertainty;
}
