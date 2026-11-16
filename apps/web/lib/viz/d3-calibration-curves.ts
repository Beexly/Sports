/**
 * Deterministic D3-style reliability diagram binning, Expected Calibration
 * Error (ECE) computation, and SVG path serialization gated behind the
 * 200-settled-play calibration rule.
 */

export interface CalibrationSample {
  readonly predictedProb: number;
  readonly outcome: 0 | 1;
}

export interface ReliabilityBin {
  readonly binIndex: number;
  readonly lower: number;
  readonly upper: number;
  readonly count: number;
  readonly meanPredicted: number;
  readonly realizedRate: number;
  readonly absGap: number;
}

export interface ReliabilityDiagramModel {
  readonly bins: readonly ReliabilityBin[];
  readonly ece: number;
  readonly totalSamples: number;
  readonly winRateDisplayCleared: boolean;
  readonly svgPathD: string;
  readonly diagonalPathD: string;
}

const MIN_CALIBRATION_PLAYS_FOR_WIN_RATE = 200;

function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (domainMax === domainMin) {
    return rangeMin;
  }
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

/**
 * Computes equal-width calibration reliability bins, ECE, and SVG polyline
 * path coordinates over the `[0, 1]` probability domain.
 */
export function computeReliabilityDiagram(
  samples: readonly CalibrationSample[],
  numBins = 10,
  width = 320,
  height = 240,
): ReliabilityDiagramModel {
  const safeBins = Math.max(2, Math.min(20, Math.trunc(numBins)));
  const safeWidth = Math.max(40, width);
  const safeHeight = Math.max(40, height);

  const buckets: CalibrationSample[][] = Array.from({ length: safeBins }, () => []);
  for (const sample of samples) {
    const p = Number.isFinite(sample.predictedProb)
      ? Math.max(0, Math.min(1, sample.predictedProb))
      : 0.5;
    const rawIdx = Math.floor(p * safeBins);
    const binIdx = rawIdx >= safeBins ? safeBins - 1 : rawIdx;
    const bucket = buckets[binIdx];
    if (bucket) {
      bucket.push({
        predictedProb: p,
        outcome: sample.outcome === 1 ? 1 : 0,
      });
    }
  }

  const totalSamples = samples.length;
  let weightedGapSum = 0;
  const bins: ReliabilityBin[] = [];
  const pathCommands: string[] = [];

  for (let i = 0; i < safeBins; i += 1) {
    const lower = Number((i / safeBins).toFixed(4));
    const upper = Number(((i + 1) / safeBins).toFixed(4));
    const bucket = buckets[i] ?? [];
    const count = bucket.length;

    if (count === 0) {
      bins.push({
        binIndex: i,
        lower,
        upper,
        count: 0,
        meanPredicted: Number(((lower + upper) / 2).toFixed(4)),
        realizedRate: 0,
        absGap: 0,
      });
      continue;
    }

    const predSum = bucket.reduce((acc, item) => acc + item.predictedProb, 0);
    const outSum = bucket.reduce((acc, item) => acc + item.outcome, 0);
    const meanPredicted = predSum / count;
    const realizedRate = outSum / count;
    const absGap = Math.abs(realizedRate - meanPredicted);
    weightedGapSum += (count / Math.max(1, totalSamples)) * absGap;

    bins.push({
      binIndex: i,
      lower,
      upper,
      count,
      meanPredicted: Number(meanPredicted.toFixed(6)),
      realizedRate: Number(realizedRate.toFixed(6)),
      absGap: Number(absGap.toFixed(6)),
    });

    const x = scaleLinear(meanPredicted, 0, 1, 0, safeWidth).toFixed(2);
    const y = scaleLinear(realizedRate, 0, 1, safeHeight, 0).toFixed(2);
    pathCommands.push(`${pathCommands.length === 0 ? "M" : "L"} ${x} ${y}`);
  }

  const x0 = scaleLinear(0, 0, 1, 0, safeWidth).toFixed(2);
  const y0 = scaleLinear(0, 0, 1, safeHeight, 0).toFixed(2);
  const x1 = scaleLinear(1, 0, 1, 0, safeWidth).toFixed(2);
  const y1 = scaleLinear(1, 0, 1, safeHeight, 0).toFixed(2);

  return {
    bins,
    ece: Number(weightedGapSum.toFixed(6)),
    totalSamples,
    winRateDisplayCleared: totalSamples >= MIN_CALIBRATION_PLAYS_FOR_WIN_RATE,
    svgPathD: pathCommands.join(" "),
    diagonalPathD: `M ${x0} ${y0} L ${x1} ${y1}`,
  };
}
