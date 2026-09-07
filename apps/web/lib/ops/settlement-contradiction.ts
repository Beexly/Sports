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
 * FOUR DISTINCT VERDICTS, DELIBERATELY NOT MERGED. The fourth exists because
 * review showed the first version could not see it (CodeRabbit, #719):
 *
 *   CONTRADICTS_BOTH        the stored result matches neither the displayed
 *                           `line` nor the `clvLockLine` the settler grades on.
 *                           No reading of this fixture supports what we
 *                           published. This is corruption (ledger C-115).
 *
 *   GRADED_ON_LOCK_LINE     correct against `clvLockLine`, wrong against the
 *                           `line` the card displays. The grade is defensible;
 *                           the card shows the reader a different number than
 *                           the one we settled on (ledger C-143).
 *
 *   GRADED_ON_DISPLAY_LINE  correct against the card, wrong against the line
 *                           settlement claims to grade on. 46 published TOTAL
 *                           picks measure this way, and the first version of
 *                           this classifier reported every one of them as
 *                           CONSISTENT because it stopped as soon as the
 *                           displayed line agreed.
 *
 *   CONSISTENT              both readings agree with what we published.
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
  /** Sport key, e.g. "soccer_usa_mls". Decides the moneyline draw contract. */
  readonly sportKey: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
};

export type GradedOutcome = "WIN" | "LOSS" | "PUSH";

export type ContradictionVerdict =
  | "CONSISTENT"
  | "GRADED_ON_LOCK_LINE"
  | "GRADED_ON_DISPLAY_LINE"
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

/**
 * Strip the trailing SIGNED number a spread selection carries
 * ("Air Force Falcons -29.3").
 *
 * The sign is REQUIRED. An earlier revision made it optional, so
 * "Fixture Home Sox 1.5" parsed as a team plus a line and could then be graded
 * (CodeRabbit, #719). Six published spread selections in production carry an
 * unsigned tail, so this is not hypothetical. With the sign required they no
 * longer strip, the leftover string matches no team name, and they come back
 * UNGRADEABLE - which is the correct answer for a selection we cannot read.
 */
export function spreadTeam(selection: string): string {
  return selection.replace(/\s+[+-]\d+(?:\.\d+)?\s*$/, "").trim();
}

/**
 * OVER or UNDER, as a COMPLETE leading token. Anything else is UNKNOWN.
 *
 * A prefix test matched "OVERDUE 7" as OVER (CodeRabbit, #719). No production
 * selection does that today - measured zero - so this is defensive, but a
 * fail-closed module must not have a fail-open parser in it.
 */
export function totalSide(selection: string): "OVER" | "UNDER" | "UNKNOWN" {
  const m = /^(OVER|UNDER)\b/.exec(selection.trim().toUpperCase());
  if (m?.[1] === "OVER") return "OVER";
  if (m?.[1] === "UNDER") return "UNDER";
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
        // A draw, graded EXACTLY as production grades it
        // (packages/prediction-engine/src/settlement.ts:96): soccer settles a
        // two-way moneyline draw as LOSS because the draw is unpriced on a
        // three-way market, every other sport settles it PUSH.
        //
        // An earlier revision returned null here, which quietly excluded all 30
        // drawn moneylines in production from checking (Devin Review, #719) -
        // and soccer draws are precisely the C-118 fabrication-risk population,
        // so the detector was blind to the market it most needed to watch.
        return final.sportKey.includes("soccer") ? "LOSS" : "PUSH";
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
 * BOTH LINES ARE ALWAYS EVALUATED. An earlier revision returned CONSISTENT as
 * soon as the DISPLAYED line agreed and never looked at `clvLockLine` - the line
 * production actually grades on (selectGradingLine). That hid an entire class:
 * a pick right against the card and wrong against the line it was settled on.
 * Measured on production 2026-09-07, **46 published TOTAL picks are in exactly
 * that state**, and the detector called every one of them CONSISTENT
 * (CodeRabbit, #719). A detector that reports a clean bill on 46 anomalies is
 * worse than no detector, because it converts an unknown into a false assurance.
 *
 * The four outcomes are kept separate because they mean different things and
 * need different owners:
 *
 *   CONSISTENT              both readings agree with what we published.
 *   GRADED_ON_LOCK_LINE     right against the graded line, wrong against the
 *                           displayed one. The grade is defensible; the CARD is
 *                           showing a different number (ledger C-143).
 *   GRADED_ON_DISPLAY_LINE  right against the displayed line, wrong against the
 *                           line we say we grade on. The card is honest; the
 *                           SETTLEMENT did not follow its own documented rule.
 *   CONTRADICTS_BOTH        no reading of this fixture supports what we
 *                           published (ledger C-115).
 *
 * UNGRADEABLE is returned wherever a reading cannot be computed - including when
 * a lock line is present but unusable. Calling that CONTRADICTS_BOTH, as an
 * earlier revision did, would manufacture an accusation out of missing data.
 */
export function classifySettledPick(
  pick: SettledPickInput,
  final: FinalScoreInput,
): ContradictionVerdict {
  if (!CHECKABLE_RESULTS.includes(pick.result)) return "UNGRADEABLE";

  const againstDisplayed = expectedResult(pick, final, pick.line);
  if (againstDisplayed === null) return "UNGRADEABLE";

  // Moneylines carry no line, so the displayed reading is the only reading.
  if (pick.pickType === "MONEYLINE") {
    return againstDisplayed === pick.result ? "CONSISTENT" : "CONTRADICTS_BOTH";
  }

  // No distinct lock line: the displayed reading is again the only reading.
  if (pick.clvLockLine === null || pick.clvLockLine === pick.line) {
    return againstDisplayed === pick.result ? "CONSISTENT" : "CONTRADICTS_BOTH";
  }

  const againstLock = expectedResult(pick, final, pick.clvLockLine);
  // A lock line that exists but cannot be graded is missing evidence, not proof
  // of corruption.
  if (againstLock === null) return "UNGRADEABLE";

  const displayAgrees = againstDisplayed === pick.result;
  const lockAgrees = againstLock === pick.result;
  if (displayAgrees && lockAgrees) return "CONSISTENT";
  if (lockAgrees) return "GRADED_ON_LOCK_LINE";
  if (displayAgrees) return "GRADED_ON_DISPLAY_LINE";
  return "CONTRADICTS_BOTH";
}

export type ContradictionTally = {
  readonly checked: number;
  readonly consistent: number;
  /** Ledger C-115: no reading of this fixture makes the published result right. */
  readonly contradictsBoth: number;
  /** Ledger C-143: right against the graded line, wrong against the displayed one. */
  readonly gradedOnLockLine: number;
  /** Right against the displayed line, wrong against the line settlement claims to grade on. */
  readonly gradedOnDisplayLine: number;
  readonly ungradeable: number;
};

const EMPTY_TALLY: ContradictionTally = {
  checked: 0,
  consistent: 0,
  contradictsBoth: 0,
  gradedOnLockLine: 0,
  gradedOnDisplayLine: 0,
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
      gradedOnDisplayLine: acc.gradedOnDisplayLine + (verdict === "GRADED_ON_DISPLAY_LINE" ? 1 : 0),
      ungradeable: acc.ungradeable + (verdict === "UNGRADEABLE" ? 1 : 0),
    };
  }, EMPTY_TALLY);
}
