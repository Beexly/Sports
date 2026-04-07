// ============================================================
// Shared Platform Types
// ============================================================

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";

export type PickType = "SPREAD" | "MONEYLINE" | "TOTAL";
export type PickTier = "FREE" | "PREMIUM";
export type PickResult = "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";

// ============================================================
// Entitlements
// ============================================================

export interface Entitlements {
  tier: SubscriptionTier;
  canSeePremiumPicks: boolean;
  canSeeConfidence: boolean;
  canSeeLineMovement: boolean;
  canGetAlerts: boolean;
  dailyPickLimit: number | null; // null = unlimited
}

export function getEntitlements(tier: SubscriptionTier): Entitlements {
  return {
    tier,
    canSeePremiumPicks: tier === "PRO" || tier === "ELITE",
    canSeeConfidence: tier === "PRO" || tier === "ELITE",
    canSeeLineMovement: tier === "PRO" || tier === "ELITE",
    canGetAlerts: tier === "ELITE",
    dailyPickLimit: tier === "FREE" ? 1 : null,
  };
}

// ============================================================
// The Odds API raw response types
// ============================================================

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: "h2h" | "spreads" | "totals";
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

export interface OddsApiScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

// ============================================================
// Normalized internal types
// ============================================================

export interface NormalizedGame {
  externalId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
}

export interface NormalizedOdds {
  gameExternalId: string;
  bookmaker: string;
  market: "H2H" | "SPREADS" | "TOTALS";
  homePrice?: number;
  awayPrice?: number;
  drawPrice?: number;
  spread?: number;
  homeSpreadPrice?: number;
  awaySpreadPrice?: number;
  total?: number;
  overPrice?: number;
  underPrice?: number;
  fetchedAt: Date;
}

// ============================================================
// Prediction Engine types
// ============================================================

export interface OddsInput {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  sport: string;
  bookmakerOdds: BookmakerOddsInput[];
}

export interface BookmakerOddsInput {
  bookmaker: string;
  market: "H2H" | "SPREADS" | "TOTALS";
  homePrice?: number;
  awayPrice?: number;
  spread?: number;
  homeSpreadPrice?: number;
  awaySpreadPrice?: number;
  total?: number;
  overPrice?: number;
  underPrice?: number;
}

export interface ScoredPick {
  gameId: string;
  pickType: PickType;
  selection: string;
  line: number;
  confidence: number;
  tier: PickTier;
  reasoning: string;
  modelVersion: string;
}

// ============================================================
// API Response types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// Pick display types (safe for client)
// ============================================================

export interface PublicPick {
  id: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    sport: string;
  };
  pickType: PickType;
  selection: string;
  line: number;
  confidence: number | null; // null if user can't see it
  tier: PickTier;
  reasoning: string;
  generatedAt: string;
  result: PickResult;
}

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null; // null if user can't see full content
  sport: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
}

// ============================================================
// Content generation types
// ============================================================

export interface ContentGenerationInput {
  date: string;
  sport: string;
  picks: Array<{
    game: string;
    pickType: PickType;
    selection: string;
    line: number;
    confidence: number;
    reasoning: string;
  }>;
}

export interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}
