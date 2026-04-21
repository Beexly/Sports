// ============================================================
// Shared types for the scores24.live collector
// ============================================================

export interface NormalizedPick {
  source: "scores24";
  sport: string;
  league: string;
  event: string;
  home_team: string;
  away_team: string;
  market: string;
  pick: string;
  odds: number | null;
  confidence: number | null;
  event_time: string;
  scraped_at: string;
  page_type: string;
  source_url: string;
  raw: Record<string, unknown>;
}

// A single captured network call during discovery
export interface CapturedEndpoint {
  url: string;
  method: string;
  statusCode: number;
  contentType: string;
  requestHeaders: Record<string, string>;
  responseSize: number;
  // Relevance flags
  hasPredictions: boolean;
  hasOdds: boolean;
  hasTeams: boolean;
  hasTimestamps: boolean;
  // Scored 0–10: how likely this endpoint contains picks data
  relevanceScore: number;
  bodyPreview: string;       // first 800 chars
  bodySnippet: Record<string, unknown> | null; // parsed JSON preview (top-level keys + first item)
  timestamp: string;
}

// A WebSocket connection + captured frames
export interface CapturedWebSocket {
  url: string;
  openedAt: string;
  frames: Array<{
    direction: "sent" | "received";
    payload: string;          // truncated to 1 000 chars
    hasPredictions: boolean;
    timestamp: string;
  }>;
}

// Inline page data found in HTML source (Next.js __NEXT_DATA__, nuxt state, etc.)
export interface InlinePageData {
  url: string;
  source: "__NEXT_DATA__" | "__NUXT__" | "window.__INITIAL_STATE__" | "json-ld" | "other";
  keyPaths: string[];          // top-level key paths in the object
  hasPredictions: boolean;
  dataPreview: string;
  timestamp: string;
}

// Full discovery report written to data/raw/discovery-report.json
export interface DiscoveryReport {
  target: string;
  discoveredAt: string;
  durationMs: number;
  antiBot: {
    blocked: boolean;
    blockDetails: string | null;
    cfPresent: boolean;
  };
  summary: {
    totalRequests: number;
    jsonResponses: number;
    endpointsWithPredictions: number;
    webSocketsFound: number;
    inlineDataFound: number;
  };
  endpoints: CapturedEndpoint[];
  websockets: CapturedWebSocket[];
  inlineData: InlinePageData[];
  // Human-readable notes about what looks stable vs fragile
  stabilityNotes: string[];
}

// Config for the collector — filled in after discovery
export interface CollectorConfig {
  // Direct API endpoints to hit (found during discovery)
  apiEndpoints: Array<{
    url: string;
    sport: string;
    notes: string;
    queryParams?: Record<string, string>;
  }>;
  // If no direct endpoints: navigate these pages and intercept
  fallbackPages: string[];
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenPagesMs: number;
  };
}
