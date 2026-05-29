/**
 * Decision Quality Maturity Model.
 *
 * Maturity is the answer to: *is this user becoming a better
 * decision-maker?* The model classifies a user along five maturity
 * stages and uses the stage to choose defaults — never to gate content.
 *
 * The maturity stage is derived from observable behavior:
 *  - whether the user audits past picks (process)
 *  - whether the user reads No-Bet entries (restraint)
 *  - whether the user follows Methodology (evidence)
 *  - whether the user grades their process via Autopsy
 *
 * The model deliberately excludes win/loss outcomes. A user who wins
 * with bad process is not mature. A user who loses with good process
 * is on the path.
 */

export const MATURITY_STAGES = ["spectator", "learner", "operator", "disciplined", "compounding"] as const;
export type MaturityStage = (typeof MATURITY_STAGES)[number];

export interface MaturityInputs {
  /** Sessions in last 30 days where Methodology was followed. */
  readonly methodologyFollows30d: number;
  /** Distinct No-Bet entries read in last 30 days. */
  readonly noBetReads30d: number;
  /** Settled picks for which the user opened the Autopsy in last 30 days. */
  readonly autopsyOpens30d: number;
  /** Distinct process grades acknowledged (any of A..F) in last 30 days. */
  readonly processGradesAcked30d: number;
  /** Evidence audits opened in last 30 days. */
  readonly evidenceAudits30d: number;
  /** Academy modules completed total. */
  readonly academyModulesCompleted: number;
  /** Whether Parlay MRI was consulted before a settled parlay. */
  readonly parlayMriPriorRate: number; // 0..1
}

export interface MaturityVerdict {
  readonly stage: MaturityStage;
  readonly score: number; // 0..100, internal — not shown to user numerically
  readonly nextLift: string; // a single concrete next action
}

/** Compute the maturity stage. Pure function — no I/O. */
export function classifyMaturity(inputs: MaturityInputs): MaturityVerdict {
  const score = clamp01(
    weight(inputs.methodologyFollows30d, 0.10, 4) +
      weight(inputs.noBetReads30d, 0.15, 8) +
      weight(inputs.autopsyOpens30d, 0.20, 10) +
      weight(inputs.processGradesAcked30d, 0.15, 10) +
      weight(inputs.evidenceAudits30d, 0.15, 8) +
      weight(inputs.academyModulesCompleted, 0.15, 6) +
      weight(inputs.parlayMriPriorRate, 0.10, 1),
  ) * 100;

  const stage: MaturityStage =
    score < 18 ? "spectator" :
    score < 38 ? "learner" :
    score < 58 ? "operator" :
    score < 80 ? "disciplined" :
    "compounding";

  const nextLift = nextLiftFor(stage, inputs);
  return { stage, score, nextLift };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function weight(value: number, w: number, target: number): number {
  if (target <= 0) return 0;
  const ratio = Math.min(1, value / target);
  return ratio * w;
}

function nextLiftFor(stage: MaturityStage, inputs: MaturityInputs): string {
  if (stage === "spectator") return "Read one No-Bet entry today and one Academy foundation module this week.";
  if (stage === "learner") return "Open the Autopsy on your next settled pick and acknowledge the process grade.";
  if (stage === "operator") return "Run Parlay MRI before any settled parlay this week; CLV is the signal.";
  if (stage === "disciplined") return "Audit two settled picks where the outcome and process grades disagreed.";
  return "Maintain cadence; teach one concept to another bettor — teaching is the highest form of mastery.";
}
