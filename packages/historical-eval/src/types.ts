export type HistDecisionKind = "FIRE" | "NO_BET" | "NOT_EVALUABLE";

export type HistNoBetReason =
  | "INSUFFICIENT_SAMPLE"
  | "NO_BET_WIDTH"
  | "NO_BET_LCB"
  | "STALE_OR_MISSING_ODDS"
  | "PLACEABLE"
  | "HANDICAP"
  | "PRICE_Q"
  | "PROVENANCE"
  | "OTHER";

export interface HistStratumKey {
  sport: string;
  market: string;
  modelVersion: string;
  year?: number;
}

export function formatStratumKey(k: HistStratumKey): string {
  const base = `${k.sport}|${k.market}|${k.modelVersion}`;
  return k.year != null ? `${base}|Y${k.year}` : base;
}

export interface HistOddsQuote {
  fetchedAt: Date;
  q: number;
  decimalOdds?: number;
  spread?: number | null;
}

export interface HistCalibrationRow {
  decisionTime: Date;
  score: number;
  label: 0 | 1;
  stratum: HistStratumKey;
}

export interface HistCandidate {
  id: string;
  decisionTime: Date;
  score: number;
  stratum: HistStratumKey;
  quote: HistOddsQuote | null;
  placeable: boolean;
  handicapOk: boolean;
  label?: 0 | 1;
}

export interface MultiprobInterval {
  lo: number;
  hi: number;
  method: string;
}

export interface HistDecisionRecord {
  candidateId: string;
  decisionTime: string;
  stratumKey: string;
  kind: HistDecisionKind;
  reasons: HistNoBetReason[];
  interval?: MultiprobInterval;
  q?: number;
  edgeLcb?: number;
  summary: string;
}
