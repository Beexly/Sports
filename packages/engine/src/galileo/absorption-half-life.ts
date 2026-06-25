/**
 * GSE GALILEO — Absorption Half-Life (Invention 3).
 *
 * Re-exports the tested shock-absorption event study and adds the minutes-scaled summary the
 * spec asks for: absorption_half_life_minutes and per-market/book stale_window_minutes — "how
 * long did truth take to travel through this market, and which book stayed off it longest."
 * Pure.
 */

export * from "../market-physics/shock-absorption.js";
import type { ShockStudyResult, MarketShockPath } from "../market-physics/shock-absorption.js";

export interface AbsorptionSummary {
  readonly market: string;
  readonly absorptionHalfLifeMinutes: number | null;
  readonly moveMagnitude: number;
  readonly firstBookToMove: string | null;
  readonly laggingBooks: readonly string[];
  readonly reaction: MarketShockPath["reaction"];
}

export interface ShockAbsorptionReport {
  readonly firstMarketToMove: string | null;
  readonly laggingMarkets: readonly string[];
  readonly markets: readonly AbsorptionSummary[];
  /** "Market X absorbed the new reality slowly; candidate stale window exists." */
  readonly staleWindowCandidates: ReadonlyArray<{ market: string; minutes: number; book: string | null }>;
}

const toMin = (msVal: number | null): number | null => (msVal == null ? null : Math.round((msVal / 60_000) * 100) / 100);

/** Convert a ShockStudyResult into a minutes-scaled, human-facing absorption report. */
export function summarizeAbsorption(result: ShockStudyResult, staleThresholdMin = 5): ShockAbsorptionReport {
  const markets: AbsorptionSummary[] = result.paths.map((p) => ({
    market: p.market,
    absorptionHalfLifeMinutes: toMin(p.halfLifeMs),
    moveMagnitude: p.magnitude,
    firstBookToMove: p.firstBookToMove,
    laggingBooks: p.laggingBooks,
    reaction: p.reaction,
  }));
  // A stale-window candidate: a market that moved but whose half-life is long, or that has
  // lagging books — the window where one book sat off the new reality.
  const staleWindowCandidates = markets
    .filter((m) => (m.absorptionHalfLifeMinutes ?? 0) >= staleThresholdMin || m.laggingBooks.length > 0)
    .map((m) => ({ market: m.market, minutes: m.absorptionHalfLifeMinutes ?? 0, book: m.laggingBooks[0] ?? m.firstBookToMove }));

  return {
    firstMarketToMove: result.firstMarketToMove,
    laggingMarkets: result.laggingMarkets,
    markets,
    staleWindowCandidates,
  };
}
