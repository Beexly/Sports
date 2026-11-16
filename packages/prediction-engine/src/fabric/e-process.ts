/**
 * Anytime-valid sequential martingale e-process gate for champion promotion.
 *
 * Mirrors `src/gse_engine/fabric/e_process.py`: maintains W_0 = 1 and updates
 * W_t = W_{t-1} * (1 + lambda_t * phi(loss_champion - loss_challenger)) using
 * strictly predictable F_{t-1}-measurable betting fractions lambda_t in [0, 1).
 */

export interface EProcessObservation {
  readonly step: number;
  readonly championLoss: number;
  readonly challengerLoss: number;
  readonly phi: number;
  readonly lambdaBet: number;
  readonly wealth: number;
  readonly invariantFailures: number;
}

export function boundedScoreTransform(scoreDiff: number, scale = 0.25): number {
  if (!Number.isFinite(scoreDiff) || !Number.isFinite(scale) || scale <= 0) {
    throw new Error("scoreDiff and positive scale must be finite");
  }
  const ratio = scoreDiff / scale;
  return Math.max(-1, Math.min(1, ratio));
}

export class SequentialEProcessGate {
  public readonly alpha: number;
  public readonly scoreScale: number;
  public readonly maxLambda: number;
  public readonly minLambda: number;
  public wealth = 1.0;
  public stepCount = 0;
  public invariantFailures = 0;
  public readonly history: EProcessObservation[] = [];

  private sumPhi = 0;
  private sumPhiSq = 0;

  constructor(options?: {
    alpha?: number;
    scoreScale?: number;
    maxLambda?: number;
    minLambda?: number;
  }) {
    const alpha = options?.alpha ?? 0.05;
    const scoreScale = options?.scoreScale ?? 0.25;
    const maxLambda = options?.maxLambda ?? 0.45;
    const minLambda = options?.minLambda ?? 0.01;
    if (alpha <= 0 || alpha >= 1) {
      throw new Error("alpha must lie strictly inside (0, 1)");
    }
    if (maxLambda <= 0 || maxLambda >= 1) {
      throw new Error("maxLambda must lie strictly inside (0, 1)");
    }
    this.alpha = alpha;
    this.scoreScale = scoreScale;
    this.maxLambda = maxLambda;
    this.minLambda = minLambda;
  }

  public get promotionThreshold(): number {
    return 1.0 / this.alpha;
  }

  public nextPredictableLambda(): number {
    if (this.stepCount < 3) {
      return Math.min(this.maxLambda, Math.max(this.minLambda, 0.08));
    }
    const n = this.stepCount;
    const meanPrev = this.sumPhi / n;
    const secondMoment = this.sumPhiSq / n;
    const varPrev = Math.max(0.04, secondMoment - meanPrev * meanPrev + 0.05);
    if (meanPrev <= 0) {
      return this.minLambda;
    }
    const kelly = (0.5 * meanPrev) / varPrev;
    return Math.max(this.minLambda, Math.min(this.maxLambda, kelly));
  }

  public step(
    championLoss: number,
    challengerLoss: number,
    invariantsOk = true,
  ): EProcessObservation {
    if (!Number.isFinite(championLoss) || !Number.isFinite(challengerLoss)) {
      throw new Error("championLoss and challengerLoss must be finite");
    }
    if (!invariantsOk) {
      this.invariantFailures += 1;
    }

    const lam = this.nextPredictableLambda();
    const diff = championLoss - challengerLoss;
    const phi = boundedScoreTransform(diff, this.scoreScale);
    const mult = Math.max(1e-12, 1.0 + lam * phi);
    this.wealth *= mult;
    this.stepCount += 1;
    this.sumPhi += phi;
    this.sumPhiSq += phi * phi;

    const obs: EProcessObservation = {
      step: this.stepCount,
      championLoss,
      challengerLoss,
      phi,
      lambdaBet: lam,
      wealth: this.wealth,
      invariantFailures: this.invariantFailures,
    };
    this.history.push(obs);
    return obs;
  }

  public canPromote(): boolean {
    return this.invariantFailures === 0 && this.wealth >= this.promotionThreshold;
  }
}
