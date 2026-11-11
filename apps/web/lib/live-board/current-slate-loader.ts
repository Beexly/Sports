import week10Commitment from "../../../../data/public-ledger/week10_prekickoff_commitment.json";
import glassLedger from "../../../../data/public-ledger/glass_ledger_reconciled_2026.json";
import week10Projections from "../../../../data/projections/week10_unified_conserved_stat_projections_2026_11_10.json";
import historicalSealedBoard from "@/lib/week8/sealed-board.json";
import type { SealedBoard } from "@/lib/week8/types";

export interface Week10GameCommitment {
  event_id: string;
  matchup: string;
  kickoff_utc: string;
  effective_at_utc: string;
  market_home_spread: number;
  market_total: number;
  black_litterman_posterior_home_margin: number;
  black_litterman_posterior_total: number;
  lattice_home_win_prob: number;
  lattice_away_win_prob: number;
  decision: string;
  publishAllowed: boolean;
  leaf_sha256: string;
}

export interface CurrentSlateSnapshot {
  activeWeek: number;
  season: number;
  sealedAtUtc: string;
  firstKickoffUtc: string;
  merkleRootSha256: string;
  ledgerSha256: string;
  gamesCount: number;
  playersCount: number;
  tnfGame: Week10GameCommitment;
  games: readonly Week10GameCommitment[];
  scopes: typeof glassLedger.scopes;
  componentLegs: typeof glassLedger.component_legs;
  calibrationMetrics: typeof glassLedger.calibration_metrics;
  settledCardArchive: SealedBoard;
}

export function isWindowOpenBeforeKickoff(kickoffUtc: string, nowIso?: string): boolean {
  const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
  const koMs = Date.parse(kickoffUtc);
  if (Number.isNaN(nowMs) || Number.isNaN(koMs)) {
    return true;
  }
  return nowMs < koMs;
}

export function getCurrentWeek10Slate(): CurrentSlateSnapshot {
  const games = week10Commitment.games as Week10GameCommitment[];
  const tnfGame = games[0]!;
  return {
    activeWeek: week10Commitment.week,
    season: week10Commitment.season,
    sealedAtUtc: week10Commitment.sealed_at_utc,
    firstKickoffUtc: week10Commitment.first_kickoff_utc,
    merkleRootSha256: week10Commitment.merkle_root_sha256,
    ledgerSha256: glassLedger.ledger_sha256,
    gamesCount: week10Commitment.games_count,
    playersCount: week10Projections.players_count,
    tnfGame,
    games,
    scopes: glassLedger.scopes,
    componentLegs: glassLedger.component_legs,
    calibrationMetrics: glassLedger.calibration_metrics,
    settledCardArchive: historicalSealedBoard as unknown as SealedBoard,
  };
}
