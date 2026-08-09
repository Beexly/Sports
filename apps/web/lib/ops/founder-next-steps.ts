/**
 * Ordered multi-domain founder actions — pure, public-safe (no secrets).
 * Designed for a non-engineer founder: few items, only real decisions.
 * Suppresses noise (always-on holds, accepted odds paid-single, optional analytics).
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
    | "analytics"
    | "growth";
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
  /** Money path env posture (optional). */
  readonly stripeSecretConfigured?: boolean;
  readonly webhookSecretConfigured?: boolean;
  /**
   * Live Stripe webhook host audit (optional).
   * When probed + !auditRequired + gsePrimaryHealthy → no Dashboard audit nag.
   */
  readonly stripeWebhookProbed?: boolean;
  readonly stripeWebhookAuditRequired?: boolean;
  readonly stripeWebhookGseHealthy?: boolean;
  readonly stripeWebhookForeignHosts?: readonly string[];
  /**
   * Free-spine I3/I8 posture (optional).
   * Pure odds paid-single (requireSpend === criticalGaps) is accepted architecture
   * — not a founder to-do (never invent lines).
   */
  readonly freeSpinePresent?: boolean;
  readonly freeSpineWithinSla?: boolean;
  readonly freeSpineCriticalGaps?: number | null;
  readonly freeSpineRequireSpend?: number | null;
  /** When true, surface optional analytics (default off — reduces noise). */
  readonly includeOptionalAnalytics?: boolean;
  /** Waitlist public lead capture closed by Basic Auth gate. */
  readonly waitlistGateEnabled?: boolean;
  /** Non-seed settled sample vs code floor (optional). */
  readonly nonSeedSettled?: number | null;
  readonly nonSeedFloorProven?: number;
  /** Last odds-inserting SUCCESS outside Refresh SLA (kill switch dark). */
  readonly oddsInsertingStale?: boolean;
  readonly calibrationEligibilityStatus?: "GREEN" | "RED" | null;
  readonly calibrationPublished?: boolean;
  readonly calibrationAutoPublish?: boolean;
  readonly remainingToFloor?: number | null;
}

/**
 * Build a short ordered queue. Empty-ish array = stack is operator-ready on code side.
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

  // Free-spine seed / stale only — dual-path pure odds paid-single is accepted (not a to-do).
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
  // Only nag dual-path when gaps are NOT fully explained by paid odds single-path.
  if (
    typeof criticalGaps === "number" &&
    criticalGaps > 0 &&
    !(requireSpend > 0 && requireSpend === criticalGaps)
  ) {
    steps.push({
      id: "free-spine-dual-path-gaps",
      domain: "free_lane",
      priority: "P2",
      action: `Free multi-source dual-path gaps: ${criticalGaps} critical need×sport cell(s) below dual free redundancy.${
        requireSpend > 0 ? ` ${requireSpend} cell(s) still requireSpend.` : ""
      } Expand free adapters where legal — never invent scores.`,
    });
  }

  const intendsCloudCredits = input.jynxAuto || input.claudeProvider !== "anthropic";

  if (!intendsCloudCredits) {
    steps.push({
      id: "jynx-auto-or-cloud",
      domain: "jynx_credits",
      priority: "P1",
      action:
        "Set CLAUDE_PROVIDER=auto (or bedrock|azure|vertex) + cloud maps so Claude spends credits not cash. Free-lane already covers content $0.",
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
    if (input.oddsInsertingStale) {
      steps.push({
        id: "public-picks-odds-stale",
        domain: "product_gates",
        priority: "P0",
        action:
          "PUBLIC_PICKS ON but last odds insert is outside Refresh SLA — surface correctly dark. Confirm THE_ODDS_API_KEY quota for market board; OR set PUBLIC_BOARD_SURFACE=signal for model-signal board (slate-fresh, never book labels). Do not lower SLA.",
      });
    } else {
      steps.push({
        id: "public-picks-on",
        domain: "product_gates",
        priority: "P0",
        action: "PUBLIC_PICKS is ON — confirm proof bar + settlement healthy before marketing.",
      });
    }
  }

  if (input.waitlistGateEnabled === true) {
    steps.push({
      id: "waitlist-open-funnel",
      domain: "growth",
      priority: "P1",
      action:
        "Waitlist Basic Auth is locking lead capture — FOUNDING open: set GSE_WAITLIST_GATE_ENABLED=false (or unset) on Production; code default is open when flag is not true.",
    });
  }

  const floor = input.nonSeedFloorProven ?? 100;
  const remaining = input.remainingToFloor;
  if (typeof remaining === "number" && remaining > 0) {
    steps.push({
      id: "accumulate-nonseed-settled",
      domain: "product_gates",
      priority: "P2",
      action: `Canonical settled short by ${remaining} (floor ${floor}) — settle-picks accumulates; never invent sample.`,
    });
  } else if (input.calibrationEligibilityStatus === "RED") {
    steps.push({
      id: "calibration-metrics-below-floor",
      domain: "product_gates",
      priority: "P1",
      action:
        "Sample floor met but calibration eligibility RED — wait for live Brier/ECE/Murphy floors + streak (calibration-metrics cron). Do not claim PROVEN.",
    });
  } else if (
    input.calibrationEligibilityStatus === "GREEN" &&
    !input.calibrationPublished &&
    !input.calibrationAutoPublish
  ) {
    steps.push({
      id: "enable-calibration-auto-publish",
      domain: "product_gates",
      priority: "P1",
      action:
        "Eligibility GREEN. One-time: set CALIBRATION_AUTO_PUBLISH=true (or CALIBRATION_PUBLISHED=true). No weekly ceremony after that.",
    });
  } else if (input.calibrationAutoPublish && input.calibrationEligibilityStatus === "GREEN") {
    steps.push({
      id: "calibration-unattended",
      domain: "product_gates",
      priority: "P2",
      action: "Auto-publish policy ON + eligibility GREEN — performance path unattended. No founder click required.",
    });
  } else if (typeof input.nonSeedSettled === "number" && input.nonSeedSettled < floor) {
    steps.push({
      id: "accumulate-nonseed-settled",
      domain: "product_gates",
      priority: "P2",
      action: `Non-seed settled ${input.nonSeedSettled}/${floor} — machine accumulates via settle-picks; do not invent sample or claim PROVEN.`,
    });
  }

  // StatKing: only escalate when ON (dangerous). Dark hold is correct default — not a to-do.
  if (input.statsPublic) {
    steps.push({
      id: "stats-public-on",
      domain: "statking",
      priority: "P0",
      action: "STATS_PUBLIC is ON — confirm rights memo + feed SLA before promoting StatKing.",
    });
  }

  // Money path env first; live host audit when probed.
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
  } else if (input.stripeWebhookProbed === true) {
    if (input.stripeWebhookAuditRequired === true) {
      const hosts = (input.stripeWebhookForeignHosts ?? []).join(", ") || "unknown foreign host";
      steps.push({
        id: "stripe-webhook-audit",
        domain: "billing",
        priority: "P1",
        action: `Enabled foreign Stripe webhook host(s): ${hosts} — disable/remove. Keep only www.galaxysportsedge.com/api/webhooks/stripe.`,
      });
    } else if (input.stripeWebhookGseHealthy === false) {
      steps.push({
        id: "stripe-webhook-gse-missing",
        domain: "billing",
        priority: "P1",
        action:
          "No enabled GSE Stripe webhook — create https://www.galaxysportsedge.com/api/webhooks/stripe for entitlements.",
      });
    }
    // else: clean — no billing nag
  } else {
    // Soft: secrets present but live host list not probed this request
    steps.push({
      id: "stripe-webhook-audit",
      domain: "billing",
      priority: "P2",
      action:
        "Stripe webhooks: confirm only galaxysportsedge.com is enabled (foreign disabled leftovers ok to delete).",
    });
  }

  if (input.includeOptionalAnalytics === true) {
    steps.push({
      id: "analytics-optional",
      domain: "analytics",
      priority: "P2",
      action:
        "Optional: NEXT_PUBLIC_ANALYTICS_ENABLED=true + NEXT_PUBLIC_CLARITY_PROJECT_ID (PostHog only with keys + privacy review).",
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

  // Cap — founder is not an engineer; short queue only
  return steps.slice(0, 5);
}
