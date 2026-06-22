/**
 * GSE Injury Miss-Time Model — a TRANSPARENT alternative to Draft Sharks' black-box
 * injury predictor: probability a player misses the next game, expected games
 * missed with an interval, and a 1–5 durability score.
 *
 * The base rates below are ILLUSTRATIVE defaults so the math is runnable and
 * auditable — they are NOT a fitted medical model and must be replaced with
 * real, sourced rates before any public use. The point is that the method is
 * inspectable (you can see exactly why a number moved), unlike the competition.
 *
 * Pure, dependency-free, tested. Companion doc: docs/research/GSE_2026_REMAINING_MODELS.md
 */

export type InjuryDesignation = "healthy" | "questionable" | "doubtful" | "out" | "ir";

export type InjuryType =
  | "hamstring"
  | "ankle"
  | "knee"
  | "acl"
  | "concussion"
  | "groin"
  | "shoulder"
  | "back"
  | "foot"
  | "other";

/** ILLUSTRATIVE base P(miss next game | currently questionable) by type. Replace with sourced rates. */
const QUESTIONABLE_MISS_BASE: Record<InjuryType, number> = {
  hamstring: 0.35,
  ankle: 0.3,
  knee: 0.4,
  acl: 0.95,
  concussion: 0.5,
  groin: 0.33,
  shoulder: 0.28,
  back: 0.3,
  foot: 0.32,
  other: 0.3,
};

/** ILLUSTRATIVE expected games missed once a player IS out, by type. */
const OUT_GAMES_MISSED: Record<InjuryType, { expected: number; low: number; high: number }> = {
  hamstring: { expected: 2, low: 1, high: 4 },
  ankle: { expected: 2, low: 1, high: 5 },
  knee: { expected: 3, low: 1, high: 8 },
  acl: { expected: 16, low: 12, high: 20 },
  concussion: { expected: 1.5, low: 1, high: 4 },
  groin: { expected: 2, low: 1, high: 4 },
  shoulder: { expected: 2, low: 1, high: 6 },
  back: { expected: 2, low: 1, high: 5 },
  foot: { expected: 3, low: 1, high: 6 },
  other: { expected: 2, low: 1, high: 4 },
};

export interface InjuryInput {
  readonly designation: InjuryDesignation;
  readonly type: InjuryType;
  /** Games already missed this season with this/related issue (reinjury signal). */
  readonly priorGamesMissedThisSeason: number;
  /** 0..1 workload relative to position norm (higher → slightly higher reinjury risk). */
  readonly workload: number;
}

export interface InjuryAssessment {
  /** P(miss the next game), 0..1. */
  readonly missProbability: number;
  readonly expectedGamesMissed: { expected: number; low: number; high: number };
  /** 1 (fragile) … 5 (iron-man). */
  readonly durabilityScore: number;
  readonly rationale: readonly string[];
  /** Always true here — these are illustrative defaults, not a fitted model. */
  readonly illustrative: boolean;
}

const clamp01 = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : p);

/**
 * Assess miss-time from designation + type + history + workload. Designation
 * dominates (out/ir ⇒ ~certain to miss); type sets the base rate when status is
 * uncertain; reinjury history and workload nudge it up. Every input that moved
 * the number is named in `rationale` — the transparency the category lacks.
 */
export function assessInjury(input: InjuryInput): InjuryAssessment {
  const rationale: string[] = [];
  let miss: number;

  switch (input.designation) {
    case "out":
    case "ir":
      miss = 0.99;
      rationale.push(`designation ${input.designation} → near-certain to miss`);
      break;
    case "doubtful":
      miss = 0.75 + 0.2 * (QUESTIONABLE_MISS_BASE[input.type] - 0.3);
      rationale.push("doubtful → likely to miss");
      break;
    case "questionable":
      miss = QUESTIONABLE_MISS_BASE[input.type];
      rationale.push(`questionable + ${input.type} base ${(miss * 100).toFixed(0)}%`);
      break;
    case "healthy":
    default:
      miss = 0.03;
      rationale.push("healthy → small residual risk");
      break;
  }

  // Reinjury history: each prior missed game nudges risk up (saturating).
  if (input.priorGamesMissedThisSeason > 0) {
    const bump = Math.min(0.2, input.priorGamesMissedThisSeason * 0.04);
    miss += bump;
    rationale.push(`reinjury history (+${(bump * 100).toFixed(0)}%)`);
  }
  // High workload slightly raises soft-tissue reinjury risk.
  if (input.workload > 0.8 && (input.type === "hamstring" || input.type === "groin")) {
    miss += 0.05;
    rationale.push("high workload on soft-tissue (+5%)");
  }
  miss = clamp01(miss);

  const expectedGamesMissed = OUT_GAMES_MISSED[input.type];

  // Durability 1..5 from season miss count (illustrative thresholds).
  const m = input.priorGamesMissedThisSeason;
  const durabilityScore = m >= 6 ? 1 : m >= 4 ? 2 : m >= 2 ? 3 : m >= 1 ? 4 : 5;

  return { missProbability: miss, expectedGamesMissed, durabilityScore, rationale, illustrative: true };
}
