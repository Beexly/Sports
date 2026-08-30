export type FantasyBaselineStatus =
  | "live-proof"
  | "csv-import-ready"
  | "gated-data"
  | "content-ready"
  | "manual-community";

export type FantasyBaselineModule = {
  readonly key: string;
  readonly module: string;
  readonly competitorBaseline: readonly ("LineStar" | "Fantasy Guru / Elite Sports")[];
  readonly gseSurface: string;
  readonly status: FantasyBaselineStatus;
  readonly userValue: string;
  readonly dataRequired: string;
  readonly currentTruth: string;
};

export const FANTASY_BASELINE_SOURCES = [
  {
    name: "LineStar",
    url: "https://www.linestarapp.com/",
    scope:
      "DFS dashboard, patented optimizer, projections, ownership, value plays, sentiment, injuries, props, lineup management, and multi-sport support.",
  },
  {
    name: "Fantasy Guru / Elite Sports",
    url: "https://www.fantasyguru.com/product/vip-all-access",
    scope:
      "Analysis, strategies, picks, odds, rankings, Elite data tools, stats, DFS content, projections, cheat sheets, optimizer, and community access.",
  },
] as const;

export const FANTASY_BASELINE_MODULES: readonly FantasyBaselineModule[] = [
  {
    key: "daily-dashboard",
    module: "Daily slate dashboard",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy + /today + /nflverse",
    status: "live-proof",
    userValue: "A single launch point for today's fantasy data, slate posture, and source gates.",
    dataRequired: "Schedule, player status, projections, odds, injury/news, and roster context.",
    currentTruth: "Real nflverse usage proof is live; projections and player advice remain gated.",
  },
  {
    key: "projections",
    module: "Player projections",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy",
    status: "gated-data",
    userValue: "Median, floor, ceiling, and role projections for every relevant player.",
    dataRequired: "Licensed or owned projection feed, injury status, usage, opponent, pace, weather, and market context.",
    currentTruth: "No public projection claims are live. The page reports the gate instead of inventing numbers.",
  },
  {
    key: "rankings-cheatsheets",
    module: "Rankings and cheat sheets",
    competitorBaseline: ["Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy/draft + /fantasy/baseline",
    status: "gated-data",
    userValue: "Tiered ranks, positional cliffs, draft sheets, and slate cheat sheets.",
    dataRequired: "Projection feed, ADP, salaries, injuries, depth charts, scoring settings, and update timestamps.",
    currentTruth: "Draft math exists on sample data; public rankings stay gated until live inputs exist.",
  },
  {
    key: "dfs-optimizer",
    module: "DFS lineup optimizer",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy/dfs",
    status: "csv-import-ready",
    userValue: "Cash, GPP, leverage, stacking, locks, fades, exposures, and salary-cap lineups.",
    dataRequired: "Salaries, projections, ownership, contest rules, player status, and slate lock time.",
    currentTruth: "Optimizer math and DraftKings CSV import exist; projections/ownership are modeled until licensed feeds are wired.",
  },
  {
    key: "multi-lineup-manager",
    module: "Multi-lineup manager/export",
    competitorBaseline: ["LineStar"],
    gseSurface: "/fantasy/dfs",
    status: "csv-import-ready",
    userValue: "Generate and compare multiple unique lineups with exposure control.",
    dataRequired: "Same DFS feed as optimizer plus export target rules.",
    currentTruth: "Portfolio generation exists locally; mass export remains gated until real contest formats are validated.",
  },
  {
    key: "ownership",
    module: "Projected ownership",
    competitorBaseline: ["LineStar"],
    gseSurface: "/fantasy/dfs",
    status: "gated-data",
    userValue: "Know where the field will concentrate and where leverage exists.",
    dataRequired: "Ownership model or licensed ownership feed by sport, slate, contest type, and timestamp.",
    currentTruth: "Sample ownership supports optimizer mechanics; public ownership claims are gated.",
  },
  {
    key: "value-plays",
    module: "Value plays",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy/dfs + /fantasy/lineup",
    status: "gated-data",
    userValue: "Salary-adjusted plays with reason codes and risk flags.",
    dataRequired: "Salaries, projections, ownership, injury/news, matchup, and minutes/snap expectations.",
    currentTruth: "No live value cards are published without those feeds.",
  },
  {
    key: "locks-fades-exposures",
    module: "Locks, fades, exposures",
    competitorBaseline: ["LineStar"],
    gseSurface: "/fantasy/dfs",
    status: "csv-import-ready",
    userValue: "Pin conviction plays, remove bad plays, and shape portfolio exposure.",
    dataRequired: "Optimizer player pool and validated slate inputs.",
    currentTruth: "Controls exist in the DFS tool; public tool access remains gated by `FANTASY_PUBLIC_TOOLS_ENABLED`.",
  },
  {
    key: "social-sentiment",
    module: "Social sentiment and crowd lean",
    competitorBaseline: ["LineStar"],
    gseSurface: "/airwave + /the-beat + /fantasy/baseline",
    status: "gated-data",
    userValue: "Separate crowd attention from model conviction.",
    dataRequired: "Permitted social/listening feeds, attribution rules, deduplication, and toxicity/rights filters.",
    currentTruth: "Airwave intake gates exist; no social sentiment score is live.",
  },
  {
    key: "breaking-news-injuries",
    module: "Breaking news and injuries",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/the-beat + /cockpit/sources",
    status: "content-ready",
    userValue: "Fast injury, depth-chart, and role-change context with reliability tiers.",
    dataRequired: "Official injury feeds, beat reports, source attribution, and update timestamps.",
    currentTruth: "Source mesh and Airwave/Beat readiness exist; no fabricated beat reports are shown.",
  },
  {
    key: "props-ev",
    module: "Props AI / EV edges",
    competitorBaseline: ["LineStar"],
    gseSurface: "/fantasy/props",
    status: "gated-data",
    userValue: "Compare posted lines to model numbers, alt lines, and payout math.",
    dataRequired: "Pick'em lines, stat projections, payout tables, book limits, and settlement source.",
    currentTruth: "EV math exists on sample data; live prop advice stays gated.",
  },
  {
    key: "live-scoring-status",
    module: "Live scoring and player status",
    competitorBaseline: ["LineStar"],
    gseSurface: "/fantasy/connect + /nflverse",
    status: "gated-data",
    userValue: "Track active roster performance and late player-status changes.",
    dataRequired: "League roster sync, live scoring feed, official player status, and game clock.",
    currentTruth: "Sleeper read-only sync exists; live scoring is not yet wired.",
  },
  {
    key: "analysis-strategy",
    module: "Analysis, strategy, and premium content",
    competitorBaseline: ["Fantasy Guru / Elite Sports"],
    gseSurface: "/airwave + /gsn + /fantasy/studio",
    status: "content-ready",
    userValue: "Explain what matters, why it matters, and how to act without hiding behind black boxes.",
    dataRequired: "Reviewed claims, citations, projections, source evidence, and editorial approval.",
    currentTruth: "Studio and Airwave drafts exist with no auto-publish path.",
  },
  {
    key: "odds-markets",
    module: "Odds and market context",
    competitorBaseline: ["Fantasy Guru / Elite Sports"],
    gseSurface: "/integrations + /fantasy/props",
    status: "gated-data",
    userValue: "Use market movement, totals, and pricing to contextualize fantasy decisions.",
    dataRequired: "Odds provider, stale-source handling, book coverage, and line history.",
    currentTruth: "Provider slots are defined; public market-backed advice waits for live odds.",
  },
  {
    key: "community-support",
    module: "Community and support loop",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/fantasy/baseline",
    status: "manual-community",
    userValue: "Give users a place to ask, challenge, and improve the product loop.",
    dataRequired: "Moderation, support workflow, and published rules.",
    currentTruth: "No fake Discord/community is advertised as live.",
  },
  {
    key: "multi-sport",
    module: "Multi-sport coverage",
    competitorBaseline: ["LineStar", "Fantasy Guru / Elite Sports"],
    gseSurface: "/integrations + /fantasy/baseline",
    status: "gated-data",
    userValue: "Support NFL, NBA, MLB, NHL, PGA, NASCAR/racing, and other DFS/fantasy slates.",
    dataRequired: "Sport-specific projections, salaries, rules, injuries, schedules, and settlement feeds.",
    currentTruth: "NFL nflverse proof is live; broader sport coverage is explicitly gated.",
  },
];

export function fantasyBaselineSummary(): Record<FantasyBaselineStatus, number> {
  return FANTASY_BASELINE_MODULES.reduce<Record<FantasyBaselineStatus, number>>(
    (summary, module) => {
      summary[module.status] += 1;
      return summary;
    },
    {
      "live-proof": 0,
      "csv-import-ready": 0,
      "gated-data": 0,
      "content-ready": 0,
      "manual-community": 0,
    },
  );
}
