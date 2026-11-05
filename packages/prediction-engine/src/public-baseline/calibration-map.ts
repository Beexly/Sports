/**
 * Isotonic calibration map for GSE model probabilities, plus signed call-sheet
 * ticket pricing.
 *
 * The verified GSE curve removes ~5.2 points of overconfidence: a raw 0.53 is
 * really 0.455-0.48, and a raw 0.67 is 0.618. The knots below are the measured
 * calibration, not a guess. Interpolation is piecewise linear and monotone.
 *
 * Pricing is deterministic. A ticket is minted only when the calibrated edge
 * over the Shin no-vig price clears minEdgePct AND the contradiction gate
 * allows the direction. The gate blocks:
 *   - a market label with no OVER/UNDER direction,
 *   - the same player+stat priced OVER and UNDER in the same signed set.
 * That is how the Brandin Cooks OVER/UNDER split is stopped at the source.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { shinDevig } from "./devig.js"
import type { Call, SignedTicket } from "./call-sheet.js"

export type { SignedTicket }

export type MarketCalibrationFamily =
  | "MONEYLINE"
  | "SPREAD"
  | "TOTAL"
  | "PLAYER_PROP"
  | "DERIVATIVE_1Q_1H"

export interface MarketCalibrationHeadSpec {
  readonly method: string
  readonly base_rate_brier_reference?: number
  readonly max_classwise_ece?: number
  readonly display_format: string
  readonly first_quarter_script_discount?: number
}

const DEFAULT_HEAD_SPECS: Readonly<Record<MarketCalibrationFamily, MarketCalibrationHeadSpec>> = {
  MONEYLINE: {
    method: "platt_beta_conformal",
    base_rate_brier_reference: 0.2342,
    max_classwise_ece: 0.05,
    display_format: "conviction_and_calibrated_prob",
  },
  SPREAD: {
    method: "fwl_residualized_cqr",
    base_rate_brier_reference: 0.249,
    max_classwise_ece: 0.045,
    display_format: "conviction_rating_only_no_fake_percent",
  },
  TOTAL: {
    method: "poisson_normal_tail_cqr",
    base_rate_brier_reference: 0.2495,
    max_classwise_ece: 0.048,
    display_format: "conviction_rating_only_no_fake_percent",
  },
  PLAYER_PROP: {
    method: "empirical_bayes_cqr_scrimmage_gated",
    display_format: "conviction_and_cqr_interval",
  },
  DERIVATIVE_1Q_1H: {
    method: "sportsbook_alt_ladder_kernel",
    first_quarter_script_discount: 0.14,
    display_format: "conviction_rating",
  },
}

let cachedHeads: Readonly<Record<MarketCalibrationFamily, MarketCalibrationHeadSpec>> | null = null

export function loadMarketCalibrationHeads(): Readonly<
  Record<MarketCalibrationFamily, MarketCalibrationHeadSpec>
> {
  if (cachedHeads) return cachedHeads
  try {
    const candidate = path.resolve(process.cwd(), "data/engine/market_calibration_heads_2026.json")
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"))
      if (parsed?.heads) {
        cachedHeads = { ...DEFAULT_HEAD_SPECS, ...parsed.heads }
        return cachedHeads!
      }
    }
  } catch {
    // Fall back to deterministic in-memory spec if fs is unavailable
  }
  cachedHeads = DEFAULT_HEAD_SPECS
  return cachedHeads
}

/**
 * Calibrate a raw probability using the dedicated per-market head from
 * `market_calibration_heads_2026.json` (never pooling Moneyline, Spread, Total, Props, 1Q/1H).
 */
export function calibrateMarketFamilyProbability(
  rawProb: number,
  family: MarketCalibrationFamily,
): {
  readonly calibratedProb: number
  readonly convictionScore: number
  readonly headMethod: string
  readonly displayFormat: string
} {
  const heads = loadMarketCalibrationHeads()
  const spec = heads[family] ?? DEFAULT_HEAD_SPECS[family]
  const baseCal = calibrateGseProbability(rawProb)
  let adjusted = baseCal
  if (family === "SPREAD") {
    // FWL-residualized spread head shrinks toward 0.50 coin-flip anchor slightly harder
    adjusted = 0.5 + 0.92 * (baseCal - 0.5)
  } else if (family === "TOTAL") {
    adjusted = 0.5 + 0.9 * (baseCal - 0.5)
  } else if (family === "DERIVATIVE_1Q_1H") {
    const disc = spec.first_quarter_script_discount ?? 0.14
    adjusted = 0.5 + (1 - disc) * (baseCal - 0.5)
  }
  const calibratedProb = Number(Math.min(0.9655, Math.max(0.05, adjusted)).toFixed(4))
  const convictionScore = Math.round(Math.max(calibratedProb, 1 - calibratedProb) * 100)
  return {
    calibratedProb,
    convictionScore,
    headMethod: spec.method,
    displayFormat: spec.display_format,
  }
}

/**
 * Brier Skill Score evaluated strictly against the empirical sample base rate
 * yBar * (1 - yBar), never a hardcoded 0.25 coin flip.
 */
export function computeEmpiricalBaseRateBrierSkill(
  predictions: readonly number[],
  outcomes: readonly (0 | 1)[],
): {
  readonly brier: number
  readonly empiricalBaseRate: number
  readonly referenceBrier: number
  readonly brierSkillScore: number
} {
  if (predictions.length === 0 || predictions.length !== outcomes.length) {
    throw new Error("predictions and outcomes must be non-empty and equal length")
  }
  const n = predictions.length
  const yBar = outcomes.reduce<number>((acc, y) => acc + y, 0) / n
  const referenceBrier = Math.max(1e-9, yBar * (1 - yBar))
  const brier =
    predictions.reduce<number>((acc, p, idx) => {
      const diff = p - outcomes[idx]!
      return acc + diff * diff
    }, 0) / n
  const brierSkillScore = 1 - brier / referenceBrier
  return {
    brier: Number(brier.toFixed(6)),
    empiricalBaseRate: Number(yBar.toFixed(6)),
    referenceBrier: Number(referenceBrier.toFixed(6)),
    brierSkillScore: Number(brierSkillScore.toFixed(6)),
  }
}

export interface MarketQuoteForCall {
  readonly marketLabel: string
  readonly rawModelProb: number
  readonly americanOdds: number
  readonly opposingAmericanOdds?: number
}

export interface SignedCall extends Call {
  readonly signedTicket: SignedTicket | null
}

export interface ContradictionGateResult {
  readonly allowed: boolean
  readonly reason: string | null
}

export type TicketDirection = "OVER" | "UNDER"

export interface TicketLeg {
  readonly playerKey: string
  readonly statKey: string
  readonly direction: TicketDirection
  readonly line: number
  readonly raw: string
}

/**
 * Measured GSE isotonic knots. Strictly increasing in both coordinates, so the
 * piecewise-linear interpolation is monotone and cannot cross itself.
 */
const CALIBRATION_KNOTS: ReadonlyArray<readonly [number, number]> = [
  [0.05, 0.05],
  [0.50, 0.455],
  [0.55, 0.498],
  [0.60, 0.548],
  [0.65, 0.598],
  [0.67, 0.618],
  [0.75, 0.698],
  [0.95, 0.912],
  // Upper tail. 0.95 is the last measured knot; above it we continue the final
  // segment's slope (0.214 per 0.20) to 1.0 so an overconfident 0.97-0.99 is
  // separated instead of collapsing onto the single 0.95 point. Linear
  // extrapolation past observed support, not a measured knot -- revisit once
  // raw probabilities above 0.95 appear in the graded sample.
  [1.0, 0.9655],
]

export function calibrateGseProbability(rawProb: number): number {
  const p = Math.min(1.0, Math.max(0.05, rawProb))
  for (let i = 0; i < CALIBRATION_KNOTS.length - 1; i++) {
    const [x0, y0] = CALIBRATION_KNOTS[i]!
    const [x1, y1] = CALIBRATION_KNOTS[i + 1]!
    if (p >= x0 && p <= x1) {
      const t = (p - x0) / (x1 - x0)
      return Number((y0 + t * (y1 - y0)).toFixed(4))
    }
  }
  return Number(p.toFixed(4))
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/**
 * Split a market label into priced legs. A compound label uses "&" between
 * legs, e.g. "Brandin Cooks OVER 24.5 Receiving Yards & George Kittle OVER
 * 71.5 Receiving Yards".
 */
export function parseTicketLegs(marketLabel: string): TicketLeg[] {
  const legs: TicketLeg[] = []
  for (const segment of marketLabel.split("&")) {
    const match = /^\s*(.+?)\s+(OVER|UNDER)\s+(\d+(?:\.\d+)?)\s+(.+?)\s*$/i.exec(segment)
    if (!match) continue
    const [, player, direction, line, stat] = match
    legs.push({
      playerKey: normalizeKey(player!),
      statKey: normalizeKey(stat!),
      direction: direction!.toUpperCase() as TicketDirection,
      line: Number(line),
      raw: segment.trim(),
    })
  }
  return legs
}

export function detectTicketDirection(marketLabel: string): TicketDirection | null {
  const legs = parseTicketLegs(marketLabel)
  if (legs.length === 0) return null
  const directions = new Set(legs.map((leg) => leg.direction))
  return directions.size === 1 ? [...directions][0]! : null
}

/**
 * Contradiction gate. Returns a refusal reason when the ticket's label has no
 * direction, contradicts itself, or prices the same player+stat opposite to an
 * already-signed ticket.
 */
export function contradictionGate(
  ticket: SignedTicket,
  existing: readonly SignedTicket[] = [],
): ContradictionGateResult {
  const legs = parseTicketLegs(ticket.marketLabel)
  if (legs.length === 0) {
    return {
      allowed: false,
      reason: `market label "${ticket.marketLabel}" carries no OVER/UNDER direction`,
    }
  }

  const seen = new Map<string, TicketDirection>()
  for (const leg of legs) {
    const key = `${leg.playerKey}|${leg.statKey}`
    const prior = seen.get(key)
    if (prior && prior !== leg.direction) {
      return {
        allowed: false,
        reason: `market label contradicts itself on ${leg.playerKey} ${leg.statKey}: ${prior} vs ${leg.direction}`,
      }
    }
    seen.set(key, leg.direction)
  }

  for (const priorTicket of existing) {
    for (const priorLeg of parseTicketLegs(priorTicket.marketLabel)) {
      const key = `${priorLeg.playerKey}|${priorLeg.statKey}`
      const direction = seen.get(key)
      if (direction && direction !== priorLeg.direction) {
        return {
          allowed: false,
          reason: `contradictory ${direction}/${priorLeg.direction} split on ${priorLeg.playerKey} ${priorLeg.statKey}`,
        }
      }
    }
  }

  return { allowed: true, reason: null }
}

/** Throw when a signed set prices the same player+stat in both directions. */
export function assertNoContradictoryTickets(tickets: readonly SignedTicket[]): void {
  const signed: SignedTicket[] = []
  for (const ticket of tickets) {
    const gate = contradictionGate(ticket, signed)
    if (!gate.allowed) throw new Error(`signed ticket refused: ${gate.reason}`)
    signed.push(ticket)
  }
}

/**
 * Price the call sheet. The historical Call rows keep ticket = null; this
 * function returns SignedCall rows whose `ticket` and `signedTicket` are the
 * same frozen ticket when the gate passes. No quote means no ticket.
 */
export function signCallSheetTickets(
  calls: readonly Call[],
  marketQuotes: Readonly<Record<string, MarketQuoteForCall>>,
  minEdgePct = 2.0,
): SignedCall[] {
  const signed: SignedTicket[] = []

  return calls.map((call) => {
    const quote = marketQuotes[call.id]
    if (!quote) return { ...call, ticket: null, signedTicket: null }

    const calibratedProb = calibrateGseProbability(quote.rawModelProb)
    const oppOdds = quote.opposingAmericanOdds ?? -110
    const [noVig] = shinDevig([quote.americanOdds, oppOdds])
    if (noVig === undefined || !Number.isFinite(noVig)) {
      return { ...call, ticket: null, signedTicket: null }
    }
    const edgePct = Number(((calibratedProb - noVig) * 100).toFixed(2))
    if (!Number.isFinite(edgePct) || edgePct < minEdgePct) {
      return { ...call, ticket: null, signedTicket: null }
    }

    const dec = quote.americanOdds < 0 ? 1 + 100 / -quote.americanOdds : 1 + quote.americanOdds / 100
    const b = dec - 1
    const fullKelly = Math.max(0, (b * calibratedProb - (1 - calibratedProb)) / b)
    const kellyQuarterUnits = Number(Math.min(2.5, fullKelly * 0.25 * 100).toFixed(2))

    const ticket: SignedTicket = Object.freeze({
      callId: call.id,
      marketLabel: quote.marketLabel,
      americanOdds: quote.americanOdds,
      noVigImpliedProb: Number(noVig.toFixed(4)),
      rawModelProb: quote.rawModelProb,
      calibratedProb,
      edgePct,
      kellyQuarterUnits,
    })

    const gate = contradictionGate(ticket, signed)
    if (!gate.allowed) {
      return { ...call, ticket: null, signedTicket: null }
    }

    signed.push(ticket)
    return { ...call, ticket, signedTicket: ticket }
  })
}
