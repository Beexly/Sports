/**
 * Process grades — A/B/C/D/F grading rubric applied to a single past
 * decision, independent of the outcome.
 *
 * A win on bad process is a Bad Win.
 * A loss on good process is a Good Loss.
 * The grade scores the *decision*, not the result.
 */

export type ProcessGrade = "A" | "B" | "C" | "D" | "F";

export interface ProcessGradeInputs {
  /** Was the pick consistent with the model's published gate? */
  readonly publishedGated: boolean;
  /** Did the user check evidence (audit, methodology, factor trail)? */
  readonly evidenceChecked: boolean;
  /** Did the user respect bankroll discipline (within ladder)? */
  readonly bankrollDiscipline: boolean;
  /** Did the user beat the closing line (CLV ≥ 0)? */
  readonly beatClosingLine: boolean;
  /** Was the bet placed as a tilt response to a prior loss? */
  readonly tiltResponse: boolean;
  /** Was Parlay MRI consulted before any parlay leg? */
  readonly parlayMriConsulted: boolean | null; // null when not a parlay
}

export interface ProcessGradeVerdict {
  readonly grade: ProcessGrade;
  readonly subGrades: Readonly<Record<keyof ProcessGradeInputs, "pass" | "fail" | "n/a">>;
  readonly summary: string;
}

const FAIL_VALUE = 0;
const PASS_VALUE = 1;
const NA_VALUE = 1; // n/a does not penalize

function scoreInput(value: boolean | null, isTiltInput: boolean): number {
  if (value === null) return NA_VALUE;
  if (isTiltInput) return value ? FAIL_VALUE : PASS_VALUE;
  return value ? PASS_VALUE : FAIL_VALUE;
}

export function gradeProcess(inputs: ProcessGradeInputs): ProcessGradeVerdict {
  const subGrades = {
    publishedGated: inputs.publishedGated ? "pass" : "fail",
    evidenceChecked: inputs.evidenceChecked ? "pass" : "fail",
    bankrollDiscipline: inputs.bankrollDiscipline ? "pass" : "fail",
    beatClosingLine: inputs.beatClosingLine ? "pass" : "fail",
    tiltResponse: inputs.tiltResponse ? "fail" : "pass",
    parlayMriConsulted:
      inputs.parlayMriConsulted === null
        ? "n/a"
        : inputs.parlayMriConsulted
          ? "pass"
          : "fail",
  } as const;

  const totalApplicable =
    PASS_VALUE * 6 - (inputs.parlayMriConsulted === null ? PASS_VALUE : 0);
  const score =
    scoreInput(inputs.publishedGated, false) +
    scoreInput(inputs.evidenceChecked, false) +
    scoreInput(inputs.bankrollDiscipline, false) +
    scoreInput(inputs.beatClosingLine, false) +
    scoreInput(inputs.tiltResponse, true) +
    scoreInput(inputs.parlayMriConsulted, false);

  const ratio = totalApplicable > 0 ? score / totalApplicable : 0;
  const grade: ProcessGrade =
    ratio >= 0.95 ? "A" :
    ratio >= 0.80 ? "B" :
    ratio >= 0.60 ? "C" :
    ratio >= 0.40 ? "D" :
    "F";

  return { grade, subGrades, summary: summaryFor(grade) };
}

function summaryFor(grade: ProcessGrade): string {
  switch (grade) {
    case "A": return "Process was clean across every applicable axis. Outcome is independent of grade.";
    case "B": return "One or two slips; the decision was within doctrine.";
    case "C": return "Multiple slips. Outcome should not be read as endorsement.";
    case "D": return "Decision broke doctrine on critical axes. Treat any win as a bad win.";
    case "F": return "Decision contradicted core discipline. Re-read No-Bet Doctrine before next entry.";
  }
}
