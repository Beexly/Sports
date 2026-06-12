/**
 * Academy curriculum — interactive course tracks with embedded quizzes.
 *
 * Pure data + pure scoring (mirrors lib/academy/scenarios.ts patterns).
 * Coaching voice: short, declarative, every line earns its place — the
 * rule, the number, the move. Market mechanics and math only; never
 * fabricated stats about real teams.
 */

export type CourseTrack = "Line Literacy" | "Bankroll & Risk" | "Market Mechanics" | "Fantasy & DFS";
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
  "Fantasy & DFS",
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

  // ── FANTASY & DFS ────────────────────────────────────────────────
  {
    id: "fd-vor",
    track: "Fantasy & DFS",
    level: "Core",
    title: "VOR: draft the gap, not the name",
    minutes: 2,
    body: [
      "Value over replacement asks one question: how many points does this player score above the best option you could grab at that position later? A QB who scores 22 when every waiver QB scores 18 is worth less than an RB who scores 15 when replacements score 7.",
      "So rank by the gap, not the total. Tiers form where the gaps cluster; the last player before a cliff is the most valuable pick on the board.",
    ],
    quiz: [
      {
        id: "fd1-q1",
        prompt: "RB scores 15 (replacement: 7). QB scores 22 (replacement: 18). Who's more valuable?",
        options: [
          { id: "a", label: "The QB — he scores more points", correct: false, why: "Raw points ignore what a replacement gives you for free." },
          { id: "b", label: "The RB — +8 over replacement beats +4", correct: true, why: "The gap is the value. That's VOR in one trade." },
        ],
      },
      {
        id: "fd1-q2",
        prompt: "A tier cliff means…",
        options: [
          { id: "a", label: "A sharp value drop to the next player at that position", correct: true, why: "Take the last player before the cliff — the drop is the cost of waiting." },
          { id: "b", label: "The position is deep and you can wait", correct: false, why: "That's the opposite — a flat tier lets you wait; a cliff doesn't." },
        ],
      },
    ],
  },
  {
    id: "fd-leverage-ownership",
    track: "Fantasy & DFS",
    level: "Core",
    title: "Ownership and leverage: cash pays floors, GPPs pay ceilings",
    minutes: 2,
    body: [
      "In cash games half the field gets paid, so you want the safest median score — floors, favorites, chalk is fine. In tournaments only the top sliver gets paid, so you need the ceiling the field doesn't have.",
      "That's leverage: ceiling relative to ownership. The same ceiling at 8% ownership beats it at 30%, because when it hits, you pass everyone who skipped him. High ownership isn't wrong — it's just upside you have to share.",
    ],
    quiz: [
      {
        id: "fd2-q1",
        prompt: "Two players project the same ceiling. One is 30% owned, one is 8%. For a GPP…",
        options: [
          { id: "a", label: "Take the 8% — same upside, fewer people to share it with", correct: true, why: "That's leverage. When he hits, you pass 92% of the field." },
          { id: "b", label: "Take the 30% — the field is usually right", correct: false, why: "In cash, fine. In a GPP, chalk upside is shared upside." },
        ],
      },
    ],
  },
  {
    id: "fd-trade-value",
    track: "Fantasy & DFS",
    level: "Core",
    title: "Trade math: the best player usually wins the deal",
    minutes: 2,
    body: [
      "Price players on points above replacement, not name recognition. Two solid starters for one elite is usually a win for the elite side — your bench replaces the depth for free; nothing replaces elite.",
      "Buy injuries only at a discount that matches your calendar: a player back for your playoff weeks is worth more to you than his rest-of-season average says.",
    ],
    quiz: [
      {
        id: "fd3-q1",
        prompt: "A 2-for-1 sends away your two WR3s for an elite WR1. Who usually wins?",
        options: [
          { id: "a", label: "The side getting two starters — quantity wins", correct: false, why: "Your bench and the wire replace WR3 production for free." },
          { id: "b", label: "The side getting the elite player", correct: true, why: "Depth is replaceable; elite isn't. Consolidation wins." },
        ],
      },
    ],
  },
  // ── LINE LITERACY (advanced) ────────────────────────────────────────
  {
    id: "ll-parlays",
    track: "Line Literacy",
    level: "Advanced",
    title: "Parlays: when they cost more than they pay",
    minutes: 3,
    body: [
      "A parlay's payout is always less than the product of the true odds. The house extracts vig on every leg. A 2-leg −110/−110 parlay pays 2.6:1; fair value would be 3.3:1.",
      "The only situation where a parlay is the right move: your two picks are positively correlated (same-game, same drive outcome) — that correlation is not priced in.",
      "Otherwise, bet legs separately and keep your edge per bet. Parlays are a product designed to make you feel like you got a deal.",
    ],
    quiz: [
      {
        id: "ll4-q1",
        prompt: "A 2-leg parlay at −110/−110 should pay 3.3:1 at fair odds. Books pay ~2.6:1. The difference is…",
        options: [
          { id: "a", label: "Compounded vig — the house extracts margin on each leg", correct: true, why: "Every leg is a −110 bet. Multiply the implied odds and you see the compounding." },
          { id: "b", label: "A cap because winning parlays are taxed", correct: false, why: "No tax — it's pure margin, compounded per leg." },
          { id: "c", label: "Variance — parlays are just riskier", correct: false, why: "Risk is separate from the EV gap. Parlays have negative EV built in." },
        ],
      },
      {
        id: "ll4-q2",
        prompt: "When might a 2-leg same-game parlay have a legitimate edge?",
        options: [
          { id: "a", label: "When both legs are on favorites", correct: false, why: "Favorite/underdog status is unrelated to the correlation argument." },
          { id: "b", label: "When the legs are positively correlated and books don't price it", correct: true, why: "A QB and his WR in the same game are correlated — a big game lifts both. That's not in the parlay price." },
          { id: "c", label: "Never — parlays are always −EV", correct: false, why: "Correlation pricing gaps are real. Same-game parlays can have edges." },
        ],
      },
    ],
  },
  {
    id: "ll-live-betting",
    track: "Line Literacy",
    level: "Advanced",
    title: "Live betting: speed is the edge, not feel",
    minutes: 3,
    body: [
      "In-game lines are priced slower than the game moves. A turnover, injury, or big score creates a 10-15 second window where the new price is still reflecting the old world.",
      "The edge is mechanical: model the adjusted spread (based on score, time, down-and-distance) and bet when the live line lags your model. Gut feel lags even more than the line.",
      "Live betting has one landmine: the sunk-cost pump. Never chase a first-half position with a second-half bet to 'get it back' — that's two independent decisions.",
    ],
    quiz: [
      {
        id: "ll5-q1",
        prompt: "Live lines lag the true market after a big play. Your edge in live betting is…",
        options: [
          { id: "a", label: "Reacting faster than the line adjusts", correct: true, why: "Mechanical speed against a slow-updating price is the sustainable live edge." },
          { id: "b", label: "Knowing which team will win better than the market", correct: false, why: "That's the pregame game. Live edges are about lag, not prediction." },
          { id: "c", label: "Taking the underdog after they fall behind", correct: false, why: "A team falling behind re-prices instantly. The lag is gone by the time you think about it." },
        ],
      },
    ],
  },

  // ── BANKROLL & RISK (advanced) ──────────────────────────────────────
  {
    id: "br-sample-size",
    track: "Bankroll & Risk",
    level: "Advanced",
    title: "Sample size: how long until results mean something",
    minutes: 3,
    body: [
      "At 52.4% win rate you need ~500 bets to confidently separate skill from luck at the 95% confidence level. At 200 bets, a 55% record might just be variance.",
      "Track record in terms of closing-line value (CLV), not win-rate alone. CLV tells you whether your process is sound before results confirm it.",
      "The practical rule: never change your model based on fewer than 200 settled bets. Good process loses stretches; bad process wins stretches. Time separates them.",
    ],
    quiz: [
      {
        id: "br4-q1",
        prompt: "After 50 bets, you're 35-15 (70%). You should…",
        options: [
          { id: "a", label: "Double your unit size — you've found your edge", correct: false, why: "50 bets is deep in the noise. Variance does this often." },
          { id: "b", label: "Continue at the same stakes and track CLV", correct: true, why: "Trust process over results at this sample size. CLV tells you more." },
          { id: "c", label: "Walk away — you're on a heater and it will end", correct: false, why: "If you have a real edge, ride it. The answer is patience, not retreat." },
        ],
      },
      {
        id: "br4-q2",
        prompt: "Two bettors: A is 56% after 100 bets; B is 53% after 1000 bets. Who has the stronger case for an edge?",
        options: [
          { id: "a", label: "Bettor A — higher win rate", correct: false, why: "A's result is within normal variance over 100 bets. B's is statistically meaningful." },
          { id: "b", label: "Bettor B — larger sample makes the result significant", correct: true, why: "53% over 1000 bets is highly statistically significant. 56% over 100 is not." },
        ],
      },
    ],
  },
  {
    id: "br-roi-tracking",
    track: "Bankroll & Risk",
    level: "Advanced",
    title: "ROI and CLV: what you should actually measure",
    minutes: 2,
    body: [
      "Win rate is misleading without knowing the average odds. A 48% win rate on heavy favorites can be profitable; 55% on big dogs might not be.",
      "ROI = (net profit) / (total wagered). 3-5% ROI sustained over 500+ bets is elite. 10%+ is extraordinary and usually unsustainable.",
      "CLV (closing-line value) is the better real-time signal: if you consistently beat the closing line, your process is sound even when results are rough.",
    ],
    quiz: [
      {
        id: "br5-q1",
        prompt: "A bettor wins 48% but bets heavily on big favorites. Their ROI is 4%. This means…",
        options: [
          { id: "a", label: "They're a losing bettor — below 50%", correct: false, why: "Win rate doesn't determine profitability. Odds do. 4% ROI is a winning bettor." },
          { id: "b", label: "They're profitable — 4% ROI is real edge", correct: true, why: "ROI accounts for the odds. This is a competent, profitable bettor." },
          { id: "c", label: "The sample is too small to say", correct: false, why: "Correct in general, but the question asks what 4% ROI MEANS — it means profitable." },
        ],
      },
    ],
  },

  // ── MARKET MECHANICS (advanced) ────────────────────────────────────
  {
    id: "mm-reverse-line",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Reverse line movement: reading the sharp money",
    minutes: 3,
    body: [
      "Public money follows narrative. Sharp money follows EV. When 70% of tickets are on Team A but the line moves TO Team B, that's reverse line movement — the sharp money disagrees with the crowd.",
      "Reverse movement is the clearest public signal that informed money is on the other side. It doesn't guarantee a win, but it tells you who's doing the work.",
      "The read: compare ticket % to money %. If 60% of tickets are on A but 80% of money is on B, a big account backed B. That matters.",
    ],
    quiz: [
      {
        id: "mm4-q1",
        prompt: "65% of tickets are on Team A. The spread moves FROM A −3 to A −2.5. The likely explanation:",
        options: [
          { id: "a", label: "The book is following public money", correct: false, why: "Following public money would move A to −3.5, not back. This moved the other way." },
          { id: "b", label: "Sharp money came in on Team B, overriding the public", correct: true, why: "Reverse line movement: line moves against the ticket count. Sharp signal." },
          { id: "c", label: "An injury to a Team A player", correct: false, why: "Possible, but absent injury news, reverse movement points to sharp action." },
        ],
      },
    ],
  },
  {
    id: "mm-public-traps",
    track: "Market Mechanics",
    level: "Advanced",
    title: "Public traps: when the narrative beats the price",
    minutes: 3,
    body: [
      "Books move the line to attract action on the side they need — they don't need it to be correct. A nationally televised team that lost two straight generates public fade money, which is exactly where the book wants it.",
      "Trap signs: a line that seems too good, a well-known team at a price that looks like value after a bad week. The book is selling you what you want to see.",
      "Counter: look at the closing-line value on similar situations historically. The public loss-reaction bias is documented — late-week money on 'bouncebacks' is often a trap.",
    ],
    quiz: [
      {
        id: "mm5-q1",
        prompt: "A prime-time favorite that lost two straight is now +3.5. The line looks like value. The sharp read is…",
        options: [
          { id: "a", label: "Take it — the market overreacted to the losses", correct: false, why: "Maybe. But the book knows the public loves this narrative. Check CLV first." },
          { id: "b", label: "Examine if the line is moving further in your direction or back — watch for the trap", correct: true, why: "If sharp money agreed, the line would move further. If it's stable or moving back, it's a retail price." },
          { id: "c", label: "Avoid all teams with two straight losses", correct: false, why: "That's the same narrative bias flipped. Process, not patterns." },
        ],
      },
    ],
  },

  // ── FANTASY & DFS (advanced) ────────────────────────────────────────
  {
    id: "fd-start-sit",
    track: "Fantasy & DFS",
    level: "Core",
    title: "Start-sit: the matchup multiplier",
    minutes: 3,
    body: [
      "The error most managers make: benching a stud because of a bad matchup, starting a streamer because of a great one. Don't. A top-12 player beats a top-12 matchup almost every week.",
      "Matchup matters most at the edges — flex decisions, waiver adds, streaming QB/DST. At the top of your lineup, start your best players.",
      "The multiplier framework: (projection × matchup grade). Matchup grade is 0.8 (tough) to 1.2 (soft). A 15-point projection at grade 1.2 is better than an 18-point projection at grade 0.8.",
    ],
    quiz: [
      {
        id: "fd4-q1",
        prompt: "Your WR1 (top-6 season average) faces the league's best CB. Your WR2 (top-20) has the easiest matchup on the slate. You start…",
        options: [
          { id: "a", label: "WR2 — the matchup is a major edge", correct: false, why: "Matchup matters at the margins. A top-6 WR beats a tough matchup most weeks." },
          { id: "b", label: "WR1 — talent beats matchup at the top", correct: true, why: "Stud over matchup. Save matchup upgrades for borderline flex decisions." },
          { id: "c", label: "Flip a coin — it's too close to call", correct: false, why: "It's not close. The talent gap almost always wins." },
        ],
      },
    ],
  },
  {
    id: "fd-gpp-vs-cash",
    track: "Fantasy & DFS",
    level: "Advanced",
    title: "GPP vs cash: two different games",
    minutes: 3,
    body: [
      "Cash games (50/50s, H2H) pay the top ~50%. Maximize your median — take the floor, not the ceiling. Target high-usage, low-variance players. DSTs with strong implied point totals.",
      "GPPs (tournaments) pay the top 15-20%, with top prizes requiring 1st-place scores. Maximize your ceiling — you need a great day, not a good one. Differentiation matters.",
      "The mistake: playing a cash roster in a GPP (you won't win), or playing a GPP roster in a cash game (you'll variance yourself out of the money). Match the lineup to the format.",
    ],
    quiz: [
      {
        id: "fd5-q1",
        prompt: "You're building a lineup for a 50/50. Which player type do you prioritize?",
        options: [
          { id: "a", label: "High-ceiling, low-floor boom/bust (ownership: 5%)", correct: false, why: "A boom/bust at 5% ownership is GPP DNA. Cash games punish the busts." },
          { id: "b", label: "High-floor, consistent producer (ownership: 35%)", correct: true, why: "High floor wins cash. You don't need to win the slate, you need to beat half the field." },
          { id: "c", label: "The player everyone will have, to avoid falling behind the field", correct: false, why: "Chalk in a 50/50 is fine but your edge is the floor, not the herd." },
        ],
      },
    ],
  },
  {
    id: "fd-late-swap-strategy",
    track: "Fantasy & DFS",
    level: "Advanced",
    title: "Late swap: protect the lineup when scratches drop",
    minutes: 2,
    body: [
      "In DFS, late swap is the difference between a wasted entry and a competitive one. The moment a player is ruled out, your job is to find the optimal replacement — not just any eligible body.",
      "The late swap hierarchy: (1) same team, same game script — keep the stack. (2) floor over ceiling in cash, ceiling over floor in GPPs. (3) don't panic-swap into the highest-salary replacement; stay under cap.",
      "Use the optimizer's late swap mode: pin your healthy players, mark the scratch, and let the engine find the best legal lineup within your remaining cap.",
    ],
    quiz: [
      {
        id: "fd6-q1",
        prompt: "Your WR2 is ruled out 30 minutes before lineup deadline. In a GPP, you prioritize his replacement by…",
        options: [
          { id: "a", label: "Highest projected replacement regardless of salary", correct: false, why: "Projected median matters less in GPP. You need ceiling." },
          { id: "b", label: "Highest ceiling at a salary that keeps you under the cap", correct: true, why: "GPP: ceiling and salary fit. Overpaying for a mediocre replacement sinks you." },
          { id: "c", label: "The cheapest eligible player (save cap for next contest)", correct: false, why: "Salary savings don't carry over. Use the cap; you need ceiling." },
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
