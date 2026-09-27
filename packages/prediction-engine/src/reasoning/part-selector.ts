/**
 * Tchebycheff selector for one candidate grain.
 * g = max(λ_i f_i), λ = (0.5, 0.3, 0.2), ideal point (0, 0, 0).
 * f1 honesty, f2 duplication, f3 missing week-3 row. Each f is 0 or 1.
 * g = 0 is the only LIVE path. A winning f2 or f1 is DARK. A winning f3 is STORED.
 *
 * has_representative is not an argument. It is true when `family` is already
 * a row in the parts registry the caller loaded.
 */

export const PART_LAMBDA = { f1: 0.5, f2: 0.3, f3: 0.2 } as const;

/** Closed roster. A new candidate is added here on purpose. */
export const CANDIDATE_FAMILIES = ["officials", "weather_physics", "narrative_contract", "coaching"] as const;

export type CandidateFamily = (typeof CANDIDATE_FAMILIES)[number];
export type PartStatus = "LIVE" | "STORED" | "DARK";
export type WinningTerm = "f1" | "f2" | "f3" | "none";

export interface PartCandidate {
  readonly family: string;
  readonly grain: string;
  readonly r: number | null;
  readonly slope: number | null;
  readonly se: number | null;
  readonly n: number | null;
  readonly has_row: boolean;
}

export interface PartDecision {
  readonly family: string;
  readonly grain: string;
  readonly status: PartStatus;
  readonly winning_term: WinningTerm;
  readonly g: number;
  readonly f1: 0 | 1;
  readonly f2: 0 | 1;
  readonly f3: 0 | 1;
  readonly why: string;
  /** What would have to flip before a DARK or STORED row can enter the sum. */
  readonly reactivates_when: string;
}

/** |r| ≥ 0.08 and |slope| > se, with a positive finite sample. */
export function honestyCleared(candidate: Pick<PartCandidate, "r" | "slope" | "se" | "n">): boolean {
  const { r, slope, se, n } = candidate;
  if (r === null || slope === null || se === null || n === null) return false;
  if (![r, slope, se, n].every((value) => Number.isFinite(value))) return false;
  if (n <= 0 || se < 0) return false;
  return Math.abs(r) >= 0.08 && Math.abs(slope) > se;
}

export function isCandidateFamily(family: string): family is CandidateFamily {
  return (CANDIDATE_FAMILIES as readonly string[]).includes(family);
}

function reactivation(family: string, winning: WinningTerm): string {
  if (winning === "none") return "already live";
  if (winning === "f2") return "only if this family is removed from the parts registry";
  if (family === "officials") {
    return "only if a later holdout has |r| >= 0.08 and |slope| > se. Naming the referee does not flip f1";
  }
  if (family === "weather_physics") {
    return "only if |slope| > se on the stored wind or temperature fit and the game has a weather row. A forecast alone does not flip f1";
  }
  if (family === "coaching") {
    return "only if |r| >= 0.08 and a stored slope clears se. nfl4th is the same family and does not flip f1";
  }
  if (family === "narrative_contract") {
    return "only if a contract grain is measured at |r| >= 0.08 and |slope| > se and that row is joined to the game";
  }
  if (winning === "f3") return "when this game gains a row and f1 and f2 stay clear";
  return "only if the winning objective flips";
}

function explain(candidate: PartCandidate, status: PartStatus, winning: WinningTerm, duplicated: boolean): string {
  const bits: string[] = [`${candidate.family} ${status}`, `grain ${candidate.grain}`, `winning term ${winning}`];
  if (candidate.r === null) bits.push("r was not stored");
  else if (Math.abs(candidate.r) < 0.08) bits.push(`|r| ${Math.abs(candidate.r).toFixed(3)} is under 0.08`);
  if (candidate.slope === null || candidate.se === null) bits.push("slope or se was not stored");
  else if (Math.abs(candidate.slope) <= candidate.se) {
    bits.push(`|slope| ${Math.abs(candidate.slope)} is not greater than se ${candidate.se}`);
  }
  if (duplicated) bits.push("this direction already has a representative");
  if (!candidate.has_row) bits.push("no week-3 row");
  return bits.join(". ");
}

export function selectPart(candidate: PartCandidate, representatives: readonly string[]): PartDecision {
  const duplicated = representatives.includes(candidate.family);
  const f1: 0 | 1 = honestyCleared(candidate) ? 0 : 1;
  const f2: 0 | 1 = duplicated ? 1 : 0;
  const f3: 0 | 1 = candidate.has_row ? 0 : 1;
  const scores = [
    { term: "f1" as const, score: PART_LAMBDA.f1 * f1 },
    { term: "f2" as const, score: PART_LAMBDA.f2 * f2 },
    { term: "f3" as const, score: PART_LAMBDA.f3 * f3 },
  ];
  // Spread rather than index: Math.max over the same three values, but no
  // possibly-undefined read, so noUncheckedIndexedAccess is satisfied without an
  // assertion. The scalarizer's arithmetic is unchanged.
  const g = Math.max(...scores.map((term) => term.score));
  const winning = scores
    .filter((term) => term.score === g && term.score > 0)
    .sort((a, b) => (a.term < b.term ? -1 : 1))[0];
  const winning_term: WinningTerm = g === 0 || !winning ? "none" : winning.term;
  const status: PartStatus = g === 0 ? "LIVE" : winning_term === "f3" ? "STORED" : "DARK";
  return {
    family: candidate.family,
    grain: candidate.grain,
    status,
    winning_term,
    g,
    f1,
    f2,
    f3,
    why: explain(candidate, status, winning_term, duplicated),
    reactivates_when: reactivation(candidate.family, winning_term),
  };
}

/** Week-3 entry. Refuses a family that was not added to the roster. */
export function selectWeek3Candidate(candidate: PartCandidate, representatives: readonly string[]): PartDecision {
  if (!isCandidateFamily(candidate.family)) {
    throw new Error(`part-selector: ${candidate.family} is not on the candidate roster`);
  }
  return selectPart(candidate, representatives);
}

/**
 * True when the objective that made `previous` fail is now clear.
 * A new failure on a different objective is not reactivation.
 */
export function failingObjectiveFlipped(previous: PartDecision, next: PartDecision): boolean {
  if (previous.winning_term === "none") return false;
  if (previous.winning_term === "f1") return next.f1 === 0;
  if (previous.winning_term === "f2") return next.f2 === 0;
  return next.f3 === 0;
}

/**
 * 2024 crew mean home margin, kept when n ≥ 8 and |mean| > se (7 of 17 crews).
 * Applied to 2025 regular-season games that drew one of those crews.
 * Outcome is home_win. |r| clears 0.08. |slope| does not clear se.
 */
export const OFFICIALS_HOLDOUT: Omit<PartCandidate, "has_row"> = {
  family: "officials",
  grain: "games.referee",
  r: -0.09257409956668071,
  slope: -0.010071677456738428,
  se: 0.01028210084979805,
  n: 113,
};

/** Wind on total-point residual. 349 outdoor games. Temperature failed the same way. */
export const WEATHER_WIND: PartCandidate = {
  family: "weather_physics",
  grain: "schedules.weather wind_mph",
  r: null,
  slope: -0.135,
  se: 0.1618,
  n: 349,
  has_row: false,
};

/** Fourth-down go rate. 2025 walk-forward versus home win. Slope was not stored. */
export const COACHING_GO_RATE: PartCandidate = {
  family: "coaching",
  grain: "fourth-down go rate",
  r: -0.01363209458605604,
  slope: null,
  se: null,
  n: 255,
  has_row: false,
};

/** No contract table was joined to a week-3 player. */
export const NARRATIVE_CONTRACT: PartCandidate = {
  family: "narrative_contract",
  grain: "contracts",
  r: null,
  slope: null,
  se: null,
  n: null,
  has_row: false,
};

export function readingConclusion(gameId: string, liveCount: number, decisions: readonly PartDecision[], edge: number): string {
  const side = edge > 0 ? "home" : edge < 0 ? "away" : "level";
  const dark = decisions.filter((decision) => decision.status === "DARK");
  const stored = decisions.filter((decision) => decision.status === "STORED");
  const darkText = dark.map((decision) => `${decision.family} (${decision.winning_term})`).join(", ");
  return [
    `${gameId}: ${liveCount} LIVE parts`,
    darkText.length > 0 ? `DARK ${darkText}` : "no DARK candidates",
    stored.length > 0 ? `${stored.length} STORED` : "no STORED candidates",
    `the sum ${edge} supports a ${side} reading`,
    "not a pick",
  ].join(". ");
}

export function week3CandidateDecisions(officialsHasRow: boolean, representatives: readonly string[]): readonly PartDecision[] {
  return [
    selectWeek3Candidate({ ...OFFICIALS_HOLDOUT, has_row: officialsHasRow }, representatives),
    selectWeek3Candidate(WEATHER_WIND, representatives),
    selectWeek3Candidate(NARRATIVE_CONTRACT, representatives),
    selectWeek3Candidate(COACHING_GO_RATE, representatives),
  ];
}
