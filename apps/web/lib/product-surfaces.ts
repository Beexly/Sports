// product-surfaces.ts — single source of truth for all Galaxy intelligence surfaces

export type SurfaceState =
  | "live"
  | "beta"
  | "preview"
  | "coming-soon"
  | "waitlist"
  | "elite-only";

export type Surface = {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly tagline: string;
  readonly description: string;
  readonly state: SurfaceState;
  readonly tier: "free" | "pro" | "elite" | "all";
  readonly habitPhase:
    | "enter"
    | "scan"
    | "understand"
    | "decide"
    | "track"
    | "review"
    | "improve";
  readonly relatedSurfaces: readonly string[]; // other surface IDs
  readonly keyQuestion: string; // "What signal does this reveal?"
  readonly riskProtection: string; // "What risk does this protect against?"
  readonly nextAction: string; // "What should the user do next?"
};

export const PRODUCT_SURFACES: ReadonlyArray<Surface> = [
  {
    id: "today",
    href: "/today",
    title: "Today's Board",
    eyebrow: "Daily brief",
    tagline: "Start here every morning.",
    description:
      "Every day's intelligence brief — scored picks, board passes, market signals, and what the model skipped.",
    state: "live",
    tier: "all",
    habitPhase: "scan",
    relatedSurfaces: ["picks", "market-gravity", "brain", "reports"],
    keyQuestion: "What did the model see today, and what did it skip?",
    riskProtection: "Prevents acting on incomplete daily information.",
    nextAction:
      "Open a pick card or check the Pass List before placing any bet.",
  },
  {
    id: "picks",
    href: "/picks",
    title: "Pick Feed",
    eyebrow: "Scored picks",
    tagline: "Every published pick. All signal, no noise.",
    description:
      "The full ranked pick feed — sorted by Edge Index, filtered by sport, tier, and confidence band. Each pick includes the line, model rationale, key factors, and a No-Bet audit if the model skipped the game.",
    state: "live",
    tier: "all",
    habitPhase: "decide",
    relatedSurfaces: ["today", "market-gravity", "tracker", "command"],
    keyQuestion: "Which picks cleared the publish threshold and why?",
    riskProtection:
      "Prevents acting on low-confidence or stale picks without knowing their signal basis.",
    nextAction:
      "Filter by your sport and confidence band. Read the rationale before opening a sportsbook.",
  },
  {
    id: "props",
    href: "/props",
    title: "Prop Lab",
    eyebrow: "Player props",
    tagline: "Find the prop markets the books priced wrong.",
    description:
      "Player prop analysis engine — targets player-level over/unders with matchup-adjusted projections, usage trends, and defender stats. Includes a Parlay MRI for multi-leg prop builds.",
    state: "live",
    tier: "pro",
    habitPhase: "decide",
    relatedSurfaces: ["picks", "market-gravity", "tracker", "academy"],
    keyQuestion:
      "Which player props show meaningful model-vs-market disagreement?",
    riskProtection:
      "Prevents stacking correlated props or building parlays without checking leg dependency.",
    nextAction:
      "Run the Parlay MRI on any multi-leg build before placing. Check usage trend vs. matchup grade.",
  },
  {
    id: "market-gravity",
    href: "/market-gravity",
    title: "Market Gravity",
    eyebrow: "Line movement",
    tagline: "Watch the books. They know things.",
    description:
      "Real-time line movement dashboard — tracks sharp money signals, reverse line movement, book disagreement, and opening vs. current line delta. Flags Market Mirages where public narrative is driving price, not edge.",
    state: "live",
    tier: "pro",
    habitPhase: "understand",
    relatedSurfaces: ["picks", "today", "brain", "alerts"],
    keyQuestion:
      "Is the line moving because of sharp money or because of public narrative?",
    riskProtection:
      "Prevents chasing lines that have already moved against your position.",
    nextAction:
      "Check the opening line on any pick before placing. If it moved more than 1.5 points, re-read the Market Gravity entry.",
  },
  {
    id: "rumor-radar",
    href: "/rumor-radar",
    title: "Rumor Radar",
    eyebrow: "Injury & lineup intelligence",
    tagline: "Know before the line moves.",
    description:
      "Pre-game intelligence layer for injury reports, lineup changes, weather alerts, and late-breaking team news. Each signal is sourced, timestamped, and scored for market impact before you place a bet.",
    state: "live",
    tier: "pro",
    habitPhase: "understand",
    relatedSurfaces: ["today", "picks", "alerts", "market-gravity"],
    keyQuestion:
      "Is there a late-breaking signal that the line has not yet priced in?",
    riskProtection:
      "Prevents placing bets right before a significant injury or lineup revelation shifts the line.",
    nextAction:
      "Check Rumor Radar within 30 minutes of game time for any active pick. Treat any red-flagged item as a reason to pause before placing.",
  },
  {
    id: "fantasy",
    href: "/fantasy",
    title: "Fantasy Edge",
    eyebrow: "DFS & season-long",
    tagline: "The same signal that sharpens bets sharpens your lineups.",
    description:
      "Fantasy-specific analysis layer — salary-adjusted projections for DFS, start/sit recommendations for season-long, and matchup grades by position. Powered by the same player model used in Prop Lab.",
    state: "beta",
    tier: "pro",
    habitPhase: "decide",
    relatedSurfaces: ["props", "picks", "tracker"],
    keyQuestion:
      "Which players are underpriced relative to their projected output and matchup grade?",
    riskProtection:
      "Prevents over-rostering players with favorable narratives but unfavorable matchup data.",
    nextAction:
      "Filter by slate and position. Compare salary efficiency score before finalizing a DFS lineup.",
  },
  {
    id: "brain",
    href: "/brain",
    title: "The Brain",
    eyebrow: "Model transparency",
    tagline: "See exactly how every pick gets scored.",
    description:
      "Full model explainability interface — surfaces the factor weights, input data, confidence decomposition, and version changelog behind every scored pick. The Brain shows you what the model saw, in what order, and why it weighted it the way it did.",
    state: "live",
    tier: "elite",
    habitPhase: "understand",
    relatedSurfaces: ["picks", "market-gravity", "reports", "academy"],
    keyQuestion: "Why did the model score this pick the way it did?",
    riskProtection:
      "Prevents treating model output as a black box — users who understand the model make better decisions when to override it.",
    nextAction:
      "Open The Brain on any pick you are uncertain about. Compare the model's factor weights against your own read of the game.",
  },
  {
    id: "academy",
    href: "/academy",
    title: "Academy",
    eyebrow: "Betting doctrine",
    tagline: "Get sharper. One principle at a time.",
    description:
      "Structured learning library of Galaxy betting doctrine — covering CLV, EV, bankroll management, tilt recognition, market efficiency, and the No-Bet Doctrine. Each lesson is connected to the surface where the principle applies in practice.",
    state: "live",
    tier: "all",
    habitPhase: "improve",
    relatedSurfaces: ["tracker", "brain", "command", "today"],
    keyQuestion:
      "What core principle is most responsible for my recent process grade?",
    riskProtection:
      "Prevents users from staying in bad decision patterns by giving them the language and tools to recognize and correct them.",
    nextAction:
      "After any losing streak, open Academy and complete the Tilt Recognition or No-Bet Doctrine module before placing the next bet.",
  },
  {
    id: "reports",
    href: "/reports",
    title: "Intelligence Reports",
    eyebrow: "Deep game reports",
    tagline: "Every game has a story. This is the data version.",
    description:
      "Full-length AI-generated game intelligence reports — covering matchup history, key model factors, market timeline, risk flags, and the model's published rationale. Generated pre-game for every pick the model publishes.",
    state: "live",
    tier: "pro",
    habitPhase: "understand",
    relatedSurfaces: ["picks", "brain", "market-gravity", "today"],
    keyQuestion:
      "What is the full data-backed story behind this game before I place a bet?",
    riskProtection:
      "Prevents placing bets on games where the surface-level narrative contradicts the underlying model factors.",
    nextAction:
      "Read the full report on any pick above 70 confidence before placing. Pay particular attention to the Risk Flags section.",
  },
  {
    id: "command",
    href: "/command",
    title: "Command Center",
    eyebrow: "Bankroll & risk control",
    tagline: "Control your exposure before it controls you.",
    description:
      "Personal risk management dashboard — tracks bankroll, unit sizing, daily exposure, streak state, and tilt signals. Enforces flat-betting discipline and flags over-exposure before a bet is placed. Includes a mandatory pause protocol after three consecutive losses.",
    state: "live",
    tier: "pro",
    habitPhase: "track",
    relatedSurfaces: ["tracker", "alerts", "academy", "picks"],
    keyQuestion:
      "Am I within my exposure limits and am I showing any tilt patterns today?",
    riskProtection:
      "Prevents over-betting, tilt spirals, and stake-size spikes that systematically erode edge over time.",
    nextAction:
      "Check Command Center before placing any bet larger than your baseline unit. If exposure is over 5% of bankroll on a single game, reduce.",
  },
  {
    id: "tracker",
    href: "/tracker",
    title: "Bet Tracker",
    eyebrow: "Performance log",
    tagline: "The record doesn't lie. Your process might.",
    description:
      "Comprehensive bet log with CLV tracking, process grading, ROI by sport and bet type, and streak analytics. Every bet receives a process grade — disciplined, acceptable, questionable, or impulsive — based on how it was placed relative to the model and the line at close.",
    state: "live",
    tier: "all",
    habitPhase: "review",
    relatedSurfaces: ["command", "leaderboard", "academy", "picks"],
    keyQuestion:
      "Is my process improving, and am I getting positive CLV over my last 50 bets?",
    riskProtection:
      "Prevents rationalizing bad process bets because they happened to win, and prevents discarding good process bets because they happened to lose.",
    nextAction:
      "After every 10 bets, open the Tracker and review your process grades. If more than 30% are Questionable or Impulsive, complete an Academy module before continuing.",
  },
  {
    id: "leaderboard",
    href: "/leaderboard",
    title: "Leaderboard",
    eyebrow: "Community rankings",
    tagline: "Compete on process, not just outcomes.",
    description:
      "Community performance leaderboard — ranked by CLV, process grade, ROI, and sample size rather than raw win rate. Filters by sport, time range, and subscription tier. A high win rate on a small sample doesn't earn top placement.",
    state: "live",
    tier: "all",
    habitPhase: "review",
    relatedSurfaces: ["tracker", "picks", "academy"],
    keyQuestion:
      "Who is demonstrating repeatable process-based edge across a meaningful sample?",
    riskProtection:
      "Prevents blindly following users who are on a hot streak driven by variance rather than process.",
    nextAction:
      "When following a leaderboard user, check their sample size and CLV before replicating their picks. Process grade matters more than recent win rate.",
  },
  {
    id: "alerts",
    href: "/alerts",
    title: "Alerts",
    eyebrow: "Smart notifications",
    tagline: "Get notified when the signal changes, not when you ask.",
    description:
      "Configurable alert system — notifies you of new published picks, line movement thresholds, Rumor Radar flags, and model confidence updates. Alerts are surfaced by priority and suppressed during tilt pause protocols.",
    state: "live",
    tier: "pro",
    habitPhase: "enter",
    relatedSurfaces: ["today", "rumor-radar", "market-gravity", "command"],
    keyQuestion:
      "What has changed since I last checked that is material to my open positions?",
    riskProtection:
      "Prevents missing a late injury or line movement that changes the viability of a pick already in the queue.",
    nextAction:
      "Configure alerts for your sports, confidence floor, and line movement threshold. Enable Rumor Radar alerts for any game you have an active position on.",
  },
  {
    id: "studios",
    href: "/studios",
    title: "Content Studios",
    eyebrow: "Shareable intelligence",
    tagline: "Turn your process into content.",
    description:
      "Content generation layer for Galaxy users — produce shareable pick cards, weekly recap graphics, process breakdowns, and data-backed game previews. All content is data-sourced from your Tracker and the model's published intelligence.",
    state: "beta",
    tier: "elite",
    habitPhase: "improve",
    relatedSurfaces: ["tracker", "reports", "picks", "leaderboard"],
    keyQuestion:
      "How do I turn my Galaxy intelligence into shareable, credible content?",
    riskProtection:
      "Prevents sharing picks or analysis that cannot be backed up by model data or personal Tracker records.",
    nextAction:
      "Connect your Tracker to Studios before generating any pick card. All shared content will automatically link to your process record.",
  },
];

export function getSurface(id: string): Surface | undefined {
  return PRODUCT_SURFACES.find((s) => s.id === id);
}

export function getSurfacesByPhase(phase: Surface["habitPhase"]): Surface[] {
  return PRODUCT_SURFACES.filter((s) => s.habitPhase === phase);
}

export function getSurfacesByTier(
  tier: Surface["tier"]
): Surface[] {
  return PRODUCT_SURFACES.filter((s) => s.tier === tier || s.tier === "all");
}

export function getSurfacesByState(state: SurfaceState): Surface[] {
  return PRODUCT_SURFACES.filter((s) => s.state === state);
}

export function getRelatedSurfaces(id: string): Surface[] {
  const surface = getSurface(id);
  if (!surface) return [];
  return surface.relatedSurfaces
    .map((relId) => getSurface(relId))
    .filter((s): s is Surface => s !== undefined);
}
