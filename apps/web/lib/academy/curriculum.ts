/**
 * Academy curriculum — interactive course tracks with embedded quizzes.
 *
 * Pure data + pure scoring (mirrors lib/academy/scenarios.ts and
 * lib/fantasy/academy.ts patterns). Every lesson teaches market mechanics
 * that are true everywhere — math and structure, never fabricated stats
 * about real teams or games. The UI layer persists progress locally.
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
    minutes: 4,
    body: [
      "A point spread is not the market saying \"this team wins by 6.\" It is a price set so that risk is balanced — the number that splits informed money. The market doesn't care about being right about the game; it cares about being balanced on the risk.",
      "That distinction is the whole foundation. When you read \"−6.5\", read it as the market's clearing price for one side's risk. Your job is never to predict the game better than everyone; it's to find places where the price is wrong.",
      "Corollary: a line moving is not the market \"changing its mind about the winner.\" It is the price adjusting to new money and new information — exactly like any other market.",
    ],
    quiz: [
      {
        id: "ll1-q1",
        prompt: "A spread of −6.5 primarily represents…",
        options: [
          { id: "a", label: "The market's best guess at the final margin", correct: false, why: "Close, but no — the spread is set to balance risk, which often differs from a pure margin forecast." },
          { id: "b", label: "A price that balances the risk on both sides", correct: true, why: "A line is a clearing price for risk. Reading it as a price, not a prediction, is lesson one." },
          { id: "c", label: "A promise about how the public will bet", correct: false, why: "Public betting influences prices, but the line itself is the price — not a statement about who bets it." },
        ],
      },
      {
        id: "ll1-q2",
        prompt: "When a line moves from −6.5 to −7.5, the most accurate read is…",
        options: [
          { id: "a", label: "The market now thinks the favorite wins by more", correct: false, why: "Maybe — but the precise read is that the price moved, usually on money or news, not that a forecast changed." },
          { id: "b", label: "The price of the favorite's risk went up", correct: true, why: "Lines are prices. Movement is repricing — new money or new information shifted the clearing point." },
          { id: "c", label: "The original line was a mistake", correct: false, why: "Movement doesn't imply error. Openers are intentionally early prices that expect adjustment." },
        ],
      },
    ],
  },
  {
    id: "ll-vig",
    track: "Line Literacy",
    level: "Core",
    title: "The vig: why −110 both ways isn't a fair coin",
    minutes: 5,
    body: [
      "At −110 you risk 110 to win 100. Implied probability = risk ÷ (risk + win) = 110 ÷ 210 ≈ 52.4%. Both sides at −110 implies 104.8% total probability — the extra 4.8 points is the book's margin, the vig.",
      "That 52.4% is the most important number in this whole building: it's the break-even win rate on standard juice. Win 52.3% of your −110 bets forever and you lose money forever.",
      "Always de-vig before you compare your number to the market's. If your model says 55% and the market implies 52.4%, your true edge is the gap after removing the vig from BOTH sides — not the raw difference.",
    ],
    quiz: [
      {
        id: "ll2-q1",
        prompt: "What win rate do you need just to break even at standard −110 juice?",
        options: [
          { id: "a", label: "50.0%", correct: false, why: "That's a fair coin — but −110 isn't fair. You're paying the vig on every bet." },
          { id: "b", label: "52.4%", correct: true, why: "110/(110+100) ≈ 52.38%. Below this, a 'winning instinct' still loses money." },
          { id: "c", label: "55.0%", correct: false, why: "55% is a genuinely strong long-run rate — break-even is lower, at 52.4%." },
        ],
      },
      {
        id: "ll2-q2",
        prompt: "Both sides of a total are priced at −110. The implied probabilities sum to ~104.8%. The extra 4.8% is…",
        options: [
          { id: "a", label: "Rounding error in the odds format", correct: false, why: "It's structural, not rounding — the book builds its margin into the prices." },
          { id: "b", label: "The bookmaker's margin (the vig)", correct: true, why: "The overround IS the house edge. De-vig before treating implied numbers as probabilities." },
          { id: "c", label: "A measure of market uncertainty", correct: false, why: "Uncertainty shows up in line movement and limits — the overround is just the toll." },
        ],
      },
    ],
  },
  {
    id: "ll-key-numbers",
    track: "Line Literacy",
    level: "Advanced",
    title: "Key numbers: why 3 and 7 are worth real money",
    minutes: 5,
    body: [
      "Football margins cluster on 3 and 7 because of how scoring works — field goals and touchdowns. A huge share of NFL games land exactly on those margins, which makes the half-point around them disproportionately valuable.",
      "Moving from −2.5 to −3.5 crosses THE most common final margin in the sport. That half point is worth far more than the half point between −7.5 and −8. Buying or timing your entry around key numbers is one of the few structural edges that never goes away.",
      "The discipline: never treat all half-points as equal. Price them. A line that crosses 3 is a different bet than the same team at the same juice on the other side of it.",
    ],
    quiz: [
      {
        id: "ll3-q1",
        prompt: "Which half-point is most valuable to capture in an NFL spread?",
        options: [
          { id: "a", label: "From −2.5 to −3.5 (crossing 3)", correct: true, why: "3 is the most common final margin in the NFL — crossing it changes the bet's math more than any other half point." },
          { id: "b", label: "From −9.5 to −10.5 (crossing 10)", correct: false, why: "10 matters less — far fewer games land exactly on it than on 3 or 7." },
          { id: "c", label: "All half-points are worth the same", correct: false, why: "They aren't — margins cluster on 3 and 7, so those half-points carry outsized value." },
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
    minutes: 4,
    body: [
      "A unit is a fixed fraction of your bankroll — typically 1–2%. The point isn't bookkeeping; it's survival. Even a genuinely profitable bettor hits losing streaks that would destroy someone betting 10% a play.",
      "The math of drawdown is brutal and asymmetric: lose 50% of a bankroll and you need +100% just to get back to even. Sizing exists to keep you out of the part of the curve you can't climb back from.",
      "Flat, small, boring sizing is what lets an edge actually express itself over the sample it needs. Variance kills more sharp bettors than bad picks do.",
    ],
    quiz: [
      {
        id: "br1-q1",
        prompt: "You lose 50% of your bankroll. What return do you now need to get back to even?",
        options: [
          { id: "a", label: "+50%", correct: false, why: "+50% on the remaining half only gets you to 75% of where you started. Drawdown is asymmetric." },
          { id: "b", label: "+100%", correct: true, why: "Half the roll must double to recover. This asymmetry is why sizing discipline beats picking talent." },
          { id: "c", label: "+75%", correct: false, why: "Not quite — you need the remaining half to fully double: +100%." },
        ],
      },
      {
        id: "br1-q2",
        prompt: "The primary purpose of unit sizing is…",
        options: [
          { id: "a", label: "Maximizing profit on your best ideas", correct: false, why: "That instinct — betting big when 'sure' — is exactly what sizing protects you from." },
          { id: "b", label: "Surviving the losing streaks every bettor hits", correct: true, why: "Variance is a certainty; ruin is optional. Sizing keeps an edge alive long enough to matter." },
          { id: "c", label: "Making record-keeping easier", correct: false, why: "A side benefit at best. Survival is the strategy." },
        ],
      },
    ],
  },
  {
    id: "br-kelly",
    track: "Bankroll & Risk",
    level: "Advanced",
    title: "Kelly intuition: why pros bet fractions of optimal",
    minutes: 5,
    body: [
      "The Kelly criterion gives the bankroll fraction that maximizes long-run growth: roughly edge ÷ odds. With a 55% win rate at even money, Kelly says 10% of your roll per bet. Almost nobody sane bets full Kelly.",
      "Why: Kelly assumes you KNOW your edge. You don't — you estimate it, and overestimating your edge while betting full Kelly is catastrophic, while underestimating just grows slower. The penalty is asymmetric, so professionals bet quarter- to half-Kelly.",
      "The takeaway isn't a formula, it's a posture: your true edge is probably smaller than your estimate, so size like it. Half the optimal size costs you a quarter of the growth — cheap insurance against being wrong about yourself.",
    ],
    quiz: [
      {
        id: "br2-q1",
        prompt: "Why do professionals bet a fraction of full Kelly?",
        options: [
          { id: "a", label: "Full Kelly is illegal at most books", correct: false, why: "It's not about rules — it's about uncertainty in your own edge estimate." },
          { id: "b", label: "Overestimating your edge at full Kelly is catastrophic; underestimating it just grows slower", correct: true, why: "The error penalty is asymmetric. Fractional Kelly is insurance against being wrong about yourself." },
          { id: "c", label: "Smaller bets are easier to track", correct: false, why: "Bookkeeping is irrelevant — the asymmetric cost of overbetting is the reason." },
        ],
      },
    ],
  },
  {
    id: "br-tilt",
    track: "Bankroll & Risk",
    level: "Core",
    title: "Tilt is a bankroll leak, not a mood",
    minutes: 4,
    body: [
      "Chasing a loss with a bigger bet is mathematically identical to deciding your edge got bigger because you feel worse. Written down like that, it's obviously absurd — but it's the single most common way disciplined plans die.",
      "The practical defenses are structural, not motivational: bet sizes fixed in advance, a hard daily cap, and a rule that any bet placed within 30 minutes of a bad beat gets half size. You don't out-willpower tilt; you design around it.",
      "Treat 'no bet' as a position. The market posts thousands of games; you owe action to exactly none of them.",
    ],
    quiz: [
      {
        id: "br3-q1",
        prompt: "After two straight bad beats, the disciplined response is…",
        options: [
          { id: "a", label: "Increase size to win it back while lines are soft", correct: false, why: "That's the tilt script. Losses don't increase your edge — they just shrink your roll." },
          { id: "b", label: "Follow your pre-set sizing — or step away", correct: true, why: "Sizing decided in advance is the defense. Bad beats change your mood, not your edge." },
          { id: "c", label: "Switch sports for fresh variance", correct: false, why: "New market, same leak — action-seeking is tilt wearing a different jersey." },
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
    minutes: 5,
    body: [
      "Closing Line Value asks one question: was the price you took better than the final price? Beat the close consistently and you have demonstrated real edge — even over a stretch of losses. Lose to the close consistently and your winning record is borrowed variance.",
      "Why the close? Because it's the most efficient number — every piece of information and every dollar of sharp money has had its say by then. Beating it means you knew something before the market finished agreeing.",
      "This is why short-term records are nearly meaningless and CLV is meaningful at sample sizes where win-rate still tells you nothing. Track it on every bet you ever make.",
    ],
    quiz: [
      {
        id: "mm1-q1",
        prompt: "You took +7.5 and the line closed +6.5. The game lost. What did CLV say about the bet?",
        options: [
          { id: "a", label: "It was a bad bet — it lost", correct: false, why: "Outcome ≠ process. One game is variance; the close is the verdict on your read." },
          { id: "b", label: "It was a good bet — you beat the close by a point", correct: true, why: "You got a better number than the market's final, most-informed price. Do that repeatedly and profit follows." },
          { id: "c", label: "CLV can't be judged on losses", correct: false, why: "CLV is judged on every bet, win or lose — that's exactly its value." },
        ],
      },
      {
        id: "mm1-q2",
        prompt: "Why is the closing line the benchmark, rather than the opener?",
        options: [
          { id: "a", label: "Books are required to honor the close", correct: false, why: "No such rule — the close matters because of information, not regulation." },
          { id: "b", label: "The close has absorbed all the information and sharp money", correct: true, why: "It's the market's most efficient number. Beating it means you were ahead of the market's final consensus." },
          { id: "c", label: "The close is always closer to the final score", correct: false, why: "Often, but not always — its efficiency, not its accuracy in any single game, is the point." },
        ],
      },
    ],
  },
  {
    id: "mm-steam",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Steam: value lives at origination",
    minutes: 4,
    body: [
      "Steam is a sharp, synchronized line move across the market — usually respected money hitting one side. Chasing it AFTER the move means paying the new, worse price for old information.",
      "The uncomfortable truth: by the time you can see steam, the value that caused it is mostly gone. Following the move at −7.5 that the sharps hit at −6.5 gives you their direction with none of their price.",
      "What steam IS good for: confirming which side the respected money is on, and teaching you which openers were soft — both inputs to being EARLIER next week. The edge is at origination, never in the echo.",
    ],
    quiz: [
      {
        id: "mm2-q1",
        prompt: "A line steams from −6.5 to −7.5 on sharp money. Betting the favorite now gets you…",
        options: [
          { id: "a", label: "The sharps' edge, confirmed by the move", correct: false, why: "You get their direction at a worse price — the value was at −6.5 and it's gone." },
          { id: "b", label: "Their direction, without their price", correct: true, why: "Steam-chasing pays a premium for stale information. Value lives at origination." },
          { id: "c", label: "A safer bet, since the market agrees", correct: false, why: "Market agreement is priced in — that's literally what the move was." },
        ],
      },
    ],
  },
  {
    id: "mm-openers",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Openers and limits: reading the market's confidence",
    minutes: 5,
    body: [
      "Books open with low limits on purpose: the opener is a question, not an answer. Early limits are small because the book expects to be wrong and wants sharp money to find the errors cheaply.",
      "Limits rising through the week is the market saying \"we trust this number now.\" That's why the close is the benchmark — it's the number that survived maximum scrutiny at maximum limits.",
      "Practical read: a big move at tiny opening limits means less than a half-point move the morning of the game at full limits. Weight line moves by the limits behind them, not the points of movement.",
    ],
    quiz: [
      {
        id: "mm3-q1",
        prompt: "Why do books open lines at low limits?",
        options: [
          { id: "a", label: "To limit their losses while the number gets stress-tested", correct: true, why: "The opener is a question. Cheap early action from sharps is how the book finds its own errors." },
          { id: "b", label: "To discourage anyone from betting early", correct: false, why: "They want early action — specifically informed action, at sizes that can't hurt them." },
          { id: "c", label: "Regulations require ramping limits", correct: false, why: "It's risk management, not regulation." },
        ],
      },
      {
        id: "mm3-q2",
        prompt: "Which move carries more information?",
        options: [
          { id: "a", label: "A 2-point move at tiny opening limits", correct: false, why: "Small limits mean small conviction — early moves are cheap to cause." },
          { id: "b", label: "A half-point move at full limits near close", correct: true, why: "Moving a trusted, high-limit number takes serious money. Weight moves by the limits behind them." },
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
