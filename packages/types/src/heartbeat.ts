export const GAME_SETTLED_STAGES = ["DATA", "FORECAST", "PROOF", "UNLOCK"] as const;
export type GameSettledStage = (typeof GAME_SETTLED_STAGES)[number];

export interface GameSettledScoreline {
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homePoints: number;
  readonly awayPoints: number;
}

export interface GameSettledEvent {
  readonly id: string;
  readonly type: "GAME_SETTLED";
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly gameId: string;
  readonly league: string;
  readonly season: number;
  readonly week: number;
  readonly scoreline: GameSettledScoreline;
  readonly modelVersion: string;
  readonly completedStages: readonly GameSettledStage[];
}

export interface GameSettledFanoutLedgerEntry {
  readonly id: string;
  readonly sourceEventId: string;
  readonly idempotencyKey: string;
  readonly stage: GameSettledStage;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly modelVersion: string;
}
