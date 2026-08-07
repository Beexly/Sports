/**
 * Ordered multi-domain founder actions — pure, public-safe (no secrets).
 * Keeps ops truth from hyper-focusing: settle, deploy, credits, free-lane, gates, billing.
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
    | "statking"
    | "billing"
    | "analytics";
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
  /** Money path env posture (optional — older callers omit → dashboard audit still shown). */
  readonly stripeSecretConfigured?: boolean;
  readonly webhookSecretConfigured?: boolean;
  /**
   * Free-spine I3/I8 posture (optional — older callers omit → no free-spine steps).
   * criticalGaps / requireSpend are structural catalog counts from free-spine probe,
   * not live network failures.
   */
  readonly freeSpinePresent?: boolean;
  readonly freeSpineWithinSla?: boolean;
  readonly freeSpineCriticalGaps?: number | null;
  readonly freeSpineRequireSpend?: number | null;
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

  // Free-spine I3/I8: seed / refresh / dual-path catalog (ABSENT-only free path).
  // Optional fields — omit keeps queue backward-compatible for pure unit callers.
  if (typeof input.freeSpinePresent === "boolean") {
    if (!input.freeSpinePresent) {
      steps.push({
        id: "free-spine-seed",
        domain: "free_lane",
        priority: "P1",
        action:
          "No free-spine durable snap — run free-spine-health (CRON_SECRET) so multi-isolate cockpit can score live free coverage (I3).",
      });
    } else if (input.freeSpineWithinSla === false) {
      steps.push({
        id: "free-spine-stale",
        domain: "free_lane",
        priority: "P1",
        action:
          "Free-spine snap past 120m SLA — run free-spine-health (or enable AUTONOMY_EXECUTE for planner re-probe). Stale multi-source age misleads I8.",
      });
    }
  }

  const criticalGaps = input.freeSpineCriticalGaps;
  const requireSpend = input.freeSpineRequireSpend ?? 0;
  if (typeof criticalGaps === "number" && criticalGaps > 0) {
    // Today all critical dual-path shortfalls are odds×sport single-cleared paid
    // (the-odds-api). When requireSpend matches criticalGaps, say so explicitly —
    // free odds candidates stay gated; never invent lines.
    const oddsPaidOnly = requireSpend > 0 && requireSpend === criticalGaps;
    steps.push({
      id: "free-spine-dual-path-gaps",
      domain: "free_lane",
      priority: "P2",
      action: oddsPaidOnly
        ? `Free dual-path ABSENT on ${criticalGaps} need×sport cell(s) that mustSpend (catalog: odds via the-odds-api single-clear). Free odds candidates remain gated until a legal free source clears — accept paid single-path or clear free odds; never invent lines.`
        : `Free multi-source dual-path gaps: ${criticalGaps} critical need×sport cell(s) below dual free redundancy (scores/results/odds/player_stats/weather).${
            requireSpend > 0 ? ` ${requireSpend} cell(s) still requireSpend.` : ""
          } Expand free adapters where legal — never invent scores.`,
    });
  }

  // A credit path is "intended" under auto mode OR an explicit cloud pick.
  // Only a bare "anthropic" (or unset) means no credit path is selected at all.
  // Checking the provider — not just `jynxAuto` — is what keeps a half-finished
  // explicit pick (e.g. CLAUDE_PROVIDER=bedrock with no BEDROCK_MODEL_MAP) from
  // dropping out of the queue and reading as "done" while spend stays on cash.
  const intendsCloudCredits = input.jynxAuto || input.claudeProvider !== "anthropic";

  if (!intendsCloudCredits) {
    steps.push({
      id: "jynx-auto-or-cloud",
      domain: "jynx_credits",
      priority: "P1",
      action:
        "Set CLAUDE_PROVIDER=auto (or bedrock|azure|vertex) + cloud maps so Claude spends credits not cash.",
    });
  } else if (!input.anyCloudConfigured) {
    steps.push({
      id: "cloud-maps",
      domain: "jynx_credits",
      priority: "P1",
      action: `Credit routing selected (${input.claudeProvider}) but no cloud is fully configured — Claude still bills cash. Paste Bedrock/Azure/Vertex creds + model maps.`,
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

  // Money path: escalate missing env first; Dashboard endpoint audit stays when secrets exist.
  const stripeKnown = typeof input.stripeSecretConfigured === "boolean";
  const webhookKnown = typeof input.webhookSecretConfigured === "boolean";
  if (stripeKnown && input.stripeSecretConfigured === false) {
    steps.push({
      id: "stripe-secret-env",
      domain: "billing",
      priority: "P1",
      action:
        "STRIPE_SECRET_KEY missing in prod — checkout cannot create sessions. Wire secret + price ids/lookup_keys.",
    });
  } else if (webhookKnown && input.webhookSecretConfigured === false) {
    steps.push({
      id: "stripe-webhook-secret-env",
      domain: "billing",
      priority: "P1",
      action:
        "STRIPE_WEBHOOK_SECRET missing — sessions may create without durable entitlements. Wire webhook secret + Dashboard endpoint.",
    });
  } else {
    steps.push({
      id: "stripe-webhook-audit",
      domain: "billing",
      priority: "P1",
      action:
        "Stripe Dashboard: confirm only galaxysportsedge.com webhook endpoints (remove foreign domains e.g. medusajs if unintended).",
    });
  }

  steps.push({
    id: "analytics-optional",
    domain: "analytics",
    priority: "P2",
    action:
      "Optional: NEXT_PUBLIC_ANALYTICS_ENABLED=true + NEXT_PUBLIC_CLARITY_PROJECT_ID (PostHog only with keys + privacy review).",
  });
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
