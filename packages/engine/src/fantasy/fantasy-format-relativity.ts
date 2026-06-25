/**
 * FANTASY DISCOVERY LAYER — Fantasy Format Relativity (Invention F12).
 *
 * The same player is a different asset in PPR vs standard, superflex vs 1-QB, TE-premium, best
 * ball, DFS, dynasty, keeper, guillotine, and shallow vs deep benches. Value is frame-relative —
 * a receiving back is a different price in full-PPR than standard; a QB is a different price in
 * superflex. This applies transparent, auditable multipliers (never a black box). Pure + deterministic.
 */

export type FantasyFormat =
  | "standard" | "half_ppr" | "full_ppr" | "superflex" | "te_premium" | "dynasty"
  | "keeper" | "best_ball" | "dfs" | "guillotine" | "shallow_bench" | "deep_bench";

export interface PlayerValueProfile {
  readonly position: "QB" | "RB" | "WR" | "TE";
  /** Expected receptions per game (drives PPR sensitivity). */
  readonly receptionsPerGame: number;
  readonly age: number;
  /** 0..1 week-to-week volatility (best ball likes it, cash DFS / guillotine dislike it). */
  readonly volatility: number;
  /** 0..1 ceiling / spike-week propensity. */
  readonly ceiling: number;
  /** 0..1 injury fragility. */
  readonly fragility: number;
  /** 0..1 how durable the future role projection is (dynasty cares). */
  readonly roleDurability: number;
}

export interface FormatValue {
  readonly format: FantasyFormat;
  readonly multiplier: number;
  readonly adjustedValue: number;
  readonly drivers: readonly string[];
}

/** Apply a format's transparent multiplier to a base (format-neutral) value. */
export function formatAdjustedValue(base: number, format: FantasyFormat, p: PlayerValueProfile): FormatValue {
  let m = 1;
  const drivers: string[] = [];
  const rec = p.receptionsPerGame;
  switch (format) {
    case "full_ppr": if (rec > 0) { m *= 1 + 0.04 * rec; drivers.push(`+full-PPR receptions (${rec}/g)`); } break;
    case "half_ppr": if (rec > 0) { m *= 1 + 0.02 * rec; drivers.push(`+½-PPR receptions (${rec}/g)`); } break;
    case "standard": if (p.position === "RB") { m *= 1.05; drivers.push("+standard favors rush volume/TDs"); } break;
    case "superflex": if (p.position === "QB") { m *= 1.6; drivers.push("+superflex QB premium"); } break;
    case "te_premium": if (p.position === "TE") { m *= 1.25; drivers.push("+TE-premium bonus"); } break;
    case "best_ball": m *= 1 + 0.25 * p.ceiling - 0.05 * (1 - p.volatility); drivers.push("+ceiling/spike weeks; volatility tolerated"); break;
    case "dfs": m *= 1 + 0.2 * p.ceiling; drivers.push("+DFS ceiling"); break;
    case "guillotine": m *= 1 - 0.25 * p.volatility - 0.15 * p.fragility; drivers.push("−survival format penalizes volatility/fragility"); break;
    case "dynasty": m *= ageCurve(p) * (0.7 + 0.3 * p.roleDurability); drivers.push("×age curve × role durability"); break;
    case "keeper": m *= 0.5 * ageCurve(p) + 0.5; drivers.push("×partial age curve (hybrid horizon)"); break;
    case "shallow_bench": m *= 1 - 0.1 * (1 - p.roleDurability); drivers.push("−shallow benches punish speculative stashes"); break;
    case "deep_bench": m *= 1 + 0.08 * p.ceiling; drivers.push("+deep benches reward upside stashes"); break;
  }
  m = Math.max(0, m);
  return { format, multiplier: Number(m.toFixed(4)), adjustedValue: Number((base * m).toFixed(4)), drivers };
}

/** Simple age curve: position-aware peak, decline after. */
function ageCurve(p: PlayerValueProfile): number {
  const peak = p.position === "RB" ? 25 : p.position === "WR" ? 26 : p.position === "TE" ? 27 : 28;
  const decay = p.position === "RB" ? 0.06 : 0.035;
  return Math.max(0.4, 1 - decay * Math.abs(p.age - peak));
}

/** Value the same player across many formats at once, best-first. */
export function valueAcrossFormats(base: number, p: PlayerValueProfile, formats: readonly FantasyFormat[]): FormatValue[] {
  return formats.map((f) => formatAdjustedValue(base, f, p)).sort((a, b) => b.adjustedValue - a.adjustedValue);
}
