/**
 * Probability-display discipline helper (model vs market vs price).
 *
 * Engine-honesty rule for every posted pick and site surface: always label
 * "model probability" vs "market-implied probability" vs "price" as three
 * distinct numbers, attach line source / timestamp / liquidity caveat, state
 * settlement rules, and pair every probability chart with a one-line
 * plain-language context line. This is the pure formatting/validation
 * helper enforcing that discipline; the engagement gate is measured offline.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2608.16814v1 — Prediction market visualizations, betting,
 * and uncertainty (probability-display discipline).
 *
 * ACCEPTANCE GATE: adopt if the labeled format cuts clarification-question
 * replies by >= 25% with no engagement drop.
 */

export interface DisplayPick {
  /** Model probability (0-1). */
  readonly modelProb: number;
  /** Market-implied probability (0-1). */
  readonly marketProb: number;
  /** Posted price (decimal odds or line string). */
  readonly price: string;
  /** Line source, e.g. "Book X". */
  readonly source: string;
  /** Line timestamp (ISO). */
  readonly timestamp: string;
  /** Liquidity caveat, e.g. "low limits". */
  readonly liquidity?: string;
  /** Settlement rules, e.g. "OT counts". */
  readonly settlement: string;
}

export interface LabeledDisplay {
  readonly lines: string[];
  /** True when every required label is present and distinct. */
  readonly valid: boolean;
  /** Missing-label diagnostics (empty when valid). */
  readonly issues: string[];
}

/** Validate that the three numbers are labeled distinctly and completely. */
export function validateDisplay(pick: DisplayPick): string[] {
  const issues: string[] = [];
  if (!(pick.modelProb >= 0 && pick.modelProb <= 1)) issues.push("modelProb not in [0,1]");
  if (!(pick.marketProb >= 0 && pick.marketProb <= 1)) issues.push("marketProb not in [0,1]");
  if (!pick.price.trim()) issues.push("price missing");
  if (!pick.source.trim()) issues.push("source missing");
  if (!pick.timestamp.trim()) issues.push("timestamp missing");
  if (!pick.settlement.trim()) issues.push("settlement missing");
  if (Math.abs(pick.modelProb - pick.marketProb) < 1e-12 && pick.price.trim()) {
    issues.push("model and market probabilities identical: label which is which anyway");
  }
  return issues;
}

/** Render the labeled pick card lines (three distinct numbers + caveats). */
export function renderLabeledPick(pick: DisplayPick): LabeledDisplay {
  const issues = validateDisplay(pick);
  const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
  const lines = [
    `Model probability: ${pct(pick.modelProb)}`,
    `Market-implied probability: ${pct(pick.marketProb)}`,
    `Price: ${pick.price} (via ${pick.source}, ${pick.timestamp})`,
    `Settlement: ${pick.settlement}`,
  ];
  if (pick.liquidity?.trim()) lines.push(`Liquidity: ${pick.liquidity}`);
  const edge = pick.modelProb - pick.marketProb;
  lines.push(
    `Context: our model is ${Math.abs(edge * 100).toFixed(1)}pp ` +
      `${edge >= 0 ? "above" : "below"} the market on this side.`,
  );
  return { lines, valid: issues.length === 0, issues };
}
