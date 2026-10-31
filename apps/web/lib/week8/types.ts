export interface SealedRow {
  matchup: string;
  category: string;
  selection: string;
  decision: "PUBLISH" | "ABSTAIN" | "PASS";
  publishAllowed: boolean;
  model_p: number;
  market_p: number;
  edge: number;
  model_median: number;
  rationale: string;
  confidence_display?: string;
  market_line: number;
  trigger_odds?: number;
  fair_odds?: number;
}

export interface SealedBoard {
  seal_digest: string;
  generated_at: string;
  counts: { evaluated: number; publish: number; abstain: number; pass: number };
  main: SealedRow[];
  props: SealedRow[];
  passes: SealedRow[];
  watch: {
    one_q: SealedRow[];
    kicking: SealedRow[];
    idp: SealedRow[];
    atd: SealedRow[];
  };
}
