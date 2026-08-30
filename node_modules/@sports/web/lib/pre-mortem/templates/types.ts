/**
 * Pre-mortem template types.
 *
 * Codex tightens the type imports during integration. The shapes below are
 * the spec's contract from docs/product/pre-mortem-pipeline-spec.md.
 */

// Codex: replace with actual type imports during wiring.
// import type { Pick, PickSignalSnapshot } from "@/types";

export type FactorKey =
  | "consensus"
  | "depth"
  | "edge"
  | "lineMovement"
  | "volatility"
  | "headToHead"
  | "venueForm"
  | "scheduleStress"
  | "restAdvantage"
  | "crossMarket"
  | "dataQuality";

// Placeholder shapes — Codex aligns with the actual Prisma-derived types
// during integration.
export interface PickSignalSnapshotInput {
  factors: Partial<Record<FactorKey, number>>;
  modelVersion: string;
}

export interface PickInput {
  id: string;
  gameId: string;
  pickKind: string;
  line: string;
  side: string;
  confidence: number;
  modelVersion: string;
}

export interface GameInput {
  homeTeamShort: string;
  awayTeamShort: string;
  sport: string;
}

export interface FailureModeTemplate {
  factorKey: FactorKey;
  severityRank: number;
  triggerCondition: (snapshot: PickSignalSnapshotInput) => boolean;
  generateBullet: (
    snapshot: PickSignalSnapshotInput,
    pick: PickInput,
    game: GameInput,
  ) => string;
}
