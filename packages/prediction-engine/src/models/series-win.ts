/**
 * Best-of series win probability.
 *
 * Prior art, not copied code: hfepbook1/bayesian-sports-analytics has no
 * licence. app.py sets p = 1 / (1 + exp(ratingB - ratingA)) and draws a
 * binomial number of wins in a best-of-7. This is the exact probability
 * of reaching the wins required, not a simulation.
 */

function binomialCoefficient(n: number, k: number): number {
  let acc = 1;
  for (let i = 1; i <= k; i += 1) {
    acc = (acc * (n - k + i)) / i;
  }
  return acc;
}

export function seriesWinProbability(
  ratingA: number,
  ratingB: number,
  bestOf = 7,
): number {
  if (!Number.isFinite(ratingA) || !Number.isFinite(ratingB)) {
    throw new Error("ratings must be finite");
  }
  if (!Number.isInteger(bestOf) || bestOf < 1 || bestOf % 2 === 0) {
    throw new Error("best-of length must be a positive odd integer");
  }
  const p = 1 / (1 + Math.exp(ratingB - ratingA));
  const need = Math.floor(bestOf / 2) + 1;
  let acc = 0;
  for (let wins = need; wins <= bestOf; wins += 1) {
    acc += binomialCoefficient(bestOf, wins) * p ** wins * (1 - p) ** (bestOf - wins);
  }
  return acc;
}
