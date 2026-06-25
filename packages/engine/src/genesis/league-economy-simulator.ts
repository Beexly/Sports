/**
 * GENESIS LAYER — League Economy Simulator (Invention 61).
 *
 * Simulates a specific league's micro-economy — waiver bids, FAAB aggression, trade acceptance,
 * roster hoarding, scarcity, manager psychology, playoff desperation — to predict what a target
 * actually costs and who wins it. Operates ONLY on explicitly provided, consented ManagerGenome
 * data; it never uses private league data on its own. Pure + deterministic. Executes nothing.
 */

import type { ManagerGenome } from "../fantasy/manager-dna-genome.js";

export interface LeagueEconomyInput {
  readonly managers: readonly ManagerGenome[];
  readonly playerValue: number;      // 0..1
  readonly positionScarcity: number; // 0..1
  readonly playoffWeek: boolean;
}

export interface ManagerBid {
  readonly managerId: string;
  readonly bidPct: number; // 0..1 of FAAB budget
}

export interface LeagueEconomyResult {
  readonly predictedWinningBidPct: number;
  readonly mostLikelyWinner: string | null;
  readonly bids: readonly ManagerBid[];
  readonly tradeAcceptanceLikelihood: number;
  readonly usedConsentedManagers: number;
  readonly note: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Simulate the league's FAAB/trade economy for one target. Consented managers only. */
export function simulateLeagueEconomy(i: LeagueEconomyInput): LeagueEconomyResult {
  const consented = i.managers.filter((m) => m.consentedDataProvided);
  if (consented.length === 0) {
    return { predictedWinningBidPct: 0, mostLikelyWinner: null, bids: [], tradeAcceptanceLikelihood: 0, usedConsentedManagers: 0, note: "No consented league data provided — no simulation run." };
  }
  const playoffAmp = i.playoffWeek ? 1.2 : 1;
  const bids: ManagerBid[] = consented
    .map((m) => {
      const bidPct = clamp01(i.playerValue * (0.3 + 0.7 * m.waiverAggression) * (1 - 0.4 * m.faabDiscipline) * (1 + 0.3 * i.positionScarcity) * playoffAmp);
      return { managerId: m.managerId, bidPct: Number(bidPct.toFixed(3)) };
    })
    .sort((a, b) => b.bidPct - a.bidPct);

  const winner = bids[0] ?? null;
  const tradeAcceptanceLikelihood = Number((consented.reduce((s, m) => s + m.tradeAggression, 0) / consented.length).toFixed(3));
  return {
    predictedWinningBidPct: winner?.bidPct ?? 0,
    mostLikelyWinner: winner?.managerId ?? null,
    bids,
    tradeAcceptanceLikelihood,
    usedConsentedManagers: consented.length,
    note: `Predicted winning FAAB ~${((winner?.bidPct ?? 0) * 100).toFixed(0)}% from ${winner?.managerId ?? "n/a"} (${consented.length} consented managers).`,
  };
}
