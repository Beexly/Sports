/**
 * Walk-forward vs closing-line benchmark (W2).
 *
 * Source: benbr11/edgelabs — NFL winner model at 65.9% accuracy against an
 * ~66% closing-market benchmark. Model-vs-market parity demonstrated on
 * paper, with walk-forward validation and committed model cards.
 *
 * The closing line is the honesty benchmark for every GSE model.
 *
 * COMPOSES WITH: V2 holdout splitter, V5 submission schema.
 */

export interface WalkForwardSeasonResult {
  readonly season: number;
  readonly modelAcc: number;
  readonly closingAcc: number;
  readonly edge: number;
  readonly n: number;
}

export interface WalkForwardResult {
  readonly seasons: readonly WalkForwardSeasonResult[];
  readonly overall: {
    readonly modelAcc: number;
    readonly closingAcc: number;
    readonly edge: number;
    readonly n: number;
  };
  readonly modelCard: string;
}

export interface SeasonGame {
  readonly gameId: string;
  readonly season: number;
  readonly label: 0 | 1; // 1 = home won
  readonly features: Record<string, number>;
}

export type PredictFn = (games: readonly SeasonGame[]) => readonly number[];

export interface ClosingLines {
  /** Closing market implied probability of home win (de-vigged). */
  readonly [gameId: string]: number;
}

/**
 * Expanding-window walk-forward: train on seasons < t, predict season t,
 * never peeking. Returns per-season model accuracy vs closing-line accuracy.
 */
export function walkForwardSeasons(
  predictFn: PredictFn,
  games: readonly SeasonGame[],
  closingLines: ClosingLines,
  config?: { readonly modelId?: string; readonly dataWindow?: string },
): WalkForwardResult {
  const seasons = Array.from(new Set(games.map((g) => g.season))).sort((a, b) => a - b);
  const results: WalkForwardSeasonResult[] = [];

  for (let i = 1; i < seasons.length; i++) {
    const testSeason = seasons[i];
    const trainGames = games.filter((g) => g.season < testSeason);
    const testGames = games.filter((g) => g.season === testSeason);

    if (trainGames.length === 0 || testGames.length === 0) continue;

    // Predict test season using only training data
    const predictions = predictFn(trainGames);

    // Grade model accuracy (prediction > 0.5 = home win)
    let modelCorrect = 0;
    let closingCorrect = 0;
    let graded = 0;

    for (let j = 0; j < testGames.length; j++) {
      const game = testGames[j];
      const pred = predictions[j] ?? 0.5;
      const closing = closingLines[game.gameId];

      if (pred >= 0.5 && game.label === 1) modelCorrect++;
      else if (pred < 0.5 && game.label === 0) modelCorrect++;

      if (closing != null) {
        if (closing >= 0.5 && game.label === 1) closingCorrect++;
        else if (closing < 0.5 && game.label === 0) closingCorrect++;
      }
      graded++;
    }

    const modelAcc = graded > 0 ? modelCorrect / graded : 0;
    const closingAcc = graded > 0 ? closingCorrect / graded : 0;

    results.push({
      season: testSeason,
      modelAcc: Number(modelAcc.toFixed(4)),
      closingAcc: Number(closingAcc.toFixed(4)),
      edge: Number((modelAcc - closingAcc).toFixed(4)),
      n: graded,
    });
  }

  // Overall
  const totalN = results.reduce((a, r) => a + r.n, 0);
  const totalModelCorrect = results.reduce((a, r) => a + r.modelAcc * r.n, 0);
  const totalClosingCorrect = results.reduce((a, r) => a + r.closingAcc * r.n, 0);
  const overall = {
    modelAcc: totalN > 0 ? Number((totalModelCorrect / totalN).toFixed(4)) : 0,
    closingAcc: totalN > 0 ? Number((totalClosingCorrect / totalN).toFixed(4)) : 0,
    edge: totalN > 0 ? Number(((totalModelCorrect - totalClosingCorrect) / totalN).toFixed(4)) : 0,
    n: totalN,
  };

  // Model card
  const modelId = config?.modelId ?? "gse-model-v1";
  const dataWindow = config?.dataWindow ?? `${seasons[0]}–${seasons[seasons.length - 1]}`;
  const verdict = overall.edge >= 0
    ? "Model matches or exceeds closing-line benchmark."
    : `Model trails closing line by ${Math.abs(overall.edge * 100).toFixed(1)}pp.`;

  const modelCard = [
    `# Model Card: ${modelId}`,
    ``,
    `## Config`,
    `- Model ID: ${modelId}`,
    `- Data window: ${dataWindow}`,
    `- Validation: expanding-window walk-forward`,
    ``,
    `## Metrics`,
    `- Overall model accuracy: ${(overall.modelAcc * 100).toFixed(1)}%`,
    `- Overall closing-line accuracy: ${(overall.closingAcc * 100).toFixed(1)}%`,
    `- Edge: ${(overall.edge * 100).toFixed(1)}pp`,
    `- Graded games: ${overall.n}`,
    ``,
    `## Per-season`,
    ...results.map((r) => `- ${r.season}: model ${(r.modelAcc * 100).toFixed(1)}% vs closing ${(r.closingAcc * 100).toFixed(1)}% (edge ${r.edge > 0 ? "+" : ""}${(r.edge * 100).toFixed(1)}pp, n=${r.n})`),
    ``,
    `## Verdict`,
    verdict,
  ].join("\n");

  return { seasons: results, overall, modelCard };
}
