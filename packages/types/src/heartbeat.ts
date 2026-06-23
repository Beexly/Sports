export type GameSettledStage = "DATA" | "FORECAST" | "PROOF" | "UNLOCK";

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
