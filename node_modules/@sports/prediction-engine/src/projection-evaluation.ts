export interface ClarkWestSample {
  readonly actual: number;
  readonly modelPrediction: number;
  readonly marketPrediction: number;
}

export interface ClarkWestReport {
  readonly sampleSize: number;
  readonly modelMae: number;
  readonly marketMae: number;
  readonly adjustedMean: number;
  readonly tStatistic: number;
  readonly beatsMarket: boolean;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function clarkWestTest(samples: readonly ClarkWestSample[]): ClarkWestReport {
  const adjusted = samples.map((sample) => {
    const marketError = sample.actual - sample.marketPrediction;
    const modelError = sample.actual - sample.modelPrediction;
    const forecastGap = sample.marketPrediction - sample.modelPrediction;
    return marketError ** 2 - (modelError ** 2 - forecastGap ** 2);
  });
  const n = adjusted.length;
  const mean = n === 0 ? 0 : adjusted.reduce((sum, value) => sum + value, 0) / n;
  const variance =
    n <= 1 ? 0 : adjusted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  const tStatistic = variance === 0 ? 0 : mean / Math.sqrt(variance / n);
  const modelMae =
    n === 0
      ? 0
      : samples.reduce((sum, sample) => sum + Math.abs(sample.actual - sample.modelPrediction), 0) / n;
  const marketMae =
    n === 0
      ? 0
      : samples.reduce((sum, sample) => sum + Math.abs(sample.actual - sample.marketPrediction), 0) / n;

  return {
    sampleSize: n,
    modelMae: round4(modelMae),
    marketMae: round4(marketMae),
    adjustedMean: round4(mean),
    tStatistic: round4(tStatistic),
    beatsMarket: n >= 30 && mean > 0 && tStatistic > 1.64 && modelMae < marketMae,
  };
}
