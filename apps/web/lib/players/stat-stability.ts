/**
 * Stat Stability Grade — Galaxy Data Doctrine, stat factory.
 *
 * Definition: a per-row trust grade for per-game rate stats, driven by the
 * settled sample behind them.
 * Formula: games ≥ 10 → "stable" · 6–9 → "developing" · < 6 → "thin".
 * Floor: rows below the lab's MIN_GAMES floor (3) never render at all.
 * Known weakness (stated, per the stat commandment): this grades SAMPLE SIZE
 * only — it does not model week-to-week variance, opponent quality, or role
 * changes. A 10-game sample with a mid-season role change can still mislead.
 * Decision use: how much weight a per-game rate deserves — nothing else.
 */

export type StatStabilityGrade = "stable" | "developing" | "thin";

export const STABLE_GAMES_FLOOR = 10;
export const DEVELOPING_GAMES_FLOOR = 6;

export function statStabilityGrade(games: number): StatStabilityGrade {
  if (games >= STABLE_GAMES_FLOOR) return "stable";
  if (games >= DEVELOPING_GAMES_FLOOR) return "developing";
  return "thin";
}

/** Glyph + label per grade. Meaning never depends on color alone (a11y). */
export const STABILITY_META: Record<
  StatStabilityGrade,
  { glyph: string; label: string }
> = {
  stable: { glyph: "●", label: "stable (10+ games)" },
  developing: { glyph: "◐", label: "developing (6-9 games)" },
  thin: { glyph: "○", label: "thin (under 6 games)" },
};

export const STABILITY_TOOLTIP =
  "Sample stability: ● 10+ games · ◐ 6-9 · ○ under 6. Grades sample size only, not variance, opponent quality, or role changes.";
