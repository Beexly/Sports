/**
 * Two-way de-vig. Both fair prices must sit at or below the raw implied prices.
 * 0.584 and 0.4202 are from different methods. They sum to 1.0042 and are not a price.
 */

export function americanImplied(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) throw new Error("american odds must be a non-zero finite number")
  const magnitude = Math.abs(odds)
  return odds < 0 ? magnitude / (magnitude + 100) : 100 / (odds + 100)
}

function fair(raw: readonly number[], fairPrices: readonly number[]): number[] {
  const sum = fairPrices.reduce((total, price) => total + price, 0)
  if (Math.abs(sum - 1) > 1e-9) throw new Error("fair prices must sum to 1")
  for (let i = 0; i < raw.length; i++) {
    if (fairPrices[i]! > raw[i]! + 1e-9) throw new Error("de-vig raised a price above its raw implied probability")
  }
  return fairPrices.slice()
}

/** Divide each implied price by the overround. */
export function multiplicativeDevig(odds: readonly number[]): number[] {
  const raw = odds.map(americanImplied)
  const overround = raw.reduce((total, price) => total + price, 0)
  if (overround <= 0) throw new Error("overround")
  return fair(raw, raw.map((price) => price / overround))
}

/** Solve k so the powered implied prices sum to 1. */
export function powerDevig(odds: readonly number[]): number[] {
  const raw = odds.map(americanImplied)
  let low = 0.05
  let high = 12
  for (let i = 0; i < 80; i++) {
    const k = (low + high) / 2
    const sum = raw.reduce((total, price) => total + price ** k, 0)
    if (sum > 1) low = k
    else high = k
  }
  const k = (low + high) / 2
  return fair(raw, raw.map((price) => price ** k))
}
