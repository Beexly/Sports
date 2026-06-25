/**
 * Candidate signal registry — the BOUNDED, hand-reviewed family the nightly
 * discovery engine is allowed to test.
 *
 * WHY BOUNDED, NOT AUTOMATED SEARCH: unbounded feature mining is how a backtest
 * bankrupts you — search 10,000 signals and dozens will look significant by pure
 * chance. Benjamini-Hochberg FDR control is only honest when the family size `m`
 * is known and fixed in advance. So every candidate here is PRE-REGISTERED by a
 * human, with an explicit null hypothesis and a registration date that predates any
 * look at its result. You cannot add a candidate after seeing it win — that is the
 * entire discipline.
 *
 * Each candidate is a FACTUAL, data-testable hypothesis (no proprietary picks, no
 * fabricated stats). The discovery engine runs each through the existing leakage-safe
 * walk-forward + Clark-West harness; this file only DECLARES the family and guards
 * its size. Pure data + helpers — no I/O, no Date, no RNG.
 */

export type CandidateFamily =
  | "situational-ats"
  | "totals"
  | "pace"
  | "usage"
  | "weather";

export interface SignalCandidate {
  /** Stable id — also the FDR key and the cross-night history key. */
  readonly id: string;
  readonly family: CandidateFamily;
  /** One-line plain description of the cohort being measured. */
  readonly description: string;
  /** The null we test against (what "no signal" looks like). */
  readonly nullHypothesis: string;
  /** ISO date the candidate was pre-registered — MUST predate any result it earns. */
  readonly registeredOn: string;
}

/**
 * Hard cap on family size. FDR honesty degrades as `m` grows silently, and a human
 * must review every addition — so the registry is not allowed past this without a
 * deliberate, reviewed bump. The guardrail and `assertBoundedFamily` enforce it.
 */
export const MAX_FAMILY_SIZE = 24;

/**
 * The pre-registered family. Small on purpose. Each entry is a plausible, testable
 * NFL hypothesis with a clear null — not a fishing license.
 */
export const CANDIDATE_REGISTRY: readonly SignalCandidate[] = [
  {
    id: "home-dog-bounce",
    family: "situational-ats",
    description: "Home underdogs coming off a straight-up loss, ATS",
    nullHypothesis: "Such teams cover at the break-even rate (≤52.4%).",
    registeredOn: "2026-06-25",
  },
  {
    id: "short-week-road-fade",
    family: "situational-ats",
    description: "Road teams on a short week (Thursday after a Sunday game), ATS",
    nullHypothesis: "Short-week road teams cover at the break-even rate.",
    registeredOn: "2026-06-25",
  },
  {
    id: "late-season-home-favorite-cover",
    family: "situational-ats",
    description: "December/January home favorites, ATS",
    nullHypothesis: "Cold-weather home favorites cover at the break-even rate.",
    registeredOn: "2026-06-25",
  },
  {
    id: "divisional-primetime-under",
    family: "totals",
    description: "Divisional games in primetime (Thu/Sun/Mon night), total",
    nullHypothesis: "Such games go under at the break-even rate.",
    registeredOn: "2026-06-25",
  },
  {
    id: "early-season-over",
    family: "totals",
    description: "Weeks 1–3 totals (defenses behind offenses early)",
    nullHypothesis: "Early-season games go over at the break-even rate.",
    registeredOn: "2026-06-25",
  },
  {
    id: "pace-up-after-blowout-loss",
    family: "pace",
    description: "Team plays count up the week after a 17+ point loss",
    nullHypothesis: "Play count is unchanged vs the team's season baseline.",
    registeredOn: "2026-06-25",
  },
  {
    id: "backup-rb-usage-carryover",
    family: "usage",
    description: "An RB who spiked snap share on a starter injury sustains it next week",
    nullHypothesis: "Next-week snap share reverts to the player's prior baseline.",
    registeredOn: "2026-06-25",
  },
  {
    id: "high-wind-total-under",
    family: "weather",
    description: "Outdoor games with forecast wind ≥ 15 mph, total",
    nullHypothesis: "Windy outdoor games go under at the break-even rate.",
    registeredOn: "2026-06-25",
  },
];

/** Look up a candidate by id (or undefined). */
export function candidateById(id: string): SignalCandidate | undefined {
  return CANDIDATE_REGISTRY.find((c) => c.id === id);
}

/**
 * Validate the family before any FDR run: ids must be unique and the family must not
 * exceed the reviewed cap. Throws on violation — a silently-growing family is a
 * correctness bug (it makes every reported q-value a lie), not a warning.
 */
export function assertBoundedFamily(
  registry: readonly SignalCandidate[] = CANDIDATE_REGISTRY,
): void {
  if (registry.length > MAX_FAMILY_SIZE) {
    throw new RangeError(
      `Candidate family of ${registry.length} exceeds MAX_FAMILY_SIZE ${MAX_FAMILY_SIZE} — ` +
        "bump the cap deliberately (with review) or remove candidates; do not let m drift.",
    );
  }
  const seen = new Set<string>();
  for (const c of registry) {
    if (seen.has(c.id)) throw new Error(`Duplicate candidate id "${c.id}" in registry.`);
    seen.add(c.id);
  }
}
