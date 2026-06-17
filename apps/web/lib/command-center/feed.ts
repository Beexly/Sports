/**
 * Command Center feed — the composition layer (I/O at the edges, logic pure).
 *
 * Pulls the platform's existing live synthesis and assembles the ranked
 * owner-attention queue + operating narrative + honest per-lane data modes.
 *
 * It adds NO new source of truth. Jarvis and the Owner Summary already derive
 * from real DB state through the trust gates; this layer ranks and narrates
 * what they produce. When the DB is unreachable, lanes fall back to a clearly
 * labeled state — never fabricated live data.
 */

import { getReadinessGates } from "@sports/prediction-engine";
import { db, isStubMode } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";
import { loadJarvisAssessment } from "../cockpit/jarvis-data";
import { JARVIS_VERSION } from "../cockpit/jarvis";
import { buildOwnerSummary } from "../cockpit/owner-summary";
import { collectAttentionSignals, rankAttention } from "./attention";
import { buildOperatingNarrative } from "./narrative";
import type {
  CommandCenterFeed,
  CommandCenterLane,
  FeedDataMode,
  OwnerAttentionItem,
} from "./types";

function rollupDataMode(lanes: readonly CommandCenterLane[]): FeedDataMode {
  if (lanes.length === 0) return "unavailable";
  if (lanes.every((l) => l.dataMode === "unavailable")) return "unavailable";
  return lanes.some((l) => l.dataMode !== "live")
    ? "live_with_labeled_fallbacks"
    : "live";
}

function countByUrgency(items: readonly OwnerAttentionItem[]) {
  return {
    attentionTotal: items.length,
    critical: items.filter((a) => a.urgency === "CRITICAL").length,
    high: items.filter((a) => a.urgency === "HIGH").length,
    normal: items.filter((a) => a.urgency === "NORMAL").length,
    low: items.filter((a) => a.urgency === "LOW").length,
  };
}

/**
 * Build the full feed. Never throws: a synthesis failure returns a labeled
 * error feed so the surface always renders (the cockpit's job is to be the
 * answer to "is the system OK?", so failing to compute is itself a signal).
 */
export async function loadCommandCenterFeed(): Promise<CommandCenterFeed> {
  const now = new Date();
  const gates = getReadinessGates();
  const stub = isStubMode();

  let todayPickCount = 0;
  let picksLive = !stub;
  try {
    todayPickCount = await db.pick.count({
      where: {
        isPublished: true,
        generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    });
  } catch {
    picksLive = false;
  }

  let assessment;
  let performancePolicy;
  try {
    const jarvis = await loadJarvisAssessment();
    assessment = jarvis.assessment;
    performancePolicy = jarvis.performancePolicy;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jarvis synthesis failed.";
    return {
      success: false,
      generatedAt: now.toISOString(),
      noFakeLiveData: true,
      dataMode: "unavailable",
      overallColor: "RED",
      headline: "Command Center could not synthesize live state.",
      lanes: [
        {
          key: "jarvis",
          label: "Jarvis synthesis",
          dataMode: "unavailable",
          fallbackReason: message,
          itemCount: 0,
        },
      ],
      attention: [],
      narrative: {
        headline: "Synthesis unavailable — investigate the DB connection and workers.",
        whatChanged: [`Jarvis synthesis failed: ${message}`],
        whatsBlocked: ["The Command Center cannot rank attention without live synthesis."],
        needsYou: ["Restore the data layer, then reload."],
        canWait: [],
        canIgnore: [],
      },
      counts: countByUrgency([]),
      jarvisVersion: JARVIS_VERSION,
      error: message,
    };
  }

  const ownerSummary = buildOwnerSummary({
    assessment,
    performancePolicy,
    gates,
    todayPickCount,
  });

  const signals = collectAttentionSignals({
    safetyWarnings: assessment.safetyWarnings,
    externalConfigWarnings: assessment.externalConfigWarnings,
    missingPhaseWarnings: assessment.missingPhaseWarnings,
    recommendedNextActions: assessment.recommendedNextActions,
    advisoryWarnings: ownerSummary.advisoryWarnings,
    decisions: ownerSummary.decisions,
    departments: ownerSummary.departments.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      actionRequired: d.actionRequired,
      actionDescription: d.actionDescription,
      drilldownHref: d.drilldownHref,
    })),
  });

  const attention = rankAttention(signals);

  const departmentsActioned = ownerSummary.departments.filter((d) => d.actionRequired).length;

  const lanes: CommandCenterLane[] = [
    {
      key: "jarvis",
      label: "Jarvis launch assessment",
      dataMode: "live",
      fallbackReason: null,
      itemCount: assessment.safetyWarnings.length + assessment.recommendedNextActions.length,
    },
    {
      key: "decisions",
      label: "Owner decision queue",
      dataMode: "live",
      fallbackReason: null,
      itemCount: ownerSummary.decisions.length,
    },
    {
      key: "departments",
      label: "Department command map",
      dataMode: "live",
      fallbackReason: null,
      itemCount: departmentsActioned,
    },
    {
      key: "performance",
      label: "Performance gate",
      dataMode: "live",
      fallbackReason: null,
      itemCount: ownerSummary.performance.displaySafe ? 1 : 0,
    },
    {
      key: "picks",
      label: "Today's picks",
      dataMode: picksLive ? "live" : "labeled_fallback",
      fallbackReason: picksLive
        ? null
        : "Database unreachable (stub mode) — pick count shown as zero, not fabricated.",
      itemCount: todayPickCount,
    },
    {
      key: "config",
      label: "External configuration",
      dataMode: "live",
      fallbackReason: null,
      itemCount: assessment.externalConfigWarnings.length,
    },
  ];

  const narrative = buildOperatingNarrative({
    launchStatus: assessment.launchStatus,
    overallColor: ownerSummary.overallColor,
    todayPickCount,
    gatesOpen: assessment.readinessGateSummary.openCount,
    gatesTotal: assessment.readinessGateSummary.totalCount,
    publicGateOpen: ownerSummary.picks.isPublicGateOpen,
    attention,
  });

  return {
    success: true,
    generatedAt: now.toISOString(),
    noFakeLiveData: true,
    dataMode: rollupDataMode(lanes),
    overallColor: ownerSummary.overallColor,
    headline: narrative.headline,
    lanes,
    attention,
    narrative,
    counts: countByUrgency(attention),
    jarvisVersion: JARVIS_VERSION,
    error: null,
  };
}
