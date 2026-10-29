/**
 * Reasoning benchmark — scores the engine's REASONING, not just its number.
 *
 * WHY THIS EXISTS. Calibration alone cannot tell a good read from a lucky one: a
 * paragraph can hit a Brier score while citing a surface that was never loaded,
 * contradicting its own facts, or naming a side its probability disagrees with.
 * This suite scores four separable things, so a regression in reasoning shows up
 * as a named failure instead of hiding inside an aggregate.
 *
 * LEADERBOARD GATE. A suite run is only "leaderboard-shaped" if it clears every
 * component floor and beats the market baseline on Brier. The gate is a
 * conjunction with named reasons — never a weighted average that lets a strong
 * calibration hide a hallucination.
 *
 * DETERMINISTIC BY DESIGN. No judge model in the loop: every component is
 * computed from the artifact and the case facts, so two runs of the same suite
 * score identically and a diff means a real change.
 */

export interface BenchmarkCase {
  readonly id: string;
  /** Surface keys that were actually loaded for this case. */
  readonly loadedSurfaces: readonly string[];
  /** 1 = the side won, 0 = lost, null = unsettled (excluded from calibration). */
  readonly outcome: 0 | 1 | null;
  /** Market-implied probability for the chosen side. Baseline, not truth. */
  readonly marketProb: number;
  /** Facts the reasoning may cite; keys are surface keys. */
  readonly facts: Readonly<Record<string, number | string | null>>;
}

export interface ReasonArtifact {
  readonly caseId: string;
  readonly reasonText: string;
  /** Stated probability for the chosen side. */
  readonly prob: number;
  /** Side the reason names. PASS is a legal, scored answer. */
  readonly side: "HOME" | "AWAY" | "OVER" | "UNDER" | "PASS";
  /** Surface keys the reasoning claims to have used. */
  readonly citedSurfaces: readonly string[];
}

export interface ComponentScore {
  readonly grounding: number;
  readonly consistency: number;
  readonly specificity: number;
  readonly falsifier: number;
  readonly calibration: number | null;
}

export interface CaseScore extends ComponentScore {
  readonly caseId: string;
  /** Weighted 0-100 rubric score. */
  readonly rubric: number;
  readonly failures: readonly string[];
}

export const RUBRIC_WEIGHTS = {
  grounding: 0.3,
  consistency: 0.25,
  specificity: 0.15,
  // Admitting a failure mode is a reasoning property, not decoration: a claim
  // with no falsifier cannot be argued with. Weighted below grounding because a
  // well-grounded claim is still useful without one.
  falsifier: 0.1,
  calibration: 0.2,
} as const;

/** Component floors a leaderboard run may not fall below. */
export const LEADERBOARD_FLOORS = {
  meanGrounding: 0.9,
  meanConsistency: 0.95,
  meanRubric: 70,
  /** Ratio ceiling vs the market baseline: 1.0 means "must not lose to it". */
  maxBrierVsMarket: 1.0,
} as const;

/** Lowest probability that still counts as favouring the named side. */
export const LEAN_FLOOR = 0.45;

export function clearsLeanFloor(prob: number): boolean {
  return Number.isFinite(prob) && prob >= LEAN_FLOOR;
}

/** Words the engine uses for calm conditions; a windy case must not claim them. */
const CALM_WORDS = ["calm", "no wind", "still air", "windless"];

/**
 * Fraction of citations that resolve to a loaded surface.
 *
 * An artifact that cites nothing scores 0.5: not wrong, not evidenced. Citing
 * only loaded surfaces scores 1 even if it cites one, because precision is the
 * property being measured here — breadth is `specificity`.
 */
export function scoreGrounding(artifact: ReasonArtifact, kase: BenchmarkCase): number {
  const cited = artifact.citedSurfaces.filter((s) => s.trim().length > 0);
  if (cited.length === 0) return 0.5;
  const loaded = new Set(kase.loadedSurfaces);
  const real = cited.filter((s) => loaded.has(s)).length;
  return real / cited.length;
}

/**
 * Internal consistency FINDINGS — one labelled string per flaw.
 *
 * Labelled rather than folded into a bare penalty, because "internal
 * inconsistency: 103" tells a reader nothing about what to fix. Causes here are
 * separable and each is actionable on its own.
 *
 * Each finding costs 0.25, so one flaw is survivable and three is not.
 */
export function consistencyFindings(
  artifact: ReasonArtifact,
  kase: BenchmarkCase,
): string[] {
  const findings: string[] = [];
  const text = artifact.reasonText.toLowerCase();
  const hasSide = artifact.side !== "PASS";

  if (hasSide) {
    const p = artifact.prob;
    // `prob` is P(CHOSEN SIDE WINS) for every side, including UNDER — so a bare
    // "must exceed 0.5" faults every honest dog. The 2026-10-23 run showed why:
    // 100+ rows piled at 35-45%, which is just a normal underdog, not a flaw. So
    // the test is not a floor but a DISAGREEMENT: naming a side more than 12
    // points from the market needs to be right, and anything under 10% is a
    // long shot however you look at it.
    if (!Number.isFinite(p) || p <= 0 || p >= 1) findings.push("probability outside 0..1");
    else if (p < 0.1) findings.push(`named a side at only ${(p * 100).toFixed(0)}%`);
    else {
      const m = kase.facts["marketFairProb"];
      if (typeof m === "number" && Math.abs(p - m) > 0.12) {
        findings.push(
          `engine ${(p * 100).toFixed(0)}% v market ${(m * 100).toFixed(0)}% — big disagreement`,
        );
      }
    }
  }

  const wind = kase.facts["wind_mph"];
  if (typeof wind === "number" && wind > 8 && CALM_WORDS.some((w) => text.includes(w))) {
    findings.push("claimed calm on a windy case");
  }

  // Printed fair values must match the record they came from. This is the
  // specific check the 2026-10-23 baseline needed: the template used to print a
  // market-derived number under the same "Fair value" label the record used for
  // the engine's, so rows disagreed with themselves. Tolerance is 2 points
  // because the prose rounds to whole percent.
  const agrees = (re: RegExp, expected: unknown): boolean | null => {
    const m = re.exec(text);
    if (!m || typeof expected !== "number") return null;
    return Math.abs(Number(m[1]) - expected * 100) <= 2;
  };
  if (agrees(/market fair\s*:\s*(\d+)%/, kase.facts["marketFairProb"]) === false) {
    findings.push("printed market fair disagrees with the record");
  }
  if (agrees(/engine fair\s*:\s*(\d+)%/, kase.facts["fairProbability"]) === false) {
    findings.push("printed engine fair disagrees with the record");
  }

  for (const [key, value] of Object.entries(kase.facts)) {
    if (key === "marketFairProb" || key === "fairProbability") continue;
    if (typeof value !== "number") continue;
    if (!text.includes(key.toLowerCase().replace(/_/g, " "))) continue;
    const quoted = new RegExp(value.toFixed(1).replace(".", "\.")).test(text);
    const near = new RegExp(`\b${Math.round(value)}\b`).test(text);
    if (!quoted && !near) findings.push(`figure contradicts the record: ${key}`);
  }

  return findings;
}

/** Consistency as a number: 1 less 0.25 per labelled finding, floored at 0. */
export function scoreConsistency(artifact: ReasonArtifact, kase: BenchmarkCase): number {
  return Math.max(0, 1 - 0.25 * consistencyFindings(artifact, kase).length);
}

/**
 * Specificity: distinct loaded citations plus quantitative tokens. Rewards a
 * read that is evidenced and numeric over one that is fluent and empty.
 * Clamped to 1 after three distinct surfaces and three numbers.
 */
export function scoreSpecificity(artifact: ReasonArtifact, kase: BenchmarkCase): number {
  const loaded = new Set(kase.loadedSurfaces);
  const distinct = new Set(artifact.citedSurfaces.filter((s) => loaded.has(s))).size;
  const numbers = (artifact.reasonText.match(/\b\d+(?:\.\d+)?\b/g) ?? []).length;
  return Math.min(1, distinct / 3) * 0.6 + Math.min(1, numbers / 3) * 0.4;
}

/**
 * Falsifier score. Credit falls with the number of states the artifact says would
 * prove it wrong: two or more is full, one is partial, none is 0.6 rather than 0
 * because a genuinely clean read has little to name.
 */
export function scoreFalsifier(artifact: ReasonArtifact): number {
  const text = artifact.reasonText.toLowerCase();
  if (!text.includes("would be wrong if")) return 0.6;
  const states = text.split("would be wrong if")[1]?.split(";").length ?? 0;
  return states >= 2 ? 1 : 0.7;
}

/** Calibration for one case: 1 - Brier, null when unsettled. */
export function scoreCalibration(artifact: ReasonArtifact, kase: BenchmarkCase): number | null {
  if (kase.outcome === null) return null;
  if (!Number.isFinite(artifact.prob)) return null;
  const brier = (artifact.prob - kase.outcome) * (artifact.prob - kase.outcome);
  return Math.max(0, 1 - brier);
}

export function scoreCase(artifact: ReasonArtifact, kase: BenchmarkCase): CaseScore {
  const grounding = scoreGrounding(artifact, kase);
  const consistency = scoreConsistency(artifact, kase);
  const specificity = scoreSpecificity(artifact, kase);
  const falsifier = scoreFalsifier(artifact);
  const calibration = scoreCalibration(artifact, kase);

  const failures: string[] = [];
  if (grounding < 1) {
    const loaded = new Set(kase.loadedSurfaces);
    for (const s of artifact.citedSurfaces) {
      if (s.trim() && !loaded.has(s)) failures.push(`cited unloaded surface: ${s}`);
    }
  }
  failures.push(...consistencyFindings(artifact, kase));
  if (calibration === null) failures.push("unsettled — excluded from calibration");

  let weighted = grounding * RUBRIC_WEIGHTS.grounding + consistency * RUBRIC_WEIGHTS.consistency;
  weighted += specificity * RUBRIC_WEIGHTS.specificity + falsifier * RUBRIC_WEIGHTS.falsifier;
  // Calibration weight is redistributed when a case is unsettled so an unsettled
  // case cannot be punished for a missing outcome.
  weighted = calibration === null
    ? weighted / (1 - RUBRIC_WEIGHTS.calibration)
    : weighted + calibration * RUBRIC_WEIGHTS.calibration;

  return {
    caseId: kase.id,
    grounding,
    consistency,
    specificity,
    falsifier,
    calibration,
    rubric: weighted * 100,
    failures,
  };
}

export interface Scorecard {
  readonly n: number;
  readonly settled: number;
  readonly meanGrounding: number;
  readonly meanConsistency: number;
  readonly meanSpecificity: number;
  readonly meanFalsifier: number;
  readonly meanRubric: number;
  readonly brier: number | null;
  readonly marketBrier: number | null;
  readonly leaderboardReady: boolean;
  readonly blockers: readonly string[];
  readonly cases: readonly CaseScore[];
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Run a suite. Artifacts may arrive unordered; unknown case ids are ignored and
 * cases without an artifact are reported as missing rather than scored zero, so
 * a thin run cannot look like a bad one.
 */
export function runSuite(
  cases: readonly BenchmarkCase[],
  artifacts: readonly ReasonArtifact[],
): Scorecard {
  const byId = new Map(artifacts.map((a) => [a.caseId, a]));
  const scored: CaseScore[] = [];
  const blockers: string[] = [];

  for (const kase of cases) {
    const art = byId.get(kase.id);
    if (!art) {
      blockers.push(`missing artifact: ${kase.id}`);
      continue;
    }
    scored.push(scoreCase(art, kase));
  }

  const settledPairs = cases
    .filter((c) => c.outcome !== null)
    .map((c) => ({ c, a: byId.get(c.id) }))
    .filter((x): x is { c: BenchmarkCase; a: ReasonArtifact } => Boolean(x.a));

  const brier = settledPairs.length
    ? mean(settledPairs.map(({ a, c }) => (a.prob - (c.outcome as number)) ** 2))
    : null;
  const marketBrier = settledPairs.length
    ? mean(settledPairs.map(({ c }) => (c.marketProb - (c.outcome as number)) ** 2))
    : null;

  const card: Omit<Scorecard, "leaderboardReady"> = {
    n: cases.length,
    settled: settledPairs.length,
    meanGrounding: mean(scored.map((s) => s.grounding)),
    meanConsistency: mean(scored.map((s) => s.consistency)),
    meanSpecificity: mean(scored.map((s) => s.specificity)),
    meanFalsifier: mean(scored.map((s) => s.falsifier)),
    meanRubric: mean(scored.map((s) => s.rubric)),
    brier,
    marketBrier,
    blockers,
    cases: scored,
  };

  if (card.n === 0) blockers.push("empty suite");
  if (card.settled === 0) blockers.push("no settled cases");
  if (!(card.meanGrounding >= LEADERBOARD_FLOORS.meanGrounding)) blockers.push("grounding below floor");
  if (!(card.meanConsistency >= LEADERBOARD_FLOORS.meanConsistency)) blockers.push("consistency below floor");
  if (!(card.meanRubric >= LEADERBOARD_FLOORS.meanRubric)) blockers.push("rubric below floor");
  if (brier !== null && marketBrier !== null && brier > marketBrier * LEADERBOARD_FLOORS.maxBrierVsMarket) {
    blockers.push("Brier worse than the market");
  }

  return { ...card, leaderboardReady: blockers.length === 0 };
}
