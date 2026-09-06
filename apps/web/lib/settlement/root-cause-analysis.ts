/**
 * Settlement backlog — root cause analysis techniques.
 *
 * Pure, deterministic classifiers for overdue / un-settled picks. Used by the
 * free-path settlement runner and operator clearance tooling so a CRITICAL
 * settlement-health band is never just a count — it is a Pareto of causes
 * with 5-Whys and fishbone structure.
 *
 * Law: no invented scores, no auto-void, refuse-default on disputed. RCA
 * explains; STP (stp-clearance.ts) acts only on eligible straight-through rows.
 */

export type SettlementRootCauseCode =
  | "NO_TRUSTED_FINAL"
  | "DISPUTED_SCORES"
  | "AMBIGUOUS_MATCHUP"
  | "TEAM_ORIENT_FAIL"
  | "WITHIN_GRACE"
  | "OVERDUE_NO_SCORE"
  | "SINGLE_SOURCE_POLICY_HOLD"
  | "PATH_MISCONFIG"
  | "WRITE_RACE_LOST"
  | "NOT_COMMENCED"
  // Zero-sit lane void codes (WP-29, ledger C-106). Stamped on the VOID
  // PickSettlementEvent payload by apps/web/lib/settlement/zero-sit-lane.ts;
  // never produced by classifySettlementRootCause (it explains, the lane acts).
  | "SCORE_MISMATCH_CROSS_PATH"
  | "AMBIGUOUS_TEAM_NAME"
  | "FIXTURE_NOT_FOUND"
  | "UNKNOWN";

/** Fishbone (Ishikawa) category for ops routing. */
export type FishboneCategory =
  | "DATA_SOURCE"
  | "MATCHING"
  | "POLICY"
  | "PATH_CONFIG"
  | "TIMING"
  | "DURABILITY"
  | "UNKNOWN";

export type PendingReason = "NO_FINAL" | "ORIENT_FAIL";

/**
 * Cause the zero-sit lane stamps on an AMBIGUOUS_TEAM_NAME void
 * (`evidence.cause` on the PickSettlementEvent payload; zero-sit-lane.ts
 * ZeroSitAmbiguityCause). The two causes have different defects and different
 * fixes: a city-only name is game-row identity debt; a same-day doubleheader
 * with full, correct names is a matcher join on team pair and day with no
 * event id.
 */
export type AmbiguousTeamNameCause = "CITY_ONLY_NAME" | "MULTIPLE_FINALS";

/** Evidence detail that refines a code's narrative (five whys, remediation). */
export interface RootCauseNarrativeDetail {
  readonly ambiguityCause?: AmbiguousTeamNameCause;
}

export interface RootCauseNarrative {
  readonly summary: string;
  readonly fiveWhys: readonly string[];
  readonly remediation: readonly string[];
}

export interface SettlementRcaInput {
  readonly pickId: string;
  readonly sportKey: string;
  /** Hours since kickoff (commenceTime). Negative = not yet commenced. */
  readonly ageHours: number;
  readonly graceHours: number;
  readonly outcomeStatus: "SETTLED" | "HELD" | "PENDING" | "WRITE_FAILED";
  readonly pendingReason?: PendingReason;
  readonly holdReason?: "DISPUTED" | "AMBIGUOUS_MATCH";
  readonly confirmation?: "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED";
  readonly settlementPath?: "free" | "odds-api";
  readonly oddsKeyPresentButFreeExpected?: boolean;
}

export interface SettlementRcaFinding {
  readonly pickId: string;
  readonly sportKey: string;
  readonly code: SettlementRootCauseCode;
  readonly category: FishboneCategory;
  readonly ageHours: number;
  readonly overdue: boolean;
  readonly summary: string;
  readonly fiveWhys: readonly string[];
  readonly remediation: readonly string[];
  /** Wave A = STP-eligible bulk, B = semi-auto, C = expert, D = policy. */
  readonly clearanceWave: "A" | "B" | "C" | "D";
}

export interface ParetoBucket {
  readonly code: SettlementRootCauseCode;
  readonly count: number;
  readonly share: number;
  readonly cumulativeShare: number;
  readonly category: FishboneCategory;
  readonly clearanceWave: "A" | "B" | "C" | "D";
}

export interface SettlementRcaReport {
  readonly total: number;
  readonly overdue: number;
  readonly findings: readonly SettlementRcaFinding[];
  readonly pareto: readonly ParetoBucket[];
  readonly byCategory: Readonly<Record<FishboneCategory, number>>;
  readonly byWave: Readonly<Record<"A" | "B" | "C" | "D", number>>;
  readonly topCause: SettlementRootCauseCode | null;
  readonly operatorHeadline: string;
}

const CODE_CATEGORY: Record<SettlementRootCauseCode, FishboneCategory> = {
  NO_TRUSTED_FINAL: "DATA_SOURCE",
  DISPUTED_SCORES: "DATA_SOURCE",
  AMBIGUOUS_MATCHUP: "MATCHING",
  TEAM_ORIENT_FAIL: "MATCHING",
  WITHIN_GRACE: "TIMING",
  OVERDUE_NO_SCORE: "DATA_SOURCE",
  SINGLE_SOURCE_POLICY_HOLD: "POLICY",
  PATH_MISCONFIG: "PATH_CONFIG",
  WRITE_RACE_LOST: "DURABILITY",
  NOT_COMMENCED: "TIMING",
  SCORE_MISMATCH_CROSS_PATH: "DATA_SOURCE",
  AMBIGUOUS_TEAM_NAME: "MATCHING",
  FIXTURE_NOT_FOUND: "DATA_SOURCE",
  UNKNOWN: "UNKNOWN",
};

const CODE_WAVE: Record<SettlementRootCauseCode, "A" | "B" | "C" | "D"> = {
  // A: straight-through once score arrives / reprocess
  NO_TRUSTED_FINAL: "A",
  OVERDUE_NO_SCORE: "A",
  WRITE_RACE_LOST: "A",
  // B: matching / single-source audit
  TEAM_ORIENT_FAIL: "B",
  SINGLE_SOURCE_POLICY_HOLD: "B",
  // C: expert / multi-source conflict
  DISPUTED_SCORES: "C",
  AMBIGUOUS_MATCHUP: "C",
  PATH_MISCONFIG: "C",
  SCORE_MISMATCH_CROSS_PATH: "C",
  AMBIGUOUS_TEAM_NAME: "C",
  FIXTURE_NOT_FOUND: "C",
  // D: not actionable yet / unknown
  WITHIN_GRACE: "D",
  NOT_COMMENCED: "D",
  UNKNOWN: "D",
};

function fiveWhysFor(
  code: SettlementRootCauseCode,
  detail: RootCauseNarrativeDetail = {},
): readonly string[] {
  switch (code) {
    case "NO_TRUSTED_FINAL":
      return [
        "Why is the pick still PENDING? No trusted final matched the game.",
        "Why no final? Free score feeds returned no completed game for these teams/date.",
        "Why missing from feeds? Game not posted, name mismatch upstream, or feed lag.",
        "Why still lagging past grace? Settlement cron ran without a usable score row.",
        "Root: score-ingest coverage or team-normalisation gap for this matchup.",
      ];
    case "OVERDUE_NO_SCORE":
      return [
        "Why overdue? Kickoff was more than graceHours ago and result is still PENDING.",
        "Why not settled? No CONFIRMED/SINGLE_SOURCE final was available at last run.",
        "Why no score? Source outage, sport not mapped, or finals filter dropped the game.",
        "Why did health go CRITICAL? Overdue count crossed the settlement-health threshold.",
        "Root: leading CLV indicator is starving — restore score path then re-run settle-picks.",
      ];
    case "DISPUTED_SCORES":
      return [
        "Why HELD? Two free sources disagree on the final score.",
        "Why disagree? Upstream typo, delayed correction, or wrong game join.",
        "Why not auto-settled? Law forbids settling DISPUTED blindly.",
        "Why in backlog? Exception queue has no owner decision yet.",
        "Root: multi-source conflict requiring human/evidence resolution.",
      ];
    case "AMBIGUOUS_MATCHUP":
      return [
        "Why HELD? More than one trusted final matched this pick's team-pair and date, with disagreeing scores.",
        "Why more than one match? Matching is team-pair + calendar-day only — no game/event ID in the join.",
        "Why does that produce two candidates? A same-day rematch (e.g. an MLB doubleheader) is two real games under one matchup key.",
        "Why not auto-settled against the first candidate? Grading against an arbitrary final risks settling the wrong game.",
        "Root: resolve by game/event ID, not team+date — filed as a follow-up; until then this holds for manual audit.",
      ];
    case "TEAM_ORIENT_FAIL":
      return [
        "Why PENDING despite a final? Home-team orientation failed.",
        "Why orient fail? normalizeTeamToken could not map pick home to final home/away.",
        "Why mismatch? Abbreviation vs full name, relocation, or feeder alias gap.",
        "Why not fixed automatically? Alias table has no entry for this pair.",
        "Root: team identity normalisation debt.",
      ];
    case "PATH_MISCONFIG":
      return [
        "Why free-path expected but not active? Before 2026-09-02 odds key presence selected the paid path alone.",
        "Why paid path broken? Key present but deactivated forced odds-api and threw every cycle.",
        "Why backlog grows? Paid settle failed closed; free runner never ran. Since 2026-09-02 the free grader runs first on every cycle, so this cause can only come from a caller still flagging it.",
        "Why ops surprised? diagnoseOddsKeyPresence documents this law.",
        "Root: THE_ODDS_API_KEY must be absent (not merely invalid) for free STP.",
      ];
    case "WRITE_RACE_LOST":
      return [
        "Why not counted settled? updateMany matched 0 PENDING rows.",
        "Why race? Concurrent settle-picks or manual settle won the write.",
        "Why reappear in backlog load? Stale read before refresh.",
        "Why safe? Idempotent PENDING→terminal write is working as designed.",
        "Root: benign race — re-count; do not double-write.",
      ];
    case "WITHIN_GRACE":
      return [
        "Why still PENDING? Game commenced but grace window has not elapsed.",
        "Why not overdue? Settlement health only counts past graceHours.",
        "Why wait? Finals often post after the final whistle + feed delay.",
        "Why list it? Visibility only — not a clearance target yet.",
        "Root: timing — no action until grace expires.",
      ];
    case "NOT_COMMENCED":
      return [
        "Why not settled? Game has not commenced.",
        "Why in pending load? Runner loads all PENDING, not only commenced.",
        "Why ignore for backlog burn? Settlement health excludes future games.",
        "Why keep? Will become actionable after kickoff + grace.",
        "Root: not a backlog item yet.",
      ];
    case "SINGLE_SOURCE_POLICY_HOLD":
      return [
        "Why not STP auto? Policy requires dual-source or explicit single-source allow.",
        "Why only one source? Secondary feed missing sport or game.",
        "Why audit flag? SINGLE_SOURCE is allowed to settle but elevated for review.",
        "Why wave B? Human spot-check sample, not full stop.",
        "Root: secondary score coverage gap.",
      ];
    case "SCORE_MISMATCH_CROSS_PATH":
      return [
        "Why VOIDED? The game row already carried a FINAL score that disagreed with the free final, so every grader refused to write.",
        "Why disagree? Two feeds matched two different real games (city-only team names) or one feed corrected a score after the other wrote it.",
        "Why not graded against either? Grading against a score another lane refused to record would settle the pick against a result the record does not show.",
        "Why voided after 24h? Founder policy 2026-09-05: no pick sits in human review forever; the conflict is recorded on the outbox event.",
        "Root: game identity resolved by team name and date, not by event id; see the name guard in process-sport.ts.",
      ];
    case "AMBIGUOUS_TEAM_NAME":
      switch (detail.ambiguityCause) {
        case "CITY_ONLY_NAME":
          return [
            "Why VOIDED? The free matcher held the pick AMBIGUOUS_MATCH on every cycle: a stored side is a city-only name that fits more than one team.",
            "Why ambiguous? A city-only side (New York, Los Angeles, Chicago) names two or more teams on the fetched boards, so no single final can be tied to it.",
            "Why city-only? A feed dropped the nickname and the plain upsert overwrote the stored full name (fixed by preferLongerTeamName in process-sport.ts).",
            "Why voided after 24h? A hold is a decision only while a final can still arrive; for an unidentifiable game none can.",
            "Root: team identity debt on the game row; the outbox event carries both names and cause CITY_ONLY_NAME.",
          ];
        case "MULTIPLE_FINALS":
          return [
            "Why VOIDED? The free matcher held the pick AMBIGUOUS_MATCH on every cycle: more than one final for these two teams inside the date window disagrees on the score.",
            "Why more than one final? A same-day rematch (an MLB doubleheader) is two real games under one team-pair + calendar-day key; the stored names are full and correct.",
            "Why not the nearest one? The matcher joins on team pair and day, not on event id or kickoff, so it cannot say which final is this pick's game.",
            "Why voided after 24h? Grading against either candidate risks settling the wrong game, and the hold cannot resolve without an identifier.",
            "Root: game identity by team pair and date, not event id; the outbox event carries the disagreeing candidates' sources and cause MULTIPLE_FINALS.",
          ];
        default:
          return [
            "Why VOIDED? The free matcher held the pick AMBIGUOUS_MATCH on every cycle: its team names cannot identify one game.",
            "Why ambiguous? Either a city-only side names two or more teams on the fetched boards (cause CITY_ONLY_NAME) or two same-day finals for the pair disagree (cause MULTIPLE_FINALS); evidence.cause on the outbox event says which.",
            "Why does the cause matter? A city-only name is game-row identity debt; a doubleheader is a matcher join on team pair and day with no event id, with the names correct.",
            "Why voided after 24h? A hold is a decision only while a final can still arrive; for an unidentifiable game none can.",
            "Root: read evidence.cause on the PickSettlementEvent payload and follow that cause's remediation.",
          ];
      }
    case "FIXTURE_NOT_FOUND":
      return [
        "Why VOIDED? The free ESPN scoreboard for the sport and date lists no event pairing the pick's two stored team names.",
        "Why no event? The game row was created from an early listing (a May schedule) that the league later moved or never played, or a stored name does not match the board (an alias or spelling mismatch produces the same evidence).",
        "Why did a pick exist? The slate generated from our own stale kickoff time, not from a confirmed fixture (C-111 guards this upstream).",
        "Why CANCELED or not? The row is marked CANCELED only when NEITHER stored name matched a board side (evidence homeListed and awayListed both false) and the row was still SCHEDULED or LIVE; a POSTPONED row keeps its status because it may be rescheduled, and when one stored name matched against another opponent the board is real and the row is left as is (a one-sided name mismatch).",
        "Root: fixture confirmation missing before pick generation; the per-name evidence separates a phantom fixture from a name defect only once the fixture itself is verified.",
      ];
    default:
      return [
        "Why unclassified? Outcome shape did not match a known pattern.",
        "Why still a risk? Unknowns hide silent failure modes.",
        "Why escalate? Prefer over-reporting to under-reporting on money paths.",
        "Why capture raw status? Feeds the next classifier revision.",
        "Root: UNKNOWN — inspect raw outcome and extend the classifier.",
      ];
  }
}

function remediationFor(
  code: SettlementRootCauseCode,
  detail: RootCauseNarrativeDetail = {},
): readonly string[] {
  switch (code) {
    case "NO_TRUSTED_FINAL":
    case "OVERDUE_NO_SCORE":
      return [
        "Re-run free score persist + settle-picks for the sport.",
        "Verify ESPN/henrygd coverage for the matchup date.",
        "Check team name tokens if the game appears in feeds under different labels.",
      ];
    case "DISPUTED_SCORES":
      return [
        "Compare source scores; wait for feed correction or record owner decision.",
        "Never force-settle DISPUTED without evidence receipt.",
      ];
    case "AMBIGUOUS_MATCHUP":
      return [
        "Manually confirm which final matches this pick's actual game (check kickoff time, not just date).",
        "Never force-settle against an arbitrary candidate — resolve by game ID before grading.",
        "Consider threading a real per-game identifier through the match path as a follow-up fix.",
      ];
    case "TEAM_ORIENT_FAIL":
      return [
        "Add/verify team alias normalisation for the home token.",
        "Re-run settle after alias fix — pure matcher, no score invention.",
      ];
    case "PATH_MISCONFIG":
      return [
        "Confirm the deployed settle-picks grades free-first (response path:\"free\" or \"free+odds-api\", oddsApiRequired:false).",
        "If paidSupplement.failedSports repeats every hour the key is dead: remove or renew THE_ODDS_API_KEY (either state is safe).",
      ];
    case "WRITE_RACE_LOST":
      return ["Re-load settlement health; treat as already cleared if result is terminal."];
    case "WITHIN_GRACE":
    case "NOT_COMMENCED":
      return ["No clearance action — wait for grace / kickoff."];
    case "SINGLE_SOURCE_POLICY_HOLD":
      return [
        "Optional: allow SINGLE_SOURCE auto-settle under STP audit policy.",
        "Improve secondary feed coverage for dual confirmation.",
      ];
    case "SCORE_MISMATCH_CROSS_PATH":
      return [
        "Already voided by the zero-sit lane; read the recorded and incoming scores on the PickSettlementEvent payload.",
        "If the game row names are city-only, merge the duplicate game rows (scripts/ops/merge-duplicate-games.ts) so the next season resolves by identity.",
      ];
    case "AMBIGUOUS_TEAM_NAME":
      switch (detail.ambiguityCause) {
        case "CITY_ONLY_NAME":
          return [
            "Already voided by the zero-sit lane; the payload carries both team names, the matcher hold and cause CITY_ONLY_NAME.",
            "Repair the game row names (full team names) so future picks on the same fixture can be matched; the names are the defect.",
          ];
        case "MULTIPLE_FINALS":
          return [
            "Already voided by the zero-sit lane; the payload carries both team names, the disagreeing candidates' sources and cause MULTIPLE_FINALS.",
            "Disambiguate by event id or kickoff time, not by team names: thread a per-game identifier (or the kickoff) through the free matcher join so a doubleheader resolves to its own final. The names are not the defect.",
          ];
        default:
          return [
            "Already voided by the zero-sit lane; read evidence.cause on the PickSettlementEvent payload.",
            "CITY_ONLY_NAME: repair the game row names (full team names). MULTIPLE_FINALS: disambiguate by event id or kickoff time, not by names.",
          ];
      }
    case "FIXTURE_NOT_FOUND":
      return [
        "Already voided by the zero-sit lane; read evidence.homeListed and evidence.awayListed on the PickSettlementEvent payload: both false means neither stored name matched the board (an alias or spelling mismatch produces the same evidence), not proof that the contest did not occur; one true means a real board with a stored name it does not match, and the row was left as is.",
        "Verify the fixture itself (the ESPN event id or the league schedule page) before concluding the contest did not occur: a SCHEDULED or LIVE row with both names unmatched was marked CANCELED and must be reopened if the contest exists under other names; a POSTPONED row kept its status.",
        "Confirm the fixture against ESPN before any new pick (C-111); for a name mismatch repair the stored team name instead of cancelling anything.",
      ];
    default:
      return ["Inspect raw settlement outcome and extend RCA classifier."];
  }
}

function summaryFor(code: SettlementRootCauseCode, ageHours: number): string {
  switch (code) {
    case "NO_TRUSTED_FINAL":
      return `No trusted final matched (${ageHours.toFixed(1)}h since kickoff).`;
    case "OVERDUE_NO_SCORE":
      return `Overdue with no usable score (${ageHours.toFixed(1)}h).`;
    case "DISPUTED_SCORES":
      return "Held: multi-source score dispute.";
    case "AMBIGUOUS_MATCHUP":
      return "Held: same-day rematch matched more than one final with disagreeing scores.";
    case "TEAM_ORIENT_FAIL":
      return "Final found but home-team orientation failed.";
    case "PATH_MISCONFIG":
      return "Settlement path misconfigured (legacy: odds key present blocked the free grader before the 2026-09-02 free-first law).";
    case "WRITE_RACE_LOST":
      return "Idempotent write lost race — likely already settled.";
    case "WITHIN_GRACE":
      return `Within grace window (${ageHours.toFixed(1)}h).`;
    case "NOT_COMMENCED":
      return "Game not yet commenced.";
    case "SINGLE_SOURCE_POLICY_HOLD":
      return "Single-source final — audit / policy wave.";
    case "SCORE_MISMATCH_CROSS_PATH":
      return `Voided: recorded FINAL score disagreed with the free final for more than 24h (${ageHours.toFixed(1)}h since kickoff).`;
    case "AMBIGUOUS_TEAM_NAME":
      return `Voided: team names could not identify one game (${ageHours.toFixed(1)}h since kickoff).`;
    case "FIXTURE_NOT_FOUND":
      return `Voided: the free scoreboard for that date lists no event pairing the two stored team names (${ageHours.toFixed(1)}h since kickoff).`;
    default:
      return "Unclassified settlement blockage.";
  }
}

/**
 * Narrative (summary, five whys, remediation) for one code, refined by the
 * evidence detail the zero-sit lane stamps on its VOID events. Pure. Used to
 * explain codes classifySettlementRootCause never produces (the lane acts,
 * this explains) without losing the cause that decides the fix.
 */
export function rootCauseNarrative(
  code: SettlementRootCauseCode,
  ageHours: number,
  detail: RootCauseNarrativeDetail = {},
): RootCauseNarrative {
  return {
    summary: summaryFor(code, ageHours),
    fiveWhys: fiveWhysFor(code, detail),
    remediation: remediationFor(code, detail),
  };
}

/**
 * Classify one pick outcome into a root-cause finding.
 * Pure. Prefer specific codes over UNKNOWN.
 */
export function classifySettlementRootCause(input: SettlementRcaInput): SettlementRcaFinding {
  const overdue = input.ageHours >= input.graceHours;
  let code: SettlementRootCauseCode = "UNKNOWN";

  if (input.oddsKeyPresentButFreeExpected) {
    code = "PATH_MISCONFIG";
  } else if (input.outcomeStatus === "WRITE_FAILED") {
    code = "WRITE_RACE_LOST";
  } else if (input.holdReason === "AMBIGUOUS_MATCH") {
    code = "AMBIGUOUS_MATCHUP";
  } else if (input.outcomeStatus === "HELD" || input.holdReason === "DISPUTED") {
    code = "DISPUTED_SCORES";
  } else if (input.outcomeStatus === "SETTLED") {
    // Settled is success — free path settles SINGLE_SOURCE by design.
    // Do not pollute backlog Pareto with "policy hold" for completed rows.
    code = "UNKNOWN";
  } else if (input.ageHours < 0) {
    code = "NOT_COMMENCED";
  } else if (!overdue) {
    code = "WITHIN_GRACE";
  } else if (input.pendingReason === "ORIENT_FAIL") {
    code = "TEAM_ORIENT_FAIL";
  } else if (input.pendingReason === "NO_FINAL") {
    code = overdue ? "OVERDUE_NO_SCORE" : "NO_TRUSTED_FINAL";
  } else if (input.outcomeStatus === "PENDING") {
    code = overdue ? "OVERDUE_NO_SCORE" : "NO_TRUSTED_FINAL";
  }

  return {
    pickId: input.pickId,
    sportKey: input.sportKey,
    code,
    category: CODE_CATEGORY[code],
    ageHours: input.ageHours,
    overdue,
    summary: summaryFor(code, input.ageHours),
    fiveWhys: fiveWhysFor(code),
    remediation: remediationFor(code),
    clearanceWave: CODE_WAVE[code],
  };
}

/** Build Pareto of causes (count desc) with cumulative share for 80/20 attack. */
export function buildCausePareto(findings: readonly SettlementRcaFinding[]): ParetoBucket[] {
  // Actionable overdue only — exclude timing noise and successful SETTLED (UNKNOWN).
  const backlog = findings.filter(
    (f) =>
      f.overdue &&
      f.code !== "NOT_COMMENCED" &&
      f.code !== "WITHIN_GRACE" &&
      f.code !== "UNKNOWN",
  );
  const counts = new Map<SettlementRootCauseCode, number>();
  for (const f of backlog) {
    counts.set(f.code, (counts.get(f.code) ?? 0) + 1);
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let cumulative = 0;
  const denom = Math.max(1, ordered.reduce((s, [, c]) => s + c, 0));
  return ordered.map(([code, count]) => {
    const share = count / denom;
    cumulative += share;
    return {
      code,
      count,
      share,
      cumulativeShare: cumulative,
      category: CODE_CATEGORY[code],
      clearanceWave: CODE_WAVE[code],
    };
  });
}


export function aggregateSettlementRca(
  findings: readonly SettlementRcaFinding[],
): SettlementRcaReport {
  const overdue = findings.filter(
    (f) =>
      f.overdue &&
      f.code !== "NOT_COMMENCED" &&
      f.code !== "WITHIN_GRACE" &&
      f.code !== "UNKNOWN",
  ).length;
  const pareto = buildCausePareto(findings);
  const byCategory: Record<FishboneCategory, number> = {
    DATA_SOURCE: 0,
    MATCHING: 0,
    POLICY: 0,
    PATH_CONFIG: 0,
    TIMING: 0,
    DURABILITY: 0,
    UNKNOWN: 0,
  };
  const byWave: Record<"A" | "B" | "C" | "D", number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const f of findings) {
    byCategory[f.category] += 1;
    byWave[f.clearanceWave] += 1;
  }
  const topCause = pareto[0]?.code ?? null;
  const operatorHeadline =
    findings.length === 0
      ? "No settlement RCA findings — backlog empty or not loaded."
      : overdue === 0
        ? `Settlement RCA: ${findings.length} pending inspected, 0 overdue past grace.`
        : `Settlement RCA: ${overdue} overdue — top cause ${topCause ?? "UNKNOWN"} ` +
          `(${pareto[0] ? (pareto[0].share * 100).toFixed(0) : 0}% of actionable). ` +
          `Attack wave ${pareto[0]?.clearanceWave ?? "A"} first.`;

  return {
    total: findings.length,
    overdue,
    findings,
    pareto,
    byCategory,
    byWave,
    topCause,
    operatorHeadline,
  };
}
