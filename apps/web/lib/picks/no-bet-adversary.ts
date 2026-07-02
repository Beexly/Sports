/**
 * No-Bet Adversary Engine — the strongest case AGAINST a pick, generated before it
 * publishes. Most competitors monetize impulse; GSE monetizes discipline. This engine
 * makes "we passed this game, and here is why" a first-class output: it argues against
 * every pick across nine adversary factors and can only WIDEN the band or downgrade to
 * watchlist / no-bet. It can never manufacture confidence — by construction it only
 * subtracts. Pure, no I/O.
 */

export type AdversaryFactor =
  | "THIN_BOOK_COVERAGE"
  | "VOLATILE_LINE"
  | "INJURY_UNCERTAINTY"
  | "STALE_DATA"
  | "WEAK_CONFIDENCE_BAND"
  | "MISSING_SOURCE"
  | "MODEL_DISAGREEMENT"
  | "PUBLIC_NARRATIVE_RISK"
  | "SCHEDULE_AMBIGUITY";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export interface AdversaryInput {
  /** Bookmakers covering this market — thin coverage is fragile. */
  readonly bookmakerCount: number;
  /** Absolute line movement (points) since open — high = volatile/uncertain. */
  readonly lineMovementPoints: number;
  readonly injuryUncertain: boolean;
  /** Age of the underlying data in minutes; null when unknown. */
  readonly dataAgeMinutes: number | null;
  /** Published 0–100 confidence — low = weak band. */
  readonly confidence: number;
  /** A key expected source for this pick was missing/blocked. */
  readonly missingKeySource: boolean;
  /** Independent estimators (Elo/Poisson/ML/edge) diverge from the market or each other. */
  readonly modelsDisagree: boolean;
  /** The game carries an outsized public narrative (overreaction risk). */
  readonly highPublicNarrative: boolean;
  /** Rest/B2B/travel/schedule density is ambiguous. */
  readonly scheduleAmbiguous: boolean;

  readonly minBookmakers?: number; // default 3
  readonly maxLineMovePoints?: number; // default 3
  readonly maxDataAgeMinutes?: number; // default 120
  readonly weakConfidenceBelow?: number; // default 60
}

export interface AdversaryCase {
  readonly factor: AdversaryFactor;
  readonly severity: Severity;
  readonly argument: string;
}

export type Recommendation = "PLAY" | "WATCHLIST" | "NO_BET";

export interface NoBetVerdict {
  readonly cases: readonly AdversaryCase[];
  readonly strongestFactor: AdversaryFactor | null;
  /** Drives the downgrade ladder: any HIGH → NO_BET; any MEDIUM → WATCHLIST; else PLAY. */
  readonly recommendation: Recommendation;
  readonly summary: string;
}

const SEVERITY_RANK: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Build the adversary case for a pick. The recommendation only ever downgrades from
 * PLAY — it never upgrades — so an honest pass ("No-Bet") is a real product state.
 */
export function buildNoBetAdversary(input: AdversaryInput): NoBetVerdict {
  const minBooks = input.minBookmakers ?? 3;
  const maxMove = input.maxLineMovePoints ?? 3;
  const maxAge = input.maxDataAgeMinutes ?? 120;
  const weakBelow = input.weakConfidenceBelow ?? 60;

  const cases: AdversaryCase[] = [];
  const add = (factor: AdversaryFactor, severity: Severity, argument: string) =>
    cases.push({ factor, severity, argument });

  // Thin book coverage.
  if (input.bookmakerCount < minBooks) {
    const severity: Severity = input.bookmakerCount <= 1 ? "HIGH" : "MEDIUM";
    add("THIN_BOOK_COVERAGE", severity, `Only ${input.bookmakerCount} book(s) cover this market (want ≥${minBooks}); the consensus is fragile.`);
  }

  // Volatile line.
  if (Math.abs(input.lineMovementPoints) > maxMove) {
    const severity: Severity = Math.abs(input.lineMovementPoints) > maxMove * 2 ? "HIGH" : "MEDIUM";
    add("VOLATILE_LINE", severity, `The line moved ${input.lineMovementPoints} pts; the market is still discovering the number.`);
  }

  if (input.injuryUncertain) {
    add("INJURY_UNCERTAINTY", "HIGH", "An availability/injury question is unresolved; the inputs could change at scratch time.");
  }

  if (input.dataAgeMinutes != null && input.dataAgeMinutes > maxAge) {
    add("STALE_DATA", "HIGH", `The underlying data is ${input.dataAgeMinutes}m old (max ${maxAge}m).`);
  }

  if (input.confidence < weakBelow) {
    const severity: Severity = input.confidence < weakBelow - 10 ? "MEDIUM" : "LOW";
    add("WEAK_CONFIDENCE_BAND", severity, `Confidence is ${input.confidence}, below the ${weakBelow} band where we lead with a pick.`);
  }

  if (input.missingKeySource) {
    add("MISSING_SOURCE", "MEDIUM", "A key expected source was missing or blocked; the read is incomplete.");
  }

  if (input.modelsDisagree) {
    add("MODEL_DISAGREEMENT", "MEDIUM", "Independent estimators disagree with the market or each other; the edge isn't clean.");
  }

  if (input.highPublicNarrative) {
    add("PUBLIC_NARRATIVE_RISK", "LOW", "A strong public narrative is around this game; watch for an overreaction trap.");
  }

  if (input.scheduleAmbiguous) {
    add("SCHEDULE_AMBIGUITY", "LOW", "Rest/travel/schedule density is ambiguous and may swing the matchup.");
  }

  // Downgrade ladder — only ever subtracts.
  const hasHigh = cases.some((c) => c.severity === "HIGH");
  const hasMedium = cases.some((c) => c.severity === "MEDIUM");
  const recommendation: Recommendation = hasHigh ? "NO_BET" : hasMedium ? "WATCHLIST" : "PLAY";

  const strongest = cases.reduce<AdversaryCase | null>((best, c) => {
    if (best == null) return c;
    return SEVERITY_RANK[c.severity] > SEVERITY_RANK[best.severity] ? c : best;
  }, null);

  const summary =
    recommendation === "NO_BET"
      ? `No-Bet: ${strongest ? strongest.factor.replace(/_/g, " ").toLowerCase() : "serious opposition"} is too strong to publish a pick.`
      : recommendation === "WATCHLIST"
        ? "Watchlist: real opposition exists. Track it rather than lead with a pick."
        : "No serious opposition surfaced; the case against is weak.";

  return { cases, strongestFactor: strongest?.factor ?? null, recommendation, summary };
}
