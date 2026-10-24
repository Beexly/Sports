/**
 * Four ways to take the book's cut out of a posted price.
 * Every fair price must sit at or below the raw implied price and the vector must sum to 1.
 * 0.584 and 0.4202 are from different methods. They sum to 1.0042 and are not a price.
 */

export function americanImplied(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) throw new Error("american odds must be a non-zero finite number")
  const magnitude = Math.abs(odds)
  return odds < 0 ? magnitude / (magnitude + 100) : 100 / (odds + 100)
}

function fair(raw: readonly number[], fairPrices: readonly number[]): number[] {
  const sum = fairPrices.reduce((total, price) => total + price, 0)
  if (Math.abs(sum - 1) > 1e-8) throw new Error("fair prices must sum to 1")
  for (let i = 0; i < raw.length; i++) {
    if (fairPrices[i]! < -1e-9) throw new Error("de-vig produced a negative price")
    if (fairPrices[i]! > raw[i]! + 1e-8) throw new Error("de-vig raised a price above its raw implied probability")
  }
  return fairPrices.slice()
}

function solveRoot(low: number, high: number, sumAt: (value: number) => number): number {
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2
    if (sumAt(mid) > 1) low = mid
    else high = mid
  }
  return (low + high) / 2
}

function rawOf(odds: readonly number[]): number[] {
  const raw = odds.map(americanImplied)
  if (raw.reduce((total, price) => total + price, 0) <= 1) throw new Error("book is not overround")
  return raw
}

/** Divide each implied price by the overround. Same fraction off every side. */
export function multiplicativeDevig(odds: readonly number[]): number[] {
  const raw = rawOf(odds)
  const overround = raw.reduce((total, price) => total + price, 0)
  return fair(raw, raw.map((price) => price / overround))
}

/** Take the same number of probability points off every side. Two-way Shin is this method. */
export function additiveDevig(odds: readonly number[]): number[] {
  const raw = rawOf(odds)
  const share = (raw.reduce((total, price) => total + price, 0) - 1) / raw.length
  return fair(raw, raw.map((price) => price - share))
}

function shinPrices(raw: readonly number[], overround: number, z: number): number[] {
  return raw.map((price) => {
    const inside = z * z + (4 * (1 - z) * price * price) / overround
    return (Math.sqrt(inside) - z) / (2 * (1 - z))
  })
}

/** Shin's insider share. Solved so the fair prices sum to 1. */
export function shinInsiderShare(odds: readonly number[]): number {
  const raw = rawOf(odds)
  const overround = raw.reduce((total, price) => total + price, 0)
  return solveRoot(1e-12, 0.999, (z) => shinPrices(raw, overround, z).reduce((total, price) => total + price, 0))
}

/** Shin (1993). Matches additive on two outcomes. Diverges once a third outcome exists. */
export function shinDevig(odds: readonly number[]): number[] {
  const raw = rawOf(odds)
  const overround = raw.reduce((total, price) => total + price, 0)
  return fair(raw, shinPrices(raw, overround, shinInsiderShare(odds)))
}

/** The exponent the power method had to solve. It is not assumed to be 2. */
export function powerExponent(odds: readonly number[]): number {
  const raw = rawOf(odds)
  return solveRoot(0.05, 12, (k) => raw.reduce((total, price) => total + price ** k, 0))
}

/** Solve k so the powered implied prices sum to 1. */
export function powerDevig(odds: readonly number[]): number[] {
  const raw = rawOf(odds)
  const k = powerExponent(odds)
  return fair(raw, raw.map((price) => price ** k))
}

export type DevigBook = {
  raw: number[]
  overround: number
  multiplicative: number[]
  additive: number[]
  power: number[]
  powerK: number
  shin: number[]
  shinZ: number
}

/** All four fair books for one posted market. None of them is a pick. */
export function compareDevig(odds: readonly number[]): DevigBook {
  const raw = rawOf(odds)
  return {
    raw,
    overround: raw.reduce((total, price) => total + price, 0),
    multiplicative: multiplicativeDevig(odds),
    additive: additiveDevig(odds),
    power: powerDevig(odds),
    powerK: powerExponent(odds),
    shin: shinDevig(odds),
    shinZ: shinInsiderShare(odds),
  }
}
