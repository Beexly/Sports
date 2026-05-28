// academy-modules.ts — Galaxy Brain Academy module registry

export type AcademyTrack = "foundation" | "signal" | "edge";
export type ModuleStatus = "available" | "coming-soon" | "elite-only";

export type AcademyModule = {
  readonly id: string;
  readonly track: AcademyTrack;
  readonly order: number;
  readonly title: string;
  readonly duration: string; // "8 min read"
  readonly summary: string;
  readonly conceptId: string; // links to doctrine.ts DOCTRINE entry ID
  readonly keyLesson: string;
  readonly commonMistake: string;
  readonly practicePrompt: string; // Scenario-style exercise question
  readonly relatedSurfaces: readonly string[]; // product surface IDs
  readonly status: ModuleStatus;
  readonly requiredTier: "free" | "pro" | "elite";
};

export const ACADEMY_MODULES: ReadonlyArray<AcademyModule> = [
  // ─── Foundation Track (5 modules, free) ────────────────────────────────────

  {
    id: "foundation-odds-101",
    track: "foundation",
    order: 1,
    title: "How Odds Work",
    duration: "6 min",
    summary:
      "Moneyline, spread, and total odds — what they mean and how to read them fast. The vocabulary you need before anything else makes sense.",
    conceptId: "ev",
    keyLesson:
      "Odds express implied probability. -110 implies 52.4% win probability — you must win more than 52.4% of the time to break even. -150 implies 60% — a worse price than -110, even if it 'feels safer'.",
    commonMistake:
      "Reading -150 as 'likely to win' without understanding the price you're paying for that probability. The minus sign tells you cost, not certainty.",
    practicePrompt:
      "A -130 moneyline implies what win probability? Is that better or worse than taking a +115 on the same game's other side? Which side has the juice working against you more?",
    relatedSurfaces: ["picks", "academy"],
    status: "available",
    requiredTier: "free",
  },

  {
    id: "foundation-spread-101",
    track: "foundation",
    order: 2,
    title: "Reading the Spread",
    duration: "7 min",
    summary:
      "Point spreads are the bookmaker's way of leveling an uneven matchup. This module explains how spreads are set, what -3 vs -7 means, and why half-points matter.",
    conceptId: "market-efficiency",
    keyLesson:
      "The spread is not a prediction of the final margin — it is a price designed to split action evenly. A -7 favorite must win by 8+ for the spread bet to win. Half-point hooks around key numbers (3, 7, 10) carry disproportionate significance.",
    commonMistake:
      "Treating the spread as the model's margin-of-victory forecast. Books price for balanced action, not accuracy. The spread is a market price, not an analyst's prediction.",
    practicePrompt:
      "Team A is -6.5 at one book and -7 at another. You want to bet Team A. Which number do you take and why? What changes if Team A is the favorite you're fading?",
    relatedSurfaces: ["picks", "market-gravity", "academy"],
    status: "available",
    requiredTier: "free",
  },

  {
    id: "foundation-totals-101",
    track: "foundation",
    order: 3,
    title: "Totals (Over/Under) Mechanics",
    duration: "6 min",
    summary:
      "Totals betting prices the combined score of both teams. This module covers how totals are set, what drives movement, and when overs vs. unders carry structural edge.",
    conceptId: "line-movement",
    keyLesson:
      "Totals are set based on pace, scoring environment, weather (outdoors), and betting patterns. Sharp money on totals is often more consistent than on sides because it is less correlated to public team narrative.",
    commonMistake:
      "Betting overs because you expect an exciting game or unders because you expect defense to dominate — without checking the market's implied pace or weather adjustments already baked in.",
    practicePrompt:
      "An NFL total opens at 47.5 and moves to 45.5 by game time with no injury news. Rain is forecast but wind is light. What hypothesis best explains the movement, and does it make you more or less interested in the over?",
    relatedSurfaces: ["picks", "market-gravity", "academy"],
    status: "available",
    requiredTier: "free",
  },

  {
    id: "foundation-moneyline-deep",
    track: "foundation",
    order: 4,
    title: "Moneyline Deep Dive",
    duration: "8 min",
    summary:
      "When does a moneyline bet have positive expected value versus a spread bet on the same game? This module teaches you how to compare the two and when each is worth considering.",
    conceptId: "ev",
    keyLesson:
      "The moneyline is a raw win-probability bet with no handicap. You need higher accuracy to profit on heavy favorites. Underdogs on the moneyline are often better value than underdogs against the spread because the juice structure differs.",
    commonMistake:
      "Parlaying moneyline favorites to 'reduce risk' — each leg still carries full vig, and the parlay multiplier amplifies the house edge, not your edge.",
    practicePrompt:
      "Team A is -200 ML. A bettor places 10 bets at -200 and wins 6. Calculate: did they profit? What win rate is needed to break even at -200? How does that compare to the spread's -110 break-even requirement?",
    relatedSurfaces: ["picks", "academy"],
    status: "available",
    requiredTier: "free",
  },

  {
    id: "foundation-bankroll-intro",
    track: "foundation",
    order: 5,
    title: "Bankroll Basics",
    duration: "9 min",
    summary:
      "How to define a betting bankroll, set a unit size, and avoid the single mistake that eliminates more bettors than bad picks: bet-sizing by feel rather than by system.",
    conceptId: "bankroll",
    keyLesson:
      "A unit is 1–2% of your starting bankroll, not a dollar amount. Flat betting — placing the same unit size on every bet — outperforms feel-based sizing in the long run by limiting the damage of inevitable losing streaks.",
    commonMistake:
      "Doubling unit size to 'chase losses' after a bad run. This exponentially increases ruin risk precisely when variance is working against you. Bankroll ruin is the only outcome that ends the game permanently.",
    practicePrompt:
      "Your bankroll is $1,000. You define 1 unit as $20 (2%). After 10 losses in a row, your bankroll is $800. Should you keep betting $20 per unit, reduce to 2% of $800 ($16), or chase with larger bets? What is the mathematical argument for each?",
    relatedSurfaces: ["command", "tracker", "academy"],
    status: "available",
    requiredTier: "free",
  },

  // ─── Signal Track (8 modules, pro) ─────────────────────────────────────────

  {
    id: "signal-line-movement",
    track: "signal",
    order: 1,
    title: "Line Movement Anatomy",
    duration: "10 min",
    summary:
      "Lines move — but not all movement carries the same signal. This module breaks down why prices shift, what direction matters, and how to read opening-to-current delta as a data point, not noise.",
    conceptId: "line-movement",
    keyLesson:
      "Early line movement (within 2 hours of open) is more likely to reflect sharp action. Late movement (within 30 minutes of start) is more likely to reflect injury news, weather, or lineup changes. Speed and size of movement both matter.",
    commonMistake:
      "Assuming all line movement validates your position. If you bet -3 and it moves to -4, the market moved against you — not in your favor. Chasing the move is not a signal strategy.",
    practicePrompt:
      "An NBA total opens at 224.5 on Sunday night and moves to 222 by Monday morning with no news. By game time it is back to 223.5. Construct a hypothesis for each move. Which movement is more informative about the sharp-money view?",
    relatedSurfaces: ["market-gravity", "picks", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-clv-intro",
    track: "signal",
    order: 2,
    title: "Closing Line Value — The Skill Metric",
    duration: "11 min",
    summary:
      "CLV is the most reliable long-run signal of betting skill. This module defines it precisely, explains why it predicts profitability, and shows how to track it in your own bet log.",
    conceptId: "clv",
    keyLesson:
      "CLV is the difference between the price you got and where the market closed. Consistently beating the close — getting +3 CLV on average — is empirical evidence that you are identifying value before the market does. Win rate alone is insufficient because variance obscures skill over short samples.",
    commonMistake:
      "Measuring success by win/loss record over 20 bets. Twenty bets is statistical noise. CLV over 100+ bets is signal. A bettor with 47% wins and +4 CLV is outperforming a bettor with 53% wins and -2 CLV in the long run.",
    practicePrompt:
      "You bet a game at -105. It closes -115. Calculate your CLV. You went 0-3 that week but all three bets beat the closing line by 2+ points. Is this a process failure or a variance event? How would you evaluate it differently than a 0-3 record with -CLV bets?",
    relatedSurfaces: ["tracker", "market-gravity", "brain", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-book-disagreement",
    track: "signal",
    order: 3,
    title: "Book Disagreement as Signal",
    duration: "9 min",
    summary:
      "When Pinnacle says -3 and DraftKings says -4.5, that disagreement is data. This module explains why book disagreement happens, which books to prioritize, and how to use consensus divergence as an edge identifier.",
    conceptId: "market-efficiency",
    keyLesson:
      "Pinnacle and sharp books set prices based on sharp money. Square books set prices based on public action and hold percentage. When they disagree significantly, the sharp-book price is closer to true probability. The gap between them is where recreational pricing exists.",
    commonMistake:
      "Shopping for the best number without understanding which books are sharp anchors versus recreational laggards. Getting +4.5 at a square book when the sharp book is -3 is not line shopping — it is finding a mispricing that may exist for good reason.",
    practicePrompt:
      "Pinnacle has Team A -2.5 (-108). DraftKings has Team A -1 (-115). FanDuel has Team A -3 (-110). If you want to bet Team A, which book do you use and why? If you want to bet Team B, which book gives you the best value and what does the disagreement tell you?",
    relatedSurfaces: ["market-gravity", "picks", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-sharp-vs-public",
    track: "signal",
    order: 4,
    title: "Sharp Money vs. Public Money",
    duration: "10 min",
    summary:
      "Identifying sharp action from public action is the central skill of market reading. This module shows you what sharp patterns look like and why reverse line movement is one of the clearest tells.",
    conceptId: "line-movement",
    keyLesson:
      "Reverse line movement (RLM) occurs when a large percentage of public bets are on one side but the line moves the other way. This is the book adjusting for sharp or syndicate money on the other side. RLM is not reliable edge in isolation — but it is a signal worth tracking.",
    commonMistake:
      "Treating public bet percentage as directional signal. High public percentages push lines toward the favorite — but that is already priced in. Following the crowd after the line has already moved is not fading the public; it is joining them at a worse price.",
    practicePrompt:
      "75% of public bets are on the Patriots -6. The line opened at -6 and has moved to -4.5. Is this RLM? What hypothesis explains the movement? Does 75% public support on a side that's moving down tell you anything about where to look for value?",
    relatedSurfaces: ["market-gravity", "picks", "brain", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-steam-moves",
    track: "signal",
    order: 5,
    title: "Steam Moves — How to Read Them",
    duration: "8 min",
    summary:
      "Steam is coordinated, rapid sharp action across multiple books. This module explains what a steam move looks like in real time, why chasing steam is almost always too late, and what to do when you spot the signal early.",
    conceptId: "line-movement",
    keyLesson:
      "A steam move is when a line moves quickly (0.5–1.5 points) at multiple books simultaneously, triggered by syndicate or professional bettor groups. By the time it appears on line-tracking services, the actionable window is often closed. The value is in anticipating conditions where steam is likely, not reacting after it fires.",
    commonMistake:
      "Steam chasing — placing bets after a steam move has already fired at the number the steamer got. You are betting at a worse price on a game where sharp money has already pushed the line, meaning you are getting the worst of both worlds: high risk with minimal edge.",
    practicePrompt:
      "You see a college basketball total move from 145.5 to 143 across four books in 8 minutes at 10am, six hours before tip. No injury news is visible. What are the two most likely explanations? If you had a position on the over at 145.5, what should you do now?",
    relatedSurfaces: ["market-gravity", "alerts", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-market-timing",
    track: "signal",
    order: 6,
    title: "Market Timing — When to Bet",
    duration: "9 min",
    summary:
      "Timing is not just about price — it is about information. This module covers the betting market timeline and when different types of bettors should enter relative to game time.",
    conceptId: "clv",
    keyLesson:
      "Early in the week is best for bettors who believe they have information the market has not yet priced — injury intel, model disagreements, situational spots. Late betting (within 30 minutes) is reserved for injury confirmation and lineup-dependent plays. Betting mid-week with no information advantage is usually a price disadvantage.",
    commonMistake:
      "Betting games days in advance because you 'feel good about it now.' Feelings are not a timing advantage. Wait for confirming information — starting lineup, injury report, weather — before placing bets on time-sensitive variables.",
    practicePrompt:
      "It is Monday. The Eagles-Cowboys spread is available at -3. The Eagles starting quarterback is listed as questionable. Should you bet now? What information would change your decision? What is the price risk of waiting vs. the information benefit of waiting?",
    relatedSurfaces: ["market-gravity", "rumor-radar", "alerts", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-prop-markets",
    track: "signal",
    order: 7,
    title: "Prop Market Inefficiencies",
    duration: "11 min",
    summary:
      "Player prop markets are less efficient than sides and totals because they are lower-volume and harder to sharpen. This module explains where prop edges cluster and why context matters more than raw projections.",
    conceptId: "ev",
    keyLesson:
      "Prop markets are set by recreational demand and usage assumptions. Edges most commonly appear when: (1) a player's role is changing but the book is still pricing last week's usage; (2) a matchup-specific defender creates an asymmetric advantage/disadvantage not reflected in season averages; (3) correlation between legs is not priced in by the book.",
    commonMistake:
      "Building player prop parlays by stacking correlated legs (QB passing yards + WR receiving yards + team total) from the same drive chain without accounting for the positive correlation discount that reduces true EV on correlated outcomes.",
    practicePrompt:
      "A receiver averages 65 receiving yards on the season. His prop is set at 62.5 yards. His matchup is against the league's #29 corner in yards-allowed per route. The book has not moved the prop. Is this a bet? What else do you need to know before placing it?",
    relatedSurfaces: ["props", "picks", "market-gravity", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  {
    id: "signal-ev-calculation",
    track: "signal",
    order: 8,
    title: "+EV Calculation in Practice",
    duration: "12 min",
    summary:
      "Positive expected value is the only sustainable edge criterion. This module walks through real EV calculations, explains how to estimate true probability, and shows why finding +EV picks is harder — and more important — than finding winners.",
    conceptId: "ev",
    keyLesson:
      "EV = (Win Probability × Profit per unit) − (Loss Probability × Loss per unit). A bet is +EV when your estimated true probability is higher than the book's implied probability. You do not need to win every bet — you need to be right about probability more often than the market is.",
    commonMistake:
      "Confusing win rate with edge. A bettor going 55% at -110 is breaking even, not winning. The same bettor going 54% at -115 is losing money despite a majority win rate. Edge is about price relative to true probability, not absolute wins.",
    practicePrompt:
      "You estimate Team A has a 58% win probability. The market prices them at -130 (implied 56.5%). Is this +EV? By how much per $100 bet? How confident do you need to be in your probability estimate to justify placing the bet at this margin?",
    relatedSurfaces: ["picks", "brain", "market-gravity", "academy"],
    status: "available",
    requiredTier: "pro",
  },

  // ─── Edge Track (5 modules, elite) ─────────────────────────────────────────

  {
    id: "edge-bankroll-advanced",
    track: "edge",
    order: 1,
    title: "Advanced Bankroll Systems",
    duration: "14 min",
    summary:
      "Kelly Criterion, fractional Kelly, and flat-bet comparisons — explained with real variance math. This module moves past 'bet 2% of bankroll' and into the systems professional bettors actually use.",
    conceptId: "bankroll",
    keyLesson:
      "Full Kelly maximizes long-run bankroll growth but produces extreme variance that most bettors cannot tolerate emotionally. Half-Kelly reduces variance by 75% while sacrificing only ~13% of long-run growth rate. Flat betting at 1–2% of bankroll outperforms intuition-sized betting even when intuition produces correct picks.",
    commonMistake:
      "Applying Kelly without a reliable edge estimate. Kelly requires accurate probability inputs — if your true win probability is off by 5 percentage points, full Kelly can recommend bet sizes that produce catastrophic drawdowns on runs of variance.",
    practicePrompt:
      "You estimate a 60% win probability on a -110 bet. Full Kelly recommends what stake percentage? Half-Kelly recommends what? If your 60% estimate is actually 54% (a common error), what does your sizing look like vs. what you should bet? Calculate the bankroll impact over 100 bets at each estimate.",
    relatedSurfaces: ["command", "tracker", "academy"],
    status: "elite-only",
    requiredTier: "elite",
  },

  {
    id: "edge-tilt-recognition",
    track: "edge",
    order: 2,
    title: "Tilt Recognition and Recovery",
    duration: "12 min",
    summary:
      "Tilt is the single most destructive force in sports betting. This module defines its patterns, teaches you to identify the early signals, and establishes the mandatory reset protocol before it becomes expensive.",
    conceptId: "no-bet",
    keyLesson:
      "Tilt presents in five recognizable patterns: loss-chasing (increasing stakes after losses), revenge betting (targeting the team that 'cost you'), degenerate action (betting games you have no opinion on), certainty inflation (convincing yourself a bad bet is a certainty), and urgency bias (betting quickly to get 'back on track'). Each pattern shares a root: emotional state is overriding analytical process.",
    commonMistake:
      "Treating tilt as a character flaw rather than a cognitive state. Tilt is the predictable result of stress, variance, and reward-circuit activation. It is not weakness — it is biology. The solution is structural: a mandatory pause protocol after 3 consecutive losses, not willpower.",
    practicePrompt:
      "You've lost 4 straight bets. You find yourself looking at a 4-team parlay you would not normally bet. Describe the internal signal that distinguishes 'this is a genuine edge I identified' from 'this is tilt generating justification.' What is your protocol before placing the bet?",
    relatedSurfaces: ["command", "tracker", "academy"],
    status: "elite-only",
    requiredTier: "elite",
  },

  {
    id: "edge-parlay-discipline",
    track: "edge",
    order: 3,
    title: "Parlay Discipline",
    duration: "10 min",
    summary:
      "Parlays are not inherently bad — but the conditions under which they are +EV are narrow and specific. This module explains the math of parlay juice, when correlated parlays carry genuine edge, and why most parlays are the house's best product.",
    conceptId: "ev",
    keyLesson:
      "A 2-team parlay at standard juice (-110/-110) pays +260 but true odds are +300 if legs are independent — the book keeps ~20% of EV. The only scenarios where parlays are defensible: (1) correlated legs that the book does not discount (same-game parlay mispricings); (2) when you have high-conviction +EV on both legs independently and the correlation works in your favor; (3) as a bankroll diversification tool, capped at <5% of weekly action.",
    commonMistake:
      "Building 4–6 team parlays to 'make back losses' or 'maximize a small bankroll.' Each leg compounds the vig. A 6-team -110 parlay has true odds of +9100 but pays +5500 — a 45% effective tax on the win. The house edge grows multiplicatively with each leg.",
    practicePrompt:
      "A bettor has two picks: Team A -3 at -110 and Team B OVER 47.5 at -115. Both picks are independently +EV by your model. If you parlay them, what does the book pay vs. true odds? At what leg correlation does the parlay become better EV than betting them separately?",
    relatedSurfaces: ["picks", "command", "tracker", "academy"],
    status: "elite-only",
    requiredTier: "elite",
  },

  {
    id: "edge-no-bet-doctrine",
    track: "edge",
    order: 4,
    title: "The No-Bet Doctrine",
    duration: "11 min",
    summary:
      "Not betting is a position. The no-bet doctrine is the hardest skill to develop and the most differentiating one to have. This module explains when passing is the sharpest move in the book.",
    conceptId: "no-bet",
    keyLesson:
      "Edge is not uniformly distributed across games or days. Forcing action in low-edge environments — because you are subscribed, because it is game day, because you 'feel like betting' — is the clearest signal that emotion is running your process. The no-bet decision preserves bankroll for high-conviction spots. It also accumulates positive process grades in your Tracker, which is its own form of long-run ROI.",
    commonMistake:
      "Treating every day's slate as mandatory. The best professional bettors pass on 60–80% of available games. Selectivity is not passivity — it is the active decision that the market is efficient enough in a given spot that no edge exists worth paying juice to access.",
    practicePrompt:
      "It is Sunday. There are 14 NFL games. Your model produces 3 picks above your confidence threshold. 11 games have no qualifying pick. A friend asks why you only bet 3 games. Write a two-sentence explanation of the no-bet doctrine that accounts for edge, juice, and the cost of forced action.",
    relatedSurfaces: ["today", "picks", "command", "tracker", "academy"],
    status: "elite-only",
    requiredTier: "elite",
  },

  {
    id: "edge-portfolio-approach",
    track: "edge",
    order: 5,
    title: "Portfolio Approach to Sports Betting",
    duration: "13 min",
    summary:
      "Elite bettors manage a portfolio of picks across sports, bet types, and time horizons — not isolated wagers. This module introduces portfolio thinking: diversification, correlation management, and exposure limits as tools for long-run edge preservation.",
    conceptId: "bankroll",
    keyLesson:
      "A betting portfolio should be managed like an investment portfolio: diversified across sports (to reduce sport-specific variance), uncorrelated across legs (to reduce same-day wipeout risk), and bounded by daily and weekly exposure limits (to prevent single-session bankroll damage). Picks in the same game or on the same player are correlated assets — treat them as such.",
    commonMistake:
      "Concentrating all weekly action on one sport during its peak season. If you only bet NFL, your entire betting performance is a function of 17-week NFL variance. Cross-sport diversification does not reduce edge — it reduces variance around your edge, which is the goal.",
    practicePrompt:
      "Your current week: 6 NFL bets, 2 NBA bets, 1 NHL bet. Four of your NFL bets involve the same team on the same Sunday. Diagnose the portfolio risk. What reallocation reduces correlated exposure without eliminating any pick you have genuine edge on?",
    relatedSurfaces: ["command", "tracker", "picks", "academy"],
    status: "elite-only",
    requiredTier: "elite",
  },
];

export function getModule(id: string): AcademyModule | undefined {
  return ACADEMY_MODULES.find((m) => m.id === id);
}

export function getModulesByTrack(track: AcademyTrack): AcademyModule[] {
  return ACADEMY_MODULES.filter((m) => m.track === track).sort(
    (a, b) => a.order - b.order,
  );
}

export function getAvailableModules(
  tier: "free" | "pro" | "elite",
): AcademyModule[] {
  const tierRank: Record<"free" | "pro" | "elite", number> = {
    free: 0,
    pro: 1,
    elite: 2,
  };
  const userRank = tierRank[tier];
  return ACADEMY_MODULES.filter((m) => tierRank[m.requiredTier] <= userRank);
}

export function getModulesByStatus(status: ModuleStatus): AcademyModule[] {
  return ACADEMY_MODULES.filter((m) => m.status === status);
}
