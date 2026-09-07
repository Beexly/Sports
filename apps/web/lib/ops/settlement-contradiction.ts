/**
 * Does a settled pick's stored result agree with the final score on its own game row?
 *
 * WHY THIS EXISTS. 117 published, settled picks currently carry a result that
 * contradicts their own fixture's final: 47 TOTAL, 51 SPREAD, 19 MONEYLINE
 * (measured read-only on production 2026-09-07, ledger C-115). Nothing in the
 * product noticed. They were found because an agent happened to write the
 * comparison by hand in SQL, which means the same class of corruption could
 * accumulate again the moment nobody is looking. This module is that comparison,
 * written once, as a pure function, so the system can check itself.
 *
 * THE MARKET-AGNOSTIC PART IS THE POINT. A MONEYLINE pick involves no line at
 * all — grading it is only "did the team I picked win?" — so a wrong MONEYLINE
 * result can only mean the grader read a DIFFERENT FIXTURE'S score. That rules
 * out every market-specific arithmetic story (OVER/UNDER parsing, half-points,
 * run-line ladders, home-perspective sign) as the main cause and points at the
 * pick-to-final binding. A detector that only understood totals would have
 * missed 70 of the 117.
 *
 * TWO DISTINCT FINDINGS, DELIBERATELY NOT MERGED:
 *
 *   CONTRADICTS_BOTH   the stored result matches neither the displayed `line`
 *                      nor the `clvLockLine` the settler grades on. There is no
 *                      reading of this fixture under which the published result
 *                      is right. This is corruption (ledger C-115).
 *
 *   GRADED_ON_LOCK_LINE the stored result is correct against `clvLockLine` but
 *                      not against the `line` the pick card displays. The grade
 *                      is defensible; the card is showing the reader a different
 *                      number than the one we settled on (ledger C-143). A
 *                      subscriber who recomputes from the card gets a different
 *                      answer than we published.
 *
 * FAIL CLOSED, ALWAYS. Every ambiguity returns UNGRADEABLE rather than a guess.
 * Guessing which fixture a string refers to is the exact failure that produced
 * the 117 rows; a detector that repeated it would manufacture false accusations
 * about our own honesty, which is worse than detecting nothing.
 */

export type DetectorPickType = "MONEYLINE" | "SPREAD" | "TOTAL";

export type SettledPickInput = {
  readonly pickType: DetectorPickType;
  /** As published on the card, e.g. "OVER 46.3", "Air Force Falcons -29.3", "Alabama Crimson Tide ML (model signal)". */
  readonly selection: string;
  /** The line the CARD displays. Null for moneylines. */
  readonly line: number | null;
  /** The line the settler grades on when present (selectGradingLine). Null for moneylines. */
  readonly clvLockLine: number | null;
  /** Stored result. Only WIN/LOSS/PUSH are checkable; PENDING and VOID are not claims about a score. */
  readonly result: string;
};

export type FinalScoreInput = {
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
};

export type GradedOutcome = "WIN" | "LOSS" | "PUSH";

export type ContradictionVerdict =
  | "CONSISTENT"
  | "GRADED_ON_LOCK_LINE"
  | "CONTRADICTS_BOTH"
  | "UNGRADEABLE";

/** Results that assert something about a score, and can therefore be checked against one. */
const CHECKABLE_RESULTS: readonly string[] = ["WIN", "LOSS", "PUSH"];

/**
 * Which side of the fixture a selection names.
 *
 * EXACT match only, against the game row's own team names. Containment matching
 * is what bound picks to the wrong fixture in the first place (see
 * MIN_CONTAINMENT_TOKEN_LENGTH in free-settlement.ts, where "LA" matched
 * atLAnta, orLAndo and portLAnd), so this deliberately has no fuzz at all: it is
 * checking a claim, not resolving one, and an unrecognised name must produce
 * UNGRADEABLE rather than a coin flip.
 */
export function sideOf(
  teamName: string,
  final: FinalScoreInput,
): "HOME" | "AWAY" | "UNKNOWN" {
  const t = teamName.trim();
  if (t.length === 0) return "UNKNOWN";
  if (t === final.homeTeamName.trim()) return "HOME";
  if (t === final.awayTeamName.trim()) return "AWAY";
  return "UNKNOWN";
}

/** Strip the " ML"/" ML (model signal)" suffix a moneyline selection carries. */
export function moneylineTeam(selection: string): string {
  return selection.replace(/\s+ML\b.*$/i, "").trim();
}

/** Strip the trailing signed number a spread selection carries ("Air Force Falcons -29.3"). */
export function spreadTeam(selection: string): string {
  return selection.replace(/\s+[+-]?\d+(?:\.\d+)?\s*$/, "").trim();
}

/** OVER or UNDER, from the front of a total selection. Anything else is UNKNOWN. */
export function totalSide(selection: string): "OVER" | "UNDER" | "UNKNOWN" {
  const s = selection.trim().toUpperCase();
  if (s.startsWith("OVER")) return "OVER";
  if (s.startsWith("UNDER")) return "UNDER";
  return "UNKNOWN";
}

/**
 * The result this pick SHOULD carry, graded against `line`, using only the final
 * score on its own game row. Null when the pick cannot be graded without a
 * guess — which is a legitimate and common answer, not a failure.
 */
export function expectedResult(
  pick: SettledPickInput,
  final: FinalScoreInput,
  line: number | null,
): GradedOutcome | null {
  const { homeScore, awayScore } = final;
  if (homeScore === null || awayScore === null) return null;
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;

  switch (pick.pickType) {
    case "MONEYLINE": {
      // No line is involved, so nothing here can go wrong except the fixture.
      const side = sideOf(moneylineTeam(pick.selection), final);
      if (side === "UNKNOWN") return null;
      if (homeScore === awayScore) {
        // A draw. On a two-way moneyline this is unpriced and the engine is
        // supposed to refuse to publish it at all (the soccer guard, C-118), so
        // this detector will not adjudicate it either.
        return null;
      }
      const homeWon = homeScore > awayScore;
      return (side === "HOME") === homeWon ? "WIN" : "LOSS";
    }
    case "SPREAD": {
      if (line === null || !Number.isFinite(line)) return null;
      const side = sideOf(spreadTeam(pick.selection), final);
      if (side === "UNKNOWN") return null;
      // `line` is stored from the HOME team's perspective, the same contract
      // calculatePickResult uses: -3.5 means home favoured by 3.5 regardless of
      // which side was picked.
      const margin =
        side === "HOME" ? homeScore - awayScore + line : awayScore - homeScore - line;
      if (margin === 0) return "PUSH";
      return margin > 0 ? "WIN" : "LOSS";
    }
    case "TOTAL": {
      if (line === null || !Number.isFinite(line)) return null;
      const side = totalSide(pick.selection);
      if (side === "UNKNOWN") return null;
      const total = homeScore + awayScore;
      if (total === line) return "PUSH";
      const wentOver = total > line;
      return (side === "OVER") === wentOver ? "WIN" : "LOSS";
    }
  }
}

/**
 * Classify one settled pick against its own game row.
 *
 * The order matters: a row is only called CONTRADICTS_BOTH after the lock line
 * has been tried, because reporting a C-143 display divergence as corruption
 * would overstate the corruption by more than half.
 */
export function classifySettledPick(
  pick: SettledPickInput,
  final: FinalScoreInput,
): ContradictionVerdict {
  if (!CHECKABLE_RESULTS.includes(pick.result)) return "UNGRADEABLE";

  const againstDisplayed = expectedResult(pick, final, pick.line);
  if (againstDisplayed === null) return "UNGRADEABLE";
  if (againstDisplayed === pick.result) return "CONSISTENT";

  // Moneylines have no second line to try, so a disagreement is already final.
  if (pick.pickType === "MONEYLINE") return "CONTRADICTS_BOTH";

  if (pick.clvLockLine === null || pick.clvLockLine === pick.line) {
    return "CONTRADICTS_BOTH";
  }
  const againstLock = expectedResult(pick, final, pick.clvLockLine);
  if (againstLock === null) return "CONTRADICTS_BOTH";
  return againstLock === pick.result ? "GRADED_ON_LOCK_LINE" : "CONTRADICTS_BOTH";
}

export type ContradictionTally = {
  readonly checked: number;
  readonly consistent: number;
  /** Ledger C-115: no reading of this fixture makes the published result right. */
  readonly contradictsBoth: number;
  /** Ledger C-143: right against the graded line, wrong against the displayed one. */
  readonly gradedOnLockLine: number;
  readonly ungradeable: number;
};

const EMPTY_TALLY: ContradictionTally = {
  checked: 0,
  consistent: 0,
  contradictsBoth: 0,
  gradedOnLockLine: 0,
  ungradeable: 0,
};

/**
 * Roll a population up into counts for the operator surface.
 *
 * `contradictsBoth` is the number that matters: it is a count of published
 * claims about our own performance that are false. The honest target is zero,
 * and any non-zero value should be visible without anyone running SQL.
 */
export function tallyContradictions(
  rows: readonly { pick: SettledPickInput; final: FinalScoreInput }[],
): ContradictionTally {
  return rows.reduce<ContradictionTally>((acc, { pick, final }) => {
    const verdict = classifySettledPick(pick, final);
    return {
      checked: acc.checked + 1,
      consistent: acc.consistent + (verdict === "CONSISTENT" ? 1 : 0),
      contradictsBoth: acc.contradictsBoth + (verdict === "CONTRADICTS_BOTH" ? 1 : 0),
      gradedOnLockLine: acc.gradedOnLockLine + (verdict === "GRADED_ON_LOCK_LINE" ? 1 : 0),
      ungradeable: acc.ungradeable + (verdict === "UNGRADEABLE" ? 1 : 0),
    };
  }, EMPTY_TALLY);
}
