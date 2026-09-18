// Mirrors Odds::ImpliedProbability.percentage exactly (app/services/odds/
// implied_probability.rb) -- the same formula, so a value computed here is
// never a different number than the one the server would have shown.
export function impliedProbability(price) {
  const fraction = price > 0 ? 100 / (price + 100) : -price / (-price + 100)
  return Math.round(fraction * 1000) / 10
}
