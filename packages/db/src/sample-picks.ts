/**
 * Sample picks generator (stub / demo mode only).
 *
 * Returns a deterministic-by-day set of model picks so the operator can
 * see realistic content on /picks and /dashboard while live data is being
 * wired up. Active iff DEMO_PICKS_ENABLED=true. Never active in production.
 *
 * Sample picks are marked isBootstrap=false (so /api/picks doesn't filter
 * them out) and isPublished=true, BUT every UI surface that renders them
 * shows a "Sample data" banner whenever isStubMode() && isDemoPicksEnabled()
 * is true. Result is always PENDING — no fake win-rate ever leaks.
 */

export function isDemoPicksEnabled(): boolean {
  return process.env["DEMO_PICKS_ENABLED"] === "true";
}

interface SampleTeam {
  readonly name: string;
  readonly abbr: string;
}

interface SamplePickSeed {
  readonly homeTeam: SampleTeam;
  readonly awayTeam: SampleTeam;
  readonly sport: { name: string; key: string };
  readonly pickType: "ATS_SPREAD" | "MONEYLINE" | "TOTAL_OVER" | "TOTAL_UNDER";
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly dataQualityScore: number;
  readonly tier: "FREE" | "PRO" | "ELITE";
  readonly pickGrade: "ELITE_PLAY" | "STRONG_PLAY" | "SOLID_PLAY" | "LEAN";
  readonly riskLevel: "LOW_RISK" | "MODERATE" | "HIGH_VARIANCE" | "INJURY_RISK" | "LINE_STEAM";
  readonly reasoning: string;
  readonly reasoningShort: string;
  readonly isFeatured: boolean;
}

const SEED_DATA: ReadonlyArray<SamplePickSeed> = [
  {
    homeTeam: { name: "Boston Celtics", abbr: "BOS" },
    awayTeam: { name: "Milwaukee Bucks", abbr: "MIL" },
    sport: { name: "NBA", key: "basketball_nba" },
    pickType: "ATS_SPREAD",
    selection: "Boston Celtics -4.5",
    line: -4.5,
    confidence: 71,
    edgeScore: 3.8,
    dataQualityScore: 88,
    tier: "FREE",
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Home ATS profile strong over last 9; visitor on back-end of B2B with one rotation player ruled out. Line value at -4.5 reflects late sharp money.",
    reasoningShort: "Home spot vs. back-to-back, sharp steam under 5.",
    isFeatured: true,
  },
  {
    homeTeam: { name: "Kansas City Chiefs", abbr: "KC" },
    awayTeam: { name: "Buffalo Bills", abbr: "BUF" },
    sport: { name: "NFL", key: "americanfootball_nfl" },
    pickType: "MONEYLINE",
    selection: "Buffalo Bills ML",
    line: 165,
    confidence: 63,
    edgeScore: 2.1,
    dataQualityScore: 91,
    tier: "FREE",
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Bills offense vs. a depleted secondary; weather neutral. Implied probability gap to fair value ~4 points.",
    reasoningShort: "Coverage mismatch + 4pt implied-prob gap.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Los Angeles Dodgers", abbr: "LAD" },
    awayTeam: { name: "San Diego Padres", abbr: "SD" },
    sport: { name: "MLB", key: "baseball_mlb" },
    pickType: "TOTAL_UNDER",
    selection: "Under 8.5 runs",
    line: 8.5,
    confidence: 67,
    edgeScore: 2.7,
    dataQualityScore: 84,
    tier: "PRO",
    pickGrade: "STRONG_PLAY",
    riskLevel: "LOW_RISK",
    reasoning:
      "Top-15 ERA starters both sides; park-adjusted run environment trending under by 0.6 over last 10 starts each. Wind in from RF at 9mph.",
    reasoningShort: "Pitching matchup + park-adjusted under trend.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Toronto Maple Leafs", abbr: "TOR" },
    awayTeam: { name: "Tampa Bay Lightning", abbr: "TB" },
    sport: { name: "NHL", key: "icehockey_nhl" },
    pickType: "ATS_SPREAD",
    selection: "Tampa Bay Lightning +1.5",
    line: 1.5,
    confidence: 58,
    edgeScore: 1.4,
    dataQualityScore: 79,
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "+1.5 puck-line role profitable this season; home goalie carousel adds variance.",
    reasoningShort: "+1.5 puck-line trend, goalie variance.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Golden State Warriors", abbr: "GSW" },
    awayTeam: { name: "Phoenix Suns", abbr: "PHX" },
    sport: { name: "NBA", key: "basketball_nba" },
    pickType: "TOTAL_OVER",
    selection: "Over 232.5 points",
    line: 232.5,
    confidence: 74,
    edgeScore: 4.2,
    dataQualityScore: 90,
    tier: "PRO",
    pickGrade: "ELITE_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Both teams top-5 in pace; visitor defensive rating bottom-10 last 15. Home 3pt volume sustained. Total has bounced off opens.",
    reasoningShort: "Pace + defense, sustained 3pt volume.",
    isFeatured: true,
  },
  {
    homeTeam: { name: "Miami Dolphins", abbr: "MIA" },
    awayTeam: { name: "New York Jets", abbr: "NYJ" },
    sport: { name: "NFL", key: "americanfootball_nfl" },
    pickType: "ATS_SPREAD",
    selection: "Miami Dolphins -3.5",
    line: -3.5,
    confidence: 62,
    edgeScore: 2.0,
    dataQualityScore: 86,
    tier: "FREE",
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Home offense profile travels well; visitor QB situation negative for cover probability. Sharps coming back at -3.5.",
    reasoningShort: "QB edge + sharp re-buy at 3.5.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Houston Astros", abbr: "HOU" },
    awayTeam: { name: "Texas Rangers", abbr: "TEX" },
    sport: { name: "MLB", key: "baseball_mlb" },
    pickType: "MONEYLINE",
    selection: "Texas Rangers ML",
    line: 135,
    confidence: 59,
    edgeScore: 1.7,
    dataQualityScore: 82,
    tier: "PRO",
    pickGrade: "SOLID_PLAY",
    riskLevel: "HIGH_VARIANCE",
    reasoning:
      "Home rotation gap day; visitor lineup R-heavy vs. LHP. +135 reflects market overvalue on home recent run.",
    reasoningShort: "Rotation gap day + L/R lineup edge.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Denver Nuggets", abbr: "DEN" },
    awayTeam: { name: "Oklahoma City Thunder", abbr: "OKC" },
    sport: { name: "NBA", key: "basketball_nba" },
    pickType: "ATS_SPREAD",
    selection: "Oklahoma City Thunder +2.5",
    line: 2.5,
    confidence: 69,
    edgeScore: 3.1,
    dataQualityScore: 87,
    tier: "ELITE",
    pickGrade: "ELITE_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Visitor rim defense top-3; home coming off 3-OT game with elevated star load. Spread should hover closer to 1.",
    reasoningShort: "Rim defense + rest disadvantage for home.",
    isFeatured: true,
  },
  {
    homeTeam: { name: "Seattle Mariners", abbr: "SEA" },
    awayTeam: { name: "Texas Rangers", abbr: "TEX" },
    sport: { name: "MLB", key: "baseball_mlb" },
    pickType: "TOTAL_UNDER",
    selection: "Under 7.5 runs",
    line: 7.5,
    confidence: 56,
    edgeScore: 1.1,
    dataQualityScore: 81,
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Pitcher-friendly park; both starters sub-3.50 xERA over last 5.",
    reasoningShort: "Pitcher-friendly park + sub-3.5 xERA both sides.",
    isFeatured: false,
  },
  {
    homeTeam: { name: "Colorado Avalanche", abbr: "COL" },
    awayTeam: { name: "Dallas Stars", abbr: "DAL" },
    sport: { name: "NHL", key: "icehockey_nhl" },
    pickType: "TOTAL_OVER",
    selection: "Over 6.5 goals",
    line: 6.5,
    confidence: 64,
    edgeScore: 2.4,
    dataQualityScore: 83,
    tier: "PRO",
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    reasoning:
      "Both teams top-7 in expected goals for; backup goalies projected both sides. Total opened 6 and steamed up.",
    reasoningShort: "xGF top-7 + backup goalies + steam.",
    isFeatured: false,
  },
];

export interface SamplePick {
  id: string;
  gameId: string;
  pickType: string;
  selection: string;
  line: number;
  confidence: number;
  edgeScore: number;
  dataQualityScore: number;
  tier: string;
  pickGrade: string;
  riskLevel: string;
  reasoning: string;
  reasoningShort: string;
  isFeatured: boolean;
  isPublished: boolean;
  isBootstrap: boolean;
  result: "PENDING";
  generatedAt: Date;
  dataFreshnessAt: Date;
  modelVersion: string;
  settledAt: Date | null;
  factorBreakdown: Record<string, unknown> | null;
  game: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    dataQualityScore: number;
    sport: { name: string; key: string };
  };
}

function hashStringToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getSamplePicks(now: Date = new Date()): SamplePick[] {
  const dateKey = now.toISOString().slice(0, 10);
  // Ensure commenceTime is always at least 1h in the future of `now` so the
  // games haven't started yet on the demo dashboard, regardless of the time of day.
  const baseTime = Math.max(new Date(`${dateKey}T18:00:00Z`).getTime(), now.getTime() + 60 * 60_000);

  return SEED_DATA.map((seed, i) => {
    const idSuffix = `${dateKey}-${i}`;
    const commenceOffsetMin = 30 * (i + 2) + (hashStringToInt(idSuffix) % 90);
    const commenceTime = new Date(baseTime + commenceOffsetMin * 60_000);
    const generatedAt = new Date(now.getTime() - (i + 1) * 12 * 60_000);
    return {
      id: `sample-pick-${idSuffix}`,
      gameId: `sample-game-${idSuffix}`,
      pickType: seed.pickType,
      selection: seed.selection,
      line: seed.line,
      confidence: seed.confidence,
      edgeScore: seed.edgeScore,
      dataQualityScore: seed.dataQualityScore,
      tier: seed.tier,
      pickGrade: seed.pickGrade,
      riskLevel: seed.riskLevel,
      reasoning: seed.reasoning,
      reasoningShort: seed.reasoningShort,
      isFeatured: seed.isFeatured,
      isPublished: true,
      isBootstrap: false,
      result: "PENDING",
      generatedAt,
      dataFreshnessAt: generatedAt,
      modelVersion: "sample-v0.0.0",
      settledAt: null,
      factorBreakdown: null,
      game: {
        id: `sample-game-${idSuffix}`,
        homeTeamName: seed.homeTeam.name,
        awayTeamName: seed.awayTeam.name,
        commenceTime,
        dataQualityScore: seed.dataQualityScore,
        sport: seed.sport,
      },
    };
  });
}

export const SAMPLE_PICK_COUNT = SEED_DATA.length;
