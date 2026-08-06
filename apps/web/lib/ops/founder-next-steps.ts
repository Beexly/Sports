/**
 * Ordered multi-domain founder actions — pure, public-safe (no secrets).
 * Keeps ops truth from hyper-focusing: settle, deploy, credits, free-lane, gates.
 */

export interface FounderNextStep {
  readonly id: string;
  readonly domain:
    | "deploy"
    | "settlement"
    | "jynx_credits"
    | "free_lane"
    | "product_gates"
    | "content"
    | "statking";
  readonly priority: "P0" | "P1" | "P2";
  readonly action: string;
}

export interface FounderNextStepsInput {
  readonly overduePending: number | null;
  readonly settlementHealth: string | null;
  readonly freeLaneConfigured: boolean;
  readonly claudeProvider: string;
  readonly anyCloudConfigured: boolean;
  readonly jynxAuto: boolean;
  readonly statsPublic: boolean;
  readonly canExposePublicPicks: boolean;
  readonly podcastEpisodes: number;
  readonly newsletterIssues: number;
  /** Features this deploy claims vs code markers length (diagnostic only). */
  readonly markerCount: number;
  readonly expectedMarkerFloor: number;
}

/**
 * Build a short ordered queue. Empty array = stack is operator-ready on code side.
 */
export function buildFounderNextSteps(input: FounderNextStepsInput): readonly FounderNextStep[] {
  const steps: FounderNextStep[] = [];

  if (input.overduePending !== null && input.overduePending > 0) {
    steps.push({
      id: "settle-overdue",
      domain: "settlement",
      priority: "P0",
      action: `Settlement overdue ${input.overduePending} — run free settle-picks (CRON_SECRET); RCA if stuck after redeploy.`,
    });
  } else if (input.settlementHealth === "CRITICAL") {
    steps.push({
      id: "settle-critical",
      domain: "settlement",
      priority: "P0",
      action: "Settlement CRITICAL — redeploy if SHA lags, then free settle cycle.",
    });
  }

  if (input.markerCount < input.expectedMarkerFloor) {
    steps.push({
      id: "redeploy-main",
      domain: "deploy",
      priority: "P0",
      action: "Redeploy Production to main HEAD so ops markers and honesty fixes land.",
    });
  }

  if (!input.freeLaneConfigured) {
    steps.push({
      id: "free-lane-env",
      domain: "free_lane",
      priority: "P1",
      action:
        "Enable free content: CONTENT_FREE_LANE_ENABLED=true + CEREBRAS_API_KEY and/or FREE_LANE_SECONDARY_*.",
    });
  }

  if (!input.jynxAuto && input.claudeProvider === "anthropic") {
    steps.push({
      id: "jynx-auto-or-cloud",
      domain: "jynx_credits",
      priority: "P1",
      action:
        "Set CLAUDE_PROVIDER=auto (or bedrock|azure|vertex) + cloud maps so Claude spends credits not cash.",
    });
  } else if (input.jynxAuto && !input.anyCloudConfigured) {
    steps.push({
      id: "cloud-maps",
      domain: "jynx_credits",
      priority: "P1",
      action: "Jynx auto is on but no cloud fully configured — paste Bedrock/Azure/Vertex maps.",
    });
  }

  if (input.canExposePublicPicks) {
    steps.push({
      id: "public-picks-on",
      domain: "product_gates",
      priority: "P0",
      action: "PUBLIC_PICKS is ON — confirm proof bar + settlement healthy before marketing.",
    });
  }

  if (input.statsPublic) {
    steps.push({
      id: "stats-public-on",
      domain: "statking",
      priority: "P0",
      action: "STATS_PUBLIC is ON — confirm rights memo + feed SLA before promoting StatKing.",
    });
  } else {
    steps.push({
      id: "statking-dark-hold",
      domain: "statking",
      priority: "P2",
      action: "StatKing stays dark (correct) until rights + live feeds — see docs/research/STATKING_STILL_DARK.md.",
    });
  }

  if (input.podcastEpisodes < 1 || input.newsletterIssues < 1) {
    steps.push({
      id: "content-archives",
      domain: "content",
      priority: "P1",
      action: "Podcast/newsletter archive thin — ship next operator-reviewed issue/episode.",
    });
  }

  // Cap public payload — still multi-domain, not one silo essay
  return steps.slice(0, 8);
}
