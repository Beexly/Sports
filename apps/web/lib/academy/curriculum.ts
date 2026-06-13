/**
 * Academy curriculum — interactive course tracks with embedded quizzes.
 *
 * Pure data + pure scoring (mirrors lib/academy/scenarios.ts patterns).
 * Coaching voice: short, declarative, every line earns its place — the
 * rule, the number, the move. Market mechanics and math only; never
 * fabricated stats about real teams.
 */

export type CourseTrack = "Line Literacy" | "Bankroll & Risk" | "Market Mechanics";
export type CourseLevel = "Core" | "Advanced";

export interface QuizOption {
  readonly id: string;
  readonly label: string;
  readonly correct: boolean;
  readonly why: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly QuizOption[];
}

export interface CourseLesson {
  readonly id: string;
  readonly track: CourseTrack;
  readonly level: CourseLevel;
  readonly title: string;
  readonly minutes: number;
  readonly body: readonly string[];
  readonly quiz: readonly QuizQuestion[];
}

export const COURSE_TRACKS: readonly CourseTrack[] = [
  "Line Literacy",
  "Bankroll & Risk",
  "Market Mechanics",
];

export const LESSONS: readonly CourseLesson[] = [
  // ── LINE LITERACY ────────────────────────────────────────────────
  {
    id: "ll-what-a-line-is",
    track: "Line Literacy",
    level: "Core",
    title: "A line is a price, not a prediction",
    minutes: 2,
    body: [
      "A spread is not a prediction — it's a price. −6.5 is where the market balances risk on both sides, not a forecast of the margin.",
      "So read every move as a repricing on new money or news. Your job is never to out-predict everyone; it's to spot when the price is wrong.",
    ],
    quiz: [
      {
        id: "ll1-q1",
        prompt: "A spread of −6.5 primarily represents…",
        options: [
          { id: "a", label: "The market's best guess at the final margin", correct: false, why: "The spread balances risk — that often differs from a pure margin forecast." },
          { id: "b", label: "A price that balances the risk on both sides", correct: true, why: "A line is a price. That reframe is lesson one." },
          { id: "c", label: "A promise about how the public will bet", correct: false, why: "Public money moves prices, but the line itself IS the price." },
        ],
      },
      {
        id: "ll1-q2",
        prompt: "A line moves from −6.5 to −7.5. The most accurate read:",
        options: [
          { id: "a", label: "The market now thinks the favorite wins by more", correct: false, why: "The precise read: the price moved, on money or news." },
          { id: "b", label: "The price of the favorite's risk went up", correct: true, why: "Movement is repricing — like any market." },
          { id: "c", label: "The original line was a mistake", correct: false, why: "Openers are early prices that expect adjustment, not mistakes." },
        ],
      },
    ],
  },
  {
    id: "ll-vig",
    track: "Line Literacy",
    level: "Core",
    title: "The vig: why −110 both ways isn't a fair coin",
    minutes: 3,
    body: [
      "At −110 you risk 110 to win 100 → implied 52.4%. Both sides at −110 sum to 104.8% — the extra 4.8% is the book's margin: the vig.",
      "52.4% is THE number: break-even on standard juice. Win 52.3% forever and you lose forever. Always de-vig before comparing your number to the market's.",
    ],
    quiz: [
      {
        id: "ll2-q1",
        prompt: "Break-even win rate at standard −110 juice?",
        options: [
          { id: "a", label: "50.0%", correct: false, why: "That's a fair coin. −110 isn't — you pay vig every bet." },
          { id: "b", label: "52.4%", correct: true, why: "110/(110+100) ≈ 52.4%. Below it, 'winning instincts' still lose money." },
          { id: "c", label: "55.0%", correct: false, why: "55% is genuinely strong. Break-even sits lower: 52.4%." },
        ],
      },
      {
        id: "ll2-q2",
        prompt: "Both sides priced −110 imply ~104.8% total. The extra 4.8% is…",
        options: [
          { id: "a", label: "Rounding error in the odds format", correct: false, why: "It's structural — the margin is built into both prices." },
          { id: "b", label: "The bookmaker's margin (the vig)", correct: true, why: "The overround IS the house edge. De-vig first." },
          { id: "c", label: "A measure of market uncertainty", correct: false, why: "Uncertainty shows in movement and limits. The overround is just the toll." },
        ],
      },
    ],
  },
  {
    id: "ll-key-numbers",
    track: "Line Literacy",
    level: "Advanced",
    title: "Key numbers: why 3 and 7 are worth real money",
    minutes: 2,
    body: [
      "Football margins pile up on 3 and 7 — field goals and touchdowns. The half-points around them are worth real money.",
      "−2.5 → −3.5 crosses the most common margin in the sport; −7.5 → −8 crosses almost nothing. Price half-points — never treat them as equal.",
    ],
    quiz: [
      {
        id: "ll3-q1",
        prompt: "The most valuable half-point to capture in an NFL spread:",
        options: [
          { id: "a", label: "From −2.5 to −3.5 (crossing 3)", correct: true, why: "3 is the most common NFL margin — crossing it changes the math most." },
          { id: "b", label: "From −9.5 to −10.5 (crossing 10)", correct: false, why: "Few games land exactly on 10." },
          { id: "c", label: "All half-points are worth the same", correct: false, why: "Margins cluster on 3 and 7 — those half-points carry outsized value." },
        ],
      },
    ],
  },

  // ── BANKROLL & RISK ─────────────────────────────────────────────
  {
    id: "br-units",
    track: "Bankroll & Risk",
    level: "Core",
    title: "Units: survival is the strategy",
    minutes: 2,
    body: [
      "A unit is 1–2% of bankroll, and it exists for survival: even profitable bettors hit streaks that ruin a 10%-a-play bettor.",
      "Drawdown is asymmetric — lose 50% and you need +100% to get even. Small, flat, boring sizing keeps you alive long enough for an edge to show.",
    ],
    quiz: [
      {
        id: "br1-q1",
        prompt: "You lose 50% of your bankroll. Return needed to get even:",
        options: [
          { id: "a", label: "+50%", correct: false, why: "+50% of the remaining half is only 75% of the start." },
          { id: "b", label: "+100%", correct: true, why: "The half must double. That asymmetry is the whole lesson." },
          { id: "c", label: "+75%", correct: false, why: "You need the remaining half to fully double: +100%." },
        ],
      },
      {
        id: "br1-q2",
        prompt: "The primary purpose of unit sizing:",
        options: [
          { id: "a", label: "Maximizing profit on your best ideas", correct: false, why: "Betting big on conviction is exactly what sizing protects you from." },
          { id: "b", label: "Surviving the losing streaks every bettor hits", correct: true, why: "Variance is a certainty; ruin is optional." },
          { id: "c", label: "Making record-keeping easier", correct: false, why: "A side benefit. Survival is the strategy." },
        ],
      },
    ],
  },
  {
    id: "br-kelly",
    track: "Bankroll & Risk",
    level: "Advanced",
    title: "Kelly intuition: why pros bet fractions of optimal",
    minutes: 3,
    body: [
      "Kelly gives the growth-optimal bet size (~edge ÷ odds). 55% at even money says 10% of your roll. Nobody sane bets full Kelly.",
      "Kelly assumes you KNOW your edge — you only estimate it. Overestimate at full Kelly and you're ruined; underestimate and you just grow slower. So pros bet quarter-to-half Kelly: half the size costs only a quarter of the growth.",
    ],
    quiz: [
      {
        id: "br2-q1",
        prompt: "Why do professionals bet a fraction of full Kelly?",
        options: [
          { id: "a", label: "Full Kelly is illegal at most books", correct: false, why: "It's about uncertainty in your own edge estimate, not rules." },
          { id: "b", label: "Overestimating your edge at full Kelly is catastrophic; underestimating just grows slower", correct: true, why: "The error penalty is asymmetric — fractional Kelly is insurance." },
          { id: "c", label: "Smaller bets are easier to track", correct: false, why: "Bookkeeping is irrelevant. Overbetting risk is the reason." },
        ],
      },
    ],
  },
  {
    id: "br-tilt",
    track: "Bankroll & Risk",
    level: "Core",
    title: "Tilt is a bankroll leak, not a mood",
    minutes: 2,
    body: [
      "Chasing a loss with a bigger bet = deciding your edge grew because you feel worse. Written down, it's absurd — and it's how disciplined plans die.",
      "The defenses are structural, not motivational: sizes fixed in advance, a hard daily cap, half-size within 30 minutes of a bad beat. And 'no bet' is a position — you owe action to nobody.",
    ],
    quiz: [
      {
        id: "br3-q1",
        prompt: "After two straight bad beats, the disciplined response:",
        options: [
          { id: "a", label: "Increase size to win it back while lines are soft", correct: false, why: "The tilt script. Losses shrink your roll, not your edge." },
          { id: "b", label: "Follow your pre-set sizing — or step away", correct: true, why: "Pre-set sizing is the defense. Bad beats change mood, not edge." },
          { id: "c", label: "Switch sports for fresh variance", correct: false, why: "New market, same leak." },
        ],
      },
    ],
  },

  {
    id: "ll-totals",
    track: "Line Literacy",
    level: "Advanced",
    title: "Totals: the other half of every slate",
    minutes: 2,
    body: [
      "A total (over/under) is the same kind of price as a spread — the market, not a forecast. Public money runs systematically to overs; that creates chronic over-inflation on high-profile totals.",
      "Weather reprices totals fast and is published late — wind and precipitation hit passing totals hardest. Track the line, not the narrative: a total that opens 48 and falls to 44 is telling you something sharp money saw.",
    ],
    quiz: [
      {
        id: "ll4-q1",
        prompt: "The O/U opens 47.5 and moves to 44.5 before game time. The best read:",
        options: [
          { id: "a", label: "Public is loading the over, as usual", correct: false, why: "Public loading the over would push the number UP, not down." },
          { id: "b", label: "Respected money or news moved the number down", correct: true, why: "A 3-point drop into the close reflects serious money or late news — weather, injury, pace." },
          { id: "c", label: "The opener was a mistake and the market corrected", correct: false, why: "Openers expect adjustment, but a 3-point move is larger than a routine correction." },
        ],
      },
      {
        id: "ll4-q2",
        prompt: "Why does systematic public bias toward overs matter?",
        options: [
          { id: "a", label: "It means overs are always bad bets", correct: false, why: "Systematic bias inflates prices — it's not a blanket fade, it's a pricing signal." },
          { id: "b", label: "It inflates over prices, making unders relatively cheap on average", correct: true, why: "Chronic public lean → overs priced above fair value → unders offer systematic value." },
          { id: "c", label: "Books cap total bets to protect against it", correct: false, why: "Books price through the bias, not around it." },
        ],
      },
    ],
  },

  {
    id: "br-ev",
    track: "Bankroll & Risk",
    level: "Advanced",
    title: "Expected value: the math under the money",
    minutes: 3,
    body: [
      "EV = (probability of win × amount won) − (probability of loss × amount lost). At −110, a bet paying 100 to win has EV of zero at 52.4%, positive above it, negative below it. One win says nothing; EV at 1,000 bets says everything.",
      "The practical move: price your edge before the bet, not after. If you think 56% and the market implies 52.4%, your edge is ~3.6% of the stake per bet. Never bet without a number — 'feels like a good spot' has no EV.",
    ],
    quiz: [
      {
        id: "br4-q1",
        prompt: "Your model says 55% on a −110 bet (break-even 52.4%). Is this a positive-EV bet?",
        options: [
          { id: "a", label: "Yes — your edge is ~2.6% over the breakeven", correct: true, why: "55% − 52.4% = 2.6% edge. Over a large sample, that compounds." },
          { id: "b", label: "No — you need at least 60% for a bet to be worth making", correct: false, why: "Any edge above 52.4% at −110 is positive EV. 60% is strong; 55% still has value." },
          { id: "c", label: "Depends on the sport", correct: false, why: "The sport doesn't change the math. The break-even is the same regardless." },
        ],
      },
      {
        id: "br4-q2",
        prompt: "What does it mean to 'price your edge before the bet'?",
        options: [
          { id: "a", label: "Wait until just before tip-off to decide", correct: false, why: "Timing is about information, not about having a number." },
          { id: "b", label: "Estimate your true-probability before looking at the line", correct: true, why: "Your number first, then the market's. Otherwise you're anchoring to their price." },
          { id: "c", label: "Use a third-party pricing service", correct: false, why: "The discipline is forming your own number — tools can help, but the habit is yours." },
        ],
      },
    ],
  },

  // ── MARKET MECHANICS ────────────────────────────────────────────
  {
    id: "mm-clv",
    track: "Market Mechanics",
    level: "Advanced",
    title: "CLV: the only honest scoreboard",
    minutes: 3,
    body: [
      "CLV asks one question: did you beat the final price? Beat the close consistently and you have real edge — even through losses. Lose to it and your winning record is borrowed variance.",
      "The close is the market's most efficient number — every dollar and datum has spoken. That's why CLV means something at sample sizes where win-rate means nothing. Track it on every bet.",
    ],
    quiz: [
      {
        id: "mm1-q1",
        prompt: "You took +7.5, it closed +6.5, the game lost. CLV's verdict:",
        options: [
          { id: "a", label: "Bad bet — it lost", correct: false, why: "Outcome ≠ process. The close judges the read, not one game." },
          { id: "b", label: "Good bet — you beat the close by a point", correct: true, why: "You beat the market's final price. Repeat that and profit follows." },
          { id: "c", label: "CLV can't be judged on losses", correct: false, why: "CLV grades every bet, win or lose — that's the point." },
        ],
      },
      {
        id: "mm1-q2",
        prompt: "Why is the CLOSE the benchmark, not the opener?",
        options: [
          { id: "a", label: "Books are required to honor the close", correct: false, why: "Information, not regulation." },
          { id: "b", label: "It has absorbed all the information and sharp money", correct: true, why: "Beating it means you were ahead of the market's final consensus." },
          { id: "c", label: "The close is always closer to the final score", correct: false, why: "Its efficiency — not single-game accuracy — is the point." },
        ],
      },
    ],
  },
  {
    id: "mm-steam",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Steam: value lives at origination",
    minutes: 2,
    body: [
      "Steam is a synchronized sharp move. Chasing it pays the new, worse price for old information — the value died at origination.",
      "What steam IS for: confirming where respected money sits and which openers were soft — so you're earlier next week. The edge is at origination, never in the echo.",
    ],
    quiz: [
      {
        id: "mm2-q1",
        prompt: "A line steams −6.5 → −7.5 on sharp money. Betting the favorite now gets you…",
        options: [
          { id: "a", label: "The sharps' edge, confirmed by the move", correct: false, why: "Their direction at a worse price — the value at −6.5 is gone." },
          { id: "b", label: "Their direction, without their price", correct: true, why: "Steam-chasing buys stale information at a premium." },
          { id: "c", label: "A safer bet, since the market agrees", correct: false, why: "Agreement is priced in — that's what the move was." },
        ],
      },
    ],
  },
  {
    id: "mm-openers",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Openers and limits: reading the market's confidence",
    minutes: 3,
    body: [
      "Openers post at low limits on purpose: the book pays sharps cheaply to find its own errors. Rising limits = rising trust in the number.",
      "So weight every move by the limits behind it: a 2-point move at open limits says less than a half-point at full limits near close.",
    ],
    quiz: [
      {
        id: "mm3-q1",
        prompt: "Why do books open lines at low limits?",
        options: [
          { id: "a", label: "To limit losses while the number gets stress-tested", correct: true, why: "The opener is a question; cheap sharp action answers it." },
          { id: "b", label: "To discourage early betting", correct: false, why: "They WANT informed early action — at harmless size." },
          { id: "c", label: "Regulations require ramping limits", correct: false, why: "Risk management, not regulation." },
        ],
      },
      {
        id: "mm3-q2",
        prompt: "Which move carries more information?",
        options: [
          { id: "a", label: "A 2-point move at tiny opening limits", correct: false, why: "Small limits, small conviction." },
          { id: "b", label: "A half-point move at full limits near close", correct: true, why: "Moving a trusted, high-limit number takes serious money." },
        ],
      },
    ],
  },
  {
    id: "mm-line-shopping",
    track: "Market Mechanics",
    level: "Core",
    title: "Line shopping: the free edge most bettors skip",
    minutes: 2,
    body: [
      "Half a point is worth real money. Across NFL spreads, −3 vs −2.5 is worth ~2% of stake in win probability. Getting −3.5 instead of −4 on a key number is worth more than any picking service charges.",
      "Line shopping requires accounts at multiple books. It takes 10 minutes to check four shops; that 10 minutes pays more than a full homework session on the wrong number. A bettor who shops lines is getting paid before the game starts.",
    ],
    quiz: [
      {
        id: "mm4-q1",
        prompt: "What is the practical definition of 'line shopping'?",
        options: [
          { id: "a", label: "Waiting for lines to move in your direction", correct: false, why: "That's timing, not shopping. Shopping is checking multiple books for the best number right now." },
          { id: "b", label: "Checking multiple sportsbooks to find the best available number", correct: true, why: "Books price slightly differently. Shopping captures the best number for free." },
          { id: "c", label: "Betting on the side with the lowest juice", correct: false, why: "That's juice shopping — a related but narrower concept." },
        ],
      },
      {
        id: "mm4-q2",
        prompt: "Why is a half-point at a key number worth more than normal?",
        options: [
          { id: "a", label: "Psychological comfort in seeing a better number", correct: false, why: "The value is statistical, not psychological." },
          { id: "b", label: "More games land on key numbers, so crossing them changes outcomes more often", correct: true, why: "Margins cluster on 3 and 7. Crossing them changes the outcome on a meaningful % of games." },
          { id: "c", label: "Books price them arbitrarily", correct: false, why: "Books price half-points around key numbers at a premium precisely because they're worth more." },
        ],
      },
    ],
  },
];

// ── Scoring ─────────────────────────────────────────────────────────

export interface TrackProgress {
  readonly track: CourseTrack;
  readonly lessons: number;
  readonly completed: number;
  readonly correct: number;
  readonly questions: number;
}

export function lessonsFor(track: CourseTrack): readonly CourseLesson[] {
  return LESSONS.filter((l) => l.track === track);
}

export function quizSize(lesson: CourseLesson): number {
  return lesson.quiz.length;
}

/** Grade letter for a track, from share of quiz answers correct. */
export function trackGrade(correct: number, total: number): string {
  if (total === 0) return "—";
  const pct = correct / total;
  if (pct >= 0.95) return "A+";
  if (pct >= 0.85) return "A";
  if (pct >= 0.75) return "B+";
  if (pct >= 0.65) return "B";
  if (pct >= 0.5) return "C";
  return "Retake";
}
