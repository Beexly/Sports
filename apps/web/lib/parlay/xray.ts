/**
 * Parlay X-Ray — public same-game parlay scanner. PURE logic module.
 *
 * Wires the fitted SGP dependence model that already lives in the prediction
 * engine (packages/prediction-engine/src/nfl/sgp-copula.ts — Clayton survival
 * copula, pairing-dependent theta fitted by IFM). Nothing is reimplemented
 * here: jointForPairing for 2-leg tickets, jointThreeLegExceedance for 3.
 * The engine index re-exports jointForPairing but NOT
 * jointThreeLegExceedance, so both come from the deep module path — the same
 * pattern lib/truthmetrics/line-dna.ts uses for engine internals.
 *
 * Server-side comments may name the math. Every user-facing string field in
 * this module is plain football language (public copy fence): no copula /
 * theta / marginal / "joint exceedance" vocabulary ever reaches the UI.
 * Probabilities render as integer XX/100, never with a % sign. The hidden
 * hold itself is described as a plain-language percentage of extra margin —
 * that is the product's point.
 */

import {
  jointForPairing,
  jointThreeLegExceedance,
  type SgpPairing,
} from "@sports/prediction-engine/src/nfl/sgp-copula.js";

/**
 * A leg's role describes its relationship to the quarterback leg. The skill
 * position leg declares the pairing ("QB-WR" = this is the QB's top receiver);
 * the QB leg itself (and anything unclassified) is "OTHER".
 */
export type XrayRole = SgpPairing;

export const XRAY_ROLES: readonly XrayRole[] = ["QB-WR", "QB-TE", "QB-RB", "OTHER"];

export interface XrayLegInput {
  readonly label?: string;
  /** American price, e.g. -110 or +150. Number or string. */
  readonly americanOdds?: number | string;
  /** Alternative to a price: a chance between 0 and 1 (clamped). */
  readonly impliedProb?: number;
  readonly role?: XrayRole;
}

export interface XrayValidatedLeg {
  readonly label: string;
  /** Chance this leg lands, 0..1. */
  readonly prob: number;
  readonly role: XrayRole;
  readonly americanOdds: number | null;
}

// ─── Odds helpers ────────────────────────────────────────────────────────────

/** American odds bounds we accept: -100000..-100 and +100..+100000. */
const MIN_AMERICAN_MAGNITUDE = 100;
const MAX_AMERICAN_MAGNITUDE = 100000;

/** Parse a number or string ("+170", "-110", "170") into integer American odds. */
export function parseAmericanOdds(input: unknown): number | null {
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else if (typeof input === "string") {
    const trimmed = input.trim().replace(/,/g, "");
    if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
    n = Number(trimmed);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  const magnitude = Math.abs(rounded);
  if (magnitude < MIN_AMERICAN_MAGNITUDE || magnitude > MAX_AMERICAN_MAGNITUDE) return null;
  return rounded;
}

/** American → implied probability. -110 → 0.5238, +150 → 0.4. Null when invalid. */
export function americanToImpliedProb(american: number): number | null {
  const a = parseAmericanOdds(american);
  if (a === null) return null;
  return a > 0 ? 100 / (a + 100) : -a / (-a + 100);
}

/** American → decimal odds. -110 → 1.909, +150 → 2.5. Null when invalid. */
export function americanToDecimal(american: number): number | null {
  const p = americanToImpliedProb(american);
  if (p === null || p <= 0) return null;
  return 1 / p;
}

/** Probability → fair American odds. 0.4 → +150, 0.6 → -150. Null outside (0,1). */
export function impliedProbToAmerican(prob: number): number | null {
  if (!Number.isFinite(prob) || prob <= 0 || prob >= 1) return null;
  return prob >= 0.5
    ? Math.round((-100 * prob) / (1 - prob))
    : Math.round((100 * (1 - prob)) / prob);
}

/** Format signed American odds for display: 170 → "+170", -110 → "-110". */
export function americanDisplay(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

/** User-facing chance format: integer XX/100, never a % sign. */
export function chanceDisplay(prob: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(prob) ? prob : 0));
  return `${Math.round(clamped * 100)}/100`;
}

// ─── Pairing classification (plain terms) ───────────────────────────────────

export type SynergyRelationship = "complementary" | "cannibalistic" | "independent";

/**
 * Classify a pair from the two legs' roles. The first non-OTHER role wins
 * (the skill position leg declares the relationship); two OTHER legs are
 * mostly independent.
 */
export function classifyPair(a: XrayRole, b: XrayRole): XrayRole {
  return a !== "OTHER" ? a : b;
}

export function relationshipForPairing(pairing: XrayRole): SynergyRelationship {
  if (pairing === "QB-WR" || pairing === "QB-TE") return "complementary";
  if (pairing === "QB-RB") return "cannibalistic";
  return "independent";
}

const PAIR_COPY: Record<
  SynergyRelationship,
  { headline: string; detail: string }
> = {
  complementary: {
    headline: "These legs help each other",
    detail:
      "The quarterback and his receiver rise and fall on the same drives. When one leg lands, the other is more likely to land too, so the chance of both is higher than multiplying the two prices.",
  },
  cannibalistic: {
    headline: "These legs fight each other",
    detail:
      "The quarterback and his running back compete for the same touches. A run-heavy day feeds one leg and starves the other, so both landing together is rarer than the separate prices suggest.",
  },
  independent: {
    headline: "These legs mostly ride on their own",
    detail:
      "Nothing obvious ties these two legs together, so the ticket's chance is close to what you get by multiplying the two prices.",
  },
};

// ─── Request validation ──────────────────────────────────────────────────────

export type XrayParseResult =
  | { ok: true; legs: XrayValidatedLeg[]; bookQuote: number }
  | { ok: false; error: string };

/**
 * Validate a raw {legs, bookQuote} payload (API body or direct call).
 * Guards: 2–3 legs, American odds range, probabilities clamped to 0..1.
 * Error strings are plain language — they render in the UI.
 */
export function parseXrayRequest(body: unknown): XrayParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Send a ticket with 2 or 3 legs and the book's parlay price." };
  }
  const { legs, bookQuote } = body as { legs?: unknown; bookQuote?: unknown };
  if (!Array.isArray(legs) || legs.length < 2 || legs.length > 3) {
    return { ok: false, error: "An X-Ray needs 2 or 3 legs." };
  }
  const book = parseAmericanOdds(bookQuote);
  if (book === null) {
    return {
      ok: false,
      error: "Enter the book's same-game parlay price as American odds, like +170 or -120.",
    };
  }
  const validated: XrayValidatedLeg[] = [];
  for (let i = 0; i < legs.length; i += 1) {
    const raw = legs[i];
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: `Leg ${i + 1} is missing its details.` };
    }
    const { label, americanOdds, impliedProb, role } = raw as Record<string, unknown>;
    let prob: number | null = null;
    let american: number | null = null;
    const hasOdds =
      americanOdds !== undefined && americanOdds !== null && americanOdds !== "";
    if (hasOdds) {
      american = parseAmericanOdds(americanOdds);
      if (american === null) {
        return { ok: false, error: `Leg ${i + 1}: enter odds like -110 or +150.` };
      }
      prob = americanToImpliedProb(american);
    } else if (typeof impliedProb === "number" && Number.isFinite(impliedProb)) {
      prob = Math.min(1, Math.max(0, impliedProb));
    } else {
      return {
        ok: false,
        error: `Leg ${i + 1} needs a price (like -110) or a chance between 0 and 1.`,
      };
    }
    const safeRole: XrayRole =
      typeof role === "string" && (XRAY_ROLES as readonly string[]).includes(role)
        ? (role as XrayRole)
        : "OTHER";
    const safeLabel =
      typeof label === "string" && label.trim().length > 0
        ? label.trim().slice(0, 120)
        : `Leg ${i + 1}`;
    validated.push({ label: safeLabel, prob: prob as number, role: safeRole, americanOdds: american });
  }
  return { ok: true, legs: validated, bookQuote: book };
}

// ─── Result shape ────────────────────────────────────────────────────────────

export interface XrayPairReport {
  readonly legAIndex: number;
  readonly legBIndex: number;
  readonly legALabel: string;
  readonly legBLabel: string;
  readonly pairing: XrayRole;
  readonly relationship: SynergyRelationship;
  /** Plain-English badge headline. */
  readonly headline: string;
  /** Plain-English explanation of why the legs interact. */
  readonly detail: string;
  /** Engine pair joint (dependence-aware). */
  readonly pairJointProb: number;
  /** Naive product of the two leg chances. */
  readonly pairNaiveProb: number;
  readonly pairChanceDisplay: string;
  readonly naiveChanceDisplay: string;
}

export type XrayVerdictTone = "help" | "fight" | "hold" | "fair";

export interface XrayResult {
  readonly legCount: number;
  readonly legs: ReadonlyArray<{
    label: string;
    prob: number;
    chanceDisplay: string;
  }>;
  /** Dependence-aware chance all legs land (engine math). */
  readonly modelJointProb: number;
  readonly modelChanceDisplay: string;
  readonly fairAmericanOdds: number | null;
  readonly fairPriceDisplay: string;
  readonly bookAmericanOdds: number;
  readonly bookPriceDisplay: string;
  readonly bookImpliedProb: number;
  readonly bookChanceDisplay: string;
  /** Naive product of leg chances (the "separate coin flips" baseline). */
  readonly naiveJointProb: number;
  /** bookImpliedProb − modelJointProb. Positive = extra margin hidden in the quote. */
  readonly hiddenHold: number;
  readonly hiddenHoldPp: number;
  readonly hiddenHoldDisplay: string;
  readonly hiddenHoldExplanation: string;
  readonly pairs: readonly XrayPairReport[];
  readonly verdict: string;
  readonly verdictTone: XrayVerdictTone;
}

export type XrayOutcome = { ok: true; result: XrayResult } | { ok: false; error: string };

const HOLD_EPSILON = 0.005; // half a point of probability — "roughly in line" band

/** Compute the X-Ray from already-validated inputs. Pure. */
export function computeXrayResult(
  legs: readonly XrayValidatedLeg[],
  bookQuote: number,
): XrayResult {
  const probs = legs.map((l) => l.prob);
  // Engine math: 2-leg joints use the fitted pairing dependence; the 3-leg
  // path enforces its own Fréchet bound and realistic correlation band.
  const modelJointProb =
    legs.length === 2
      ? jointForPairing(probs[0] as number, probs[1] as number, classifyPair(legs[0]!.role, legs[1]!.role))
      : jointThreeLegExceedance(probs[0] as number, probs[1] as number, probs[2] as number);

  const bookImpliedProb = americanToImpliedProb(bookQuote) as number;
  const hiddenHold = bookImpliedProb - modelJointProb;
  const hiddenHoldPp = hiddenHold * 100;
  const naiveJointProb = probs.reduce((acc, p) => acc * p, 1);
  const fairAmericanOdds = impliedProbToAmerican(modelJointProb);

  const pairs: XrayPairReport[] = [];
  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      const pairing = classifyPair(legs[i]!.role, legs[j]!.role);
      const relationship = relationshipForPairing(pairing);
      const pairJointProb = jointForPairing(probs[i] as number, probs[j] as number, pairing);
      const pairNaiveProb = (probs[i] as number) * (probs[j] as number);
      const copy = PAIR_COPY[relationship];
      pairs.push({
        legAIndex: i,
        legBIndex: j,
        legALabel: legs[i]!.label,
        legBLabel: legs[j]!.label,
        pairing,
        relationship,
        headline: copy.headline,
        detail: copy.detail,
        pairJointProb,
        pairNaiveProb,
        pairChanceDisplay: chanceDisplay(pairJointProb),
        naiveChanceDisplay: chanceDisplay(pairNaiveProb),
      });
    }
  }

  const anyFight = pairs.some((p) => p.relationship === "cannibalistic");
  const anyHelp = pairs.some((p) => p.relationship === "complementary");

  let hiddenHoldDisplay: string;
  if (hiddenHold > HOLD_EPSILON) {
    hiddenHoldDisplay = `about ${Math.round(hiddenHoldPp)}% extra margin baked into the quote`;
  } else if (hiddenHold < -HOLD_EPSILON) {
    hiddenHoldDisplay = "no extra margin showing: the quote implies a lower chance than our estimate";
  } else {
    hiddenHoldDisplay = "roughly in line with our estimate of the ticket's real chance";
  }

  const hiddenHoldExplanation =
    "Books build same-game prices by treating each leg like a separate coin flip. " +
    "Real legs move together, so the ticket's real chance and the price's implied chance drift apart. " +
    "That gap is margin you can't see on the slip. " +
    (hiddenHold > HOLD_EPSILON
      ? `Here the price implies ${chanceDisplay(bookImpliedProb)} while our estimate is ${chanceDisplay(modelJointProb)}.`
      : hiddenHold < -HOLD_EPSILON
        ? `Here the price implies ${chanceDisplay(bookImpliedProb)} while our estimate is ${chanceDisplay(modelJointProb)}; this quote is not hiding extra margin.`
        : `Here the price implies ${chanceDisplay(bookImpliedProb)} and our estimate is ${chanceDisplay(modelJointProb)}.`);

  let verdict: string;
  let verdictTone: XrayVerdictTone;
  if (anyFight) {
    verdict = "The quote is worse than it looks: these legs fight each other for the same touches.";
    verdictTone = "fight";
  } else if (hiddenHold > HOLD_EPSILON && anyHelp) {
    verdict = "These legs help each other, and the book's price still hides extra margin.";
    verdictTone = "help";
  } else if (hiddenHold > HOLD_EPSILON) {
    verdict = "The book's price hides extra margin beyond what these legs' real chances justify.";
    verdictTone = "hold";
  } else if (hiddenHold < -HOLD_EPSILON) {
    verdict = "This quote implies a lower chance than our estimate: no hidden margin showing on this ticket.";
    verdictTone = "fair";
  } else {
    verdict = "This quote is roughly in line with the ticket's real chances.";
    verdictTone = "fair";
  }

  return {
    legCount: legs.length,
    legs: legs.map((l) => ({ label: l.label, prob: l.prob, chanceDisplay: chanceDisplay(l.prob) })),
    modelJointProb,
    modelChanceDisplay: chanceDisplay(modelJointProb),
    fairAmericanOdds,
    fairPriceDisplay: fairAmericanOdds === null ? "—" : americanDisplay(fairAmericanOdds),
    bookAmericanOdds: bookQuote,
    bookPriceDisplay: americanDisplay(bookQuote),
    bookImpliedProb,
    bookChanceDisplay: chanceDisplay(bookImpliedProb),
    naiveJointProb,
    hiddenHold,
    hiddenHoldPp,
    hiddenHoldDisplay,
    hiddenHoldExplanation,
    pairs,
    verdict,
    verdictTone,
  };
}

/**
 * X-Ray a ticket: user's legs + the book's same-game parlay quote.
 * Returns a typed outcome; invalid input produces a plain-language error,
 * never a throw. All numbers derive from the inputs + the engine math.
 */
export function xrayTicket(
  legs: readonly XrayLegInput[],
  bookSgpAmericanOdds: number | string,
): XrayOutcome {
  const parsed = parseXrayRequest({ legs, bookQuote: bookSgpAmericanOdds });
  if (!parsed.ok) return parsed;
  return { ok: true, result: computeXrayResult(parsed.legs, parsed.bookQuote) };
}