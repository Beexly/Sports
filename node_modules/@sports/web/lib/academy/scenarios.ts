/**
 * Academy Simulator — train on historical-style slates blind to the outcome.
 *
 * Each scenario shows the market state at lock (lines, injury, public pressure,
 * the model view, the counter-evidence) WITHOUT revealing what happened. The
 * trainee chooses PLAY / WATCHLIST / NO-BET; then the disciplined verdict AND the
 * outcome are revealed, and the decision is graded on PROCESS — restraint is
 * rewarded, a lucky win is flagged, an unlucky loss on a correct read is
 * respected. Status is earned through calibration, not streaks.
 *
 * DOCTRINE: illustrative training cases — no real teams, no fabricated platform
 * track record. The lesson is decision quality, which is real and teachable.
 */

export type AcademyChoice = "PLAY" | "WATCHLIST" | "NO-BET";
export type AcademyOutcome = "WON" | "LOST" | "PUSH" | "N/A";

export type AcademyScenario = {
  readonly id: string;
  readonly label: string;
  readonly market: string;
  readonly injury: string;
  readonly publicPressure: string;
  readonly modelView: string;
  readonly counterEvidence: string;
  /** The disciplined verdict — the "correct" PROCESS, not whatever won. */
  readonly correct: AcademyChoice;
  /** What actually happened (revealed after the choice). */
  readonly outcome: AcademyOutcome;
  readonly rationale: string;
};

export const SCENARIOS: readonly AcademyScenario[] = [
  {
    id: "s1",
    label: "Illustrative · NFL primetime favourite",
    market: "Home −6.5 · Total 44.5",
    injury: "Starting RB downgraded to questionable 90 minutes before kickoff.",
    publicPressure: "84% of tickets on the favourite; the line hasn't moved with them.",
    modelView: "Independents land near the number: no clean divergence from the price.",
    counterEvidence: "Heavy public exposure, and a live injury question sitting upstream of the spread.",
    correct: "NO-BET",
    outcome: "WON",
    rationale: "The disciplined call was No-Bet: no independent edge and a live injury question. It covered anyway: a lucky win, not a good read. We grade the thinking, not the scoreboard.",
  },
  {
    id: "s2",
    label: "Illustrative · NBA total drifting on info",
    market: "Total 228.5 → 224.5 by lock",
    injury: "Both teams healthy; confirmed starters.",
    publicPressure: "Even ticket split, no public surge behind the move.",
    modelView: "Two independents land below the number and agree on the Under; the line moved on information.",
    counterEvidence: "Thin closing-line history on this matchup type.",
    correct: "PLAY",
    outcome: "LOST",
    rationale: "The read was correct: independents diverged from the price and agreed, on information not noise. It lost: an unlucky outcome, not a bad decision. Process is what compounds.",
  },
  {
    id: "s3",
    label: "Illustrative · MLB weather question",
    market: "Total 8.5",
    injury: "Ace confirmed; bullpen rested.",
    publicPressure: "Slight lean to the Over.",
    modelView: "Pitching edge supports the Under.",
    counterEvidence: "Wind and rain forecast volatile through first pitch; the read's freshness is aging.",
    correct: "WATCHLIST",
    outcome: "N/A",
    rationale: "Real edge, but a live weather falsifier. Watchlist is the honest call until the forecast settles: not a push to play, not silence.",
  },
  {
    id: "s4",
    label: "Illustrative · NHL goalie TBD",
    market: "Puck line −1.5",
    injury: "Starting goalie unconfirmed at lock.",
    publicPressure: "Public on the favourite.",
    modelView: "Special-teams edge if the starter goes; the read collapses if the backup starts.",
    counterEvidence: "The entire thesis hinges on an unconfirmed status.",
    correct: "WATCHLIST",
    outcome: "WON",
    rationale: "Confirm the goalie and this upgrades to Play; until then it's a Watchlist. It won, but the read was unconfirmable at lock, so restraint was the correct decision.",
  },
  {
    id: "s5",
    label: "Illustrative · clean edge",
    market: "Away +3.5",
    injury: "All starters confirmed.",
    publicPressure: "Public on the home favourite; sharp money on the underdog.",
    modelView: "Three independents diverge from the price and agree on the dog; sharp-vs-public divergence is high.",
    counterEvidence: "Minor: a small sample on the situational angle.",
    correct: "PLAY",
    outcome: "WON",
    rationale: "Independents diverged and agreed, sharp money confirmed against the public, no live falsifier. Right read, right result: the standard, not the highlight.",
  },
];

// ── Grading: reward PROCESS (matching the disciplined verdict), reward restraint ──

const CAUTION: Record<AcademyChoice, number> = { PLAY: 0, WATCHLIST: 1, "NO-BET": 2 };
const FULL: Record<AcademyChoice, number> = { "NO-BET": 20, WATCHLIST: 16, PLAY: 15 };

export type GradeTone = "earned" | "respected" | "restraint" | "lucky" | "corrected" | "missed";

export type Grade = {
  readonly points: number;
  readonly maxPoints: number;
  readonly label: string;
  readonly tone: GradeTone;
  readonly note: string;
};

export function gradeChoice(choice: AcademyChoice, s: AcademyScenario): Grade {
  const max = FULL[s.correct];
  const exact = choice === s.correct;
  const moreCautious = CAUTION[choice] > CAUTION[s.correct];
  const points = exact ? max : moreCautious ? Math.round(max * 0.5) : 0;

  let label: string;
  let tone: GradeTone;
  let note: string;

  if (exact) {
    if (s.correct === "PLAY") {
      const won = s.outcome === "WON";
      label = won ? "Earned" : "Respected";
      tone = won ? "earned" : "respected";
      note = won ? "Right read, right result. The standard." : "Right read, wrong bounce. The process is sound; variance owes you nothing.";
    } else {
      label = "Correct restraint";
      tone = "restraint";
      note = "You matched the disciplined call. Restraint is a real outcome, not a boring one.";
    }
  } else if (moreCautious) {
    label = s.outcome === "WON" ? "Over-cautious" : "Dodged";
    tone = "missed";
    note = s.outcome === "WON" ? "More cautious than needed, but restraint is never the costly mistake." : "More cautious than the call, and the outcome agreed with you.";
  } else {
    // less cautious than the disciplined verdict — the dangerous square
    if (s.outcome === "WON") {
      label = "Lucky";
      tone = "lucky";
      note = "You forced a play the read didn't support. It won: a lucky win on a bad read, the most dangerous square.";
    } else {
      label = "Corrected";
      tone = "corrected";
      note = "You forced a play the read didn't support, and it didn't land. Logged, and learned from.";
    }
  }

  return { points, maxPoints: max, label, tone, note };
}

export const GRADE_HEX: Record<GradeTone, string> = {
  earned: "#00E5FF",
  respected: "#00E5FF",
  restraint: "#00E5FF",
  missed: "#7B61FF",
  lucky: "#FF38C7",
  corrected: "#FF38C7",
};

// ── Status ladder — earned by calibration, not streaks ──

export type Rank = { readonly name: string; readonly minPct: number };
export const RANKS: readonly Rank[] = [
  { name: "Observer", minPct: 0 },
  { name: "Scout", minPct: 0.25 },
  { name: "Analyst", minPct: 0.45 },
  { name: "Market Reader", minPct: 0.65 },
  { name: "Signal Architect", minPct: 0.82 },
  { name: "Galaxy Certified", minPct: 0.95 },
];

export function rankFor(pct: number): Rank {
  let r = RANKS[0]!;
  for (const rank of RANKS) if (pct >= rank.minPct) r = rank;
  return r;
}

export const MAX_SCORE = SCENARIOS.reduce((sum, s) => sum + FULL[s.correct], 0);
