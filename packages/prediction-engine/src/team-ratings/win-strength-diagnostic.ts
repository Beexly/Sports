
export interface GameForStrength {
  readonly won: boolean;
  /** Opponent's win% entering the game, in [0,1]. */
  readonly oppWinPct: number;
}

/** Strength-adjusted wins: sum of oppWinPct over wins. */
export function strengthAdjustedWins(games: readonly GameForStrength[]): number {
  return games.reduce((s, g) => s + (g.won ? Math.min(Math.max(g.oppWinPct, 0), 1) : 0), 0);
}

/** Raw win fraction. */
export function rawWinPct(games: readonly GameForStrength[]): number {
  if (games.length === 0) return 0;
  return games.filter((g) => g.won).length / games.length;
}

export interface WinStrengthGap {
  readonly rawWinPct: number;
  readonly adjustedWinPct: number;
  /** Positive = record overstates strength (weak schedule). */
  readonly gap: number;
}

/** Win-strength gap diagnostic. */
export function winStrengthGap(games: readonly GameForStrength[]): WinStrengthGap {
  const raw = rawWinPct(games);
  const adjusted = games.length === 0 ? 0 : strengthAdjustedWins(games) / games.length;
  return { rawWinPct: raw, adjustedWinPct: adjusted, gap: raw - adjusted };
}
