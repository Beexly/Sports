// doctrine.ts — Galaxy Sports Edge betting doctrine principles

export type DoctrineEntry = {
  readonly id: string;
  readonly title: string;
  readonly category: "foundation" | "signal" | "edge" | "discipline";
  readonly summary: string;
  readonly detail: string;
  readonly commonMistake: string;
  readonly saferAlternative: string;
  readonly relatedSurfaces: readonly string[]; // surface IDs
};

export const DOCTRINE: ReadonlyArray<DoctrineEntry> = [
  {
    id: "clv",
    title: "Closing Line Value (CLV)",
    category: "signal",
    summary: "Did you get a better price than the market settled at?",
    detail:
      "CLV measures whether the odds you received were better than where the line closed. Positive CLV over a large sample is the strongest indicator of long-run edge. Win rate alone is misleading — variance can produce a high win rate from bad bets and a low win rate from good bets. The closing line represents the most informed market consensus on the probability of each outcome. Beating it consistently means you found inefficiency before the market corrected it.",
    commonMistake:
      "Judging bet quality by result rather than by price relative to closing line.",
    saferAlternative:
      "Track the closing line on every bet you place. Over 100+ bets, if your CLV is consistently positive, your process is sound even if your record fluctuates.",
    relatedSurfaces: ["tracker", "academy", "market-gravity"],
  },
  {
    id: "no-bet-doctrine",
    title: "No-Bet Doctrine",
    category: "discipline",
    summary: "The best bet is often no bet.",
    detail:
      "Every day without a clear signal is a day to observe without risk. The No-Bet Doctrine means treating 'I'll pass today' as a valid — and often optimal — decision. The pressure to bet every day is a behavioral trap, not a strategy. Professional bettors operate on a selective model: they bet when edge exists and sit out when it doesn't. Forcing action on every slate is a recreational behavior that erodes bankroll over time regardless of knowledge level.",
    commonMistake:
      "Betting out of boredom, loyalty to a team, or fear of missing a winning day.",
    saferAlternative:
      "Open the Pass List before any bet. If the model didn't publish on a game, read why. Consider whether your reasoning is better than the model's or just different.",
    relatedSurfaces: ["today", "picks", "tracker", "academy"],
  },
  {
    id: "ev",
    title: "Expected Value (EV)",
    category: "foundation",
    summary: "Is the price better than the probability warrants?",
    detail:
      "A bet has positive expected value when the odds imply a win probability lower than your model's estimated true probability. EV is not about individual results — it is about the long-run mathematical advantage embedded in the price. A +EV bet at -110 that your model rates at 55% true probability is correct every time you place it. Whether it wins on any given instance is irrelevant to whether the decision was correct. Negative EV bets, even when they win, are bad bets.",
    commonMistake:
      "Taking a bet with a favorable recent record at poor odds, without checking whether the price justifies the edge.",
    saferAlternative:
      "Convert odds to implied probability. Compare against your model's estimated true probability. Only bet when your estimate exceeds the implied probability by a meaningful margin.",
    relatedSurfaces: ["picks", "market-gravity", "academy"],
  },
  {
    id: "bankroll",
    title: "Bankroll Management",
    category: "edge",
    summary: "Survive variance long enough for edge to materialize.",
    detail:
      "Even a mathematically profitable strategy will produce long losing streaks. Bankroll management — stake sizing, exposure limits, and drawdown rules — is what keeps a good process alive long enough to work. Flat betting at 1-3% per bet is the baseline discipline. The Kelly Criterion provides a theoretical maximum stake, but using fractional Kelly (25-50%) is standard practice to account for model uncertainty. Without bankroll management, a good model can still go broke during a normal variance swing.",
    commonMistake:
      "Sizing bets emotionally: doubling up after losses or over-betting high-confidence signals.",
    saferAlternative:
      "Define your unit size before the season. Do not change it based on streaks. Use the Command Center to track exposure before any single game reaches 5% of bankroll.",
    relatedSurfaces: ["tracker", "command", "academy"],
  },
  {
    id: "tilt",
    title: "Tilt Recognition",
    category: "discipline",
    summary: "Emotion degrades decision quality. Recognize and stop.",
    detail:
      "Tilt is the state of making decisions driven by recent losses, wins, frustration, or excitement rather than process. Tilt bets are systematically worse than normal bets. The Command Center's tilt detection watches for over-betting after losses, rapid succession bets, and stake size spikes. Tilt is not weakness — it is a documented cognitive bias that affects all bettors. The only defense is an automatic rule that removes discretion: if you hit the tilt trigger, you stop for 24 hours, no exceptions.",
    commonMistake:
      "Believing that emotional conviction is the same as analytical confidence.",
    saferAlternative:
      "After 3 consecutive losses, take a mandatory 24-hour pause from placing bets. Use the Tracker to audit the last 10 bets for process grade before continuing.",
    relatedSurfaces: ["tracker", "command", "academy"],
  },
  {
    id: "parlay-discipline",
    title: "Parlay Discipline",
    category: "edge",
    summary:
      "Parlays multiply both edge and variance — understand which is bigger.",
    detail:
      "Parlays can produce positive EV if every leg has genuine edge — but they also amplify the compounding probability that one leg fails on variance. A 3-leg parlay where each leg has 55% true probability has only a 16.6% chance of hitting, but implied probability at standard odds is lower still. The Parlay MRI evaluates each leg's signal grade, dependency risk, and combined EV before flagging playable vs. avoid. Correlated legs — two outcomes from the same game, or two players from the same team — reduce true EV significantly and should always be flagged before placing.",
    commonMistake:
      "Building parlays to chase large payouts without verifying each leg has independent edge.",
    saferAlternative:
      "Use Parlay MRI on any parlay before placing. If two legs are from the same sport on the same night, they are correlated — the MRI will flag it.",
    relatedSurfaces: ["picks", "tracker", "academy"],
  },
  {
    id: "market-efficiency",
    title: "Market Efficiency",
    category: "signal",
    summary: "Most lines are well-priced. Edge is rare. That is by design.",
    detail:
      "Professional sportsbooks set lines to balance action and capture vig, but sharp money corrects inefficiencies quickly. Most opportunities are priced correctly within minutes of market open. The best edges appear at open, in low-volume markets, and in situations the public systematically misprices. Understanding this prevents you from treating every disagreement with the market as an edge — the market is usually right, and humility about that is a prerequisite for finding the situations where it isn't.",
    commonMistake:
      "Assuming that because you have a strong opinion, there is edge in the market.",
    saferAlternative:
      "Check the opening line vs. current line. If the line has moved significantly toward your position, the market has already corrected. Recalculate the edge at current price.",
    relatedSurfaces: ["market-gravity", "picks", "academy"],
  },
  {
    id: "sample-size",
    title: "Sample Size Discipline",
    category: "foundation",
    summary:
      "Small samples lie. Give your process enough bets to tell the truth.",
    detail:
      "A 10-bet winning streak proves nothing about edge. A 100-bet sample begins to be meaningful. A 500-bet sample starts to separate signal from noise. The variance in sports betting is enormous — even a -EV process can win over 50 bets, and even a +EV process can lose over 50. Galaxy's leaderboard weights sample size as a primary factor precisely because a 60% record over 10 bets is statistically indistinguishable from 50% with luck. Build your process, track everything, and do not evaluate performance until you have at least 100 bets in the Tracker.",
    commonMistake:
      "Declaring yourself profitable or unprofitable after a short run, then adjusting your strategy based on that conclusion.",
    saferAlternative:
      "Commit to tracking 100 bets before evaluating your process. During that sample, focus on process grade, not win rate or profit. Evaluate the 100-bet sample with CLV data.",
    relatedSurfaces: ["tracker", "leaderboard", "academy"],
  },
  {
    id: "line-shopping",
    title: "Line Shopping",
    category: "edge",
    summary: "The best price on the right side is always better than the same pick at a worse number.",
    detail:
      "Line shopping is the practice of checking multiple sportsbooks to find the best available price on a pick before placing. The difference between -108 and -115 on the same bet compounds significantly over hundreds of bets. Over a season, a bettor who consistently gets the best available number will outperform one with identical picks but lazy line shopping by multiple percentage points of ROI. The market-gravity surface shows current line across books — use it before every bet.",
    commonMistake:
      "Placing all bets on one sportsbook out of convenience, accepting the posted number without checking alternatives.",
    saferAlternative:
      "Have accounts at three or more books. Before placing any bet, check Market Gravity for the best available number. Never place at -115 if -108 is available elsewhere on the same side.",
    relatedSurfaces: ["market-gravity", "picks", "command"],
  },
  {
    id: "sharp-vs-public",
    title: "Sharp Money vs. Public Money",
    category: "signal",
    summary:
      "Follow the professionals, not the crowd. They have different information.",
    detail:
      "Public bettors (recreational money) tend to back favorites, primetime teams, and narratives. Sharp bettors (professional money) fade narratives, exploit overreactions, and bet underdog market inefficiencies. When public bet percentage is high on one side but the line moves in the other direction, that is reverse line movement — a reliable indicator of sharp money opposing the public. Market Gravity's sharp money signal tracks this in real time. Not all reverse line movement is sharp — volume and timing matter — but it is one of the most consistent signals available.",
    commonMistake:
      "Using public bet percentage alone as a signal direction indicator without checking sharp money alignment.",
    saferAlternative:
      "Open Market Gravity on any game before placing. Check both public % and sharp money direction. A pick that is opposed by sharp money but backed by public is a warning sign even if the model score is high.",
    relatedSurfaces: ["market-gravity", "picks", "academy", "brain"],
  },
  {
    id: "vig-awareness",
    title: "Vig Awareness",
    category: "foundation",
    summary:
      "The house takes a cut on every bet. Your edge must beat it to be real.",
    detail:
      "The vig (or juice) is the sportsbook's built-in margin. At standard -110 on both sides of a spread, a bettor must win 52.4% of bets just to break even. At -115, the break-even rate rises to 53.5%. This means your model's true probability estimate must clear the break-even threshold plus your target margin. Ignoring the vig creates a systematic miscalculation of whether a bet is +EV or -EV. Always include the vig when calculating implied probability from any line.",
    commonMistake:
      "Calculating implied probability without factoring in the vig, then overestimating edge.",
    saferAlternative:
      "Use the no-vig implied probability formula when evaluating any pick. If the model's estimated true probability doesn't clear the break-even rate for the posted line by at least 2%, reconsider whether the edge is real.",
    relatedSurfaces: ["picks", "academy", "market-gravity"],
  },
  {
    id: "regression-to-mean",
    title: "Regression to the Mean",
    category: "signal",
    summary:
      "Extreme performance in one period predicts closer-to-average performance in the next.",
    detail:
      "Teams and players who dramatically outperform or underperform their expected metrics over a short stretch will tend to regress toward their true average over time. A team that goes 8-0 against the spread likely has some genuine quality — but also some variance working in their favor. Betting them at inflated odds because of the streak is betting on the streak continuing, not the underlying quality. The model adjusts for regression in its projections. The market sometimes does not — and that gap is where edge can exist.",
    commonMistake:
      "Extrapolating recent ATS or scoring streaks linearly into future predictions without checking underlying metrics.",
    saferAlternative:
      "When a team has a dramatic recent ATS record, check their underlying performance metrics in The Brain. If the metrics don't support the record, regression risk is elevated and the model will reflect that.",
    relatedSurfaces: ["brain", "picks", "academy", "market-gravity"],
  },
  {
    id: "record-keeping",
    title: "Honest Record Keeping",
    category: "discipline",
    summary:
      "If you don't track it accurately, you can't improve. No cherry-picking.",
    detail:
      "Honest record keeping means logging every bet at the price it was placed, including losses, parlays that nearly cashed, and bets placed against the model's recommendation. Cherry-picking — only logging wins, or logging the pick after it wins — is the most common form of self-deception in sports betting and makes improvement impossible. Galaxy's Tracker enforces honest logging by timestamping entries and comparing them against model publications. If a bet wasn't published by the model, it's logged as off-model. No bet is omitted.",
    commonMistake:
      "Mentally keeping score but not formally tracking every bet, then estimating profitability based on selective memory.",
    saferAlternative:
      "Log every bet in the Tracker at the moment of placement. Do not wait to see if it wins. The Tracker will automatically grade your process. Omitting bets from the log defeats its entire purpose.",
    relatedSurfaces: ["tracker", "command", "academy", "leaderboard"],
  },
  {
    id: "timing-discipline",
    title: "Timing Discipline",
    category: "edge",
    summary:
      "When you bet matters almost as much as what you bet. Line timing is an edge.",
    detail:
      "Lines are sharpest at open (when books first post) and immediately before game time (when the market has absorbed all information). The window in between often contains the best opportunities — before sharp correction but after books have committed to a number. Betting too early (before key injury information) or too late (after a line has fully moved) both cost you price. Rumor Radar's timing signals help identify when a pending news event makes waiting — or acting immediately — the right call.",
    commonMistake:
      "Placing all bets at the same time of day regardless of when the line opened or what information is still pending.",
    saferAlternative:
      "For every pick, check Rumor Radar for pending information before placing. If a significant injury report is due in the next 2 hours, consider waiting. If the line is already moving away from you, acting quickly is often correct.",
    relatedSurfaces: ["rumor-radar", "market-gravity", "picks", "alerts"],
  },
];

export function getDoctrineEntry(id: string): DoctrineEntry | undefined {
  return DOCTRINE.find((d) => d.id === id);
}

export function getDoctrineByCategory(
  category: DoctrineEntry["category"]
): DoctrineEntry[] {
  return DOCTRINE.filter((d) => d.category === category);
}

export function getDoctrineForSurface(surfaceId: string): DoctrineEntry[] {
  return DOCTRINE.filter((d) => d.relatedSurfaces.includes(surfaceId));
}

export function getAllDoctrineCategories(): Array<DoctrineEntry["category"]> {
  return ["foundation", "signal", "edge", "discipline"];
}
