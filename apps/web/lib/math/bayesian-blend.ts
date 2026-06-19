/**
 * Bayesian model-vs-market blend — pure math, zero dependencies.
 * Attribution: Pattern from openthomas (MIT, github.com/realworkagent/openthomas)
 *
 * Core formula: p_blend = (1 − λ) · p_model + λ · p_market
 * where λ is the market trust weight (0 = pure model, 1 = pure market).
 *
 * Rationale: A calibrated model with edge still benefits from market information.
 * As market efficiency increases (more sharp action), λ increases toward 1.
 * The blend is a weighted convex combination, always in [0,1].
 */

export interface BlendInput {
  /** Model-estimated win probability (0–1) */
  modelProb: number;
  /** Market-implied no-vig probability (0–1), e.g. from shin-devig or consensusNoVig */
  marketProb: number;
  /** Market trust weight λ ∈ [0,1].
   *  0 = use model only; 1 = use market only; ~0.3–0.5 is typical for a calibrated model. */
  marketWeight: number;
}

export interface BlendResult {
  /** Blended probability — the signal used for pick scoring */
  blendedProb: number;
  /** Component breakdown for transparency */
  modelContribution: number;
  marketContribution: number;
  /** True if model and market substantially disagree (|model − market| > 0.07) */
  significantDisagreement: boolean;
}

/**
 * Blend a model probability with a market probability using a weighted convex combination.
 * Both inputs must be in [0,1]; marketWeight must be in [0,1].
 */
export function bayesianBlend(input: BlendInput): BlendResult {
  const { modelProb, marketProb, marketWeight } = input;

  const clampedModel = Math.max(0, Math.min(1, modelProb));
  const clampedMarket = Math.max(0, Math.min(1, marketProb));
  const clampedWeight = Math.max(0, Math.min(1, marketWeight));

  const modelContribution = (1 - clampedWeight) * clampedModel;
  const marketContribution = clampedWeight * clampedMarket;
  const blendedProb = modelContribution + marketContribution;

  return {
    blendedProb,
    modelContribution,
    marketContribution,
    significantDisagreement: Math.abs(clampedModel - clampedMarket) > 0.07,
  };
}

/**
 * Determine the market weight λ dynamically based on market efficiency signals.
 * Higher efficiency (tight spread, high volume, post-sharp-action) → higher λ.
 *
 * @param inputs Signals about current market efficiency
 * @returns Recommended λ in [0,1]
 */
export function estimateMarketWeight({
  isMarketEfficient = false,
  hasSharpAction = false,
  hoursToGame = 24,
}: {
  isMarketEfficient?: boolean;
  hasSharpAction?: boolean;
  hoursToGame?: number;
}): number {
  // Base weight
  let weight = 0.3;

  // Efficient market → trust market more
  if (isMarketEfficient) weight += 0.15;

  // Sharp action detected → market has absorbed information
  if (hasSharpAction) weight += 0.15;

  // Close to game time → market is maximally informed
  if (hoursToGame < 2) weight += 0.2;
  else if (hoursToGame < 6) weight += 0.1;

  return Math.min(0.8, weight); // cap at 0.8 — never fully surrender to market
}
